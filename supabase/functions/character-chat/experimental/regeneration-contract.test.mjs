import test from 'node:test';import assert from 'node:assert/strict';
import {createSession,runTurn} from './core.mjs';
test('regeneration alternatives reach the reviewers without becoming factual sources',async()=>{
 const session=createSession({profile:{id:'chase',name:'Chase'}});
 const rejected='The notebook you left yesterday is in his bag.';
 session.regeneration={rejectedResponses:[rejected],instruction:'Different tactic'};
 let checked=0;
 const result=await runTurn({session,message:{id:'turn',content:'What did you want to say?'},author:async({contract})=>{
  assert.equal(contract.regeneration.rejectedResponses[0],rejected);
  assert(!contract.sources.some(source=>source.text.includes('notebook')));
  return {prose:'Chase sets down his keys. “I wanted to ask what you thought of that song.”',scenePatch:{}};
 },provenance:async()=>({accepted:true,issues:[]}),reviewer:async({contract})=>{checked++;assert.equal(contract.regeneration.instruction,'Different tactic');return {accepted:true,issues:[]};}});
 assert.equal(result.status,'accepted');assert.equal(checked,1);
});
