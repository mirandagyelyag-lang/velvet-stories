import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {withoutRepeatedLatest,uniqueContext} from '../supabase/functions/character-chat/engine/economical-context.js';
import {buildGroqLivePrompt} from '../supabase/functions/character-chat/engine/groq-fallback.js';
import {callEconomicalBackup} from '../supabase/functions/character-chat/engine/openai-fallback.js';
import {createCorrectionBudget} from '../supabase/functions/character-chat/engine/correction-budget.js';
test('latest user instruction sent once; earlier commitments and same-word character speech survive',()=>{
 const latest='LATEST_UNIQUE_ACTION_'+ 'x'.repeat(500);
 const transcript=[{speaker:'Anto',content:'The meeting is Friday at my house.'},{speaker:'Theo',content:'I will bring the notes.'},{speaker:'Anto',content:latest}];
 const prompt=buildGroqLivePrompt({userIdentity:{name:'Anto'},transcript,latestUserMessage:latest,memories:[{content:'Do not touch me.'}],lore:[{content:'Theo is 25.'}]});
 assert.equal(prompt.split(latest).length-1,1);assert.match(prompt,/Friday at my house/);assert.match(prompt,/bring the notes/);assert.match(prompt,/Do not touch me/);assert.match(prompt,/Theo is 25/);
 assert.equal(withoutRepeatedLatest([{speaker:'Theo',content:latest}],latest,'Anto').length,1);
 assert.equal(transcript.length,3);
});
test('exact duplicates deduplicate without merging different facts',()=>{
 const facts=[{content:'A owes B.'},{content:'A owes B.'},{content:'B owes A.'}];assert.equal(uniqueContext(facts).length,2);assert.equal(facts.length,3);
});
test('validated Instant Story is delivered without another paid or free editor request',async()=>{
 const source=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
 const start=source.indexOf('    if (winner?.opening) {');const end=source.indexOf('\n  } finally {',start);
 const block=source.slice(start,end);let editorCalls=0;
 const winner={opening:'"You kept my notes?" Theo asks, pointing to the margin.',model:'openai/gpt-5-mini',finishReason:'STOP'};
 const run=vm.runInNewContext('(async()=>{let primaryWinnerFound=false;'+block+'})',{winner,console:{log(){}},Date,startedAt:Date.now(),sceneSeed:'home',openingFamily:'project',instantStoryResponse:x=>x,requestOpening:()=>{editorCalls++;throw Error('Unnecessary editor called')}});
 const response=await run();assert.equal(response.opening,winner.opening);assert.equal(editorCalls,0);
});
test('repeated opening rescues never exceed two paid requests; healthy free path still works after budget ends',async()=>{
 let paid=0;const budget=createCorrectionBudget(2);
 const options={paidBudget:budget,groqApiKey:'g',openaiApiKey:'o',groqCall:async()=>{throw Error('free unavailable')},openaiCall:async()=>{paid++;return {reply:'draft'}}};
 await callEconomicalBackup(options);await callEconomicalBackup(options);await assert.rejects(callEconomicalBackup(options),/could not complete this story/);assert.equal(paid,2);
 assert.equal((await callEconomicalBackup({...options,groqCall:async()=>({reply:'free'})})).reply,'free');assert.equal(paid,2);
});
