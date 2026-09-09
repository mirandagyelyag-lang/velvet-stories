import fs from 'node:fs';
const chat=fs.readFileSync('src/pages/Chat.jsx','utf8');
const edge=fs.readFileSync('supabase/functions/character-chat/index.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const tests=[
 ['version',/^3\.49\.(?:48|49)$/.test(pkg.version)],
 ['regen clears stale stop',chat.includes('stoppedRef.current = false;\n    variantGenerationLockRef.current = true;')],
 ['reply history 16',edge.includes('recentMessages.slice(-16)')],
 ['tracks referents',edge.includes('pronouns/referents, promises, jokes, questions')],
 ['user voice ownership',edge.includes("USER'S reply voice from THEIR recent messages only")],
 ['no character voice leak',edge.includes('DO NOT imitate their voice for user replies')],
 ['draft preservation',edge.includes('preserve what the user is trying to say')],
 ['four distinct tactics',edge.includes('four different conversational tactics')],
 ['blocks generic filler',edge.includes('No generic filler options like')],
 ['micro continuity',edge.includes('preserve micro-continuity')],
 ['custom priority',edge.includes('CUSTOM instruction is highest priority')],
 ['exactly four unique',edge.includes('if(unique.length===4)')],
];
let fail=0; for(const [n,ok] of tests){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(!ok)fail++;}
if(fail)process.exit(1); console.log(`\n${tests.length}/${tests.length} PASS · v3.49.48 regeneration + Reply Companion`);
