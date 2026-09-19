import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

assert.match(edge,/const FIRST_DRAFT_WINS_V35268 = true/);
assert.match(edge,/if \(!FIRST_DRAFT_WINS_V35268 && blocking\.length\)/);
assert.match(edge,/if \(!FIRST_DRAFT_WINS_V35268 && \(blockingNarrativeIssues\(validationIssues\)\.length \|\| remainingHard\.length\)\)/);
assert.match(edge,/if \(!FIRST_DRAFT_WINS_V35268 && \(absoluteFinalBlocking\.length \|\| absoluteFinalHard\.length \|\| regressionFinal\.issues\?\.length\)\)/);
assert.match(edge,/FIRST_DRAFT_WINS_V35268\s*\? \(String\(originalResult\?\.reply/);
assert.match(edge,/if \(!FIRST_DRAFT_WINS_V35268\) \{\s*persistableReply = String\(regressionFinal\.reply/);
assert.match(edge,/blank-reply-recovery/);

const originalIndex=edge.indexOf("const originalResult = result");
const saveIndex=edge.indexOf("const savedMessage =",originalIndex);
const segment=edge.slice(originalIndex,saveIndex);

// The only second model call allowed while FIRST_DRAFT_WINS is true is blank recovery,
// which runs only when there is no first non-empty reply.
const repairGuard=segment.indexOf("if (!FIRST_DRAFT_WINS_V35268 && blocking.length)");
const repairCall=segment.indexOf("repairRoleplayOnceV3({");
assert.ok(repairGuard>-1 && repairCall>repairGuard);

const rescueGuard=segment.indexOf("if (!FIRST_DRAFT_WINS_V35268 && (blockingNarrativeIssues(validationIssues).length || remainingHard.length))");
const rescueCall=segment.indexOf("finalRescue = await callGeminiWithFailover",rescueGuard);
assert.ok(rescueGuard>-1 && rescueCall>rescueGuard);

const blankGuard=segment.indexOf("if (!persistableReply)");
const blankCall=segment.indexOf("const blankRecovery = await callGeminiWithFailover",blankGuard);
assert.ok(blankGuard>-1 && blankCall>blankGuard);

console.log("PASS  first non-empty draft is canonical");
console.log("PASS  bounded repair cannot run in first-draft-wins mode");
console.log("PASS  compact final rescue cannot run in first-draft-wins mode");
console.log("PASS  deterministic final replacement cannot run in first-draft-wins mode");
console.log("PASS  only empty-response recovery may make another model call");
console.log("\n5 First Draft Wins v3.52.68 checks passed.");
