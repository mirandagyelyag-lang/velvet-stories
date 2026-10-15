import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {retryAfterMs,createQuotaFetch} from '../supabase/functions/character-chat/engine/provider-quota.js';
import {callGroqProse} from '../supabase/functions/character-chat/engine/groq-fallback.js';
const endpoint='https://generativelanguage.googleapis.com/v1beta/models/flash:generateContent';
const error=(message='Please retry in 23h51m58.6s.')=>({error:{message}});
test('provider waits: header, structured duration, daily h/m/s and unknown',()=>{
 assert.equal(retryAfterMs(new Headers({'retry-after':'12'}),{}),12000);
 assert.equal(retryAfterMs(new Headers(),{error:{details:[{retryDelay:'3.5s'}]}}),3500);
 assert.equal(retryAfterMs(new Headers(),error()),85918600);
 assert.equal(retryAfterMs(new Headers(),{}),60000);
 assert.equal(retryAfterMs(new Headers({'retry-after':new Date(30000).toUTCString()}),{},10000),20000);
});
test('429 survives new worker, skips actual HTTP, preserves body and expires',async()=>{
 let clock=100000,calls=0; const rows=new Map();
 const settings={now:()=>clock,readCooldown:async(p,m)=>rows.get(p+':'+m),writeCooldown:async r=>rows.set(r.provider+':'+r.model,r),fetchImpl:async()=>{calls++; return new Response(JSON.stringify(calls===1?error('Please retry in 2s.'):{}),{status:calls===1?429:200});}};
 const first=createQuotaFetch(settings);
 const original=await first(endpoint);
 assert.match((await original.json()).error.message,/2s/);
 assert.equal(calls,1);
 const coldWorker=createQuotaFetch(settings);
 const cached=await coldWorker(endpoint);
 assert.equal(cached.status,429);assert.equal(cached.headers.get('retry-after'),'2');assert.equal(calls,1);
 clock+=2001;assert.equal((await coldWorker(endpoint)).status,200);assert.equal(calls,2);
});
test('model/provider isolation and non-quota errors never disable healthy fallback',async()=>{
 const rows=new Map();let calls=0;
 const wrapper=createQuotaFetch({readCooldown:async(p,m)=>rows.get(p+':'+m),writeCooldown:async r=>rows.set(r.provider+':'+r.model,r),fetchImpl:async()=>{calls++;return new Response('{}',{status:calls===1?429:500});}});
 await wrapper(endpoint);await wrapper(endpoint.replace('flash:','lite:'));
 await wrapper('https://api.groq.com/openai/v1/chat/completions',{body:JSON.stringify({model:'flash'})});
 assert.equal(calls,3);assert.equal(rows.size,1);
});
test('database outage still retains local cooldown without losing upstream response',async()=>{
 let calls=0;const f=createQuotaFetch({readCooldown:async()=>{throw Error('offline')},writeCooldown:async()=>{throw Error('offline')},fetchImpl:async()=>{calls++;return new Response('{}',{status:429})}});
 assert.equal((await f(endpoint)).status,429);assert.equal((await f(endpoint)).status,429);assert.equal(calls,1);
});
test('cancelled requests do not spend provider quota',async()=>{
 const ac=new AbortController();ac.abort();let calls=0;
 const f=createQuotaFetch({fetchImpl:async()=>{calls++;return new Response('{}')}});
 await assert.rejects(f(endpoint,{signal:ac.signal}),{name:'AbortError'});assert.equal(calls,0);
});
test('Groq reports provider retry timing instead of falsely calling all 429 daily exhaustion',async()=>{
 await assert.rejects(callGroqProse({apiKey:'test',model:'a',fallbackModel:'',prompt:'hi',fetchImpl:async()=>new Response(JSON.stringify(error('Please try again in 1m30s.')),{status:429})}),/Retry in 90 seconds/);
});
test('real recovery transport uses one model at a time and stops after first success',async()=>{
 const src=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
 const block=src.slice(src.indexOf('async function callGeminiWithFailover('),src.indexOf('function stripVisibleModelMetadata('));
 let active=0,maxActive=0;const calls=[];
 const context={Promise,Map,Error,DOMException,setTimeout,clearTimeout,Date,Number,String,Array,Set,console,
 GEMINI_MODEL:'a',GEMINI_FALLBACK_MODEL:'b',GEMINI_EMERGENCY_MODEL:'c',GEMINI_RECOVERY_MODEL:'d',
 AbortController,delay:()=>new Promise(r=>setTimeout(r,1)),createGeminiTraceId:()=>'',geminiHeaders:()=>({}),modelEndpoint:m=>m,
 getErrorMessage:e=>e.message,getErrorName:e=>e.name,logGeminiAttemptFailure(){},extractCandidateText:d=>d.text,parseModelEnvelope:r=>({reply:r}),
 providerFetch:async model=>{calls.push(model);active++;maxActive=Math.max(active,maxActive);await new Promise(r=>setTimeout(r,10));active--;return {ok:model==='b',status:model==='b'?200:503,json:async()=>({text:'A valid reply.',candidates:[{finishReason:'STOP'}]})};}};
 const fn=vm.runInNewContext(stripTypeScriptTypes(block)+';callGeminiWithFailover',context);
 const result=await fn({apiKey:'test',systemInstruction:'test',prompt:'hello',maxOutputTokens:30,isCancelled:async()=>false});
 assert.equal(result.model,'b');assert.deepEqual(calls,['a','b']);assert.equal(maxActive,1);
});
test('real streaming transport fails over sequentially and never speculates while a healthy model speaks',async()=>{
 const src=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
 const block=src.slice(src.indexOf('async function streamGeminiEnvelopeWithFailover('),src.indexOf('function isGeminiInvalidArgument('));
 const calls=[];let active=0,maxActive=0;
 const context={Promise,Map,Error,DOMException,setTimeout,clearTimeout,Date,Number,String,Array,Set,console,TextDecoder,
 GEMINI_MODEL:'a',GEMINI_FALLBACK_MODEL:'b',GEMINI_EMERGENCY_MODEL:'c',GEMINI_RECOVERY_MODEL:'d',
 AbortController,delay:()=>new Promise(r=>setTimeout(r,1)),createGeminiTraceId:()=>'',geminiHeaders:()=>({}),modelStreamEndpoint:m=>m,
 getErrorMessage:e=>e.message,getErrorName:e=>e.name,logGeminiAttemptFailure(){},extractGeminiHttpDiagnostic:()=>({message:'quota',status:'RESOURCE_EXHAUSTED'}),
 extractCandidateTextRaw:d=>d.text||'',parseModelEnvelope:r=>({reply:r}),emptyModelEnvelope:r=>({reply:r}),
 providerFetch:async model=>{calls.push(model);active++;maxActive=Math.max(active,maxActive);await new Promise(r=>setTimeout(r,model==='a'?10:250));active--;return model==='a'?new Response('{}',{status:429}):new Response('data: '+JSON.stringify({text:'A complete grounded reply.',candidates:[{finishReason:'STOP'}]})+'\n\n');}};
 const fn=vm.runInNewContext(stripTypeScriptTypes(block)+';streamGeminiEnvelopeWithFailover',context);
 const result=await fn({apiKey:'test',systemInstruction:'test',prompt:'hello',maxOutputTokens:30,isCancelled:async()=>false,performancePlan:{completeWinnerOnly:false}});
 assert.equal(result.model,'b');assert.deepEqual(calls,['a','b']);assert.equal(maxActive,1);
});
