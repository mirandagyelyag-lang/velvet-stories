import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const contractTs = fs.readFileSync("supabase/functions/character-chat/engine/story-contract.ts", "utf8");
const socialTs = fs.readFileSync("supabase/functions/character-chat/engine/social-gravity-world-identity.ts", "utf8");
const chemistryTs = fs.readFileSync("supabase/functions/character-chat/engine/relationship-chemistry-v2.ts", "utf8");
const embodiedTs = fs.readFileSync("supabase/functions/character-chat/engine/embodied-awareness-salience.ts", "utf8");
const sceneIntelligenceTs = fs.readFileSync("supabase/functions/character-chat/engine/scene-intelligence-dynamic-world.ts", "utf8");
const discourseTs = fs.readFileSync("supabase/functions/character-chat/engine/discourse-coherence-event-truth.ts", "utf8");
const socialJs = stripTypeScriptTypes(socialTs, { mode: "strip", sourceUrl: "social-gravity-world-identity.ts" });
const chemistryJs = stripTypeScriptTypes(chemistryTs, { mode: "strip", sourceUrl: "relationship-chemistry-v2.ts" });
const socialUrl = `data:text/javascript;base64,${Buffer.from(socialJs).toString("base64")}`;
const chemistryUrl = `data:text/javascript;base64,${Buffer.from(chemistryJs).toString("base64")}`;
const embodiedJs = stripTypeScriptTypes(embodiedTs, { mode: "strip", sourceUrl: "embodied-awareness-salience.ts" });
const embodiedUrl = `data:text/javascript;base64,${Buffer.from(embodiedJs).toString("base64")}`;
const sceneIntelligenceJs = stripTypeScriptTypes(sceneIntelligenceTs, { mode: "strip", sourceUrl: "scene-intelligence-dynamic-world.ts" });
const sceneIntelligenceUrl = `data:text/javascript;base64,${Buffer.from(sceneIntelligenceJs).toString("base64")}`;
const discourseJs = stripTypeScriptTypes(discourseTs, { mode: "strip", sourceUrl: "discourse-coherence-event-truth.ts" });
const discourseUrl = `data:text/javascript;base64,${Buffer.from(discourseJs).toString("base64")}`;
const contractJs = stripTypeScriptTypes(contractTs, { mode: "strip", sourceUrl: "story-contract.ts" })
  .replace('"./social-gravity-world-identity.ts"', JSON.stringify(socialUrl))
  .replace('"./relationship-chemistry-v2.ts"', JSON.stringify(chemistryUrl))
  .replace('"./embodied-awareness-salience.ts"', JSON.stringify(embodiedUrl))
  .replace('"./scene-intelligence-dynamic-world.ts"', JSON.stringify(sceneIntelligenceUrl))
  .replace('"./discourse-coherence-event-truth.ts"', JSON.stringify(discourseUrl));
const contractModule = await import(`data:text/javascript;base64,${Buffer.from(contractJs).toString("base64")}`);
const { compileStoryContract, inferCharacterDNA, storyContractPrompt } = contractModule;

const read = (p) => fs.readFileSync(p, "utf8");
const pkg = JSON.parse(read("package.json"));
const pub = JSON.parse(read("public/velvet-version.json"));
const edge = read("supabase/functions/character-chat/index.ts");
const contractSource = read("supabase/functions/character-chat/engine/story-contract.ts");

const guarded = {
  name: "Rowan",
  personality: "guarded, dry, sarcastic, proud, avoids feelings and gets quieter when overwhelmed",
  relationship: "old friend; attraction makes him withdraw instead of becoming sweeter",
  emotional_defense: "uses humor and distance when feelings get too obvious",
  humor_style: "dry teasing",
  affection_style: "shows up and remembers small details instead of saying much",
};
const practical = {
  name: "Roman",
  personality: "protective, practical, reliable, blunt, independent",
  relationship: "friend who cares through concrete action and respects boundaries",
  emotional_defense: "solves the concrete problem before naming feelings",
  affection_style: "acts of service and quiet reliability",
};

const dnaA = inferCharacterDNA(guarded);
const dnaB = inferCharacterDNA(practical);
const base = { userName: "Anto", turnIntent: { medium: "in_person" }, sceneState: { location: "campus", present: ["Anto"] }, recentMessages: [] };
const questionA = compileStoryContract({ ...base, character: guarded, latestUserMessage: "Not much, just studying. And you?" });
const questionB = compileStoryContract({ ...base, character: practical, latestUserMessage: "Not much, just studying. And you?" });
const vulnerableA = compileStoryContract({ ...base, character: guarded, latestUserMessage: "I had a terrible day." });
const vulnerableB = compileStoryContract({ ...base, character: practical, latestUserMessage: "I had a terrible day." });
const compact = storyContractPrompt(vulnerableA);

const atLeast3260 = (() => { const [a,b,c]=String(pkg.version||"0.0.0").split(".").map(Number); return a>3 || (a===3 && (b>26 || (b===26 && c>=0))); })();
const checks = [
  ["version >= 3.26.0", atLeast3260 && pub.version === pkg.version],
  ["release metadata", Boolean(pub.release)],
  ["DNA inference exists", contractSource.includes("export function inferCharacterDNA")],
  ["DNA separates defenses", dnaA.pressureResponse !== dnaB.pressureResponse && dnaA.likelyMistake !== dnaB.likelyMistake],
  ["same question can produce different tactics", questionA.reactionEngine.visibleTactic !== questionB.reactionEngine.visibleTactic],
  ["same vulnerable cue produces different impulse", vulnerableA.reactionEngine.firstImpulse !== vulnerableB.reactionEngine.firstImpulse || vulnerableA.reactionEngine.visibleTactic !== vulnerableB.reactionEngine.visibleTactic],
  ["reaction sequence is explicit", vulnerableA.reactionEngine.instruction.includes("literal cue") && vulnerableA.reactionEngine.instruction.includes("visible tactic")],
  ["compact turn contract carries DNA", compact.includes('"characterDNA"') && compact.includes('"reactionEngine"')],
  ["prompt enforces Character DNA 2.0", edge.includes("CHARACTER DNA 2.0: voice is only the surface") && edge.includes("SAME CUE ≠ SAME RESPONSE")],
  ["prompt exposes turn-specific reaction engine", edge.includes("REACTION ENGINE — THIS TURN") && edge.includes("Likely human mistake")],
  ["clone reaction validator exists", edge.includes("function hasReactionCloneDrift(") && edge.includes('issues.push("reaction_clone_drift")')],
  ["subtext overexposure validator exists", edge.includes("function hasExplanatorySubtextDump(") && edge.includes('issues.push("explanatory_subtext_dump")')],
  ["clone drift triggers bounded repair", edge.includes('"reaction_clone_drift",') && edge.includes("Change the character's underlying REACTION")],
  ["human imperfection is identity", edge.includes("HUMAN ERROR IS PART OF IDENTITY") && edge.includes("Do not optimize every personality")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} Character DNA 2.0 + Reaction Engine checks passed.`);
if (failed) process.exit(1);
