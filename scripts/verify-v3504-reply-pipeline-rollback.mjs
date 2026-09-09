import fs from 'node:fs'; import assert from 'node:assert/strict';
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));
const src=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
let n=0; const test=(name,fn)=>{fn(); n++; console.log(`PASS ${n}: ${name}`)};
test('version is v3.50.4+ descendant',()=>assert.match(pkg.version,/^3\.50\.(?:4|5)$/));
test('nickname lane runtime removed',()=>assert(!src.includes('function characterNicknameLane(')));
test('nickname instruction runtime removed',()=>assert(!src.includes('characterNicknameInstruction(userIdentity.name, character)')));
test('v3.50.3 empty firewall runtime removed',()=>assert(!src.includes('v3.50.3 EMPTY-REPLY FIREWALL')));
test('conversation core reset remains',()=>assert(src.includes('CONVERSATION CORE') || src.includes('v3.50.0')));
test('instant story scene diversity remains',()=>assert(src.includes('v3.50.1') || src.includes('ACADEMIC')));
test('provider failover remains',()=>assert(src.includes('streamGeminiEnvelopeWithFailover')));
test('retry error path remains diagnostic only',()=>assert(src.includes("Velvet couldn't finish this reply right now. Retry in a moment.")));

test('stability lab skips rolled-back v3502 verifier',()=>assert.doesNotMatch(pkg.scripts?.['stability:lab'] || '',/verify:v3502/));
console.log(`\nv3.50.4 reply pipeline rollback: ${n}/${n} PASS`);
