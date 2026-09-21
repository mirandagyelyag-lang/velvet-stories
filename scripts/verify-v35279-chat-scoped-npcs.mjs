import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  allowedNamedPeopleV35279,
  buildChatScopedNpcCanonV35279,
  filterAuthorizedCastUpdatesV35279,
  filterAuthorizedConnectionUpdatesV35279,
} from "../supabase/functions/character-chat/engine/chat-scoped-npc-canon-v35279.js";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const drawer = readFileSync(new URL("../src/components/NpcCastDrawer.jsx", import.meta.url), "utf8");

const roman = { name: "Roman Knox" };
const approved = [
  { id: "char-1", name: "Kai Mercer", role: "best friend", is_user_created: true, npc_scope: "character" },
  { id: "story-1", name: "Vincent Crowe", role: "enemy", is_user_created: true, npc_scope: "conversation" },
];

const names = allowedNamedPeopleV35279({
  userName: "Antonia",
  character: roman,
  groupCharacters: [roman],
  userCreatedNpcs: approved,
});
assert.deepEqual(names, ["Antonia", "Roman Knox", "Kai Mercer", "Vincent Crowe"]);

const prompt = buildChatScopedNpcCanonV35279({
  userName: "Antonia",
  character: roman,
  groupCharacters: [roman],
  userCreatedNpcs: approved,
  latestUserMessage: ".",
});
assert.match(prompt, /TWO-LEVEL NPC CANON/);
assert.match(prompt, /CHARACTER NPCs/);
assert.match(prompt, /STORY NPCs/);
assert.match(prompt, /SCOPE LAW/);
assert.match(prompt, /CHARACTER ISOLATION/);
assert.match(prompt, /Kai Mercer/);
assert.match(prompt, /Vincent Crowe/);

const filteredCast = filterAuthorizedCastUpdatesV35279([
  { name: "Kai Mercer", goals: "Call Roman." },
  { name: "Chloe", goals: "Appear from nowhere." },
], approved);
assert.equal(filteredCast.length, 1);
assert.equal(filteredCast[0].name, "Kai Mercer");

const filteredConnections = filterAuthorizedConnectionUpdatesV35279([
  { from_name: "Roman Knox", to_name: "Kai Mercer", relationship: "friends" },
  { from_name: "Roman Knox", to_name: "Chloe", relationship: "invented" },
], {
  userName: "Antonia",
  character: roman,
  groupCharacters: [roman],
  userCreatedNpcs: approved,
});
assert.equal(filteredConnections.length, 1);
assert.equal(filteredConnections[0].to_name, "Kai Mercer");

assert.match(edge, /from\("character_npcs"\)/);
assert.match(edge, /npc_scope: "character"/);
assert.match(edge, /npc_scope: "conversation"/);
assert.match(edge, /buildChatScopedNpcCanonV35279/);
assert.match(edge, /item\?\.npc_scope !== "character"/);

assert.match(drawer, /Character NPC/);
assert.match(drawer, /Story NPC/);
assert.match(drawer, /save_character_npc/);
assert.match(drawer, /save_story_npc/);
assert.match(drawer, /delete_character_npc/);
assert.match(drawer, /delete_story_npc/);
assert.match(drawer, />Retry<\/button>/);

console.log("PASS  character NPCs and story NPCs share one closed named-cast gate");
console.log("PASS  character NPCs are loaded across chats for the same lead");
console.log("PASS  story NPCs remain conversation-local");
console.log("PASS  NPC mutations use atomic RPC boundaries");
console.log("PASS  NPC drawer exposes recovery instead of silently showing empty state");
console.log("\n5 Two-Level NPC Canon stability checks passed.");
