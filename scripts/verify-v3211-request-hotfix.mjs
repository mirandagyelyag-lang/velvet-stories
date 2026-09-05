import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`, import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));
const pub=JSON.parse(read('public/velvet-version.json'));
const edge=read('supabase/functions/character-chat/index.ts');
const checks=[
 ['package version 3.21.1',pkg.version==='3.21.1'],
 ['public version 3.21.1',pub.version==='3.21.1'],
 ['transport schema is shallow',edge.includes('function roleplayTransportSchema()') && edge.includes('additionalProperties: true')],
 ['roleplay calls use transport schema',(edge.match(/responseJsonSchema: roleplayTransportSchema\(\)/g)||[]).length>=2],
 ['stream invalid argument fallback',edge.includes('Gemini rejected structured stream schema; retrying JSON transport without schema')],
 ['nonstream invalid argument fallback',edge.includes('Gemini rejected structured schema; retrying JSON transport without schema')],
 ['full Human Behavior schema retained',edge.includes('function roleplayResponseSchema()') && edge.includes('human_behavior_update')],
 ['Human Behavior state retained',edge.includes('human_behavior_update') && edge.includes('naturalness_score') && edge.includes('character_dna')],
 ['diagnostics reports hotfix',edge.includes('version: "3.21.1"')],
];
let pass=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${name}`); if(ok) pass++;}
if(pass!==checks.length){console.error(`\nverify:v3211 failed (${pass}/${checks.length}).`); process.exit(1)}
console.log(`\nverify:v3211 passed (${pass}/${checks.length}).`);
