import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveWorldConsequencesCausalTimeline, worldConsequencesCausalTimelineIssues, sanitizeWorldConsequencesCausalTimelineReply } from '../supabase/functions/character-chat/engine/world-consequences-causal-timeline.ts';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));
const meta=JSON.parse(read('public/velvet-version.json'));
const vite=read('vite.config.js');
const contract=read('supabase/functions/character-chat/engine/story-contract.ts');
const edge=read('supabase/functions/character-chat/index.ts');
let pass=0,total=0;
function check(name,fn){total++;try{fn();pass++;console.log(`✅ ${name}`)}catch(e){console.error(`❌ ${name}: ${e.message}`);process.exitCode=1;}}

check('version is v3.41+ descendant',()=>{const [maj,min]=String(pkg.version).split('.').map(Number);assert.equal(maj,3);assert.ok(min>=41);});
check('release metadata exists',()=>assert.ok(String(meta.release||'').length>3));
check('vite release metadata exists',()=>assert.match(vite,/const velvetRelease = \".+\";/));
check('v3410 remains in stability lab',()=>assert.match(pkg.scripts['stability:lab'],/npm run verify:v3410/));
check('causal engine imported by contract',()=>assert.match(contract,/deriveWorldConsequencesCausalTimeline/));
check('causal validator imported by edge',()=>assert.match(edge,/worldConsequencesCausalTimelineIssues, sanitizeWorldConsequencesCausalTimelineReply/));
check('story contract exposes causal timeline',()=>assert.match(contract,/worldConsequencesCausalTimeline:/));
check('compact contract exposes causal timeline',()=>assert.match(contract,/causalTimeline:/));
check('system instruction carries v3.41',()=>assert.match(edge,/v3\.41 WORLD CONSEQUENCES \+ CAUSAL TIMELINE/));
check('main prompt carries v3.41',()=>assert.match(edge,/WORLD CONSEQUENCES \+ CAUSAL TIMELINE 3\.41/));
check('Causality Lab edge action exists',()=>assert.match(edge,/action === "causality_lab"/));
check('Causality Lab handler exists',()=>assert.match(edge,/handleCausalityLab/));
check('Causality Lab UI exists',()=>assert.match(read('src/pages/Diagnostics.jsx'),/Causality Lab/));
check('cause effect hard issue wired',()=>assert.match(edge,/unsupported_consequence_without_cause/));
check('active consequence reset hard issue wired',()=>assert.match(edge,/active_consequence_magically_reset/));
check('rumor fact hard issue wired',()=>assert.match(edge,/rumor_promoted_to_fact/));
check('cancelled event hard issue wired',()=>assert.match(edge,/resolved_or_cancelled_event_reactivated/));
check('offscreen cause hard issue wired',()=>assert.match(edge,/major_offscreen_event_without_causal_window/));
check('budget hard issue wired',()=>assert.match(edge,/consequence_budget_overflow/));
check('minor overcanon hard issue wired',()=>assert.match(edge,/minor_event_overcanonized/));
check('causal sanitizer wired',()=>assert.match(edge,/sanitizeWorldConsequencesCausalTimelineReply/));
check('world consequence can persist status',()=>assert.match(edge,/worldConsequence\?\.status/));
check('consequence resolution persistence exists',()=>assert.match(edge,/consequence_resolution/));
check('quality schema exposes causal checks',()=>assert.match(edge,/causal_timeline_ok[\s\S]{0,400}consequence_budget_ok/));
check('no new database migration required',()=>assert.match(read('README-v3.41.0.txt'),/No new database migration is required/));

const engine=deriveWorldConsequencesCausalTimeline({
  character:{name:'Roman',role:'university student and underground racer'},
  latestUserMessage:'*I sit down with my coffee.*',
  storyConsequences:[
    {title:'Damaged car',cause:'Roman hit the barrier during Friday race',effect:'The car needs repair before it can race normally again',status:'active',weight:4,participants:['Roman']},
    {title:'Old dinner plan',cause:'Dinner had been planned for Saturday',effect:'The dinner was cancelled',status:'resolved',weight:2,participants:['Roman','Jules']},
    {title:'Team attendance warning',cause:'Chase missed two established practices',effect:'The coach is watching his attendance',status:'active',weight:3,participants:['Chase']},
  ],
  calendarEvents:[
    {title:'Friday practice',story_time:'Friday evening',participants:['Chase'],status:'cancelled'},
    {title:'Roman class',story_time:'Monday morning',participants:['Roman'],status:'active'},
  ],
  storyPlans:[{title:'Meet Jules',story_time:'Tuesday',status:'active'}],
  knowledgeLedger:[{character_name:'Jules',subject:'Chase game rumor',knowledge:'Chase cheated at the game',status:'rumor',source:'heard it from one student'}],
  storyConflicts:[],
  npcEcosystem:{nodes:[{name:'Leo',currentGoal:'finish his own assignment',availability:'in class'}]},
  calendarLifeSimulation:{dueCommitments:['Roman class · Monday morning'],scheduleConflicts:[],upcomingEvents:[{title:'Roman class',storyTime:'Monday morning',participants:['Roman'],status:'active'}]},
});

check('active consequence survives',()=>assert.ok(engine.activeChains.some((x)=>x.title==='Damaged car')));
check('resolved consequence leaves active chains',()=>assert.ok(!engine.activeChains.some((x)=>x.title==='Old dinner plan')));
check('resolved consequence tracked separately',()=>assert.ok(engine.cancelledOrResolved.some((x)=>/Old dinner plan/i.test(x))));
check('cancelled calendar event tracked',()=>assert.ok(engine.cancelledOrResolved.some((x)=>/Friday practice/i.test(x))));
check('causal ledger has cause and effect',()=>assert.ok(engine.causalLedger.some((x)=>/barrier.*→.*repair/i.test(x))));
check('institutional memory detects coach/team consequence',()=>assert.ok(engine.institutionalMemory.some((x)=>/sport|team/i.test(x.domain))));
check('rumor stays epistemic row',()=>assert.equal(engine.rumorBeliefs[0]?.holder,'Jules'));
check('parallel life includes NPC goal',()=>assert.ok(engine.parallelLifeWindows.some((x)=>/Leo/i.test(x))));
check('coffee turn has tiny importance',()=>assert.ok(engine.currentEventImportance<=1));
check('coffee turn has tiny consequence budget',()=>assert.ok(engine.consequenceBudget<=1));
check('cause-effect policy is explicit',()=>assert.match(engine.causeEffectPolicy,/visible or stored cause/i));
check('institution policy forbids omniscience',()=>assert.match(engine.institutionalMemoryPolicy,/not omniscience/i));
check('belief fact policy explicit',()=>assert.match(engine.beliefFactPolicy,/not facts/i));
check('offscreen policy requires real window',()=>assert.match(engine.offscreenCausalityPolicy,/real time window/i));
check('cross-system policy requires bridge',()=>assert.match(engine.crossSystemPolicy,/causal bridge/i));
check('minor-event policy rejects trivia canon',()=>assert.match(engine.minorEventPolicy,/Do not immortalize trivia/i));

let issues=worldConsequencesCausalTimelineIssues({reply:"Roman's car was still in the shop.",latestUserMessage:'How was your morning?',engine:{...engine,causalLedger:[],activeChains:[],institutionalMemory:[],liveCommitmentEffects:[],parallelLifeWindows:[]}});
check('unsupported consequence without cause detected',()=>assert.ok(issues.includes('unsupported_consequence_without_cause')));
issues=worldConsequencesCausalTimelineIssues({reply:'His car was completely fine, good as new.',latestUserMessage:'*I look at the car*',engine});
check('active car consequence cannot magically reset',()=>assert.ok(issues.includes('active_consequence_magically_reset')));
issues=worldConsequencesCausalTimelineIssues({reply:'Chase cheated at the game.',latestUserMessage:'What did Jules hear?',engine});
check('rumor promoted to fact detected',()=>assert.ok(issues.includes('rumor_promoted_to_fact')));
issues=worldConsequencesCausalTimelineIssues({reply:'I have to go to Friday practice later.',latestUserMessage:'What are you doing later?',engine});
check('cancelled event reactivation detected',()=>assert.ok(issues.includes('resolved_or_cancelled_event_reactivated')));
issues=worldConsequencesCausalTimelineIssues({reply:'While you were gone, he was expelled from university.',latestUserMessage:'*I come back*',engine:{...engine,causalLedger:[],institutionalMemory:[],parallelLifeWindows:[]}});
check('major offscreen event needs causal window',()=>assert.ok(issues.includes('major_offscreen_event_without_causal_window')));
issues=worldConsequencesCausalTimelineIssues({reply:'The coffee changed everything between them for years to come.',latestUserMessage:'*I take a sip of coffee*',engine});
check('minor event overcanon detected',()=>assert.ok(issues.includes('minor_event_overcanonized')));
issues=worldConsequencesCausalTimelineIssues({reply:'Because of that, he lost class. As a result, the team hated him. And now, his family cut him off. That meant everyone knew.',latestUserMessage:'*I spill coffee*',engine});
check('consequence budget overflow detected',()=>assert.ok(issues.includes('consequence_budget_overflow')));
issues=worldConsequencesCausalTimelineIssues({reply:'The repair was still unfinished, so he took the bus instead.',latestUserMessage:'How are you getting to campus?',engine});
check('grounded active consequence can pass',()=>assert.ok(!issues.includes('unsupported_consequence_without_cause')));

let sanitized=sanitizeWorldConsequencesCausalTimelineReply("Roman's car was still in the shop.",['unsupported_consequence_without_cause'],engine);
check('sanitizer removes unsupported shop claim',()=>assert.doesNotMatch(sanitized,/in the shop/i));
sanitized=sanitizeWorldConsequencesCausalTimelineReply('The coffee changed everything for years to come.',['minor_event_overcanonized'],engine);
check('sanitizer softens overcanon',()=>assert.doesNotMatch(sanitized,/for years to come/i));

if(!process.exitCode) console.log(`\n${pass}/${total} World Consequences + Causal Timeline checks passed.`);
