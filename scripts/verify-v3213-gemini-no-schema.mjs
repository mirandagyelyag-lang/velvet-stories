import fs from 'node:fs';
const src=fs.readFileSync('supabase/functions/character-chat/index.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const ver=JSON.parse(fs.readFileSync('public/velvet-version.json','utf8'));
const checks=[
 ['package is 3.21.3', pkg.version==='3.21.3'],
 ['public version is 3.21.3', ver.version==='3.21.3'],
 ['release identifies no-schema hotfix', /No-Schema Hotfix/i.test(ver.release||'')],
 ['character-chat sends zero responseJsonSchema fields', !src.includes('responseJsonSchema')],
 ['nonstream roleplay starts in JSON mode', src.includes('let { response, data } = await runAttempt("json")')],
 ['nonstream roleplay falls back to bare on HTTP 400', src.includes('({ response, data } = await runAttempt("bare"))')],
 ['stream roleplay starts in JSON mode', src.includes('let { response, message } = await runStreamAttempt("json")')],
 ['stream roleplay falls back to bare on HTTP 400', src.includes('({ response, message } = await runStreamAttempt("bare"))')],
 ['JSON MIME stays enabled', src.includes('responseMimeType: "application/json"')],
 ['bare fallback remains contents-only', src.includes('Compatibility floor: only the universally-required `contents`') && src.includes('True compatibility fallback: no systemInstruction')],
 ['local envelope parser remains active', src.includes('parseModelEnvelope(raw)')],
 ['Emotional Intelligence continuity remains present', src.includes('post_turn_reflection') && src.includes('emotional_causality') && src.includes('scene_momentum')],
 ['Human Behavior continuity remains present', src.includes('human_behavior_update')],
];
let fail=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${n}`); if(!ok)fail++;}
console.log(`\n${checks.length-fail}/${checks.length} passed.`); if(fail)process.exit(1);
