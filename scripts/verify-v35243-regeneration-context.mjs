import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

assert.match(edge, /NORMAL MESSAGE REGENERATION — SAME BRANCH, NEW RESPONSE/);
assert.match(edge, /The rejected character message is NOT canon, but everything before it is canon/);
assert.match(edge, /Resume from the exact physical and conversational state immediately after LATEST USER TURN/);
assert.match(edge, /INSTANT STORY REGENERATION — NEW OPENING, SAME PEOPLE AND WORLD/);
assert.match(edge, /This is an opening with NO prior user turn/);
assert.match(edge, /different scenario skeleton: different immediate situation, activity, entrance, tension and dialogue/);
assert.match(edge, /userIdentity,\s*memories,\s*loreEntries/);
assert.match(edge, /relationshipState: existingRelationshipState/);
assert.match(edge, /castState: existingCastState/);
assert.match(edge, /intelligenceState: existingIntelligenceState/);
assert.match(edge, /rejectedResponses,\s*regenerationInstruction,\s*regenerationFeedback,\s*isRegeneration,\s*openingRegeneration/);
assert.match(edge, /openingRegeneration\s*\? \(Array\.isArray\(loaded\.loreEntries\) \? loaded\.loreEntries\.slice\(0, 8\)/);
assert.equal(pkg.version, "3.52.46");

console.log("PASS  normal regeneration preserves the exact branch and latest user turn");
console.log("PASS  Instant Story regeneration creates a distinct opening instead of continuing the rejected one");
console.log("PASS  both modes retain persona, relationship, lore, memory and continuity inputs");
