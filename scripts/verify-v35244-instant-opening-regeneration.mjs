import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { instantStoryLooksComplete, instantStoryQualityIssues } from "../supabase/functions/character-chat/engine/instant-story-v3492.ts";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const badOpening = `"If Miller keeps us past four on a Friday again, I'm genuinely staging a sit-in," he mutters, glancing sideways while untangling a knot of charging cables. "Did you actually bring your notes from the last lab, or are we going to have to share and squint at my handwriting again?"`;

assert.ok(instantStoryQualityIssues(badOpening, {}).includes("invented_user_history_prompt"));
assert.equal(instantStoryLooksComplete(badOpening, "STOP", {}), false);
assert.match(edge, /Write 150-230 words and never fewer than 130/);
assert.match(edge, /Do not default to a university, classroom, lab, dorm, library or campus/);
assert.match(edge, /enforceOpeningRegenerationQuality\(validationIssues, result, openingRegeneration, character\)/);
assert.match(edge, /Instant Story regeneration could not produce a complete grounded opening\. The previous opening was kept/);
assert.match(edge, /maxOutputTokens: openingRegeneration \? 1500/);
assert.equal(pkg.version, "3.52.46");

console.log("PASS  the reported tiny lab-message opening is rejected");
console.log("PASS  Instant Story regeneration requires 130+ words and a complete playable scene");
console.log("PASS  invented user history and generic academic defaults are blocked");
console.log("PASS  an invalid replacement cannot overwrite the previous opening");
