import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { immediateTurnContinuityIssues } from "../supabase/functions/character-chat/engine/immediate-turn-continuity-v35213.js";
import { establishedAttractionOpportunityIssues } from "../supabase/functions/character-chat/engine/established-attraction-opportunity-v35219.js";
import { enforceFinalDelegatedChoiceBarrier, finalDelegatedChoiceBarrierIssues } from "../supabase/functions/character-chat/engine/final-turn-barrier-v35223.js";

const character = {
  name: "Alexander Bennett",
  relationship: "You've been close friends for years. Alex has never hidden how much he likes you. He flirts openly and goes out of his way to make your life easier.",
  personality: "Alex is confident, witty, and effortlessly charismatic.",
};

// Exact live regression reported after v3.52.22.
const latestUserMessage = "I'll trust you";
const recentUserMessages = ["Where are we going?"];
const recentCharacterReplies = [
  `"Wherever has fries that aren't cold," Alex said, already walking down the stairs toward the exit. "Unless you have a better idea."`,
];
const rejectedLiveReply = `"There's that diner down on Fourth that keeps the fryer on past midnight," Alex said, matching his pace to yours as you hit the bottom of the stairs. "Or we can live dangerously and hit the campus vending machine. Your call."`;

assert.ok(immediateTurnContinuityIssues(rejectedLiveReply, latestUserMessage, recentCharacterReplies, character).includes("delegated_choice_returned"));
assert.ok(establishedAttractionOpportunityIssues({ reply: rejectedLiveReply, latestUserMessage, recentUserMessages, recentCharacterReplies, character }).includes("trusted_choice_attraction_flattened"));
assert.deepEqual(
  finalDelegatedChoiceBarrierIssues({ reply: rejectedLiveReply, latestUserMessage, recentUserMessages, recentCharacterReplies, character }).sort(),
  ["delegated_choice_returned", "trusted_choice_attraction_flattened"].sort(),
);

const fixed = enforceFinalDelegatedChoiceBarrier({
  reply: rejectedLiveReply,
  latestUserMessage,
  recentUserMessages,
  recentCharacterReplies,
  character,
});
assert.equal(fixed.replaced, true);
assert.match(fixed.reply, /the diner/i);
assert.doesNotMatch(fixed.reply, /\b(?:or we can|your call|up to you|you choose|which one|what sounds better|unless you have a better idea)\b/i);
assert.match(fixed.reply, /get you to myself|time with you|not in a hurry to head back|steal you from them/i);
assert.deepEqual(fixed.issues, []);

const alreadyGood = `"The diner. Better fries." Alex headed for the exit. "And I get you to myself for a bit."`;
const untouched = enforceFinalDelegatedChoiceBarrier({ reply: alreadyGood, latestUserMessage, recentUserMessages, recentCharacterReplies, character });
assert.equal(untouched.replaced, false);
assert.equal(untouched.reply, alreadyGood);
assert.deepEqual(untouched.issues, []);

const neutral = {
  name: "Alex",
  relationship: "You're classmates who barely know each other.",
  personality: "Alex is confident and witty.",
};
const neutralMenu = `"The diner or the vending machine. Your call."`;
const neutralFixed = enforceFinalDelegatedChoiceBarrier({ reply: neutralMenu, latestUserMessage, recentUserMessages, recentCharacterReplies, character: neutral });
assert.equal(neutralFixed.replaced, true);
assert.doesNotMatch(neutralFixed.reply, /your call|up to you|or we can/i);
assert.doesNotMatch(neutralFixed.reply, /get you to myself|wanted .* time with you|steal you/i);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
assert.match(edge, /ABSOLUTE FINAL TURN BARRIER/);
assert.match(edge, /enforceFinalDelegatedChoiceBarrier\(\{/);
const barrierPos = edge.indexOf("ABSOLUTE FINAL TURN BARRIER");
const blankRecoveryPos = edge.indexOf("all-local-candidates-empty");
const savePos = edge.indexOf("const savedMessage = replacementMessage");
assert.ok(blankRecoveryPos >= 0 && barrierPos > blankRecoveryPos, "final barrier must run after blank recovery");
assert.ok(savePos > barrierPos, "final barrier must run before persistence");
assert.doesNotMatch(edge.slice(edge.indexOf("compact final rescue rejected"), edge.indexOf("ABSOLUTE PERSISTENCE GUARD")), /validationIssues\s*=\s*\[\]/);
assert.doesNotMatch(edge, /validated-protected-final/);

console.log("PASS  exact live 'I'll trust you' regression is rejected");
console.log("PASS  final barrier commits to the grounded diner instead of returning a menu");
console.log("PASS  established/open attraction remains visibly present in the rescue");
console.log("PASS  already-valid committed replies pass through untouched");
console.log("PASS  neutral relationships commit without invented romance");
console.log("PASS  deterministic last resort is revalidated instead of clearing issues blindly");
console.log("PASS  final barrier runs after blank recovery and before persistence/streaming");
console.log("\n7 absolute-final-turn-barrier checks passed.");
