import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.52.93");
assert.equal(version.version, "3.52.93");
assert.equal(version.release, "Instant Story Hash Fix");

assert.match(edge, /INSTANT STORY HASH FIX 3\.52\.93/);
assert.match(edge, /function instantStoryHashV35293/);
assert.match(edge, /Math\.imul\(hash, 16777619\)/);
assert.ok(edge.includes("instantStoryHashV35293("));
assert.ok(!edge.includes("instantStoryHash("));

console.log("PASS  Instant Story mode selector has a local hash implementation");
console.log("PASS  undefined instantStoryHash call is gone");
console.log("\n2 Instant Story Hash Fix v3.52.93 checks passed.");
