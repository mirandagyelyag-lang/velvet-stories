import {
  Archive,
  Check,
  ChevronDown,
  Clock3,
  Crown,
  Star,
  Combine,
  HelpCircle,
  Heart,
  Filter,
  History,
  LoaderCircle,
  MapPin,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { useFeedback } from "../context/FeedbackContext";
import SwipeToTrash from "../components/SwipeToTrash";
import "../styles/memories.css";

const categories = [
  { id: "all", label: "All memories" },
  { id: "fact", label: "Facts" },
  { id: "person", label: "About you" },
  { id: "relationship", label: "Relationship" },
  { id: "world", label: "World" },
  { id: "event", label: "Events" },
  { id: "preference", label: "Preferences" },
  { id: "promise", label: "Promises" },
  { id: "conflict", label: "Conflicts" },
  { id: "boundary", label: "Boundaries" },
];

const views = [
  ["active", "Active"],
  ["canon", "Canon"],
  ["relationship", "Relationship"],
  ["events", "Events"],
  ["preferences", "Preferences"],
  ["conflicts", "Conflicts"],
  ["history", "Replaced history"],
];

const groups = [
  { id: "all", label: "All", icon: null },
  { id: "pinned", label: "Pinned", icon: Pin },
  { id: "moments", label: "Moments", icon: Sparkles },
  { id: "about-you", label: "About you", icon: Heart },
  { id: "about-them", label: "About them", icon: UserRound },
  { id: "relationships", label: "Relationship", icon: Heart },
  { id: "places", label: "Places", icon: MapPin },
  { id: "people", label: "People", icon: UserRound },
];

const emptyDraft = { content: "", category: "fact", importance: 3, isImportant: false, isPinned: true, isCanon: false, scope: "character", replaceMemoryId: "", mergeMemoryId: "" };

function Memories({ initialCharacterId = "", onBack, onBrowseCharacters, onOpenCharacter }) {
  const { scheduleDeletion } = useFeedback();
  const { user } = useAuth();
  const { characters } = useCharacters();
  const { theme } = useTheme();
  const [memories, setMemories] = useState([]);
  const [conversationByCharacter, setConversationByCharacter] = useState(new Map());
  const [selectedCharacterId, setSelectedCharacterId] = useState(() => initialCharacterId || "all");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState("active");
  const [group, setGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftCharacterId, setDraftCharacterId] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingMemoryDeletionIds, setPendingMemoryDeletionIds] = useState([]);
  const [workingId, setWorkingId] = useState(null);
  const [importanceFilter, setImportanceFilter] = useState("all");
  const [cleanupNotice, setCleanupNotice] = useState("");
  const [conversationRows, setConversationRows] = useState([]);
  const [chemistryProfiles, setChemistryProfiles] = useState([]);
  const [storyMilestones, setStoryMilestones] = useState([]);
  const [detailMode, setDetailMode] = useState("book");
  const [detailSearch, setDetailSearch] = useState("");

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

  useEffect(() => { loadMemories(); }, [user?.id, characters.length]);

  async function loadMemories() {
    if (!user) return;
    try {
      setLoading(true); setError("");
      const [
        { data: memoryRows, error: memoryError },
        { data: conversations, error: conversationError },
        { data: chemistryRows, error: chemistryError },
        { data: milestoneRows, error: milestoneError },
      ] = await Promise.all([
        supabase.from("memories").select("*").order("is_canon", { ascending: false }).order("is_pinned", { ascending: false }).order("importance", { ascending: false }).order("updated_at", { ascending: false }),
        supabase.from("conversations").select("id, character_id, title, updated_at, relationship_state, story_timeline, story_recap, summary, unresolved_threads").is("trashed_at", null).is("archived_at", null).order("updated_at", { ascending: false }),
        supabase.from("story_chemistry_profiles").select("*").order("updated_at", { ascending: false }),
        supabase.from("story_milestones").select("*").order("created_at", { ascending: false }),
      ]);
      if (memoryError) throw memoryError;
      if (conversationError) throw conversationError;
      if (chemistryError) console.warn("Memory chemistry unavailable:", chemistryError.message);
      if (milestoneError) console.warn("Memory milestones unavailable:", milestoneError.message);
      const activeConversationIds = new Set((conversations || []).map((conversation) => conversation.id));
      const visibleMemories = (memoryRows || []).filter((memory) => !memory.conversation_id || activeConversationIds.has(memory.conversation_id));
      setConversationRows(conversations || []);
      setChemistryProfiles((chemistryRows || []).filter((row) => activeConversationIds.has(row.conversation_id)));
      setStoryMilestones((milestoneRows || []).filter((row) => activeConversationIds.has(row.conversation_id)));
      const map = new Map();
      (conversations || []).forEach((conversation) => { if (!map.has(conversation.character_id)) map.set(conversation.character_id, conversation.id); });
      setConversationByCharacter(map);
      setMemories(visibleMemories.map((memory) => ({ ...memory, character: characters.find((item) => item.id === memory.character_id) })));
    } catch (requestError) {
      console.error("Error loading memories:", requestError);
      setError("We couldn't load your memories.");
    } finally { setLoading(false); }
  }

  function openCreate() {
    const characterId = selectedCharacterId !== "all" ? selectedCharacterId : characters[0]?.id || "";
    setEditingMemory(null); setDraft(emptyDraft); setDraftCharacterId(characterId); setError(""); setEditorOpen(true); setMenuId(null);
  }

  function openCreateFor(characterId) {
    setSelectedCharacterId(characterId);
    setEditingMemory(null);
    setDraft(emptyDraft);
    setDraftCharacterId(characterId);
    setError("");
    setEditorOpen(true);
    setMenuId(null);
  }


  function openEdit(memory) {
    setEditingMemory(memory);
    setDraft({ content: memory.content, category: memory.category || "fact", importance: memory.importance || 3, isImportant: Number(memory.importance || 0) >= 5, isPinned: Boolean(memory.is_pinned), isCanon: Boolean(memory.is_canon), scope: memory.scope || "conversation", replaceMemoryId: "", mergeMemoryId: "" });
    setDraftCharacterId(memory.character_id); setError(""); setEditorOpen(true); setMenuId(null);
  }

  async function saveMemory(event) {
    event.preventDefault();
    const content = draft.content.trim();
    if (!content || !draftCharacterId) return;
    const activeForCharacter = memories.filter((memory) => !memory.superseded_at && memory.character_id === draftCharacterId);
    const duplicate = activeForCharacter.some((memory) => memory.id !== editingMemory?.id && normalize(memory.content) === normalize(content));
    if (duplicate) return setError("That character already remembers this. Edit or replace the existing memory instead.");

    try {
      setSaving(true); setError("");
      const payload = {
        content, category: draft.category, importance: draft.isImportant ? 5 : Number(draft.importance), is_pinned: Boolean(draft.isPinned || draft.isCanon), is_canon: Boolean(draft.isCanon), scope: draft.scope,
        why_remembered: draft.isCanon ? "Marked as canon by you. Velvet should treat this as authoritative continuity." : "Added manually so Velvet can preserve this detail.",
        updated_at: new Date().toISOString(), source: "manual",
      };
      let saved;
      if (editingMemory) {
        const { data, error: requestError } = await supabase.from("memories").update(payload).eq("id", editingMemory.id).select().single();
        if (requestError) throw requestError;
        saved = data;
        if (draft.mergeMemoryId) {
          const mergeTarget = activeForCharacter.find((memory) => memory.id === draft.mergeMemoryId);
          if (mergeTarget?.is_canon) throw new Error("Remove canon from the other memory before merging it.");
          const { error: mergeError } = await supabase.from("memories").update({ superseded_at: new Date().toISOString(), superseded_by: saved.id, updated_at: new Date().toISOString() }).eq("id", draft.mergeMemoryId);
          if (mergeError) throw mergeError;
        }
        setMemories((current) => current.map((item) => item.id === saved.id ? { ...saved, character: item.character } : item.id === draft.mergeMemoryId ? { ...item, superseded_at: new Date().toISOString(), superseded_by: saved.id } : item).sort(sortMemoryRows));
      } else {
        const conversationId = conversationByCharacter.get(draftCharacterId);
        if (!conversationId) throw new Error("Start a conversation with this character before adding memories.");
        const { data, error: requestError } = await supabase.from("memories").insert({ ...payload, conversation_id: conversationId, character_id: draftCharacterId, user_id: user.id }).select().single();
        if (requestError) throw requestError;
        saved = data;

        if (draft.replaceMemoryId) {
          const target = activeForCharacter.find((memory) => memory.id === draft.replaceMemoryId);
          if (target?.is_canon) throw new Error("A canon memory cannot be replaced automatically. Remove canon status first.");
          const { error: replaceError } = await supabase.from("memories").update({ superseded_at: new Date().toISOString(), superseded_by: saved.id, updated_at: new Date().toISOString() }).eq("id", draft.replaceMemoryId);
          if (replaceError) throw replaceError;
        }

        setMemories((current) => {
          const next = current.map((item) => item.id === draft.replaceMemoryId ? { ...item, superseded_at: new Date().toISOString(), superseded_by: saved.id } : item);
          return [{ ...saved, character: characters.find((item) => item.id === saved.character_id) }, ...next].sort(sortMemoryRows);
        });
      }
      setEditorOpen(false);
    } catch (requestError) {
      console.error("Error saving memory:", requestError);
      setError(requestError.message || "We couldn't save this memory.");
    } finally { setSaving(false); }
  }

  async function togglePinned(memory) {
    if (memory.superseded_at) return;
    try {
      setWorkingId(memory.id);
      const isPinned = !memory.is_pinned;
      const { error: requestError } = await supabase.from("memories").update({ is_pinned: isPinned, updated_at: new Date().toISOString() }).eq("id", memory.id);
      if (requestError) throw requestError;
      setMemories((current) => current.map((item) => item.id === memory.id ? { ...item, is_pinned: isPinned } : item).sort(sortMemoryRows));
      setMenuId(null);
    } catch (requestError) { setError(requestError.message); } finally { setWorkingId(null); }
  }

  async function toggleCanon(memory) {
    if (memory.superseded_at) return;
    try {
      setWorkingId(memory.id);
      const isCanon = !memory.is_canon;
      const { error: requestError } = await supabase.from("memories").update({ is_canon: isCanon, is_pinned: isCanon ? true : memory.is_pinned, why_remembered: isCanon ? "Marked as canon by you. Velvet should treat this as authoritative continuity." : (memory.why_remembered || "Saved memory."), updated_at: new Date().toISOString() }).eq("id", memory.id);
      if (requestError) throw requestError;
      setMemories((current) => current.map((item) => item.id === memory.id ? { ...item, is_canon: isCanon, is_pinned: isCanon ? true : item.is_pinned } : item).sort(sortMemoryRows));
      setMenuId(null);
    } catch (requestError) { setError(requestError.message); } finally { setWorkingId(null); }
  }

  async function deleteMemory(memory) {
    setMenuId(null);
    if (!memory || !memories.some((item) => item.id === memory.id)) return;

    // Remove from the book immediately; the DB delete waits only for the short Undo window.
    setMemories((current) => current.filter((item) => item.id !== memory.id));
    scheduleDeletion({
      batchKey: "memory-cleanup",
      message: (count) => `${count} ${count === 1 ? "memory" : "memories"} removed`,
      onUndo: () => setMemories((current) => current.some((item) => item.id === memory.id) ? current : [...current, memory].sort(sortMemoryRows)),
      onCommit: async () => {
        const { error: requestError } = await supabase.from("memories").delete().eq("id", memory.id);
        if (requestError) throw requestError;
      },
      onError: (requestError) => {
        setMemories((current) => current.some((item) => item.id === memory.id) ? current : [...current, memory].sort(sortMemoryRows));
        setError(requestError.message);
      },
    });
  }

  const activeMemories = useMemo(() => memories.filter((memory) => !memory.superseded_at && !pendingMemoryDeletionIds.includes(memory.id)), [memories, pendingMemoryDeletionIds]);
  const replacementCandidates = useMemo(() => activeMemories.filter((memory) => memory.character_id === draftCharacterId && !memory.is_canon && memory.id !== editingMemory?.id), [activeMemories, draftCharacterId, editingMemory?.id]);

  const memoryIndexGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return characters.map((character) => {
      const rows = activeMemories
        .filter((memory) => memory.character_id === character.id)
        .sort(sortMemoryRows);
      const searchable = `${character.name || ""} ${character.role || ""} ${rows.map((memory) => `${memory.content || ""} ${memory.category || ""}`).join(" ")}`.toLowerCase();
      return { character, rows };
    }).filter(({ character, rows }) => !needle || `${character.name || ""} ${character.role || ""}`.toLowerCase().includes(needle) || rows.some((memory) => `${memory.content || ""} ${memory.category || ""}`.toLowerCase().includes(needle)));
  }, [characters, activeMemories, search]);

  const selectedMemoryCharacter = useMemo(
    () => selectedCharacterId === "all" ? null : characters.find((character) => character.id === selectedCharacterId) || null,
    [characters, selectedCharacterId]
  );

  const selectedCharacterMemories = useMemo(() => {
    if (!selectedMemoryCharacter) return [];
    const needle = normalize(detailSearch);
    return activeMemories
      .filter((memory) => memory.character_id === selectedMemoryCharacter.id)
      .filter((memory) => memoryMatchesImportance(memory, importanceFilter))
      .filter((memory) => memoryMatchesGroup(memory, group))
      .filter((memory) => !needle || normalize(`${memory.content || ""} ${memory.category || ""} ${memory.why_remembered || ""}`).includes(needle))
      .sort(sortMemoryRows);
  }, [activeMemories, selectedMemoryCharacter, importanceFilter, group, detailSearch]);

  const selectedCharacterConversations = useMemo(() => selectedMemoryCharacter
    ? conversationRows.filter((row) => row.character_id === selectedMemoryCharacter.id).sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0))
    : [], [conversationRows, selectedMemoryCharacter]);

  const selectedConversationIds = useMemo(() => new Set(selectedCharacterConversations.map((row) => row.id)), [selectedCharacterConversations]);

  const selectedChemistry = useMemo(() => {
    if (!selectedMemoryCharacter) return null;
    return chemistryProfiles.find((row) => selectedConversationIds.has(row.conversation_id) && normalize(row.character_name) === normalize(selectedMemoryCharacter.name))
      || chemistryProfiles.find((row) => selectedConversationIds.has(row.conversation_id))
      || null;
  }, [chemistryProfiles, selectedConversationIds, selectedMemoryCharacter]);

  const selectedJournalEntries = useMemo(() => {
    if (!selectedMemoryCharacter) return [];
    const rows = [];
    const seen = new Set();
    for (const memory of activeMemories.filter((item) => item.character_id === selectedMemoryCharacter.id)) {
      const text = String(memory.content || "").trim();
      const signature = normalize(text);
      if (!text || seen.has(signature)) continue;
      seen.add(signature);
      rows.push({ id:`memory-${memory.id}`, kind:"memory", title:categoryLabel(memory.category), detail:text, date:memory.updated_at || memory.created_at, importance:Number(memory.importance||0), canon:Boolean(memory.is_canon), conversationId:memory.conversation_id || "" });
    }
    for (const milestone of storyMilestones.filter((item) => selectedConversationIds.has(item.conversation_id))) {
      const text = String(milestone.details || milestone.title || "").trim();
      const signature = normalize(`${milestone.title || ""} ${text}`);
      if (!text || seen.has(signature)) continue;
      seen.add(signature);
      rows.push({ id:`milestone-${milestone.id}`, kind:"milestone", title:milestone.title || "Milestone", detail:milestone.details || "", date:milestone.created_at, importance:5, conversationId:milestone.conversation_id || "" });
    }
    for (const conversation of selectedCharacterConversations) {
      for (const [index, beat] of (Array.isArray(conversation.story_timeline) ? conversation.story_timeline : []).entries()) {
        const title = typeof beat === "string" ? beat : beat?.label || beat?.note || beat?.detail || "Story beat";
        const detail = typeof beat === "string" ? "" : beat?.detail || beat?.note || "";
        const signature = normalize(`${title} ${detail}`);
        if (!signature || seen.has(signature)) continue;
        seen.add(signature);
        rows.push({ id:`timeline-${conversation.id}-${beat?.message_id || index}`, kind:"timeline", title, detail:detail && detail !== title ? detail : "", date:beat?.created_at || conversation.updated_at, importance:Number(beat?.importance||3), conversationId:conversation.id });
      }
    }
    return rows.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,120);
  }, [activeMemories, selectedMemoryCharacter, selectedCharacterConversations, storyMilestones, selectedConversationIds]);

  const selectedRelationshipMemories = useMemo(() => selectedMemoryCharacter
    ? activeMemories.filter((memory)=>memory.character_id===selectedMemoryCharacter.id && ["relationship","promise","conflict","boundary"].includes(memory.category)).sort(sortMemoryRows)
    : [], [activeMemories, selectedMemoryCharacter]);

  const selectedMemoryStats = useMemo(() => {
    if (!selectedMemoryCharacter) return { canon:0, pinned:0, relationship:0, moments:0 };
    const rows = activeMemories.filter((memory)=>memory.character_id===selectedMemoryCharacter.id);
    return {
      canon: rows.filter((memory)=>memory.is_canon).length,
      pinned: rows.filter((memory)=>memory.is_pinned).length,
      relationship: rows.filter((memory)=>["relationship","promise","conflict","boundary"].includes(memory.category)).length,
      moments: rows.filter((memory)=>["event","conflict","promise"].includes(memory.category)).length,
    };
  }, [activeMemories, selectedMemoryCharacter]);

  const relationshipTexture = useMemo(() => extractRelationshipTextureV34915(selectedCharacterConversations[0]?.relationship_state), [selectedCharacterConversations]);

  function openMemoryCharacter(characterId) {
    setSelectedCharacterId(characterId);
    setImportanceFilter("all");
    setGroup("all");
    setDetailMode("book");
    setDetailSearch("");
    setMenuId(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function closeMemoryCharacter() {
    setSelectedCharacterId("all");
    setImportanceFilter("all");
    setGroup("all");
    setDetailMode("book");
    setDetailSearch("");
    setMenuId(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  const duplicateClusters = useMemo(() => selectedMemoryCharacter ? findDuplicateClusters(activeMemories.filter((memory)=>memory.character_id===selectedMemoryCharacter.id)) : [], [activeMemories, selectedMemoryCharacter]);
  const globalDuplicateClusters = useMemo(() => characters.flatMap((character) => findDuplicateClusters(activeMemories.filter((memory)=>memory.character_id===character.id))), [activeMemories, characters]);
  const globalDuplicateCount = useMemo(() => globalDuplicateClusters.reduce((sum, cluster)=>sum+Math.max(0, cluster.length-1),0), [globalDuplicateClusters]);

  async function cleanAllDuplicates() {
    if (!globalDuplicateClusters.length || workingId) return;
    try {
      setCleanupNotice("");
      setWorkingId("global-duplicate-cleanup");
      const now = new Date().toISOString();
      const updates = [];
      for (const cluster of globalDuplicateClusters) {
        const keep = chooseMemoryKeeper(cluster);
        for (const memory of cluster) {
          if (memory.id === keep.id || memory.is_canon) continue;
          const { error: mergeError } = await supabase.from("memories").update({ superseded_at: now, superseded_by: keep.id, updated_at: now }).eq("id", memory.id);
          if (mergeError) throw mergeError;
          updates.push({ id: memory.id, keeper: keep.id });
        }
      }
      if (updates.length) setMemories((current)=>current.map((item)=>{ const hit=updates.find((u)=>u.id===item.id); return hit ? {...item,superseded_at:now,superseded_by:hit.keeper} : item; }));
      setCleanupNotice(updates.length ? `${updates.length} safe duplicate ${updates.length===1?"memory":"memories"} merged across your Memory Book.` : "No safe duplicates needed merging.");
    } catch (requestError) {
      setError(requestError.message || "Velvet couldn't clean duplicate memories.");
    } finally {
      setWorkingId(null);
    }
  }

  async function cleanSelectedDuplicates() {
    if (!selectedMemoryCharacter || !duplicateClusters.length || workingId) return;
    try {
      setCleanupNotice("");
      setWorkingId("duplicate-cleanup");
      const now = new Date().toISOString();
      const updates = [];
      for (const cluster of duplicateClusters) {
        const keep = chooseMemoryKeeper(cluster);
        for (const memory of cluster) {
          if (memory.id === keep.id || memory.is_canon) continue;
          const { error: mergeError } = await supabase.from("memories").update({ superseded_at: now, superseded_by: keep.id, updated_at: now }).eq("id", memory.id);
          if (mergeError) throw mergeError;
          updates.push({ id: memory.id, keeper: keep.id });
        }
      }
      if (updates.length) setMemories((current)=>current.map((item)=>{ const hit=updates.find((u)=>u.id===item.id); return hit ? {...item,superseded_at:now,superseded_by:hit.keeper} : item; }));
      setCleanupNotice(updates.length ? `${updates.length} duplicate ${updates.length===1?"memory":"memories"} merged into the clearest versions.` : "No safe duplicates needed merging.");
    } catch (requestError) { setError(requestError.message || "Velvet couldn't merge duplicates."); }
    finally { setWorkingId(null); }
  }

  if (selectedMemoryCharacter) {
    const art = selectedMemoryCharacter.imageUrl || selectedMemoryCharacter.coverUrl;
    const totalMemories = activeMemories.filter((memory) => memory.character_id === selectedMemoryCharacter.id).length;
    return <section className="chats-page chats-page--reference memories-reference-page memories-character-library memories-character-detail">
      <header className="reference-stories-hero memories-reference__hero">
        <button className="reference-stories-hero__private memories-reference__private" type="button" onClick={closeMemoryCharacter} aria-label="Back to memory characters"><Crown size={19}/><span>BACK TO CHARACTERS</span></button>
        <div className="reference-stories-title memories-reference__title" aria-label={`${selectedMemoryCharacter.name} Memories`}>
          <span className="reference-stories-title__script">their</span>
          <span className="reference-stories-title__line reference-stories-title__line--left" />
          <h1>MEMORIES</h1>
          <span className="reference-stories-title__spark">✦</span>
          <span className="reference-stories-title__line reference-stories-title__line--right" />
        </div>
        <button className="reference-stories-new memories-reference__new" type="button" onClick={() => openCreateFor(selectedMemoryCharacter.id)} aria-label={`Add memory for ${selectedMemoryCharacter.name}`}><Plus size={23}/></button>
      </header>

      <section className="memory-character-detail__hero v34915-memory-hero">
        <div className="memory-character-detail__portrait">{art ? <img src={art} alt=""/> : <span style={{ "--memory-color": selectedMemoryCharacter.color }}>{selectedMemoryCharacter.initials || "✦"}</span>}</div>
        <div className="memory-character-detail__copy"><small>CHARACTER · {selectedMemoryCharacter.name}</small><h2>{selectedMemoryCharacter.name}</h2><p>{selectedMemoryCharacter.role || "Character"}</p><span>{totalMemories} {totalMemories === 1 ? "saved memory" : "saved memories"}</span></div>
        <div className="v34915-memory-stats" aria-label="Memory summary">
          <span><strong>{selectedMemoryStats.canon}</strong><small>Canon</small></span>
          <span><strong>{selectedMemoryStats.pinned}</strong><small>Keepsakes</small></span>
          <span><strong>{selectedMemoryStats.relationship}</strong><small>Relationship</small></span>
          <span><strong>{selectedMemoryStats.moments}</strong><small>Moments</small></span>
        </div>
      </section>

      <nav className="v34915-memory-mode-tabs" aria-label="Memory Book views">
        <button type="button" className={detailMode === "book" ? "is-active" : ""} onClick={()=>setDetailMode("book")}><span>Memory Book</span><small>What Velvet remembers</small></button>
        <button type="button" className={detailMode === "timeline" ? "is-active" : ""} onClick={()=>setDetailMode("timeline")}><span>Timeline</span><small>How the story changed</small></button>
        <button type="button" className={detailMode === "relationship" ? "is-active" : ""} onClick={()=>setDetailMode("relationship")}><span>Us</span><small>Relationship journal</small></button>
      </nav>

      {detailMode !== "relationship" && <label className="v34915-memory-search"><Search size={17}/><input value={detailSearch} onChange={(event)=>setDetailSearch(event.target.value)} placeholder={detailMode === "book" ? "Search this memory book…" : "Search this timeline…"}/>{detailSearch&&<button type="button" onClick={()=>setDetailSearch("")} aria-label="Clear"><X size={14}/></button>}</label>}

      {detailMode === "book" && <>
        <div className="memory-character-detail__toolbar v311-memory-toolbar">
          <div className="v311-memory-tabs" role="tablist" aria-label="Memory categories">
            {groups.map((item)=>{ const Icon=item.icon; return <button type="button" key={item.id} className={group===item.id?"is-active":""} onClick={()=>setGroup(item.id)}>{Icon&&<Icon size={13}/>}<span>{item.label}</span></button>; })}
          </div>
          <div className="v311-memory-tools">
            <label className="memories-character-library__importance"><Star size={16}/><select value={importanceFilter} onChange={(event) => setImportanceFilter(event.target.value)} aria-label="Filter memories by importance"><option value="all">All importance</option><option value="essential">Essential · 5</option><option value="high">High · 4+</option><option value="medium">Medium · 3+</option><option value="low">Low · 1–2</option></select><ChevronDown size={14}/></label>
            {duplicateClusters.length>0&&<button type="button" className="v311-memory-clean" onClick={cleanSelectedDuplicates} disabled={workingId==="duplicate-cleanup"}><Combine size={15}/>{workingId==="duplicate-cleanup"?"Cleaning…":`Merge ${duplicateClusters.reduce((sum,c)=>sum+Math.max(0,c.length-1),0)} duplicates`}</button>}
          </div>
        </div>
        {cleanupNotice&&<div className="v311-memory-clean-notice"><Check size={14}/><span>{cleanupNotice}</span><button type="button" onClick={()=>setCleanupNotice("")}><X size={13}/></button></div>}

        {error && !editorOpen && <div className="memories-page__notice"><Sparkles size={17}/><span>{error}</span><button onClick={() => setError("")}><X size={16}/></button></div>}

        <section className="memory-character-detail__list">
          <header><div><small>MEMORY BOOK</small><h3>{detailSearch ? `${selectedCharacterMemories.length} matching memories` : importanceFilter === "all" ? "Everything Velvet remembers" : `${selectedCharacterMemories.length} matching memories`}</h3></div><span>{selectedCharacterMemories.length}</span></header>
          {selectedCharacterMemories.length ? selectedCharacterMemories.map((memory) => <SwipeToTrash
            key={memory.id}
            className="swipe-trash--memory"
            direction="right"
            disabled={workingId === memory.id}
            onDelete={() => deleteMemory(memory)}
            label={`Delete memory for ${selectedMemoryCharacter.name}`}
          ><CharacterThoughtRow
            memory={memory}
            busy={workingId === memory.id}
            menuOpen={menuId === memory.id}
            onMenu={() => setMenuId((current) => current === memory.id ? null : memory.id)}
            onCanon={() => toggleCanon(memory)}
            onPin={() => togglePinned(memory)}
            onEdit={() => openEdit(memory)}
            onDelete={() => deleteMemory(memory)}
            influencedAt={readMemoryInfluence(selectedMemoryCharacter.id, memory.id)}
          /></SwipeToTrash>) : <div className="memory-character-detail__empty"><Sparkles size={18}/><strong>No memories match.</strong><span>Try another filter or add one for {selectedMemoryCharacter.name}.</span></div>}
        </section>
      </>}

      {detailMode === "timeline" && <MemoryJournalTimeline entries={selectedJournalEntries} query={detailSearch} />}

      {detailMode === "relationship" && <MemoryRelationshipJournal
        character={selectedMemoryCharacter}
        memories={selectedRelationshipMemories}
        chemistry={selectedChemistry}
        texture={relationshipTexture}
        conversations={selectedCharacterConversations}
        onOpenStory={(conversationId)=>onOpenCharacter?.(selectedMemoryCharacter, conversationId)}
      />}

      <button className="memories-reference__add-bottom" onClick={() => openCreateFor(selectedMemoryCharacter.id)}><Plus size={22}/>Add memory for {selectedMemoryCharacter.name}</button>

      {editorOpen && <MemoryEditor editingMemory={editingMemory} draft={draft} setDraft={setDraft} draftCharacterId={draftCharacterId} setDraftCharacterId={setDraftCharacterId} characters={characters} replacementCandidates={replacementCandidates} saving={saving} error={error} setError={setError} onClose={() => setEditorOpen(false)} onSubmit={saveMemory} />}
    </section>;
  }

  return <section className="chats-page chats-page--reference memories-reference-page memories-character-library memories-character-index">
    <header className="reference-stories-hero memories-reference__hero">
      <button className="reference-stories-hero__private memories-reference__private" type="button" onClick={onBack} aria-label="Go back"><Crown size={19}/><span>PRIVATE MEMORY BOOK</span></button>
      <div className="reference-stories-title memories-reference__title" aria-label="Your Memories">
        <span className="reference-stories-title__script">your</span>
        <span className="reference-stories-title__line reference-stories-title__line--left" />
        <h1>MEMORIES</h1>
        <span className="reference-stories-title__spark">✦</span>
        <span className="reference-stories-title__line reference-stories-title__line--right" />
      </div>
      <button className="reference-stories-new memories-reference__new" type="button" onClick={openCreate} disabled={!characters.length} aria-label="Add new memory"><Sparkles size={24}/></button>
    </header>

    <div className="reference-search-wrap memories-reference__search-wrap memories-character-index__search">
      <label className="reference-search">
        <Search size={23}/>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search characters..." />
        {search && <button type="button" className="reference-search__clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={16}/></button>}
      </label>
    </div>

    <div className="memories-character-library__summary"><span>CHARACTERS</span><small>{memoryIndexGroups.length} in your memory book</small></div>

    {globalDuplicateCount > 0 && <div className="v312-memory-hygiene"><span><Combine size={17}/><span><strong>Memory cleanup</strong><small>{globalDuplicateCount} similar {globalDuplicateCount===1?"memory":"memories"} can be merged safely.</small></span></span><button type="button" onClick={cleanAllDuplicates} disabled={workingId==="global-duplicate-cleanup"}>{workingId==="global-duplicate-cleanup"?<><LoaderCircle className="spin" size={14}/>Cleaning…</>:<>Merge duplicates</>}</button></div>}
    {cleanupNotice&&<div className="v311-memory-clean-notice"><Check size={14}/><span>{cleanupNotice}</span><button type="button" onClick={()=>setCleanupNotice("")}><X size={13}/></button></div>}

    {error && !editorOpen && <div className="memories-page__notice"><Sparkles size={17}/><span>{error}</span><button onClick={() => setError("")}><X size={16}/></button></div>}
    {loading && <div className="page-state"><LoaderCircle className="spin" size={28}/><p>Opening memories...</p></div>}
    {!loading && characters.length === 0 && <div className="page-state page-state--empty"><span><UserRound size={28}/></span><h2>No characters yet</h2><p>Create someone before giving them long-term memories.</p><button onClick={onBrowseCharacters}>Create a character</button></div>}
    {!loading && characters.length > 0 && memoryIndexGroups.length === 0 && <div className="page-state"><Search size={27}/><p>No characters match this search.</p></div>}

    {!loading && memoryIndexGroups.length > 0 && <div className="memory-character-index__grid">
      {memoryIndexGroups.map(({ character, rows }) => <MemoryCharacterIndexCard key={character.id} character={character} count={rows.length} onOpen={() => openMemoryCharacter(character.id)}/>) }
    </div>}

    {editorOpen && <MemoryEditor editingMemory={editingMemory} draft={draft} setDraft={setDraft} draftCharacterId={draftCharacterId} setDraftCharacterId={setDraftCharacterId} characters={characters} replacementCandidates={replacementCandidates} saving={saving} error={error} setError={setError} onClose={() => setEditorOpen(false)} onSubmit={saveMemory} />}
  </section>;
}

function MemoryJournalTimeline({ entries, query }) {
  const needle = normalize(query);
  const filtered = (entries || []).filter((entry) => !needle || normalize(`${entry.title || ""} ${entry.detail || ""}`).includes(needle));
  const grouped = filtered.reduce((map, entry) => {
    const key = journalMonthLabel(entry.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
    return map;
  }, new Map());
  return <section className="v34915-memory-journal">
    <header><div><small>STORY JOURNAL</small><h3>Moments that changed the story</h3></div><span>{filtered.length}</span></header>
    {filtered.length ? <div className="v34915-memory-journal__months">{[...grouped.entries()].map(([month, rows])=><section key={month}><h4>{month}</h4><ol>{rows.map((entry)=><li key={entry.id} className={`is-${entry.kind}${entry.canon?" is-canon":""}`}><span className="v34915-memory-journal__dot"/><div><small>{entry.kind === "milestone" ? "MILESTONE" : entry.kind === "timeline" ? "STORY BEAT" : entry.canon ? "CANON MEMORY" : "MEMORY"} · {formatMemoryDate(entry.date)}</small><strong>{entry.title}</strong>{entry.detail&&<p>{entry.detail}</p>}</div></li>)}</ol></section>)}</div> : <div className="memory-character-detail__empty"><Clock3 size={19}/><strong>No matching story moments.</strong><span>As this relationship evolves, milestones and important memories will collect here.</span></div>}
  </section>;
}

function MemoryRelationshipJournal({ character, memories, chemistry, texture, conversations, onOpenStory }) {
  const promises = memories.filter((memory)=>memory.category === "promise" || memory.category === "boundary");
  const conflicts = memories.filter((memory)=>memory.category === "conflict");
  const relationship = memories.filter((memory)=>memory.category === "relationship");
  const insideJokes = Array.isArray(chemistry?.inside_jokes) ? chemistry.inside_jokes.filter(Boolean).slice(0,8) : [];
  const places = Array.isArray(chemistry?.meaningful_places) ? chemistry.meaningful_places.filter(Boolean).slice(0,8) : [];
  const recent = conversations?.[0] || null;
  return <section className="v34915-relationship-journal">
    <header className="v34915-relationship-journal__hero"><div><small>RELATIONSHIP JOURNAL</small><h3>{character.name} & you</h3><p>What changed between you, without reducing it to a score.</p></div>{recent&&<button type="button" onClick={()=>onOpenStory?.(recent.id)}>Open latest story<ChevronDown size={14}/></button>}</header>

    {(texture.length > 0 || chemistry?.signature) && <section className="v34915-relationship-card v34915-relationship-card--texture"><small>RIGHT NOW</small>{chemistry?.signature&&<strong>{chemistry.signature}</strong>}{texture.map((line,index)=><p key={`${line}-${index}`}>{line}</p>)}</section>}

    {(insideJokes.length > 0 || places.length > 0) && <section className="v34915-relationship-keepsakes"><div>{insideJokes.length>0&&<><small>INSIDE JOKES</small><div>{insideJokes.map((item)=><span key={item}>{item}</span>)}</div></>}</div><div>{places.length>0&&<><small>MEANINGFUL PLACES</small><div>{places.map((item)=><span key={item}>{item}</span>)}</div></>}</div></section>}

    <div className="v34915-relationship-grid">
      <RelationshipMemorySection title="Relationship shifts" rows={relationship} empty="No saved relationship shifts yet."/>
      <RelationshipMemorySection title="Promises & boundaries" rows={promises} empty="No promises or boundaries saved yet."/>
      <RelationshipMemorySection title="Conflict & repair" rows={conflicts} empty="No major conflict memories saved yet."/>
    </div>
  </section>;
}

function RelationshipMemorySection({ title, rows, empty }) {
  return <section className="v34915-relationship-card"><small>{title.toUpperCase()}</small>{rows.length ? <div>{rows.slice(0,12).map((memory)=><article key={memory.id}><strong>{memory.content}</strong><span>{formatMemoryDate(memory.updated_at || memory.created_at)}{memory.is_canon?" · Canon":""}</span></article>)}</div> : <p>{empty}</p>}</section>;
}

function extractRelationshipTextureV34915(state) {
  if (!state || typeof state !== "object") return [];
  const blocked = /score|percent|meter|level|points|count|turn|revision|version/i;
  const lines=[];
  const visit=(value,key="")=>{
    if(lines.length>=5 || blocked.test(key)) return;
    if(typeof value === "string") { const text=value.trim(); if(text && text.length>=3 && text.length<=220 && !lines.includes(text)) lines.push(text); return; }
    if(Array.isArray(value)) { value.slice(0,4).forEach((item)=>visit(item,key)); return; }
    if(value && typeof value === "object") Object.entries(value).slice(0,12).forEach(([childKey,child])=>visit(child,childKey));
  };
  visit(state);
  return lines;
}

function journalMonthLabel(value) {
  if (!value) return "Undated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Undated";
  return date.toLocaleDateString([], { month:"long", year:"numeric" });
}

function MemoryCharacterIndexCard({ character, count, onOpen }) {
  const art = character.imageUrl || character.coverUrl;
  return <article className="memory-character-index-card">
    <button type="button" className="memory-character-index-card__main" onClick={onOpen}>
      {art ? <img src={art} alt="" loading="lazy" decoding="async"/> : <span className="memory-character-index-card__fallback" style={{ "--memory-color": character.color }}>{character.initials || "✦"}</span>}
      <span className="memory-character-index-card__shade"/>
      <span className="memory-character-index-card__copy"><strong>CHARACTER · {character.name}</strong><em>{count} {count === 1 ? "memory" : "memories"}</em></span>
    </button>
  </article>;
}

function CharacterThoughtRow({ memory, busy, menuOpen, onMenu, onCanon, onPin, onEdit, onDelete, influencedAt }) {
  const importance = Number(memory.importance || 0);
  return <div className={`character-memory-thought${memory.is_canon ? " is-canon" : ""}${memory.is_pinned ? " is-pinned" : ""}`}>
    <div className="character-memory-thought__meta">
      <span className={`character-memory-thought__importance importance-${Math.max(1, importance)}`}><Star size={12} fill={importance >= 4 ? "currentColor" : "none"}/>{importance || 1} · {importanceLabel(importance || 1)}</span>
      {memory.is_canon && <span><ShieldCheck size={12}/>Canon</span>}
      {memory.is_pinned && <span><Pin size={12}/>Pinned</span>}
    </div>
    <p>{memory.content}</p>
    <div className="character-memory-thought__foot"><div className="v311-memory-footdates"><time>{formatMemoryDate(memory.updated_at || memory.created_at)}</time>{influencedAt&&<span className="v311-memory-used"><Sparkles size={11}/>Used in a reply {formatInfluenceDate(influencedAt)}</span>}</div><div className="character-memory-thought__menu-wrap"><button type="button" onClick={onMenu} disabled={busy} aria-label="Memory actions">{busy ? <LoaderCircle className="spin" size={15}/> : <MoreHorizontal size={17}/>}</button>{menuOpen && <div className="memories-reference__actions character-memory-thought__actions"><button onClick={onPin}>{memory.is_pinned ? <PinOff size={15}/> : <Pin size={15}/>} {memory.is_pinned ? "Unpin" : "Pin"}</button><button onClick={onCanon}><ShieldCheck size={15}/> {memory.is_canon ? "Remove canon" : "Mark canon"}</button><button onClick={onEdit}><Pencil size={15}/>Edit</button><button className="danger" onClick={onDelete}><Trash2 size={15}/>Delete</button></div>}</div></div>
  </div>;
}

function memoryMatchesImportance(memory, filter) {
  const value = Number(memory.importance || 0);
  if (filter === "essential") return value >= 5;
  if (filter === "high") return value >= 4;
  if (filter === "medium") return value >= 3;
  if (filter === "low") return value <= 2;
  return true;
}

function PinnedMemoryCard({ memory, onOpen, onPin }) {
  const art = memory.character?.coverUrl || memory.character?.imageUrl;
  return <article className="memories-reference__pinned-card" onClick={onOpen}>
    {art ? <img src={art} alt=""/> : <div className="memories-reference__art-fallback" style={{ "--memory-color": memory.character?.color }} />}
    <span className="memories-reference__card-shade" />
    <button className="memories-reference__pin" type="button" onClick={(event) => { event.stopPropagation(); onPin(); }} aria-label="Unpin memory"><Pin size={17} fill="currentColor"/></button>
    <div className="memories-reference__pinned-copy">
      <small>{groupLabel(memory)} · {memory.character?.name || "Memory"}</small>
      <strong>{truncate(memory.content, 92)}</strong>
      <time>{formatMemoryDate(memory.updated_at || memory.created_at)}</time>
    </div>
  </article>;
}

function MemoryRow({ memory, busy, menuOpen, onMenu, onCanon, onPin, onEdit, onDelete, onOpenCharacter }) {
  const character = memory.character;
  const art = character?.coverUrl || character?.imageUrl;
  const replaced = Boolean(memory.superseded_at);
  return <article className={`memories-reference__row${memory.is_canon ? " is-canon" : ""}${replaced ? " is-replaced" : ""}`}>
    <button className="memories-reference__row-art" onClick={() => character && onOpenCharacter(character)} aria-label={character ? `Open ${character.name}` : "Memory character"}>{art ? <img src={art} alt=""/> : <span style={{ "--memory-color": character?.color }}>{character?.initials || "✦"}</span>}</button>
    <div className="memories-reference__row-copy">
      <small>{groupLabel(memory)}{Number(memory.importance || 0) >= 5 ? " · IMPORTANT" : ""}{memory.is_canon ? " · CANON" : ""}{replaced ? " · REPLACED" : ""}</small>
      <p>{memory.content}</p>
      <span>{character?.name || "Unknown character"} · {memory.scope === "conversation" ? "THIS STORY" : "ALL STORIES"} · {formatMemoryDate(memory.updated_at || memory.created_at)}</span>{memory.why_remembered && <details className="memories-reference__why"><summary><HelpCircle size={12}/> Why Velvet remembers this</summary><p>{memory.why_remembered}</p></details>}
    </div>
    <div className="memories-reference__row-menu-wrap">
      <button className="memories-reference__row-menu" onClick={onMenu} disabled={busy} aria-label="Memory actions">{busy ? <LoaderCircle className="spin" size={17}/> : <MoreHorizontal size={19}/>}</button>
      {menuOpen && <div className="memories-reference__actions">
        {!replaced && <><button onClick={onPin}>{memory.is_pinned ? <PinOff size={15}/> : <Pin size={15}/>} {memory.is_pinned ? "Unpin" : "Pin"}</button><button onClick={onCanon}><ShieldCheck size={15}/> {memory.is_canon ? "Remove canon" : "Mark canon"}</button><button onClick={onEdit}><Pencil size={15}/>Edit</button></>}
        <button className="danger" onClick={onDelete}><Trash2 size={15}/>Delete</button>
      </div>}
    </div>
  </article>;
}

function MemoryEditor({ editingMemory, draft, setDraft, draftCharacterId, setDraftCharacterId, characters, replacementCandidates, saving, error, setError, onClose, onSubmit }) {
  const categoryOptions = categories.slice(1);
  return <div className="memory-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
    <form className={`memory-editor memory-editor--${editingMemory ? "edit" : "create"}`} onSubmit={onSubmit}>
      <header className="memory-editor__header">
        <span className="memory-editor__header-icon"><Sparkles size={19}/></span>
        <div><p>MEMORY BOOK</p><h2>{editingMemory ? "Refine this memory" : "Add something important"}</h2><small>Give Velvet one clear thing worth carrying into future scenes.</small></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close memory editor"><X size={20}/></button>
      </header>

      <section className="memory-editor__primary">
        {!editingMemory && <label className="memory-editor__character"><span>Who is this about?</span><select value={draftCharacterId} onChange={(event) => { setDraftCharacterId(event.target.value); setDraft((current) => ({ ...current, replaceMemoryId: "" })); }} disabled={saving}><option value="">Choose a character</option>{characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>}
        <label className="memory-editor__content"><span>What should Velvet remember?</span><textarea value={draft.content} onChange={(event) => { setDraft((current) => ({ ...current, content: event.target.value })); setError(""); }} maxLength={500} rows="5" placeholder="Example: He hates being touched when he is angry, but always stays nearby until the argument is resolved." autoFocus disabled={saving}/><small>{draft.content.length}/500</small></label>
      </section>

      <section className="memory-editor__category-block">
        <div className="memory-editor__section-label"><span>Category</span><small>Pick the closest match</small></div>
        <div className="memory-editor__category-chips" role="group" aria-label="Memory category">
          {categoryOptions.map((item) => <button key={item.id} type="button" className={draft.category === item.id ? "is-active" : ""} onClick={() => setDraft((current) => ({ ...current, category: item.id }))}>{item.label}</button>)}
        </div>
      </section>

      <section className="memory-editor__details-grid">
        <label><span>Importance</span><select value={draft.importance} onChange={(event) => setDraft((current) => ({ ...current, importance: event.target.value }))}>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value} · {importanceLabel(value)}</option>)}</select></label>
        <label><span>Where should it apply?</span><select value={draft.scope} onChange={(event) => setDraft((current) => ({ ...current, scope: event.target.value }))}><option value="conversation">This story only</option><option value="character">All stories with this character</option></select></label>
      </section>

      <section className="memory-editor__switches" aria-label="Memory priorities">
        <label className="memory-editor__pin memory-editor__important"><input type="checkbox" checked={draft.isImportant} onChange={(event) => setDraft((current) => ({ ...current, isImportant: event.target.checked, importance: event.target.checked ? 5 : current.importance }))}/><span><Star size={17}/><strong>Important</strong><small>Push this toward the top of memory priority.</small></span></label>
        <label className="memory-editor__pin"><input type="checkbox" checked={draft.isPinned} onChange={(event) => setDraft((current) => ({ ...current, isPinned: event.target.checked }))}/><span><Pin size={17}/><strong>Never forget</strong><small>Keep it available even when the story gets long.</small></span></label>
        <label className="memory-editor__pin memory-editor__canon"><input type="checkbox" checked={draft.isCanon} onChange={(event) => setDraft((current) => ({ ...current, isCanon: event.target.checked, isPinned: event.target.checked ? true : current.isPinned }))}/><span><ShieldCheck size={17}/><strong>Canon</strong><small>Treat this as authoritative continuity.</small></span></label>
      </section>

      {!editingMemory && replacementCandidates.length > 0 && <details className="memory-editor__advanced"><summary><Archive size={15}/><span>Replace an older memory</span><small>Optional</small><ChevronDown size={15}/></summary><label className="memory-editor__replace"><select value={draft.replaceMemoryId} onChange={(event) => setDraft((current) => ({ ...current, replaceMemoryId: event.target.value }))}><option value="">Keep every existing memory</option>{replacementCandidates.map((memory) => <option key={memory.id} value={memory.id}>{memory.content.slice(0, 90)}</option>)}</select><small>The old memory moves to Replaced history instead of disappearing.</small></label></details>}
      {editingMemory && replacementCandidates.filter((memory) => memory.id !== editingMemory.id).length > 0 && <details className="memory-editor__advanced"><summary><Combine size={15}/><span>Merge another memory</span><small>Optional</small><ChevronDown size={15}/></summary><label className="memory-editor__replace"><select value={draft.mergeMemoryId} onChange={(event) => setDraft((current) => ({ ...current, mergeMemoryId: event.target.value }))}><option value="">Do not merge</option>{replacementCandidates.filter((memory) => memory.id !== editingMemory.id).map((memory) => <option key={memory.id} value={memory.id}>{memory.content.slice(0, 90)}</option>)}</select><small>Edit the text above into the final merged version. The other memory moves to Replaced history.</small></label></details>}

      {error && <p className="memory-editor__error">{error}</p>}
      <footer><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" disabled={saving || !draft.content.trim() || !draftCharacterId}>{saving ? <LoaderCircle className="spin" size={17}/> : <Check size={17}/>} {saving ? "Saving…" : editingMemory ? "Save changes" : "Remember this"}</button></footer>
    </form>
  </div>;
}

function memoryMatchesGroup(memory, group) {
  if (group === "all") return true;
  if (group === "pinned") return Boolean(memory.is_pinned || memory.is_canon);
  if (group === "moments") return ["event", "conflict", "promise"].includes(memory.category);
  if (group === "about-you") return ["preference", "boundary"].includes(memory.category);
  if (group === "about-them") return ["fact"].includes(memory.category);
  if (group === "relationships") return ["relationship", "promise", "conflict"].includes(memory.category);
  if (group === "places") return memory.category === "world";
  if (group === "people") return memory.category === "person";
  return true;
}

function readMemoryInfluence(characterId, memoryId) {
  try { return JSON.parse(localStorage.getItem(`velvet_memory_influence_${characterId}`) || "{}")[memoryId]?.at || ""; } catch { return ""; }
}
function formatInfluenceDate(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60*60*1000) return "just now";
  if (diff < 24*60*60*1000) return "today";
  if (diff < 48*60*60*1000) return "yesterday";
  return new Date(value).toLocaleDateString([], { day:"numeric", month:"short" });
}
function memoryTokenSet(value="") { return new Set(normalize(value).split(/\s+/).filter((token)=>token.length>2)); }
function memorySimilarityScore(a,b) {
  const A=memoryTokenSet(a), B=memoryTokenSet(b); if(!A.size||!B.size) return 0;
  let shared=0; A.forEach((token)=>{if(B.has(token)) shared++;});
  return shared / Math.max(A.size,B.size);
}
function findDuplicateClusters(rows=[]) {
  const remaining=[...rows].filter((m)=>!m.superseded_at); const clusters=[]; const used=new Set();
  for (const memory of remaining) {
    if(used.has(memory.id)) continue;
    const cluster=[memory];
    for (const other of remaining) {
      if(other.id===memory.id||used.has(other.id)) continue;
      const exact=normalize(memory.content)===normalize(other.content);
      const similar=memory.category===other.category && memorySimilarityScore(memory.content,other.content)>=0.82;
      if(exact||similar) cluster.push(other);
    }
    if(cluster.length>1){ cluster.forEach((m)=>used.add(m.id)); clusters.push(cluster); }
  }
  return clusters;
}
function chooseMemoryKeeper(cluster=[]) {
  return [...cluster].sort((a,b)=>Number(b.is_canon)-Number(a.is_canon)||Number(b.is_pinned)-Number(a.is_pinned)||Number(b.importance||0)-Number(a.importance||0)||String(b.content||"").length-String(a.content||"").length)[0];
}

function groupLabel(memory) {
  if (["event", "conflict"].includes(memory.category)) return "MOMENT";
  if (["person", "fact"].includes(memory.category) || !memory.category) return "CHARACTER";
  if (["relationship", "promise"].includes(memory.category)) return "RELATIONSHIP";
  if (["preference", "boundary"].includes(memory.category)) return "PREFERENCE";
  if (memory.category === "world") return "PLACE";
  return categoryLabel(memory.category).toUpperCase();
}
function groupSectionLabel(group, prefix) {
  const label = groups.find((item) => item.id === group)?.label || "Memories";
  return `${prefix} ${group === "all" ? "MEMORIES" : label.toUpperCase()}`;
}
function groupDescription(group) {
  return ({
    moments: "Scenes, events and conflicts",
    characters: "People and character facts",
    relationships: "Relationship shifts and promises",
    preferences: "Likes, dislikes and boundaries",
    places: "Locations and world details",
  })[group] || "Everything Velvet remembers";
}
function formatMemoryDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}
function truncate(value = "", max = 100) { return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value; }
function sortMemoryRows(a,b){ if(Boolean(a.superseded_at)!==Boolean(b.superseded_at)) return a.superseded_at?1:-1; if(Boolean(a.is_canon)!==Boolean(b.is_canon)) return a.is_canon?-1:1; if(Boolean(a.is_pinned)!==Boolean(b.is_pinned)) return a.is_pinned?-1:1; return (b.importance||0)-(a.importance||0)||new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at); }
function normalize(value){return String(value||"").toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi," ").trim();}
function categoryLabel(value){return categories.find((item)=>item.id===value)?.label||"Memory";}
function importanceLabel(value){return({1:"Minor",2:"Useful",3:"Important",4:"Major",5:"Essential"})[value];}
export default Memories;
