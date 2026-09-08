import assert from 'node:assert/strict';
import { naturalDialogueResetV34940Issues, buildNaturalDialogueResetV34940 } from '../supabase/functions/character-chat/engine/natural-dialogue-reset-v34940.ts';
let n=0; const ok=(name,fn)=>{fn();n++;console.log(`✓ ${name}`)};
const bad=[
 ['dead callback','"Fragile constitution."','natural_dialogue_dead_callback'],
 ['perimeter callback','"We can skip the perimeter check if you’re actually going to sit down for five minutes."','natural_dialogue_dead_callback'],
 ['authored persistent line','"You’re persistent, I’ll give you that. It’s a miracle you haven’t decided I’m a lost cause yet."','natural_dialogue_authored_banter'],
 ['author mask','Chase leaned back slightly, his expression smoothing into that practiced, unbothered mask.','natural_dialogue_author_interpretation'],
 ['meta silence','He took a slow breath, letting the silence hang between them rather than rushing to fill it.','natural_dialogue_meta_silence'],
 ['cool choreography','He took a slow breath and leaned back slightly.','natural_dialogue_choreographed_coolness'],
 ['relentless line','"You’re relentless, you know that? Most people would have let that slide by now."','natural_dialogue_authored_banter'],
 ['personal space','He takes a casual step closer, leaning slightly into your personal space.','natural_dialogue_unearned_proximity'],
];
for(const [name,text,issue] of bad) ok(name,()=>assert(naturalDialogueResetV34940Issues(text,'Anyway.').includes(issue)));
ok('plain line passes',()=>assert.equal(naturalDialogueResetV34940Issues('"I don’t know. I just came over."','Why did you come over?').length,0));
ok('prompt has text-message test',()=>assert(buildNaturalDialogueResetV34940({}).includes('TEXT-MESSAGE TEST')));
ok('prompt says trait through choice',()=>assert(buildNaturalDialogueResetV34940({}).includes('PERSONALITY THROUGH CHOICE')));
console.log(`v3.49.40 verifier: ${n}/${n} PASS`);
