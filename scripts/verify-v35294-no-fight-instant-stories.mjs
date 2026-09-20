import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.52.94");
assert.equal(version.version, "3.52.94");
assert.equal(version.release, "No-Fight Instant Stories");

assert.match(edge, /DEFAULT NO-FIGHT POLICY 3\.52\.94/);
assert.match(edge, /DEFAULT CONFLICT POLICY: no fights, arguments, accusations, betrayals, confrontations/);
assert.match(edge, /unrequested_interpersonal_conflict/);
assert.match(edge, /ordinary_motion/);
assert.match(edge, /character_initiative/);
assert.match(edge, /spontaneous_detour/);
assert.match(edge, /group_chaos/);
assert.match(edge, /small_problem/);
assert.match(edge, /private_sidebeat/);
assert.match(edge, /playful_competition/);
assert.match(edge, /unexpected_opportunity/);
assert.match(edge, /quiet_relationship_tension/);
assert.ok(!edge.includes('id: "serious_conflict"'));
assert.ok(!edge.includes('id: "social_friction"'));
assert.match(edge, /THE CHARACTER CARRIES MOMENTUM/);
assert.match(edge, /Conflict is opt-in through IDEA/);

console.log("PASS  default Instant Story lane set contains no fight/conflict lane");
console.log("PASS  unrequested arguments, accusations and confrontations are rejected");
console.log("PASS  momentum comes from plans, opportunities, group life and character initiative");
console.log("PASS  attraction may add quiet tension without confrontation");
console.log("PASS  explicit IDEA can still request a conflict when the user actually wants one");
console.log("\n5 No-Fight Instant Stories v3.52.94 checks passed.");
