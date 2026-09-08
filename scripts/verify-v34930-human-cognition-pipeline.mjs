import fs from 'node:fs';
import { buildHumanCognitionBriefV34930, humanCognitionV34930Issues } from '../supabase/functions/character-chat/engine/human-cognition-pipeline-v34930.ts';
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const src=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
let n=0,ok=0; const check=(name,v)=>{n++; if(v){ok++;console.log('PASS',name)}else{console.error('FAIL',name);process.exitCode=1}};
{ const [a,b,c]=pkg.version.split('.').map(Number); check('version 3.49.30+',a===3&&b===49&&c>=30); }
check('pipeline imported',src.includes('buildHumanCognitionBriefV34930'));
for(const needle of ['PRIVATE MIND MODEL','BELIEFS ARE NOT FACTS','LIMITED PERCEPTION','MEMORY SALIENCE','SAFE HUMAN MISREMEMBERING','UNSPOKEN CONTINUITY','CONVERSATIONAL ATTENTION','HUMAN TURN-TAKING','NO COMPULSORY PROGRESSION','EMOTIONAL INERTIA','MIXED EMOTIONS','RELATIONSHIP ASYMMETRY','RELATIONSHIP BY EVIDENCE','DESIRE CONFLICT','MICRO-DECISION BEFORE SPEECH','NATURAL TOPIC TRANSITIONS','NATURAL MISUNDERSTANDING REPAIR','CHARACTER-SPECIFIC RHYTHM','VOCABULARY FINGERPRINT WITHOUT CARICATURE','SEMANTIC ANTI-REPETITION','ANTI-FLIRTIFICATION','PHYSICAL BEHAVIOR REALISM','BODY CONTINUITY','NPC AUTONOMY','OFF-SCREEN LIFE','SOCIAL CONSEQUENCES','MEANINGFUL SILENCE','CONTROLLED CONVERSATION ENTROPY','INVISIBLE AI-WRITING CRITIC','THE BORING TEST']) check(needle,src.includes(needle));
const brief=buildHumanCognitionBriefV34930({latestUserMessage:'Anyway, why did you come up to me?',recentCharacterReplies:['Fragile constitution.','I am practically a saint.'],scene:{location:'party'}});
check('pre-speech brief has binding order',brief.includes('DECIDE BEFORE SPEAKING')&&brief.includes('HUMANITY CHECK'));
check('stock body language rejected',humanCognitionV34930Issues('He smirks, jaw tightening as his eyes darken. "Fine."','Fine.').includes('human_cognition_stock_body_language'));
check('auto flirtification rejected',humanCognitionV34930Issues('Electricity sparks between them as he leans closer.','What?').includes('human_cognition_auto_flirtification'));
check('oversized micro-turn rejected',humanCognitionV34930Issues('word '.repeat(100),'Okay.').includes('human_cognition_response_weight'));
check('mindread rejected',humanCognitionV34930Issues('"I know you are jealous."','Whatever.').includes('human_cognition_mindread'));
check('ordinary line accepted',humanCognitionV34930Issues('"I saw you over here."','Why did you come up to me?').length===0);
check('v34930 retained near front of stability lab',pkg.scripts['stability:lab'].includes('npm run verify:v34930 && npm run verify:v34929'));
console.log(`\n${ok}/${n} v3.49.30 checks passed.`); if(ok!==n) process.exit(1);
