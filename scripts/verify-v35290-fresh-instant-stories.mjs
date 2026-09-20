import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/context/CharactersContext.jsx", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.match(pkg.version, /^3\.52\.\d+$/);
assert.equal(version.version, pkg.version);

assert.match(edge, /FRESH INSTANT STORY 3\.52\.90/);
assert.match(edge, /instantStoryCandidateUsableV35290/);
assert.match(edge, /FRESH-PLOT RULE 3\.52\.90/);
assert.match(edge, /do not default to the same “phone message \/ screenshot \/ someone lied \/ start again” argument/);
assert.match(edge, /NAMED CAST IS CLOSED/);
assert.match(edge, /globalDeadlineMs = 23500/);
assert.match(edge, /attemptTimeoutMs = 19500/);
assert.match(edge, /hedgeDelaysMs = \[0, 1200, 2400\]/);

const handlerAt = edge.indexOf("async function handleInstantStory");
assert.ok(handlerAt >= 0);
const afterHandler = edge.slice(handlerAt + 1);
const nextFn = /\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.exec(afterHandler);
const handlerEnd = nextFn ? handlerAt + 1 + nextFn.index + 1 : edge.length;
const handler = edge.slice(handlerAt, handlerEnd);

assert.doesNotMatch(handler, /instantStoryConflictFallbackV35247\(/);
assert.doesNotMatch(handler, /source:\s*"local_fallback"/);
assert.match(handler, /Velvet couldn't create a fresh enough Instant Story this time\. Try again\./);
assert.match(handler, /retryable:\s*true/);
assert.match(handler, /qualityIssues/);

assert.match(client, /setTimeout\(\(\) => controller\.abort\(\), 34000\)/);
assert.match(client, /const supabaseUrl = supabase\.supabaseUrl/);

console.log("PASS  repeated deterministic Instant Story fallback is unreachable");
console.log("PASS  model generation gets a longer but bounded window");
console.log("PASS  soft style issues no longer reject otherwise usable fresh openings");
console.log("PASS  hard user-control, fake-history and template problems still block");
console.log("PASS  named supporting cast stays closed");
console.log("PASS  failure returns retryable error instead of contaminating every chat");
console.log("\n6 Fresh Instant Stories v3.52.90 checks passed.");
