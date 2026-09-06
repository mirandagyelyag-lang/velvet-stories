import fs from 'node:fs';
import assert from 'node:assert/strict';
import { deriveNpcEcosystemSocialNetworkV3, npcEcosystemIssues, sanitizeNpcEcosystemReply } from '../supabase/functions/character-chat/engine/npc-ecosystem-social-network-v3.ts';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));
const meta=JSON.parse(read('public/velvet-version.json'));
const contract=read('supabase/functions/character-chat/engine/story-contract.ts');
const edge=read('supabase/functions/character-chat/index.ts');
const diagnostics=read('src/pages/Diagnostics.jsx');
let pass=0,total=0;
const check=(name,fn)=>{ total++; try{ fn(); pass++; console.log('PASS',name); }catch(e){ console.error('FAIL',name,'\n ',e.message); process.exitCode=1; } };

check('version 3.39.0',()=>assert.equal(pkg.version,'3.39.0'));
check('release metadata',()=>assert.equal(meta.release,'NPC Ecosystem + Social Network 3.0'));
check('v3390 is first stability gate',()=>assert.match(pkg.scripts['stability:lab'],/^npm run verify:v3390/));
check('engine imported by story contract',()=>assert.match(contract,/deriveNpcEcosystemSocialNetworkV3/));
check('validator imported by edge',()=>assert.match(edge,/npcEcosystemIssues, sanitizeNpcEcosystemReply/));
check('compact contract exposes NPC ecosystem v3',()=>assert.match(contract,/npcEcosystemV3:/));
check('system instruction carries v3.39',()=>assert.match(edge,/v3\.39 NPC ECOSYSTEM \+ SOCIAL NETWORK 3\.0/));
check('main prompt carries network 3.0',()=>assert.match(edge,/NPC ECOSYSTEM \+ SOCIAL NETWORK 3\.0/));
check('social graph lab edge action exists',()=>assert.match(edge,/action === "npc_social_graph_lab"/));
check('Social Graph Lab UI exists',()=>assert.match(diagnostics,/Social Graph Lab/));
check('Diagnostics invokes Social Graph Lab',()=>assert.match(diagnostics,/action: "npc_social_graph_lab"/));
check('quality schema exposes v3.39 booleans',()=>assert.match(edge,/npc_ecosystem_ok[\s\S]{0,500}npc_anti_orbit_ok/));
check('persistent update schema has network notes',()=>assert.match(edge,/npc_graph_snapshot[\s\S]{0,500}npc_relationship_shift/));
check('hard network issues wired',()=>['npc_protagonist_orbit_collapse','npc_puppet_consensus','telepathic_social_spread','npc_relationship_history_reset','recurring_npc_identity_reset','group_turn_crowding','ship_bubble_social_erasure','cross_circle_collision_without_cause','recurring_npc_fragmentation'].forEach((x)=>assert.ok(edge.includes(`"${x}"`))));
check('network sanitizer wired',()=>assert.match(edge,/sanitizeNpcEcosystemReply\(reply, issues\)/));
check('connection updates still persist NPC bonds',()=>assert.match(edge,/connection_updates only records relationships BETWEEN named characters/));
check('cast updates remain capped and persistent',()=>assert.match(edge,/cast_updates: \{ type: "array", maxItems: 3/));
check('information source rule is explicit',()=>assert.match(edge,/Information requires a witness\/message\/public source|Information is per-person/));
check('recurring NPC reuse rule is explicit',()=>assert.match(edge,/Reuse established minor characters|Prefer a compatible recurring classmate/));
check('ship bubble rule is explicit',()=>assert.match(edge,/Never erase outside relationships to protect the central ship/));

const cast=[
 {name:'Leo',role:'Rowan teammate and friend',current_dynamic:'annoyed with Rowan for missing practice',goals:'keep the team organized',next_intention:'talk to Mason after practice'},
 {name:'Mason',role:'team captain',current_dynamic:'trusts Leo more than Rowan on logistics',goals:'win the next match',offscreen_motion:'at practice'},
 {name:'Chloe',role:'campus friend; past flirtation with Rowan',current_dynamic:'friendly with Leo, awkward with Rowan',goals:'finish her project'},
 {name:'Jules',role:'Antonia best friend',current_dynamic:'likes Chloe, barely knows Mason',goals:'get through classes'},
];
const connections=[
 {from_name:'Leo',to_name:'Mason',relationship:'friends and teammates',visibility:'known',evidence:'They train together every week.'},
 {from_name:'Chloe',to_name:'Leo',relationship:'friends',visibility:'known',evidence:'They share a seminar and talk outside class.'},
 {from_name:'Chloe',to_name:'Rowan',relationship:'past flirtation; now friendly awkwardness',visibility:'known',evidence:'They flirted earlier in the story.'},
];
const knowledge=[
 {character_name:'Leo',subject:'practice delay',knowledge:'practice moved later',source:'Mason texted him',status:'known'},
 {character_name:'Chloe',subject:'practice delay',knowledge:'Leo might be late',source:'Leo mentioned it',status:'suspected'},
];
const engine=deriveNpcEcosystemSocialNetworkV3({persistentCast:cast,castConnections:connections,knowledgeLedger:knowledge,recentMessages:[{sender:'character',content:'Leo waved to Chloe before heading toward practice.'}],sceneState:{present:['Rowan','Antonia','Leo','Chloe']},leadName:'Rowan',userName:'Antonia'});

check('all recurring cast becomes stable nodes',()=>assert.equal(engine.nodes.length,4));
check('NPC role survives in node',()=>assert.match(engine.nodes.find(x=>x.name==='Leo')?.role||'',/teammate/i));
check('racing/sport/campus circles derive from role',()=>assert.ok(engine.circles.length>=2));
check('independent NPC-NPC edges exist',()=>assert.ok(engine.independentEdges.some(x=>/Leo.*Mason|Chloe.*Leo/i.test(x))));
check('past flirtation remains an edge',()=>assert.ok(engine.edges.some(x=>/flirt/i.test(x.relationship))));
check('recurring candidates favor recently used NPC',()=>assert.ok(engine.recurringCandidates.includes('Leo')));
check('independent NPC goals are carried',()=>assert.ok(engine.activeNpcThreads.some(x=>/Mason|Chloe|Leo/.test(x))));
check('information routes preserve source',()=>assert.ok(engine.informationRoutes.some(x=>/Mason texted him/.test(x))));
check('group traffic caps active speakers',()=>assert.ok(engine.groupTraffic.maxActiveSpeakers<=2));
check('quiet group members explicitly allowed',()=>assert.equal(engine.groupTraffic.quietMembersAllowed,true));
check('availability does not auto-summon unknown NPC',()=>assert.ok(engine.nodes.every(x=>/present|unknown|occupied/.test(x.availability))));
check('anti-orbit policy mentions NPC relationships',()=>assert.match(engine.antiOrbitPolicy,/NPCs can like, dislike, date, compete/i));
check('cross-circle collisions require cause',()=>assert.match(engine.crossCirclePolicy,/plausible bridge/i));
check('recurrence policy prefers established minor characters',()=>assert.match(engine.recurrencePolicy,/established minor character/i));
check('relationship continuity is durable',()=>assert.match(engine.relationshipContinuityPolicy,/history is durable/i));
check('information flow blocks universal knowledge',()=>assert.match(engine.informationFlowPolicy,/witness|message/i));

let issues=npcEcosystemIssues({reply:'Everyone at the table turned to Antonia and waited for her to decide what happened next.',engine});
check('protagonist orbit collapse detected',()=>assert.ok(issues.includes('npc_protagonist_orbit_collapse')));
issues=npcEcosystemIssues({reply:'The whole group nodded in agreement and took Rowan’s side.',engine});
check('NPC puppet consensus detected',()=>assert.ok(issues.includes('npc_puppet_consensus')));
issues=npcEcosystemIssues({reply:'Somehow everyone knew what had happened before lunch.',engine:{...engine,informationRoutes:[]}});
check('telepathic social spread detected',()=>assert.ok(issues.includes('telepathic_social_spread')));
issues=npcEcosystemIssues({reply:'Leo looked at Mason. They were complete strangers and had never met.',engine});
check('NPC relationship history reset detected',()=>assert.ok(issues.includes('npc_relationship_history_reset')));
issues=npcEcosystemIssues({reply:'Leo, some random guy Rowan had never met, walked over.',engine});
check('recurring NPC identity reset detected',()=>assert.ok(issues.includes('recurring_npc_identity_reset')));
issues=npcEcosystemIssues({reply:'Nobody else mattered. It was like nobody else existed.',engine});
check('ship bubble social erasure detected',()=>assert.ok(issues.includes('ship_bubble_social_erasure')));
issues=npcEcosystemIssues({reply:'Out of nowhere, a racer from the underground scene appeared in the classroom for no reason.',engine});
check('cross-circle collision without cause detected',()=>assert.ok(issues.includes('cross_circle_collision_without_cause')));
issues=npcEcosystemIssues({reply:'A classmate waved. A teammate came over. A mechanic called from the doorway.',engine:{...engine,recurringCandidates:['Leo','Mason']}});
check('duplicate generic NPC fragmentation detected',()=>assert.ok(issues.includes('recurring_npc_fragmentation')));

const safe='Leo stopped beside Chloe long enough to ask about her seminar, then glanced toward the gym doors. “Mason’s already inside.” Chloe nodded. “Go. I’ll catch you later.”';
issues=npcEcosystemIssues({reply:safe,engine});
check('independent NPC interaction can pass',()=>assert.equal(issues.length,0));

const sanitized=sanitizeNpcEcosystemReply('Somehow everyone knew already. Leo shrugged and headed toward practice.',['telepathic_social_spread']);
check('sanitizer removes telepathic spread and keeps grounded action',()=>{assert.doesNotMatch(sanitized,/everyone knew/i);assert.match(sanitized,/Leo.*practice/i);});

check('no new database migration required',()=>assert.match(read('README-v3.39.0.txt'),/No new database migration is required/));
check('existing cast connection infrastructure is reused',()=>assert.match(contract,/castConnections/));
check('existing knowledge ledger infrastructure is reused',()=>assert.match(contract,/knowledgeLedger/));
check('existing persistent cast infrastructure is reused',()=>assert.match(contract,/persistentCast/));

if(!process.exitCode) console.log(`\n${pass}/${total} NPC Ecosystem + Social Network 3.0 checks passed.`);
