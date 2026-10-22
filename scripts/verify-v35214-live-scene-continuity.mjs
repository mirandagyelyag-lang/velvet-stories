import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { immediateTurnContinuityIssues } from "../supabase/functions/character-chat/engine/immediate-turn-continuity-v35213.js";

const profile = { name: "Alexander Bennett", relationship: "Alex has never hidden how much he likes you." };
const opening = `After years in the same group, he knew your order well enough to catch the mistake before you did. The fact that he had also ordered a spare of the thing you usually chose was much harder to explain as coincidence.`;
const firstReply = `"Suit yourself." Alexander dropped the keys back into his pocket and scooped up the containers, leaving the extra one where it was.`;
const user = `*i took the napkins and my food and went where everyone were*`;
const rejected = `He didn't say anything as you dropped onto it, just slid the stack of napkins out of your hand and tossed them onto the coffee table before passing you your container. "Save room for later," he said, dropping onto the opposite end of the couch.`;
const issues = immediateTurnContinuityIssues(rejected, user, [opening, firstReply], profile);

assert.ok(issues.includes("dangling_scene_reference"));
assert.ok(issues.includes("immediate_object_ownership_rewritten"));
assert.ok(issues.includes("unsupported_future_callback"));
assert.ok(issues.includes("opening_attraction_thread_dropped"));

const coherent = `Alexander moved his drink off the cushion beside him, leaving the spot open. When one of the others reached toward your container, he blocked the attempt with the napkins. "Get your own."`;
assert.deepEqual(immediateTurnContinuityIssues(coherent, user, [opening, firstReply], profile), []);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
for (const issue of issues) assert.match(edge, new RegExp(`"${issue}"`));

// Additional isolated regressions for acceptance, agency, and retry behavior.

const repeat = immediateTurnContinuityIssues(rejected, user, [opening, firstReply, rejected], profile);
assert.ok(repeat.includes("repeated_previous_character_reply"));
for (const reply of [
  'Alexander sets his own food down and moves a bag off the chair beside him.',
  'He shifts his drink aside to make room, then continues talking with the group.',
]) {
  assert.ok(!immediateTurnContinuityIssues(reply, user, [opening, firstReply], profile).includes("immediate_object_ownership_rewritten"));
}

console.log("PASS  exact reported second-turn reply fails all four continuity guards");
console.log("PASS  user's food remains in the user's possession");
console.log("PASS  dangling references and invented future plans are rejected");
console.log("PASS  Alexander's established attraction survives through behavior");
console.log("PASS  coherent selective interest remains valid");
console.log("\nContinuity regression assertions passed.");
