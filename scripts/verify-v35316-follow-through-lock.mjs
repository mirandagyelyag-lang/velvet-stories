import assert from "node:assert/strict";
import { characterLedStoryV35274Issues, buildCharacterLedStoryV35274 } from "../supabase/functions/character-chat/engine/character-led-story-v35274.js";
import { buildGroundedLastResortReply } from "../supabase/functions/character-chat/engine/established-attraction-opportunity-v35219.js";

const opening = `The bass from the living room shook the floorboards. Chase stepped into your line of sight.
“The back patio's locked, but Jim left the roof stairs open. Or we can stay down here. Your choice.”
Without waiting to debate it, he turned toward the side exit and pushed the heavy fire door open.`;

const dropped = characterLedStoryV35274Issues({
  reply: `Chase goes quiet, watching you for a beat. “I’m listening.”`,
  latestUserMessage: `*I sigh and I follow you* This party sucks`,
  recentCharacterReplies: [opening],
});
assert.ok(dropped.includes("active_plan_followthrough_dropped"));

const continued = characterLedStoryV35274Issues({
  reply: `Chase keeps moving toward the roof stairs. “Yeah. That's why we're getting out of there.”`,
  latestUserMessage: `*I sigh and I follow you* This party sucks`,
  recentCharacterReplies: [opening],
});
assert.ok(!continued.includes("active_plan_followthrough_dropped"));

const cancelled = characterLedStoryV35274Issues({
  reply: `Chase stops at the door. “Fine.”`,
  latestUserMessage: `Wait, no. I don't want to go anymore.`,
  recentCharacterReplies: [opening],
});
assert.ok(!cancelled.includes("active_plan_followthrough_dropped"));

const fallback = buildGroundedLastResortReply({
  character: { name: "Chase Beaumont", personality: "guarded, proud, competitive" },
  latestUserMessage: `*I sigh and I follow you* This party sucks`,
  recentCharacterReplies: [opening],
  issues: ["active_plan_followthrough_dropped"],
});
assert.match(fallback, /roof stairs|keeps moving/i);
assert.doesNotMatch(fallback, /i.?m listening/i);

const directive = buildCharacterLedStoryV35274({
  character: { name: "Chase Beaumont" },
  latestUserMessage: `*I sigh and I follow you* This party sucks`,
  recentCharacterReplies: [opening],
});
assert.match(directive, /FOLLOW-THROUGH LOCK 3\.53\.16/);
assert.match(directive, /CONTINUE, MODIFY or EXPLICITLY CANCEL/);

console.log("v3.53.16 follow-through lock: PASS");
