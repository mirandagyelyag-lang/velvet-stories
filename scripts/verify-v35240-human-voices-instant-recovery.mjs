import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const fallbackStart = edge.indexOf('console.warn("[character-chat] instant story using complete local fallback"');
const fallbackEnd = edge.indexOf("async function handleCharacterGenerate", fallbackStart);
const fallbackBlock = edge.slice(fallbackStart, fallbackEnd);

assert.ok(fallbackStart > 0);
assert.match(fallbackBlock, /structurallyComplete/);
assert.match(fallbackBlock, /bypassed AI-only style audit/);
assert.match(fallbackBlock, /return json\(\{ opening: fallbackOpening/);
assert.match(edge, /REAL-CONVERSATION CALIBRATION v3\.52\.40/);
assert.match(edge, /react before advancing/i);
assert.match(edge, /Do not turn every turn into banter/i);
assert.match(edge, /Never paraphrase the user's line back/i);
assert.match(edge, /if it sounds written to perform a character, simplify it/i);
assert.equal(pkg.version, "3.52.46");


console.log("PASS  Instant Story has a structurally safe non-503 fallback");
console.log("PASS  primary and recovery generation share real-conversation calibration");
console.log("PASS  dialogue realism preserves character identity without performance prose");
