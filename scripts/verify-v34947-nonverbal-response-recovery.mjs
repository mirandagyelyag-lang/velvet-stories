import fs from 'node:fs';
import assert from 'node:assert/strict';
const engine = fs.readFileSync(new URL('../supabase/functions/character-chat/engine/intent-subtext-lock.ts', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const tests = [
 ['version is 3.49.47', pkg.version === '3.49.47'],
 ['detector exists', engine.includes('hasDeadAcknowledgementAfterNonverbalCue')],
 ['bare Okay detector is action-only scoped', engine.includes('const actionOnly =') && engine.includes('dead_ack_after_nonverbal_cue')],
 ['issue wired into intent validation', engine.includes('issues.push("dead_ack_after_nonverbal_cue")')],
 ['repair instruction forbids bare acknowledgement', index.includes('dead_ack_after_nonverbal_cue:') && index.includes('Do not answer with bare Okay/Right/Sure/Yeah')],
 ['meaningful silence rule preserves silence', index.includes('silence is allowed if natural') || index.includes('silence is allowed if natural'.replace('silence','Silence'))],
 ['hard sanitizer knows issue', index.includes('"intent_thread_abandoned", "dead_ack_after_nonverbal_cue"')],
 ['score penalizes issue', index.includes('intentIssuesForScore.includes("dead_ack_after_nonverbal_cue")')],
 ['stability lab starts with v34947', pkg.scripts['stability:lab'].startsWith('npm run verify:v34947 && npm run verify:v34946')],
];
let pass=0; for (const [name,ok] of tests){ assert.ok(ok,name); console.log('PASS',name); pass++; } console.log(`v3.49.47 ${pass}/${tests.length} PASS`);
