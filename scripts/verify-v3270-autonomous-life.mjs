import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const contractTs = fs.readFileSync("supabase/functions/character-chat/engine/story-contract.ts", "utf8");
const socialTs = fs.readFileSync("supabase/functions/character-chat/engine/social-gravity-world-identity.ts", "utf8");
const chemistryTs = fs.readFileSync("supabase/functions/character-chat/engine/relationship-chemistry-v2.ts", "utf8");
const embodiedTs = fs.readFileSync("supabase/functions/character-chat/engine/embodied-awareness-salience.ts", "utf8");
const sceneIntelligenceTs = fs.readFileSync("supabase/functions/character-chat/engine/scene-intelligence-dynamic-world.ts", "utf8");
const discourseTs = fs.readFileSync("supabase/functions/character-chat/engine/discourse-coherence-event-truth.ts", "utf8");
const socialJs = stripTypeScriptTypes(socialTs, { mode: "strip", sourceUrl: "social-gravity-world-identity.ts" });
const chemistryJs = stripTypeScriptTypes(chemistryTs, { mode: "strip", sourceUrl: "relationship-chemistry-v2.ts" });
const socialUrl = `data:text/javascript;base64,${Buffer.from(socialJs).toString("base64")}`;
const chemistryUrl = `data:text/javascript;base64,${Buffer.from(chemistryJs).toString("base64")}`;
const embodiedJs = stripTypeScriptTypes(embodiedTs, { mode: "strip", sourceUrl: "embodied-awareness-salience.ts" });
const embodiedUrl = `data:text/javascript;base64,${Buffer.from(embodiedJs).toString("base64")}`;
const sceneIntelligenceJs = stripTypeScriptTypes(sceneIntelligenceTs, { mode: "strip", sourceUrl: "scene-intelligence-dynamic-world.ts" });
const sceneIntelligenceUrl = `data:text/javascript;base64,${Buffer.from(sceneIntelligenceJs).toString("base64")}`;
const discourseJs = stripTypeScriptTypes(discourseTs, { mode: "strip", sourceUrl: "discourse-coherence-event-truth.ts" });
const discourseUrl = `data:text/javascript;base64,${Buffer.from(discourseJs).toString("base64")}`;
const contractJs = stripTypeScriptTypes(contractTs, { mode: "strip", sourceUrl: "story-contract.ts" })
  .replace('"./social-gravity-world-identity.ts"', JSON.stringify(socialUrl))
  .replace('"./relationship-chemistry-v2.ts"', JSON.stringify(chemistryUrl))
  .replace('"./embodied-awareness-salience.ts"', JSON.stringify(embodiedUrl))
  .replace('"./scene-intelligence-dynamic-world.ts"', JSON.stringify(sceneIntelligenceUrl))
  .replace('"./discourse-coherence-event-truth.ts"', JSON.stringify(discourseUrl));
const contractModule = await import(`data:text/javascript;base64,${Buffer.from(contractJs).toString("base64")}`);
const { compileStoryContract, inferAutonomousLife, storyContractPrompt } = contractModule;

const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
const diagnostics=read("src/pages/Diagnostics.jsx");

const rowan={ name:"Rowan", role:"student", personality:"guarded dry proud sarcastic independent; avoids feelings", relationship:"old friend with attraction and unresolved tension", core_motivation:"protect autonomy and the friendship", emotional_defense:"withdraws when feelings become obvious", affection_style:"shows up and remembers details", conflict_style:"goes quiet before apologizing" };
const intelligence={ human_behavior_state:{ autonomy_agenda:"finish an assignment before practice", outside_obligation:"team practice at six", expectation_contact:"does not expect constant texting", imperfection_pattern:"withdraws too far when embarrassed", selective_memory_focus:"the last unfinished argument" }, presence_engine_state:{ consequence_residue:"still awkward after the argument" }, character_mind:{ short_goal:"make practice on time", outside_priority:"team practice", current_emotion:"uneasy" }, unfinished_business:["unfinished argument"] };
const base={ character:rowan,userName:"Anto",latestUserMessage:"Haven't seen you much lately.",turnIntent:{medium:"in_person"},sceneState:{location:"campus",time_label:"5:40 PM",present:["Anto","Rowan","Chloe"]},recentMessages:[{sender:"character",content:"Yeah. Been busy."},{sender:"character",content:"I should go soon."}],intelligenceState:intelligence,developmentState:{relationship_phase:"friends with charged tension",emotional_residue:"argument residue",retained_growth:"he is slightly quicker to answer honestly"},relationshipState:{},storyArcs:[{id:"a1",title:"Learning not to run",summary:"Rowan keeps withdrawing",status:"active",progress:18,next_pressure:"choose between avoidance and a small honest act",stakes:"trust"}],storyConsequences:[{title:"Missed plan",effect:"trust is slightly reduced",status:"active",weight:4}],storyConflicts:[{title:"Last argument",cause:"he disappeared after conflict",status:"active",resolution_need:"acknowledge the avoidance without demanding instant forgiveness"}],storyPlans:[{title:"Practice",status:"accepted",story_time:"6 PM"}],calendarEvents:[{title:"Team practice",status:"upcoming",story_time:"6 PM"}],storyMilestones:[{milestone_type:"first_vulnerable_admission",title:"First honest admission"}],chemistryProfiles:[{character_name:"Rowan",trust_score:48,tension_score:61}],persistentCast:[{name:"Chloe",role:"friend",relationship:"friend of both",goals:"meet another friend after class",presence:"present"}],castConnections:[{from_name:"Rowan",to_name:"Chloe",relationship:"longtime friend",visibility:"known"}],memories:[{content:"Anto asked Rowan not to disappear after arguments",category:"boundary",importance:5,is_canon:true},{content:"They had coffee once",category:"fact",importance:2}],};
const c=compileStoryContract(base);
const prompt=storyContractPrompt(c);
const autonomy=inferAutonomousLife(rowan,intelligence,base.calendarEvents,base.storyPlans);

