import assert from "node:assert/strict";
import { buildYearningEngineV35349, yearningEngineV35349Issues, __testV35349 } from "../supabase/functions/character-chat/engine/yearning-engine-v35349.js";

const theo=buildYearningEngineV35349({
  character:{name:"Theo Calloway",relationship:"mutual attraction"},
  latestUserMessage:"I wasn't there yesterday.",
  recentCharacterReplies:["He had been looking for her between conversations."],
  relationshipState:{attraction:4},
  scene:{location:"party"}
});
assert.match(theo,/accidental preference/);
assert.match(theo,/ABSENCE SALIENCE=true/);

const chase=buildYearningEngineV35349({character:{name:"Chase Beaumont"},relationshipState:{attraction:4}});
assert.match(chase,/restless pull/);

const flat=yearningEngineV35349Issues({
  reply:"He shrugs and keeps talking about the party like nothing changed, then asks what she wants to do next.",
  latestUserMessage:"I was with another guy all night.",
  character:{name:"Nathan Foster",relationship:"attraction"},
  relationshipState:{attraction:5}
});
assert.ok(flat.includes("yearning_opportunity_flattened"));

const dependency=yearningEngineV35349Issues({
  reply:"I can't live without you. You're all I need.",
  character:{name:"Alexander Bennett",relationship:"in love"},
  relationshipState:{attraction:8}
});
assert.ok(dependency.includes("yearning_declared_as_dependency"));

assert.equal(__testV35349.characterYearningSignature({name:"Damon Blackwood"}).mode,"silent ache");
console.log("v3.53.49 Yearning Engine regression checks passed");
