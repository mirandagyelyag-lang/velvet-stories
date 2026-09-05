import fs from 'node:fs';
const edge = fs.readFileSync('supabase/functions/character-chat/index.ts','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const pub = JSON.parse(fs.readFileSync('public/velvet-version.json','utf8'));
const checks = [
  ['version 3.26.0', pkg.version === '3.26.0' && pub.version === '3.26.0'],
  ['blind voice test', edge.includes('BLIND VOICE TEST:')],
  ['plain question rule', edge.includes('PLAIN-QUESTION RULE:')],
  ['character-specific tactic', edge.includes('CHARACTER-SPECIFIC SOCIAL TACTIC:')],
  ['blank voice fallback', edge.includes('MISSING VOICE FIELDS ARE NOT PERMISSION TO GO GENERIC:')],
  ['generic campus voice ban', edge.includes('GENERIC CAMPUS VOICE BAN:')],
  ['generic AI voice detector', edge.includes('function hasGenericAIVoice(')],
  ['GPA filler rejected', edge.includes('keep(?:ing)? my gpa from')],
  ['burnout filler rejected', edge.includes('mid semester burnout')],
  ['library filler rejected', edge.includes('escape the library')],
  ['generic voice triggers repair', edge.includes('"generic_ai_voice",') && edge.includes('generic_ai_voice: "Rewrite the spoken lines')],
];
let fails=0;
for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) fails++; }
console.log(`\n${checks.length-fails}/${checks.length} Voice Identity checks passed.`);
if (fails) process.exit(1);
