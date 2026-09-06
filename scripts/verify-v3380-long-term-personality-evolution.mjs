import fs from 'node:fs';
import assert from 'node:assert/strict';
import { deriveLongTermCharacterEvolution, longTermCharacterEvolutionIssues, sanitizeLongTermCharacterEvolutionReply } from '../supabase/functions/character-chat/engine/long-term-character-evolution.ts';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));
const meta=JSON.parse(read('public/velvet-version.json'));
const contract=read('supabase/functions/character-chat/engine/story-contract.ts');
const edge=read('supabase/functions/character-chat/index.ts');
const diagnostics=read('src/pages/Diagnostics.jsx');
let pass=0,total=0;
const check=(name,fn)=>{ total++; try{ fn(); pass++; console.log('PASS',name); } catch(e){ console.error('FAIL',name,'\n ',e.message); process.exitCode=1; } };

check('version 3.38.0+ descendant',()=>assert.ok(/^3\.38\./.test(pkg.version)||/^3\.(?:39|[4-9]\d)\./.test(pkg.version)));
check('Long-Term Personality Evolution preserved in descendant',()=>assert.match(`${meta.release} ${contract} ${edge}`,/Long-Term Personality Evolution/i));
check('stability lab retains v3380',()=>assert.match(pkg.scripts['stability:lab'],/verify:v3380/));
check('evolution engine imported by story contract',()=>assert.match(contract,/deriveLongTermCharacterEvolution/));
check('evolution validator imported by edge',()=>assert.match(edge,/longTermCharacterEvolutionIssues, sanitizeLongTermCharacterEvolutionReply/));
check('compact contract exposes long-term evolution',()=>assert.match(contract,/longTermCharacterEvolution:/));
check('system instruction carries v3.38',()=>assert.match(edge,/v3\.38 LONG-TERM PERSONALITY EVOLUTION/));
check('main prompt has v3.38 block',()=>assert.match(edge,/LONG-TERM CHARACTER EVOLUTION 3\.38\.0/));
check('development state upgraded to version 3',()=>assert.match(edge,/version: 3,/));
check('growth evidence persists',()=>assert.match(edge,/growth_evidence: growthEvidence/));
check('durable shifts persist',()=>assert.match(edge,/durable_behavior_shifts: durableBehaviorShifts/));
check('relationship-specific growth persists',()=>assert.match(edge,/relationship_specific_growth/));
check('belief challenges persist',()=>assert.match(edge,/challenged_beliefs/));
check('growth milestones persist',()=>assert.match(edge,/growth_milestones/));
check('candidate shift needs accumulated evidence',()=>assert.match(edge,/const count = Math\.min\(6,[\s\S]{0,450}status = count >= 3 \? "durable"/));
check('high significance accelerates but does not auto-durable from zero',()=>assert.match(edge,/const increment = significance === "high" \? 2 : 1/));
check('schema exposes growth update fields',()=>assert.match(edge,/growth_behavior_shift[\s\S]{0,500}growth_retained/));
check('quality schema exposes evolution booleans',()=>assert.match(edge,/character_evolution_ok[\s\S]{0,500}relationship_specific_growth_ok/));
check('hard evolution issue classes wired',()=>['instant_personality_rewrite','relationship_personality_replacement','growth_exposition_without_behavior','growth_regression_reset','unearned_offscreen_transformation','relationship_growth_globalized'].forEach(x=>assert.ok(edge.includes(`"${x}"`))));
check('evolution sanitizer wired',()=>assert.match(edge,/sanitizeLongTermCharacterEvolutionReply\(reply, issues\)/));
check('Character Evolution Lab edge action exists',()=>assert.match(edge,/action === "character_evolution_lab"/));
check('Character Evolution Lab UI exists',()=>assert.match(diagnostics,/Character Evolution Lab/));
check('Diagnostics invokes evolution lab action',()=>assert.match(diagnostics,/action: "character_evolution_lab"/));

const rowan={
  name:'Rowan Hayes',
  personality:'proud, sarcastic, guarded, avoidant when feelings get intense, loyal underneath',
  relationship:'best friends; hidden crush',
  core_motivation:'keep control of his own life and avoid needing people too much',
  emotional_defense:'leaves or jokes when vulnerability feels too exposed',
  values:'loyalty, autonomy, keeping his word',
  growth_direction:'learn to stay when things get emotionally difficult without becoming emotionally fluent overnight',
};

const baseline=deriveLongTermCharacterEvolution({character:rowan,developmentState:{},recentMessages:[]});
check('core identity extracted',()=>assert.ok(baseline.coreIdentity.length>=2));
check('guarded/private identity anchored',()=>assert.ok(baseline.coreIdentity.some(x=>/guarded|private/i.test(x))));
check('avoidance recognized as mutable defense',()=>assert.ok(baseline.mutableDefenses.some(x=>/withdrawal|avoidance/i.test(x))));
check('growth starts held without evidence',()=>assert.equal(baseline.growthGate.status,'hold'));
check('growth threshold is three',()=>assert.equal(baseline.growthGate.threshold,3));
check('anti-replacement rule explicitly protects character',()=>assert.match(baseline.antiReplacement,/does not replace the character/i));
check('regression is explicitly allowed',()=>assert.equal(baseline.regression.allowed,true));

const evolved=deriveLongTermCharacterEvolution({
  character:rowan,
  developmentState:{
    retained_growth:'Under conflict, Rowan now usually stays long enough to answer one honest question instead of leaving immediately.',
    growth_evidence:[{pattern:'stays through the first wave of conflict instead of leaving immediately',evidence_count:4,scope:'with Antonia',status:'durable',last_evidence:'He stayed and answered.'}],
    durable_behavior_shifts:[{pattern:'stays through the first wave of conflict instead of leaving immediately',scope:'with Antonia',evidence_count:4}],
    relationship_specific_growth:['with Antonia: asks for ten minutes instead of disappearing'],
    active_beliefs:['depending on someone threatens autonomy'],
    challenged_beliefs:['Antonia has repeatedly stayed after difficult conversations, so dependence is not automatically loss of control'],
    growth_milestones:[{event:'First time he stayed during a serious argument without being chased',impact:'proved he can tolerate conflict without escaping'}],
    setback_pressure:'public humiliation makes withdrawal tempting again',
  },
  recentMessages:[
    {sender:'character',content:'He stayed by the door instead of leaving.'},
    {sender:'character',content:'"Give me ten minutes. I am not leaving."'},
    {sender:'character',content:'He came back and apologized without being asked.'},
    {sender:'character',content:'He kept his word and stayed.'},
  ],
});
check('repeated evidence allows visible change',()=>assert.equal(evolved.growthGate.status,'allow_visible_change'));
check('durable shift reaches engine',()=>assert.ok(evolved.durableShifts.some(x=>x.status==='durable'&&x.evidenceCount>=3)));
check('relationship-specific growth remains explicit',()=>assert.ok(evolved.relationshipSpecificGrowth.some(x=>/Antonia/i.test(x))));
check('belief challenge remains separate from active belief',()=>assert.ok(evolved.activeBeliefs.length&&evolved.challengedBeliefs.length));
check('milestone retained',()=>assert.ok(evolved.growthMilestones.some(x=>/First time/i.test(x))));
check('retained growth survives regression policy',()=>assert.match(evolved.regression.retainedGrowth,/stays|answer/i));

let issues=longTermCharacterEvolutionIssues({reply:'After one good conversation, all his walls were gone. Rowan was an open book now.',latestUserMessage:'Thanks for staying.',character:rowan,engine:baseline});
check('instant personality rewrite detected',()=>assert.ok(issues.includes('instant_personality_rewrite')));

issues=longTermCharacterEvolutionIssues({reply:'He had become a complete golden retriever around her, all edge gone.',latestUserMessage:'I smiled.',character:rowan,engine:baseline});
check('romance personality replacement detected',()=>assert.ok(issues.includes('relationship_personality_replacement')));

issues=longTermCharacterEvolutionIssues({reply:'He had grown. He was finally better now.',latestUserMessage:'Okay.',character:rowan,engine:baseline});
check('growth exposition without behavior detected',()=>assert.ok(issues.includes('growth_exposition_without_behavior')));

issues=longTermCharacterEvolutionIssues({reply:'One bad fight and all the progress was gone. They were back to square one.',latestUserMessage:'I yelled at him.',character:rowan,engine:evolved});
check('regression-as-reset detected',()=>assert.ok(issues.includes('growth_regression_reset')));

issues=longTermCharacterEvolutionIssues({reply:'Since you last saw him, he had completely changed and was no longer guarded.',latestUserMessage:'Two days later, I see him again.',character:rowan,engine:{...baseline,offscreenGrowth:{allowed:false,pressureSources:[],policy:''}}});
check('unearned offscreen transformation detected',()=>assert.ok(issues.includes('unearned_offscreen_transformation')));

issues=longTermCharacterEvolutionIssues({reply:'After learning to open up with you, he was like this with everyone now.',latestUserMessage:'Hey.',character:rowan,engine:evolved});
check('relationship growth globalization detected',()=>assert.ok(issues.includes('relationship_growth_globalized')));

const safe='He almost headed for the door. His hand reached the handle, then stopped. "Give me ten minutes." He stayed where he was, still visibly irritated.';
issues=longTermCharacterEvolutionIssues({reply:safe,latestUserMessage:'We are fighting again.',character:rowan,engine:evolved});
check('behavioral growth with old defense remains valid',()=>assert.equal(issues.length,0));

const sanitized=sanitizeLongTermCharacterEvolutionReply('He had grown. He was finally better now. He stayed by the door. "Give me ten minutes."',['growth_exposition_without_behavior']);
check('sanitizer removes announcement but keeps lived behavior',()=>{assert.doesNotMatch(sanitized,/had grown|finally better/i);assert.match(sanitized,/stayed|ten minutes/i);});

check('prompt says relationship-specific growth is not global',()=>assert.match(edge,/relationship-specific learning[\s\S]{0,300}remaining guarded elsewhere/i));
check('prompt says regression keeps proven growth',()=>assert.match(edge,/Regression is human[\s\S]{0,260}retain proven growth/i));
check('prompt blocks romance personality replacement',()=>assert.match(edge,/Romance can reveal hidden range but cannot replace core identity/i));
check('offscreen growth requires cause',()=>assert.match(contract,/Off-screen change needs an established life\/arc cause|Off-screen growth must come from established life\/arc pressure/i));
check('same-person rule reaches compact contract',()=>assert.match(contract,/same person, different history|same person, different history/i));

if(!process.exitCode) console.log(`\n${pass}/${total} Long-Term Personality Evolution checks passed.`);
