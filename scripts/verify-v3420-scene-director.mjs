import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveSceneDirectorV342, sceneDirectorV342Issues, sanitizeSceneDirectorV342Reply } from '../supabase/functions/character-chat/engine/scene-director-v342.ts';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));
const meta=JSON.parse(read('public/velvet-version.json'));
const vite=read('vite.config.js');
const contract=read('supabase/functions/character-chat/engine/story-contract.ts');
const edge=read('supabase/functions/character-chat/index.ts');
const diagnostics=read('src/pages/Diagnostics.jsx');
let pass=0,total=0;
function check(name,fn){total++;try{fn();pass++;console.log(`✅ ${name}`)}catch(e){console.error(`❌ ${name}: ${e.message}`);process.exitCode=1;}}

check('version 3.42.0 or descendant',()=>{const [M,m]=pkg.version.split('.').map(Number);assert.ok(M>3||(M===3&&m>=42));});
check('release metadata remains coherent in descendants',()=>{assert.equal(meta.version,pkg.version);assert.ok(String(meta.release||'').trim().length>0);});
check('vite release metadata matches current release',()=>assert.ok(vite.includes(String(meta.release))));
check('v3420 remains before v3410 in stability gate',()=>{const lab=pkg.scripts['stability:lab'];assert.ok(lab.includes('npm run verify:v3420'));assert.ok(lab.indexOf('verify:v3420')<lab.indexOf('verify:v3410'));});
check('director engine imported by contract',()=>assert.match(contract,/deriveSceneDirectorV342/));
check('director validator imported by edge',()=>assert.match(edge,/sceneDirectorV342Issues, sanitizeSceneDirectorV342Reply/));
check('story contract exposes director',()=>assert.match(contract,/sceneDirectorV342:/));
check('compact contract exposes director',()=>assert.match(contract,/sceneDirector342:/));
check('system instruction carries v3.42',()=>assert.match(edge,/v3\.42 SCENE INTELLIGENCE \+ DYNAMIC STORY DIRECTION/));
check('main prompt carries v3.42',()=>assert.match(edge,/SCENE INTELLIGENCE \+ DYNAMIC STORY DIRECTION 3\.42/));
check('Scene Director Lab UI exists',()=>assert.match(diagnostics,/Scene Director Lab/));
check('Scene Director Lab handler prompt exists',()=>assert.match(edge,/SCENE DIRECTOR 3\.42 lab/));
check('quality schema exposes director checks',()=>assert.match(edge,/story_direction_ok[\s\S]{0,500}natural_ending_ok/));
check('user momentum hard issue wired',()=>assert.match(edge,/user_momentum_hijacked/));
check('interruption hard issue wired',()=>assert.match(edge,/ungrounded_scene_interruption/));
check('cooldown hard issue wired',()=>assert.match(edge,/cooldown_escalation_spike/));
check('romance camera hard issue wired',()=>assert.match(edge,/romance_gravity_monopoly/));
check('cliffhanger hard issue wired',()=>assert.match(edge,/director_forced_cliffhanger/));
check('thread dump hard issue wired',()=>assert.match(edge,/scene_thread_dump_overload/));
check('group attention hard issue wired',()=>assert.match(edge,/group_scene_roll_call/));
check('director sanitizer wired',()=>assert.match(edge,/sanitizeSceneDirectorV342Reply/));
check('no new database migration required',()=>assert.match(read('README-v3.42.0.txt'),/No new database migration is required/));

