import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildEmotionalMomentumIntegrityV35272,
  emotionalMomentumIntegrityV35272Issues,
} from "../supabase/functions/character-chat/engine/emotional-momentum-integrity-v35272.js";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

const chase={
  name:"Chase Beaumont",
  personality:"Confident, proud, persistent, teasing.",
  conflict_style:"Pushes back, hides vulnerability behind dry humor.",
  affection_style:"Shows interest through attention, jealousy and staying power.",
};

const recent=[
  `Chase caught up to her. "I don't like watching you talk to other people here. I just don't like it."`,
  `Chase kept pace a step behind her, his hands shoved deep into his pockets.`,
  `"I'm not going anywhere," he said, his arms crossed as he watched her.`,
  `"It matters," he said. "Because it's you."`,
];

const selfCancel=`"Just tell me to go back inside and I'll go."`;
assert.ok(emotionalMomentumIntegrityV35272Issues({
  reply:selfCancel,
  latestUserMessage:"What the hell you want from me?",
  recentUserMessages:[],
  recentCharacterReplies:recent,
}).includes("emotional_stance_self_cancelled"));

const stopFollowingGood=`Chase stopped where he was. He didn't come any closer. "Fine. I won't follow you." His jaw almost tightened again, but he caught himself. "Doesn't mean I suddenly don't care."`;
assert.ok(!emotionalMomentumIntegrityV35272Issues({
  reply:stopFollowingGood,
  latestUserMessage:"Stop following me!",
  recentUserMessages:[],
  recentCharacterReplies:recent,
}).includes("stop_following_overread_as_full_disengagement"));

const stopFollowingBad=`Chase turned and went back inside to his friends.`;
assert.ok(emotionalMomentumIntegrityV35272Issues({
  reply:stopFollowingBad,
  latestUserMessage:"Stop following me!",
  recentUserMessages:[],
  recentCharacterReplies:recent,
}).includes("stop_following_overread_as_full_disengagement"));

const repeated=`He stayed a few paces back, his hands in his pockets as he matched her stride.`;
const repeatedIssues=emotionalMomentumIntegrityV35272Issues({
  reply:repeated,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:["I don't wanna talk!"],
  recentCharacterReplies:recent,
});
assert.ok(repeatedIssues.includes("repeated_hands_in_pockets"));
assert.ok(repeatedIssues.includes("repeated_following_geometry"));

const prompt=buildEmotionalMomentumIntegrityV35272({
  character:chase,
  latestUserMessage:"Stop following me!",
  recentUserMessages:[],
  recentCharacterReplies:recent,
});
assert.match(prompt,/BOUNDARY=stop_following/);
assert.match(prompt,/Stop the physical pursuit immediately/);
assert.match(prompt,/do not invent a stronger 'leave forever \/ emotionally disengage' boundary/);
assert.match(prompt,/NO SELF-CANCELLATION/);
assert.match(prompt,/HUMOR CAN DEFEND, NOT ERASE/);
assert.match(prompt,/SILENT CONTINUE MUST CHANGE THE BEAT/);
assert.match(prompt,/hands-in-pockets/);
assert.match(prompt,/following-distance\/pace/);

assert.match(edge,/buildEmotionalMomentumIntegrityV35272/);
assert.match(edge,/\$\{emotionalMomentumIntegrityV35272\}/);
assert.match(edge,/emotionalMomentumIntegrityV35272Issues/);
assert.match(edge,/FIRST_DRAFT_WINS_V35268 = true/);

console.log("PASS  charged stance cannot instantly cancel itself");
console.log("PASS  stop-following is not overread as full emotional disengagement");
console.log("PASS  repeated pursuit choreography is detectable");
console.log("PASS  prompt preserves defensive humor without emotional reset");
console.log("PASS  emotional momentum is injected before First Draft Wins");
console.log("\n5 Emotional Momentum v3.52.72 checks passed.");
