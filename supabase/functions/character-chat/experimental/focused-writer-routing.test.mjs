import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../index.ts',import.meta.url),'utf8');
const body=source.match(/author:async args=>(\{if\(previewFirst\)[^\n]+?\}),signal:AbortSignal.timeout\(90000\)/)?.[1];
assert(body,'Production author routing must be present');
const route=(name,author)=>new Function('previewAdapter','character','persistableReply',`let previewFirst=true; return async args=>${body}`)({author},{name},'Unvalidated legacy draft');
test('the first Chase candidate stays in the review pipeline; focused authorship is bounded to repair',async()=>{
 for(const name of ['Chase','Chase Beaumont','CHASE BEAUMONT']){
  let called=0;const writer=route(name,async args=>{called++;assert.equal(args.contract.latestUserMessage.content,'Stay here.');return {prose:'Fresh grounded words',scenePatch:{}};});
  const args={contract:{latestUserMessage:{content:'Stay here.'}}};assert.equal((await writer(args)).prose,'Unvalidated legacy draft');assert.equal(called,0);
  assert.equal((await writer({...args,repair:{verdict:{issues:[{code:'voice_label_instead_of_speech',reason:'Repair the voice.'}]}}})).prose,'Fresh grounded words');assert.equal(called,1);
 }
});
test('another lead retains the existing first-draft route and still gets repairs',async()=>{
 let called=0;const writer=route('Nathan Foster',async()=>{called++;return {prose:'Repaired words'};});
 assert.equal((await writer({})).prose,'Unvalidated legacy draft');assert.equal(called,0);assert.equal((await writer({})).prose,'Repaired words');assert.equal(called,1);
});
test('focused author failure cannot silently revive the legacy draft',async()=>{
 const writer=route('Chase Beaumont',async()=>{throw new Error('Author unavailable');});await writer({});await assert.rejects(()=>writer({repair:{}}),/Author unavailable/);
});
