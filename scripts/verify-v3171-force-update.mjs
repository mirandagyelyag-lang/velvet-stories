import fs from 'node:fs';

const edge = fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts', import.meta.url), 'utf8');
const contract = fs.readFileSync(new URL('../supabase/functions/character-chat/engine/story-contract.ts', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const pwa = fs.readFileSync(new URL('../src/context/PWAContext.jsx', import.meta.url), 'utf8');
const android = fs.readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');

const checks = [
  ['version 3.17.1', pkg.version === '3.17.1'],
  ['human imperfection prompt', edge.includes('HUMAN IMPERFECTION')],
  ['asymmetric development prompt', edge.includes('DEVELOPMENT IS ASYMMETRIC')],
  ['relapse without reset', edge.includes('RELAPSE WITHOUT RESET')],
  ['learning is not optimization', edge.includes('LEARNING IS NOT OPTIMIZATION')],
  ['subtext needs air', edge.includes('SUBTEXT NEEDS AIR')],
  ['development state is live prompt context', edge.includes('DEVELOPMENT STATE — CHANGE SLOWLY, BEHAVIOR FIRST')],
  ['flaw pressure persisted', edge.includes('flaw_pressure')],
  ['independent priority persisted', edge.includes('independent_priority')],
  ['repair progress persisted', edge.includes('repair_progress')],
  ['supporting cast offscreen continuity', edge.includes('Supporting characters have off-screen continuity too')],
  ['dialogue can satisfy initiative', contract.includes('Dialogue can satisfy initiative when it contains a real decision')],
  ['independent life can compete with romance', contract.includes('Their life may inconveniently compete with the relationship')],
  ['growth does not flatten flaws', contract.includes('Development is asymmetric')],
  ['stress relapse is modeled', contract.includes('People relapse under pressure')],
  ['learning user is not optimization', contract.includes('Learning the protagonist is not optimization')],
  ['arc progress uses recorded event', edge.includes('const arcWorthyEvent = Boolean(timelineEvent?.record)')],
  ['arc progress no longer keyword-driven', !edge.includes('active.length && /\\b(?:decid|admit|kiss|invite')],
  ['conflict repair requires concrete repair', edge.includes('const concreteRepair =')],
  ['repair maps include optimization guard', edge.includes('instant_personality_optimization')],
  ['repair maps include conflict reset guard', edge.includes('conflict_instant_reset')],
  ['repair maps include subtext dump guard', edge.includes('explanatory_subtext_dump')],
  ['supporting cast schema includes goals', edge.includes('required: [\"name\", \"role\", \"relationship\", \"personality_note\", \"current_dynamic\", \"goals\"')],
  ['forgotten knowledge does not become known again', edge.includes('String(item?.status) === \"forgotten\" ? \"unknown\"')],
  ['relationship phases are not a romance railroad', edge.includes('Relationship phases are descriptive, not a romance railroad')],
  ['PWA uses automatic updates', vite.includes('registerType: "autoUpdate"')],
  ['new service worker skips waiting', vite.includes('skipWaiting: true')],
  ['new service worker claims clients', vite.includes('clientsClaim: true')],
  ['controller change forces reload', pwa.includes('controllerchange') && pwa.includes('window.location.reload()')],
  ['android build bumped', android.includes('versionCode 18') && android.includes('versionName "3.17.1"')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