const baseArgs={
  character:{name:'Roman',role:'university student and underground racer'},
  userName:'Antonia',
  latestUserMessage:'*I take my bag and start walking toward class.*',
  recentMessages:[{sender:'character',content:'We should get going soon.'},{sender:'user',content:'Yeah.'}],
  sceneState:{present:['Antonia','Roman','Jules','Milo','Cami'],activity:'walking to class'},
  sceneIntelligence:{purpose:'Get to class while the conversation continues.',phase:'develop',closureAllowed:false,closureDue:false,progressionNeed:'none'},
  sceneVariety:{avoidNext:['cafeteria banter jealousy','phone interruption']},
  calendarLifeSimulation:{dueCommitments:['Roman class · Monday morning']},
  causalTimeline:{activeChains:[{title:'Damaged car',effect:'car needs repair',weight:4,participants:['Roman']}]},
  npcEcosystem:{recurringCandidates:['Jules','Leo','Nate'],activeNpcThreads:['Leo wants to finish his assignment','Nate is handling his own study group'],nodes:[{name:'Leo',availability:'in class'},{name:'Nate',availability:'available'}],groupTraffic:{maxActiveSpeakers:3}},
  relationshipChemistry:{trajectory:'guarded attraction'},
  activeArcs:[{title:'Racing rivalry',participants:['Roman']},{title:'Family pressure',participants:['Roman']}],
  activeConflicts:[{title:'Rival tension',participants:['Roman']}],
  activePlans:[{title:'Meet mechanic Friday',participants:['Roman']},{title:'Study for finance exam',participants:['Roman']}],
};
const engine=deriveSceneDirectorV342(baseArgs);

check('user momentum lock activates',()=>assert.equal(engine.userMomentumLock,true));
check('user momentum disables interruptions',()=>assert.equal(engine.interruptionBudget,0));
check('foreground thread budget max two',()=>assert.ok(engine.foregroundThreads.length<=2));
check('mention budget max two',()=>assert.ok(engine.mentionThreads.length<=2));
check('large world keeps dormant queue',()=>assert.ok(engine.dormantThreads.length>=1));
check('foreground includes user momentum',()=>assert.ok(engine.foregroundThreads.some(x=>x.source==='user')));
check('due class remains camera-adjacent not hijack',()=>assert.ok(engine.candidateThreads.some(x=>x.source==='calendar')));
check('busy NPC excluded from allowed entrants',()=>assert.ok(!engine.allowedEntrants.includes('Leo')));
check('available recurring NPC may be entrant candidate',()=>assert.ok(engine.allowedEntrants.includes('Nate')));
check('group speaker budget remains sparse',()=>assert.ok(engine.maxActiveSpeakers<=3));
check('neutral scene activates romance monopoly guard',()=>assert.equal(engine.romanceMonopolyGuard,true));
check('neutral momentum direction continues',()=>assert.equal(engine.direction,'continue'));

const romanceEngine=deriveSceneDirectorV342({...baseArgs,latestUserMessage:'Do you actually like me?',sceneState:{present:['Antonia','Roman'],activity:'talking'},calendarLifeSimulation:{dueCommitments:[]},causalTimeline:{activeChains:[]}});
check('explicit relationship question releases romance camera guard',()=>assert.equal(romanceEngine.romanceMonopolyGuard,false));
check('relationship thread can enter candidate set',()=>assert.ok(romanceEngine.candidateThreads.some(x=>x.source==='relationship')));

const cooldownEngine=deriveSceneDirectorV342({...baseArgs,latestUserMessage:'*I sit quietly beside him.*',recentMessages:[{sender:'user',content:'I hate you.'},{sender:'character',content:'He shouted back.'},{sender:'user',content:'*I was crying.*'},{sender:'character',content:'The argument finally stopped.'}],sceneState:{present:['Antonia','Roman'],activity:'sitting quietly'},calendarLifeSimulation:{dueCommitments:[]},causalTimeline:{activeChains:[]}});
check('recent intensity activates cooldown',()=>assert.equal(cooldownEngine.cooldownActive,true));
check('cooldown tension mode is cool',()=>assert.equal(cooldownEngine.tensionMode,'cool'));
check('cooldown disables interruption budget',()=>assert.equal(cooldownEngine.interruptionBudget,0));

const endingEngine=deriveSceneDirectorV342({...baseArgs,latestUserMessage:'Goodnight.',sceneState:{present:['Antonia','Roman'],activity:'ending conversation'},sceneIntelligence:{purpose:'Say goodnight.',phase:'close',closureAllowed:true,closureDue:true,progressionNeed:'none'},calendarLifeSimulation:{dueCommitments:[]},causalTimeline:{activeChains:[]}});
check('closure can be due',()=>assert.equal(endingEngine.naturalEndingDue,true));
check('director chooses land on closure',()=>assert.equal(endingEngine.direction,'land'));

