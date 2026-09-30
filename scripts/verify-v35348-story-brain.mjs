import assert from "node:assert/strict";
import { buildStoryBrainV35348, storyBrainV35348Issues, __testV35348 } from "../supabase/functions/character-chat/engine/story-brain-v35348.js";

const brain=buildStoryBrainV35348({
  character:{name:"Chase Beaumont",personality:"unpredictable"},
  userName:"Antonia",
  latestUserMessage:".",
  recentCharacterReplies:["He gives a small smile and waits.","He glances over, then waits.","He leans back and waits."],
  scene:{location:"house party",activity:"talking",present:["Antonia","Chase"],objects:["phone"]},
  behavior:{unfinished_business:["Chase has not answered the invitation."]},
  storyConsequences:[{status:"active",effect:"A refusal changed how directly Chase pushes."}],
});
assert.match(brain,/STORY BRAIN 3\.53\.48/);
assert.match(brain,/STALL BREAKER IS ACTIVE/);
assert.match(brain,/house party/);
assert.match(brain,/Chase/);

const regenIssues=storyBrainV35348Issues({
  reply:"Come with me. I'm leaving now.",
  recentCharacterReplies:["He watches her.","He waits.","He glances over."],
  isRegeneration:true,
  rejectedResponses:["Come with me. I'm leaving now."]
});
assert.ok(regenIssues.includes("story_brain_regeneration_too_similar"));

const stallIssues=storyBrainV35348Issues({
  reply:"He glances at her, gives a small smile, shifts his weight, says nothing useful, and simply waits for her again without making any decision.",
  recentCharacterReplies:["He gives a small smile and waits.","He glances over, then waits.","He leans back and waits."]
});
assert.ok(stallIssues.includes("story_brain_stagnation_not_broken"));
assert.equal(__testV35348.moveFamily("Come with me."),"invite");
assert.equal(__testV35348.moveFamily("I decided I'm leaving."),"decision");
console.log("v3.53.48 Story Brain regression checks passed");
