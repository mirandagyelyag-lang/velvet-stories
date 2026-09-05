import fs from "node:fs";
import { compileStoryContract, inferCharacterDNA, storyContractPrompt } from "../supabase/functions/character-chat/engine/story-contract.ts";

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

const checks = [
  ["version 3.26.0", pkg.version === "3.26.0" && pub.version === "3.26.0"],
  ["release metadata", pub.release === "Character DNA 2.0 + Reaction Engine"],
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
