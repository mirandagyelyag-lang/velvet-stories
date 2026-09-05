import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const version=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const chat=read("src/pages/Chat.jsx");
const sheet=read("src/components/CanonDoctorSheet.jsx");
const oldVerifier=read("scripts/verify-v3340-canon-doctor.mjs");
const checks=[
 ["version 3.34.1",pkg.version==="3.34.1"&&version.version==="3.34.1"],
 ["repair release metadata",version.release.includes("Canon Doctor Repair")],
 ["UUID story revision rotation",edge.includes("story_revision: crypto.randomUUID()")],
 ["no numeric UUID coercion",!edge.includes("Number(conversation.story_revision)")],
 ["no semantic string written to smallint engine version",!edge.includes('story_engine_version: "3.34.0"')],
 ["database update returns actual row",edge.includes("updatedConversation")&&edge.includes('.select("id, story_revision, story_engine_version')&&edge.includes(".single()")],
 ["repair payload returns updated database row",edge.includes("updated: updatedConversation || patch")],
 ["repair payload exposes counts",edge.includes("memoriesSuperseded")&&edge.includes("knowledgeRemoved")&&edge.includes("threadsRebuilt")],
 ["UI stores actual repair result",chat.includes("setCanonDoctorApplied({")&&chat.includes("payload?.repaired")&&chat.includes("storyRevision")],
 ["success UI explains real cleanup",sheet.includes("Persistent state was normalized")&&sheet.includes("contaminated state phrases")],
 ["repair button locks after success",sheet.includes('applied ? "Repaired ✓"')&&sheet.includes("Boolean(applied)")],
 ["v3340 regression corrected",oldVerifier.includes("story_revision: crypto.randomUUID()")],
 ["stability lab includes hotfix",pkg.scripts["stability:lab"].includes("verify:v3341")],
];
let pass=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`); if(ok)pass++;}
console.log(`\n${pass}/${checks.length} Canon Doctor Repair checks passed.`);
if(pass!==checks.length)process.exit(1);
