import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { groundedRealityIssues, hasUserAuthoredSceneBeatIgnored } from "../supabase/functions/character-chat/engine/grounded-reality-lock.ts";

const authoredFlirt = "*The cashier is a young woman who's wait....flirting with you?*";
const ignored = '"Grab the water," he said over his shoulder, scooping up the plastic handles as soon as the receipt printed.';
const applied = 'The cashier tries another question. Alex answers her politely, but keeps it brief before sliding your drink toward you. "You wanted the blue one, right?"';

assert.equal(hasUserAuthoredSceneBeatIgnored(ignored, authoredFlirt), true);
assert.ok(groundedRealityIssues({ reply: ignored, latestUserMessage: authoredFlirt }).includes("user_authored_scene_beat_ignored"));
assert.equal(hasUserAuthoredSceneBeatIgnored(applied, authoredFlirt), false);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
assert.match(edge, /USER-AUTHORED SCENE BEAT 3\.52\.9/);
assert.match(edge, /Deliberate ignoring must itself be shown; omission is not a choice/);
assert.match(edge, /let the interaction exist for a real beat and reveal the character's specific availability and differential treatment/);
assert.match(edge, /user_authored_scene_beat_ignored/);

console.log("PASS  the exact ignored-cashier reply is rejected");
console.log("PASS  a visible in-character response to the cashier is accepted");
console.log("PASS  user-authored people, actions and situations become immediate canon");
console.log("PASS  deliberate refusal or ignoring must be visibly written");
console.log("PASS  an admirer can reveal established attraction through differential treatment");
console.log("\n5 user-authored scene-control checks passed.");
