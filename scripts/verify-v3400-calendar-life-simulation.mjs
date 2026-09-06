import fs from 'node:fs';
import assert from 'node:assert/strict';
import { deriveCalendarLifeSimulation, calendarLifeSimulationIssues, sanitizeCalendarLifeSimulationReply } from '../supabase/functions/character-chat/engine/calendar-life-simulation.ts';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));
const meta=JSON.parse(read('public/velvet-version.json'));
const contract=read('supabase/functions/character-chat/engine/story-contract.ts');
const edge=read('supabase/functions/character-chat/index.ts');
const diagnostics=read('src/pages/Diagnostics.jsx');
const vite=read('vite.config.js');
let pass=0,total=0;
const check=(name,fn)=>{ total++; try{ fn(); pass++; console.log('PASS',name); }catch(e){ console.error('FAIL',name,'\n ',e.message); process.exitCode=1; } };

check('version descends from 3.40',()=>assert.match(pkg.version,/^3\.(?:4[0-9]|[5-9][0-9])\./));
check('release metadata still names a valid descendant release',()=>assert.ok(meta.release));
check('vite release metadata exists',()=>assert.match(vite,/const velvetRelease =/));
check('v3400 remains in stability lab',()=>assert.match(pkg.scripts['stability:lab'],/verify:v3400/));
check('calendar engine imported by contract',()=>assert.match(contract,/deriveCalendarLifeSimulation/));
check('calendar validator imported by edge',()=>assert.match(edge,/calendarLifeSimulationIssues, sanitizeCalendarLifeSimulationReply/));
check('compact contract exposes calendar life simulation',()=>assert.match(contract,/calendarLifeSimulation:/));
check('system instruction carries v3.40',()=>assert.match(edge,/v3\.40 CALENDAR \+ LIFE SIMULATION/));
check('main prompt carries calendar life simulation',()=>assert.match(edge,/CALENDAR \+ LIFE SIMULATION 3\.40/));
check('timeline lab edge action exists',()=>assert.match(edge,/action === "timeline_life_simulation_lab"/));
check('Timeline Lab UI exists',()=>assert.match(diagnostics,/Timeline \+ Life Simulation Lab/));
check('Diagnostics invokes timeline lab',()=>assert.match(diagnostics,/action:"timeline_life_simulation_lab"/));
check('quality schema exposes calendar booleans',()=>assert.match(edge,/calendar_life_ok[\s\S]{0,500}temporal_language_ok/));
check('persistent update schema has temporal notes',()=>assert.match(edge,/story_clock_anchor[\s\S]{0,600}temporal_conflict/));
check('hard calendar issues wired',()=>['invented_precise_schedule','unsupported_temporal_language','time_jump_without_transition','due_commitment_erased','schedule_collision_ignored','travel_time_broken','routine_overprecision','message_count_used_as_clock'].forEach((x)=>assert.ok(edge.includes(`"${x}"`))));
check('calendar sanitizer wired',()=>assert.match(edge,/sanitizeCalendarLifeSimulationReply\(reply, issues, options\.turnContract\?\.calendarLifeSimulation/));
check('existing story calendar infrastructure reused',()=>assert.match(contract,/calendarEvents/));
check('existing story plans infrastructure reused',()=>assert.match(contract,/storyPlans/));
check('no new database migration required',()=>assert.match(read('README-v3.40.0.txt'),/No new database migration is required/));

const engine=deriveCalendarLifeSimulation({
  character:{name:'Roman',role:'university student and underground racer',world:'University during the week; established evening training routine in his racing life.'},
  latestUserMessage:'It is Monday, 1:10 PM. *I sit down for lunch.*',
  recentMessages:[
    {sender:'user',content:'Friday works for me. We can meet after class, no exact time yet.'},
    {sender:'character',content:'Friday works.'},
  ],
  sceneState:{location:'campus cafe',time_label:'Monday, 1:10 PM',activity:'lunch'},
  calendarEvents:[
    {title:'Lunch on campus',story_time:'Monday, 1:10 PM',participants:['Roman','Antonia'],status:'active',details:'Lunch together'},
    {title:'Evening training',story_time:'Monday evening',participants:['Roman'],status:'active',details:'Established training routine'},
    {title:'Meet Antonia again',story_time:'Friday',participants:['Roman','Antonia'],status:'planned',details:'No exact time set'},
  ],
  storyPlans:[{title:'Meet again Friday',story_time:'Friday',status:'active'}],
  intelligenceState:{elapsed_since_previous:'same afternoon',human_behavior_state:{routine_schedule_anchor:'evening training routine'}},
});

check('story clock preserves raw scene time',()=>assert.match(engine.storyClock.raw,/Monday, 1:10 PM/i));
check('story clock extracts weekday',()=>assert.equal(engine.storyClock.weekday,'monday'));
check('story clock extracts exact time',()=>assert.match(engine.storyClock.time,/1:10\s*PM/i));
check('story clock confidence is high with explicit time',()=>assert.equal(engine.storyClock.confidence,'high'));
check('temporal anchors include Friday plan',()=>assert.ok(engine.temporalAnchors.some((x)=>/Friday/i.test(x))));
check('upcoming calendar events survive',()=>assert.ok(engine.upcomingEvents.some((x)=>x.title==='Meet Antonia again')));
check('recurring routine survives without forced precision',()=>assert.ok(engine.recurringRoutines.some((x)=>/training routine/i.test(x))));
check('racing and university domains survive',()=>assert.ok(engine.lifeDomains.some((x)=>/racing/i.test(x))&&engine.lifeDomains.some((x)=>/university/i.test(x))));
check('active plan survives',()=>assert.ok(engine.activePlans.some((x)=>/Friday/i.test(x))));
check('travel constraint carries current location',()=>assert.ok(engine.travelConstraints.some((x)=>/campus cafe/i.test(x))));
check('scene duration recognizes meal',()=>assert.match(engine.sceneDuration.expected,/meal|café/i));
check('message count policy explicit',()=>assert.match(engine.elapsedContinuity.policy,/Turn count is not elapsed time/i));
check('routine policy forbids exact appointment invention',()=>assert.match(engine.recurringRoutinePolicy,/does NOT license/i));
check('plan commitment policy persists plans',()=>assert.match(engine.planCommitmentPolicy,/active plan/i));
check('offscreen policy blocks major milestones',()=>assert.match(engine.offscreenLifePolicy,/major relationship milestones/i));
check('temporal language is treated as factual',()=>assert.match(engine.temporalLanguagePolicy,/factual claims/i));

let issues=calendarLifeSimulationIssues({reply:'Practice is at 6:15 PM tonight.',latestUserMessage:'What are you doing later?',engine});
check('invented exact schedule detected',()=>assert.ok(issues.includes('invented_precise_schedule')));
issues=calendarLifeSimulationIssues({reply:'Three hours later, he was still sitting at the same table.',latestUserMessage:'*I nod*',engine:{...engine,temporalAnchors:[]}});
check('unsupported time jump detected',()=>assert.ok(issues.includes('time_jump_without_transition')));
check('unsupported relative language detected',()=>assert.ok(issues.includes('unsupported_temporal_language')));
issues=calendarLifeSimulationIssues({reply:"I'm completely free all day.",latestUserMessage:'Do you have anything later?',engine:{...engine,dueCommitments:['Evening training · Monday evening']}});
check('due commitment erasure detected',()=>assert.ok(issues.includes('due_commitment_erased')));
issues=calendarLifeSimulationIssues({reply:"I can do both. Same time is fine.",engine:{...engine,scheduleConflicts:['Roman: training conflicts with dinner at 7 PM']}});
check('schedule collision ignored detected',()=>assert.ok(issues.includes('schedule_collision_ignored')));
issues=calendarLifeSimulationIssues({reply:'Five minutes later he was across town at the track.',latestUserMessage:'*I stay at the cafe*',engine});
check('travel teleport detected',()=>assert.ok(issues.includes('travel_time_broken')));
issues=calendarLifeSimulationIssues({reply:"We've been here for hours.",latestUserMessage:'*I nod*',engine:{...engine,temporalAnchors:[]}});
check('message count as clock detected',()=>assert.ok(issues.includes('message_count_used_as_clock')));
issues=calendarLifeSimulationIssues({reply:'Every Tuesday at 6 PM I train.',latestUserMessage:'Do you train often?',engine:{...engine,recurringRoutines:['trains evenings'],temporalAnchors:[]}});
check('routine overprecision detected',()=>assert.ok(issues.includes('routine_overprecision')));

const grounded='“I have training later.” He glanced at the menu again. “Friday still works too. We never picked a time.”';
issues=calendarLifeSimulationIssues({reply:grounded,latestUserMessage:'What are you doing later?',engine});
check('broad grounded schedule can pass',()=>assert.equal(issues.length,0));

let sanitized=sanitizeCalendarLifeSimulationReply('Practice is at 6:15 PM tonight.',['invented_precise_schedule'],engine);
check('sanitizer removes invented exact time',()=>assert.doesNotMatch(sanitized,/6:15/i));
sanitized=sanitizeCalendarLifeSimulationReply('Three hours later, he looked up.',['time_jump_without_transition'],engine);
check('sanitizer removes unsupported jump prefix',()=>assert.doesNotMatch(sanitized,/Three hours later/i));
sanitized=sanitizeCalendarLifeSimulationReply("I'm completely free all day.",['due_commitment_erased'],engine);
check('sanitizer stops magical free calendar',()=>assert.doesNotMatch(sanitized,/completely free all day/i));
sanitized=sanitizeCalendarLifeSimulationReply("We've been here for hours.",['message_count_used_as_clock'],engine);
check('sanitizer softens unsupported duration',()=>assert.match(sanitized,/a while/i));

const conflictEngine=deriveCalendarLifeSimulation({
  sceneState:{time_label:'Friday 7 PM'},
  calendarEvents:[
    {title:'Dinner',story_time:'Friday 7 PM',participants:['Roman'],status:'active'},
    {title:'Training',story_time:'Friday 7 PM',participants:['Roman'],status:'active'},
  ]
});
check('same-person same-time collision detected in engine',()=>assert.ok(conflictEngine.scheduleConflicts.some((x)=>/conflicts/i.test(x))));

check('story contract objective can prioritize due commitments',()=>assert.match(contract,/Preserve the due commitment\/time pressure/));
check('prompt says unknown time stays unknown',()=>assert.match(edge,/If the exact time is unknown, KEEP IT UNKNOWN/));
check('prompt says plans persist',()=>assert.match(edge,/PLANS PERSIST/));
check('prompt says travel has order',()=>assert.match(edge,/TRAVEL HAS ORDER/));
check('prompt blocks routine appointment invention',()=>assert.match(edge,/ROUTINE ≠ APPOINTMENT/));
check('story contract uses richer temporal engine',()=>assert.match(contract,/storyNow: calendarLifeSimulation\.storyClock\.raw/));
check('compact contract includes schedule conflicts',()=>assert.match(contract,/scheduleConflicts: take\(contract\.calendarLifeSimulation\.scheduleConflicts/));
check('Timeline Lab tests message-count time',()=>assert.match(edge,/message count never becomes elapsed time/));

if(!process.exitCode) console.log(`\n${pass}/${total} Calendar + Life Simulation checks passed.`);
