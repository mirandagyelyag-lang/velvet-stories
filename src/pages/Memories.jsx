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
  { id: "moments", label: "Moments", icon: Sparkles },
  { id: "characters", label: "Characters", icon: UserRound },
  { id: "relationships", label: "Relationships", icon: Heart },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "places", label: "Places", icon: MapPin },
];

const emptyDraft = { content: "", category: "fact", importance: 3, isImportant: false, isPinned: true, isCanon: false, scope: "character", replaceMemoryId: "", mergeMemoryId: "" };

function Memories({ onBack, onBrowseCharacters, onOpenCharacter }) {
  const { confirmAction, scheduleDeletion } = useFeedback();
  const { user } = useAuth();
  const { characters } = useCharacters();
  const { theme } = useTheme();
  const [memories, setMemories] = useState([]);
  const [conversationByCharacter, setConversationByCharacter] = useState(new Map());
  const [selectedCharacterId, setSelectedCharacterId] = useState("all");
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
  const [workingId, setWorkingId] = useState(null);

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
      const [{ data: memoryRows, error: memoryError }, { data: conversations, error: conversationError }] = await Promise.all([
        supabase.from("memories").select("*").order("is_canon", { ascending: false }).order("is_pinned", { ascending: false }).order("importance", { ascending: false }).order("updated_at", { ascending: false }),
        supabase.from("conversations").select("id, character_id, updated_at").order("updated_at", { ascending: false }),
      ]);
      if (memoryError) throw memoryError;
      if (conversationError) throw conversationError;
      const map = new Map();
      (conversations || []).forEach((conversation) => { if (!map.has(conversation.character_id)) map.set(conversation.character_id, conversation.id); });
      setConversationByCharacter(map);
      setMemories((memoryRows || []).map((memory) => ({ ...memory, character: characters.find((item) => item.id === memory.character_id) })));
    } catch (requestError) {
      console.error("Error loading memories:", requestError);
      setError("We couldn't load your memories.");
    } finally { setLoading(false); }
  }

  function openCreate() {
    const characterId = selectedCharacterId !== "all" ? selectedCharacterId : characters[0]?.id || "";
    setEditingMemory(null); setDraft(emptyDraft); setDraftCharacterId(characterId); setError(""); setEditorOpen(true); setMenuId(null);
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
    if (!await confirmAction({ title: "Delete this memory?", message: "The character will no longer receive this fact as long-term context.", confirmLabel: "Delete memory" })) return;
    scheduleDeletion({ message: "Deleting memory", onCommit: async () => { setWorkingId(memory.id); const { error: requestError } = await supabase.from("memories").delete().eq("id", memory.id); if (requestError) throw requestError; setMemories((current) => current.filter((item) => item.id !== memory.id)); setWorkingId(null); }, onError: (requestError) => { setWorkingId(null); setError(requestError.message); } });
  }

  const activeMemories = useMemo(() => memories.filter((memory) => !memory.superseded_at), [memories]);
  const replacementCandidates = useMemo(() => activeMemories.filter((memory) => memory.character_id === draftCharacterId && !memory.is_canon && memory.id !== editingMemory?.id), [activeMemories, draftCharacterId, editingMemory?.id]);

  const baseFiltered = useMemo(() => memories.filter((memory) => {
    if (selectedCharacterId !== "all" && memory.character_id !== selectedCharacterId) return false;
    if (view === "history") { if (!memory.superseded_at) return false; }
    else if (memory.superseded_at) return false;
    if (view === "canon" && !memory.is_canon) return false;
    if (view === "relationship" && memory.category !== "relationship") return false;
    if (view === "events" && !["event", "promise"].includes(memory.category)) return false;
    if (view === "preferences" && !["preference", "boundary", "person"].includes(memory.category)) return false;
    if (view === "conflicts" && memory.category !== "conflict") return false;
    if (category !== "all" && memory.category !== category) return false;
    return !search.trim() || `${memory.content} ${memory.character?.name || ""} ${memory.source_excerpt || ""}`.toLowerCase().includes(search.trim().toLowerCase());
  }), [memories, selectedCharacterId, category, search, view]);

  const groupCounts = useMemo(() => Object.fromEntries(groups.map((item) => [item.id, activeMemories.filter((memory) => memoryMatchesGroup(memory, item.id)).length])), [activeMemories]);
  const filtered = useMemo(() => baseFiltered.filter((memory) => memoryMatchesGroup(memory, group)), [baseFiltered, group]);
  const pinned = useMemo(() => filtered.filter((memory) => memory.is_pinned && !memory.superseded_at).slice(0, 8), [filtered]);
  const recent = useMemo(() => filtered.filter((memory) => !pinned.some((pinnedMemory) => pinnedMemory.id === memory.id)).sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)), [filtered, pinned]);

  return <section className="chats-page chats-page--reference memories-reference-page">
    <header className="reference-stories-hero memories-reference__hero">
      <button className="reference-stories-hero__private memories-reference__private" type="button" onClick={onBack} aria-label="Go back"><Crown size={19}/><span>PRIVATE LIBRARY</span></button>
      <div className="reference-stories-title memories-reference__title" aria-label="Your Memories">
        <span className="reference-stories-title__script">your</span>
        <span className="reference-stories-title__line reference-stories-title__line--left" />
        <h1>MEMORIES</h1>
        <span className="reference-stories-title__spark">✦</span>
        <span className="reference-stories-title__line reference-stories-title__line--right" />
      </div>
      <button className="reference-stories-new memories-reference__new" type="button" onClick={openCreate} disabled={!characters.length} aria-label="Add new memory"><Sparkles size={24}/></button>
    </header>

    <div className="reference-search-wrap memories-reference__search-wrap">
      <label className="reference-search">
        <Search size={23}/>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search memories..." />
        {search && <button type="button" className="reference-search__clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={16}/></button>}
      </label>
      <button className={`reference-filter${filterOpen ? " is-open" : ""}`} type="button" onClick={() => setFilterOpen((value) => !value)} aria-label="Memory filters"><Filter size={21}/></button>
    </div>

    {filterOpen && <div className="memories-reference__filter-menu">
      <label><span>Character</span><div><select value={selectedCharacterId} onChange={(event) => setSelectedCharacterId(event.target.value)}><option value="all">All characters</option>{characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select><ChevronDown size={15}/></div></label>
      <label><span>Memory view</span><div><select value={view} onChange={(event) => { setView(event.target.value); setCategory("all"); }}><option value="active">Active</option><option value="canon">Canon</option><option value="relationship">Relationship</option><option value="events">Events</option><option value="preferences">Preferences</option><option value="conflicts">Conflicts</option><option value="history">Replaced history</option></select><ChevronDown size={15}/></div></label>
      <label><span>Exact type</span><div><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={15}/></div></label>
    </div>}

    <div className="memories-reference__category-heading">
      <span>CATEGORIES</span>
      <small>{group === "all" ? "Everything Velvet remembers" : groupDescription(group)}</small>
    </div>
    <nav className="memories-reference__groups" aria-label="Memory categories">
      {groups.map(({ id, label, icon: Icon }) => <button key={id} className={group === id ? "is-active" : ""} onClick={() => setGroup(id)} aria-pressed={group === id}>{Icon && <Icon size={15}/>}<span>{label}</span><b>{groupCounts[id] || 0}</b></button>)}
    </nav>

    {error && !editorOpen && <div className="memories-page__notice"><Sparkles size={17}/><span>{error}</span><button onClick={() => setError("")}><X size={16}/></button></div>}

    {loading && <div className="page-state"><LoaderCircle className="spin" size={28}/><p>Opening memories...</p></div>}
    {!loading && characters.length === 0 && <div className="page-state page-state--empty"><span><UserRound size={28}/></span><h2>No characters yet</h2><p>Create someone before giving them long-term memories.</p><button onClick={onBrowseCharacters}>Create a character</button></div>}
    {!loading && characters.length > 0 && activeMemories.length === 0 && view !== "history" && <div className="page-state page-state--empty"><span><Sparkles size={28}/></span><h2>Your memory book is empty</h2><p>Velvet will save meaningful details as stories grow, or you can add one yourself.</p><button onClick={openCreate}>Add the first memory</button></div>}
    {!loading && memories.length > 0 && filtered.length === 0 && <div className="page-state"><Search size={27}/><p>No memories match this view.</p></div>}

    {!loading && pinned.length > 0 && <section className="memories-reference__section memories-reference__pinned">
      <div className="memories-reference__section-heading"><h2><Pin size={16}/> {groupSectionLabel(group, "PINNED")}</h2><span>{pinned.length}</span></div>
      <div className="memories-reference__pinned-rail">
        {pinned.map((memory) => <PinnedMemoryCard key={memory.id} memory={memory} onOpen={() => openEdit(memory)} onPin={() => togglePinned(memory)} />)}
      </div>
    </section>}

    {!loading && filtered.length > 0 && <section className="memories-reference__section memories-reference__recent">
      <div className="memories-reference__section-heading"><h2><Clock3 size={16}/> {view === "history" ? "REPLACED HISTORY" : groupSectionLabel(group, "RECENT")}</h2><span>{filtered.length}</span></div>
      <div className="memories-reference__list">
        {(recent.length ? recent : filtered).map((memory) => <MemoryRow key={memory.id} memory={memory} busy={workingId === memory.id} menuOpen={menuId === memory.id} onMenu={() => setMenuId((current) => current === memory.id ? null : memory.id)} onCanon={() => toggleCanon(memory)} onPin={() => togglePinned(memory)} onEdit={() => openEdit(memory)} onDelete={() => deleteMemory(memory)} onOpenCharacter={onOpenCharacter} />)}
      </div>
    </section>}

    {!loading && characters.length > 0 && <button className="memories-reference__add-bottom" onClick={openCreate}><Plus size={22}/>Add new memory</button>}

    {editorOpen && <MemoryEditor editingMemory={editingMemory} draft={draft} setDraft={setDraft} draftCharacterId={draftCharacterId} setDraftCharacterId={setDraftCharacterId} characters={characters} replacementCandidates={replacementCandidates} saving={saving} error={error} setError={setError} onClose={() => setEditorOpen(false)} onSubmit={saveMemory} />}
  </section>;
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
  if (group === "moments") return ["event", "conflict"].includes(memory.category);
  if (group === "characters") return ["person", "fact"].includes(memory.category) || !memory.category;
  if (group === "relationships") return ["relationship", "promise"].includes(memory.category);
  if (group === "preferences") return ["preference", "boundary"].includes(memory.category);
  if (group === "places") return memory.category === "world";
  return true;
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
