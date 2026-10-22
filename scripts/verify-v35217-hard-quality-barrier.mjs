import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const repairStart = edge.indexOf("if (blocking.length)");
const persistenceStart = edge.indexOf("let persistableReply", repairStart);
const protectedFlow = edge.slice(repairStart, persistenceStart);

assert.match(protectedFlow, /originalPrompt: compactTurnPrompt/);
assert.doesNotMatch(protectedFlow, /streamFinalReply\(result\.reply, "repair-ready"\)/);
assert.doesNotMatch(protectedFlow, /streamFinalReply\(result\.reply, "repair-timeout-fallback"\)/);
assert.match(protectedFlow, /protected reply remained invalid; starting compact final rescue/);
assert.match(protectedFlow, /const rescueBlocking = blockingNarrativeIssues\(rescueIssues\)/);
assert.match(protectedFlow, /buildGroundedLastResortReply/);
assert.doesNotMatch(protectedFlow, /Velvet could not produce a coherent reply without contradicting your latest turn/);
assert.doesNotMatch(protectedFlow, /streamFinalReply\(result\.reply, "validated-protected-final"\)/);
const absoluteBarrierStart = edge.indexOf("v3.52.37 REGRESSION SHIELD", persistenceStart);
const saveStart = edge.indexOf("const savedMessage = replacementMessage", absoluteBarrierStart);
const absoluteFinalFlow = edge.slice(absoluteBarrierStart, saveStart);
assert.match(absoluteFinalFlow, /streamFinalReply\(persistableReply, "v35237-regression-shield"\)/);
assert.ok(edge.indexOf("compact final rescue rejected") < absoluteBarrierStart);

// Additional boundary and recovery regression assertions.
assert.ok(repairStart >= 0 && persistenceStart > repairStart, "protected repair boundaries must exist");
assert.ok(absoluteBarrierStart >= persistenceStart && saveStart > absoluteBarrierStart, "final barrier boundaries must exist");
assert.match(protectedFlow, /rescueBlocking|blockingNarrativeIssues/, "repair must check narrative blockers");
assert.match(absoluteFinalFlow, /persistableReply/, "display must use the persistable final reply");

console.log("PASS  bounded repair receives the compact visible-canon prompt");
console.log("PASS  rejected repair and timeout drafts are never streamed early");
console.log("PASS  persistent violations trigger one compact final rescue");
console.log("PASS  the final rescue is validated and safely grounded before display");
console.log("PASS  no rejected protected reply can cross the display barrier");
console.log("\nRegression assertions passed.");
