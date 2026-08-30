import fs from 'node:fs';
const src = fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts', import.meta.url), 'utf8');
const liveStreamBody = src.slice(src.indexOf('async function streamRoleplayV19'), src.indexOf('async function streamAndPersist'));
const checks = [
  ['no truncated generateRoleplay declaration', !/async function generateRoleplay\(\{[^\n]+\}\s*\n\s*async function/.test(src)],
  ['no truncated streamAndPersist declaration', !/async function streamAndPersist\(\{[\s\S]{0,900}?\}\s*\n\s*function memoryTokenSet/.test(src)],
  ['no reserved static identifier', !/\bconst\s+static\s*=/.test(src)],
  ['character-chat still owns Deno serve entrypoint', /Deno\.serve\s*\(/.test(src)],
  ['character-chat still imports Supabase client', /createClient/.test(src)],
  ['live stream never references request-scoped loaded context', !/\bloaded\./.test(liveStreamBody) && /activeArcs, activePlans/.test(liveStreamBody)],
];
let failed=0;
for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'}  ${name}`); if(!ok) failed++; }
if (failed) process.exit(1);
console.log(`\n${checks.length} Edge boot source checks passed.`);
