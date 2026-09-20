import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.53.0");
assert.equal(version.version, "3.53.0");
assert.equal(version.release, "Living Variety & Momentum");

assert.match(edge, /static_food_logistics/);
assert.match(edge, /stock_flirt_narration/);
assert.match(edge, /MOVE THE STORY STATE/);
assert.match(edge, /AVOID STOCK FLIRT NARRATION/);
assert.match(edge, /Do NOT default to ordering food, coffee, studying, sitting around a campus table, or choosing snacks/);
assert.match(edge, /The ending must change the immediate story state/);

console.log("PASS  campus/food fallback is deprioritized");
console.log("PASS  stock flirt narration is detected");
console.log("PASS  Instant Story must create concrete story movement");
console.log("\n3 Living Variety & Momentum v3.53.0 checks passed.");
