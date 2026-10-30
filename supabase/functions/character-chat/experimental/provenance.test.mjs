import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCatalog,validateCitations,validateEntailment,provenanceAuditor} from './provenance.mjs';

const session={profile:{id:'chase',name:'Chase Beaumont',description:'He owns a car.'},scene:{present:['user','chase']},evidence:[],history:[{id:'u0',role:'user',content:'You should talk to Adrian.'},{id:'a0',role:'assistant',content:'Adrian studies for six hours every day.'}]};
const sources=sourceCatalog(session,{id:'u1',content:'What did you want to show me?'});
const prose='Chase says, “Adrian studies for six hours every day.”';
const claim={id:'c1',kind:'npc_fact',excerpt:'Adrian studies for six hours every day.',proposition:'Adrian has a six-hour daily study routine.',citations:[]};

test('catalog excludes assistant assertions and includes authoritative exact sources',()=>{
  assert(!sources.some(s=>s.text.includes('six hours')));
  assert(sources.some(s=>s.id==='user/u0'&&s.text==='You should talk to Adrian.'));
  assert(sources.some(s=>s.id==='profile/description'&&s.text==='He owns a car.'));
});
test('unsupported protected claim cannot pass with zero citations',()=>{
  assert.equal(validateCitations([claim],sources,prose)[0].code,'provenance_missing_source');
});
test('fabricated source IDs are rejected',()=>{
  assert.equal(validateCitations([{...claim,citations:[{sourceId:'assistant/a0',quote:'Adrian studies for six hours every day.'}]}],sources,prose)[0].code,'provenance_unknown_source');
});
test('a real source ID cannot carry an invented quotation',()=>{
  assert.equal(validateCitations([{...claim,citations:[{sourceId:'user/u0',quote:'Adrian studies for six hours every day.'}]}],sources,prose)[0].code,'provenance_invalid_quote');
});
test('scene location cannot establish a remembered notebook or biography',()=>{
  const c={...claim,kind:'shared_history',citations:[{sourceId:'scene/current',quote:'chase'}]};
  assert.equal(validateCitations([c],sources,prose)[0].code,'provenance_source_scope');
});
test('mere name citation needs separate entailment and is rejected as insufficient',()=>{
  const c={...claim,citations:[{sourceId:'user/u0',quote:'Adrian'}]};
  assert.deepEqual(validateCitations([c],sources,prose),[]);
  assert.equal(validateEntailment([c],{results:[{claimId:'c1',supported:false,reason:'The source gives a name, not a routine.'}],missingClaims:[]},prose)[0].code,'provenance_not_entailed');
});
test('an empty inventory still needs independent coverage review',async()=>{
  let calls=0;
  const audit=provenanceAuditor(async()=>++calls===1?{claims:[]}:{results:[],missingClaims:[{excerpt:claim.excerpt,reason:'The omitted routine is not established.'}]});
  const result=await audit({contract:{sources,profile:session.profile},draft:{prose}});
  assert.equal(calls,2);assert.equal(result.accepted,false);assert.equal(result.issues[0].code,'provenance_uncovered_claim');
});
test('supported facts can pass without banning a named NPC or notebook',async()=>{
  const notebook='Chase says, “The notebook you left yesterday.”';
  const catalog=[{id:'user/left',kind:'user',text:'I left my notebook in the common room yesterday.'}];
  const inventory={claims:[{id:'c1',kind:'shared_history',excerpt:'The notebook you left yesterday.',proposition:'The user left a notebook yesterday.',citations:[{sourceId:'user/left',quote:'I left my notebook in the common room yesterday.'}]}]};
  let calls=0;const audit=provenanceAuditor(async()=>++calls===1?inventory:{results:[{claimId:'c1',supported:true,reason:'The user explicitly reported leaving that notebook yesterday.'}],missingClaims:[]});
  assert.equal((await audit({contract:{sources:catalog,profile:session.profile},draft:{prose:notebook}})).accepted,true);
});
test('new present-world action is allowed when coverage finds no protected claims',async()=>{
  let calls=0;const audit=provenanceAuditor(async()=>++calls===1?{claims:[]}:{results:[],missingClaims:[]});
  assert.equal((await audit({contract:{sources,profile:session.profile},draft:{prose:'Chase says, “I want to talk.” He stays beside the wall.'}})).accepted,true);
});
test('duplicate, missing or invented claim verdicts fail closed',()=>{
  assert.throws(()=>validateEntailment([claim],{results:[],missingClaims:[]},prose),/Missing claim/);
  assert.throws(()=>validateEntailment([claim],{results:[{claimId:'c2',supported:true,reason:'x'}],missingClaims:[]},prose),/Invalid entailment/);
});
test('a fabricated excerpt cannot invent a claim absent from prose',()=>{
  assert.throws(()=>validateCitations([{...claim,excerpt:'not in prose'}],sources,prose),/Invalid factual claim/);
});

