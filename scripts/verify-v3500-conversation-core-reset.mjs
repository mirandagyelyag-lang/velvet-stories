import fs from 'node:fs';
const index=fs.readFileSync('supabase/functions/character-chat/index.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
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
];
let bad=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${name}`); if(!ok) bad++;}
console.log(`\n${checks.length-bad}/${checks.length} PASS`); if(bad) process.exit(1);
