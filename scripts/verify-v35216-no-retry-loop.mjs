import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const chat = readFileSync(new URL("../src/pages/Chat.jsx", import.meta.url), "utf8");

assert.match(edge, /function buildCompactLiveRecoveryPrompt/);
assert.match(edge, /prompt: compactTurnPrompt/);
assert.match(edge, /slice\(-10\)/);
assert.match(edge, /maxOutputTokens: Math\.min\(1100/);
assert.doesNotMatch(edge.slice(edge.indexOf("} catch (streamFailure)"), edge.indexOf("const firstDraftDurationMs")), /\n\s+prompt,\n/);
assert.match(edge, /quota \? "Gemini's quota is exhausted right now\. Retrying the same reply won't fix it/);
assert.match(chat, /Gemini's quota is exhausted right now\. Retrying the same reply won't work/);

console.log("PASS  failed streaming switches to a compact ten-turn recovery prompt");
console.log("PASS  recovery no longer repeats the oversized full prompt");
console.log("PASS  compact recovery output is bounded for faster completion");
console.log("PASS  exhausted quota is reported honestly instead of requesting useless retries");
console.log("\n4 retry-loop recovery checks passed.");
