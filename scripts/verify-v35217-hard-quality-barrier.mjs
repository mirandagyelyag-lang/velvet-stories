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
assert.match(protectedFlow, /throw new Error\("Velvet could not produce a coherent reply without contradicting your latest turn\."\)/);
assert.match(protectedFlow, /streamFinalReply\(result\.reply, "validated-protected-final"\)/);
assert.ok(protectedFlow.indexOf("compact final rescue rejected") < protectedFlow.indexOf("validated-protected-final"));

console.log("PASS  bounded repair receives the compact visible-canon prompt");
console.log("PASS  rejected repair and timeout drafts are never streamed early");
console.log("PASS  persistent violations trigger one compact final rescue");
console.log("PASS  the final rescue is validated before display");
console.log("PASS  no rejected protected reply can cross the display barrier");
console.log("\n5 hard quality-barrier checks passed.");
