import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildLeanDialogueCoreV34942, leanDialogueCoreV34942Issues } from '../supabase/functions/character-chat/engine/lean-dialogue-core-v34942.ts';
let n=0; const ok=(name,fn)=>{fn();n++;console.log(`✓ ${name}`)};
const why='Anyway, why did you come up to me?';
const bad=[
 ['negative instead of answer',`"I didn't come over for your conversation."`,'lean_core_causal_nonanswer'],
 ['technicality',`"I didn't come up. I was already here. You walked into my radius."`,'lean_core_causal_nonanswer'],
 ['survivor quip',`"To check if he survived."`,'lean_core_causal_quip_substitution'],
 ['survival quip',`Chase gives a slow, unbothered nod. "Self-preservation. Or survival instinct. Take your pick."`,'lean_core_causal_quip_substitution'],
 ['performed quip',`"It's called keeping interesting company. Try it sometime."`,'lean_core_performed_quip'],
 ['writerly dismissal',`"File it under unsolicited advice. I'm sure someone cares."`,'lean_core_performed_quip'],
 ['performed body',`Chase gives a slow, unbothered nod. "Fine."`,'lean_core_performed_body_language'],
];
for(const [name,text,issue] of bad) ok(name,()=>assert(leanDialogueCoreV34942Issues(text,why).includes(issue)));
for(const good of ['"Wanted a drink."','"I wanted to talk to you."','"I was bored."',`"I don't know. Felt like it."`]) ok(`plain answer passes: ${good}`,()=>assert.equal(leanDialogueCoreV34942Issues(good,why).length,0));
const prompt=buildLeanDialogueCoreV34942({latestUserMessage:why,character:{name:'Chase'}});
ok('causal gate active',()=>assert(prompt.includes('CAUSAL GATE: ACTIVE')));
ok('direct answer gate active',()=>assert(prompt.includes('first spoken clause must materially answer')));
ok('default still',()=>assert(prompt.includes('DEFAULT BODY STATE = STILL')));
ok('dialogue-only preferred',()=>assert(prompt.includes('Dialogue-only is preferred')));
const index=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
ok('lean core injected',()=>assert(index.includes('${leanDialogueCoreV34942}')));
ok('old brief block removed from visible prompt',()=>assert(!index.includes('${humanCognitionBriefV34930}\n\n${individualHumanPsycheV34931}')));
ok('validator wired',()=>assert(index.includes('leanDialogueCoreV34942Issues(text')));
ok('hard repair wired',()=>assert(index.includes('"lean_core_causal_nonanswer"')));
console.log(`v3.49.42 verifier: ${n}/${n} PASS`);
