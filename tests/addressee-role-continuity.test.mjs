import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('supabase/functions/character-chat/engine/target-aware-dialogue-v34943.ts','utf8');
const {buildTargetAwareDialogueV34943:build}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('cafe screenshot routes the order to the worker, preserving companion role',()=>{
  const p=build({latestUserMessage:'Hi, i would like a Mocha Frappuccino without whipped cream and a black coffe, please i said to the worker'});
  assert.match(p,/EXPLICIT USER ADDRESSEE=worker/);
  assert.match(p,/worker receives the order/);
  assert.match(p,/never steal the NPC/);
});
test('Spanish service addressee and non-service professor remain distinct',()=>{
  for(const [line,target] of [['Le dije al cajero: un café, por favor','cajero'],['I asked the professor about the exam','professor']])assert.ok(build({latestUserMessage:line}).includes('EXPLICIT USER ADDRESSEE='+target));
});
test('ordinary lead question keeps the existing approach motive gate',()=>{
  const p=build({latestUserMessage:'Why did you come up to me?'});
  assert.match(p,/APPROACH-TARGET GATE: ACTIVE/);
  assert.ok(!p.includes('EXPLICIT USER ADDRESSEE='));
});
