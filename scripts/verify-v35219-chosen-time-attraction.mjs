import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { establishedAttractionOpportunityIssues } from "../supabase/functions/character-chat/engine/established-attraction-opportunity-v35219.js";

const character = {
  name: "Alexander Bennett",
  relationship: "You've been close friends for years. Alex has never hidden how much he likes you. He flirts openly and goes out of his way to make your life easier.",
  personality: "Alex is confident, witty, and effortlessly charismatic.",
};
const recentUserMessages = [
  "I wanna do something, anything but watch a movie",
  "I don't know, you wanna do something?",
  "What's the excuse? *I say while walking towards the chair where my jacket were*",
];
const recentCharacterReplies = [
  "Grab your jacket if you're actually bailing.",
  "We're allowed to leave a room, you know.",
];
const latestUserMessage = "You are the older one here, you have to deal with them not me";

const bad = `He grinned. "Fine, pass the buck. I'll tell them we're on a vital mission for caffeine and sanity. They'll buy it." He held the door open. "Coming?"`;
const badIssues = establishedAttractionOpportunityIssues({ reply: bad, latestUserMessage, recentUserMessages, recentCharacterReplies, character });
assert.ok(badIssues.includes("chosen_time_attraction_flattened"));
assert.ok(badIssues.includes("delegated_social_task_condescension"));

const good = `"Fine. I'll deal with them." He started toward the living room, then looked back. "Wait for me. I'm taking you somewhere I actually like."`;
assert.deepEqual(establishedAttractionOpportunityIssues({ reply: good, latestUserMessage, recentUserMessages, recentCharacterReplies, character }), []);

const neutralCharacter = { ...character, relationship: "You are classmates who barely know each other." };
assert.deepEqual(establishedAttractionOpportunityIssues({ reply: bad, latestUserMessage, recentUserMessages, recentCharacterReplies, character: neutralCharacter }), []);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const blocking = edge.slice(edge.indexOf("const BLOCKING_NARRATIVE_ISSUES"), edge.indexOf("const REPAIR_TRIGGER_ISSUES"));
assert.match(blocking, /"chosen_time_attraction_flattened"/);
assert.match(blocking, /"delegated_social_task_condescension"/);

console.log("PASS  the exact emotionally flat Alexander reply is rejected");
console.log("PASS  condescension about handling the group is rejected");
console.log("PASS  natural chosen-time interest is accepted without forcing a confession");
console.log("PASS  attraction is never invented for a neutral relationship");
console.log("PASS  both failures are hard-blocked before display");
console.log("\n5 chosen-time attraction checks passed.");
