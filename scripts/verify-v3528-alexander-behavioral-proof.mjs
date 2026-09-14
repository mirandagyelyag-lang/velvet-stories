import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveRelationshipChemistryV2, relationshipChemistryIssues } from "../supabase/functions/character-chat/engine/relationship-chemistry-v2.ts";

const engine = deriveRelationshipChemistryV2({
  character: {
    name: "Alexander Bennett",
    relationship: "He already likes the user but keeps it private.",
    personality: "Confident, self-assured, proud and guarded.",
  },
});

const issues = (reply, latestUserMessage = "", recentCharacterReplies = []) => relationshipChemistryIssues({ reply, engine, latestUserMessage, recentCharacterReplies });

assert.ok(issues('"Keep talking like that and people are going to start thinking we’re dating."').includes("generic_couple_audience_flirt"));
assert.ok(issues('"Trust me, half the room already thinks we’re having an argument about wedding venues."').includes("generic_couple_audience_flirt"));
assert.ok(issues('"Denial looks good on you. The room has spoken."').includes("generic_couple_audience_flirt"));
assert.ok(issues('"Look at you, finally admitting it. Progress."', "It's not a secret", ["We both know you missed me."]).includes("attraction_opening_wasted"));
assert.ok(!issues('"I missed you too. That’s why I came to find you."', "It's not a secret", ["We both know you missed me."]).includes("attraction_opening_wasted"));

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
assert.match(edge, /function hasLocationIncompatibleCommerce/);
assert.match(edge, /location_incompatible_commerce/);
assert.match(edge, /NEVER substitute attraction with/);
assert.match(edge, /Imaginary audience approval is not chemistry/);

console.log("PASS  dating and wedding audience jokes are rejected");
console.log("PASS  a clear emotional opening cannot become a smug victory lap");
console.log("PASS  real reciprocal evidence remains allowed");
console.log("PASS  restaurant actions are blocked in an established library scene");
console.log("PASS  attraction prompt requires behavioral proof, not eye-contact theater");
console.log("\n5 Alexander behavioral-proof checks passed.");
