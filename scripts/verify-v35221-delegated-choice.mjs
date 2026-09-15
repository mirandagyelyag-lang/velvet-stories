import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { immediateTurnContinuityIssues } from "../supabase/functions/character-chat/engine/immediate-turn-continuity-v35213.js";
import { buildGroundedLastResortReply } from "../supabase/functions/character-chat/engine/established-attraction-opportunity-v35219.js";

const previous = [`"There's that diner down on Fourth that's still open. Or we can hit the drive-thru. Your call."`];
const bad = `"There's that diner down on Fourth that's still open," Alex said. "Or we can hit the drive-thru. Your call."`;
assert.ok(immediateTurnContinuityIssues(bad, "I'll trust you", previous, {}).includes("delegated_choice_returned"));
assert.ok(immediateTurnContinuityIssues(`"You choose."`, "Surprise me", previous, {}).includes("delegated_choice_returned"));
assert.ok(immediateTurnContinuityIssues(`"What sounds better?"`, "Up to you", previous, {}).includes("delegated_choice_returned"));

const good = `"The diner." Alex took the next turn without asking again. "Their fries are better."`;
assert.ok(!immediateTurnContinuityIssues(good, "I'll trust you", previous, {}).includes("delegated_choice_returned"));

const fallback = buildGroundedLastResortReply({ character: { name: "Alexander Bennett" }, latestUserMessage: "I'll trust you", recentCharacterReplies: previous, issues: ["delegated_choice_returned"] });
assert.match(fallback, /The diner/);
assert.doesNotMatch(fallback, /your call|up to you|which|\?/i);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const blocking = edge.slice(edge.indexOf("const BLOCKING_NARRATIVE_ISSUES"), edge.indexOf("const REPAIR_TRIGGER_ISSUES"));
assert.match(blocking, /"delegated_choice_returned"/);

console.log("PASS  'I'll trust you' cannot be answered with another menu");
console.log("PASS  equivalent delegated-choice phrases follow the same rule");
console.log("PASS  choosing the diner and advancing is accepted");
console.log("PASS  terminal fallback chooses from the established options");
console.log("PASS  returning a delegated choice is blocked before display");
console.log("\n5 delegated-choice checks passed.");
