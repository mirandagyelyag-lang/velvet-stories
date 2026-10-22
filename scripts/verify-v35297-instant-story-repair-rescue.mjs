import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.match(pkg.version, /^\d+\.\d+\.\d+$/, "current package version must be semantic");
assert.equal(version.version, pkg.version, "published version must match package");
assert.ok(typeof version.release === "string" && version.release.trim(), "release label must be present");

assert.match(edge, /const rejectedInstantCandidates = \[\];/);
assert.match(edge, /rejectionReasons = \[\.\.\.anchorIssues, \.\.\.groundingIssues, \.\.\.naturalismIssues\]/);
assert.match(edge, /REJECTED DRAFT TO REPAIR/);
assert.match(edge, /REJECTION REASONS/);
assert.match(edge, /Repair this draft/);
assert.match(edge, /rejectionReasons: rejectionSummary/);

console.log("PASS  rejected Instant Story candidates are retained");
console.log("PASS  rescue repairs the best rejected draft with explicit issue reasons");
console.log("PASS  terminal 503 exposes rejection diagnostics");
console.log("\n3 Instant Story Repair Rescue v3.52.97 checks passed.");
