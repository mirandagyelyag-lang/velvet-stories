import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { instantStoryLooksComplete, instantStoryQualityIssues } from "../supabase/functions/character-chat/engine/instant-story-v3492.ts";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/context/CharactersContext.jsx", import.meta.url), "utf8");

assert.match(edge, /TARGET 260-380 WORDS/);
assert.match(edge, /hard ceiling 420 words/);
assert.match(edge, /CONFLICT-FIRST STORY ENGINE 3\.52\.47/);
assert.match(edge, /the central problem must still matter if all romantic attraction were removed/i);
assert.match(edge, /THREE ACTIVE FORCES/);
assert.match(edge, /NPC AUTONOMY/);
assert.match(edge, /REAL STAKES/);
assert.match(edge, /QUESTIONS, NOT ANSWERS/);
assert.match(edge, /JEALOUSY NEEDS A REAL PERSON/);
assert.match(edge, /NO ROMCOM MACHINERY/);
assert.match(edge, /DO NOT RESOLVE THE OPENING/);
assert.match(edge, /END AT THE PRESSURE POINT/);
assert.match(edge, /NEVER END WITH A MENU/);
assert.doesNotMatch(edge.slice(edge.indexOf("function instantStoryFallbackOpening"), edge.indexOf("async function handleInstantStory")), /They forgot yours/);
assert.doesNotMatch(edge.slice(edge.indexOf("function instantStoryFallbackOpening"), edge.indexOf("async function handleInstantStory")), /quiet evening or the drive/);
assert.doesNotMatch(edge.slice(edge.indexOf("function instantStoryFallbackOpening"), edge.indexOf("async function handleInstantStory")), /ordered a spare/);

const approvedShape = `The argument had already gone past the point where anyone could pretend it was casual. Marcus stood by the kitchen island with a screenshot open on his phone while Jules sat on the arm of the couch, furious enough that nobody had asked her to repeat herself. Alexander came in midway through the latest version of the story and listened without interrupting.

“She told Noah,” Marcus said.

Alexander looked at the screenshot. “Told him what?”

“That Jules sent these around.”

Jules laughed once. There was nothing amused in it.

Alexander held out his hand for the phone. The crop showed half a conversation and no visible timestamp. Marcus had already repeated the accusation twice, but the details had changed between versions.

“You weren’t there,” Marcus said.

“No.” Alexander read the messages again. “That doesn’t make this proof.”

Marcus folded his arms. “You’re taking her side.”

“I’m saying you skipped three steps and called it a fact.”

That landed badly.

Jules stood. “Alexander.”

He ignored the warning, still looking at Marcus.

Someone in the living room asked whether they should call Noah. Another person said they should wait. The disagreement spread before anyone had actually established what Noah knew, who had sent him the screenshots, or why your name had been brought into it at all.

Marcus finally said, “Fine. Ask her.”

Alexander’s attention shifted, but he did not turn the room into a vote.

“No,” he said.

Marcus frowned. “No?”

“You made the accusation.” Alexander set the phone on the counter between them. “Start with the part you keep changing.”

For the first time, Marcus did not answer immediately.`;

assert.equal(instantStoryLooksComplete(approvedShape, "STOP", {
  name: "Alexander Bennett",
  relationship: "Close friends in the same friend group.",
  personality: "Confident and direct.",
}), true);

const badSeat = `Alexander had saved the seat beside him for you even though the room was filling up. He defended this seat from someone else and watched the door. “You’re welcome.” He checked the time again, already amused that you were late. The lecture had not started, and there was nothing else happening except the fact that he wanted you beside him. He moved his jacket away from the chair and leaned back. “Five minutes late.” The rest of the room disappeared from his attention as he waited for you to answer. Nothing outside the two of you had any stake in the moment, no other person had a real goal, and no problem would exist if the attraction disappeared. He tapped the desk once, looking pleased with himself. “I was starting to think I defended this seat for nothing.”`;
assert.ok(instantStoryQualityIssues(badSeat, { relationship: "He likes you." }).includes("romance_first_setup"));

const badEnding = `${approvedShape}\n\nAlexander looked between the two options. “Which one?”`;
assert.ok(instantStoryQualityIssues(badEnding, {}).includes("forced_binary_choice"));

assert.match(client, /genericInstantStory/);

console.log("PASS  conflict-first contract is installed");
console.log("PASS  romance remains a layer instead of the entire plot");
console.log("PASS  ensemble/NPC autonomy and real stakes are required");
console.log("PASS  openings stop before resolution and avoid A\\/B menus");
console.log("PASS  richer 260-380 word scenes fit under the 420-word server ceiling");
console.log("PASS  old takeout/drive fallback is gone");
console.log("\n6 Instant Story v3.52.47 checks passed.");
