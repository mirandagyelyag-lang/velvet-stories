import fs from "node:fs";
import assert from "node:assert/strict";

const engine=fs.readFileSync("supabase/functions/character-chat/engine/velvet-narrative-upgrade-v35379.js","utf8");
const index=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const settings=fs.readFileSync("src/pages/Settings.jsx","utf8");
const settingsContext=fs.readFileSync("src/context/SettingsContext.jsx","utf8");
const chats=fs.readFileSync("src/context/ChatsContext.jsx","utf8");

for (const marker of [
  "RELATIONSHIP BRAIN","EMOTIONAL AFTERMATH","PHYSICAL CONTINUITY","ROMANTIC ESCALATION",
  "CHARACTER-SPECIFIC FLIRTING","NPC BRAIN","WORLD REPUTATION","INTENT COMPILER",
  "NARRATIVE QA CONTRACT","SCENE DIRECTOR"
]) assert.ok(engine.includes(marker), marker);

assert.ok(index.includes("buildVelvetNarrativeUpgradeV35379"));
assert.ok(index.includes("velvetNarrativeUpgradeIssuesV35379"));
assert.ok(index.includes("VELVET_ENGINE_RELEASE = \"454\""));
for (const key of ["storyRomanticTension","storyJealousy","storyCharacterInitiative","storyScenePace"]) {
  assert.ok(settingsContext.includes(key), key);
  assert.ok(chats.includes(key), key);
}
for (const label of ["Romantic tension","Jealousy","Character initiative","Scene pace"]) {
  assert.ok(settings.includes(label), label);
}
console.log("v3.53.79 ten-part narrative upgrade verification passed");
