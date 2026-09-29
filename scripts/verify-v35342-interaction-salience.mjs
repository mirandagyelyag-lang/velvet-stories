import assert from "node:assert/strict";
import {
  buildInteractionSalienceV35342,
  interactionSalienceIssuesV35342,
  __testV35342,
} from "../supabase/functions/character-chat/engine/interaction-salience-v35342.js";

const alex={name:"Alexander Bennett"};

assert.equal(__testV35342.classifyObservableIntent(
  "Do you mind if we cross arms? *I cross my arm with yours*"
),"approach_closeness");
assert.equal(__testV35342.turnImportance(
  "Do you mind if we cross arms? *I cross my arm with yours*"
),4);

const flat=interactionSalienceIssuesV35342({
  reply:'"Can\'t argue with that logic," Alex said. "Though if we\'re stopping for popcorn, someone needs to hold the line on extra butter."',
  latestUserMessage:"Do you mind if we cross arms? *I cross my arm with yours*",
  recentUserMessages:[],
  character:alex,
});
assert.ok(flat.includes("high_salience_turn_not_registered"));
assert.ok(flat.includes("high_salience_beat_wasted_on_logistics"));
assert.ok(flat.includes("closeness_flattened_into_generic_banter"));
assert.ok(flat.includes("alexander_high_salience_flattened"));

const withdrawal=interactionSalienceIssuesV35342({
  reply:'"Fine," Alex muttered before catching up with Dominic and Carter.',
  latestUserMessage:"Oh shut up *I let go from your arm*",
  recentUserMessages:["*I cross my arm with yours*"],
  character:alex,
});
assert.ok(withdrawal.includes("withdrawal_reset_into_npc_pivot"));

const good=interactionSalienceIssuesV35342({
  reply:'Alex paused when your arm linked with his, surprise flashing across his face before he softened. "Yeah," he said, quieter. "I don\'t mind."',
  latestUserMessage:"Do you mind if we cross arms? *I cross my arm with yours*",
  recentUserMessages:[],
  character:alex,
});
assert.equal(good.length,0);

const directive=buildInteractionSalienceV35342({
  latestUserMessage:"*I cross my arm with yours*",
  recentUserMessages:["*I held your hand*","*I let go*"],
  character:alex,
});
assert.match(directive,/IMPORTANCE HIERARCHY/);
assert.match(directive,/MINIMUM REACTION LAW/);
assert.match(directive,/EMOTIONAL ECHO WINDOW/);
assert.match(directive,/CONTRADICTION ENGINE/);
assert.match(directive,/INTIMACY PROGRESSION/);
assert.match(directive,/DO NOT WASTE THE MOMENT/);
assert.match(directive,/OBSERVABLE INTENT, NOT MIND READING/);

console.log("PASS  user-turn importance is ranked");
console.log("PASS  high-salience beats require a visible reaction");
console.log("PASS  emotional echo and intimacy progression are injected");
console.log("PASS  generic banter/logistics cannot erase closeness");
console.log("PASS  withdrawal cannot reset straight into NPCs");
console.log("\n5 Interaction Salience v3.53.42 groups passed.");
