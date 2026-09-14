import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveRelationshipChemistryV2 } from "../supabase/functions/character-chat/engine/relationship-chemistry-v2.ts";

const alexander = deriveRelationshipChemistryV2({
  character: {
    name: "Alexander",
    relationship: "He already likes the user but keeps it private.",
    personality: "Confident, self-assured, cold, feared and dangerous.",
  },
});

assert.equal(alexander.personalityManifestation.attractionCanonExplicit, true);
assert.match(alexander.personalityManifestation.attractionVisibility, /may not become invisible/i);
assert.match(alexander.personalityManifestation.confidenceStyle, /calm initiative/i);
assert.match(alexander.personalityManifestation.coldStyle, /selective exceptions/i);
assert.match(alexander.personalityManifestation.dangerStyle, /competence, command/i);
assert.match(alexander.personalityManifestation.policy, /do not flatten attraction or personality/i);

const neutral = deriveRelationshipChemistryV2({ character: { personality: "Friendly and observant." } });
assert.equal(neutral.personalityManifestation.attractionCanonExplicit, false);
assert.match(neutral.personalityManifestation.attractionVisibility, /do not invent attraction/i);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
assert.match(edge, /CHARACTER PRESENCE \+ FELT ATTRACTION 3\.52\.7/);
assert.match(edge, /Slow burn limits milestones, not signals/);
assert.match(edge, /The user must remain free to feel anything/);
assert.match(edge, /A confident character may risk a clear invitation/);

console.log("PASS  explicit attraction remains behaviorally perceptible");
console.log("PASS  confidence changes initiative instead of causing endless stalling");
console.log("PASS  coldness creates selective access and legible exceptions");
console.log("PASS  danger appears through competence, command and consequences");
console.log("PASS  user emotion and reciprocity remain user-owned");
console.log("\n5 character-presence checks passed.");
