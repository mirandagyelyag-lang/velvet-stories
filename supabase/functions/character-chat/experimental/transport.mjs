import {modelAdapter} from './model-adapter.mjs';
let transportPromise;
export async function transport(){
 if(!transportPromise)transportPromise=(async()=>{
  const key=Deno.env.get('GEMINI_API_KEY');if(!key)throw new Error('Primary server key unavailable');
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Primary discovery failed (${response.status})`);
  const rows=(await response.json()).models||[];const configured='models/gemini-3.5-flash-lite';
  const selected=rows.find(x=>x.name===configured&&x.supportedGenerationMethods?.includes('generateContent'));
  if(!selected)throw new Error('No supported primary generation model');
  const model=selected.name.replace('models/','');
  let lastRequest=0;
  const bridge=async(_url,options)=>{
   const pause=Math.max(0,5500-(Date.now()-lastRequest));if(pause)await new Promise(resolve=>setTimeout(resolve,pause));lastRequest=Date.now();
   const input=JSON.parse(options.body);
   // The final repair is written by the independent free provider. Keep the
   // evidence and semantic reviewers separate; no rejected prose bypasses them.
   if(input.response_format?.json_schema?.schema?.properties?.prose && Deno.env.get('GROQ_API_KEY')){
    return await fetch('https://api.groq.com/openai/v1/chat/completions',{
     method:'POST',signal:options.signal,
     headers:{'Content-Type':'application/json',Authorization:'Bearer '+Deno.env.get('GROQ_API_KEY')},
     body:JSON.stringify({...input,model:'openai/gpt-oss-120b',max_completion_tokens:1800,reasoning_effort:'low'})
    });
   }
   let r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',signal:options.signal,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:input.messages[0].content}]},contents:[{role:'user',parts:[{text:input.messages[1].content}]}],generationConfig:{maxOutputTokens:4096,...(input.response_format?.json_schema?{responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:input.response_format.json_schema.schema}}}:{responseMimeType:'application/json'})}})});
   if(r.status===503){
    await r.arrayBuffer();await new Promise(resolve=>setTimeout(resolve,6000));options.signal?.throwIfAborted();
    r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',signal:options.signal,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:input.messages[0].content}]},contents:[{role:'user',parts:[{text:input.messages[1].content}]}],generationConfig:{maxOutputTokens:4096,...(input.response_format?.json_schema?{responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:input.response_format.json_schema.schema}}}:{responseMimeType:'application/json'})}})});
   }
   if(!r.ok)return {ok:false,status:r.status};
   const data=await r.json(),content=(data.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
   return {ok:true,json:async()=>({choices:[{message:{content}}]})};
  };
  return {model,availableModels:rows.filter(x=>x.supportedGenerationMethods?.includes('generateContent')).map(x=>x.name),...modelAdapter({endpoint:'https://primary-provider.invalid',model,apiKey:'server-managed',fetchImpl:bridge})};
 })();
 return transportPromise;
}


