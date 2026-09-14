import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { immediateTurnContinuityIssues } from "../supabase/functions/character-chat/engine/immediate-turn-continuity-v35213.js";

const opening = `They forgot yours. The fact that he had also ordered a spare of the thing you usually chose was much harder to explain as coincidence. You can take mine, or I can go back and make them fix it.`;
const user = `No, it's fine, I'll eat mine`;
const rejected = `Alexander Bennett laughs softly, shaking his head as he pushes the extra container closer to you anyway. "Relax, I ordered two on purpose. Eat."`;
const issues = immediateTurnContinuityIssues(rejected, user, [opening]);

assert.ok(issues.includes("immediate_user_choice_overridden"));
assert.ok(issues.includes("immediate_event_truth_rewritten"));
assert.deepEqual(immediateTurnContinuityIssues(`"Okay." He leaves the spare where it is and goes back to sorting the others.`, user, [opening]), []);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
assert.match(edge, /immediateTurnContinuityIssues\(text, options\.latestUserMessage/);
assert.match(edge, /"immediate_user_choice_overridden"/);
assert.match(edge, /"immediate_event_truth_rewritten"/);

console.log("PASS  exact reported first-turn contradiction is rejected");
console.log("PASS  user's practical choice cannot be silently overridden");
console.log("PASS  consistent in-character acceptance remains valid");
console.log("PASS  deterministic guard runs in the live reply pipeline");
console.log("\n4 first-turn continuity checks passed.");
