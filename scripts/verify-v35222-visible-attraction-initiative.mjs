import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveRelationshipChemistryV2 } from "../supabase/functions/character-chat/engine/relationship-chemistry-v2.ts";
import { establishedAttractionOpportunityIssues, buildGroundedLastResortReply } from "../supabase/functions/character-chat/engine/established-attraction-opportunity-v35219.js";

const character = {
  name: "Alexander Bennett",
  relationship: "You've been close friends for years. Alex has never hidden how much he likes you. He flirts openly and goes out of his way to make your life easier.",
  personality: "Alex is confident, witty, and effortlessly charismatic.",
};

const recentMessages = [
  { sender: "user", content: "I don't know, you wanna do something?" },
  { sender: "character", content: "Grab your jacket if you're actually bailing." },
  { sender: "user", content: "Where are we going?" },
  { sender: "character", content: "There's that diner down on Fourth that's still open. Or we can hit the drive-thru. Your call." },
];

const engine = deriveRelationshipChemistryV2({ character, latestUserMessage: "I'll trust you", recentMessages });
assert.equal(engine.personalityManifestation.attractionCanonExplicit, true);
assert.equal(engine.personalityManifestation.openFlirtCanon, true);
assert.equal(engine.attractionExpression.status, "opportunity_now");
assert.match(engine.attractionExpression.directive, /include one legible, character-specific sign/i);
assert.match(engine.personalityManifestation.flirtExpression, /OPEN FLIRT CANON/);

const recentUserMessages = ["I don't know, you wanna do something?", "Where are we going?"];
const recentCharacterReplies = ["Grab your jacket if you're actually bailing.", "There's that diner down on Fourth that's still open. Or we can hit the drive-thru. Your call."];
const bad = `"The diner." Alex took the next turn. "Their fries are better."`;
const badIssues = establishedAttractionOpportunityIssues({ reply: bad, latestUserMessage: "I'll trust you", recentUserMessages, recentCharacterReplies, character });
assert.ok(badIssues.includes("trusted_choice_attraction_flattened"));

const good = `"The diner." Alex started toward the car. "Better fries. And I'm not wasting a perfectly good excuse to steal you from them for a while."`;
assert.ok(!establishedAttractionOpportunityIssues({ reply: good, latestUserMessage: "I'll trust you", recentUserMessages, recentCharacterReplies, character }).includes("trusted_choice_attraction_flattened"));

const neutral = { ...character, relationship: "You're classmates who barely know each other.", personality: "Alex is confident and witty." };
assert.deepEqual(establishedAttractionOpportunityIssues({ reply: bad, latestUserMessage: "I'll trust you", recentUserMessages, recentCharacterReplies, character: neutral }), []);

const fallback = buildGroundedLastResortReply({ character, latestUserMessage: "I'll trust you", recentCharacterReplies, issues: ["delegated_choice_returned", "trusted_choice_attraction_flattened"] });
assert.match(fallback, /The diner/);
assert.match(fallback, /steal you from them|extra time with you/i);
assert.doesNotMatch(fallback, /your call|up to you|which\?|what sounds better/i);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
assert.match(edge, /CADENCE, NOT SATURATION/);
assert.match(edge, /OPEN FLIRT MEANS OPEN FLIRT/);
assert.match(edge, /TRUST\/DELEGATED ONE-ON-ONE OPENINGS ARE HIGH-VALUE/);
const blocking = edge.slice(edge.indexOf("const BLOCKING_NARRATIVE_ISSUES"), edge.indexOf("const REPAIR_TRIGGER_ISSUES"));
assert.match(blocking, /"trusted_choice_attraction_flattened"/);

console.log("PASS  established attraction gets a visible-signal cadence");
console.log("PASS  open-flirt canon requires some actual flirting, not service-only affection");
console.log("PASS  'I'll trust you' during chosen one-on-one time becomes an attraction opportunity now");
console.log("PASS  logistics-only reply is blocked in that high-confidence window");
console.log("PASS  a concrete decision plus natural personal flirt is accepted");
console.log("PASS  neutral relationships never get attraction invented");
console.log("PASS  deterministic rescue chooses and preserves attraction instead of flattening it");
console.log("\n7 visible-attraction initiative checks passed.");
