import { Archive, ArchiveRestore, Bug, Check, ChevronRight, Copy, Crown, Download, FolderHeart, FolderPlus, Heart, HeartOff, History, LoaderCircle, MessageCircle, MoreHorizontal, Pencil, Plus, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
import { useChats } from "../context/ChatsContext";
import { supabase } from "../services/supabase";
import { useSettings } from "../context/SettingsContext";
import { useFeedback } from "../context/FeedbackContext";
import { useTheme } from "../context/ThemeContext";
import GroupStoryModal from "../components/GroupStoryModal";
import SwipeToTrash from "../components/SwipeToTrash";
import {
  createStorySafetySnapshotV34915,
  deleteStorySafetySnapshotV34915,
  listStorySafetySnapshotsV34915,
  restoreStorySafetySnapshotV34915,
} from "../utils/dataSafetyV34915";
import {
  createStoryCollectionV34915,
  loadStoryCollectionsV34915,
  normalizedStorySearchV34915,
  removeStoryCollectionV34915,
  removeStoryFromAllCollectionsV34915,
  storySearchScoreV34915,
  toggleStoryInCollectionV34915,
} from "../utils/storyLibraryV34915";
import "../styles/chats.css";

function Chats({ onOpenCharacter, onBrowseCharacters, onOpenDiagnostics }) {
  const { user } = useAuth();
  const { characters } = useCharacters();
  const { createNewConversation } = useChats();
  const { settings } = useSettings();
  const { confirmAction, scheduleDeletion } = useFeedback();
  const { theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingId, setCreatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [view, setView] = useState("active");
  const [pendingDeletionIds, setPendingDeletionIds] = useState([]);
  const [menuId, setMenuId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [groupStoryOpen, setGroupStoryOpen] = useState(false);
  const [recoverySnapshots, setRecoverySnapshots] = useState([]);
  const [collections, setCollections] = useState([]);
  const [collectionDialog, setCollectionDialog] = useState(null);
  const [collectionName, setCollectionName] = useState("");
  const [deepMatches, setDeepMatches] = useState([]);
  const [deepSearching, setDeepSearching] = useState(false);
  const [libraryNotice, setLibraryNotice] = useState("");

  useEffect(() => { loadConversations(); }, [user?.id, characters.length]);

  useEffect(() => {
    if (!user?.id) { setCollections([]); setRecoverySnapshots([]); return; }
    setCollections(loadStoryCollectionsV34915(user.id));
    void refreshSafetyVault();
  }, [user?.id]);

  // v3.49.15 DEEP STORY SEARCH: the Stories search finally searches old
  // messages and memories, not only the latest preview line.
  useEffect(() => {
    const needle = search.trim();
    if (!user?.id || needle.length < 2) { setDeepMatches([]); setDeepSearching(false); return undefined; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setDeepSearching(true);
      try {
        const [messageResult, memoryResult] = await Promise.all([
          supabase.from("messages").select("id, conversation_id, sender, content, created_at").order("created_at", { ascending: false }).limit(1800),
          supabase.from("memories").select("id, conversation_id, content, category, is_canon, is_pinned, created_at").is("superseded_at", null).order("created_at", { ascending: false }).limit(700),
        ]);
        if (messageResult.error) throw messageResult.error;
        if (memoryResult.error) throw memoryResult.error;
        const known = new Set(conversations.map((item) => item.id));
        const matches = [];
        for (const message of messageResult.data || []) {
          if (!known.has(message.conversation_id)) continue;
          const score = storySearchScoreV34915(message.content, needle);
          if (score) matches.push({ kind: "message", score: score + 4, conversationId: message.conversation_id, messageId: message.id, text: message.content, date: message.created_at });
        }
        for (const memory of memoryResult.data || []) {
          if (!memory.conversation_id || !known.has(memory.conversation_id)) continue;
          const score = storySearchScoreV34915(`${memory.content} ${memory.category || ""}`, needle);
          if (score) matches.push({ kind: "memory", score: score + (memory.is_canon ? 8 : memory.is_pinned ? 4 : 0), conversationId: memory.conversation_id, messageId: null, text: memory.content, date: memory.created_at });
        }
        if (!cancelled) setDeepMatches(matches.sort((a,b)=>b.score-a.score||new Date(b.date||0)-new Date(a.date||0)).slice(0,18));
      } catch (requestError) {
        console.warn("Velvet deep story search skipped:", requestError?.message || requestError);
        if (!cancelled) setDeepMatches([]);
      } finally { if (!cancelled) setDeepSearching(false); }
    }, 260);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, user?.id, conversations.length]);

  useEffect(() => {
    if (!pickerOpen && !groupStoryOpen) return undefined;

    const root = document.documentElement;
    const body = document.body;
    root.classList.add("velvet-story-launcher-open");
    body.classList.add("velvet-story-launcher-open");

    return () => {
      root.classList.remove("velvet-story-launcher-open");
      body.classList.remove("velvet-story-launcher-open");
    };
  }, [pickerOpen, groupStoryOpen]);

  useEffect(() => {
    if (!menuId) return undefined;

    function closeStoryMenu(event) {
      if (event.type === "keydown") {
        if (event.key === "Escape") setMenuId(null);
        return;
      }
      if (!event.target?.closest?.(".story-action-menu")) setMenuId(null);
    }

    document.addEventListener("pointerdown", closeStoryMenu);
    document.addEventListener("keydown", closeStoryMenu);
    return () => {
      document.removeEventListener("pointerdown", closeStoryMenu);
      document.removeEventListener("keydown", closeStoryMenu);
    };
  }, [menuId]);

  useEffect(() => {
    document.documentElement.classList.add("velvet-burgundy-route");
    document.body.classList.add("velvet-burgundy-route");

    return () => {
      document.documentElement.classList.remove("velvet-burgundy-route");
      document.body.classList.remove("velvet-burgundy-route");
    };
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const colors = { light: "#f7eff2", comfort: "#eee4dc", dark: "#10090e" };
    meta?.setAttribute("content", colors[theme] || colors.dark);
  }, [theme]);

  async function refreshSafetyVault() {
    if (!user?.id) return;
    try { setRecoverySnapshots(await listStorySafetySnapshotsV34915(user.id)); }
    catch (requestError) { console.warn("Safety Vault unavailable:", requestError?.message || requestError); }
  }

  function persistCollections(next) {
    setCollections(next);
    return next;
  }

  function createCollection(event) {
    event?.preventDefault?.();
    try {
      const next = createStoryCollectionV34915(user?.id, collections, collectionName);
      persistCollections(next);
      setCollectionName("");
      setCollectionDialog(null);
      setLibraryNotice("Collection created.");
    } catch (requestError) { setLibraryNotice(requestError?.message || "Velvet couldn't create that collection."); }
  }

  function toggleCollectionStory(collectionId, storyId) {
    const next = toggleStoryInCollectionV34915(user?.id, collections, collectionId, storyId);
    persistCollections(next);
  }

  async function restoreSafetySnapshot(snapshot) {
    if (!user?.id || updatingId) return;
    try {
      setUpdatingId(snapshot.id);
      setLibraryNotice("");
      const result = await restoreStorySafetySnapshotV34915({ supabase, userId: user.id, snapshot });
      await loadConversations();
      setView("active");
      setLibraryNotice(`Story restored from Safety Vault · ${result.restored} records recovered${result.failures.length ? ` · ${result.failures.length} optional sections skipped` : ""}.`);
    } catch (requestError) {
      console.error("Safety Vault restore failed:", requestError);
      setLibraryNotice(requestError?.message || "Velvet couldn't restore that recovery copy.");
    } finally { setUpdatingId(null); }
  }

  async function removeSafetySnapshot(snapshotId) {
    try {
      await deleteStorySafetySnapshotV34915(snapshotId);
      setRecoverySnapshots((current) => current.filter((item) => item.id !== snapshotId));
    } catch (requestError) { setLibraryNotice(requestError?.message || "Velvet couldn't remove that recovery copy."); }
  }

  async function deleteActiveCollection() {
    if (!String(view).startsWith("collection:")) return;
    const active = collections.find((item) => item.id === String(view).slice("collection:".length));
    if (!active) return;
    const approved = await confirmAction({ title: "Remove this collection?", message: `“${active.name}” will be removed from your shelves. The stories inside it stay safe.`, confirmLabel: "Remove collection" });
    if (!approved) return;
    persistCollections(removeStoryCollectionV34915(user?.id, collections, active.id));
    setView("active");
    setLibraryNotice("Collection removed. Your stories were not deleted.");
  }

  async function loadConversations() {
    if (!user) return;
    try {
      setLoading(true);
      setError("");
      const { data: rows, error: conversationError } = await supabase
        .from("conversations").select("*")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (conversationError) throw conversationError;

      const ids = (rows || []).map((row) => row.id);
      let messages = [];
      if (ids.length) {
        const { data, error: messagesError } = await supabase
          .from("messages").select("conversation_id, content, sender, created_at")
          .in("conversation_id", ids).order("created_at", { ascending: false });
        if (messagesError) throw messagesError;
        messages = data || [];
      }

      const latestByConversation = new Map();
      messages.forEach((item) => {
        if (!latestByConversation.has(item.conversation_id)) latestByConversation.set(item.conversation_id, item);
      });
      setConversations((rows || []).map((row) => ({
        ...row,
        character: characters.find((item) => item.id === row.character_id),
        groupCharacters: row.group_mode ? (row.group_character_ids || []).map((id) => characters.find((item) => item.id === id)).filter(Boolean) : [],
        latestMessage: latestByConversation.get(row.id),
      })));
    } catch (requestError) {
      console.error("Error loading conversations:", requestError);
      setError("We couldn't load your conversations.");
    } finally { setLoading(false); }
  }

  async function handleCreate(character) {
    try {
      setCreatingId(character.id);
      setError("");
      const chat = await createNewConversation(character);
      setPickerOpen(false);
      onOpenCharacter(character, chat.conversationId);
    } catch (requestError) {
      console.error("Error creating conversation:", requestError);
      setError("We couldn't create a new conversation.");
    } finally { setCreatingId(null); }
  }

  async function togglePinned(event, conversation) {
    event.stopPropagation();
    try {
      setUpdatingId(conversation.id);
      const isPinned = !conversation.is_pinned;
      const { error: requestError } = await supabase.from("conversations")
        .update({ is_pinned: isPinned }).eq("id", conversation.id);
      if (requestError) throw requestError;
      setConversations((current) => current
        .map((item) => item.id === conversation.id ? { ...item, is_pinned: isPinned } : item)
        .sort(sortConversations));
    } catch (requestError) {
      console.error("Error pinning conversation:", requestError);
      setError("We couldn't update that conversation.");
    } finally { setUpdatingId(null); }
  }

  function beginRename(event, conversation) {
    event.stopPropagation();
    setEditingId(conversation.id);
    setEditTitle(conversation.title || conversation.character?.name || "");
  }

  async function saveTitle(event, conversation) {
    event.preventDefault();
    event.stopPropagation();
    const title = editTitle.trim();
    if (!title) return;
    try {
      setUpdatingId(conversation.id);
      const { error: requestError } = await supabase.from("conversations")
        .update({ title }).eq("id", conversation.id);
      if (requestError) throw requestError;
      setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, title } : item));
      setEditingId(null);
    } catch (requestError) {
      console.error("Error renaming conversation:", requestError);
      setError("We couldn't rename that conversation.");
    } finally { setUpdatingId(null); }
  }

  async function deleteConversation(event, conversationId) {
    event?.stopPropagation?.();
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation || conversation.trashed_at) return;
    const trashedAt = new Date().toISOString();

    // Remove the row itself immediately. Do not leave a visually identical story behind during Undo.
    setConversations((current) => current.filter((item) => item.id !== conversationId));
    const restoreSnapshot = () => setConversations((current) =>
      current.some((item) => item.id === conversationId) ? current : [...current, conversation].sort(sortConversations)
    );
    scheduleDeletion({
      batchKey: "story-cleanup",
      message: (count) => `${count} ${count === 1 ? "story" : "stories"} removed`,
      onUndo: restoreSnapshot,
      onCommit: async () => {
        const { error: requestError } = await supabase.from("conversations").update({ trashed_at: trashedAt }).eq("id", conversationId);
        if (requestError) throw requestError;
      },
      onError: (requestError) => {
        console.error(requestError);
        restoreSnapshot();
        setError("We couldn't delete that conversation.");
      },
    });
  }

  async function restoreConversation(event, conversationId) {
    event.stopPropagation();
    setUpdatingId(conversationId);
    const { error: requestError } = await supabase.from("conversations").update({ trashed_at: null, updated_at: new Date().toISOString() }).eq("id", conversationId);
    if (requestError) setError("We couldn't restore that story."); else await loadConversations();
    setUpdatingId(null);
  }

  async function permanentlyDeleteConversation(event, conversationId) {
    event.stopPropagation();
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    const approved = await confirmAction({ title: "Delete forever?", message: "Velvet will save a 30-day recovery copy locally before deleting this story from Supabase.", confirmLabel: "Save copy & delete" });
    if (!approved) return;
    setDeletingId(conversationId);
    try {
      await createStorySafetySnapshotV34915({ supabase, userId: user.id, conversation, characterName: conversation.character?.name || "", reason: "before-delete-forever" });
      const { error: memoryDeleteError } = await supabase.from("memories").delete().eq("conversation_id", conversationId);
      if (memoryDeleteError) throw memoryDeleteError;
      const { error: requestError } = await supabase.from("conversations").delete().eq("id", conversationId);
      if (requestError) throw requestError;
      setConversations((current) => current.filter((item) => item.id !== conversationId));
      persistCollections(removeStoryFromAllCollectionsV34915(user.id, collections, conversationId));
      await refreshSafetyVault();
      setLibraryNotice("Deleted from Supabase · recovery copy kept locally for 30 days.");
    } catch (requestError) {
      console.error("Permanent delete safety gate failed:", requestError);
      setError("Velvet did not delete this story because it could not secure a recovery copy first.");
    } finally { setDeletingId(null); }
  }

  function swipeDeleteConversationForever(conversationId) {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation?.trashed_at) return;

    setConversations((current) => current.filter((item) => item.id !== conversationId));
    const restoreSnapshot = () => setConversations((current) =>
      current.some((item) => item.id === conversationId) ? current : [...current, conversation].sort(sortConversations)
    );

    scheduleDeletion({
      batchKey: "trash-permanent-cleanup",
      message: (count) => `${count} ${count === 1 ? "story" : "stories"} deleted forever`,
      onUndo: restoreSnapshot,
      onCommit: async () => {
        await createStorySafetySnapshotV34915({ supabase, userId: user.id, conversation, characterName: conversation.character?.name || "", reason: "before-swipe-delete-forever" });
        const { error: memoryDeleteError } = await supabase.from("memories").delete().eq("conversation_id", conversationId);
        if (memoryDeleteError) throw memoryDeleteError;
        const { error: requestError } = await supabase.from("conversations").delete().eq("id", conversationId);
        if (requestError) throw requestError;
        persistCollections(removeStoryFromAllCollectionsV34915(user.id, collections, conversationId));
        await refreshSafetyVault();
      },
      onError: (requestError) => {
        console.error("Permanent trash swipe failed:", requestError);
        restoreSnapshot();
        setError("We couldn't permanently delete that story.");
      },
    });
  }

  async function duplicateConversation(event, conversation) {
    event.stopPropagation();
    try {
      setUpdatingId(conversation.id);
      setError("");
      const { data: created, error: createError } = await supabase.from("conversations").insert({
        user_id: user.id,
        character_id: conversation.character_id,
        title: `${conversation.title || conversation.character?.name || "Story"} · copy`.slice(0, 80),
        persona_id: conversation.persona_id || null,
        lorebook_id: conversation.lorebook_id || null,
        response_length_override: conversation.response_length_override || null,
        narration_style_override: conversation.narration_style_override || null,
        creativity: conversation.creativity ?? 0.84,
        romance_intensity: conversation.romance_intensity ?? 35,
        initiative: conversation.initiative ?? 65,
        drama: conversation.drama ?? 45,
        flirting: conversation.flirting ?? 30,
        humor: conversation.humor ?? 45,
        description_level: conversation.description_level ?? 55,
        character_independence: conversation.character_independence ?? 80,
        dialogue_frequency: conversation.dialogue_frequency ?? 55,
        narrative_camera: conversation.narrative_camera || "balanced",
        inner_thoughts: conversation.inner_thoughts || "rare",
        story_preset: conversation.story_preset || "natural",
        scene_state: conversation.scene_state || {},
        story_timeline: conversation.story_timeline || [],
        intelligence_state: conversation.intelligence_state || {},
        story_recap: conversation.story_recap || conversation.summary || null,
        unresolved_threads: conversation.unresolved_threads || [],
        group_mode: Boolean(conversation.group_mode),
        group_character_ids: conversation.group_character_ids || [],
        group_title: conversation.group_title || null,
        cover_url: conversation.cover_url || null,
        cover_title: conversation.cover_title || null,
        cover_mood: conversation.cover_mood || null,
        ambient_mode: conversation.ambient_mode || "none",
        ambient_volume: conversation.ambient_volume ?? 18,
        branch_parent_id: conversation.id,
        branch_label: "Duplicate",
      }).select().single();
      if (createError) throw createError;

      const [{ data: sourceMessages, error: messagesError }, { data: sourceMemories, error: memoriesError }] = await Promise.all([
        supabase.from("messages").select("sender, content, edited_at").eq("conversation_id", conversation.id).order("created_at", { ascending: true }),
        supabase.from("memories").select("content, importance, category, is_pinned, source").eq("conversation_id", conversation.id).eq("scope", "conversation"),
      ]);
      if (messagesError) throw messagesError;
      if (memoriesError) throw memoriesError;

      if (sourceMessages?.length) {
        const now = Date.now();
        const { error: copyError } = await supabase.from("messages").insert(sourceMessages.map((message, index) => ({
          conversation_id: created.id, user_id: user.id, sender: message.sender, content: message.content, edited_at: message.edited_at || null, created_at: new Date(now + index).toISOString(),
        })));
        if (copyError) throw copyError;
      }

      if (sourceMemories?.length) {
        const { error: memoryCopyError } = await supabase.from("memories").insert(sourceMemories.map((memory) => ({
          conversation_id: created.id, character_id: conversation.character_id, user_id: user.id, content: memory.content, importance: memory.importance, category: memory.category, is_pinned: memory.is_pinned, source: memory.source, scope: "conversation",
        })));
        if (memoryCopyError) console.warn("Could not copy timeline memories:", memoryCopyError);
      }

      await loadConversations();
    } catch (requestError) {
      console.error("Error duplicating conversation:", requestError);
      setError("We couldn't duplicate that conversation.");
    } finally { setUpdatingId(null); }
  }

  async function toggleArchived(event, conversation) {
    event.stopPropagation();
    try {
      setUpdatingId(conversation.id);
      const archivedAt = conversation.archived_at ? null : new Date().toISOString();
      const { error: requestError } = await supabase.from("conversations").update({ archived_at: archivedAt, is_pinned: archivedAt ? false : conversation.is_pinned }).eq("id", conversation.id);
      if (requestError) throw requestError;
      setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, archived_at: archivedAt, is_pinned: archivedAt ? false : item.is_pinned } : item));
    } catch (requestError) { console.error(requestError); setError("We couldn't update the archive."); }
    finally { setUpdatingId(null); }
  }

  async function exportConversation(event, conversation) {
    event.stopPropagation();
    try {
      setUpdatingId(conversation.id);
      const { data, error: requestError } = await supabase.from("messages").select("sender, content, created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: true });
      if (requestError) throw requestError;
      downloadStory(conversation, data || [], settings.exportFormat);
    } catch (requestError) { console.error(requestError); setError("We couldn't export this story."); }
    finally { setUpdatingId(null); }
  }

  const deepMatchConversationIds = useMemo(() => new Set(deepMatches.map((item) => item.conversationId)), [deepMatches]);

  const filtered = useMemo(() => {
    const value = normalizedStorySearchV34915(search);
    const activeCollection = String(view).startsWith("collection:")
      ? collections.find((item) => item.id === String(view).slice("collection:".length))
      : null;
    return conversations.filter((conversation) => {
      if (pendingDeletionIds.includes(conversation.id)) return false;
      if (view === "recovery") return false;
      if (view === "trash" && !conversation.trashed_at) return false;
      if (view !== "trash" && conversation.trashed_at) return false;
      if (view === "active" && conversation.archived_at) return false;
      if (view === "favorites" && (conversation.archived_at || !conversation.is_pinned)) return false;
      if (view === "archived" && !conversation.archived_at) return false;
      if (activeCollection && (!activeCollection.storyIds.includes(conversation.id) || conversation.trashed_at)) return false;
      if (!value) return true;
      const character = conversation.character;
      const shallow = normalizedStorySearchV34915(`${conversation.title || ""} ${character?.name || ""} ${(conversation.groupCharacters || []).map((item) => item.name).join(" ")} ${character?.role || ""} ${conversation.latestMessage?.content || ""}`);
      return shallow.includes(value) || deepMatchConversationIds.has(conversation.id);
    });
  }, [conversations, search, view, pendingDeletionIds, collections, deepMatchConversationIds]);

  const collectionCounts = useMemo(() => ({
    favorites: conversations.filter((item) => !item.trashed_at && !item.archived_at && item.is_pinned && !pendingDeletionIds.includes(item.id)).length,
    archived: conversations.filter((item) => !item.trashed_at && item.archived_at && !pendingDeletionIds.includes(item.id)).length,
    trash: conversations.filter((item) => item.trashed_at && !pendingDeletionIds.includes(item.id)).length,
    recovery: recoverySnapshots.length,
  }), [conversations, pendingDeletionIds, recoverySnapshots.length]);

  const collectionCards = [
    { id: "favorites", label: "Favorites", count: collectionCounts.favorites, icon: Heart },
    { id: "archived", label: "Archived", count: collectionCounts.archived, icon: History },
    { id: "trash", label: "Trash", count: collectionCounts.trash, icon: Trash2 },
    { id: "recovery", label: "Recovery Vault", count: collectionCounts.recovery, icon: ShieldCheck },
    ...collections.map((item) => ({ id: `collection:${item.id}`, collectionId: item.id, label: item.name, count: item.storyIds.filter((id) => conversations.some((conversation) => conversation.id === id && !conversation.trashed_at)).length, icon: FolderHeart })),
  ];

  const visibleStories = showAllRecent ? filtered : filtered.slice(0, 3);

  const activeCustomCollection = useMemo(() => String(view).startsWith("collection:")
    ? collections.find((item) => item.id === String(view).slice("collection:".length)) || null
    : null, [view, collections]);

  const deepMomentEntries = useMemo(() => deepMatches.map((match) => {
    const conversation = conversations.find((item) => item.id === match.conversationId);
    if (!conversation?.character) return null;
    return { ...match, conversation, character: conversation.character };
  }).filter(Boolean), [deepMatches, conversations]);

  function currentSectionTitle() {
    if (view === "active") return "RECENT STORIES";
    if (view === "favorites") return "FAVORITE STORIES";
    if (view === "archived") return "ARCHIVED STORIES";
    if (view === "trash") return "TRASH";
    if (view === "recovery") return "RECOVERY VAULT";
    return activeCustomCollection?.name?.toUpperCase() || "COLLECTION";
  }

  function collectionArt(type) {
    const custom = String(type).startsWith("collection:") ? collections.find((item) => item.id === String(type).slice("collection:".length)) : null;
    const match = conversations.find((item) => {
      if (type === "favorites") return !item.trashed_at && !item.archived_at && item.is_pinned;
      if (type === "archived") return !item.trashed_at && item.archived_at;
      if (type === "trash") return Boolean(item.trashed_at);
      if (custom) return custom.storyIds.includes(item.id) && !item.trashed_at;
      if (type === "recovery") return recoverySnapshots.some((snapshot) => snapshot.conversationId === item.id);
      return false;
    });
    const fallback = conversations.find((item) => !item.trashed_at);
    const target = match || fallback;
    const character = target?.character;
    return target?.cover_url || character?.coverUrl || character?.imageUrl || "";
  }

  function renderRecentStory(conversation) {
    const character = conversation.character;
    if (!character) return null;
    const title = conversation.title || character.name;
    const art = conversation.cover_url || character.coverUrl || character.imageUrl;
    const preview = shelfPreview(conversation.latestMessage?.content || character.firstMessage || character.role || "Continue the story.");
    return (
      <SwipeToTrash
        key={conversation.id}
        className="swipe-trash--story"
        direction="right"
        disabled={Boolean(deletingId === conversation.id || updatingId === conversation.id)}
        onDelete={() => conversation.trashed_at ? swipeDeleteConversationForever(conversation.id) : deleteConversation(null, conversation.id)}
        label={conversation.trashed_at ? `Delete ${title} forever` : `Delete ${title}`}
        actionText={conversation.trashed_at ? "Delete" : "Trash"}
        showLabel
      >
      <article
        className={`reference-story-row${conversation.is_pinned ? " reference-story-row--favorite" : ""}`}
        onClick={() => !conversation.trashed_at && !conversation.archived_at && onOpenCharacter(character, conversation.id)}
      >
        <div className="reference-story-row__art">{art ? <img src={art} alt=""/> : <span>{character.initials}</span>}</div>
        <div className="reference-story-row__copy">
          {editingId === conversation.id ? (
            <form className="reference-story-row__rename" onSubmit={(event) => saveTitle(event, conversation)} onClick={(event) => event.stopPropagation()}>
              <input autoFocus value={editTitle} maxLength={80} onChange={(event) => setEditTitle(event.target.value)} />
              <button type="submit" disabled={!editTitle.trim() || updatingId === conversation.id} aria-label="Save title"><Check size={15}/></button>
              <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel rename"><X size={15}/></button>
            </form>
          ) : <h3>{title}</h3>}
          {conversation.group_mode && <small className="reference-story-row__group">Group Story · {(conversation.groupCharacters || []).map((item)=>item.name).join(" · ")}</small>}
          <p>{preview}</p>
          <time>{formatShelfDate(conversation.updated_at)}</time>
        </div>
        {renderStoryMenu(conversation, title, "reference")}
      </article>
      </SwipeToTrash>
    );
  }

  function renderRecoverySnapshot(snapshot) {
    const character = characters.find((item) => item.id === snapshot.characterId);
    return <article className="v34915-recovery-row" key={snapshot.id}>
      <span className="v34915-recovery-row__icon"><ShieldCheck size={20}/></span>
      <div className="v34915-recovery-row__copy">
        <small>LOCAL SAFETY COPY · {formatShelfDate(snapshot.capturedAt)}</small>
        <strong>{snapshot.title || character?.name || "Recovered story"}</strong>
        <p>{snapshot.characterName || character?.name || "Velvet story"} · {snapshot.recordCount || 0} records · expires after 30 days</p>
      </div>
      <div className="v34915-recovery-row__actions">
        <button type="button" onClick={() => restoreSafetySnapshot(snapshot)} disabled={updatingId === snapshot.id}><RotateCcw size={15}/>{updatingId === snapshot.id ? "Restoring…" : "Restore"}</button>
        <button type="button" className="danger" onClick={() => removeSafetySnapshot(snapshot.id)}><Trash2 size={15}/>Remove copy</button>
      </div>
    </article>;
  }

  function renderDeepMoment(match) {
    const label = match.kind === "memory" ? "Memory" : match.kind === "message" && match.text ? "Message" : "Moment";
    return <button type="button" className="v34915-deep-match" key={`${match.kind}-${match.messageId || match.conversationId}-${match.date || ""}`} onClick={() => onOpenCharacter(match.character, match.conversationId, match.messageId || null)}>
      <span><Search size={15}/></span>
      <div><small>{label} · {match.conversation.title || match.character.name}</small><p>{shelfPreview(match.text).slice(0, 150)}</p></div>
      <ChevronRight size={16}/>
    </button>;
  }

  function renderStoryMenu(conversation, title, variant = "card") {
    const menuOpen = menuId === conversation.id;
    const panel = menuOpen && typeof document !== "undefined" ? createPortal(
      <div className="story-action-menu story-action-menu__portal-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setMenuId(null); }}>
        <div className="story-action-menu__panel story-action-menu__panel--portal" role="menu" aria-label={`Actions for ${title}`} onPointerDown={(event)=>event.stopPropagation()} onClick={(event)=>event.stopPropagation()}>
          <div className="story-action-menu__sheet-handle" aria-hidden="true" />
          <strong className="story-action-menu__sheet-title">{title}</strong>
          <button type="button" role="menuitem" onClick={(event) => { setMenuId(null); togglePinned(event, conversation); }}>{conversation.is_pinned ? <HeartOff size={15}/> : <Heart size={15}/>}<span>{conversation.is_pinned ? "Remove favorite" : "Favorite"}</span></button>
          <button type="button" role="menuitem" onClick={(event) => { setMenuId(null); beginRename(event, conversation); }}><Pencil size={15}/><span>Rename</span></button>
          <button type="button" role="menuitem" onClick={(event) => { setMenuId(null); duplicateConversation(event, conversation); }} disabled={updatingId === conversation.id}><Copy size={15}/><span>Duplicate</span></button>
          <button type="button" role="menuitem" onClick={(event) => { setMenuId(null); exportConversation(event, conversation); }} disabled={updatingId === conversation.id}><Download size={15}/><span>Export</span></button>
          {!conversation.trashed_at && <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuId(null); setCollectionDialog({ mode: "assign", conversation }); }}><FolderHeart size={15}/><span>Add to collection</span></button>}
          <button type="button" role="menuitem" onClick={(event) => { setMenuId(null); toggleArchived(event, conversation); }} disabled={updatingId === conversation.id}>{conversation.archived_at ? <ArchiveRestore size={15}/> : <Archive size={15}/>}<span>{conversation.archived_at ? "Restore" : "Archive"}</span></button>
          {onOpenDiagnostics && <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuId(null); onOpenDiagnostics(); }}><Bug size={15}/><span>Report a problem</span></button>}
          <span className="story-action-menu__separator" />
          <button type="button" role="menuitem" className={conversation.trashed_at ? "" : "danger"} onClick={(event) => { setMenuId(null); conversation.trashed_at ? restoreConversation(event, conversation.id) : deleteConversation(event, conversation.id); }} disabled={deletingId === conversation.id || updatingId === conversation.id}>{conversation.trashed_at ? <ArchiveRestore size={15}/> : <Trash2 size={15}/>}<span>{conversation.trashed_at ? "Restore" : "Move to Trash"}</span></button>
          {conversation.trashed_at && <button type="button" role="menuitem" className="danger" onClick={(event) => { setMenuId(null); permanentlyDeleteConversation(event, conversation.id); }}><Trash2 size={15}/><span>Delete forever</span></button>}
        </div>
      </div>,
      document.body,
    ) : null;

    return (
      <div className={`story-action-menu story-action-menu--${variant}${menuOpen ? " is-open" : ""}`} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="story-action-menu__trigger"
          onPointerDown={(event) => { event.stopPropagation(); }}
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuId((current) => current === conversation.id ? null : conversation.id); }}
          aria-label={`Story actions for ${title}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreHorizontal size={18}/>
        </button>
        {panel}
      </div>
    );
  }


  return (
    <section className="chats-page chats-page--reference">
      <header className="reference-stories-hero">
        <div className="reference-stories-hero__private"><Crown size={19}/><span>STORY LIBRARY</span></div>
        <div className="reference-stories-title" aria-label="Your Stories">
          <span className="reference-stories-title__script">your</span>
          <span className="reference-stories-title__line reference-stories-title__line--left" />
          <h1>STORIES</h1>
          <span className="reference-stories-title__spark">✦</span>
          <span className="reference-stories-title__line reference-stories-title__line--right" />
        </div>
        <div className="reference-stories-hero__actions">
          <button className="reference-stories-group" type="button" onClick={() => setGroupStoryOpen(true)} aria-label="New Group Story"><UsersRound size={22}/><span>Group</span></button>
          <button className="reference-stories-new" type="button" onClick={() => setPickerOpen(true)} aria-label="New story"><Sparkles size={26}/></button>
        </div>
      </header>

      <div className="library-purpose-note"><strong>Stories are your archive.</strong><span>Organize, favorite, duplicate, export or restore complete story timelines here.</span></div>

      <div className="reference-search-wrap">
        <label className="reference-search">
          <Search size={25}/>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a story, character or moment..." />
          {search && <button type="button" className="reference-search__clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={16}/></button>}
        </label>
        <button className={`reference-filter${filtersOpen ? " is-open" : ""}`} type="button" onClick={() => setFiltersOpen((value) => !value)} aria-label="Filter stories"><SlidersHorizontal size={25}/></button>
      </div>

      {filtersOpen && (
        <div className="reference-filter-menu">
          {[
            ["active", "All stories"],
            ["favorites", "Favorites"],
            ["archived", "Archived"],
            ["trash", "Trash"],
            ["recovery", "Recovery Vault"],
            ...collections.map((item) => [`collection:${item.id}`, item.name]),
          ].map(([id, label]) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setFiltersOpen(false); setShowAllRecent(true); }}>{label}</button>
          ))}
        </div>
      )}

      {loading && <PageState icon={<LoaderCircle className="spin" size={28}/>} text="Opening your library..." />}
      {!loading && error && <div className="chats-page__notice"><Sparkles size={17}/><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={16}/></button></div>}
      {libraryNotice && <div className="chats-page__notice v34915-library-notice"><ShieldCheck size={17}/><span>{libraryNotice}</span><button onClick={() => setLibraryNotice("")} aria-label="Dismiss"><X size={16}/></button></div>}

      {!loading && conversations.length === 0 && recoverySnapshots.length === 0 && collections.length === 0 && (
        <div className="reference-empty">
          <Sparkles size={28}/><span>YOUR FIRST STORY</span><h2>Nothing here yet</h2><p>Choose a character and begin a private world.</p>
          <button onClick={() => setPickerOpen(true)}><Plus size={17}/> Start a story</button>
        </div>
      )}

      {!loading && (conversations.length > 0 || recoverySnapshots.length > 0 || collections.length > 0) && (
        <>
          <section className="reference-collections">
            <h2>COLLECTIONS</h2>
            <div className="reference-collections__grid">
              {collectionCards.map((collection) => {
                const Icon = collection.icon;
                const art = collectionArt(collection.id);
                return (
                  <button
                    key={collection.id}
                    className={`reference-collection-card${view === collection.id ? " is-active" : ""}`}
                    type="button"
                    onClick={() => { setView(collection.id); setShowAllRecent(true); }}
                  >
                    {art && <img src={art} alt=""/>}
                    <span className={`reference-collection-card__fallback reference-collection-card__fallback--${collection.id}`} />
                    <span className="reference-collection-card__shade" />
                    <span className="reference-collection-card__icon"><Icon size={28}/></span>
                    <strong>{collection.label}</strong>
                    <small>{collection.count} {collection.count === 1 ? "story" : "stories"}</small>
                  </button>
                );
              })}
              <button className="reference-collection-card v34915-new-collection" type="button" onClick={() => { setCollectionName(""); setCollectionDialog({ mode: "create" }); }}>
                <span className="reference-collection-card__fallback" />
                <span className="reference-collection-card__shade" />
                <span className="reference-collection-card__icon"><FolderPlus size={28}/></span>
                <strong>New collection</strong>
                <small>Make your own shelf</small>
              </button>
            </div>
          </section>

          <section className="reference-recent">
            <header className="reference-section-heading">
              <h2>{currentSectionTitle()}</h2>
              <div className="v34915-section-actions">
                {activeCustomCollection && <button type="button" className="v34915-remove-collection" onClick={deleteActiveCollection}><Trash2 size={14}/>REMOVE COLLECTION</button>}
                {view !== "recovery" && filtered.length > 3 && <button type="button" onClick={() => setShowAllRecent((value) => !value)}>{showAllRecent ? "SHOW LESS" : "VIEW ALL"}<ChevronRight size={17}/></button>}
              </div>
            </header>
            {view === "recovery"
              ? (recoverySnapshots.length ? <div className="v34915-recovery-list">{recoverySnapshots.map(renderRecoverySnapshot)}</div> : <div className="reference-no-results"><ShieldCheck size={22}/><span>No recovery copies yet. Velvet creates them before permanent deletion.</span></div>)
              : (filtered.length ? <div className="reference-story-list">{visibleStories.map(renderRecentStory)}</div> : <div className="reference-no-results"><Search size={22}/><span>No stories here yet.</span></div>)}
          </section>

          {search.trim().length >= 2 && view !== "recovery" && <section className="v34915-deep-search">
            <header><div><small>DEEP SEARCH</small><h2>Matching moments</h2></div>{deepSearching && <LoaderCircle className="spin" size={18}/>}</header>
            {deepMomentEntries.length ? <div>{deepMomentEntries.map(renderDeepMoment)}</div> : !deepSearching && <p>No older messages or memories match this search.</p>}
          </section>}
        </>
      )}

      {collectionDialog && typeof document !== "undefined" && createPortal(
        <div className="v34915-collection-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setCollectionDialog(null); }}>
          <section className="v34915-collection-sheet" role="dialog" aria-modal="true" aria-label={collectionDialog.mode === "create" ? "Create collection" : "Story collections"} onPointerDown={(event)=>event.stopPropagation()}>
            <span className="velvet-sheet-grabber" aria-hidden="true"/>
            <header><div><small>{collectionDialog.mode === "create" ? "NEW COLLECTION" : "ORGANIZE STORY"}</small><h2>{collectionDialog.mode === "create" ? "Name this shelf" : (collectionDialog.conversation?.title || collectionDialog.conversation?.character?.name || "Collections")}</h2></div><button type="button" onClick={()=>setCollectionDialog(null)} aria-label="Close"><X size={18}/></button></header>
            {collectionDialog.mode === "create" ? <form onSubmit={createCollection} className="v34915-collection-create"><label><FolderPlus size={18}/><input autoFocus maxLength={40} value={collectionName} onChange={(event)=>setCollectionName(event.target.value)} placeholder="Campus favorites, Roman, Comfort reads…"/></label><button type="submit" disabled={!collectionName.trim()}>Create collection</button></form> : <div className="v34915-collection-assign">
              {collections.length ? collections.map((collection)=>{ const included=collection.storyIds.includes(collectionDialog.conversation.id); return <button type="button" key={collection.id} className={included?"is-active":""} onClick={()=>toggleCollectionStory(collection.id, collectionDialog.conversation.id)}><span><FolderHeart size={17}/><strong>{collection.name}</strong><small>{collection.storyIds.length} {collection.storyIds.length===1?"story":"stories"}</small></span>{included?<Check size={18}/>:<Plus size={18}/>}</button>; }) : <p>No custom collections yet.</p>}
              <button type="button" className="v34915-collection-assign__new" onClick={()=>{setCollectionName("");setCollectionDialog({mode:"create"});}}><FolderPlus size={16}/>New collection</button>
            </div>}
          </section>
        </div>, document.body
      )}

      {groupStoryOpen && <GroupStoryModal onClose={() => setGroupStoryOpen(false)} onOpenStory={onOpenCharacter}/>}

      {pickerOpen && (
        <div className="conversation-picker-backdrop" onMouseDown={() => !creatingId && setPickerOpen(false)}>
          <section className="conversation-picker conversation-picker--editorial" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="conversation-picker-title">
            <span className="velvet-sheet-grabber" aria-hidden="true" />
            <header>
              <div><p>NEW STORY</p><h2 id="conversation-picker-title">Who is this story with?</h2><span>Choose a character. Velvet will create a fresh timeline.</span></div>
              <button onClick={() => setPickerOpen(false)} disabled={Boolean(creatingId)} aria-label="Close"><X size={20}/></button>
            </header>
            <div className="conversation-picker__scroll">
            {characters.length > 0 ? (
              <div className="conversation-picker__list conversation-picker__list--editorial">
                {characters.map((character) => (
                  <button key={character.id} onClick={() => handleCreate(character)} disabled={Boolean(creatingId)} style={{ "--character-color": character.color }}>
                    <span className="conversation-row__avatar">{character.imageUrl ? <img src={character.imageUrl} alt="" /> : character.initials}</span>
                    <span><strong>{character.name}</strong><small>{character.role}</small></span>
                    {creatingId === character.id ? <LoaderCircle className="spin" size={20}/> : <Plus size={20}/>} 
                  </button>
                ))}
              </div>
            ) : (
              <div className="conversation-picker__empty"><p>Create a character before beginning a story.</p><button onClick={() => { setPickerOpen(false); onBrowseCharacters(); }}>Create a character</button></div>
            )}
            </div>
          </section>
        </div>
      )}
    </section>
  );

}

function PageState({ icon, text }) { return <div className="page-state">{icon}<p>{text}</p></div>; }
function sortConversations(a, b) {
  if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}
function cleanPreview(value = "") {
  return value
    .replaceAll("*", "").replaceAll("/", "").replaceAll("[", "").replaceAll("]", "")
    .replaceAll("~", "").replaceAll(">", "").replaceAll("#", "")
    .replace(/\s+/g, " ").trim();
}
function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

function shelfPreview(value = "") {
  const clean = cleanPreview(value);
  if (!clean) return "Continue your story.";
  const short = clean.length > 82 ? `${clean.slice(0, 79).trimEnd()}…` : clean;
  return `“${short}”`;
}

function formatShelfDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) return `Today at ${time}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function downloadStory(conversation, messages, format) {
  const characterName = conversation.character?.name || "Character";
  const title = conversation.title || characterName;
  const safeName = title.replace(/[^a-z0-9áéíóúñ_-]+/gi, "-").replace(/^-|-$/g, "") || "velvet-story";
  let content;
  let type;
  let extension;
  if (format === "json") {
    content = JSON.stringify({ title, character: characterName, exportedAt: new Date().toISOString(), messages }, null, 2);
    type = "application/json"; extension = "json";
  } else {
    const lines = messages.map((message) => `${message.sender === "user" ? "You" : characterName}:\n${message.content}`);
    content = format === "markdown" ? `# ${title}\n\n**Character:** ${characterName}\n\n---\n\n${lines.join("\n\n---\n\n")}` : `${title}\nCharacter: ${characterName}\n\n${lines.join("\n\n")}`;
    type = "text/plain"; extension = format === "markdown" ? "md" : "txt";
  }
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a"); link.href = url; link.download = `${safeName}.${extension}`; link.click(); URL.revokeObjectURL(url);
}

export default Chats;
