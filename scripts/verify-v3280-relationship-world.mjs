import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read=(p)=>fs.readFileSync(p,"utf8");
const contractTs=read("supabase/functions/character-chat/engine/story-contract.ts");
const socialTs=read("supabase/functions/character-chat/engine/social-gravity-world-identity.ts");
const chemistryTs=read("supabase/functions/character-chat/engine/relationship-chemistry-v2.ts");
const embodiedTs=read("supabase/functions/character-chat/engine/embodied-awareness-salience.ts");
const sceneIntelligenceTs=read("supabase/functions/character-chat/engine/scene-intelligence-dynamic-world.ts");
const discourseTs=read("supabase/functions/character-chat/engine/discourse-coherence-event-truth.ts");
const evolutionTs = fs.readFileSync("supabase/functions/character-chat/engine/long-term-character-evolution.ts", "utf8");
const npcEcosystemTs=read("supabase/functions/character-chat/engine/npc-ecosystem-social-network-v3.ts");
const calendarLifeTs=read("supabase/functions/character-chat/engine/calendar-life-simulation.ts");
const causalTimelineTs=read("supabase/functions/character-chat/engine/world-consequences-causal-timeline.ts");
const socialJs=stripTypeScriptTypes(socialTs,{mode:"strip",sourceUrl:"social-gravity-world-identity.ts"});
const socialUrl=`data:text/javascript;base64,${Buffer.from(socialJs).toString("base64")}`;
const chemistryJs=stripTypeScriptTypes(chemistryTs,{mode:"strip",sourceUrl:"relationship-chemistry-v2.ts"});
const chemistryUrl=`data:text/javascript;base64,${Buffer.from(chemistryJs).toString("base64")}`;
const embodiedJs=stripTypeScriptTypes(embodiedTs,{mode:"strip",sourceUrl:"embodied-awareness-salience.ts"});
const embodiedUrl=`data:text/javascript;base64,${Buffer.from(embodiedJs).toString("base64")}`;
const sceneIntelligenceJs=stripTypeScriptTypes(sceneIntelligenceTs,{mode:"strip",sourceUrl:"scene-intelligence-dynamic-world.ts"});
const sceneIntelligenceUrl=`data:text/javascript;base64,${Buffer.from(sceneIntelligenceJs).toString("base64")}`;
const discourseJs=stripTypeScriptTypes(discourseTs,{mode:"strip",sourceUrl:"discourse-coherence-event-truth.ts"});
const discourseUrl=`data:text/javascript;base64,${Buffer.from(discourseJs).toString("base64")}`;
const evolutionJs = stripTypeScriptTypes(evolutionTs, { mode: "strip", sourceUrl: "long-term-character-evolution.ts" });
const evolutionUrl = `data:text/javascript;base64,${Buffer.from(evolutionJs).toString("base64")}`;
const npcEcosystemJs=stripTypeScriptTypes(npcEcosystemTs,{mode:"strip",sourceUrl:"npc-ecosystem-social-network-v3.ts"});
const npcEcosystemUrl=`data:text/javascript;base64,${Buffer.from(npcEcosystemJs).toString("base64")}`;
const calendarLifeJs=stripTypeScriptTypes(calendarLifeTs,{mode:"strip",sourceUrl:"calendar-life-simulation.ts"});
const calendarLifeUrl=`data:text/javascript;base64,${Buffer.from(calendarLifeJs).toString("base64")}`;
const causalTimelineJs=stripTypeScriptTypes(causalTimelineTs,{mode:"strip",sourceUrl:"world-consequences-causal-timeline.ts"});
const causalTimelineUrl=`data:text/javascript;base64,${Buffer.from(causalTimelineJs).toString("base64")}`;
const contractJs=stripTypeScriptTypes(contractTs,{mode:"strip",sourceUrl:"story-contract.ts"})
  .replace('"./social-gravity-world-identity.ts"', JSON.stringify(socialUrl))
  .replace('"./relationship-chemistry-v2.ts"', JSON.stringify(chemistryUrl))
  .replace('"./embodied-awareness-salience.ts"', JSON.stringify(embodiedUrl))
  .replace('"./scene-intelligence-dynamic-world.ts"', JSON.stringify(sceneIntelligenceUrl))
  .replace('"./discourse-coherence-event-truth.ts"', JSON.stringify(discourseUrl))
  .replace('"./long-term-character-evolution.ts"', JSON.stringify(evolutionUrl))
  .replace('"./npc-ecosystem-social-network-v3.ts"', JSON.stringify(npcEcosystemUrl))
  .replace('"./calendar-life-simulation.ts"', JSON.stringify(calendarLifeUrl))
  .replace('"./world-consequences-causal-timeline.ts"', JSON.stringify(causalTimelineUrl));
