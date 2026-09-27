import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");

assert.match(edge, /OPENING_DNA_COMPATIBLE_FAMILIES_V35317/);
assert.match(edge, /openingDnaOutputFamiliesV35317/);
assert.match(edge, /FLEXIBLE ECOSYSTEM RULE/);
assert.match(edge, /Roof, patio, driveway, hallway, street outside the house, or afterparty/);

// Extract the two helper functions and family tables with a tiny VM-free check
// through source structure. The important regression here is that "no family
// keywords detected" is accepted instead of treated as drift.
assert.match(edge, /if \(!detected\.length\) return \[\];/);
assert.match(edge, /detected\.some\(\(id\) => compatible\.has\(id\)\)/);

// Ensure the original hard error still exists for genuinely incompatible worlds.
assert.match(edge, /Opening regeneration drifted away from the creator's primary opening/);

console.log("v3.53.17 opening DNA flexibility: PASS");
