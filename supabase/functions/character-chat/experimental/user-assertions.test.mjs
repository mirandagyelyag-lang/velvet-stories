import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredUserAssertions} from './user-assertions.mjs';
import {provenanceAuditor} from './provenance.mjs';

test('embedded behavior in a lead feeling must be audited',()=>{
 const claims=requiredUserAssertions('Chase says, “I wanted to tell you I’m sick of watching you let other people waste your time.”');
 assert.equal(claims.length,1);assert.match(claims[0].excerpt,/watching you let/);
});
test('habitual criticism and asserted motives are protected in both languages',()=>{
 for(const prose of ['“You always disappear before I can finish.”','“You are hiding from your friends.”','“Siempre dejas que decidan por ti.”']) assert.equal(requiredUserAssertions(prose).length,1);
});
test('offers, self disclosure, genuine questions and conditionals stay possible',()=>{
 for(const prose of ['Chase says, “I wanted to ask you to stay a little longer.”','“Are you hiding from someone?”','“If you keep talking, I will miss the announcement.”','“You keep the ticket if you want.”']) {
  assert.equal(requiredUserAssertions(prose).length,0,prose);
 }
});
test('omitted embedded assertion cannot be excused as a new lead opinion',async()=>{
 let calls=0;
 const audit=provenanceAuditor(async(_system,payload)=>{
  if(++calls===1)return {claims:[]};
  return {results:payload.claims.map(c=>({claimId:c.id,subject:'lead',scope:'current_offer_or_opinion',supported:true,reason:'This is his current feeling.'})),missingClaims:[]};
 });
 const result=await audit({contract:{sources:[],profile:{name:'Chase'}},draft:{prose:'“I am sick of watching you let others waste your time.”'}});
 assert.equal(result.accepted,false);assert(result.issues.some(x=>x.code==='provenance_missing_source'));
});
test('a sourced user pattern is allowed',async()=>{
 const source={id:'user/1',kind:'user',text:'I always leave before he finishes.'};let calls=0;
 const audit=provenanceAuditor(async(_system,payload)=>++calls===1?{claims:payload.requiredClaims.map(c=>({...c,citations:[{sourceId:source.id,quote:source.text}]}))}:{results:payload.claims.map(c=>({claimId:c.id,subject:'user',scope:'protected_fact',supported:true,reason:'User explicitly described this pattern.'})),missingClaims:[]});
 assert.equal((await audit({contract:{sources:[source],profile:{name:'Chase'}},draft:{prose:'“You always leave before I finish.”'}})).accepted,true);
});