const { compileStoryContract, storyContractPrompt } = await import(`data:text/javascript;base64,${Buffer.from(contractJs).toString("base64")}`);
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const vite=read("vite.config.js");
const semverAtLeast=(value,minimum)=>{const a=String(value||"").split(".").map((part)=>Number.parseInt(part,10)||0);const b=String(minimum||"").split(".").map((part)=>Number.parseInt(part,10)||0);for(let i=0;i<Math.max(a.length,b.length);i++){const av=a[i]||0,bv=b[i]||0;if(av>bv)return true;if(av<bv)return false;}return true;};

const rowan={name:"Rowan",role:"student",personality:"guarded dry proud independent; avoids feelings but cares deeply",relationship:"old friend with attraction and unresolved tension",core_motivation:"protect autonomy and the friendship",emotional_defense:"withdraws when feelings become obvious",affection_style:"shows up and remembers details",conflict_style:"goes quiet before apologizing",speech_style:"short casual understated",humor_style:"dry"};
const base={
  character:rowan,userName:"Anto",latestUserMessage:"Haven't seen you much lately.",turnIntent:{medium:"in_person"},
  sceneState:{location:"library entrance",time_label:"5:40 PM",present:["Anto","Rowan","Chloe"]},
  recentMessages:[
    {sender:"character",content:"You still live in the library or what?"},
    {sender:"character",content:"Rain's getting worse. C'mon."},
    {sender:"character",content:"Been around. Just busy."},
    {sender:"character",content:"I should go soon."}
  ],
  intelligenceState:{
    human_behavior_state:{expectation_contact:"does not expect constant texting",relationship_comfort:"52",relationship_commitment:"24",selective_memory_focus:"the last unfinished argument",physical_boundary_state:"no forced touch",long_term_arc:"learning not to run"},
    character_mind:{attachment_pattern:"withdraw",believe:"Anto may be pulling away",misunderstand:"he thinks the distance might be intentional"},
    emotional_causality:{emotion:"uneasy",behavioral_pressure:"avoid overexposure"},
    unfinished_business:["unfinished argument"],
    scene_variety_history:["library :: question-led","campus path :: cinematic-tension-beat","library :: dialogue-beat"]
  },
  developmentState:{relationship_phase:"friends with charged tension",relationship_dynamic:"close friends with attraction",emotional_residue:"still awkward after the argument",conflict_aftertaste:"he is more careful about disappearing",repair_debt:"needs to acknowledge avoidance",repair_progress:"he returned instead of vanishing",retained_growth:"he answers slightly more honestly",active_contradiction:"wants closeness but protects distance"},
  relationshipState:{},
  storyArcs:[{title:"Learning not to run",status:"active",next_pressure:"stay present through discomfort"}],
  storyConsequences:[{title:"Missed plan",effect:"trust is slightly reduced",status:"active",weight:4}],
  storyConflicts:[{title:"Last argument",cause:"he disappeared after conflict",status:"active",resolution_need:"acknowledge the avoidance"}],
  storyMilestones:[{milestone_type:"first_vulnerable_admission",title:"First honest admission"}],
  chemistryProfiles:[{character_name:"Rowan",trust_score:48,tension_score:67}],
  persistentCast:[{name:"Chloe",role:"friend",relationship:"friend of both",goals:"meet Jules after class",presence:"present"},{name:"Jules",role:"friend",relationship:"Chloe's close friend",goals:"organize dinner plans",presence:"off_scene"}],
  castConnections:[
    {from_name:"Rowan",to_name:"Chloe",relationship:"longtime friend",visibility:"known"},
    {from_name:"Chloe",to_name:"Jules",relationship:"best friends",visibility:"known"},
    {from_name:"Jules",to_name:"Chloe",relationship:"trusted confidante",visibility:"known"}
  ],
  knowledgeLedger:[{character_name:"Chloe",subject:"Rowan and Anto argued",knowledge:"heard they had a fight",status:"rumor",secret:false}],
  memories:[
    {content:"Anto asked Rowan not to disappear after arguments",category:"boundary",importance:5,is_canon:true},
    {content:"Rowan came back after the last argument instead of ghosting",category:"relationship",importance:4},
    {content:"They once got coffee after class",category:"fact",importance:2}
  ],
  writingPreferences:{prose:"minimal",dialogue:"dialogue_forward",emotional_interior:"restrained",romance_pacing:"medium_fast",custom_instructions:"natural young-adult dialogue"}
};
const c=compileStoryContract(base);
const prompt=storyContractPrompt(c);
const checks=[
  ["version >= 3.28.0",semverAtLeast(pkg.version,"3.28.0")&&semverAtLeast(pub.version,"3.28.0")],
  ["release metadata",typeof pub.release==="string"&&pub.release.trim().length>0&&vite.includes("const velvetRelease")],
  ["relationship intelligence exists",Boolean(c.relationshipIntelligenceEngine?.attachmentStrategy)],
  ["relationship axes remain separate",c.relationshipIntelligenceEngine.attraction!==c.relationshipIntelligenceEngine.trust&&c.relationshipIntelligenceEngine.commitment<c.relationshipIntelligenceEngine.attraction],
  ["attachment defense can create mixed signals",/desire and defense|attraction can remain/i.test(c.relationshipIntelligenceEngine.mixedSignal)],
  ["forgiveness is gated by unresolved repair",/not complete|not presumed/i.test(c.relationshipIntelligenceEngine.forgivenessGate)],
  ["romance pace comes from story preferences",c.relationshipIntelligenceEngine.romanticPace==="medium_fast"],
  ["emotional continuity carries residue",c.emotionalContinuityEngine.residueLevel>20&&c.emotionalContinuityEngine.unresolved.length>0],
  ["repair does not instantly reset baseline",/recover|aftertaste|differ/i.test(c.emotionalContinuityEngine.behavioralCarry+c.emotionalContinuityEngine.instruction)],
  ["scene variety sees recent shapes",c.sceneVarietyEngine.recentSignatures.length>=3],
  ["scene variety protects continuity",/teleport|continuity/i.test(c.sceneVarietyEngine.instruction+c.sceneVarietyEngine.transitionPermission)],
  ["npc social network has independent bond",c.npcSocialNetworkEngine.independentBonds.some((x)=>/Chloe.*Jules|Jules.*Chloe/i.test(x))],
  ["npc information flow is asymmetric",c.npcSocialNetworkEngine.rumorFlow.length>=1],
  ["long-term memory keeps core canon",c.longTermMemoryEngine.core.some((x)=>/not to disappear/i.test(x))],
  ["long-term memory tracks behavior-changing events",c.longTermMemoryEngine.behaviorChanging.length>=1],
  ["writing style director reads preferences",c.writingStyleDirector.proseMode==="minimal"&&c.writingStyleDirector.dialogueMode==="dialogue_forward"&&c.writingStyleDirector.interiorMode==="restrained"],
  ["writing style director bans cadence repetition",c.writingStyleDirector.forbiddenCadence.length>=3],
  ["compact contract carries v3.28 engines",prompt.includes('"relationshipIntelligence"')&&prompt.includes('"emotionalContinuity"')&&prompt.includes('"sceneVariety"')&&prompt.includes('"npcSocialNetwork"')&&prompt.includes('"longTermMemory4"')&&prompt.includes('"writingStyle"')],
  ["main prompt names all five upgrades",edge.includes("RELATIONSHIP INTELLIGENCE 4.0")&&edge.includes("SCENE VARIETY ENGINE 4.0")&&edge.includes("NPC SOCIAL NETWORK 2.0")&&edge.includes("LONG-TERM MEMORY 4.0")&&edge.includes("WRITING STYLE DIRECTOR 1.0")],
  ["prompt has relationship intelligence runtime block",edge.includes("RELATIONSHIP INTELLIGENCE 4.0\nAttachment strategy")],
  ["prompt has emotional continuity runtime block",edge.includes("EMOTIONAL CONTINUITY 4.0\nResidue level")],
  ["prompt has scene variety runtime block",edge.includes("SCENE VARIETY 4.0\nRecent signatures")],
  ["persistent state stores v3.28 signals",edge.includes('attachment_strategy: keep("attachment_strategy"')&&edge.includes("scene_variety_history: sceneVarietyHistory")&&edge.includes('writing_style_signature: keep("writing_style_signature"')],
  ["quality gate covers v3.28",edge.includes("qc.relationship_intelligence_ok")&&edge.includes("qc.emotional_continuity_ok")&&edge.includes("qc.scene_variety_ok")&&edge.includes("qc.npc_network_ok")&&edge.includes("qc.long_memory_ok")&&edge.includes("qc.writing_style_ok")],
  ["response schema allows v3.28 metadata",edge.includes("relationship_attraction:{type:\"string\"}")&&edge.includes("scene_signature:{type:\"string\"}")&&edge.includes("writing_style_signature:{type:\"string\"}")],
  ["system instruction upgraded",edge.includes("v3.28 RELATIONSHIP WORLD")],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} Relationship World + Story Intelligence checks passed.`);
if(failed)process.exit(1);
