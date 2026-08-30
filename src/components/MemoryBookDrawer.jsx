import {
  BookOpen,
  Check,
  LoaderCircle,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";

const CATEGORIES = [
  { id: "fact", label: "Fact" },
  { id: "person", label: "Person" },
  { id: "relationship", label: "Relationship" },
  { id: "preference", label: "Preference" },
  { id: "event", label: "Event" },
  { id: "promise", label: "Promise" },
  { id: "conflict", label: "Conflict" },
  { id: "boundary", label: "Boundary" },
  { id: "world", label: "World" },
];

const EMPTY_DRAFT = {
  content: "",
  category: "fact",
  importance: 4,
  scope: "conversation",
  isPinned: false,
  isCanon: false,
};

export default function MemoryBookDrawer({ open, onClose, character, conversationId, onCountChange }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (open && character?.id) loadMemories();
  }, [open, character?.id, conversationId]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  async function loadMemories() {
    setLoading(true);
    setError("");
    try {
      const { data, error: requestError } = await supabase
        .from("memories")
        .select("*")
        .eq("character_id", character.id)
        .is("superseded_at", null)
        .order("is_canon", { ascending: false })
        .order("is_pinned", { ascending: false })
        .order("importance", { ascending: false })
        .order("updated_at", { ascending: false });
      if (requestError) throw requestError;
      const visible = (data || []).filter(
        (memory) => memory.scope === "character" || memory.conversation_id === conversationId,
      );
      setMemories(visible);
      onCountChange?.(visible.length);
    } catch (requestError) {
      console.error("Memory book load failed:", requestError);
      setError("Velvet couldn't open this memory book.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return memories.filter((memory) => {
      if (filter === "automatic" && memory.source !== "automatic") return false;
      if (filter === "manual" && memory.source === "automatic") return false;
      if (filter === "pinned" && !memory.is_pinned) return false;
      if (filter === "canon" && !memory.is_canon) return false;
      if (filter === "about-you" && !["person", "preference", "boundary", "relationship", "fact"].includes(memory.category)) return false;
      return !q || `${memory.content} ${memory.category} ${memory.why_remembered || ""} ${memory.source_excerpt || ""}`.toLowerCase().includes(q);
    });
  }, [memories, search, filter]);

  const grouped = useMemo(() => ({
    canon: filtered.filter((memory) => memory.is_canon),
    pinned: filtered.filter((memory) => !memory.is_canon && memory.is_pinned),
    automatic: filtered.filter((memory) => !memory.is_canon && !memory.is_pinned && memory.source === "automatic"),
    manual: filtered.filter((memory) => !memory.is_canon && !memory.is_pinned && memory.source !== "automatic"),
  }), [filtered]);

  function openCreate() {
    setEditingMemory(null);
    setDraft(EMPTY_DRAFT);
    setError("");
    setEditorOpen(true);
  }

  function openEdit(memory) {
    setEditingMemory(memory);
    setDraft({
      content: memory.content || "",
      category: memory.category || "fact",
      importance: Number(memory.importance || 4),
      scope: memory.scope || "conversation",
      isPinned: Boolean(memory.is_pinned),
      isCanon: Boolean(memory.is_canon),
    });
    setError("");
    setEditorOpen(true);
  }

  async function saveMemory(event) {
    event.preventDefault();
    const content = draft.content.trim();
    if (!content || !character?.id || !conversationId) return;
    setSaving(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw authError || new Error("No active session");

      const payload = {
        content,
        category: draft.category,
        importance: Number(draft.importance),
        scope: draft.scope,
        is_pinned: Boolean(draft.isPinned || draft.isCanon),
        is_canon: Boolean(draft.isCanon),
        why_remembered: draft.isCanon
          ? "Marked as canon by you. Velvet should treat this as authoritative continuity."
          : (editingMemory?.why_remembered || "Added manually so Velvet can preserve this detail."),
        updated_at: new Date().toISOString(),
      };

      let saved;
      if (editingMemory) {
        const { data, error: requestError } = await supabase
          .from("memories")
          .update(payload)
          .eq("id", editingMemory.id)
          .select()
          .single();
        if (requestError) throw requestError;
        saved = data;
        setMemories((current) => sortMemories(current.map((item) => item.id === saved.id ? saved : item)));
      } else {
        const { data, error: requestError } = await supabase
          .from("memories")
          .insert({
            ...payload,
            conversation_id: conversationId,
            character_id: character.id,
            user_id: authData.user.id,
            source: "manual",
          })
          .select()
          .single();
        if (requestError) throw requestError;
        saved = data;
        setMemories((current) => sortMemories([saved, ...current]));
        onCountChange?.(memories.length + 1);
      }

      setEditorOpen(false);
      setEditingMemory(null);
      setDraft(EMPTY_DRAFT);
    } catch (requestError) {
      console.error("Memory book save failed:", requestError);
      setError(requestError?.message || "Velvet couldn't save that memory.");
    } finally {
      setSaving(false);
    }
  }

  async function patchMemory(memory, patch) {
    setWorkingId(memory.id);
    try {
      const { data, error: requestError } = await supabase
        .from("memories")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", memory.id)
        .select()
        .single();
      if (requestError) throw requestError;
      setMemories((current) => sortMemories(current.map((item) => item.id === data.id ? data : item)));
    } catch (requestError) {
      setError(requestError.message || "Velvet couldn't update that memory.");
    } finally {
      setWorkingId("");
    }
  }

  function togglePin(memory) {
    patchMemory(memory, { is_pinned: !memory.is_pinned });
  }

  function toggleCanon(memory) {
    patchMemory(memory, {
      is_canon: !memory.is_canon,
      is_pinned: !memory.is_canon ? true : memory.is_pinned,
      why_remembered: !memory.is_canon
        ? "Marked as canon by you. Velvet should treat this as authoritative continuity."
        : (memory.why_remembered || "Saved memory."),
    });
  }

  async function removeMemory(memory) {
    setWorkingId(memory.id);
    try {
      const { error: requestError } = await supabase.from("memories").delete().eq("id", memory.id);
      if (requestError) throw requestError;
      const next = memories.filter((item) => item.id !== memory.id);
      setMemories(next);
      onCountChange?.(next.length);
    } catch (requestError) {
      setError(requestError.message || "Velvet couldn't forget that memory.");
    } finally {
      setWorkingId("");
    }
  }

  if (!open) return null;

  return createPortal((
    <div className="memory-book-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <aside className="memory-book" role="dialog" aria-modal="true">
        <div className="memory-book__grab" />
        <header className="memory-book__header">
          <div>
            <span><BookOpen size={16} />MEMORY BOOK</span>
            <h2>What {character?.name} remembers</h2>
            <p>Velvet learns automatically. Mark a memory as canon when it must never be contradicted.</p>
          </div>
          <button className="memory-book__close" onClick={onClose}><X size={19} /></button>
        </header>

        <div className="memory-book__scroll">
        <div className="memory-book__tools">
          <label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search memories..." /></label>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="canon">Canon</option>
            <option value="automatic">Learned automatically</option>
            <option value="manual">Added by you</option>
            <option value="pinned">Never forget</option>
            <option value="about-you">About you</option>
          </select>
        </div>

        <button className="memory-book__add" onClick={openCreate}><Plus size={17} />Add memory</button>
        {error && <p className="memory-book__error">{error}</p>}

        {editorOpen ? (
          <form className="memory-book__editor" onSubmit={saveMemory}>
            <label>
              Memory
              <textarea autoFocus value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder={`What should ${character?.name} remember?`} />
            </label>
            <div className="memory-book__editor-grid">
              <label>
                Category
                <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
                  {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label>
                Scope
                <select value={draft.scope} onChange={(event) => setDraft((current) => ({ ...current, scope: event.target.value }))}>
                  <option value="conversation">This story only</option>
                  <option value="character">All stories with {character?.name}</option>
                </select>
              </label>
            </div>
            <label className="memory-book__pin-toggle">
              <input type="checkbox" checked={draft.isPinned} onChange={(event) => setDraft((current) => ({ ...current, isPinned: event.target.checked }))} />
              <span><Pin size={16} /><strong>Never forget this</strong><small>Pinned memories receive priority.</small></span>
            </label>
            <label className="memory-book__pin-toggle memory-book__canon-toggle">
              <input type="checkbox" checked={draft.isCanon} onChange={(event) => setDraft((current) => ({ ...current, isCanon: event.target.checked, isPinned: event.target.checked ? true : current.isPinned }))} />
              <span><ShieldCheck size={16} /><strong>Canon</strong><small>Authoritative continuity. Automatic learning cannot rewrite its wording.</small></span>
            </label>
            <footer>
              <button type="button" onClick={() => setEditorOpen(false)}>Cancel</button>
              <button type="submit" disabled={saving || !draft.content.trim()}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{editingMemory ? "Save memory" : "Add memory"}</button>
            </footer>
          </form>
        ) : loading ? (
          <div className="memory-book__loading"><LoaderCircle className="spin" size={24} /><p>Opening memory book…</p></div>
        ) : filtered.length ? (
          <div className="memory-book__list">
            {grouped.canon.length > 0 && <MemoryGroup title="Canon" memories={grouped.canon} />}
            {grouped.pinned.length > 0 && <MemoryGroup title="Never forget" memories={grouped.pinned} />}
            {grouped.automatic.length > 0 && <MemoryGroup title="Learned automatically" memories={grouped.automatic} />}
            {grouped.manual.length > 0 && <MemoryGroup title="Added by you" memories={grouped.manual} />}
          </div>
        ) : (
          <div className="memory-book__empty"><BookOpen size={25} /><strong>No memories here yet</strong><p>{search || filter !== "all" ? "Try a different search or filter." : "Velvet will add meaningful memories as the story grows."}</p></div>
        )}
        </div>
      </aside>
    </div>
  ), document.body);

  function MemoryGroup({ title, memories: groupMemories }) {
    return (
      <section className="memory-book__group">
        <h3>{title}</h3>
        {groupMemories.map((memory) => (
          <article key={memory.id} className={`memory-book__item${memory.is_pinned ? " is-pinned" : ""}${memory.is_canon ? " is-canon" : ""}`}>
            <div className="memory-book__item-top">
              <span className="memory-book__source">{memory.is_canon ? "Canon" : memory.source === "automatic" ? "Learned automatically" : "Added by you"}</span>
              <span className="memory-book__scope">{memory.scope === "character" ? `All ${character?.name} stories` : "This story"}</span>
            </div>
            <p>{memory.content}</p>
            {memory.why_remembered && <small className="memory-book__why"><SparkleDot />Why Velvet remembers this: {memory.why_remembered}</small>}
            {memory.source_excerpt && <small className="memory-card__source-excerpt">Learned from your message: “{memory.source_excerpt}”</small>}
            <footer>
              <span>{memory.category || "fact"} · {formatAge(memory.updated_at || memory.created_at)}</span>
              <div>
                <button className={memory.is_canon ? "is-canon" : ""} onClick={() => toggleCanon(memory)} disabled={workingId === memory.id} title={memory.is_canon ? "Remove canon status" : "Mark as canon"}><ShieldCheck size={15} /></button>
                <button onClick={() => togglePin(memory)} disabled={workingId === memory.id} title={memory.is_pinned ? "Unpin" : "Never forget"}>{memory.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>
                <button onClick={() => openEdit(memory)}><Pencil size={15} /></button>
                <button className="danger" onClick={() => removeMemory(memory)} disabled={workingId === memory.id}><Trash2 size={15} /></button>
              </div>
            </footer>
          </article>
        ))}
      </section>
    );
  }
}

function SparkleDot() {
  return <span aria-hidden="true">✦ </span>;
}

function sortMemories(items) {
  return [...items].sort((a, b) =>
    Number(b.is_canon) - Number(a.is_canon) ||
    Number(b.is_pinned) - Number(a.is_pinned) ||
    Number(b.importance || 0) - Number(a.importance || 0) ||
    new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at),
  );
}

function formatAge(value) {
  if (!value) return "Saved";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short" });
}
