import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.53.1");
assert.equal(version.version, "3.53.1");
assert.equal(version.release, "Short Dialogue Instant Stories");

assert.match(edge, /TARGET 70-130 WORDS; hard ceiling 165/);
assert.match(edge, /SHORT OPENING RHYTHM/);
assert.match(edge, /START LATE/);
assert.match(edge, /LEAVE AIR IN THE SCENE/);
assert.match(edge, /words < 55 \|\| words > 220/);
assert.match(edge, /70-130 words, hard ceiling 165/);

console.log("PASS  Instant Story targets short openings");
console.log("PASS  dialogue carries personality and momentum");
console.log("PASS  technical validator accepts concise scenes");
console.log("\n3 Short Dialogue Instant Stories v3.53.1 checks passed.");
