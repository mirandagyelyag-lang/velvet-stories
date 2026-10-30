import test from 'node:test';import assert from 'node:assert/strict';
import {characterVoiceBrief,characterVoiceIssues,trimChaseReactionCoda} from './character-voice.mjs';
import {authorContract} from './model-adapter.mjs';
import {createSession,runTurn,turnContract} from './core.mjs';
const profile={id:'chase',name:'Chase Beaumont',role:'Campus Heartthrob',emotional_dna:{creator_approved_engine:'ELECTRICITY: socially desired, drawn back without settled feelings. No declarations.',internal_module:'unrelated orchestration'}};
test('approved voice reaches compact author without treating an exemplar as history',()=>{
 const c=authorContract({profile,sources:[]});assert.match(c.characterVoice,/ELECTRICITY/);assert.match(c.characterVoice,/never evidence/);assert.equal(c.profile.emotional_dna,undefined);assert(!c.characterVoice.includes('unrelated orchestration'));
});
test('approved prose calibrates voice but is not added to the factual source catalog',()=>{
 const c=authorContract({profile:{...profile,emotional_dna:{...profile.emotional_dna,creator_approved_opening:'A fictional sample with a mark on his cheek.'}},sources:[]});
 assert.match(c.characterVoice,/A fictional sample/);assert.match(c.characterVoice,/establishes NO facts/);assert.deepEqual(c.sources,[]);
});
test('the real turn catalog excludes illustrative events while preserving creator age corrections',()=>{
 const c=turnContract(createSession({profile:{...profile,emotional_dna:{...profile.emotional_dna,creator_approved_opening:'The notebook you left yesterday is in his bag.',canonical_age:24,user_persona_age:21}}}),{id:'m',content:'Hello.'});
 assert(!c.sources.some(s=>s.text.includes('notebook')));assert(c.sources.some(s=>s.id==='profile/canonical_age'&&s.text==='24'));assert(c.sources.some(s=>s.id==='profile/user_persona_age'&&s.text==='21'));
 assert.match(c.characterVoice,/notebook/);assert.match(c.characterVoice,/establishes NO facts/);
});
test('the focused author preserves story direction and requested length as instructions, not factual evidence',()=>{
 const session=createSession({profile});session.creatorDirection='Keep the dialogue brief and in Spanish.';session.responseLength='short';
 const c=authorContract(turnContract(session,{id:'m',content:'Hello.'}));assert.equal(c.creatorDirection,session.creatorDirection);assert.equal(c.requestedResponseLength,'short');assert(!c.sources.some(x=>x.text===session.creatorDirection));
});
test('unconfigured campaign is blocked, explicit user premise stays possible',()=>{
 const reply='Chase says, “I’m thinking of running for student‑government president.”';
 assert.equal(characterVoiceIssues(profile,{},[],reply)[0]?.code,'voice_invented_institutional_plot');
 assert.equal(characterVoiceIssues(profile,{content:'I want a story about his student-government president campaign.'},[],reply).length,0);
 assert.equal(characterVoiceIssues({name:'Another lead'}, {},[],reply).length,0);
});
test('natural direct answers and optional playful speech do not need a stock tone label',()=>{
 assert.equal(characterVoiceIssues(profile,{},[],'Chase says, “I wanted you to stay. There. Terrible sales pitch.”').length,0);
 assert.equal(characterVoiceIssues(profile,{},[],'Chase leans closer, his tone dropping from its usual teasing edge. “Stay.”')[0]?.code,'voice_label_instead_of_speech');
});
test('the observed passive reaction coda is rejected without banning quiet actions',()=>{
 assert.equal(characterVoiceIssues(profile,{},[],'Chase lets the words hang, eyes flicking to the doorway as if waiting for a reaction.')[0]?.code,'voice_passive_reaction_coda');
 assert.equal(characterVoiceIssues(profile,{},[],'Chase waits beside the door. “Take your time.”').length,0);
});
test('only a disposable trailing reaction coda can be removed',()=>{
 const line='Chase says, “I wanted you to stay.”';
 assert.equal(trimChaseReactionCoda(profile,line+' He lets the words hang, eyes flicking to the doorway as if waiting for a reaction.'),line);
 for(const tail of [' He hands you the note, waiting for your reaction.',' Chase says, waiting for your reaction.',' He walks to the sink, waiting for your reaction.',' He raises his glass, waiting for your reaction.',' He lets the words hang, then signals the bartender, waiting for your reaction.'])assert.equal(trimChaseReactionCoda(profile,line+tail),line+tail);
 assert.equal(trimChaseReactionCoda(profile,'Chase says, “I am waiting for your reaction.”'),'Chase says, “I am waiting for your reaction.”');
});
test('copyediting a coda still requires the full source and semantic audits before acceptance',async()=>{
 let factual=0,semantic=0;
 const result=await runTurn({session:createSession({profile}),message:{id:'m',content:'Stay here.'},author:async()=>({prose:'Chase says, “I wanted you to stay.” He waits for your reaction.',scenePatch:{}}),provenance:async({draft})=>{factual++;assert(!draft.prose.includes('reaction'));return {accepted:true,issues:[]};},reviewer:async()=>{semantic++;return {accepted:true,issues:[]};}});
 assert.equal(result.reply,'Chase says, “I wanted you to stay.”');assert.equal(factual,1);assert.equal(semantic,1);
});
test('invented campaign is repaired before factual or semantic approval and only the new words commit',async()=>{
 let calls=0;const good='Chase says, “I wanted you to stay. I was enjoying this.”';
 const result=await runTurn({session:createSession({profile}),message:{id:'m',content:'What did you want to say? Stay here.'},author:async({contract})=>{assert.match(contract.characterVoice,/ELECTRICITY/);return {prose:++calls===1?'Chase says, “I need your support for student-government president.”':good,scenePatch:{}};},provenance:async()=>({accepted:true,issues:[]}),reviewer:async()=>({accepted:true,issues:[]})});
 assert.equal(result.reply,good);assert.equal(result.attempts[0].verdict.accepted,false);assert.equal(result.session.history.at(-1).content,good);
});
