import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const edge=fs.readFileSync(path.join(root,'supabase/functions/character-chat/index.ts'),'utf8');
const vite=fs.readFileSync(path.join(root,'vite.config.js'),'utf8');
const pwa=fs.readFileSync(path.join(root,'src/context/PWAContext.jsx'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const ver=JSON.parse(fs.readFileSync(path.join(root,'public/velvet-version.json'),'utf8'));
const checks=[
 ['package version is 3.18.0',pkg.version==='3.18.0'],
 ['public version is 3.18.0',ver.version==='3.18.0'],
 ['dynamic mood state exists',edge.includes('current_mood')&&edge.includes('emotional_posture')&&edge.includes('guardedness')],
 ['trust and vulnerability state exists',edge.includes('trust_direction')&&edge.includes('vulnerability_window')],
 ['relationship fingerprint exists',edge.includes('relationship_signature')&&edge.includes('private_patterns')&&edge.includes('shared_rituals')&&edge.includes('sore_spots')],
 ['memory changes behavior',edge.includes('MEMORY MUST CHANGE BEHAVIOR, NOT BECOME EXPOSITION')&&edge.includes('memory_influence')],
 ['nonlinear development persists retained growth',edge.includes('setback_pressure')&&edge.includes('retained_growth')&&edge.includes('NONLINEAR DEVELOPMENT')],
 ['supporting cast has offscreen lives',edge.includes('offscreen_motion')&&edge.includes('next_intention')&&edge.includes('SECONDARY CHARACTERS HAVE CLOCKS OF THEIR OWN')],
 ['initiative is director-aware',edge.includes('chosen_tactic')&&edge.includes('do NOT force it to become a visible plot move every turn')],
 ['conflict texture persists',edge.includes('conflict_aftertaste')&&edge.includes('repair_debt')&&edge.includes('CONFLICT LEAVES TEXTURE')],
 ['voice evolution is slow',edge.includes('voice_shift')&&edge.includes('VOICE CAN EVOLVE MICROSCOPICALLY')],
 ['mundane beats are first class',edge.includes('ORDINARY LIFE IS ALLOWED TO WIN THE TURN')&&edge.includes('"mundane"')],
 ['invisible director exists',edge.includes('INVISIBLE DIRECTOR PASS')&&edge.includes('repetition_check')&&edge.includes('pacing_reason')],
 ['director beat modes complete',['mundane','connective','tension','conflict','repair','plot','recovery'].every(x=>edge.includes(`"${x}"`))],
 ['development schema carries new fields',edge.includes('relationship_signature:{type:"string"}')&&edge.includes('voice_shift:{type:"string"}')],
 ['cast schema carries offscreen fields',edge.includes('offscreen_motion:{type:"string"}')&&edge.includes('next_intention:{type:"string"}')],
 ['no forced meaningful-change final instruction',!edge.includes('preserve character-specific voice, make one meaningful change, and stop')],
 ['no DB migration required',!fs.existsSync(path.join(root,'supabase/migrations/20260904_v3180_deep_characters.sql'))],
 ['PWA auto-update preserved',vite.includes('registerType: "autoUpdate"')],
 ['service worker skipWaiting preserved',vite.includes('skipWaiting: true')],
 ['service worker clientsClaim preserved',vite.includes('clientsClaim: true')],
 ['PWA reloads on controller change',pwa.includes('controllerchange')&&pwa.includes('window.location.reload')],
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${name}`);if(ok)passed++;}
console.log(`\nverify:v3180 ${passed===checks.length?'passed':'failed'} (${passed}/${checks.length}).`);
if(passed!==checks.length) process.exit(1);
