import fs from 'node:fs';
const edge=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const tests=[
 ['version 3.50.7+ descendant',/^3\.50\.(?:7|8)$/.test(pkg.version)],
 ['plain prose transport recovery exists',edge.includes('TRANSPORT RECOVERY v3.50.7')],
 ['stream starts with bare transport',edge.includes('let { response, message } = await runStreamAttempt("bare");')],
 ['nonstream recovery starts with bare transport',edge.includes('let { response, data } = await runAttempt("bare");')],
 ['plain transport forbids JSON',edge.includes('Return ONLY the visible in-character roleplay reply as plain prose')],
 ['plain transport forbids metadata',edge.includes('Do not return JSON, metadata, keys, code fences, or explanations')],
 ['plain prose still enters envelope adapter',edge.includes('return emptyModelEnvelope(clean);')],
 ['blank reply guard remains',edge.includes('Gemini returned an empty reply')],
];
let fail=0; for (const [n,ok] of tests){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(!ok)fail++;}
console.log(`\nv3.50.7 visible prose recovery: ${tests.length-fail}/${tests.length} PASS`); if(fail)process.exit(1);
