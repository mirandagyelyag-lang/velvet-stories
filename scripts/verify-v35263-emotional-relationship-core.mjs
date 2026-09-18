import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildEmotionalRelationshipCoreV35263,
  emotionalRelationshipCoreV35263Issues,
} from "../supabase/functions/character-chat/engine/emotional-relationship-core-v35263.js";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");

const character = {
  name: "Chase Beaumont",
  personality: "Confident, smug, observant, proud. He hides concern behind attitude.",
  relationship: "Enemies-to-lovers tension. Chase is already attracted to the user and cares more than he admits.",
  affection_style: "Shows care through attention, staying close and changing plans before he admits feelings.",
};

const latest = `*The guy who I was talking to left the second he saw you* Really? *I say outloud annoyed and then I turned towards you* Can you stop ruining everything? *I was tired of everything*`;

const bad = `"You fading on me?" The smug look vanished instantly, replaced by a brief, sharp frown as he watched the guy hurry off. "I didn't even say a word to him," Chase muttered, rubbing the back of his neck. He looked back down at you, his tone dropping the usual teasing edge. "Hey. Do you want to get out of here? It's way too loud."`;

const badIssues = emotionalRelationshipCoreV35263Issues({
  reply: bad,
  latestUserMessage: latest,
  character,
});
assert.ok(badIssues.includes("emotional_bid_unregistered"));
assert.ok(badIssues.includes("emotional_bid_practical_escape"));
assert.ok(badIssues.includes("relational_hurt_deflected"));
assert.ok(badIssues.includes("attachment_failed_to_affect_behavior"));

const better = `Chase's expression changed before he could stop it. "I didn't know he was going to leave." He looked toward the doorway, then back at you. "And I wasn't trying to ruin it." For once, there was no grin after it. "You've been pissed at me plenty of times. This isn't that. What happened?"`;
assert.deepEqual(emotionalRelationshipCoreV35263Issues({
  reply: better,
  latestUserMessage: latest,
  character,
}), []);

const practicalAfterRegistration = `"I wasn't trying to make tonight worse for you." Chase stopped joking. "I mean that." He stayed there a second, watching your face instead of the room. "If you still want out of here, I'll go with you."`;
assert.equal(emotionalRelationshipCoreV35263Issues({
  reply: practicalAfterRegistration,
  latestUserMessage: latest,
  character,
}).includes("emotional_bid_practical_escape"), false);

assert.deepEqual(emotionalRelationshipCoreV35263Issues({
  reply: `"Okay. I'm grabbing a soda too."`,
  latestUserMessage: "I'm getting a soda.",
  character,
}), []);

const therapistIssues = emotionalRelationshipCoreV35263Issues({
  reply: `"Your feelings are valid. I can hold space for you while you process your feelings."`,
  latestUserMessage: "I'm tired of everything.",
  character,
});
assert.ok(therapistIssues.includes("emotional_care_therapized"));

const confessionIssues = emotionalRelationshipCoreV35263Issues({
  reply: `"Because I'm in love with you. That's why none of this is simple."`,
  latestUserMessage: "I'm tired of everything.",
  character,
});
assert.ok(confessionIssues.includes("distress_forced_romance_confession"));

const brief = buildEmotionalRelationshipCoreV35263({
  character,
  relationship: { stage: "rivals with growing attachment" },
  behavior: {
    relationship_attachment: "increasing",
    relationship_attraction: "established",
    emotional_continuity: "Chase is worried after the last conflict",
  },
  mind: { current_emotion: "concern mixed with guilt" },
  latestUserMessage: latest,
  recentUserMessages: [latest],
  recentCharacterReplies: [bad],
});
assert.match(brief, /FEEL FIRST, THEN SOLVE/);
assert.match(brief, /RELATIONAL HURT MUST LAND/);
assert.match(brief, /ATTACHMENT CHANGES SELECTION/);
assert.match(brief, /EMOTIONAL RESIDUE/);
assert.match(brief, /relationship_attachment/);
assert.match(brief, /HIGH DISTRESS/);

assert.match(edge, /buildEmotionalRelationshipCoreV35263/);
assert.match(edge, /\$\{emotionalRelationshipCoreV35263\}/);
assert.match(edge, /"emotional_bid_practical_escape"/);
assert.match(edge, /EMOTIONAL RELATIONSHIP CORE 3\.52\.63/);
assert.match(edge, /Emotional Relationship Core 3\.52\.63 is intentionally injected/);

console.log("PASS  Chase-style distress cannot be escaped through party logistics");
console.log("PASS  relational hurt must register before technical self-defense");
console.log("PASS  practical help is allowed after emotional registration");
console.log("PASS  neutral turns are not force-romanticized");
console.log("PASS  therapist language and distress-triggered confessions are rejected");
console.log("PASS  attachment continuity and emotional residue reach the live prompt");
console.log("\n6 Emotional Relationship Core v3.52.63 checks passed.");
