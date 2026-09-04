import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const edge=fs.readFileSync(path.join(root,'supabase/functions/character-chat/index.ts'),'utf8');
const contract=fs.readFileSync(path.join(root,'supabase/functions/character-chat/engine/story-contract.ts'),'utf8');
const vite=fs.readFileSync(path.join(root,'vite.config.js'),'utf8');
const pwa=fs.readFileSync(path.join(root,'src/context/PWAContext.jsx'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const ver=JSON.parse(fs.readFileSync(path.join(root,'public/velvet-version.json'),'utf8'));
const checks=[
 ['package version is 3.19.0',pkg.version==='3.19.0'],
 ['public version is 3.19.0',ver.version==='3.19.0'],
 ['Character Mind schema exists',edge.includes('mind_update')&&edge.includes('wont_admit')&&edge.includes('misunderstand')],
 ['subjective belief is separated from canon',edge.includes('CHARACTER MIND, NOT OMNISCIENCE')&&contract.includes('mind.misunderstand as SUBJECTIVE')],
 ['memory hierarchy exists',edge.includes('CANON/CORE')||edge.includes('authority === "CANON" ? "CORE"')],
 ['memory has active soft and fading tiers',['ACTIVE','SOFT','FADING'].every(x=>edge.includes(`"${x}"`))],
 ['secrets have ownership rules',edge.includes('SECRETS HAVE OWNERS')&&edge.includes('secret:{type:"boolean"}')],
 ['knowledge schema carries subject and secrecy',edge.includes('required: ["who", "subject", "knows", "source", "status", "secret"]')],
 ['relationship graph updates persist',edge.includes('connection_updates')&&edge.includes('persistStoryConnections')&&edge.includes('story_cast_connections')],
 ['scene physics tracks activity and medium',edge.includes('communication_medium')&&edge.includes('activity: cleanPromptValue(sceneUpdate?.activity')],
 ['scene physics tracks objects',edge.includes('object_states')&&edge.includes('invented_scene_object_state')],
 ['time engine exists',contract.includes('temporalEngine')&&edge.includes('temporal_anchor')],
 ['dynamic intensity can decrease',contract.includes('intensityDirector')&&edge.includes('intensity_target')&&edge.includes('may DECREASE')],
 ['goal engine has short mid long goals',edge.includes('short_goal')&&edge.includes('mid_goal')&&edge.includes('long_goal')],
 ['microvoice persists in mind',edge.includes('microvoice')&&contract.includes('recentVoiceShift')],
 ['attachment behavior persists',edge.includes('attachment_pattern')&&edge.includes('ATTACHMENT IS A PATTERN, NOT A DIAGNOSIS')],
 ['world consequences persist',edge.includes('world_consequence')&&edge.includes('explicit world consequence persistence failed')],
 ['offscreen contact is grounded',edge.includes('offscreen_contact')&&edge.includes('OFF-SCENE CONTACT MUST BE EARNED')],
 ['drift protection exists',contract.includes('driftProtection')&&edge.includes('DRIFT PROTECTION')&&edge.includes('identity_drift_risk')],
 ['invisible self-check exists',edge.includes('quality_check')&&edge.includes('SILENT SELF-CHECK')&&edge.includes('model_self_check_failed')],
 ['story seasons exist',contract.includes('storySeason')&&edge.includes('season_signal')&&edge.includes('durableSeasonShift')],
 ['story seasons reuse chapter persistence',edge.includes('story_chapters')&&edge.includes('active_chapter')],
 ['relationship graph does not need new migration',!fs.existsSync(path.join(root,'supabase/migrations/20260904_v3190_character_mind.sql'))],
 ['PWA auto-update preserved',vite.includes('registerType: "autoUpdate"')],
 ['PWA skipWaiting preserved',vite.includes('skipWaiting: true')],
 ['PWA clientsClaim preserved',vite.includes('clientsClaim: true')],
 ['PWA reloads after controller change',pwa.includes('controllerchange')&&pwa.includes('window.location.reload')],
 ['character-chat syntax hooks remain',edge.includes('Deno.serve')&&edge.includes('streamGeminiEnvelopeWithFailover')],
 ['user ownership still non-negotiable',edge.includes('alone controls their dialogue, thoughts, feelings, motives, reactions, choices and body')],
 ['quality repair budget recognizes drift',edge.includes('"identity_drift_risk"')&&edge.includes('"model_self_check_failed"')],
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${name}`);if(ok)passed++;}
console.log(`\nverify:v3190 ${passed===checks.length?'passed':'failed'} (${passed}/${checks.length}).`);
if(passed!==checks.length) process.exit(1);
