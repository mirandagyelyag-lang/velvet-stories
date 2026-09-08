import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTargetAwareDialogueV34943, targetAwareDialogueV34943Issues } from '../supabase/functions/character-chat/engine/target-aware-dialogue-v34943.ts';
let n=0; const ok=(name,fn)=>{fn();n++;console.log(`✓ ${name}`)};
const q='Anyway, why did you come up to me?';
for (const [name,text,issue] of [
 ['abstract curiosity','Curiosity. Mostly.','target_dialogue_abstract_fragment'],
 ['premise denial','"I didn\'t."','target_dialogue_premise_denial'],
 ['location cause','I wanted a drink.','target_dialogue_location_not_interaction'],
 ['quip evasion',`I didn't think you needed a witness to your charm.`,'target_dialogue_quip_evasion'],
]) ok(name,()=>assert(targetAwareDialogueV34943Issues(text,q).includes(issue)));
for(const good of ['Wanted to talk to you.','You looked bored.','I needed to ask you something.',`I don't know. I just wanted to.`]) ok(`interaction answer: ${good}`,()=>assert.equal(targetAwareDialogueV34943Issues(good,q).length,0));
const prompt=buildTargetAwareDialogueV34943({latestUserMessage:q,character:{name:'Chase'}});
ok('approach target gate active',()=>assert(prompt.includes('APPROACH-TARGET GATE: ACTIVE')));
ok('distinguishes location from interaction',()=>assert(prompt.includes('LOCATION CAUSE with INTERACTION CAUSE')));
ok('guarded is not evasion',()=>assert(prompt.includes('Guarded does NOT mean semantic evasion')));
ok('anti generic fragment',()=>assert(prompt.includes('Curiosity. Mostly.')));
const index=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
ok('target gate injected after lean core',()=>assert(index.includes('${leanDialogueCoreV34942}\n\n${targetAwareDialogueV34943}')));
ok('validator wired',()=>assert(index.includes('targetAwareDialogueV34943Issues(text')));
ok('score wired',()=>assert(index.includes('targetAwareIssuesForScore.length * 18')));
console.log(`v3.49.43 verifier: ${n}/${n} PASS`);
