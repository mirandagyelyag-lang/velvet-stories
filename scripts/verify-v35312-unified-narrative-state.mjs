import assert from "node:assert/strict";
import { buildUnifiedNarrativeStateV35312, unifiedNarrativeStateIssuesV35312, instantStoryStateFamilyIssuesV35312, __testV35312 } from "../supabase/functions/character-chat/engine/unified-narrative-state-v35312.js";

assert.equal(__testV35312.isSilentContinue("."), true);
assert.equal(__testV35312.isLowBandwidthUserTurn("mhm"), true);
assert.equal(__testV35312.meaningfulBeat("He grabbed his keys."), false);
assert.equal(__testV35312.meaningfulBeat('He shook his head. "No. I\'m coming with you." He cancelled the ride.'), true);
assert.equal(__testV35312.sceneFamily("The party was already packed."), "party");

const prompt=buildUnifiedNarrativeStateV35312({
  character:{name:"Chase",personality:"competitive, emotionally guarded",speech_style:"short, dry"},
  latestUserMessage:".",
  recentCharacterReplies:["At a house party he intercepted her near the kitchen.","At another party he redirected the group outside."],
  intelligenceState:{relationship_emotion_core:{jealousy:52,attachment:44},human_behavior_state:{unfinished_business:["apology pending"]}},
  worldConsequences:{activeChains:[{effect:"trust is strained"}]},
});
assert.match(prompt,/DOT CONTINUATION/);
assert.match(prompt,/CONSEQUENCES SURVIVE SCENE CHANGES/);

const issues=unifiedNarrativeStateIssuesV35312({
  reply:"He looked at her and waited, giving a small nod.",
  latestUserMessage:".",
  recentCharacterReplies:["He watched her from across the room."],
  character:{personality:"competitive, emotionally guarded"},
});
assert.ok(issues.includes("dot_continuation_no_state_change"));

const familyIssues=instantStoryStateFamilyIssuesV35312(
  "The party was crowded when he cut across the room.",
  ["At a party he found her by the stairs.","The house party had barely started when he interrupted."]
);
assert.ok(familyIssues.includes("instant_story_scene_family_overused"));

console.log("v3.53.12 unified narrative state: PASS");
