import fs from 'node:fs';

const src = fs.readFileSync('supabase/functions/character-chat/index.ts','utf8');
const timeline = fs.readFileSync('src/components/StoryTimelineDrawer.jsx','utf8');
const vite = fs.readFileSync('vite.config.js','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const ver = JSON.parse(fs.readFileSync('public/velvet-version.json','utf8'));

const featureChecks = [
  ['Character Presence 2.0', /CHARACTER PRESENCE 2\.0/.test(src) && /presence_action/.test(src)],
  ['Natural Conversation Engine', /NATURAL CONVERSATION ENGINE/.test(src) && /conversation_mode/.test(src)],
  ['Chemistry Fingerprint', /CHEMISTRY FINGERPRINT/.test(src) && /chemistry_fingerprint/.test(src)],
  ['Jealousy Intelligence', /JEALOUSY INTELLIGENCE/.test(src) && /jealousy_mode/.test(src)],
  ['Scene Memory Visual', /SCENE MEMORY VISUAL/.test(src) && /scene_memory/.test(src) && /Spatial memory/.test(timeline)],
  ['Relationship Timeline', /RELATIONSHIP TIMELINE/.test(src) && /Relationship timeline/.test(timeline)],
  ['Unfinished Business', /UNFINISHED BUSINESS/.test(src) && /unfinished_business_add/.test(src) && /Unfinished business/.test(timeline)],
  ['Texting Mode', /TEXTING MODE/.test(src) && /texting_mode/.test(src)],
  ['Supporting Cast 2.0', /SUPPORTING CAST 2\.0/.test(src) && /supporting_cast_dynamics/.test(src)],
  ['Social Consequences', /SOCIAL CONSEQUENCES/.test(src) && /social_consequence/.test(src)],
  ['Emotional Residue', /EMOTIONAL RESIDUE/.test(src) && /emotional_residue/.test(src)],
  ['Romantic Specificity 2.0', /ROMANTIC SPECIFICITY 2\.0/.test(src) && /romantic_specificity/.test(src)],
  ['Automatic No-Flirt Mode', /AUTOMATIC NO-FLIRT MODE/.test(src) && /flirt_mode/.test(src)],
  ['Character Bad Days', /CHARACTER BAD DAYS/.test(src) && /bad_day_state/.test(src)],
  ['Micro-conflict Engine', /MICRO-CONFLICT ENGINE/.test(src) && /micro_conflict/.test(src)],
  ['Voice Drift Detector 2.0', /VOICE DRIFT DETECTOR 2\.0/.test(src) && /voice_drift/.test(src)],
  ['Narrative Camera', /NARRATIVE CAMERA/.test(src) && /narrative_camera/.test(src)],
  ['Real Silence', /REAL SILENCE/.test(src) && /silence_mode/.test(src)],
  ['Private Character Journal', /PRIVATE CHARACTER JOURNAL/.test(src) && /private_character_journal/.test(src)],
  ['Velvet Director 2.0', /VELVET DIRECTOR 2\.0/.test(src) && /director_check/.test(src)],
];

const checks = [
  ['package is 3.22.0', pkg.version === '3.22.0'],
  ['public version is 3.22.0', ver.version === '3.22.0'],
  ['release is Presence Engine 2.0', ver.release === 'Presence Engine 2.0'],
  ['vite release synchronized', /const velvetRelease = "Presence Engine 2\.0"/.test(vite)],
  ['Presence update is parsed', /presence_update: parsed\?\.presence_update/.test(src)],
  ['Presence state persists in intelligence_state', /presence_engine_state: presenceEngineState/.test(src)],
  ['private journal never uses a user journal field', !/user_(?:journal|feelings|hidden_feelings)/i.test(src)],
  ['Gemini still sends zero responseJsonSchema fields', !src.includes('responseJsonSchema')],
  ['JSON response mode remains enabled', src.includes('responseMimeType: "application/json"')],
  ['bare Gemini fallback remains available', src.includes('runStreamAttempt("bare")') && src.includes('runAttempt("bare")')],
  ['PWA remains auto-update', /registerType: "autoUpdate"/.test(vite) && /skipWaiting: true/.test(vite) && /clientsClaim: true/.test(vite)],
  ['all 20 Presence Engine systems exist', featureChecks.every(([,ok]) => ok)],
];

let fail = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}`);
  if (!ok) fail++;
}
console.log('\nFeature matrix:');
for (const [name, ok] of featureChecks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}`);
  if (!ok) fail++;
}
console.log(`\n${checks.length + featureChecks.length - fail}/${checks.length + featureChecks.length} passed.`);
if (fail) process.exit(1);
