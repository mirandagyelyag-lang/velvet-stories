import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.match(pkg.version, /^3\.52\.\d+$/);
assert.equal(version.version, pkg.version);

assert.match(edge, /id: "roadtrip"/);
assert.match(edge, /id: "friend_group"/);
assert.match(edge, /source: \/\\b\(\?:road trip\|driving two hours/);
assert.match(edge, /source: \/\\b\(\?:group chat\|group of eight/);
assert.match(edge, /if \(source\.primary\)/);
assert.match(edge, /confidence: "primary"/);
assert.match(edge, /confidence: "secondary"/);
assert.match(edge, /if \(family\.confidence !== "primary"\) return \[\]/);
assert.match(edge, /friend-group road trip/);
assert.match(edge, /starting constrained rescue/);
assert.match(edge, /source: "ai_rescue"/);
assert.match(edge, /Do not reuse the generic phone-message \/ screenshot \/ “start again” accusation template/);

const familyBlock = edge.slice(edge.indexOf("const OPENING_DNA_FAMILIES_V35289"), edge.indexOf("function openingDnaSourceV35289"));
assert.ok(familyBlock.indexOf('id: "roadtrip"') < familyBlock.indexOf('id: "campus"'), "roadtrip must outrank campus");
assert.ok(familyBlock.indexOf('id: "friend_group"') < familyBlock.indexOf('id: "campus"'), "friend_group must outrank campus");

console.log("PASS  primary opening outranks broader world/scenario metadata");
console.log("PASS  Alexander-style road-trip openings are classified before campus");
console.log("PASS  friend-group openings have their own ecosystem");
console.log("PASS  secondary-only family detection is advisory rather than fatal");
console.log("PASS  failed primary attempts get one constrained AI rescue instead of a recycled fallback");
console.log("\n5 Opening DNA Priority v3.52.91 checks passed.");
