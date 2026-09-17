import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { instantStoryHasTemplateLeak } from "../supabase/functions/character-chat/engine/instant-story-v3492.ts";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const reported = `Alexander Bennett was at the station concourse, checking the departure board against a booking on the phone. He put the two replacement tickets where it could be checked without turning the problem into a speech. He had also kept the useful option open for you. There was no invented emergency in the gesture, only a real deadline and his refusal to waste it by circling the same question.`;

assert.equal(instantStoryHasTemplateLeak(reported), true);
assert.doesNotMatch(edge, /where it could be checked without turning the problem into a speech/);
assert.doesNotMatch(edge, /There was no invented emergency in the gesture/);
assert.doesNotMatch(edge, /kept the useful option open for you/);
assert.match(edge, /had already spoken to the person in charge and confirmed that both alternatives were real/);
assert.match(edge, /“Or \$\{plan\.second\.replace/);
assert.equal(pkg.version, "3.52.46");

console.log("PASS  the reported confusing station prose is rejected as leaked template language");
console.log("PASS  fallback scenes explain the problem and alternatives in ordinary English");
console.log("PASS  plural agreement and option capitalization are repaired");
