import fs from "node:fs";
import { groundedRealityIssues, sanitizeGroundedRealityReply } from "../supabase/functions/character-chat/engine/grounded-reality-lock.ts";
import { compileStoryContract } from "../supabase/functions/character-chat/engine/story-contract.ts";

const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const fixture=JSON.parse(read("scripts/fixtures/v3351-grounded-reality-regression.json"));
let pass=0, total=0;
const check=(name,ok)=>{ total++; console.log(`${ok?"PASS":"FAIL"} ${name}`); if(ok) pass++; };

check("version 3.35.x descendant", pkg.version.startsWith("3.35.") && pub.version.startsWith("3.35."));
check("release metadata", /Grounded Reality Hard Lock/i.test(pub.release));
check("deterministic lock imported", edge.includes('groundedRealityIssues') && edge.includes('sanitizeGroundedRealityReply'));
check("raw prose quarantined", edge.includes("const guardedDraft = true"));
check("hard lock issue classes", ["declared_state_disbelief","semantic_scope_overreach","inference_distance_exceeded","specificity_escalation","invisible_history_claim","unsupported_concrete_canon_invention"].every((x)=>edge.includes(`\"${x}\"`)));
check("narrative naturalism repair", edge.includes('"narrative_naturalism_overwrite"'));
check("repair directions exist", edge.includes("Observation is not diagnosis") && edge.includes("Keep the user's complaint scoped"));
check("stability lab retains v3351", pkg.scripts["stability:lab"].includes("npm run verify:v3351"));

for (const test of fixture) {
  const issues=groundedRealityIssues({
    reply:test.reply,
    latestUserMessage:test.latestUserMessage,
    recentUserMessages:test.recentUserMessages || [],
    recentCharacterReplies:test.recentCharacterReplies || [],
    character:{ name:"Rowan", role:"college student", background:"", notes:"", scenario:"", world:"" },
  });
  for (const expected of test.expect || []) check(`${test.name} -> ${expected}`, issues.includes(expected));
  for (const absent of test.expectAbsent || []) check(`${test.name} !-> ${absent}`, !issues.includes(absent));
  if ((test.expect || []).some((x)=>["declared_state_disbelief","semantic_scope_overreach","inference_distance_exceeded","specificity_escalation","invisible_history_claim"].includes(x))) {
    const clean=sanitizeGroundedRealityReply(test.reply, issues);
    const after=groundedRealityIssues({reply:clean,latestUserMessage:test.latestUserMessage,recentUserMessages:test.recentUserMessages||[],recentCharacterReplies:test.recentCharacterReplies||[],character:{name:"Rowan",role:"college student"}});
    check(`${test.name} sanitizer removes grounded hard failure`, !after.some((x)=>["declared_state_disbelief","semantic_scope_overreach","inference_distance_exceeded","specificity_escalation","invisible_history_claim"].includes(x)));
  }
}

const departureContract=compileStoryContract({
  character:{name:"Rowan",role:"college student"},
  userName:"Antonia",
  latestUserMessage:"*I take my bag, stand up and leave*",
  turnIntent:{kind:"user_exit",medium:"physical"},
  sceneState:{present:["Antonia","Rowan"],location:"cafe"},
  recentMessages:[], memories:[], persistentCast:[], castState:{}, storyBible:[], castConnections:[], calendarEvents:[], canonCorrections:[], storyArcs:[], knowledgeLedger:[], storyConsequences:[], chemistryProfiles:[], storyPlans:[], storyConflicts:[], storyMilestones:[], intelligenceState:{}, developmentState:{}, relationshipState:{}, storyChapters:[], activeChapter:{}, writingPreferences:{}
});
check("user leave fixture remains leaving", departureContract.userAuthored.userPresence==="leaving");
check("presence hard guards remain", edge.includes('"user_exit_not_applied"') && edge.includes('"absent_user_reappeared_without_entry"'));

console.log(`\n${pass}/${total} Grounded Reality Hard Lock checks passed.`);
if(pass!==total) process.exit(1);
