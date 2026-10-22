import fs from "node:fs";
import { compileStoryContract } from "../supabase/functions/character-chat/engine/story-contract.ts";
const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8"),migration=read("supabase/migrations/202608280003_velvet_v340_relationship_dynamics.sql"),edge=read("supabase/functions/character-chat/index.ts"),studio=read("src/components/StoryWorldDrawer.jsx"),contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
const contract=compileStoryContract({character:{name:"Chase",initiative:80,drama:70,romance_intensity:70},userName:"Anto",latestUserMessage:"I look at him.",turnIntent:{},sceneState:{location:"party",present:["Chase","Jules"],activity:"dancing"},chemistryProfiles:[{character_name:"Chase",signature:"competitive teasing"}],storyPlans:[{title:"Race",status:"accepted"}],storyConflicts:[{title:"Broken promise",status:"active"}],storyMilestones:[{milestone_type:"first_kiss",title:"First kiss"}],castConnections:[{from_name:"Chase",to_name:"Jules",relationship:"Jules openly flirts with Chase"}]});
const checks=[
 ["Chemistry Engine is relationship-specific",migration.includes("story_chemistry_profiles")&&contract.relationshipEngines.chemistry.profile.signature==="competitive teasing"],
 ["Jealousy requires social evidence",contract.relationshipEngines.jealousy.stage!=="none"&&contractSource.includes("There is no grounded jealousy trigger")],
 ["Plans persist and cannot auto-accept",migration.includes("story_plans")&&contractSource.includes("A proposal is not accepted until the user accepts it")&&edge.includes("plan persistence failed")],
 ["Conflict and reconciliation retain residue",migration.includes("story_conflicts")&&contractSource.includes("Do not reset to normal")&&edge.includes('status:"repairing"')],
 ["Milestones persist and prevent repeated firsts",migration.includes("story_milestones")&&contractSource.includes("never replay them as firsts")&&edge.includes("milestone persistence failed")],
 ["Scene Choreographer tracks physical reality without forcing prose",contract.relationshipEngines.choreography.activity==="dancing"&&contractSource.includes("Track physical reality silently")&&contractSource.includes("Dialogue may happen with little or no movement")],
 ["World Studio exposes all four durable dynamics",["chemistry","plan","conflict","milestone"].every((name)=>studio.includes(`["${name}"`))],
 ["Chemistry tracks trust and tension",["chemistry_score","trust_score","tension_score"].every((name)=>migration.includes(name)&&studio.includes(name))],
 ["Conflict has staged repair",migration.includes("'brewing','active','cooling','repairing','resolved'")],
 ["Milestones come from on-page evidence",contractSource.includes("record only events that actually occur on-page")],
];

// Behavioral contract checks: these inspect generated instructions and durable inputs,
// not actual model replies.
const make = (overrides = {}) => compileStoryContract({
  character: { name: "Chase", initiative: 80, romance_intensity: 70 },
  userName: "Anto", latestUserMessage: "Okay.",
  turnIntent: { medium: "in_person" },
  sceneState: { location: "fraternity living room", time_label: "9 PM", present: ["Chase", "Anto"], activity: "talking" },
  ...overrides,
});
const noEvidence = make();
checks.push([
  "No witnessed social evidence means no fabricated jealousy",
  noEvidence.relationshipEngines.jealousy.evidence.length === 0 &&
  noEvidence.relationshipEngines.jealousy.instruction.includes("Do not invent an admirer"),
]);
checks.push([
  "Third-party attention does not mandate jealousy or user possessiveness",
  contractSource.includes("never make every interaction romantic") &&
  contractSource.includes("React only to the listed witnessed action") &&
  contractSource.includes("never instantly to ownership"),
]);
const proposed = make({ storyPlans: [{ title: "Rooftop later", status: "proposed" }] });
checks.push([
  "Proposed plans remain proposals until user acceptance",
  proposed.relationshipEngines.plans.instruction.includes("not accepted until the user accepts it") &&
  !proposed.relationshipEngines.plans.active.some((plan) => plan.title === "Rooftop later" && plan.status === "accepted"),
]);
const conflict = make({ storyConflicts: [{ title: "Broken promise", status: "active" }] });
checks.push([
  "Unresolved conflict retains residue beyond one apology",
  conflict.relationshipEngines.conflictAndRepair.instruction.includes("Do not reset to normal") &&
  conflict.relationshipEngines.conflictAndRepair.instruction.includes("later behavior"),
]);
const milestones = make({ storyMilestones: [{ milestone_type: "first_kiss", title: "First kiss" }] });
checks.push([
  "Recorded first kiss remains a canon milestone",
  milestones.relationshipEngines.milestones.instruction.includes("never replay them as firsts") &&
  milestones.relationshipEngines.milestones.achieved.length > 0,
]);
const scene = make();
checks.push([
  "Choreography retains location, participants and activity",
  scene.relationshipEngines.choreography.location === "fraternity living room" &&
  scene.relationshipEngines.choreography.activity === "talking" &&
  scene.relationshipEngines.choreography.present.includes("Chase"),
]);

for(const [name,pass] of checks)console.log(`${pass?"PASS":"FAIL"} ${name}`);const failed=checks.filter(([,pass])=>!pass);console.log(`\n${checks.length-failed.length}/${checks.length} Velvet v3.4 Relationship Dynamics checks passed.`);if(failed.length)process.exit(1);
