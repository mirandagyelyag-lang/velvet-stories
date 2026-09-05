import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const ctx=read("src/context/ChatsContext.jsx");
const chat=read("src/pages/Chat.jsx");
const sheet=read("src/components/CanonDoctorSheet.jsx");
const css=read("src/styles/velvet-v3340-canon-doctor.css");
const version=JSON.parse(read("public/velvet-version.json"));
const checks=[
 ["version >= 3.34.0",/^3\.(?:3[4-9]|[4-9]\d)\./.test(pkg.version)||Number(pkg.version.split('.')[1])>=34],
 ["release metadata",version.release.includes("Canon Doctor")],
 ["canon_doctor edge action",edge.includes('action === "canon_doctor"')],
 ["server preview/apply",edge.includes("handleCanonDoctor")&&edge.includes("suppliedPlan")&&edge.includes("applied: true")],
 ["private narration audit",edge.includes("USER PERCEIVABLE TO CHARACTERS")&&edge.includes("sanitizeUserTurnForPerception")],
 ["deterministic private-leak regression guard",edge.includes("canonDoctorPrivateLeakFindings")&&edge.includes("echoes private asterisk narration")],
 ["explicit user self-report law",edge.includes("explicit self-report")],
 ["persistent boundary law",edge.includes("persist until the user clearly relaxes")],
 ["absence/reentry law",edge.includes("remain absent until the user explicitly returns")],
 ["conservative unsupported-canon rule",edge.includes("Do not mark every new class")],
 ["manual/canon memory protection",edge.includes("!m.is_pinned && !m.is_canon")&&edge.includes('!== "manual"')],
 ["memory supersede not delete",edge.includes("superseded_at")],
 ["generated knowledge cleanup",edge.includes('story_knowledge_entries')&&edge.includes("knowledgeIdsToRemove")],
 ["persistent-state scrub",edge.includes("scrubPersistentState")&&edge.includes("prunePhrases")],
 ["scene cleanup",edge.includes("cleanScene")&&edge.includes("scene_state: nextScene")],
 ["story recap cleanup",edge.includes("cleanStoryRecap")&&edge.includes("story_recap")],
 ["unresolved thread cleanup",edge.includes("cleanUnresolvedThreads")&&edge.includes("unresolved_threads")],
 ["stale generation invalidation",edge.includes("story_revision: crypto.randomUUID()")&&!edge.includes('story_engine_version: "3.34.0"')],
 ["ChatsContext API",ctx.includes("runCanonDoctor")&&ctx.includes('action: "canon_doctor"')],
 ["chat menu entry",chat.includes("> Canon Doctor</button>")],
 ["preview sheet",sheet.includes("Repair Story State")&&sheet.includes("Messages stay untouched")],
 ["safety snapshot before repair",chat.includes('createStorySnapshot(character.id, "Before Canon Doctor")')],
 ["safety snapshot includes knowledge ledger",ctx.includes("knowledge: knowledgeResult.error ? []")&&ctx.includes("Could not restore story knowledge")],
 ["visible messages untouched wording",sheet.includes("visible messages were not changed")||sheet.includes("Messages stay untouched")],
 ["mobile sheet",css.includes("@media(max-width:620px)")&&css.includes("align-items:end")],
 ["stability lab includes v3340",pkg.scripts["stability:lab"].includes("verify:v3340")],
 ["no schema migration required",!fs.existsSync("supabase/migrations/20260905_v3340_canon_doctor.sql")],
];
let pass=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok)pass++;}
console.log(`\n${pass}/${checks.length} Canon Doctor checks passed.`); if(pass!==checks.length)process.exit(1);
