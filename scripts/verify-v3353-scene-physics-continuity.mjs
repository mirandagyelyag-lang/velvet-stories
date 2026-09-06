import fs from "node:fs";
import { deriveScenePhysicsState, scenePhysicsIssues, sanitizeScenePhysicsReply } from "../supabase/functions/character-chat/engine/scene-physics-lock.ts";
import { compileStoryContract } from "../supabase/functions/character-chat/engine/story-contract.ts";

const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
const fixture=JSON.parse(read("scripts/fixtures/v3353-scene-physics-regression.json"));
let pass=0,total=0;
const check=(name,ok)=>{total++; console.log(`${ok?"PASS":"FAIL"} ${name}`); if(ok) pass++;};

check("version 3.35.3+ descendant",/^3\.35\.(?:3|[4-9]|[1-9]\d+)$/.test(pkg.version)&&/^3\.35\.(?:3|[4-9]|[1-9]\d+)$/.test(pub.version));
check("release metadata",/Scene Physics \+ Continuity Lock/i.test(pub.release));
check("deterministic scene physics imported",edge.includes("scenePhysicsIssues")&&edge.includes("deriveScenePhysicsState")&&edge.includes("sanitizeScenePhysicsReply"));
check("scene physics contract exists",contractSource.includes("scenePhysicsEngine")&&contractSource.includes("interactionLimits")&&contractSource.includes("recentActionFingerprints"));
check("hard physics issue classes",["body_state_redundant_transition","spatial_anchor_teleport","object_possession_break","object_state_rewind","line_of_sight_violation","interaction_geometry_violation","precise_time_invention","unsupported_elapsed_time_claim","door_state_continuity_break"].every((x)=>edge.includes(`\"${x}\"`)));
check("action repetition watch",edge.includes('"repeated_action_fingerprint"'));
check("prompt makes doing nothing valid",edge.includes("doing nothing is valid")||contractSource.includes("Doing nothing is valid"));
check("raw model prose remains quarantined",edge.includes("const guardedDraft = true"));
check("stability lab retains v3353",pkg.scripts["stability:lab"].includes("npm run verify:v3353"));

for(const test of fixture){
  const issues=scenePhysicsIssues({reply:test.reply,latestUserMessage:test.latestUserMessage||"",recentCharacterReplies:test.recentCharacterReplies||[],previousScene:test.previousScene||{},characterName:"Rowan",userName:"Antonia"});
  for(const expected of test.expect||[]) check(`${test.name} -> ${expected}`,issues.includes(expected));
  for(const forbidden of test.forbid||[]) check(`${test.name} !-> ${forbidden}`,!issues.includes(forbidden));
  if((test.expect||[]).length){
    const cleaned=sanitizeScenePhysicsReply(test.reply,issues);
    const after=scenePhysicsIssues({reply:cleaned,latestUserMessage:test.latestUserMessage||"",recentCharacterReplies:test.recentCharacterReplies||[],previousScene:test.previousScene||{},characterName:"Rowan",userName:"Antonia"});
    check(`${test.name} sanitizer lowers physics violation`,after.length<issues.length || cleaned!==test.reply);
  }
}

const derived=deriveScenePhysicsState({
  previousScene:{body_states:[{name:"Rowan",state:"seated",anchor:"table"}],object_states:[]},
  latestUserMessage:"*I take my bag, stand up, leave the room and close the door*",
  reply:"I stayed at the table.",
  userName:"Antonia",characterName:"Rowan"
});
check("derived user body state is standing",derived.body_states.some((x)=>x.name==="Antonia"&&x.state==="standing"));
check("derived user bag remains with user",derived.object_states.some((x)=>/Antonia bag/i.test(x.object)&&x.holder==="Antonia"));
check("derived closed door blocks sight",derived.door_state==="closed"&&derived.visibility.some((x)=>x.to==="Antonia"&&x.can_see===false));

const elapsed=deriveScenePhysicsState({previousScene:{elapsed_minutes:5},latestUserMessage:"*20 minutes later*",reply:"\"Okay.\"",userName:"Antonia",characterName:"Rowan"});
check("elapsed time accumulates deterministically",elapsed.elapsed_minutes===25);

const contract=compileStoryContract({
  character:{name:"Rowan",role:"student"},userName:"Antonia",latestUserMessage:"Okay.",turnIntent:{medium:"physical"},
  sceneState:{location:"cafe",present:["Antonia","Rowan"],body_states:[{name:"Rowan",state:"seated",anchor:"table"}],object_states:[{object:"Rowan beverage",holder:"","location":"table",state:"put down"}],spatial_relations:[{from:"Antonia",to:"Rowan",distance:"far",can_touch:false,can_whisper:false,micro_expression_visible:false}],visibility:[{from:"Rowan",to:"Antonia",can_see:true}],elapsed_minutes:12,door_state:"open",recent_action_fingerprints:["jaw_tighten"]},
  recentMessages:[],memories:[],persistentCast:[],castState:{},storyBible:[],castConnections:[],calendarEvents:[],canonCorrections:[],storyArcs:[],knowledgeLedger:[],storyConsequences:[],chemistryProfiles:[],storyPlans:[],storyConflicts:[],storyMilestones:[],intelligenceState:{},developmentState:{},relationshipState:{},storyChapters:[],activeChapter:{},writingPreferences:{}
});
check("contract carries body state",contract.scenePhysicsEngine.bodyStates.length===1);
check("contract carries object state",contract.scenePhysicsEngine.objectStates.length===1);
check("contract enforces far interaction limits",contract.scenePhysicsEngine.interactionLimits.some((x)=>/touch/i.test(x))&&contract.scenePhysicsEngine.interactionLimits.some((x)=>/whisper/i.test(x)));

console.log(`\n${pass}/${total} Scene Physics + Continuity checks passed.`);
if(pass!==total) process.exit(1);
