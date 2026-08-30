import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const app=read("src/App.jsx"), chat=read("src/pages/Chat.jsx"), pkg=JSON.parse(read("package.json"));
const checks=[
 ["version 3.8.0",pkg.version==="3.8.0"],
 ["route persistence",app.includes("VELVET_LAST_LOCATION_KEY")&&app.includes("conversationId")],
 ["route transitions",app.includes("velvet-route-stage")],
 ["draft persistence",chat.includes("velvet_draft_")],
 ["reading position",chat.includes("velvet_scroll_v380_")],
 ["dynamic relationship",chat.includes("RelationshipDrawer")&&chat.includes("refreshStoryMetadata")],
 ["memory book",chat.includes("MemoryBookDrawer")],
 ["group stories",chat.includes("groupMode")&&chat.includes("groupCast")],
 ["generation stop + typing",chat.includes("stopGeneration")&&chat.includes("is writing…")],
 ["message actions + long press",chat.includes("longPressTimerRef")&&chat.includes("onOpenActions")],
 ["ambient suggestion",chat.includes("suggestAmbienceForScene")&&chat.includes("chat__ambience-suggestion")],
];
for(const [name,ok] of checks) console.log(`${ok?"PASS":"FAIL"} · ${name}`);
if(checks.some(([,ok])=>!ok)) process.exit(1);
