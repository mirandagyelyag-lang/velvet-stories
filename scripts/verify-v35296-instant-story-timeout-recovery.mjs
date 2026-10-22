import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const ctx = readFileSync(new URL("../src/context/CharactersContext.jsx", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.match(pkg.version, /^\d+\.\d+\.\d+$/, "current package version must be semantic");
assert.equal(version.version, pkg.version, "published version must match package");
assert.ok(typeof version.release === "string" && version.release.trim(), "release label must be present");

assert.match(edge, /const globalDeadlineMs = 16500;/);
assert.match(edge, /const attemptTimeoutMs = 14500;/);
assert.match(edge, /const hedgeDelaysMs = \[0, 700, 1400\];/);
assert.match(edge, /thinkingConfig: \{ thinkingLevel: "LOW" \}/);
assert.match(edge, /const rescueTimeoutId = setTimeout\(\(\) => rescueController\.abort\(\), 12000\);/);
assert.match(ctx, /setTimeout\(\(\) => controller\.abort\(\), 36000\)/);

console.log("PASS  primary Instant Story budget ends before client timeout");
console.log("PASS  rescue has an explicit 12s deadline");
console.log("PASS  client leaves recovery headroom");
console.log("\n3 Instant Story Timeout Recovery v3.52.96 checks passed.");
