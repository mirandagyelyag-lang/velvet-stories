import fs from "node:fs";
import crypto from "node:crypto";
const read=(p)=>fs.readFileSync(p,"utf8");
const hash=(p)=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const chat=read("src/pages/Chat.jsx");
const drawer=read("src/components/LivingWorldDrawer.jsx");
const util=read("src/utils/livingWorldSafe.js");
const epub=read("src/utils/epubExport.js");
const deploy=read("DEPLOY-PWA-STABLE.sh");
const pkg=JSON.parse(read("package.json"));
const version=JSON.parse(read("public/velvet-version.json"));
const checks=[
  ["Release metadata 3.24.0",pkg.version==="3.24.0"&&version.version==="3.24.0"&&version.release==="Living World"],
  ["Living World drawer integrated",chat.includes("LivingWorldDrawer")&&chat.includes("Living World")],
  ["Stable backend byte hash",hash("supabase/functions/character-chat/index.ts")==="e5b6929e5894f3ede61619bcf21aae9b889369bb108340e20e641c5f75e00266"],
  ["Stable SSE/context byte hash",hash("src/context/ChatsContext.jsx")==="19ccc44748b78df8be41fedc733a348225183d63f153bbad7b84bf72b2f32cbd"],
  ["Story Worlds bridge",drawer.includes("World Studio")&&drawer.includes("onOpenWorldStudio")],
  ["Character Routine Engine",drawer.includes("Character Routine Engine")&&util.includes("routine/schedule")],
  ["Dynamic locations",drawer.includes("Persistent Places Gallery")&&util.includes("world.objects")],
  ["Relationship Web bridge",drawer.includes("Relationship dimensions")&&drawer.includes("Group story active")],
  ["Group chat mode preserved",drawer.includes("conversation?.groupMode")],
  ["Calls / voice / text scene mode",drawer.includes('"call"')&&drawer.includes('"video"')&&drawer.includes('"text"')],
  ["Character Inbox",drawer.includes("Character Inbox")&&drawer.includes('kind="inbox"')],
  ["Daily life simulation anchor",drawer.includes("Daily-life continuity")&&util.includes("elapsedLabel")],
  ["Consequences calendar",drawer.includes("Promises & Consequences Calendar")],
  ["Promises/commitments",util.includes("Open commitments/promises")],
  ["Secrets system",drawer.includes("Secrets & knowledge boundaries")&&util.includes("Knowledge boundaries/secrets")],
  ["Rumor engine",drawer.includes("Rumor Engine")&&util.includes("Rumors are unverified")],
  ["Trust dimension",drawer.includes('label="Trust"')],
  ["Comfort dimension",drawer.includes('label="Comfort"')],
  ["Tension/resentment/curiosity",drawer.includes('label="Tension"')&&drawer.includes('label="Resentment"')&&drawer.includes('label="Curiosity"')],
  ["Character boundaries",drawer.includes("Character boundaries")&&util.includes("Character boundaries:")],
  ["Specific attraction memory",drawer.includes("Specific attraction")&&util.includes("Specific attraction cues")],
  ["Triggers & soothers",drawer.includes("Triggers")&&drawer.includes("Soothers")&&util.includes("Known soothers")],
  ["Narrative echoes",drawer.includes("Narrative echoes")&&util.includes("rare, specific callbacks")],
  ["Scene goals",drawer.includes("Scene goal")&&util.includes("Current scene goal")],
  ["Boredom detector",drawer.includes("Boredom detector")&&util.includes("If the scene has stalled")],
  ["Repetition radar",drawer.includes("Repetition Radar")&&util.includes("repeatedOpenings")],
  ["Consistency score",drawer.includes("Recent voice score")&&util.includes("consistencyScore")],
  ["POV Lock",drawer.includes("POV Lock")&&util.includes("POV LOCK")],
  ["Dialogue ratio",drawer.includes("Dialogue ratio")&&util.includes("Dialogue target")],
  ["Scene intensity",drawer.includes('label="Intensity"')&&util.includes("Intensity target")],
  ["Character autonomy",drawer.includes("Character autonomy")&&util.includes("Character autonomy")],
  ["Romance speed",drawer.includes("Romance pace")&&util.includes("Romance pacing")],
  ["Anti-Cliche 3.0",drawer.includes("Anti-Cliché 3.0")&&util.includes("Anti-cliche")],
  ["Too Much detector",drawer.includes("Too Much detector")&&util.includes("Too-much guard")],
  ["Silent actions",drawer.includes("Silent actions")&&util.includes("Silent actions are allowed")],
  ["Interruptions engine",drawer.includes("Grounded interruptions")&&util.includes("Natural interruptions")],
  ["Real scene endings",drawer.includes("Real scene endings")&&util.includes("end conversations, leave, hang up")],
  ["Photo memories",drawer.includes("Photo memories")&&drawer.includes("sceneImages")],
  ["Outfit memory",drawer.includes("Outfit continuity")&&util.includes("Current outfit continuity")],
  ["Object persistence",drawer.includes("Object Persistence")&&util.includes("Persistent objects")],
  ["Places gallery",drawer.includes("Persistent Places Gallery")],
  ["Story archive bridge",drawer.includes("Story archive & timeline")],
  ["EPUB exporter",drawer.includes("Export EPUB")&&epub.includes("application/epub+zip")&&epub.includes("META-INF/container.xml")],
  ["Private notes",drawer.includes("Private Notes")&&util.includes("Private director notes")],
  ["Director channel integration",chat.includes("buildLivingWorldDirectorHint")&&chat.includes("livingWorldHint")],
  ["Character Test Room",drawer.includes("Character Test Room")&&util.includes("CHARACTER TEST ROOM")],
  ["Branching timeline bridge",drawer.includes("Branches & snapshots")],
  ["Undo/rewind preserved",drawer.includes("Undo / rewind / branch compare")&&chat.includes("rewindToMessage")],
  ["Canon Lock",drawer.includes("Canon Lock")&&util.includes("Canon locks that cannot be contradicted")],
  ["What-if mode",drawer.includes("What-if Mode")&&util.includes("WHAT-IF MODE")],
  ["Performance mode",drawer.includes("Performance Mode")&&read("src/styles/velvet-v3240-living-world.css").includes('data-velvet-performance="1"')],
  ["Offline reading",drawer.includes("Offline reading")&&drawer.includes("Offline send queue")],
  ["Local drafts preserved",drawer.includes("Local drafts")&&chat.includes("velvet_draft_")],
  ["Crash recovery preserved",drawer.includes("Crash recovery")&&fs.existsSync("src/components/VelvetErrorBoundary.jsx")],
  ["Generation health",drawer.includes("Generation health & rollback")&&drawer.includes("serverVersion")],
  ["One-tap updater repair",drawer.includes("repairUpdate")&&drawer.includes("Repair updater")],
  ["Automatic deploy rollback",deploy.includes("AUTO ROLLBACK")&&deploy.includes("LAST_GOOD_FILE")&&deploy.includes("rollback_if_possible")],
  ["Release history",drawer.includes("Release history")&&drawer.includes("3.24.0")],
  ["No new backend deployment required",!read("README.md").includes("supabase functions deploy character-chat --project-ref")],
];
let pass=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;}
console.log(`\n${pass}/${checks.length} Living World safeguards/features ready.`);
if(pass!==checks.length)process.exit(1);
