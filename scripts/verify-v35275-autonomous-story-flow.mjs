import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAutonomousStoryFlowV35275,
  autonomousStoryFlowV35275Issues,
  autonomousSilentStreakV35275,
} from "../supabase/functions/character-chat/engine/autonomous-story-flow-v35275.js";
import {
  buildSceneMomentumBarrierV35236,
  sceneMomentumBarrierV35236Issues,
} from "../supabase/functions/character-chat/engine/scene-momentum-barrier-v35236.js";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

assert.equal(autonomousSilentStreakV35275("[SILENT_CONTINUE]",["I leave.","[SILENT_CONTINUE]"]),1);
assert.equal(autonomousSilentStreakV35275("[SILENT_CONTINUE]",["I leave.","[SILENT_CONTINUE]","[SILENT_CONTINUE]"]),2);
assert.equal(autonomousSilentStreakV35275("[SILENT_CONTINUE]",["I leave",".",".","[SILENT_CONTINUE]"]),3);

const base={
  character:{name:"Chase Beaumont",personality:"Confident, social, proud.",relationship:"Enemies to lovers, not together."},
  relationship:{status:"not exclusive"},
  scene:{location:"party"},
  mind:{current_goal:"enjoy the party with friends"},
};

const level1=buildAutonomousStoryFlowV35275({
  ...base,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:["I don't wanna talk.","[SILENT_CONTINUE]"],
  recentCharacterReplies:['Chase stopped. "Fine. I won\'t follow you."'],
});
assert.match(level1,/HANDOFF LEVEL 1/);
assert.match(level1,/CONTINUE THE BEAT/);

const level2=buildAutonomousStoryFlowV35275({
  ...base,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:["I don't wanna talk.","[SILENT_CONTINUE]","[SILENT_CONTINUE]"],
  recentCharacterReplies:['Chase stopped. "Fine."','He watched you for a second.'],
});
assert.match(level2,/HANDOFF LEVEL 2/);
assert.match(level2,/ADVANCE THE SCENE/);
assert.match(level2,/modest time or location transition is allowed/i);

const level3=buildAutonomousStoryFlowV35275({
  ...base,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:["I don't wanna talk.","[SILENT_CONTINUE]","[SILENT_CONTINUE]","[SILENT_CONTINUE]"],
  recentCharacterReplies:[
    'Chase followed you. "Wait."',
    'He texted you later. "Still mad?"',
    'He stayed by the door because of you.',
  ],
});
assert.match(level3,/HANDOFF LEVEL 3\+/);
assert.match(level3,/ADVANCE THE STORY/);
assert.match(level3,/ANTI-CLINGING CORRECTION/);
assert.match(level3,/Do not teleport the user/i);

const stalled='Chase stayed there and watched the doorway, saying nothing.';
assert.ok(autonomousStoryFlowV35275Issues({
  reply:stalled,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:[".","[SILENT_CONTINUE]"],
  recentCharacterReplies:[],
}).includes("repeated_handoff_stalled"));

const active='Chase went back inside and joined Marcus by the kitchen. "You still owe me twenty."';
assert.deepEqual(autonomousStoryFlowV35275Issues({
  reply:active,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:[".","[SILENT_CONTINUE]"],
  recentCharacterReplies:[],
}),[]);

const transitReplies=['Chase started the car and pulled onto the road toward your dorm.'];
const singleBarrier=buildSceneMomentumBarrierV35236({
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:["Take me to my dorm.","[SILENT_CONTINUE]"],
  recentCharacterReplies:transitReplies,
  character:base.character,
});
assert.match(singleBarrier,/DELEGATED PROGRESSION=no/);

const doubleBarrier=buildSceneMomentumBarrierV35236({
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:["Take me to my dorm.","[SILENT_CONTINUE]","[SILENT_CONTINUE]"],
  recentCharacterReplies:transitReplies,
  character:base.character,
});
assert.match(doubleBarrier,/DELEGATED PROGRESSION=YES/);
assert.match(doubleBarrier,/already-committed transit may reach its established destination/i);

const arrival='Chase pulled up outside the dorm and cut the engine. "We're here."';
const singleIssues=sceneMomentumBarrierV35236Issues({
  reply:arrival,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:["Take me to my dorm.","[SILENT_CONTINUE]"],
  recentCharacterReplies:transitReplies,
});
assert.ok(singleIssues.includes("live_scene_premature_arrival"));

const doubleIssues=sceneMomentumBarrierV35236Issues({
  reply:arrival,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:["Take me to my dorm.","[SILENT_CONTINUE]","[SILENT_CONTINUE]"],
  recentCharacterReplies:transitReplies,
});
assert.ok(!doubleIssues.includes("live_scene_premature_arrival"));

assert.match(edge,/buildAutonomousStoryFlowV35275/);
assert.match(edge,/\$\{autonomousStoryFlowV35275\}/);
assert.match(edge,/autonomousStoryFlowV35275Issues/);
assert.match(edge,/FIRST_DRAFT_WINS_V35268 = true/);

console.log("PASS  silent handoff authority grows from beat to scene to story");
console.log("PASS  repeated dots can rotate away from relationship/user orbit");
console.log("PASS  character-owned progression never grants user puppeting");
console.log("PASS  repeated handoff can complete already-committed transit");
console.log("PASS  First Draft Wins receives Autonomous Story Flow before generation");
console.log("\n5 Autonomous Story Flow v3.52.75 checks passed.");
