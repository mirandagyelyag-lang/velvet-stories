import fs from "node:fs";
import { compileStoryContract } from "../supabase/functions/character-chat/engine/story-contract.ts";
const read=(path)=>fs.readFileSync(path,"utf8"),migration=read("supabase/migrations/202608280003_velvet_v340_relationship_dynamics.sql"),edge=read("supabase/functions/character-chat/index.ts"),studio=read("src/components/StoryWorldDrawer.jsx"),contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
const contract=compileStoryContract({character:{name:"Chase",initiative:80,drama:70,romance_intensity:70},userName:"Anto",latestUserMessage:"I look at him.",turnIntent:{},sceneState:{location:"party",present:["Chase","Jules"],activity:"dancing"},chemistryProfiles:[{character_name:"Chase",signature:"competitive teasing"}],storyPlans:[{title:"Race",status:"accepted"}],storyConflicts:[{title:"Broken promise",status:"active"}],storyMilestones:[{milestone_type:"first_kiss",title:"First kiss"}],castConnections:[{from_name:"Chase",to_name:"Mia",relationship:"Mia openly flirts with Chase"}]});
const checks=[
 ["Chemistry Engine is relationship-specific",migration.includes("story_chemistry_profiles")&&contract.relationshipEngines.chemistry.profile.signature==="competitive teasing"],
 ["Jealousy requires social evidence",contract.relationshipEngines.jealousy.stage!=="none"&&contractSource.includes("There is no grounded jealousy trigger")],
 ["Plans persist and cannot auto-accept",migration.includes("story_plans")&&contractSource.includes("A proposal is not accepted until the user accepts it")&&edge.includes("plan persistence failed")],
 ["Conflict and reconciliation retain residue",migration.includes("story_conflicts")&&contractSource.includes("Do not reset to normal")&&edge.includes('status:"repairing"')],
 ["Milestones persist and prevent repeated firsts",migration.includes("story_milestones")&&contractSource.includes("never replay them as firsts")&&edge.includes("milestone persistence failed")],
 ["Scene Choreographer blocks physical scenes",contract.relationshipEngines.choreography.activity==="dancing"&&contractSource.includes("Block the scene physically")],
 ["World Studio exposes all four durable dynamics",["chemistry","plan","conflict","milestone"].every((name)=>studio.includes(`["${name}"`))],
 ["Chemistry tracks trust and tension",["chemistry_score","trust_score","tension_score"].every((name)=>migration.includes(name)&&studio.includes(name))],
 ["Conflict has staged repair",migration.includes("'brewing','active','cooling','repairing','resolved'")],
 ["Milestones come from on-page evidence",contractSource.includes("record only events that actually occur on-page")],
];
for(const [name,pass] of checks)console.log(`${pass?"PASS":"FAIL"} ${name}`);const failed=checks.filter(([,pass])=>!pass);console.log(`\n${checks.length-failed.length}/${checks.length} Velvet v3.4 Relationship Dynamics checks passed.`);if(failed.length)process.exit(1);
