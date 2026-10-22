import fs from 'node:fs';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const index = read('supabase/functions/character-chat/index.ts');
const contract = read('supabase/functions/character-chat/engine/story-contract.ts');
const pkg = JSON.parse(read('package.json'));
const checks=[
 ['version is v3.50.x descendant',/^(?:3\.50\.\d+|3\.(?:5[1-9]|[6-9]\d)\.\d+)$/.test(pkg.version)],
 ['single core marker',index.includes('VELVET STORIES 3.50 · CONVERSATION CORE RESET')],
 ['turn truth priority',index.includes('ABSOLUTE PRIORITY · TURN TRUTH')],
 ['actor recipient lock',index.includes('Never swap actor and recipient')],
 ['user action already happened',index.includes('HAS ALREADY HAPPENED')],
 ['instant story early turn rule',index.includes('INSTANT STORY / EARLY-TURN RULE')],
 ['opening canon rule',index.includes('The opening message is canon, not decorative setup')],
 ['sarcasm cannot reverse facts',index.includes('A joke cannot reverse who did what')],
 ['raw recent truth turns',index.includes('RECENT TURNS · HIGHEST AUTHORITY')],
 ['legacy prompt stack bypassed',index.includes('intentionally unreachable from live narrative generation')],
 ['no instant fallback Okay',!index.includes('“Okay. I’m listening.”')],
 ['v3500 remains in stability lab',pkg.scripts?.['stability:lab']?.includes('npm run verify:v3500')],
 ['contract authority preserves explicit canon corrections',contract.includes('latest explicit canon correction') && contract.includes('latest visible user turn')],
 ['contract records explicit user actions',contract.includes('extractUserActions') && contract.includes('movementIsExplicit')],
 ['contract preserves location and scene time',contract.includes('finalState:') && contract.includes('time_label') && contract.includes('location')],
 ['contract retains present participants',contract.includes('present') && contract.includes('sceneState')],
 ['contract retains durable cast',contract.includes('persistentCast') && contract.includes('supportingCast')],
 ['contract separates character initiative from user movement',contract.includes('initiativePlan:') && contract.includes('movementIsExplicit')],
 ['contract enforces user boundaries',contract.includes('Honor the boundary immediately')],
 ['contract records relationship milestones',contract.includes('milestones') && contract.includes('never replay them as firsts')],
 ['contract retains character voice anchors',contract.includes('voiceAnchors') && contract.includes('speech_style')],
 ['contract avoids treating an unaccepted plan as canon',contract.includes('A proposal is not accepted until the user accepts it')],
];
// Static integration checks cannot prove that generated replies obey these rules.
let bad=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${name}`); if(!ok) bad++;}
console.log(`\n${checks.length-bad}/${checks.length} PASS`); if(bad) process.exitCode=1;
