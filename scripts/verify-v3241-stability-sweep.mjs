import fs from "node:fs";
import crypto from "node:crypto";
import { analyzeRepetition, characterCanKnowSecret, detectCanonConflicts, detectPOVViolations, sanitizeWorldState } from "../src/utils/stabilitySweep.js";

const read=(p)=>fs.readFileSync(p,"utf8");
const hash=(p)=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const vite=read("vite.config.js");
const vercel=read("vercel.json");
const deploy=read("DEPLOY-PWA-STABLE.sh");
const chat=read("src/pages/Chat.jsx");
const chats=read("src/context/ChatsContext.jsx");
const living=read("src/utils/livingWorldSafe.js");
const sweep=read("src/utils/stabilitySweep.js");
const drawer=read("src/components/LivingWorldDrawer.jsx");
const css=read("src/styles/velvet-v3241-stability.css");
const edge=read("supabase/functions/character-chat/index.ts");
const recovery=read("src/utils/runtimeRecovery.js");
const boundary=read("src/components/VelvetErrorBoundary.jsx");

const state=sanitizeWorldState({
  scene:{outfit:"x".repeat(500)},
  world:{objects:[{status:"active"},{name:"phone",status:"active"},...Array.from({length:40},(_,i)=>({name:`obj${i}`,status:i<8?"done":"active"}))]},
  relationship:{trust:900},behavior:{maxReplyWords:999}
});
const rep=analyzeRepetition([
  {sender:"character",content:"He leaned closer, watching you."},
  {sender:"character",content:"He leaned closer, watching you again."},
]);
const canon=detectCanonConflicts([{text:"Alex has never met Jules"}],[{text:"Alex met Jules yesterday"}]);

const atLeast3241 = /^3\.(?:2[4-9]|[3-9]\d)\./.test(pkg.version) || /^([4-9]|\d{2,})\./.test(pkg.version);

const checks=[
  ["1 Update System definitivo", atLeast3241&&pub.version===pkg.version&&Boolean(pub.release)&&Boolean(vite)&&deploy.includes("npm run stability:lab")&&deploy.includes("read_version")&&deploy.includes("velvet-version.json")&&deploy.includes("velvet-stories-ten.vercel.app")&&deploy.includes("rollback_alias")&&deploy.includes("finish_ok")&&deploy.includes("finish_fail")],
  ["2 Menú de tres puntos ordenado", chat.includes('chat__menu-section-label">STORY')&&chat.includes('WORLD & CONTINUITY')&&chat.includes('chat__menu-section-label">TOOLS')],
  ["3 Living World UI cleanup", drawer.includes("Stability Sweep 3.24.1")&&css.includes("living-world__stability-grid")],
  ["4 Mobile scroll audit", css.includes("touch-action: pan-y")&&css.includes("-webkit-overflow-scrolling: touch")&&css.includes("overscroll-behavior-y: contain")&&css.includes("font-size: 16px")],
  ["5 Chat performance protegido", chats.includes("const MESSAGE_PAGE_SIZE = 40")&&chat.includes("loadEarlierMessages")&&chat.includes("overflow-anchor")===false&&css.includes("overflow-anchor")],
  ["6 Prompt diet", living.includes("slice(0, 2800)")&&living.includes("compactForPrompt")],
  ["7 Metadata compaction 2.0", state.world.objects.length<=30&&state.world.objects.every((x)=>x.name)&&state.scene.outfit.length<=220&&state.relationship.trust===100&&state.behavior.maxReplyWords===400],
  ["8 Envelope Guard 2.0 intacto", edge.includes('extractPartialJsonStringField(clean, "reply")')&&edge.includes("parsed?.hidden_metadata")&&edge.includes("incomplete structured response before the visible reply could be recovered")&&chats.includes("extractVisibleReplyFromStoredEnvelope")],
  ["9 Regenerate protegido contra doble tap", chat.includes("variantGenerationLockRef.current")&&chat.includes("actionLoading || busy || variantGenerationLockRef.current")],
  ["10 STOP definitivo", chat.includes("VELVET_STOP_V7_SINGLE_TAP")&&!chat.includes("setTimeout(() => stopGeneration")&&chats.includes('action: "cancel"')&&chats.includes("activeRequest.controller.abort()")],
  ["11 POV Lock test suite", detectPOVViolations("You felt nervous and you smiled.").length>=2&&drawer.includes("POV Lock")],
  ["12 Anti-repetition real", rep.repeatedOpenings.length>=1&&living.includes("buildRepetitionAvoidanceHint(recentMessages)")&&chat.includes("recentMessages: visibleMessages")],
  ["13 Group Chat stress safeguards", chat.includes("conversation?.groupMode")&&chats.includes("groupCharacterIds")&&edge.includes("group")],
  ["14 Memory conflict resolver", canon.length>=1&&living.includes("Canon locks outrank rumors, guesses, auto-memory, and private notes")],
  ["15 Canon Lock reforzado", drawer.includes("Canon Lock")&&living.includes("Canon locks that cannot be contradicted")],
  ["16 Secrets permission test", characterCanKnowSecret({knownBy:"Alex, Antonia"},"Alex")&&!characterCanKnowSecret({knownBy:"Theo"},"Alex")&&living.includes("secretsForCharacter")&&drawer.includes("secret(s) withheld")],
  ["17 Objects / outfit cleanup", sweep.includes("next.world.objects = next.world.objects.filter")&&sweep.includes("next.scene.outfit")&&state.scene.outfit.length<=220],
  ["18 Crash recovery preservado", recovery.includes("repairVelvetRuntime")&&boundary.includes("VelvetErrorBoundary")&&chat.includes("velvet_draft_")],
  ["19 Health panel útil", drawer.includes("Generation health & rollback")&&drawer.includes("Stability Sweep 3.24.1")&&drawer.includes("serverVersion")],
  ["20 UI consistency sweep", css.includes("chat__menu-section-label")&&css.includes("prefers-reduced-motion")&&css.includes("scrollbar-gutter: stable")],
];

// Hard safety invariant: preserve the stable chat context and core Edge contracts while allowing newer engine releases.
const protectedEdge=read("supabase/functions/character-chat/index.ts");
const protectedCore = hash("src/context/ChatsContext.jsx")==="19ccc44748b78df8be41fedc733a348225183d63f153bbad7b84bf72b2f32cbd"
  && protectedEdge.includes("createThrottledCancellationProbe")
  && protectedEdge.includes("saveCharacterReply")
  && protectedEdge.includes("parseModelEnvelope");
if(!protectedCore){ console.log("FAIL protected chat core contracts"); process.exit(1); }

let pass=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;}
console.log(`\n${pass}/${checks.length} Stability Sweep checks passed.`);
if(pass!==checks.length)process.exit(1);
