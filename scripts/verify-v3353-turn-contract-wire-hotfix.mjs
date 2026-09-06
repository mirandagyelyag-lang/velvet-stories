import fs from 'node:fs';
const edge = fs.readFileSync('supabase/functions/character-chat/index.ts','utf8');
let pass=0, fail=0;
function check(name, ok){ if(ok){console.log(`✅ ${name}`); pass++;} else {console.error(`❌ ${name}`); fail++;}}
const call = edge.match(/return streamRoleplayV19\(\{([\s\S]*?)\n\s*\}\);/)?.[1] || '';
const sig = edge.match(/async function streamRoleplayV19\(\{([\s\S]*?)\n\}\) \{/)?.[1] || '';
check('turnContract is compiled before generation', edge.includes('const turnContract = compileStoryContract({'));
check('streamRoleplayV19 call receives turnContract', /\bturnContract\s*,/.test(call));
check('streamRoleplayV19 signature accepts turnContract', /\bturnContract\s*=\s*\{\}\s*,/.test(sig));
check('grounded anchors read only an in-scope turnContract', edge.includes('JSON.stringify(turnContract?.storyAuthority?.calendar || [])'));
console.log(`\nTurn Contract Wire Hotfix: ${pass} passed, ${fail} failed`);
if(fail) process.exit(1);
