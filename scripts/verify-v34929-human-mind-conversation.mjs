import fs from 'node:fs';
import { hasHumanMindDialogueArtifice } from '../supabase/functions/character-chat/engine/intent-subtext-lock.ts';
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const src=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
let n=0,ok=0; const check=(name,v)=>{n++; if(v){ok++; console.log('PASS',name)}else{console.error('FAIL',name);process.exitCode=1}};
check('version 3.49.29+', /^3\.49\.(?:29|[3-9]\d|\d{3,})$/.test(pkg.version));
for (const [name,needle] of [
 ['inner state continuity','INNER STATE CONTINUITY v3.49.29'],['selective disclosure','SELECTIVE DISCLOSURE v3.49.29'],['human imperfection','HUMAN IMPERFECTION + SPEECH FRICTION v3.49.29'],['conversation momentum','CONVERSATIONAL MOMENTUM v3.49.29'],['meaningful evasion','MEANINGFUL EVASION v3.49.29'],['probabilistic habits','CHARACTER HABITS ARE PROBABILITIES v3.49.29'],['anti AI dialogue','ANTI-AI DIALOGUE v3.49.29'],['complex underneath simple on top','COMPLEX UNDERNEATH, SIMPLE ON TOP v3.49.29']]) check(name,src.includes(needle));
check('rejects therapy speak',hasHumanMindDialogueArtifice('Your feelings are valid. I want to hold space for you.','I am mad at you'));
check('rejects quote card banter',hasHumanMindDialogueArtifice("Careful what you wish for.",'Fine.'));
check('rejects repeated/name performance',hasHumanMindDialogueArtifice('Antonia, come on, Antonia.','What?'));
check('accepts plain human answer',!hasHumanMindDialogueArtifice("I don't know. I saw you over here.",'Why did you come up to me?'));
check('v34929 lineage follows v34930',pkg.scripts['stability:lab'].includes('npm run verify:v34930 && npm run verify:v34929 && npm run verify:v34928'));
console.log(`\n${ok}/${n} v3.49.29 checks passed.`); if(ok!==n) process.exit(1);
