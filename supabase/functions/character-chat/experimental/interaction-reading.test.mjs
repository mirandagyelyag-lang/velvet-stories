import test from 'node:test';import assert from 'node:assert/strict';
import {interactionReading} from './interaction-reading.mjs';
import {requiredUserAssertions} from './user-assertions.mjs';
import {provenanceAuditor} from './provenance.mjs';
import {createSession,turnContract} from './core.mjs';

test('a neutral choice question remains a question without an assigned motive',()=>{
 const r=interactionReading('“Are you leaving, or staying here with me?”');assert.deepEqual(r.evidence.questions,['Are you leaving, or staying here with me?']);assert.match(r.defaultReading,/non-adversarially/);assert.equal(r.motive,undefined);
});
test('a playful echo does not manufacture consent or hostility',()=>{
 const r=interactionReading('“Take your chances? You make me sound dangerous 😂.”');assert.equal(r.evidence.questions[0],'Take your chances?');assert.equal(r.evidence.explicitLimits.length,0);assert.equal(r.hostile,undefined);assert.equal(r.consent,undefined);
});
test('a refusal stays visible beside a joke and Spanish limits are retained',()=>{
 assert.match(interactionReading('“I don’t want to go outside, nice try 😂.”').evidence.explicitLimits[0],/don’t want to go outside/);
 assert.match(interactionReading('“No me sigas. No quiero salir.”').evidence.explicitLimits.join(' '),/No quiero salir/);
 assert.equal(interactionReading('No thanks.').evidence.bareNo,true);
});
test('a correction is literal evidence, while private narration is not made audible',()=>{
 const r=interactionReading('“I’m not keeping score. I just wanted to know if you wanted to stay.” *I wonder if he thinks I am testing him?*');
 assert(r.evidence.clarifications.some(x=>x.includes('not keeping score')));assert.equal(r.evidence.questions.length,0);
 assert.equal(interactionReading('*I wonder why he is here?*').evidence.questions.length,0);
});
test('a quoted NPC order is not automatically attributed to the user',()=>{
 const r=interactionReading('Adrian says, “Stop following her.”');assert.match(r.evidence.speakerAttribution,/quotation marks alone do not establish/);assert.match(r.responseOrder,/quoted NPC speech to the NPC/);assert.equal(r.userConsent,undefined);
});
test('the observed scorekeeping claim cannot disappear into a lead-opinion exemption',async()=>{
 const prose='“You’re standing by the exit keeping score,” Chase says.';const required=requiredUserAssertions(prose);assert.equal(required.length,1);
 let calls=0;const audit=provenanceAuditor(async(_system,payload)=>++calls===1?{claims:[]}:{results:payload.claims.map(c=>({claimId:c.id,subject:'lead',scope:'current_offer_or_opinion',supported:true,reason:'This is just his teasing.'})),missingClaims:[]});
 const result=await audit({contract:{sources:[{id:'user/1',kind:'user',text:'I remain by the entrance.'}],profile:{name:'Chase'}},draft:{prose}});
 assert.equal(result.accepted,false);assert(result.issues.some(x=>x.code==='provenance_missing_source'));
});
test('an explicit user-described test remains possible and an open question is not a claim',async()=>{
 assert.equal(requiredUserAssertions('Chase asks, “Are you testing me?”').length,0);
 const c=turnContract(createSession({profile:{id:'c',name:'Chase'}}),{id:'u',content:'“Yes, I am testing you.”'});
 assert(c.sources.some(x=>x.text.includes('Yes, I am testing you.')));assert(c.interaction);
 let calls=0;const audit=provenanceAuditor(async(_system,payload)=>++calls===1?{claims:payload.requiredClaims.map(claim=>({...claim,citations:[{sourceId:'user/u',quote:'Yes, I am testing you.'}]}))}:{results:payload.claims.map(claim=>({claimId:claim.id,subject:'user',scope:'protected_fact',supported:true,reason:'The user explicitly described this intention.'})),missingClaims:[]});
 assert.equal((await audit({contract:c,draft:{prose:'Chase says, “You’re testing me.”'}})).accepted,true);
});
