import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
const delivery=source.slice(source.indexOf('  const reviewChaseOpening ='),source.indexOf('  const readOpening =',source.indexOf('  const reviewChaseOpening =')));
const approved={user_agency:true,attention_and_pull:true,impulsive_emotional_turn:true,unresolved_tension:true,natural_voice:true,failures:[]};
async function run(responses,active=true){let calls=0;const context={chaseEngineActive:active,cleanIdea:'',identityDirection:'approved',safeDraft:{},GEMINI_INSTANT_RECOVERY_MODEL:'exhausted',GEMINI_FALLBACK_MODEL:'fallback',VELVET_ENGINE_RELEASE:'test',requestId:'test',startedAt:Date.now(),openingFamily:'party',providerDiagnostics:[],console:{info(){}},diagnose(){},getErrorMessage:e=>e.message,extractCandidateText:d=>d.text,readOpening:d=>d.text,instantStoryHardBlockIssuesV35298:()=>[],chaseOpeningIssues:()=>[],instantStoryProseValidation:opening=>({valid:true,opening}),json:(body,status=200)=>({body,status}),requestOpening:async(args)=>{assert.equal(args.model,'test');calls++;const next=responses.shift();if(next instanceof Error)throw next;if(next===undefined)throw Error('unexpected call');return {data:{text:typeof next==='string'?next:JSON.stringify(next)}}}};
const fn=vm.runInNewContext(`${delivery};instantStoryResponse`,context);const result=await fn({opening:'candidate',source:'ai',model:'test'});return {result,calls};}
let a=await run([approved]);assert.equal(a.result.status,200);assert.equal(a.result.body.characterReviewed,true);
a=await run([{...approved,user_agency:false},'repaired',approved]);assert.equal(a.calls,3);assert.equal(a.result.body.opening,'repaired');
a=await run([{...approved,impulsive_emotional_turn:false},'still wrong',{...approved,impulsive_emotional_turn:false}]);assert.equal(a.result.status,503);
a=await run(['not json']);assert.equal(a.result.status,503);
a=await run([new Error('timeout')]);assert.equal(a.result.status,503);
a=await run([],false);assert.equal(a.calls,0);assert.equal(a.result.status,200);
assert.ok(source.includes('return await instantStoryResponse({ opening: winner.opening'));
console.log('PASS: accepted audit, repair and re-review, repeated rejection, malformed audit, timeout, other-character bypass and awaited delivery.');
