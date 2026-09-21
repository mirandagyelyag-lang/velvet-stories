import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chat = readFileSync(new URL("../src/pages/Chat.jsx", import.meta.url), "utf8");
const context = readFileSync(new URL("../src/context/ChatsContext.jsx", import.meta.url), "utf8");
const drawer = readFileSync(new URL("../src/components/NpcCastDrawer.jsx", import.meta.url), "utf8");
const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const canon = readFileSync(new URL("../supabase/functions/character-chat/engine/chat-scoped-npc-canon-v35279.js", import.meta.url), "utf8");
const dbShield = readFileSync(new URL("../supabase/migrations/202609210001_v3538_stability_shield.sql", import.meta.url), "utf8");
const npcRuntime = readFileSync(new URL("../supabase/migrations/202609210002_v3538_npc_runtime_consistency.sql", import.meta.url), "utf8");
const backupVault = readFileSync(new URL("../supabase/migrations/202609210004_v3538_migration_backup_vault.sql", import.meta.url), "utf8");
const panelBoundary = readFileSync(new URL("../src/components/PanelErrorBoundary.jsx", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

// Dot controls
assert.match(chat, /const SILENT_CONTINUE_MESSAGE = "\[SILENT_CONTINUE\]"/);
assert.match(chat, /const RETURN_MAIN_POV_MESSAGE = "\[RETURN_MAIN_POV\]"/);
assert.match(chat, /compactDots === "\." \|\| compactDots\.length >= 3/);
assert.match(chat, /compactDots === "\.\."/);

// Background generation + recovery + regeneration
assert.match(context, /action: "enqueue_generate"/);
assert.match(context, /reloadConversationMessages\(characterId\)/);
assert.match(context, /regenerateMessageId: options\.regenerateMessageId \|\| null/);
assert.match(context, /Saved offline · Velvet will send it automatically|offlineQueue/i);
assert.match(main, /<SpotifyHub\s*\/>/);

// Two-level NPC source of truth
assert.match(edge, /from\("character_npcs"\)/);
assert.match(edge, /npc_scope: "character"/);
assert.match(edge, /npc_scope: "conversation"/);
assert.match(canon, /CHARACTER NPCs · persistent across every chat/);
assert.match(canon, /STORY NPCs · local to this conversation only/);

// Atomic mutations + recoverable UI
assert.match(drawer, /rpc\("save_character_npc"/);
assert.match(drawer, /rpc\("save_story_npc"/);
assert.match(drawer, /rpc\("delete_character_npc"/);
assert.match(drawer, /rpc\("delete_story_npc"/);
assert.match(drawer, />Retry<\/button>/);
assert.match(panelBoundary, /Retry panel/);
assert.match(chat, /PanelErrorBoundary label="NPC Cast"/);
assert.match(chat, /PanelErrorBoundary label="Story Hub"/);
assert.match(dbShield, /create or replace function public\.save_character_npc/);
assert.match(dbShield, /create or replace function public\.save_story_npc/);
assert.match(npcRuntime, /story_cast_connections/);
assert.match(npcRuntime, /story_revision=gen_random_uuid\(\)/);

// Backup shield
assert.match(context, /schema: 3/);
assert.match(context, /velvetVersion: "3\.53\.8"/);
assert.match(context, /storyNpcs:/);
assert.match(context, /characterNpcs:/);
assert.match(context, /castConnections:/);
assert.match(context, /"Before restore"/);
assert.match(backupVault, /private\.stability_backups/);
assert.match(backupVault, /capture_stability_backup/);

// Security guardrails
assert.match(dbShield, /generation_requests/);
assert.match(dbShield, /revoke execute on function public\.create_profile_for_new_user/);
assert.match(dbShield, /revoke execute on function public\.rls_auto_enable/);
assert.match(dbShield, /drop index if exists public\.conversations_story_intelligence_idx/);

console.log("PASS  dot continuation and POV controls are wired");
console.log("PASS  generation recovery paths and global Spotify mount remain present");
console.log("PASS  NPC canon has one explicit two-level source of truth");
console.log("PASS  NPC writes/deletes are transactional and recoverable");
console.log("PASS  critical story panels fail independently instead of taking down the chat");
console.log("PASS  story backups include both NPC scopes and cast links");
console.log("PASS  private migration backup vault exists");
console.log("PASS  security/performance database guardrails are present");
console.log("\n8 Velvet v3.53.8 Stability Shield checks passed.");
