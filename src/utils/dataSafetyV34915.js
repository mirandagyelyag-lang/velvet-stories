const DB_NAME = "velvet-safety-v34915";
const DB_VERSION = 1;
const STORY_STORE = "storySnapshots";
const ACCOUNT_STORE = "accountSnapshots";
const DAILY_KEY_PREFIX = "velvet_safety_daily_v34915_";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const ACCOUNT_TABLES = ["characters", "personas", "lorebooks", "lore_entries", "conversations", "messages", "memories", "message_alternatives", "story_snapshots", "story_milestones", "story_cast_members", "story_chemistry_profiles", "story_plans", "story_conflicts", "story_bible_entries", "story_cast_connections", "story_calendar_events", "story_canon_corrections", "user_story_preferences"];
const STORY_TABLES = ["messages", "memories", "message_alternatives", "story_snapshots", "story_milestones", "story_cast_members", "story_chemistry_profiles", "story_plans", "story_conflicts", "story_bible_entries", "story_cast_connections", "story_calendar_events", "story_canon_corrections"];
const RESTORE_ORDER = ["characters", "personas", "lorebooks", "lore_entries", "conversations", "messages", "memories", "message_alternatives", "story_snapshots", "story_milestones", "story_cast_members", "story_chemistry_profiles", "story_plans", "story_conflicts", "story_bible_entries", "story_cast_connections", "story_calendar_events", "story_canon_corrections", "user_story_preferences"];
function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}
function transactionPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction was aborted."));
  });
}
async function openSafetyDb() {
  if (typeof indexedDB === "undefined") throw new Error("Local Safety Vault is unavailable on this device.");
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORY_STORE)) {
      const store = db.createObjectStore(STORY_STORE, {
        keyPath: "id"
      });
      store.createIndex("userId", "userId", {
        unique: false
      });
      store.createIndex("capturedAt", "capturedAt", {
        unique: false
      });
      store.createIndex("conversationId", "conversationId", {
        unique: false
      });
    }
    if (!db.objectStoreNames.contains(ACCOUNT_STORE)) {
      const store = db.createObjectStore(ACCOUNT_STORE, {
        keyPath: "id"
      });
      store.createIndex("userId", "userId", {
        unique: false
      });
      store.createIndex("capturedAt", "capturedAt", {
        unique: false
      });
    }
  };
  return requestPromise(request);
}
async function putRecord(storeName, record) {
  const db = await openSafetyDb();
  try {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(record);
    await transactionPromise(tx);
    return record;
  } finally {
    db.close();
  }
}
async function getAllRecords(storeName) {
  const db = await openSafetyDb();
  try {
    const tx = db.transaction(storeName, "readonly");
    const rows = await requestPromise(tx.objectStore(storeName).getAll());
    await transactionPromise(tx);
    return rows || [];
  } finally {
    db.close();
  }
}
async function deleteRecord(storeName, id) {
  const db = await openSafetyDb();
  try {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    await transactionPromise(tx);
  } finally {
    db.close();
  }
}
async function pruneStore(storeName, userId, maxItems) {
  const rows = (await getAllRecords(storeName)).filter(row => row.userId === userId).sort((a, b) => new Date(b.capturedAt || 0) - new Date(a.capturedAt || 0));
  const now = Date.now();
  const expired = rows.filter(row => row.expiresAt && new Date(row.expiresAt).getTime() < now);
  const overflow = rows.filter((row, index) => index >= maxItems);
  const ids = [...new Set([...expired, ...overflow].map(row => row.id))];
  for (const id of ids) await deleteRecord(storeName, id);
}
function safeLocalState() {
  const local = {};
  if (typeof localStorage === "undefined") return local;
  const allow = /^(velvet_story_theme_v312_|velvet_character_story_style_|velvet_scene_|velvet_reading_mode|velvet_draft_|velvet_story_collections_v34915_|velvet_chat_mobile_v3499_|velvet:last-location:v1)/;
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && allow.test(key)) local[key] = localStorage.getItem(key);
    }
  } catch {}
  return local;
}
async function readScopedTables(tableNames, fetchTable) {
  const tables = {};
  const skipped = [];
  const results = await Promise.all(tableNames.map(async table => {
    try {
      const {
        data,
        error
      } = await fetchTable(table);
      if (error) throw error;
      return {
        table,
        rows: data || [],
        error: null
      };
    } catch (error) {
      return {
        table,
        rows: [],
        error
      };
    }
  }));
  results.forEach(({
    table,
    rows,
    error
  }) => {
    if (error) skipped.push({
      table,
      reason: String(error?.message || "unavailable").slice(0, 180)
    });else tables[table] = rows;
  });
  return {
    tables,
    skipped
  };
}
async function readAccountTables(supabase, userId) {
  return readScopedTables(ACCOUNT_TABLES, table => supabase.from(table).select("*").eq("user_id", userId));
}
async function readStoryTables(supabase, conversationId) {
  return readScopedTables(STORY_TABLES, table => supabase.from(table).select("*").eq("conversation_id", conversationId));
}
export async function createAccountSafetySnapshotV34915({
  supabase,
  userId,
  reason = "manual"
}) {
  if (!supabase || !userId) throw new Error("Velvet cannot create a safety snapshot while signed out.");
  const {
    tables,
    skipped
  } = await readAccountTables(supabase, userId);
  const capturedAt = new Date().toISOString();
  const recordCount = Object.values(tables).reduce((sum, rows) => sum + (rows?.length || 0), 0);
  const payload = {
    format: "velvet-full-backup",
    safetyFormat: "velvet-account-safety-v34915",
    version: "3.49.15",
    exportedAt: capturedAt,
    userId,
    tables,
    local: safeLocalState(),
    skipped
  };
  const snapshot = {
    id: `account-${userId}-${Date.now()}`,
    kind: "account",
    userId,
    capturedAt,
    expiresAt: new Date(Date.now() + THIRTY_DAYS).toISOString(),
    reason,
    recordCount,
    skippedCount: skipped.length,
    payload
  };
  await putRecord(ACCOUNT_STORE, snapshot);
  await pruneStore(ACCOUNT_STORE, userId, 5);
  return snapshot;
}
export async function ensureDailyAccountSafetySnapshotV34915({
  supabase,
  userId
}) {
  if (!supabase || !userId || typeof localStorage === "undefined") return null;
  const key = `${DAILY_KEY_PREFIX}${userId}`;
  let last = 0;
  try {
    last = Number(localStorage.getItem(key) || 0);
  } catch {}
  if (last && Date.now() - last < ONE_DAY) return null;
  const snapshot = await createAccountSafetySnapshotV34915({
    supabase,
    userId,
    reason: "automatic-daily"
  });
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {}
  return snapshot;
}
export async function listAccountSafetySnapshotsV34915(userId) {
  if (!userId) return [];
  await pruneStore(ACCOUNT_STORE, userId, 5);
  return (await getAllRecords(ACCOUNT_STORE)).filter(row => row.userId === userId).sort((a, b) => new Date(b.capturedAt || 0) - new Date(a.capturedAt || 0));
}
export async function deleteAccountSafetySnapshotV34915(snapshotId) {
  if (snapshotId) await deleteRecord(ACCOUNT_STORE, snapshotId);
}
export async function createStorySafetySnapshotV34915({
  supabase,
  userId,
  conversation,
  characterName = "",
  reason = "manual"
}) {
  if (!supabase || !userId || !conversation?.id) throw new Error("This story cannot be copied into the Safety Vault yet.");
  const {
    tables,
    skipped
  } = await readStoryTables(supabase, conversation.id);
  const capturedAt = new Date().toISOString();
  const snapshot = {
    id: `story-${conversation.id}-${Date.now()}`,
    kind: "story",
    format: "velvet-story-safety-v34915",
    version: "3.49.15",
    userId,
    conversationId: conversation.id,
    characterId: conversation.character_id || conversation.characterId || "",
    characterName,
    title: conversation.title || characterName || "Velvet story",
    capturedAt,
    expiresAt: new Date(Date.now() + THIRTY_DAYS).toISOString(),
    reason,
    conversation: (() => {
      const {
        character,
        groupCharacters,
        latestMessage,
        ...dbConversation
      } = conversation;
      return {
        ...dbConversation,
        user_id: userId
      };
    })(),
    tables,
    skipped,
    recordCount: 1 + Object.values(tables).reduce((sum, rows) => sum + (rows?.length || 0), 0)
  };
  await putRecord(STORY_STORE, snapshot);
  await pruneStore(STORY_STORE, userId, 24);
  return snapshot;
}
export async function listStorySafetySnapshotsV34915(userId) {
  if (!userId) return [];
  await pruneStore(STORY_STORE, userId, 24);
  return (await getAllRecords(STORY_STORE)).filter(row => row.userId === userId).sort((a, b) => new Date(b.capturedAt || 0) - new Date(a.capturedAt || 0));
}
export async function deleteStorySafetySnapshotV34915(snapshotId) {
  if (snapshotId) await deleteRecord(STORY_STORE, snapshotId);
}
function rowsForRestore(rows, userId) {
  return (Array.isArray(rows) ? rows : []).map(row => ({
    ...row,
    ...(Object.prototype.hasOwnProperty.call(row, "user_id") ? {
      user_id: userId
    } : {})
  }));
}
async function upsertRows(supabase, table, rows, userId) {
  const safeRows = rowsForRestore(rows, userId);
  if (!safeRows.length) return {
    restored: 0,
    error: null
  };
  const {
    error
  } = await supabase.from(table).upsert(safeRows, {
    onConflict: "id"
  });
  return {
    restored: error ? 0 : safeRows.length,
    error
  };
}
export async function restoreStorySafetySnapshotV34915({
  supabase,
  userId,
  snapshot
}) {
  if (!snapshot || snapshot.userId !== userId) throw new Error("This recovery copy belongs to a different Velvet account.");
  const conversation = {
    ...snapshot.conversation,
    user_id: userId,
    trashed_at: null,
    archived_at: null,
    updated_at: new Date().toISOString()
  };
  const {
    error: conversationError
  } = await supabase.from("conversations").upsert([conversation], {
    onConflict: "id"
  });
  if (conversationError) throw conversationError;
  let restored = 1;
  const failures = [];
  for (const table of RESTORE_ORDER.filter(name => name !== "conversations" && STORY_TABLES.includes(name))) {
    const result = await upsertRows(supabase, table, snapshot.tables?.[table], userId);
    restored += result.restored;
    if (result.error) failures.push(`${table}: ${result.error.message}`);
  }
  return {
    restored,
    failures
  };
}
export async function restoreAccountSafetySnapshotV34915({
  supabase,
  userId,
  payload
}) {
  if (!payload || payload.format !== "velvet-full-backup" || !payload.tables) throw new Error("That file is not a full Velvet backup.");
  if (payload.userId && payload.userId !== userId) throw new Error("This backup belongs to a different Velvet account.");
  let restored = 0;
  const failures = [];
  for (const table of RESTORE_ORDER) {
    const rows = payload.tables?.[table];
    if (!Array.isArray(rows) || !rows.length) continue;
    const result = await upsertRows(supabase, table, rows, userId);
    restored += result.restored;
    if (result.error) failures.push(`${table}: ${result.error.message}`);
  }
  try {
    Object.entries(payload.local || {}).forEach(([key, value]) => {
      if (/^(velvet_story_theme_v312_|velvet_character_story_style_|velvet_scene_|velvet_reading_mode|velvet_draft_|velvet_story_collections_v34915_|velvet_chat_mobile_v3499_|velvet:last-location:v1)/.test(key)) {
        localStorage.setItem(key, String(value));
      }
    });
  } catch {}
  return {
    restored,
    failures
  };
}
export function downloadSafetyPayloadV34915(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
export async function clearExpiredSafetySnapshotsV34915(userId) {
  if (!userId) return;
  await pruneStore(STORY_STORE, userId, 24);
  await pruneStore(ACCOUNT_STORE, userId, 5);
}
