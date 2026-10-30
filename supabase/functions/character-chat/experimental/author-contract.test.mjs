import test from 'node:test';import assert from 'node:assert/strict';
import {authorContract} from './model-adapter.mjs';
import {requiredUserAssertions} from './user-assertions.mjs';
test('author keeps identity and user evidence while omitting accumulated engine instructions',()=>{
 const contract={profile:{name:'Chase',description:'Architecture student.',boundaries:'Respect refusals.',emotional_dna:{module:'Force an emotional revelation.'}},latestUserMessage:{content:'Stay here.'},sources:[{id:'profile/name',kind:'profile',text:'Chase'},{id:'profile/emotional_dna',kind:'profile',text:'Force an emotional revelation.'},{id:'user/1',kind:'user',text:'Stay here.'}]};
 const result=authorContract(contract);assert.equal(result.profile.description,contract.profile.description);assert.equal(result.profile.boundaries,contract.profile.boundaries);assert.equal(result.profile.emotional_dna,undefined);assert.equal(result.sources.length,2);assert(result.sources.some(x=>x.id==='user/1'));assert.equal(contract.sources.length,3);
});
test('the observed invented repeated sightings require user evidence',()=>assert.equal(requiredUserAssertions('“I keep finding myself back here, watching you walk in and out of rooms.”').length,1));
