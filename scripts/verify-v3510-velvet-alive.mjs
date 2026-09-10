import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const edge=read('supabase/functions/character-chat/index.ts');
const perf=read('supabase/functions/character-chat/engine/performance-mobile-v348.ts');
const assist=read('supabase/functions/reply-assist/index.ts');
const chat=read('src/pages/Chat.jsx');
const checks=[
 ['version 3.51.0',pkg.version==='3.51.0'],
 ['fast standard hedge',perf.includes('hedgeDelaysMs:[0,150,340,650]')],
 ['character initiative',edge.includes('CHARACTER INITIATIVE')&&edge.includes('Do not make the user carry every scene')],
 ['affection through behavior',edge.includes('AFFECTION THROUGH BEHAVIOR')&&edge.includes('Courtship should feel chosen')],
 ['human pacing',edge.includes('HUMAN PACING')&&edge.includes('1-3 natural sentences')],
 ['living world',edge.includes('LIVING WORLD')&&edge.includes('Never fake elapsed time')],
 ['reply assist isolated',chat.includes('supabase.functions.invoke("reply-assist"')],
 ['story paths preserved',chat.includes('What happens next?')&&assist.includes('story_paths')],
 ['no forced user POV',edge.includes('Do not narrate the user’s private thoughts')],
 ['speed recovery preserved',edge.includes('v3.49.4 RECOVER COMPLETED REPLY')&&edge.includes('salvage')],
];
let fail=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${n}`); if(!ok)fail++;}
console.log(`\n${checks.length-fail}/${checks.length} PASS`); if(fail)process.exit(1);