let issues=sceneDirectorV342Issues({reply:'Suddenly, his phone buzzed. A rival had texted him about the race.',engine,latestUserMessage:baseArgs.latestUserMessage});
check('ungrounded interruption detected',()=>assert.ok(issues.includes('ungrounded_scene_interruption')));
check('user momentum hijack detected',()=>assert.ok(issues.includes('user_momentum_hijacked')));
issues=sceneDirectorV342Issues({reply:'He adjusted the strap of his bag and kept walking beside you. “Class first.”',engine,latestUserMessage:baseArgs.latestUserMessage});
check('grounded continuation passes director',()=>assert.equal(issues.length,0));
issues=sceneDirectorV342Issues({reply:'Just then, his phone lit up. Everything was about to change.',engine:endingEngine,latestUserMessage:'Goodnight.'});
check('forced cliffhanger detected at ending',()=>assert.ok(issues.includes('director_forced_cliffhanger')));
issues=sceneDirectorV342Issues({reply:'He exploded, slammed the table, and screamed at you.',engine:cooldownEngine,latestUserMessage:'*I sit quietly beside him.*'});
check('cooldown escalation spike detected',()=>assert.ok(issues.includes('cooldown_escalation_spike')));
issues=sceneDirectorV342Issues({reply:'His eyes darkened with jealousy and he pulled you closer by the waist.',engine,latestUserMessage:baseArgs.latestUserMessage});
check('romance gravity monopoly detected',()=>assert.ok(issues.includes('romance_gravity_monopoly')));

const dormantManual={...engine,dormantThreads:[{id:'d1',source:'arc',label:'Racing championship rematch',score:1,screenClass:'dormant',reason:'wait',participants:['Roman']}]};
issues=sceneDirectorV342Issues({reply:'The racing championship rematch was tomorrow, and Roman was already planning it.',engine:dormantManual,latestUserMessage:'*I open my notebook in class.*'});
check('dormant thread forced on-screen detected',()=>assert.ok(issues.includes('dormant_thread_forced_onscreen')));

const dumpThreads=['Damaged car repair','Racing rivalry rematch','Family board dinner','Finance exam deadline'].map((label,i)=>({id:`x${i}`,source:'arc',label,score:4,screenClass:'background',reason:'',participants:['Roman']}));
issues=sceneDirectorV342Issues({reply:'The damaged car repair, racing rivalry rematch, family board dinner, and finance exam deadline all hit him at once.',engine:{...engine,candidateThreads:dumpThreads,foregroundThreads:[],mentionThreads:[],backgroundThreads:dumpThreads,dormantThreads:[]},latestUserMessage:'Okay.'});
check('thread dump overload detected',()=>assert.ok(issues.includes('scene_thread_dump_overload')));

const groupEngine={...engine,foregroundActors:['Roman','Antonia','Jules'],backgroundActors:['Milo','Cami','Nate'],maxActiveSpeakers:3};
issues=sceneDirectorV342Issues({reply:'Roman: “Fine.” Jules: “No.” Milo: “Wait.” Cami: “Seriously?” Nate: “Guys.”',engine:groupEngine,latestUserMessage:'*I listen.*'});
check('group roll call detected',()=>assert.ok(issues.includes('group_scene_roll_call')));
check('background overactivation detected',()=>assert.ok(issues.includes('background_actor_overactivation')));

let sanitized=sanitizeSceneDirectorV342Reply('Suddenly, his phone buzzed. A rival had texted him. He kept walking beside you.',['ungrounded_scene_interruption','user_momentum_hijacked'],engine);
check('sanitizer removes filler interruption',()=>assert.doesNotMatch(sanitized,/phone buzzed|suddenly/i));
check('sanitizer preserves grounded remainder',()=>assert.match(sanitized,/kept walking/i));
sanitized=sanitizeSceneDirectorV342Reply('The racing championship rematch was tomorrow. “Class first.”',['dormant_thread_forced_onscreen'],dormantManual);
check('sanitizer removes dormant thread injection',()=>assert.doesNotMatch(sanitized,/championship rematch/i));
check('sanitizer keeps selected dialogue',()=>assert.match(sanitized,/Class first/i));

if(!process.exitCode) console.log(`\n${pass}/${total} Scene Director 3.42 checks passed.`);
