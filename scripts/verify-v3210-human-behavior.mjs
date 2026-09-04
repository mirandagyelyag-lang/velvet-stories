import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const edge=fs.readFileSync(path.join(root,'supabase/functions/character-chat/index.ts'),'utf8');
const vite=fs.readFileSync(path.join(root,'vite.config.js'),'utf8');
const pwa=fs.readFileSync(path.join(root,'src/context/PWAContext.jsx'),'utf8');
const vercel=fs.readFileSync(path.join(root,'vercel.json'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const ver=JSON.parse(fs.readFileSync(path.join(root,'public/velvet-version.json'),'utf8'));
const checks=[
 ['package version 3.21.0',pkg.version==='3.21.0'],
 ['public version 3.21.0',ver.version==='3.21.0'],
 ['conversational rhythm engine',edge.includes('CONVERSATIONAL RHYTHM')&&edge.includes('rhythm_mode')&&edge.includes('hasMechanicalRhythmLoop')],
 ['nonverbal intelligence',edge.includes('NONVERBAL INTELLIGENCE')&&edge.includes('nonverbal_signal')&&edge.includes('hasDecorativeNonverbalOverload')],
 ['personal humor engine',edge.includes('PERSONAL HUMOR')&&edge.includes('humor_profile')&&edge.includes('humor_boundary')],
 ['argument memory',edge.includes('ARGUMENT MEMORY')&&edge.includes('argument_lesson')],
 ['romantic specificity',edge.includes('ROMANTIC SPECIFICITY')&&edge.includes('romantic_expression')&&edge.includes('romantic_specificity_ok')],
 ['physical boundary memory',edge.includes('PHYSICAL BOUNDARY MEMORY')&&edge.includes('physical_boundary_state')&&edge.includes('boundary_ok')],
 ['decision consistency',edge.includes('DECISION CONSISTENCY')&&edge.includes('decision_basis')&&edge.includes('decision_consistency_ok')],
 ['persistent locations',edge.includes('PERSISTENT LOCATIONS')&&edge.includes('persistent_locations')&&edge.includes('persistent_location')],
 ['possessions lite',edge.includes('POSSESSIONS LITE')&&edge.includes('possession_updates')&&edge.includes('possessions: mergedPossessions')],
 ['social reputation',edge.includes('SOCIAL REPUTATION')&&edge.includes('social_reputation_update')],
 ['gossip information flow',edge.includes('GOSSIP / INFORMATION FLOW')&&edge.includes('information_flow')&&edge.includes('social_information_ok')],
 ['relationship asymmetry',edge.includes('RELATIONSHIP ASYMMETRY')&&edge.includes('relationship_self_view')&&edge.includes('relationship_user_view')],
 ['autonomous plans',edge.includes('AUTONOMOUS PLANS')&&edge.includes('autonomous_plan')],
 ['between scene simulation',edge.includes('BETWEEN-SCENE SIMULATION')&&edge.includes('between_scene_motion')],
 ['memory compression 2.0',edge.includes('LONG-STORY MEMORY COMPRESSION')&&edge.includes('memory_compression_anchor')],
 ['initiative profile',edge.includes('INITIATIVE PROFILE')&&edge.includes('initiative_profile')],
 ['naturalness scorer',edge.includes('NATURALNESS SCORER')&&edge.includes('deterministicNaturalnessScore')&&edge.includes('naturalness_score_low')],
 ['character DNA',edge.includes('CHARACTER DNA')&&edge.includes('character_dna')&&edge.includes('dna_ok')],
 ['cinematic transitions',edge.includes('CINEMATIC TRANSITIONS')&&edge.includes('transition_style')],
 ['adaptive detail',edge.includes('ADAPTIVE DETAIL')&&edge.includes('detail_level')&&edge.includes('adaptive_detail_ok')],
 ['human behavior state persists',edge.includes('human_behavior_state: humanBehaviorState')&&edge.includes('result.human_behavior_update')],
 ['subjective user relationship protected',edge.includes('never fill relationship_user_view with invented user feelings')],
 ['naturalness threshold is enforced',edge.includes('naturalness_score < 72')||edge.includes('qc.naturalness_score) < 72')],
 ['PWA auto update preserved',vite.includes('registerType: "autoUpdate"')],
 ['PWA skip waiting preserved',vite.includes('skipWaiting: true')&&vite.includes('clientsClaim: true')],
 ['PWA version polling preserved',pwa.includes('/velvet-version.json?ts=')&&pwa.includes('cache: "no-store"')],
 ['Vercel critical files no-store',vercel.includes('/sw.js')&&vercel.includes('/velvet-version.json')&&vercel.includes('no-cache, no-store, must-revalidate')],
 ['no 3.21 migration required',!fs.existsSync(path.join(root,'supabase/migrations/20260904_v3210_human_behavior.sql'))],
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${name}`);if(ok)passed++;}
console.log(`\nverify:v3210 ${passed===checks.length?'passed':'failed'} (${passed}/${checks.length}).`);
if(passed!==checks.length) process.exit(1);