const checks=[
 ["version >= 3.27.0",Number(pkg.version.split(".")[0])>3 || (Number(pkg.version.split(".")[0])===3 && Number(pkg.version.split(".")[1])>=27) && pkg.version===pub.version],
 ["release metadata",Boolean(pub.release)&&typeof pub.release==="string"],
 ["autonomous life engine exists",contractSource.includes("export function inferAutonomousLife")&&Boolean(c.autonomousLifeEngine.currentAgenda)],
 ["outside obligation survives",/practice/i.test(autonomy.outsideObligation)&&/practice/i.test(c.autonomousLifeEngine.timePressure)],
 ["consequence engine carries residue",c.consequenceEngine.cannotReset&&c.consequenceEngine.activeResidue.length>0],
 ["scene rhythm engine has phases",["open","develop","turn","land","close"].includes(c.sceneRhythmEngine.phase)],
 ["selective memory prioritizes boundary",c.selectiveMemoryEngine.highSalience.some((m)=>/disappear/i.test(m))],
 ["relationship expectations are character-owned",/constant/i.test(c.relationshipExpectations.contact)&&c.relationshipExpectations.instruction.includes("not facts about the user")],
 ["human imperfection is explicit",Boolean(c.humanImperfectionEngine.likelyMistake)&&c.humanImperfectionEngine.instruction.includes("bounded human imperfection")],
 ["NPC autonomy carries independent goal",c.npcAutonomyEngine.active.some((n)=>n.name==="Chloe"&&/friend/i.test(String(n.goal)))],
 ["romance progression is evidence based",c.romanceProgressionEngine.phase!=="not_romantic"&&c.romanceProgressionEngine.instruction.includes("evidence")],
 ["long-term arc uses active arc",/Learning not to run/.test(c.longTermArcEngine.currentArc)],
 ["clone protection signature exists",c.cloneProtection.identitySignature.length>30&&c.cloneProtection.instruction.includes("swapping the speaker name")],
 ["compact prompt carries autonomy",prompt.includes('"autonomy"')&&prompt.includes('"consequences"')&&prompt.includes('"sceneRhythm"')],
 ["prompt carries v3.27 engines",edge.includes("AUTONOMOUS CHARACTER ENGINE 3.0")&&edge.includes("CONSEQUENCE ENGINE 3.0")&&edge.includes("ROMANCE PROGRESSION 3.0")],
 ["hidden state persists autonomy",edge.includes('autonomy_agenda: keep("autonomy_agenda"')&&edge.includes('scene_phase: ["open","develop","turn","land","close"]')],
 ["automatic trivial memory filter exists",edge.includes("function isLowSalienceAutomaticMemory")&&edge.includes("isLowSalienceAutomaticMemory(content")],
 ["major events can seed long arcs",edge.includes("long-term arc seed failed")&&edge.includes("Long arc ·")],
 ["clone lab Edge action exists",edge.includes('action === "character_clone_lab"')&&edge.includes("handleCharacterCloneLab")],
 ["clone lab UI exists",diagnostics.includes("Character Clone Lab")&&diagnostics.includes("Run blind clone test")],
 ["main generation retains autonomous system",edge.includes("AUTONOMOUS CHARACTER ENGINE 3.0")&&edge.includes("Presence Engine 3.0")],
 ["quality check covers new engines",edge.includes("qc.autonomy_ok")&&edge.includes("qc.clone_ok")&&edge.includes("qc.romance_progression_ok")],
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} Autonomous Life + Consequence Engine checks passed.`);
if(failed)process.exit(1);
