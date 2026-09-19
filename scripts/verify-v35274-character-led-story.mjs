import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCharacterLedStoryV35274,
  characterLedStoryV35274Issues,
} from "../supabase/functions/character-chat/engine/character-led-story-v35274.js";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

const chase={
  name:"Chase Beaumont",
  personality:"Confident, proud, social, teasing, emotionally guarded.",
  relationship:"Enemies to lovers. He likes the user, but they are not together.",
  role:"University student",
};

const silentPrompt=buildCharacterLedStoryV35274({
  character:chase,
  relationship:{status:"not exclusive"},
  scene:{location:"party"},
  mind:{current_goal:"enjoy the party with friends"},
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:["I don't wanna talk."],
  recentCharacterReplies:["Chase stopped where he was instead of following any closer."],
});
assert.match(silentPrompt,/FULL HANDOFF/);
assert.match(silentPrompt,/The user deliberately gave the character the wheel/);
assert.match(silentPrompt,/INITIATIVE IS NOT CLINGING/);
assert.match(silentPrompt,/may flirt with, date, kiss, hook up with/);
assert.match(silentPrompt,/third person may genuinely interest the character/i);
assert.match(silentPrompt,/20–60 word response/);

const exclusivePrompt=buildCharacterLedStoryV35274({
  character:{...chase,relationship:"Official boyfriend. Exclusive relationship."},
  relationship:{status:"exclusive"},
  latestUserMessage:".",
});
assert.match(exclusivePrompt,/EXCLUSIVE\/COMMITTED/);
assert.match(exclusivePrompt,/Do not introduce cheating/);

const passive=`Chase stayed there and watched her, giving her space. He said nothing.`;
assert.ok(characterLedStoryV35274Issues({
  reply:passive,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentCharacterReplies:[],
}).includes("silent_handoff_dead_end"));

const handedBack=`"Your call. What do you want to do?"`;
assert.ok(characterLedStoryV35274Issues({
  reply:handedBack,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentCharacterReplies:[],
}).includes("silent_handoff_returned_to_user"));

const active=`Chase checked his phone, then pocketed it. "I'm heading back in." He left the terrace and rejoined Marcus by the kitchen before the next song started.`;
assert.deepEqual(characterLedStoryV35274Issues({
  reply:active,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentCharacterReplies:[],
}),[]);

assert.match(edge,/buildCharacterLedStoryV35274/);
assert.match(edge,/\$\{characterLedStoryV35274\}/);
assert.match(edge,/characterLedStoryV35274Issues/);
assert.match(edge,/FIRST_DRAFT_WINS_V35268 = true/);

console.log("PASS  dot/silent continue hands story control to the character");
console.log("PASS  initiative is explicitly separated from clinginess/user-orbit");
console.log("PASS  non-exclusive attraction allows grounded outside romance");
console.log("PASS  explicit exclusivity prevents accidental cheating");
console.log("PASS  passive dead-ends and decision handbacks are detectable");
console.log("\n5 Character-Led Story v3.52.74 checks passed.");
