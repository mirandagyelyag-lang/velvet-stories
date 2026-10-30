import test from 'node:test';
import assert from 'node:assert/strict';
import {selectInstantMove,buildInstantEncounterContract,buildChaseOpeningBrief,chaseInstitutionalDutyIssues} from './instant-encounter-contract.mjs';

test('the same request keeps its direction through generation and repair',()=>{
  assert.deepEqual(selectInstantMove('request-12'),selectInstantMove('request-12'));
});
test('variation keys produce several interaction directions, not one fixed sequence',()=>{
  assert.equal(new Set(Array.from({length:40},(_,i)=>selectInstantMove('request-'+i).id)).size,5);
});
test('recent offers and decisions are excluded when alternatives exist',()=>{
  for(let i=0;i<30;i++)assert(!['new_offer','changed_mind'].includes(selectInstantMove(String(i),['He proposes a new wager.','He changes his mind and decides to stay instead.']).id));
});
test('an explicit idea takes priority over the optional direction',()=>{
  assert.match(buildInstantEncounterContract({idea:'A quiet conversation at home.'}),/USER IDEA takes priority/);
});
test('all directions preserve a hearing bridge and open user agency',()=>{
  for(let i=0;i<20;i++){
    const prompt=buildInstantEncounterContract({variationKey:String(i)});
    assert.match(prompt,/Before the FIRST line/);assert.match(prompt,/Stop before any user reaction/);
    assert.match(prompt,/do not open with the stock prefix/);assert.match(prompt,/actual profile voice/);
  }
});

test('the observed invented faculty duty cannot survive final delivery',()=>{
 const opening='The philosophy department thinks I am spending Friday proofing faculty citation indexes.';
 assert.deepEqual(chaseInstitutionalDutyIssues(opening,{name:'Chase Beaumont'}),['chase_invented_institutional_duty']);
 assert.deepEqual(chaseInstitutionalDutyIssues(opening,{name:'Chase Beaumont'},'He is proofing faculty citation indexes.'),[]);
 assert.deepEqual(chaseInstitutionalDutyIssues(opening,{name:'Other'}),[]);
});
test('Chase repair receives the actual draft and keeps the new encounter contract',()=>{
 const prompt=buildChaseOpeningBrief({name:'Chase Beaumont'},'',[],'DISTANCE CONTRACT',{opening:'Rejected scene',rejectionReasons:['invented duty']});
 assert.match(prompt,/DISTANCE CONTRACT/);assert.match(prompt,/DRAFT: Rejected scene/);assert.match(prompt,/invented duty/);
 assert(!prompt.includes('APPROVED RHYTHM REFERENCE'));
});
