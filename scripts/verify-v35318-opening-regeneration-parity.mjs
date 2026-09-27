import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");

assert.match(edge, /instantStoryCandidateUsableV35290\(result\?\.reply/);
assert.match(edge, /TARGET 70-130 WORDS; hard ceiling 165/);
assert.match(edge, /A concise 55\+ word opening is acceptable/);
assert.doesNotMatch(edge, /Write 150-230 words and never fewer than 130/);

const finalGuard = edge.match(/openingRegeneration && !instantStoryCandidateUsableV35290\(persistableReply,[\s\S]{0,220}?previous opening was kept/);
assert.ok(finalGuard, "final regeneration guard should use current Instant Story usability standard");

console.log("v3.53.18 opening regeneration parity: PASS");
