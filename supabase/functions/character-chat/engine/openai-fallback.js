// Paid last resort. One bounded Responses request; never retries or upgrades models.
import { retryAfterMs } from './provider-quota.js';
export async function callOpenAIProse({apiKey, prompt='', systemInstruction='', maxOutputTokens=1400, isCancelled=async()=>false, fetchImpl=fetch, timeoutMs=20000}={}) {
 if(!apiKey) throw Error('OpenAI fallback is not configured.');
 if(String(prompt).length+String(systemInstruction).length>30000) throw Error('OpenAI context exceeds the economical budget; no paid request was sent.');
 if(await isCancelled()) throw new DOMException('Generation cancelled','AbortError');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),Math.max(1000,Math.min(25000,timeoutMs)));
 try {
  const response=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',signal:controller.signal,
   headers:{'content-type':'application/json',Authorization:'Bearer '+apiKey},
   body:JSON.stringify({model:'gpt-5-mini',store:false,
    instructions:systemInstruction || 'Write one grounded in-character roleplay turn as prose only. Preserve supplied canon, user agency and character voice. Quote spoken dialogue.',
    input:String(prompt),reasoning:{effort:'minimal'},text:{verbosity:'low'},
    max_output_tokens:Math.max(128,Math.min(2000,Number(maxOutputTokens)||1400)),
   }),
  });
  const data=await response.json().catch(()=>({}));
  if(await isCancelled()) throw new DOMException('Generation cancelled','AbortError');
  if(!response.ok){
   if(data?.error?.code==='insufficient_quota') throw Error('OpenAI has no available API credit. Check the API billing balance.');
   if(response.status===429) throw Error('OpenAI is rate-limited. Retry in '+Math.ceil(retryAfterMs(response.headers,data)/1000)+' seconds.');
   if(response.status===401||response.status===403) throw Error('OpenAI API key is invalid or lacks access to GPT-5 mini.');
   throw Error('OpenAI returned HTTP '+response.status+'.');
  }
  const reply=(data.output||[]).filter(item=>item.type==='message'&&item.role==='assistant').flatMap(item=>item.content||[]).filter(part=>part.type==='output_text').map(part=>part.text||'').join('\n').trim();
  if(data.status==='incomplete' || !reply) throw Error('OpenAI could not produce a complete reply within the token limit. No automatic paid retry was made.');
  return {reply,model:'openai/gpt-5-mini',finishReason:'STOP',promptTokens:Number(data.usage?.input_tokens||0),outputTokens:Number(data.usage?.output_tokens||0),estimatedCostUsd:(Number(data.usage?.input_tokens||0)*0.25+Number(data.usage?.output_tokens||0)*2)/1000000};
 } finally {clearTimeout(timer);}
}
export async function callEconomicalBackup({groqApiKey='',openaiApiKey='',preferOpenAI=false,paidBudget=null,groqCall,openaiCall=callOpenAIProse,...options}={}) {
 if(await (options.isCancelled || (async()=>false))()) throw new DOMException('Generation cancelled','AbortError');
 const paidCall=async()=>{
  const run=()=>openaiCall({...options,apiKey:openaiApiKey});
  const result=paidBudget ? await paidBudget.run(run) : await run();
  if(!result) throw Error('Velvet could not complete this story. The previous story was kept.');
  return result;
 };
 if(preferOpenAI) return paidCall();
 let freeFailure;
 try {
  if(!groqApiKey) throw Error('Groq fallback is not configured.');
  return await groqCall({...options,apiKey:groqApiKey});
 } catch(error) {
  if(error?.name==='AbortError' && await (options.isCancelled || (async()=>false))()) throw error;
  if(await (options.isCancelled || (async()=>false))()) throw new DOMException('Generation cancelled','AbortError');
  if(/context exceeds/.test(String(error?.message))) throw error;
  freeFailure=error;
 }
 if(!openaiApiKey) throw freeFailure;
 return await paidCall();
}
