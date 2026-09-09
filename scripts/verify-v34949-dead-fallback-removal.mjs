import fs from 'node:fs';
const edge=fs.readFileSync('supabase/functions/character-chat/index.ts','utf8');
const intent=fs.readFileSync('supabase/functions/character-chat/engine/intent-subtext-lock.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const tests=[
 ['version',Number(pkg.version.split('.').slice(-1)[0])>=49],
 ['dead ack detector remains',intent.includes('dead_ack_after_nonverbal_cue')],
 ['bare okay detector remains',intent.includes('(?:okay|ok|right|sure|yeah|yep|mhm|uh huh|fine)')],
 ['old deterministic okay fallback removed',!edge.includes(": '\"Okay.\"';")],
 ['dead deterministic prose fallback removed in descendant',!edge.includes(': "A beat passes.";')],
 ['root cause documented',edge.includes('why regeneration') && edge.includes('could return \"Okay.\" forever')],
 ['dead ack remains hard intent',edge.includes('"dead_ack_after_nonverbal_cue"')],
 ['repair instruction still blocks okay',edge.includes('Do not answer with bare Okay/Right/Sure/Yeah')],
 ['meaningful silence rule remains',edge.includes('MEANINGFUL SILENCE')],
 ['regen clears stale stop',fs.readFileSync('src/pages/Chat.jsx','utf8').includes('stoppedRef.current = false;\n    variantGenerationLockRef.current = true;')],
];
let fail=0; for(const [n,ok] of tests){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(!ok)fail++;}
if(fail)process.exit(1); console.log(`\n${tests.length}/${tests.length} PASS · v3.49.49 dead fallback removal`);
