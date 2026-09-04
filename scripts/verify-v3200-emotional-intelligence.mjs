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
 ['package version 3.20.0',pkg.version==='3.20.0'],
 ['public version 3.20.0',ver.version==='3.20.0'],
 ['emotional causality fields persist',['emotion_trigger','emotion_interpretation','current_emotion','behavioral_pressure'].every(x=>edge.includes(x))],
 ['anticipation engine persists',['anticipated_next','expected_outcome','feared_outcome'].every(x=>edge.includes(x))&&contract.includes('anticipation')],
 ['subtext engine explicit',edge.includes('SUBTEXT BEFORE EXPLANATION')&&edge.includes('subtext_ok')],
 ['public private self explicit',edge.includes('PUBLIC SELF / PRIVATE SELF')&&edge.includes('public_private_mode')],
 ['behavioral memory persists',edge.includes('BEHAVIORAL MEMORY')&&edge.includes('behavioral_pattern')],
 ['conflict personality grounded',edge.includes('CONFLICT PERSONALITY')&&contract.includes('conflictPersonality')],
 ['group dynamics explicit',edge.includes('GROUP DYNAMICS ARE MESSY')&&contract.includes('groupDynamics')],
 ['misunderstandings require evidence',edge.includes('MISUNDERSTANDINGS NEED EVIDENCE')&&edge.includes('misunderstand')],
 ['slow behavioral change explicit',edge.includes('SLOW BEHAVIORAL CHANGE')&&contract.includes('slowChange')],
 ['scene momentum hold turn close',edge.includes('SCENE MOMENTUM')&&edge.includes('scene_momentum')&&contract.includes('sceneMomentum')],
 ['narrative compression guarded',edge.includes('NARRATIVE COMPRESSION')&&edge.includes('compression_reason')],
 ['contradictions preserved',edge.includes('PRESERVE CONTRADICTIONS')&&edge.includes('contradiction_in_play')],
 ['private intentions persist',edge.includes('PRIVATE INTENTIONS')&&edge.includes('private_intention')],
 ['structural anti repetition detector',edge.includes('hasStructuralReplyLoop')&&edge.includes('replyStructureSignature')&&edge.includes('structural_repetition_loop')],
 ['post turn reflection schema and persistence',edge.includes('post_turn_reflection')&&edge.includes('last_reflection')&&edge.includes('plausible_consequence')],
 ['quality self check expanded',['subtext_ok','structure_repetition_ok','scene_momentum_ok','contradiction_ok'].every(x=>edge.includes(x))],
 ['character mind remains subjective',edge.includes('CHARACTER MIND, NOT OMNISCIENCE')&&contract.includes('SUBJECTIVE')],
 ['user ownership remains hard rule',edge.includes('alone controls their dialogue, thoughts, feelings, motives, reactions, choices and body')],
 ['PWA auto update preserved',vite.includes('registerType: "autoUpdate"')],
 ['PWA skip waiting preserved',vite.includes('skipWaiting: true')],
 ['PWA clients claim preserved',vite.includes('clientsClaim: true')],
 ['PWA controller reload preserved',pwa.includes('controllerchange')&&pwa.includes('window.location.reload')],
 ['no new 3.20 migration',!fs.existsSync(path.join(root,'supabase/migrations/20260904_v3200_emotional_intelligence.sql'))],
 ['edge entrypoint remains',edge.includes('Deno.serve')&&edge.includes('streamGeminiEnvelopeWithFailover')],
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${name}`);if(ok)passed++;}
console.log(`\nverify:v3200 ${passed===checks.length?'passed':'failed'} (${passed}/${checks.length}).`);
if(passed!==checks.length) process.exit(1);
