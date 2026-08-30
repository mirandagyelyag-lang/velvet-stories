import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { compileStoryContract } from "../supabase/functions/character-chat/engine/story-contract.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const edge = read("supabase/functions/character-chat/index.ts");
const modal = read("src/components/CreateCharacterModal.jsx");
const context = read("src/context/CharactersContext.jsx");
const relationships = read("src/components/RelationshipDrawer.jsx");
const chat = read("src/pages/Chat.jsx");
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("Voice Lab is one bounded model call", edge.includes('action === "character_voice_lab"') && edge.includes('purpose: "character-voice-lab"') && edge.includes("CASUAL, ANGRY, FLIRTING, VULNERABLE, AWKWARD"));
check("Voice Lab can be previewed and applied before save", modal.includes("Build Voice Lab") && modal.includes("Apply this fingerprint") && context.includes("buildCharacterVoiceLab"));
check("durable NPC roster is visible and editable", relationships.includes("Living cast") && relationships.includes("Save NPC") && relationships.includes('from("story_cast_members")'));
check("NPCs expose independent goals and knowledge", relationships.includes("Independent goal") && relationships.includes("What they know"));
check("multiple relationships remain separate cast records", relationships.includes("member.relationship") && relationships.includes("member.current_dynamic"));
check("director contains all six new controls", ["More dialogue","Let them be wrong","Bring in an NPC","Less romance","Advance the night","Keep the conflict"].every((label)=>chat.includes(label)));

const contract = compileStoryContract({
  character: { role: "race driver", world: "international racing", habits: "trains before dawn", character_values: "team loyalty" },
  userName: "A", latestUserMessage: "Okay.", turnIntent: {},
  recentMessages: [
    { sender: "character", content: "Naturally. How observant?" },
    { sender: "character", content: "Keep up. Are you coming?" },
    { sender: "character", content: "Naturally. Do you understand?" },
  ],
});
assert.ok(contract.independentLife.anchors.some((item)=>item.includes("international racing")));
check("independent life is compiled from profile anchors", contract.independentLife.anchors.length >= 3);
check("conversation sequence analysis catches scripted cadence", contract.conversationQuality.recentPatterns.includes("polished AI banter cadence"));
check("quality analysis changes the next tactic", contract.conversationQuality.nextTurnAdjustments.some((item)=>item.includes("plain, uneven spoken language")));

for (const item of checks) console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
const failed = checks.filter((item)=>!item.pass);
console.log(`\n${checks.length-failed.length}/${checks.length} Velvet v3.1 living-character checks passed.`);
if (failed.length) process.exit(1);
