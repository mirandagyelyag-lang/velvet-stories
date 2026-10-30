import test from 'node:test';import assert from 'node:assert/strict';
import {transport} from './transport.mjs';
test('only the bounded author repair uses Groq; evidence reviewers retain their independent transport',async()=>{
 const before={fetch:globalThis.fetch,Deno:globalThis.Deno,now:Date.now};let clock=0;const routes=[];
 globalThis.Deno={env:{get:name=>name==='GEMINI_API_KEY'?'test-primary':name==='GROQ_API_KEY'?'test-secondary':undefined}};
 Date.now=()=>clock+=6000;
 const checks=Object.fromEntries(['responsiveness','care','identity','agency','continuity','canon','presentation'].map(k=>[k,{passed:true,evidence:'The actual reply satisfies this obligation.'}]));
 globalThis.fetch=async(url,options)=>{
  routes.push(String(url));
  if(String(url).endsWith('/models'))return new Response(JSON.stringify({models:[{name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['generateContent']}]}));
  if(String(url).includes('api.groq.com')){
   const request=JSON.parse(options.body);assert.equal(request.model,'openai/gpt-oss-120b');assert.equal(request.response_format.json_schema.strict,true);
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({move:{kind:'answer',focus:'present preference'},prose:'Chase says, “I would rather stay.”',scenePatch:{characterPosition:null}})}}]}));
  }
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({checks})}]}}]}));
 };
 try{
  const adapter=await transport();const draft=await adapter.author({contract:{},signal:new AbortController().signal});assert.equal(draft.prose,'Chase says, “I would rather stay.”');
  assert.equal((await adapter.reviewer({contract:{},draft,nextScene:{}})).accepted,true);
  assert.equal(routes.filter(x=>x.includes('api.groq.com')).length,1);assert.equal(routes.filter(x=>x.endsWith(':generateContent')).length,1);
 }finally{globalThis.fetch=before.fetch;globalThis.Deno=before.Deno;Date.now=before.now;}
});
