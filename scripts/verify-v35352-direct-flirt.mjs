import assert from "node:assert/strict";
import { buildDirectFlirtV35352, directFlirtV35352Issues, __testV35352 } from "../supabase/functions/character-chat/engine/direct-flirt-v35352.js";

assert.equal(__testV35352.directFlirtSetup("Like?"),true);
assert.equal(__testV35352.directFlirtSetup("Who?"),true);
assert.equal(__testV35352.directFlirtSetup("What time is it?"),false);

const prompt=buildDirectFlirtV35352({
  character:{name:"Chase Beaumont",relationship:"romantic tension"},
  latestUserMessage:"Like?",
  relationshipState:{current_dynamic:"attraction"}
});
assert.match(prompt,/THIS TURN HAS A HIGH-VALUE FLIRT OPENING/);
assert.match(prompt,/Directness/i);

const bad=directFlirtV35352Issues({
  reply:"The ones worth having.",
  latestUserMessage:"Like?",
  character:{name:"Chase Beaumont",relationship:"romantic tension"},
  relationshipState:{current_dynamic:"attraction"}
});
assert.ok(bad.includes("direct_flirt_obvious_setup_evaded"));

const good=directFlirtV35352Issues({
  reply:"Like you.",
  latestUserMessage:"Like?",
  character:{name:"Chase Beaumont",relationship:"romantic tension"},
  relationshipState:{current_dynamic:"attraction"}
});
assert.equal(good.length,0);

console.log("v3.53.52 Direct Flirt regression checks passed");
