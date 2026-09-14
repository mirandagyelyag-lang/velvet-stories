import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { immediateTurnContinuityIssues } from "../supabase/functions/character-chat/engine/immediate-turn-continuity-v35213.js";

const opening = `They forgot yours. You can take mine, or I can go back and make them fix it.`;
const settledChoice = `Don't, I'll eat the other one, thanks tho`;
const repeatedOffer = `"They're going to start debating the movie choices for another hour," "You sure you don't want the other thing? I can still go."`;
const firstIssues = immediateTurnContinuityIssues(repeatedOffer, settledChoice, [opening], {});
assert.ok(firstIssues.includes("settled_choice_reopened"));
assert.ok(firstIssues.includes("adjacent_dialogue_fragments"));

const permission = `If you wanna take a break from us, take it as your excuse`;
const inventedCare = `I'm fine right here. Besides, if I leave, who's going to make sure you actually eat your dinner instead of just picking at it while you get distracted by the movie?`;
const secondIssues = immediateTurnContinuityIssues(inventedCare, permission, [opening, repeatedOffer], { relationship: "Alex has never hidden how much he likes you." });
assert.ok(secondIssues.includes("unsupported_user_habit_claim"));

assert.deepEqual(immediateTurnContinuityIssues(`"No. I'm good here."`, permission, [opening], {}), []);
assert.deepEqual(immediateTurnContinuityIssues(`"Got it." He leaves the spare untouched.`, settledChoice, [opening], {}), []);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
for (const issue of [...firstIssues, ...secondIssues]) assert.match(edge, new RegExp(`"${issue}"`));

console.log("PASS  'I'll eat the other one' settles the choice semantically");
console.log("PASS  asking again and offering to go again are rejected");
console.log("PASS  adjacent unattributed dialogue fragments are rejected");
console.log("PASS  invented eating and distraction habits are rejected");
console.log("PASS  concise in-character acceptance and staying remain valid");
console.log("\n5 semantic choice-continuity checks passed.");
