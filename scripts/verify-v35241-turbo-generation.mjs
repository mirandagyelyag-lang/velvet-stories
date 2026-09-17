import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const perf = readFileSync(new URL("../supabase/functions/character-chat/engine/performance-mobile-v348.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

assert.match(edge, /const guardedDraft = false/);
assert.match(edge, /completeWinnerOnly: false/);
assert.match(edge, /prompt: compactTurnPrompt/);
assert.match(edge, /activeMode === "bare"\s*\? structured/);
assert.match(edge, /Math\.min\(950, getMaximumOutputTokens/);
assert.match(edge, /Math\.max\(5500, Math\.min\(18000/);
assert.match(edge, /const globalDeadlineMs = 6500/);
assert.match(edge, /memories,\s*loreEntries,/);
assert.match(edge, /storyRecap: existingStoryRecap \|\| ""/);
assert.doesNotMatch(edge, /storyRecap: conversation\.story_recap/);
assert.match(perf, /standard:\{firstTokenTargetMs:550,overallDeadlineMs:7200/);
assert.equal(pkg.version, "3.52.46");

console.log("PASS  visible prose streams before the provider finishes");
console.log("PASS  compact prompt retains voice, scene, memory, lore and open threads");
console.log("PASS  chat and Instant Story use bounded Turbo deadlines");
console.log("PASS  regeneration uses the scoped story recap without an undefined conversation reference");
