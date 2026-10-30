import {modelAdapter} from './model-adapter.mjs';
const transports=new Map();
export async function transport({qualityWriter=false}={}){
 if(!transports.has(qualityWriter))transports.set(qualityWriter,(async()=>{
  const key=Deno.env.get('GEMINI_API_KEY');if(!key)throw new Error('Primary server key unavailable');
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Primary discovery failed (${response.status})`);
  const rows=(await response.json()).models||[];const configured='models/gemini-3.5-flash-lite';
  const selected=rows.find(x=>x.name===configured&&x.supportedGenerationMethods?.includes('generateContent'));
  if(!selected)throw new Error('No supported primary generation model');
  const model=selected.name.replace('models/','');
  const quality=qualityWriter?rows.find(x=>x.name==='models/gemini-3.5-flash'&&x.supportedGenerationMethods?.includes('generateContent')):null;
  const authorModel=quality?.name.replace('models/','')||null;
  if(qualityWriter)console.log('[character-chat] focused voice writer',{available:Boolean(authorModel),model:authorModel||model});
  let lastRequest=0;
  let groqAuthorCooldownUntil=0;
  let qualityWriterCooldownUntil=0;
  const bridge=async(_url,options)=>{
   const pause=Math.max(0,5500-(Date.now()-lastRequest));if(pause)await new Promise(resolve=>setTimeout(resolve,pause));lastRequest=Date.now();
   const input=JSON.parse(options.body);
   const isAuthor=Boolean(input.response_format?.json_schema?.schema?.properties?.prose);
   const generationModel=isAuthor&&authorModel&&Date.now()>=qualityWriterCooldownUntil?authorModel:model;
   // The final repair is written by the independent free provider. Keep the
   // evidence and semantic reviewers separate; no rejected prose bypasses them.
   if(isAuthor && !authorModel && Deno.env.get('GROQ_API_KEY') && Date.now()>=groqAuthorCooldownUntil){
    const authorResponse=await fetch('https://api.groq.com/openai/v1/chat/completions',{
     method:'POST',signal:options.signal,
     headers:{'Content-Type':'application/json',Authorization:'Bearer '+Deno.env.get('GROQ_API_KEY')},
     body:JSON.stringify({...input,model:'openai/gpt-oss-120b',max_completion_tokens:1800,reasoning_effort:'low'})
    });
    if(![429,500,502,503,504].includes(authorResponse.status))return authorResponse;
    const retrySeconds=Number(authorResponse.headers.get('retry-after'))||60;
    groqAuthorCooldownUntil=Date.now()+Math.min(120,Math.max(30,retrySeconds))*1000;
    await authorResponse.arrayBuffer();
    console.warn('[character-chat] focused author provider unavailable; using primary',{status:authorResponse.status});
   }
   const requestPrimary=async requestModel=>fetch(`https://generativelanguage.googleapis.com/v1beta/models/${requestModel}:generateContent`,{method:'POST',signal:options.signal,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:input.messages[0].content}]},contents:[{role:'user',parts:[{text:input.messages[1].content}]}],generationConfig:{maxOutputTokens:4096,...(input.response_format?.json_schema?{responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:input.response_format.json_schema.schema}}}:{responseMimeType:'application/json'})}})});
   let r=await requestPrimary(generationModel);
   if(r.status===503){
    await r.arrayBuffer();await new Promise(resolve=>setTimeout(resolve,6000));options.signal?.throwIfAborted();
    r=await requestPrimary(generationModel);
   }
   if(!r.ok && generationModel!==model && [429,500,502,503,504].includes(r.status)){
    console.warn("[character-chat] quality writer unavailable; using primary writer",{status:r.status});
    qualityWriterCooldownUntil=Date.now()+60000;
    await r.arrayBuffer();r=await requestPrimary(model);
   }
   if(!r.ok)return {ok:false,status:r.status};
   const data=await r.json(),content=(data.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
   return {ok:true,json:async()=>({choices:[{message:{content}}]})};
  };
  return {model,qualityWriterAvailable:Boolean(authorModel),availableModels:rows.filter(x=>x.supportedGenerationMethods?.includes('generateContent')).map(x=>x.name),...modelAdapter({endpoint:'https://primary-provider.invalid',model,apiKey:'server-managed',fetchImpl:bridge})};
 })());
 return transports.get(qualityWriter);
}


