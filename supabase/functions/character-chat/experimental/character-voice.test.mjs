import test from 'node:test';import assert from 'node:assert/strict';
import {characterVoiceBrief,characterVoiceIssues} from './character-voice.mjs';
import {authorContract} from './model-adapter.mjs';
import {createSession,runTurn} from './core.mjs';
const profile={id:'chase',name:'Chase Beaumont',role:'Campus Heartthrob',emotional_dna:{creator_approved_engine:'ELECTRICITY: socially desired, drawn back without settled feelings. No declarations.',internal_module:'unrelated orchestration'}};
test('approved voice reaches compact author without treating an exemplar as history',()=>{
 const c=authorContract({profile,sources:[]});assert.match(c.characterVoice,/ELECTRICITY/);assert.match(c.characterVoice,/never evidence/);assert.equal(c.profile.emotional_dna,undefined);assert(!c.characterVoice.includes('unrelated orchestration'));
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
test('invented campaign is repaired before factual or semantic approval and only the new words commit',async()=>{
 let calls=0;const good='Chase says, “I wanted you to stay. I was enjoying this.”';
 const result=await runTurn({session:createSession({profile}),message:{id:'m',content:'What did you want to say? Stay here.'},author:async({contract})=>{assert.match(contract.characterVoice,/ELECTRICITY/);return {prose:++calls===1?'Chase says, “I need your support for student-government president.”':good,scenePatch:{}};},provenance:async()=>({accepted:true,issues:[]}),reviewer:async()=>({accepted:true,issues:[]})});
 assert.equal(result.reply,good);assert.equal(result.attempts[0].verdict.accepted,false);assert.equal(result.session.history.at(-1).content,good);
});
