import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { compileStoryContract, storyContractPrompt } from "../supabase/functions/character-chat/engine/story-contract.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const semverAtLeast=(value,minimum)=>{ const a=String(value||"").split(".").map((x)=>Number.parseInt(x,10)||0); const b=String(minimum||"").split(".").map((x)=>Number.parseInt(x,10)||0); for(let i=0;i<Math.max(a.length,b.length);i++){ if((a[i]||0)>(b[i]||0)) return true; if((a[i]||0)<(b[i]||0)) return false; } return true; };
const contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
const vite=read("vite.config.js");

const checks=[
 ["version >= 3.32.0",semverAtLeast(pkg.version,"3.32.0")&&semverAtLeast(pub.version,"3.32.0")],
 ["release metadata present",typeof pub.release==="string"&&pub.release.trim().length>0&&vite.includes("const velvetRelease")],
 ["perception engine typed",contractSource.includes("perceptionRealismEngine")&&contractSource.includes("privateNarrationCount")],
 ["observation is not interpretation",edge.includes("OBSERVATION ≠ INTERPRETATION")],
 ["POV privacy lock 2",edge.includes("POV PRIVACY LOCK 2.0")],
 ["epistemic states stay distinct",edge.includes("known = usable fact")&&edge.includes("suspected = private hypothesis")&&edge.includes("rumor = heard claim")&&edge.includes("forgotten = unavailable")],
 ["secret firewall prompt",edge.includes("SECRET FIREWALL")&&edge.includes("model-wide context act as telepathy")],
 ["hearing and line of sight prompt",edge.includes("HEARING + LINE OF SIGHT")],
 ["digital medium limits",edge.includes("DIGITAL MEDIUM")],
 ["misunderstanding allowed",edge.includes("MISUNDERSTANDING IS ALLOWED")],
 ["response weight matching",edge.includes("RESPONSE WEIGHT MATCHING")&&edge.includes("hasResponseWeightMismatch")],
 ["reality judge",edge.includes("REALITY JUDGE")&&edge.includes("see, hear, know, remember")],
 ["secret rows filtered before model contract",contractSource.includes("knowledgeVisibleToLead")&&contractSource.includes("blockedSecretCount")],
 ["rumor flow respects lead visibility",contractSource.includes("filter((k)=>knowledgeVisibleToLead(k, leadName))")],
 ["ambiguous nonverbal detector",edge.includes("hasAmbiguousNonverbalMindread")&&edge.includes("ambiguous_nonverbal_mindread")],
 ["private causal detector",edge.includes("hasPrivateCausalInference")&&edge.includes("private_causal_inference")],
 ["secret leak detector",edge.includes("hasSecretKnowledgeLeak")&&edge.includes("secret_knowledge_leak")],
 ["rumor certainty detector",edge.includes("hasEpistemicStatusCollapse")&&edge.includes("epistemic_status_collapse")],
 ["knowledge ledger reaches validator",edge.includes("knowledgeLedger: loaded.knowledgeLedger")&&edge.includes("knowledgeLedger,")],
 ["quality schema covers perception",edge.includes("perception_ok:{type:\"boolean\"}")&&edge.includes("secret_boundary_ok:{type:\"boolean\"}")],
 ["stability lab includes v3320",pkg.scripts["stability:lab"].includes("verify:v3320")],
];

const fixtureContract=compileStoryContract({
 character:{name:"Rowan",personality:"reserved friend",relationship:"friends"},
 userName:"Anto",
 latestUserMessage:"*I smile because I'm nervous* Okay.",
 turnIntent:{medium:"in_person"},
 sceneState:{location:"library",present:["Anto","Rowan"],communication_medium:"in_person"},
 knowledgeLedger:[
   {character_name:"Rowan",subject:"party",knowledge:"Chloe may have left early",status:"rumor",secret:false},
   {character_name:"Jules",subject:"sealed envelope",knowledge:"Jules hid the scholarship letter",status:"known",secret:true},
 ],
 recentMessages:[],memories:[],persistentCast:[],storyBible:[],castConnections:[],calendarEvents:[],canonCorrections:[],storyArcs:[],storyConsequences:[],chemistryProfiles:[],storyPlans:[],storyConflicts:[],storyMilestones:[],intelligenceState:{},developmentState:{},relationshipState:{},writingPreferences:{}
});
const compactPrompt=storyContractPrompt(fixtureContract);
checks.push(["other-character secret never reaches compact model contract",!compactPrompt.includes("scholarship letter")&&!compactPrompt.includes("sealed envelope")]);
checks.push(["lead rumor remains explicitly uncertain",compactPrompt.includes("rumor")&&compactPrompt.includes("Chloe may have left early")]);
checks.push(["private narration counted without exposing its text",fixtureContract.perceptionRealismEngine.privateNarrationCount===1&&!compactPrompt.includes("because I'm nervous")]);
checks.push(["lead presence and medium are explicit",fixtureContract.perceptionRealismEngine.leadPresent===true&&fixtureContract.perceptionRealismEngine.communicationMedium==="in_person"]);

let pass=0;
for(const [label,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(ok)pass++;}
console.log(`\n${pass}/${checks.length} Perception & Knowledge Realism checks passed.`);
if(pass!==checks.length)process.exit(1);
