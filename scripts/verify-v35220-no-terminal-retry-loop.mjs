import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGroundedLastResortReply } from "../supabase/functions/character-chat/engine/established-attraction-opportunity-v35219.js";

const character = { name: "Alexander Bennett", relationship: "Alex has never hidden how much he likes you." };
const latestUserMessage = "You are the older one here, you have to deal with them not me";
const failures = ["chosen_time_attraction_flattened", "delegated_social_task_condescension"];

const replies = Array.from({ length: 4 }, () => buildGroundedLastResortReply({ character, latestUserMessage, issues: failures }));
assert.equal(new Set(replies).size, 1);
assert.match(replies[0], /I’ll handle them/);
assert.match(replies[0], /Wait for me/);
assert.match(replies[0], /I want to do this with you/);
assert.doesNotMatch(replies[0], /pass the buck|Retry|could not produce/i);

const refusal = buildGroundedLastResortReply({ character, latestUserMessage: "No, don't do that", issues: ["settled_choice_reopened"] });
assert.match(refusal, /stops instead of pushing/);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const rescueStart = edge.indexOf("let finalRescue: ModelResult | null = null");
const rescueEnd = edge.indexOf("if (guardedDraft && blocking.length)", rescueStart);
const rescueFlow = edge.slice(rescueStart, rescueEnd);
assert.doesNotMatch(rescueFlow, /throw new Error/);
assert.match(rescueFlow, /buildGroundedLastResortReply/);
assert.match(rescueFlow, /using deterministic grounded reply/);
assert.match(rescueFlow, /catch \(finalRescueError\)/);
assert.match(rescueFlow, /if \(!finalRescue \|\| rescueBlocking\.length \|\| rescueHard\.length\)/);

console.log("PASS  four consecutive rejected rescues resolve to a visible reply");
console.log("PASS  Alexander accepts responsibility and keeps chosen-time attraction visible");
console.log("PASS  explicit refusals receive a non-pushing fallback");
console.log("PASS  the terminal rescue path cannot throw the old Retry error");
console.log("PASS  a failed Gemini rescue call also resolves locally");
console.log("\n5 terminal retry-loop checks passed.");
