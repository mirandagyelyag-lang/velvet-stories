import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const chat=read("src/pages/Chat.jsx");
const studio=read("src/components/StorySafeStudioDrawer.jsx");
const util=read("src/utils/safeStoryUX.js");
const diagnostics=read("src/pages/Diagnostics.jsx");
const rollback=read("ROLLBACK-PWA-STABLE.sh");
const checks=[
  ["Safe Studio drawer", chat.includes("StorySafeStudioDrawer") && studio.includes("Story cockpit")],
  ["Memory Book visual/confidence", studio.includes("Memory Book") && read("src/components/MemoryBookDrawer.jsx").includes("High confidence")],
  ["Relationship map", studio.includes("Relationship map")],
  ["Scene header + catch-up", studio.includes("Location not established") && studio.includes("lastBeat")],
  ["Regenerate style presets", chat.includes("More dialogue") && chat.includes("Continue naturally")],
  ["Adaptive response length", util.includes("buildAdaptiveReplyHint") && chat.includes("mergeDirectorHints")],
  ["Character status", studio.includes("right now")],
  ["Why they acted lens", studio.includes("Private character lens")],
  ["Pinned memories", studio.includes("Memory Book")],
  ["Memory confidence", studio.includes("Memory confidence")],
  ["Chat cleanup preserved", read("src/context/ChatsContext.jsx").includes("recover") || read("src/context/ChatsContext.jsx").includes("sanitize") || read("supabase/functions/character-chat/index.ts").includes("hidden_metadata")],
  ["Typing indicator polish", chat.includes("typing-indicator--v3230")],
  ["Scene transitions preserved", chat.includes("chat__scene-divider")],
  ["Favorite replies/bookmarks", studio.includes("Favorite replies & saved moments")],
  ["Conversation search", studio.includes("Search this conversation")],
  ["Conversation chapters", studio.includes("Conversation chapters")],
  ["Character media gallery", studio.includes("Character media gallery")],
  ["Per-character appearance", studio.includes("velvet_character_tint_")],
  ["Version Safety Net", studio.includes("Version Safety Net") && diagnostics.includes("MISMATCH")],
  ["Rollback support", rollback.includes("vercel alias set") && rollback.includes("velvet-version.json")],
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;}
console.log(`\n${pass}/${checks.length} Safe Studio systems ready.`);if(pass!==checks.length)process.exit(1);
