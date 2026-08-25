import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildLivingSceneHeader, buildNextBeatSuggestion, continuityGuardLabel, continuityGuardTitle } from "../src/utils/livingScenes.js";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const pkg = JSON.parse(read("package.json"));
const chat = read("src/pages/Chat.jsx");
const context = read("src/context/ChatsContext.jsx");
const edge = read("supabase/functions/character-chat/index.ts");
const main = read("src/main.jsx");
const styles = read("src/styles/velvet-v270-living-scenes.css");
const utility = read("src/utils/livingScenes.js");
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("release is v2.11.10 Social Role Grounding", pkg.version === "2.11.10" && read("src/config/version.js").includes('VELVET_RELEASE = "Social Role Grounding"'));
check("Living Scenes stylesheet is the final release layer", main.lastIndexOf("velvet-v270-living-scenes.css") > main.lastIndexOf("velvet-v2616-audio-center.css"));

const header = buildLivingSceneHeader({ sceneState: { location: "Campus quad", time_label: "Late night", present: ["Theo", "Jules"] }, ambientMode: "rain" }, "Theo");
check("dynamic scene header uses established location time and ambience", header.items.join("|") === "Campus quad|Late night|Rain");
const quietHeader = buildLivingSceneHeader({ sceneState: { location: "Kitchen", present: ["Theo"] }, ambientMode: "none" }, "Theo");
check("scene header never fabricates an unknown clock time", quietHeader.items.join("|") === "Kitchen" && !/\d{1,2}:\d{2}/.test(quietHeader.items.join(" ")));
check("presence summary comes only from the tracked roster", header.presenceLabel === "2 present" && header.presenceTitle.includes("Theo") && header.presenceTitle.includes("Jules"));

const residueSuggestion = buildNextBeatSuggestion({ characterDevelopment: { emotional_residue: [{ emotion: "hurt after the argument", remaining_turns: 5, intensity: 0.9 }] } }, "Theo");
check("smart suggestion prioritizes active emotional aftermath", residueSuggestion.label === "Let it linger" && residueSuggestion.instruction.includes("hurt after the argument"));
const threadSuggestion = buildNextBeatSuggestion({ intelligenceState: { commitments: ["Call Jules after class"] } }, "Theo");
check("smart suggestion can surface an established unresolved thread", threadSuggestion.label === "Follow the open thread" && threadSuggestion.instruction.includes("Call Jules after class"));
const roomSuggestion = buildNextBeatSuggestion({ sceneState: { present: ["Theo", "Jules", "Mora"] } }, "Theo");
check("smart suggestion respects people already in the room", roomSuggestion.label === "Use the room" && roomSuggestion.instruction.includes("Jules"));
const absenceSuggestion = buildNextBeatSuggestion({ castState: { Jules: { current_status: "outside current scene" } } }, "Theo");
check("smart suggestion can preserve an established absence", absenceSuggestion.label === "Keep the separation" && absenceSuggestion.instruction.includes("Jules"));
check("smart suggestions are local and never spend an AI request", !/fetch\(|supabase|gemini|invoke\(/i.test(utility));

check("chat renders the compact Living Scene header", chat.includes('className="chat__living-scene"') && chat.includes("buildLivingSceneHeader"));
check("Continuity Guard is visible from the chat scene strip", chat.includes("chat__continuity-status") && chat.includes("continuityGuardLabel") && chat.includes("ShieldCheck"));
check("automatic possible next beat card is removed while manual Scene Director remains", !chat.includes("Possible next beat") && !chat.includes("queueLivingSceneSuggestion") && chat.includes("Guide the next beat"));
check("client receives live presence development and guard metadata", ["castState: eventData.castState", "characterDevelopment: eventData.characterDevelopment", "relationshipState: eventData.relationshipState", "continuityGuard: eventData.continuityGuard"].every((needle) => context.includes(needle)));

check("Continuity Guard 2.0 blocks silent time location roster hearing re-entry and object errors", ["time_changed_without_scene_change", "present_character_silently_dropped", "offscreen_character_heard_turn", "absent_character_reappeared", "invented_plot_object"].every((needle) => edge.includes(needle)));
check("Presence Engine carries a roster forward until explicit exit", edge.includes("[...priorPresent, ...proposedPresent]") && edge.includes("exitedKeys.has(normalizeText(name))"));
check("scene transitions mark people left behind as outside the current scene", edge.includes('current_status: "outside current scene"'));
check("editorial scene breaks have deterministic transition fallbacks", edge.includes("buildSceneSeparatorLabel") && edge.includes('return "The next morning"') && edge.includes('"Later that night"'));
check("emotional residue now has intensity and slower high-impact decay", edge.includes('remaining_turns: significance === "high" ? 9') && edge.includes('intensity: significance === "high" ? 1') && edge.includes("* 0.82"));
check("story prompt explicitly preserves presence and emotional aftermath", edge.includes("21. PRESENCE ENGINE") && edge.includes("22. EMOTIONAL AFTERMATH"));
check("successful replies return Continuity Guard state without another model call", edge.includes("continuityIssuesBeforeRepair") && edge.includes('continuityGuard: { status: repairUsed && continuityIssuesBeforeRepair.length ? "repaired" : "stable"'));
check("continuity metadata stays local and does not trigger another model call", edge.includes("VELVET_SPEED_REPAIR_BUDGET_V282") && !edge.slice(edge.indexOf("const REPAIR_TRIGGER_ISSUES"), edge.indexOf("function blockingNarrativeIssues")).includes("CONTINUITY_GUARD_ISSUES"));
check("Living Scene UI stays compact on phone without the retired suggestion card", styles.includes("@media(max-width:760px)") && styles.includes("chat__living-scene") && styles.includes("min-height:44px") && !chat.includes("chat__beat-suggestion"));
check("Continuity Guard labels repaired turns without exposing internals", continuityGuardLabel({ status: "repaired" }) === "Continuity protected" && continuityGuardLabel({ status: "stable" }) === "Continuity on" && continuityGuardTitle({ status: "repaired", protected: ["invented_plot_object"] }).includes("established objects") && !continuityGuardTitle({ status: "repaired", protected: ["invented_plot_object"] }).includes("invented_plot_object"));

let failed = 0;
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"}  ${item.name}`);
  if (!item.pass) failed += 1;
}
if (failed) {
  console.error(`\n${failed} Living Scenes checks failed.`);
  process.exit(1);
}
console.log(`\n${checks.length} Living Scenes checks passed.`);
