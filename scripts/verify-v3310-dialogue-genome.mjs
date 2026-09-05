import fs from "fs";
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const ctx=read("src/context/CharactersContext.jsx");
const studio=read("src/components/CreateCharacterModal.jsx");
const diagnostics=read("src/pages/Diagnostics.jsx");
const semverAtLeast=(value,minimum)=>{const a=String(value||"").split(".").map(Number),b=String(minimum||"").split(".").map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
const v330=read("scripts/verify-v3300-interaction-reliability.mjs");
const checks=[
 ["version >= 3.31.0",semverAtLeast(pkg.version,"3.31.0")&&semverAtLeast(pub.version,"3.31.0")],
 ["release metadata",typeof pub.release==="string"&&pub.release.trim().length>0],
 ["dialogue genome runtime exists",edge.includes("function buildDialogueGenome")],
 ["question habit is modeled",edge.includes("questionHabit")&&edge.includes("questionBudget")],
 ["anti interview engine prompt exists",edge.includes("ANTI-INTERVIEW ENGINE")],
 ["selective answering prompt exists",edge.includes("SELECTIVE ANSWERING")],
 ["anti therapist engine prompt exists",edge.includes("ANTI-THERAPIST ENGINE")],
 ["anti perfect reaction prompt exists",edge.includes("ANTI-PERFECT-REACTION")],
 ["public private voice exists",edge.includes("PUBLIC / PRIVATE VOICE")&&edge.includes("public_private_voice")],
 ["mood dependent voice exists",edge.includes("MOOD-DEPENDENT VOICE")],
 ["relationship language drift exists",edge.includes("RELATIONSHIP LANGUAGE DRIFT")],
 ["vocabulary ownership exists",edge.includes("VOCABULARY OWNERSHIP")],
 ["therapist detector exists",edge.includes("hasTherapistServiceVoice")],
 ["interview loop detector exists",edge.includes("hasInterviewQuestionLoop")],
 ["perfect empathy detector exists",edge.includes("hasPerfectEmpathyPackage")],
 ["cadence clone detector exists",edge.includes("hasCannedDialogueGenomeCadence")],
 ["dialogue drift detector exists",edge.includes("hasDialogueGenomeDrift")],
 ["dialogue failures can trigger one repair",edge.includes('"dialogue_genome_drift"')&&edge.includes('"therapist_service_voice"')],
 ["voice examples learning Edge action exists",edge.includes('action === "character_dialogue_genome"')&&edge.includes("handleCharacterDialogueGenome")],
 ["voice examples learning context exists",ctx.includes("learnCharacterDialogueGenome")],
 ["Studio learns selected examples",studio.includes("Learn from selected examples")&&studio.includes("Learning Dialogue Genome")],
 ["same scene voice lab UI exists",diagnostics.includes("Same Scene Voice Lab")],
 ["same scene voice lab scores sentence mechanics",edge.includes("SAME SCENE BLIND VOICE TEST")&&edge.includes("question habits")],
 ["quality schema carries dialogue checks",edge.includes("dialogue_genome_ok")&&edge.includes("question_discipline_ok")&&edge.includes("anti_therapist_ok")&&edge.includes("dialogue_drift_ok")],
 ["v3.30 verifier accepts later versions",v330.includes("version >= 3.30.0")],
];
let pass=0;for(const [label,ok] of checks){if(ok)pass++;console.log(`${ok?"PASS":"FAIL"} ${label}`)}
console.log(`\n${pass}/${checks.length} Dialogue Genome checks passed.`);if(pass!==checks.length)process.exit(1);
