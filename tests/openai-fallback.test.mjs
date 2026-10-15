import test from 'node:test';import assert from 'node:assert/strict';
import {callOpenAIProse,callEconomicalBackup} from '../supabase/functions/character-chat/engine/openai-fallback.js';
import {createQuotaFetch} from '../supabase/functions/character-chat/engine/provider-quota.js';
const success={status:'completed',output:[{type:'reasoning',content:[{type:'output_text',text:'hidden'}]},{type:'message',role:'assistant',content:[{type:'output_text',text:'"Around two," Theo says.'}]}],usage:{input_tokens:8000,output_tokens:1000}};
test('one bounded GPT-5 mini request extracts only visible assistant prose and counts paid reasoning tokens',async()=>{
 let calls=0;const result=await callOpenAIProse({apiKey:'private-test-key',prompt:'Current scene',maxOutputTokens:9000,fetchImpl:async(url,opts)=>{calls++;const body=JSON.parse(opts.body);assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(body.model,'gpt-5-mini');assert.equal(body.max_output_tokens,2000);assert.equal(body.reasoning.effort,'minimal');assert.equal(body.store,false);assert.equal(body.temperature,undefined);return Response.json(success);}});
 assert.equal(calls,1);assert.equal(result.reply,'"Around two," Theo says.');assert.equal(result.outputTokens,1000);assert.equal(result.estimatedCostUsd,.004);
});
test('healthy free backup never spends paid credit; exhausted free backup uses one paid request',async()=>{
 let paid=0;const options={groqApiKey:'g',openaiApiKey:'o',groqCall:async()=>({reply:'free',model:'groq/test'}),openaiCall:async()=>{paid++;return {reply:'paid',model:'openai/gpt-5-mini'}}};
 assert.equal((await callEconomicalBackup(options)).reply,'free');assert.equal(paid,0);
 assert.equal((await callEconomicalBackup({...options,groqCall:async()=>{throw Error('rate limited')}})).reply,'paid');assert.equal(paid,1);
});
test('paid correction remains on paid provider rather than bouncing through Gemini/Groq',async()=>{
 let free=0,paid=0;await callEconomicalBackup({preferOpenAI:true,openaiApiKey:'o',groqCall:async()=>{free++},openaiCall:async()=>{paid++;return {reply:'corrected'}}});assert.equal(free,0);assert.equal(paid,1);
});
test('cancellation and excessive context do not cause paid fallback',async()=>{
 let calls=0;await assert.rejects(callEconomicalBackup({isCancelled:async()=>true,openaiApiKey:'o',openaiCall:async()=>{calls++}}),{name:'AbortError'});
 await assert.rejects(callOpenAIProse({apiKey:'o',prompt:'a'.repeat(30001),fetchImpl:async()=>{calls++}}),/no paid request was sent/);assert.equal(calls,0);
});
test('insufficient funds, refusal, incomplete output and HTTP errors never retry or expose key',async()=>{
 for(const [status,data,pattern] of [[429,{error:{code:'insufficient_quota',message:'private-test-key'}},/no available API credit/],[401,{error:{message:'private-test-key'}},/invalid/],[200,{status:'incomplete',output:[]},/complete reply/],[200,{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'no'}]}]},/complete reply/],[500,{error:{message:'private-test-key'}},/HTTP 500/]]){
 let calls=0;await assert.rejects(callOpenAIProse({apiKey:'private-test-key',prompt:'hi',fetchImpl:async()=>{calls++;return Response.json(data,{status});}}),pattern);assert.equal(calls,1);
 }
});
test('OpenAI quota cooldown is independent from free providers and survives cold workers',async()=>{
 const rows=new Map();let calls=0;const settings={readCooldown:async(p,m)=>rows.get(p+':'+m),writeCooldown:async r=>rows.set(r.provider+':'+r.model,r),fetchImpl:async()=>{calls++;return Response.json({error:{code:'insufficient_quota'}},{status:429})}};
 const request={body:JSON.stringify({model:'gpt-5-mini'})};await createQuotaFetch(settings)('https://api.openai.com/v1/responses',request);await createQuotaFetch(settings)('https://api.openai.com/v1/responses',request);assert.equal(calls,1);assert.ok(rows.has('openai:gpt-5-mini'));
});
