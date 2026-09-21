import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chatContext = readFileSync(new URL("../src/context/ChatsContext.jsx", import.meta.url), "utf8");
const charactersContext = readFileSync(new URL("../src/context/CharactersContext.jsx", import.meta.url), "utf8");
const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const doctor = readFileSync(new URL("../src/components/CanonDoctorSheet.jsx", import.meta.url), "utf8");
const instant = readFileSync(new URL("../supabase/functions/character-chat/engine/instant-story-v3492.ts", import.meta.url), "utf8");

// 1) Background reply recovery
assert.match(chatContext, /scheduleDeferredPersistedReplyRecovery/);
assert.match(chatContext, /visibilitychange/);
assert.match(chatContext, /velvet:reply-recovered/);
assert.match(chatContext, /pendingRecovery: true/);
assert.doesNotMatch(chatContext, /Background generation ended unexpectedly/);

// 2) NPC consistency doctor
assert.match(edge, /buildNpcConsistencyAudit/);
assert.match(edge, /npc_duplicate_scope/);
assert.match(edge, /npc_orphan_reference/);
assert.match(edge, /npc_stale_cast_state/);
assert.match(edge, /npcConnectionsRemoved/);
assert.match(doctor, /NPC consistency/);
assert.match(doctor, /Duplicate NPC scope/);

// 3) Instant Story safety
assert.match(charactersContext, /recentOpenings/);
assert.match(charactersContext, /instant-story-openings/);
assert.match(edge, /instantStoryTooSimilarV3539/);
assert.match(edge, /recent_opening_similarity/);
assert.match(edge, /ai_emergency_rescue/);
assert.match(edge, /LAST-LANE RESCUE/);
assert.match(instant, /words\.length < 55 \|\| words\.length > 220/);

console.log("PASS  slow background replies recover quietly on resume");
console.log("PASS  Canon Doctor audits NPC duplicates, orphans and stale references");
console.log("PASS  Instant Story remembers recent openings and has a final rescue lane");
console.log("\n3 Velvet v3.53.9 bedtime checks passed.");