test('independent scope review can correct a lead action mislabeled as a user fact',async()=>{
  const action='Chase sets his keys on the counter.';let calls=0;
  const audit=provenanceAuditor(async()=>++calls===1?{claims:[{id:'c1',kind:'user_fact',excerpt:action,proposition:action,citations:[]}]}:{results:[{claimId:'c1',subject:'lead',scope:'new_present_action_or_speech',supported:true,reason:'This is a new action by the lead, not a fact about the user.'}],missingClaims:[]});
  const result=await audit({contract:{sources,profile:session.profile},draft:{prose:action}});
  assert.equal(result.accepted,true);
});

test('new speech does not exempt its unsupported factual content',async()=>{
  let calls=0;const audit=provenanceAuditor(async()=>++calls===1?{claims:[claim]}:{results:[{claimId:'c1',subject:'npc',scope:'protected_fact',supported:false,reason:'The six-hour routine is an assertion inside the dialogue and has no source.'}],missingClaims:[]});
  const result=await audit({contract:{sources,profile:session.profile},draft:{prose}});
  assert.equal(result.accepted,false);
  assert(result.issues.some(row=>row.code==='provenance_missing_source'));
});

test('a colon in a claim ID cannot hide missing evidence behind a positive judgment',async()=>{
  let calls=0;const audit=provenanceAuditor(async()=>++calls===1?{claims:[{...claim,id:'claim:1'}]}:{results:[{claimId:'claim:1',subject:'npc',scope:'protected_fact',supported:true,reason:'Erroneously approved by a model.'}],missingClaims:[]});
  const result=await audit({contract:{sources,profile:session.profile},draft:{prose}});
  assert.equal(result.accepted,false);
  assert.equal(result.issues[0].code,'provenance_missing_source');
});

test('an unknown scope cannot create a source exemption',()=>{
  assert.throws(()=>validateEntailment([claim],{results:[{claimId:'c1',subject:'lead',scope:'anything_is_allowed',supported:true,reason:'Invented exception.'}],missingClaims:[]},prose),/Invalid factual scope/);
});
test('a misclassified user action requires evidence rather than crashing the turn',async()=>{
 const line='Chase says, “You walked across the kitchen.”';let calls=0;
 const audit=provenanceAuditor(async()=>++calls===1?{claims:[{id:'c1',kind:'user_fact',excerpt:'You walked across the kitchen.',proposition:'The user crossed the kitchen.',citations:[]}]}:{results:[{claimId:'c1',subject:'user',scope:'new_present_action_or_speech',supported:true,reason:'This is visible user movement.'}],missingClaims:[]});
 const result=await audit({contract:{sources:[],profile:session.profile},draft:{prose:line}});assert.equal(result.accepted,false);assert(result.issues.some(x=>x.code==='provenance_missing_source'));
});

test('open questions can have NPC subjects while presupposed history remains protected',()=>{
  const question='Chase asks, “Does Adrian want company?”';
  const query={...claim,excerpt:'Does Adrian want company?',proposition:'Whether Adrian wants company is queried.'};
  assert.deepEqual(validateEntailment([query],{results:[{claimId:'c1',subject:'npc',scope:'non_assertive_question',supported:true,reason:'The candidate only asks about an unknown preference.'}],missingClaims:[]},question),[]);
  const loaded='Chase asks, “Why did you leave your notebook yesterday?”';
  const historical={...claim,kind:'shared_history',excerpt:'Why did you leave your notebook yesterday?',proposition:'The user left a notebook yesterday.'};
  assert(validateEntailment([historical],{results:[{claimId:'c1',subject:'user',scope:'protected_fact',supported:false,reason:'The loaded why-question presupposes an unestablished notebook incident.'}],missingClaims:[]},loaded).length);
});
