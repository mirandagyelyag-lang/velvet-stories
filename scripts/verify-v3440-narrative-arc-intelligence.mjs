import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveNarrativeArcIntelligenceV344, narrativeArcIntelligenceV344Issues, sanitizeNarrativeArcIntelligenceV344Reply } from '../supabase/functions/character-chat/engine/narrative-arc-intelligence-v344.ts';
import { deriveRelationshipChemistryV2 } from '../supabase/functions/character-chat/engine/relationship-chemistry-v2.ts';
import { deriveLongTermCharacterEvolution } from '../supabase/functions/character-chat/engine/long-term-character-evolution.ts';
import { compileStoryContract } from '../supabase/functions/character-chat/engine/story-contract.ts';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));
const meta=JSON.parse(read('public/velvet-version.json'));
const edge=read('supabase/functions/character-chat/index.ts');
const contract=read('supabase/functions/character-chat/engine/story-contract.ts');
const diagnostics=read('src/pages/Diagnostics.jsx');
const syntax=read('scripts/verify-chat-syntax.mjs');
let pass=0,total=0;
function check(name,fn){total++;try{fn();pass++;console.log(`✅ ${name}`)}catch(e){console.error(`❌ ${name}: ${e.message}`);process.exitCode=1;}}

check('version 3.44.0',()=>assert.equal(pkg.version,'3.44.0'));
check('release metadata',()=>assert.equal(meta.release,'Narrative Arc Intelligence + Story Evolution'));
check('v3440 is first stability gate',()=>assert.match(pkg.scripts['stability:lab'],/^npm run verify:v3440/));
check('v3430 remains in stability chain',()=>assert.match(pkg.scripts['stability:lab'],/verify:v3430/));
check('arc engine imported by story contract',()=>assert.match(contract,/deriveNarrativeArcIntelligenceV344/));
check('arc validator imported by edge',()=>assert.match(edge,/narrativeArcIntelligenceV344Issues/));
check('arc sanitizer imported by edge',()=>assert.match(edge,/sanitizeNarrativeArcIntelligenceV344Reply/));
check('story contract exposes v344 engine',()=>assert.match(contract,/narrativeArcIntelligenceV344:/));
check('compact contract exposes narrativeArc344',()=>assert.match(contract,/narrativeArc344:/));
check('chat syntax includes v344 engine',()=>assert.match(syntax,/narrative-arc-intelligence-v344\.ts/));
check('deep prompt carries v3.44',()=>assert.match(edge,/NARRATIVE ARC INTELLIGENCE 3\.44/));
check('main prompt carries story evolution block',()=>assert.match(edge,/NARRATIVE ARC INTELLIGENCE \+ STORY EVOLUTION 3\.44/));
check('human behavior schema carries arc evolution snapshot',()=>assert.match(edge,/arc_evolution_snapshot:\{type:"string"\}/));
check('human behavior continuity persists arc progression mode',()=>assert.match(edge,/arc_progression_mode: keep\("arc_progression_mode"/));
check('hard relationship pace issue wired',()=>assert.match(edge,/"relationship_pace_jump"/));
check('hard stagnation replay issue wired',()=>assert.match(edge,/"arc_stagnation_replay"/));
check('hard resolved arc lock wired',()=>assert.match(edge,/"resolved_arc_reopened_without_cause"/));
check('hard payoff gate wired',()=>assert.match(edge,/"payoff_without_setup"/));
check('Story Evolution Lab edge action exists',()=>assert.match(edge,/action === "story_evolution_lab"/));
check('Story Evolution Lab handler exists',()=>assert.match(edge,/handleStoryEvolutionLab/));
check('Story Evolution Lab UI exists',()=>assert.match(diagnostics,/Story Evolution Lab/));
check('Diagnostics invokes story evolution action',()=>assert.match(diagnostics,/action:"story_evolution_lab"/));

const rowan={
  name:'Rowan Hayes',
  personality:'proud, sarcastic, guarded, avoidant when feelings get intense, loyal underneath',
  relationship:'best friends; hidden crush',
  core_motivation:'keep control of his own life and avoid needing people too much',
  emotional_defense:'leaves or jokes when vulnerability feels too exposed',
  values:'loyalty, autonomy, keeping his word',
  growth_direction:'learn to stay when things get emotionally difficult without becoming emotionally fluent overnight',
};
const recent=[
  {sender:'character',content:'He made a joke, then left when the argument got personal.'},
  {sender:'user',content:'You always leave when this gets serious.'},
  {sender:'character',content:'He left before answering.'},
  {sender:'character',content:'He came back later and apologized.'},
  {sender:'character',content:'He stayed by the door this time. “Give me ten minutes.”'},
  {sender:'character',content:'He stayed through the argument and answered one honest question.'},
  {sender:'character',content:'He apologized without disappearing.'},
];
const development={
  retained_growth:'Under conflict, Rowan now usually stays long enough to answer one honest question instead of leaving immediately.',
  growth_evidence:[{pattern:'stays through the first wave of conflict instead of leaving immediately',evidence_count:4,scope:'with Antonia',status:'durable'}],
  durable_behavior_shifts:[{pattern:'stays through the first wave of conflict instead of leaving immediately',scope:'with Antonia',evidence_count:4}],
  relationship_specific_growth:['with Antonia: asks for ten minutes instead of disappearing'],
  growth_milestones:[{event:'First time he stayed during a serious argument without being chased'}],
};
const longTerm=deriveLongTermCharacterEvolution({character:rowan,developmentState:development,recentMessages:recent});
const chemistry=deriveRelationshipChemistryV2({character:rowan,developmentState:{relationship_phase:'friends'},intelligenceState:{human_behavior_state:{relationship_attraction:'62',relationship_trust:'58',relationship_comfort:'66',relationship_commitment:'32'}},recentMessages:recent,memories:[{category:'relationship',content:'They repaired trust after a serious argument.'},{category:'relationship',content:'They have an established private joke.'}],milestones:[{title:'First serious repair'}]});
const engine=deriveNarrativeArcIntelligenceV344({
  character:rowan,
  relationshipChemistry:chemistry,
  longTermEvolution:longTerm,
  developmentState:development,
  recentMessages:recent,
  memories:[
    {content:'Rowan used to leave immediately when conflict became emotionally personal.',importance:4,category:'relationship'},
    {content:'Rowan stayed and answered one honest question during a later argument.',importance:4,category:'relationship'},
    {content:'Rowan apologized after another argument without disappearing.',importance:4,category:'relationship'},
  ],
  storyArcs:[
    {id:'a1',title:'Learning to stay during emotional conflict',domain:'relationship',status:'active',stage:'developing',evidence_count:4},
    {id:'a2',title:'Racing rivalry',domain:'racing',status:'dormant',evidence_count:2},
    {id:'a3',title:'Freshman orientation problem',domain:'academic',status:'resolved',evidence_count:3},
  ],
  storyConflicts:[
    {id:'c1',title:'Old fight about disappearing',status:'resolved'},
    {id:'c2',title:'Current trust strain',status:'active'},
  ],
  storyMilestones:[{title:'First time Rowan stayed through a serious argument'}],
});

check('parallel arcs are retained',()=>assert.ok(engine.arcs.length>=3));
check('dormant arc remains dormant',()=>assert.ok(engine.arcs.some(a=>a.title==='Racing rivalry'&&a.stage==='dormant')));
check('resolved arc remains resolved',()=>assert.ok(engine.arcs.some(a=>a.title==='Freshman orientation problem'&&a.stage==='resolved')));
check('resolved arc lock list populated',()=>assert.ok(engine.resolvedArcLocks.some(x=>/orientation/i.test(x))));
check('dormant arc list populated',()=>assert.ok(engine.dormantArcs.includes('Racing rivalry')));
check('relationship pace tracks attraction separately',()=>assert.ok(engine.relationshipPace.attraction.stage));
check('relationship pace tracks trust separately',()=>assert.ok(engine.relationshipPace.trust.stage));
check('relationship pace tracks vulnerability separately',()=>assert.ok(engine.relationshipPace.vulnerability.stage));
check('relationship pace tracks comfort separately',()=>assert.ok(engine.relationshipPace.comfort.stage));
check('relationship pace tracks commitment separately',()=>assert.ok(engine.relationshipPace.commitment.stage));
check('behavior progression preserves old defense',()=>assert.match(engine.behaviorProgression.oldPattern,/withdrawal|avoidance|leaves|jokes|guarded/i));
check('behavior progression preserves durable shift',()=>assert.match(engine.behaviorProgression.currentPattern,/stays|conflict/i));
check('total reset is explicitly forbidden',()=>assert.equal(engine.behaviorProgression.totalResetAllowed,false));
check('regression remains allowed',()=>assert.equal(engine.behaviorProgression.regressionAllowed,true));
check('arc dependency policy requires prerequisites',()=>assert.match(engine.arcDependencyPolicy,/prerequisites|Trust needs reliability/i));
check('payoff policy is permission not railroad',()=>assert.match(engine.payoffPolicy,/permission structure|not a railroad/i));
check('progress policy says drama is optional',()=>assert.match(engine.escalationPolicy,/does not mean more drama/i));
check('personality guard protects core identity',()=>assert.match(engine.personalityGuard,/preserving core temperament/i));

let issues=narrativeArcIntelligenceV344Issues({reply:'After that one conversation, everything changed between them. There was no going back now.',engine});
check('forced arc progression detected',()=>assert.ok(issues.includes('arc_forced_progression')));
issues=narrativeArcIntelligenceV344Issues({reply:'One bad fight and all his progress was gone. They were back to square one.',engine});
check('growth total reset detected',()=>assert.ok(issues.includes('arc_growth_total_reset')));
issues=narrativeArcIntelligenceV344Issues({reply:'Love had fixed him. He became a completely different person, soft with everyone now.',engine});
check('personality replacement detected',()=>assert.ok(issues.includes('arc_personality_replacement')));
issues=narrativeArcIntelligenceV344Issues({reply:'The old fight about disappearing was still unresolved. We still needed to settle it.',engine});
check('resolved conflict resurrection detected',()=>assert.ok(issues.includes('resolved_arc_reopened_without_cause')));

const holdEngine=deriveNarrativeArcIntelligenceV344({
  character:rowan,
  relationshipChemistry:{axes:{attraction:32,trust:28,comfort:30,commitment:8},paceGate:{status:'hold'}},
  longTermEvolution:deriveLongTermCharacterEvolution({character:rowan,developmentState:{},recentMessages:[]}),
  recentMessages:[{sender:'user',content:'Thanks for helping me with class.'}],
  storyArcs:[{title:'Early friendship tension',domain:'relationship',status:'active',stage:'setup'}],
  storyConflicts:[],storyMilestones:[],memories:[],
});
issues=narrativeArcIntelligenceV344Issues({reply:'“I love you.” He finally kissed her. They were official now.',engine:holdEngine});
check('turbo relationship milestone detected',()=>assert.ok(issues.includes('relationship_pace_jump')));
issues=narrativeArcIntelligenceV344Issues({reply:'After all that buildup, the arc finally paid off when he confessed.',engine:holdEngine});
check('payoff without setup detected',()=>assert.ok(issues.includes('payoff_without_setup')));
issues=narrativeArcIntelligenceV344Issues({reply:'He needed something dramatic to move things forward, so a car crash changed everything.',engine:{...holdEngine,escalationBudget:0}});
check('drama injected for progress detected',()=>assert.ok(issues.includes('drama_escalation_for_progress')));

const loopEngine=deriveNarrativeArcIntelligenceV344({
  character:rowan,relationshipChemistry:{axes:{attraction:50,trust:45,comfort:45,commitment:20},paceGate:{status:'hold'}},longTermEvolution:longTerm,
  recentMessages:[
    {sender:'character',content:'He joked, the tension rose, and he left.'},
    {sender:'character',content:'He teased her, the argument sharpened, and he left again.'},
    {sender:'character',content:'Another sarcastic joke, another fight, then he walked away.'},
    {sender:'character',content:'He joked, argued, and stormed off again.'},
  ],
  storyArcs:[{title:'Avoidance loop',domain:'relationship',status:'active'}],storyConflicts:[],storyMilestones:[],memories:[],
});
check('stagnation warning generated from repeated skeleton',()=>assert.ok(loopEngine.stagnationWarnings.length>0));
issues=narrativeArcIntelligenceV344Issues({reply:'He joked, the argument started again, and he stormed off again.',engine:loopEngine});
check('stagnation replay detected',()=>assert.ok(issues.includes('arc_stagnation_replay')));

issues=narrativeArcIntelligenceV344Issues({reply:'Their relationship had evolved. Things were different now between them.',engine});
check('arc exposition without behavior detected',()=>assert.ok(issues.includes('arc_progress_exposition')));
const safe='His first instinct was still the door. He looked at it, swore under his breath, then stayed. “Ten minutes. I’m still mad, but I’m not disappearing.”';
issues=narrativeArcIntelligenceV344Issues({reply:safe,engine});
check('earned behavioral progression with old defense is allowed',()=>assert.equal(issues.length,0));

let sanitized=sanitizeNarrativeArcIntelligenceV344Reply('Everything changed between them. There was no going back now. He stayed by the door. “Ten minutes.”',['arc_forced_progression']);
check('sanitizer removes forced progression narration',()=>assert.doesNotMatch(sanitized,/everything changed|no going back/i));
check('sanitizer keeps grounded behavior',()=>assert.match(sanitized,/stayed|Ten minutes/i));
sanitized=sanitizeNarrativeArcIntelligenceV344Reply('“I love you.” He finally kissed her. He stayed beside the table.',['relationship_pace_jump']);
check('sanitizer strips unsupported milestone',()=>assert.doesNotMatch(sanitized,/love you|kissed/i));
check('sanitizer preserves unrelated safe action',()=>assert.match(sanitized,/stayed beside the table/i));

const compiled=compileStoryContract({
  character:rowan,userName:'Antonia',latestUserMessage:'We are not doing the same fight again.',turnIntent:{medium:'in_person'},recentMessages:recent,
  memories:[{content:'Rowan stayed through a serious argument.',category:'relationship',importance:4}],storyArcs:[{title:'Learning to stay during conflict',domain:'relationship',status:'active',evidence_count:4}],storyConflicts:[{title:'Old disappearing fight',status:'resolved'}],storyPlans:[],storyMilestones:[{title:'First time he stayed'}],storyConsequences:[],storyBible:[],knowledgeLedger:[],persistentCast:[],castConnections:[],developmentState:development,intelligenceState:{human_behavior_state:{relationship_attraction:'62',relationship_trust:'58',relationship_comfort:'66',relationship_commitment:'32'}},
});
check('compiled contract contains v344 arc engine',()=>assert.ok(compiled.narrativeArcIntelligenceV344));
check('compiled arc engine sees resolved lock',()=>assert.ok(compiled.narrativeArcIntelligenceV344.resolvedArcLocks.some(x=>/disappearing/i.test(x))));
check('compiled turn objective references progression discipline',()=>assert.match(compiled.turnObjective,/shift|milestone|progression|earned/i));

console.log(`\n${pass}/${total} Narrative Arc Intelligence 3.44 checks passed.`);
if(pass!==total)process.exitCode=1;
