// Shared by every provider path. Stores no prompts, API keys or user data.
export function retryAfterMs(headers, data, now = Date.now()) {
  const waits = [];
  const header = headers?.get?.('retry-after');
  if (header) waits.push(/^\d+(?:\.\d+)?$/.test(header) ? Number(header)*1000 : Date.parse(header)-now);
  for (const item of data?.error?.details || []) {
    const duration = item?.retryDelay;
    if (typeof duration === 'string' && /^\d+(?:\.\d+)?s$/.test(duration)) waits.push(parseFloat(duration)*1000);
    if (duration && typeof duration === 'object') waits.push(Number(duration.seconds || 0)*1000 + Number(duration.nanos || 0)/1e6);
  }
  const message = String(data?.error?.message || '');
  const match = message.match(/(?:retry|try again)\s+(?:in|after)\s+((?:\d+(?:\.\d+)?\s*(?:ms|h|m|s|hours?|minutes?|seconds?)\s*)+)/i);
  if (match) {
    let ms = 0;
    for (const part of match[1].matchAll(/(\d+(?:\.\d+)?)\s*(ms|hours?|minutes?|seconds?|h|m|s)/gi)) {
      const unit=part[2].toLowerCase();
      ms+=Number(part[1])*(unit==='ms'?1:unit.startsWith('h')?3600000:unit.startsWith('m')?60000:1000);
    }
    waits.push(ms);
  }
  return Math.min(7*86400000, Math.max(1000, ...waits.filter(n=>Number.isFinite(n)&&n>0), waits.some(n=>n>0)?0:60000));
}

export function createQuotaFetch({ fetchImpl = globalThis.fetch, readCooldown = async()=>null, writeCooldown = async()=>{}, now = Date.now, log = ()=>{} } = {}) {
  const cache = new Map();
  return async function quotaFetch(url, options = {}, explicit = {}) {
    const endpoint=String(url);
    const provider=explicit.provider || (endpoint.includes('generativelanguage.googleapis.com')?'gemini':endpoint.includes('api.groq.com')?'groq':endpoint.includes('api.openai.com')?'openai':'');
    if (!provider) return fetchImpl(url,options);
    let model=explicit.model;
    if (!model) {
      if(provider==='gemini') model=decodeURIComponent(endpoint.match(/\/models\/([^:]+):/)?.[1] || 'unknown');
      else { try {model=JSON.parse(options.body || '{}').model;} catch {} }
    }
    const key=provider+':'+model;
    let record=cache.get(key);
    // Read on every request so cold workers and other isolates share cooldowns.
    try { const stored=await readCooldown(provider,model); if(stored && (!record || Date.parse(stored.retry_at)>Date.parse(record.retry_at))) record=stored; } catch { /* local cooldown still applies */ }
    const until=Date.parse(record?.retry_at || '');
    if(until>now()) {
      cache.set(key,record);
      const seconds=Math.max(1,Math.ceil((until-now())/1000));
      log({provider,model,status:429,skipped:true,retryAt:record.retry_at});
      return new Response(JSON.stringify({error:{code:429,status:'RESOURCE_EXHAUSTED',message:`${provider} rate limit. Please retry in ${seconds}s.`,details:[{retryDelay:seconds+'s'}]}}),{status:429,headers:{'content-type':'application/json','retry-after':String(seconds),'x-velvet-quota-cached':'true'}});
    }
    if(options.signal?.aborted) throw new DOMException('Generation cancelled','AbortError');
    const response=await fetchImpl(url,options);
    log({provider,model,status:response.status,skipped:false,requestChars:typeof options.body==='string'?options.body.length:0});
    if(response.status===429) {
      const data=await response.clone().json().catch(()=>({}));
      record={provider,model,retry_at:new Date(now()+(data?.error?.code==='insufficient_quota'?3600000:retryAfterMs(response.headers,data,now()))).toISOString()};
      cache.set(key,record);
      try {await writeCooldown(record);} catch { /* outage must not discard a provider response */ }
    }
    return response;
  };
}
