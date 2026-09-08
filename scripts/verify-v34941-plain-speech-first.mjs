import assert from 'node:assert/strict';
import { buildPlainSpeechFirstV34941, plainSpeechFirstV34941Issues } from '../supabase/functions/character-chat/engine/plain-speech-first-v34941.ts';
let n=0; const ok=(name,fn)=>{fn();n++;console.log(`✓ ${name}`)};
const bad=[
 ['production 1','Chase gives a slow, unbothered nod toward the bar. "Self-preservation. Or just survival instinct. Take your pick."','plain_speech_performed_pseudo_choice'],
 ['production 1 narration','Chase gives a slow, unbothered nod toward the bar. "Self-preservation. Or just survival instinct. Take your pick."','plain_speech_performed_narration'],
 ['production 2','Chase doesn\'t break stride, watching him go with a dry, indifferent slide of his gaze. "See? People manage just fine without instructions."','plain_speech_smug_generalization'],
 ['production 2 narration','Chase doesn\'t break stride, watching him go with a dry, indifferent slide of his gaze. "See? People manage just fine without instructions."','plain_speech_performed_narration'],
 ['production 3','"File it under unsolicited advice. I’m sure someone cares."','plain_speech_writerly_dismissal'],
 ['structural pseudo choice','"Professional curiosity. Occupational hazard. Take your pick."','plain_speech_performed_pseudo_choice'],
 ['structural filing','"Add that to the list. Someone will care."','plain_speech_writerly_dismissal'],
 ['structural cool narration','He gives a lazy, indifferent shrug. "Fine."','plain_speech_performed_narration'],
];
for(const [name,text,issue] of bad) ok(name,()=>assert(plainSpeechFirstV34941Issues(text,'Anyway.').includes(issue)));
ok('plain causal answer passes',()=>assert.equal(plainSpeechFirstV34941Issues('"Wanted a drink."','Why did you come over?').length,0));
ok('plain uncertainty passes',()=>assert.equal(plainSpeechFirstV34941Issues('"I don’t know."','Why?').length,0));
const prompt=buildPlainSpeechFirstV34941({character:{name:'Chase'}});
ok('semantic naked stage',()=>assert(prompt.includes('STAGE 1 — SEMANTIC NAKED ANSWER')));
ok('disclosure stage',()=>assert(prompt.includes('STAGE 2 — DISCLOSURE')));
ok('speak stage',()=>assert(prompt.includes('STAGE 3 — SPEAK')));
ok('zero movement default',()=>assert(prompt.includes('Begin from ZERO physical movement')));
ok('ordinary success',()=>assert(prompt.includes('ORDINARY IS A SUCCESS STATE')));
console.log(`v3.49.41 verifier: ${n}/${n} PASS`);
