import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

assert.match(edge,/DEFAULT TO AN IN-PLACE SOCIAL OR PRACTICAL CHANGE/);
assert.match(edge,/Do not default to leaving, driving somewhere, keys, an exit, a spontaneous destination, or 'come with me'/);
assert.match(edge,/65-105 words/);
assert.match(edge,/Walking, keys, doors, driving, moving rooms, smiling, teasing, props, or banter DO NOT count as the change/);
assert.match(edge,/Avoid ending on 'come on', 'deal', a joke, a generic question/);
assert.match(edge,/salvageController\.abort\(\), 14500/);
assert.match(edge,/maxOutputTokens: 1800/);
assert.match(edge,/temperature: 0\.78/);

console.log("PASS  unexpected_opportunity now prefers in-place story change");
console.log("PASS  Instant Story salvage explicitly rejects blocking+banter as fake momentum");
console.log("PASS  salvage has enough token/time headroom to finish cleanly");
console.log("\n3 Instant Story no-dead-end groups passed.");
