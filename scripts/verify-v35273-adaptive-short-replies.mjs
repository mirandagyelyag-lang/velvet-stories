import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

assert.match(edge,/function isSeriousDevelopmentBeat/);
assert.match(edge,/20–60 words for ordinary conversation/);
assert.match(edge,/Aim for 40–80 words\. You may go up to about 120 only when the emotional beat truly needs development/);
assert.match(edge,/15–45 words\. Add ONE meaningful beat/);
assert.match(edge,/Character preference for long replies never overrides this brevity rule/);
assert.match(edge,/Do not write 100–200 words for a casual beat/);
assert.match(edge,/Length: \$\{getLengthGuidance\(character\.response_length, turnIntent\.kind, latestUserRecord\?\.content \|\| ""\)\}/);
assert.match(edge,/REPLY LENGTH\n\$\{openingRegeneration \? "Instant Story opening keeps its dedicated opening length\." : getLengthGuidance/);

// Old default budgets that encouraged over-writing must not remain in the active helper.
const helperStart=edge.indexOf("function isSeriousDevelopmentBeat");
const helperEnd=edge.indexOf("function getMaximumOutputTokens",helperStart);
const helper=edge.slice(helperStart,helperEnd);
assert.doesNotMatch(helper,/100–250 words/);
assert.doesNotMatch(helper,/45–140 words/);
assert.doesNotMatch(helper,/45–130 words/);
assert.doesNotMatch(helper,/35–110 words/);

// Serious beats still have room instead of being hard-truncated to 60.
assert.match(helper,/confrontation/);
assert.match(helper,/love you/);
assert.match(helper,/cry/);
assert.match(helper,/up to about 120/);

console.log("PASS  ordinary turns target 20–60 words");
console.log("PASS  silent continues target 15–45 words");
console.log("PASS  serious emotional beats may expand when needed");
console.log("PASS  old 100–250/45–140 reply budgets are removed");
console.log("PASS  First Draft prompt and blank recovery both receive adaptive length guidance");
console.log("\n5 Adaptive Short Replies v3.52.73 checks passed.");
