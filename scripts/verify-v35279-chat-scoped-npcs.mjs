import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  allowedNamedPeopleV35279,
  buildChatScopedNpcCanonV35279,
  filterAuthorizedCastUpdatesV35279,
  filterAuthorizedConnectionUpdatesV35279,
} from "../supabase/functions/character-chat/engine/chat-scoped-npc-canon-v35279.js";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const chat = readFileSync(new URL("../src/pages/Chat.jsx", import.meta.url), "utf8");
const drawer = readFileSync(new URL("../src/components/NpcCastDrawer.jsx", import.meta.url), "utf8");
const relationshipDrawer = readFileSync(new URL("../src/components/RelationshipDrawer.jsx", import.meta.url), "utf8");

const chase = { name: "Chase Beaumont" };
const approved = [
  { id: "npc-1", name: "Marcus", role: "teammate", is_user_created: true },
  { id: "npc-2", name: "Elena", role: "friend", is_user_created: true },
];
const otherChat = [
  { id: "other-1", name: "Chloe", role: "Alexander's classmate", is_user_created: true },
];

const names = allowedNamedPeopleV35279({
  userName: "Antonia",
  character: chase,
  groupCharacters: [chase],
  userCreatedNpcs: approved,
});
assert.deepEqual(names, ["Antonia", "Chase Beaumont", "Marcus", "Elena"]);
assert.ok(!names.includes("Chloe"));

const prompt = buildChatScopedNpcCanonV35279({
  userName: "Antonia",
  character: chase,
  groupCharacters: [chase],
  userCreatedNpcs: approved,
  latestUserMessage: ".",
});
assert.match(prompt, /CLOSED NAMED CAST/);
assert.match(prompt, /do NOT invent, generate, assign, reveal, or reuse ANY other human\/character proper name/);
assert.match(prompt, /CHAT ISOLATION/);
assert.match(prompt, /ANONYMOUS PEOPLE ARE ALLOWED/);
assert.match(prompt, /OLD TEXT DOES NOT AUTHORIZE A NAME/);
assert.match(prompt, /Only the explicit NPC editor creates named supporting characters/);
assert.match(prompt, /Marcus/);
assert.match(prompt, /Elena/);
assert.doesNotMatch(prompt, /Chloe/);

const filteredCast = filterAuthorizedCastUpdatesV35279([
  { name: "Marcus", goals: "Get Chase to practice." },
  { name: "Chloe", goals: "Appear from nowhere." },
], approved);
assert.equal(filteredCast.length, 1);
assert.equal(filteredCast[0].name, "Marcus");

const filteredConnections = filterAuthorizedConnectionUpdatesV35279([
  { from_name: "Chase Beaumont", to_name: "Marcus", relationship: "friends" },
  { from_name: "Chase Beaumont", to_name: "Chloe", relationship: "invented" },
], {
  userName: "Antonia",
  character: chase,
  groupCharacters: [chase],
  userCreatedNpcs: approved,
});
assert.equal(filteredConnections.length, 1);
assert.equal(filteredConnections[0].to_name, "Marcus");

// Cross-chat isolation is structural: only current conversation rows marked user-created are loaded.
assert.match(edge, /\.eq\("conversation_id", conversationId\)\.eq\("user_id", userId\)\.eq\("is_user_created", true\)/);
assert.match(edge, /buildChatScopedNpcCanonV35279/);
assert.match(edge, /\$\{chatScopedNpcCanonV35279\}/);
assert.match(edge, /NAMED NPC LOCK: never invent a proper name for a supporting person/);

// AI metadata cannot mint cast identities anymore: update an existing approved row only.
assert.match(edge, /filterAuthorizedCastUpdatesV35279\(castUpdates, approved\)/);
assert.match(edge, /\.update\(patch\)[\s\S]{0,260}\.eq\("is_user_created", true\)/);
const castPersistenceSection = edge.slice(
  edge.indexOf("async function persistStoryCastMembers"),
  edge.indexOf("async function streamGeminiEnvelopeWithFailover")
);
assert.doesNotMatch(castPersistenceSection, /\.upsert\(/);
assert.doesNotMatch(castPersistenceSection, /\.insert\(/);
assert.match(edge, /filterAuthorizedConnectionUpdatesV35279/);

// The chat itself owns creation/editing UI and always scopes records to one conversation.
assert.match(chat, /NpcCastDrawer/);
assert.match(chat, /> NPC Cast<\/button>/);
assert.match(drawer, /\.eq\("conversation_id", conversationId\)/);
assert.match(drawer, /\.eq\("is_user_created", true\)/);
assert.match(drawer, /is_user_created: true/);
assert.match(drawer, /Only people you create here are allowed to have names in this conversation/);
assert.match(relationshipDrawer, /\.eq\("is_user_created", true\)/);

assert.match(edge, /FIRST_DRAFT_WINS_V35268 = true/);

console.log("PASS  allowed names are scoped to user + this chat's lead/group + user-created NPCs");
console.log("PASS  another chat's Chloe is excluded from Chase's approved cast");
console.log("PASS  AI cast/connection metadata cannot create unauthorized named NPCs");
console.log("PASS  NPC creator UI reads/writes only the current conversation");
console.log("PASS  closed-cast rule is injected before first generation while First Draft Wins stays enabled");
console.log("\n5 Chat-Scoped NPC Canon v3.52.79 checks passed.");
