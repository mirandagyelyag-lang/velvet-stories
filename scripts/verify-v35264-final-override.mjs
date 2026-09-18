import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emotionalRelationshipCoreV35263Issues } from "../supabase/functions/character-chat/engine/emotional-relationship-core-v35263.js";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");

const character = {
  name: "Chase Beaumont",
  personality: "Confident, proud, observant, hides concern behind attitude.",
  relationship: "Enemies-to-lovers tension. He cares more than he admits.",
};

const latest = "Can you stop ruining everything? I was tired of everything.";

const subtleGood = `Chase's smile disappeared. For once, he didn't reach for another joke. He stayed where he was, attention fixed on you instead of the room. "Okay." His voice lost the edge. "I'm here."`;
assert.deepEqual(
  emotionalRelationshipCoreV35263Issues({ reply: subtleGood, latestUserMessage: latest, character }),
  [],
  "subtle character-specific care must not be rejected for lacking a magic phrase"
);

const canned = `"You fading on me?" Chase watches you for a second.`;
assert.ok(
  emotionalRelationshipCoreV35263Issues({ reply: canned, latestUserMessage: latest, character }).includes("canned_distress_checkin"),
  "the repeated fading-on-me line must be rejected"
);

const deflection = `"I didn't even do anything," Chase says. "I was just standing here."`;
assert.ok(
  emotionalRelationshipCoreV35263Issues({ reply: deflection, latestUserMessage: latest, character }).includes("relational_hurt_deflected"),
  "technical innocence cannot replace an emotional response"
);

const practicalEscape = `"Do you want to get out of here? It's too loud."`;
assert.ok(
  emotionalRelationshipCoreV35263Issues({ reply: practicalEscape, latestUserMessage: latest, character }).includes("emotional_bid_practical_escape"),
  "logistics cannot replace emotional registration"
);

const repairStart = edge.indexOf("const REPAIR_TRIGGER_ISSUES");
const hardStart = edge.indexOf("const HARD_REPAIR_REQUIRED_ISSUES");
assert.ok(repairStart > -1 && hardStart > -1);
const repairBlock = edge.slice(repairStart, hardStart);
const hardBlock = edge.slice(hardStart, edge.indexOf("function hardRepairRequiredIssues", hardStart));

assert.doesNotMatch(repairBlock, /"emotional_bid_unregistered"/);
assert.match(repairBlock, /"canned_distress_checkin"/);
assert.match(hardBlock, /"canned_distress_checkin"/);
assert.match(hardBlock, /"relational_hurt_deflected"/);

console.log("PASS  subtle good emotional replies are not phrase-gated");
console.log("PASS  fading-on-me canned replacement is blocked");
console.log("PASS  concrete emotional failures still trigger repair");
console.log("PASS  final hard barrier cannot save the canned fallback");
console.log("\n4 Final Override v3.52.64 checks passed.");
