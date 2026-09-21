import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildIndependentAgencyBoundaryV35311,
  independentAgencyBoundaryV35311Issues,
} from "../supabase/functions/character-chat/engine/independent-agency-boundary-v35311.js";

const alexander={
  name:"Alexander Bennett",
  personality:"Confident, social, capable, charming.",
  relationship:"Close friend.",
};

const opening=`Alex slammed his economics textbook shut, the loud thwack echoing across the empty library table.

"I can stare at macroeconomic graphs until midnight, or we can go crash the bonfire the freshmen set up by the lake," he announced, already zipping up his hoodie.

Three people immediately started packing up their laptops.

Alex grabbed his keys off the table and tossed a roll of mints across to the other end of the desk.

"Come on. If we leave right now, we get the good spot by the water before everyone else wanders over from the dorms."`;

const userOne=`I'll stay, I haven't finished my proyect and it's for monday`;
const replyOne=`Alex stopped zipping his hoodie halfway, his fingers pausing on the nylon pull. He looked at the heavy stacks of paper still scattered across the table, then back up.

"Right. Monday," he said, letting out a short breath before tossing his keys back onto the wood with a dull clatter. "Forget the lake. Give me ten minutes and I'll help you knock out half those references so we can actually leave this place before midnight."`;

const firstIssues=independentAgencyBoundaryV35311Issues({
  reply:replyOne,
  latestUserMessage:userOne,
  recentUserMessages:[userOne],
  recentCharacterReplies:[opening],
  character:alexander,
});
assert.ok(firstIssues.includes("self_owned_plan_abandoned_for_user"));
assert.ok(firstIssues.includes("unsolicited_rescue_reprioritization"));

const userTwo=`No, you guys go, If i finish this early i'll probably go with Jules so just go`;
const replyTwo=`Alex let out a dry, incredulous sound, picking his keys off the table and dropping them back into his pocket.

"Right. Jules. Sure," he said, shaking his head with a short, disbelieving laugh as he stayed put against the edge of the desk. "Go ahead and finish up, then. I'll be right here."`;

const secondIssues=independentAgencyBoundaryV35311Issues({
  reply:replyTwo,
  latestUserMessage:userTwo,
  recentUserMessages:[userOne,userTwo],
  recentCharacterReplies:[opening,replyOne],
  character:alexander,
});
assert.ok(secondIssues.includes("explicit_go_boundary_ignored"));
assert.ok(secondIssues.includes("neutral_npc_mention_jealousized"));
assert.ok(secondIssues.includes("repeated_plan_prop_loop"));

const acceptable=`Alex paused, then nodded once. "Okay. Text me if you change your mind." He caught up with the others heading for the lake, still arguing with one of them about who was driving.`;
const acceptableIssues=independentAgencyBoundaryV35311Issues({
  reply:acceptable,
  latestUserMessage:userTwo,
  recentUserMessages:[userOne,userTwo],
  recentCharacterReplies:[opening,replyOne],
  character:alexander,
});
assert.ok(!acceptableIssues.includes("explicit_go_boundary_ignored"));
assert.ok(!acceptableIssues.includes("self_owned_plan_abandoned_for_user"));
assert.ok(!acceptableIssues.includes("neutral_npc_mention_jealousized"));

const directive=buildIndependentAgencyBoundaryV35311({
  latestUserMessage:userTwo,
  recentUserMessages:[userOne,userTwo],
  recentCharacterReplies:[opening,replyOne],
  character:alexander,
});
assert.match(directive,/HARD TURN LAW/);
assert.match(directive,/Do not prove attachment through compulsory availability/);
assert.match(directive,/Mentioning a friend or NPC is neutral/);

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");
assert.match(edge,/independentAgencyBoundaryV35311Issues/);
assert.match(edge,/explicit_go_boundary_ignored/);
assert.match(edge,/self_owned_plan_abandoned_for_user/);
assert.match(edge,/neutral_npc_mention_jealousized/);
assert.match(edge,/EXPLICIT GO BOUNDARY/);

console.log("PASS  declining Alexander's bonfire does not auto-cancel his plan");
console.log("PASS  ordinary project work does not trigger unsolicited rescue");
console.log("PASS  'you guys go ... just go' cannot become 'I'll be right here'");
console.log("PASS  neutral Jules mention does not manufacture jealousy");
console.log("PASS  repeated keys reaction loop is detected");
console.log("\n5 Independent Agency + Explicit Boundary v3.53.11 checks passed.");
