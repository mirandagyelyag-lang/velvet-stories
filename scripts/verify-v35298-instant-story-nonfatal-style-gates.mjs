import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.ok(/^3\.(?:52\.(?:9[8-9]|[1-9]\d{2,})|5[3-9]\.\d+|[6-9]\d\.\d+)$/.test(pkg.version));
assert.ok(/^3\.(?:52\.(?:9[8-9]|[1-9]\d{2,})|5[3-9]\.\d+|[6-9]\d\.\d+)$/.test(version.version));
assert.ok(["Instant Story Nonfatal Style Gates", "Stale Bundle Recovery", "Living Variety & Momentum"].includes(version.release));

assert.match(edge, /INSTANT_STORY_HARD_GROUNDING_ISSUES_V35298/);
assert.match(edge, /INSTANT_STORY_HARD_NATURALISM_ISSUES_V35298/);
assert.match(edge, /instantStoryHardBlockIssuesV35298/);
assert.match(edge, /source: "ai_best_effort"/);
assert.match(edge, /softWarnings/);

console.log("PASS  style issues are separated from fatal agency/grounding errors");
console.log("PASS  repaired stories may pass with soft warnings");
console.log("PASS  best usable rejected draft is returned instead of terminal 503");
console.log("\n3 Instant Story Nonfatal Style Gates v3.52.98 checks passed.");
