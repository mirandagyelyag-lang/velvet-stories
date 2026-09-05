import fs from "node:fs";
import crypto from "node:crypto";
import { deriveAutomaticChapters, deriveRecap, searchConversation, buildExperienceDirectorHint, dedupeLocalWorldLists } from "../src/utils/velvetExperience.js";

const read=(p)=>fs.readFileSync(p,"utf8");
const hash=(p)=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const vite=read("vite.config.js");
const chat=read("src/pages/Chat.jsx");
const drawer=read("src/components/VelvetExperienceDrawer.jsx");
const memory=read("src/components/MemoryBookDrawer.jsx");
const util=read("src/utils/velvetExperience.js");
const css=read("src/styles/velvet-v3250-experience.css");
const deploy=read("DEPLOY-PWA-STABLE.sh");

const sample=[
  {id:"1",sender:"user",content:"We are outside the science hall."},
  {id:"2",sender:"character",content:"Alex unlocked the car and looked over."},
  {id:"3",sender:"user",content:"I called his bluff."},
  {id:"4",sender:"character",content:"He laughed and stayed by the open door.",isBookmarked:true},
];
const chapters=deriveAutomaticChapters(Array.from({length:30},(_,i)=>({id:String(i),sender:i%2?"character":"user",content:`Message ${i} at the parking lot.`})),12);
const dedupe=dedupeLocalWorldLists({objects:[{name:"phone"},{name:"Phone"},{name:"keys"}],privateNotes:[{text:"keep it awkward"},{text:"keep it awkward"}]});
const groupHint=buildExperienceDirectorHint({group:{realisticTurns:true,avoidRoundRobin:true},availability:{mode:"realistic"},notifications:[]},{characterName:"Alex",groupMode:true});

const atLeast3250 = (() => { const [a,b,c]=String(pkg.version||"0.0.0").split(".").map(Number); return a>3 || (a===3 && (b>25 || (b===25 && c>=0))); })();

const checks=[
  ["1 Chat Composer 2.0", chat.includes("chat__composer--experience-compact")&&chat.includes("chat__experience-trigger")&&chat.includes("maxHeight")],
  ["2 Context Chips", chat.includes("v325-context-chips")&&drawer.includes("Context Chips")&&css.includes(".v325-context-chips")],
  ["3 Memory Book 3.0", memory.includes("MEMORY BOOK 3.0")&&memory.includes("memory-book__v3-stats")&&memory.includes("cleanExactDuplicates")],
  ["4 Scene Cards", drawer.includes("Scene Cards")&&util.includes("buildSceneCards")],
  ["5 Character Dashboard", drawer.includes("Character dashboard")&&drawer.includes("current_emotion")],
  ["6 Better Group Stories", drawer.includes("Group Stories 2.0")&&groupHint.includes("do not force every present character")&&groupHint.includes("round-robin")],
  ["7 Character Availability", drawer.includes("Character availability")&&groupHint.includes("life outside this chat")],
  ["8 Notification Simulation", drawer.includes("Notification simulation")&&util.includes("Story inbox may surface naturally")],
  ["9 Conversation Search 2.0", drawer.includes("Conversation Search 2.0")&&searchConversation(sample,"science","all").length===1],
  ["10 Favorite Moments", drawer.includes("Favorite moments")&&drawer.includes("isBookmarked")],
  ["11 Smart Story Recap", drawer.includes("Smart story recap")&&deriveRecap(sample,"Alex").includes("Alex:")],
  ["12 Automatic Chaptering", drawer.includes("Automatic chaptering")&&chapters.length===3],
  ["13 Character Voice Preview", drawer.includes("Character voice preview")&&util.includes("deriveVoicePreview")],
  ["14 Relationship History Graph", drawer.includes("Relationship history")&&css.includes("experience__graph")],
  ["15 Director Notes 2.0", drawer.includes("Director Notes 2.0")&&drawer.includes("onQueueDirector")],
  ["16 Scene Templates", drawer.includes("Scene templates")&&drawer.includes("Rainy walk")&&drawer.includes("Late-night call")],
  ["17 Visual Themes per Story", drawer.includes("Visual themes per story")&&drawer.includes("campus")&&chat.includes("onThemeChange={applyStoryTheme}")],
  ["18 Performance Dashboard", drawer.includes("Performance dashboard")&&drawer.includes("avgDurationMs")],
  ["19 Auto-clean Memory", drawer.includes("Auto-clean memory")&&dedupe.removed===2&&memory.includes("exact duplicate")],
  ["20 Release Center", drawer.includes("Release Center")&&drawer.includes("checkForUpdate")&&drawer.includes("repairUpdate")&&atLeast3250&&pub.version===pkg.version&&vite.includes("const velvetRelease")&&deploy.includes("velvet-stories-ten.vercel.app")],
];

const edge=read("supabase/functions/character-chat/index.ts");
const protectedCore = hash("src/context/ChatsContext.jsx")==="19ccc44748b78df8be41fedc733a348225183d63f153bbad7b84bf72b2f32cbd"
  && edge.includes("createThrottledCancellationProbe")
  && edge.includes("saveCharacterReply")
  && edge.includes("parseModelEnvelope");
console.log(`${protectedCore?"PASS":"FAIL"} protected chat core contracts`);
if(!protectedCore) process.exit(1);
let pass=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`); if(ok) pass++;}
console.log(`\n${pass}/${checks.length} Velvet Experience checks passed.`);
if(pass!==checks.length) process.exit(1);
