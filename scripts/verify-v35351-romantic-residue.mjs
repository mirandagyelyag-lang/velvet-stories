import assert from "node:assert/strict";
import { buildRomanticResidueV35351, romanticResidueV35351Issues, __testV35351 } from "../supabase/functions/character-chat/engine/romantic-residue-v35351.js";

const prompt=buildRomanticResidueV35351({
  character:{name:"Nathan Foster"},
  latestUserMessage:"I haven't seen you in days.",
  recentUserMessages:["We almost kissed before someone interrupted us."],
  recentCharacterReplies:["Nathan had stopped himself at the last second."],
  scene:{location:"house party",present:["Nathan","Antonia","Marcus","Jules"]},
  behavior:{near_miss_count:1,romantic_residue:"distance now feels more noticeable"},
  relationshipState:{current_dynamic:"growing attraction"}
});
assert.match(prompt,/TENSION MEMORY=near_kiss/);
assert.match(prompt,/REUNION PAYOFF=true/);
assert.match(prompt,/SOCIAL MODE=public\/group/);

const loop=buildRomanticResidueV35351({behavior:{near_miss_count:2}});
assert.match(loop,/NEAR-MISS BRAKE IS ACTIVE/);

const reset=romanticResidueV35351Issues({
  reply:"Everything was back to normal, as if nothing happened.",
  behavior:{romantic_residue:"they nearly kissed"},
  relationshipState:{current_dynamic:"attraction"}
});
assert.ok(reset.includes("romantic_residue_relationship_reset"));

assert.equal(__testV35351.publicScene({present:["A","B","C"]}),true);
console.log("v3.53.51 Romantic Residue regression checks passed");
