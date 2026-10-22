import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as nodeModule from 'node:module';

// Static preflight only: Deno startup and deployed Supabase behavior require separate checks.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'supabase/functions/character-chat/index.ts');
const failures = [];
const checks = [];
const check = (name, ok, hint) => {
  checks.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` — ${hint}`}`);
  if (!ok) failures.push(name);
};
let src = '';
try { src = fs.readFileSync(entry, 'utf8'); }
catch (error) { console.error(`FAIL  Cannot read ${path.relative(root, entry)}: ${error.message}`); process.exit(1); }

check('entrypoint contains source', src.trim().length > 0, 'Restore the actual character-chat implementation.');
if (!src.trim()) {
  console.error('BLOCKED: empty entrypoint cannot boot; remaining checks would be misleading.');
  process.exit(1);
}
check('Deno serve entrypoint', /\\bDeno\\.serve\\s*\\(/.test(src), 'Restore Deno.serve(...) in index.ts.');
check('Supabase client import', /import[\\s\\S]{0,400}createClient[\\s\\S]{0,400}from\\s*['"][^'"]*supabase/i.test(src),
  'Ensure createClient is imported from the Supabase client library.');
check('no truncated generateRoleplay declaration', !/async function generateRoleplay\\(\\{[^\\n]+\\}\\s*\\n\\s*async function/.test(src),
  'Inspect generateRoleplay declaration for a missing function body.');
check('no truncated streamAndPersist declaration', !/async function streamAndPersist\\(\\{[\\s\\S]{0,900}?\\}\\s*\\n\\s*function memoryTokenSet/.test(src),
  'Inspect streamAndPersist declaration for a missing body.');
check('no reserved static identifier', !/\\b(?:const|let|var)\\s+static\\s*=/.test(src),
  'Rename the reserved identifier.');

function extractBetween(startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = start < 0 ? -1 : src.indexOf(endMarker, start + startMarker.length);
  return { start, end, body: start >= 0 && end > start ? src.slice(start, end) : '' };
}
const stream = extractBetween('async function streamRoleplayV19', 'async function streamAndPersist');
check('streamRoleplayV19 function exists', stream.start >= 0, 'Streaming function is missing or renamed.');
check('streamAndPersist function exists', src.includes('async function streamAndPersist'), 'Persistence streaming function is missing or renamed.');
check('stream section boundaries valid', stream.end > stream.start && stream.start >= 0,
  'Inspect ordering of streamRoleplayV19 and streamAndPersist.');
if (stream.body) {
  check('stream does not access request-scoped loaded', !/\\bloaded\\s*\\./.test(stream.body),
    'Pass needed data explicitly into the streaming function.');
  check('stream has arc and plan context', /\\bactiveArcs\\s*,\\s*activePlans\\b/.test(stream.body),
    'Restore the explicit arc/plan inputs in streaming.');
}
if (typeof nodeModule.stripTypeScriptTypes === 'function') {
  try {
    nodeModule.stripTypeScriptTypes(src, { mode: 'strip', sourceUrl: entry });
    check('entrypoint TypeScript syntax', true, '');
  } catch (error) {
    check('entrypoint TypeScript syntax', false, error.message);
  }
} else {
  check('Node supports TypeScript syntax validation', false,
    'Use Node 22.13+ to run this syntax check.');
}

console.log(`\\nEdge static preflight: ${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) {
  console.error(`FAILED: ${failures.join('; ')}`);
  process.exitCode = 1;
} else {
  console.log('PASS: source preflight completed. Deno boot and deployed function still require integration testing.');
}
