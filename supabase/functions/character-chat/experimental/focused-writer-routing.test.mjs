import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../index.ts',import.meta.url),'utf8');
const body=source.match(/author:async args=>(\{if\(previewFirst\)[^\n]+?\}),signal:AbortSignal.timeout\(90000\)/)?.[1];
assert(body,'Production author routing must be present');
const route=(name,author)=>new Function('previewAdapter','character','persistableReply',`let previewFirst=true; return async args=>${body}`)({author},{name},'Unvalidated legacy draft');
test('Chase starts with the focused writer rather than inheriting the unvalidated legacy prose',async()=>{
 for(const name of ['Chase','Chase Beaumont','CHASE BEAUMONT']){
  let called=0;const writer=route(name,async args=>{called++;assert.equal(args.contract.latestUserMessage.content,'Stay here.');return {prose:'Fresh grounded words',scenePatch:{}};});
  assert.equal((await writer({contract:{latestUserMessage:{content:'Stay here.'}}})).prose,'Fresh grounded words');assert.equal(called,1);
 }
});
test('another lead retains the existing first-draft route and still gets repairs',async()=>{
 let called=0;const writer=route('Nathan Foster',async()=>{called++;return {prose:'Repaired words'};});
 assert.equal((await writer({})).prose,'Unvalidated legacy draft');assert.equal(called,0);assert.equal((await writer({})).prose,'Repaired words');assert.equal(called,1);
});
test('focused author failure cannot silently revive the legacy draft',async()=>{
 await assert.rejects(()=>route('Chase Beaumont',async()=>{throw new Error('Author unavailable');})({}),/Author unavailable/);
});
