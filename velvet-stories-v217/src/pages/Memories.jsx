import { Archive, ArrowLeft, Brain, Check, ChevronDown, History, LoaderCircle, Pencil, Pin, PinOff, Plus, Search, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
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

const emptyDraft = { content: "", category: "fact", importance: 3, isPinned: true, isCanon: false, scope: "character", replaceMemoryId: "" };

function Memories({ onBack, onBrowseCharacters, onOpenCharacter }) {
  const { confirmAction, scheduleDeletion } = useFeedback();
  const { user } = useAuth();
  const { characters } = useCharacters();
  const [memories, setMemories] = useState([]);
  const [conversationByCharacter, setConversationByCharacter] = useState(new Map());
  const [selectedCharacterId, setSelectedCharacterId] = useState("all");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftCharacterId, setDraftCharacterId] = useState("");
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState(null);

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
    setEditingMemory(null); setDraft(emptyDraft); setDraftCharacterId(characterId); setError(""); setEditorOpen(true);
  }

  function openEdit(memory) {
    setEditingMemory(memory);
    setDraft({ content: memory.content, category: memory.category || "fact", importance: memory.importance || 3, isPinned: Boolean(memory.is_pinned), isCanon: Boolean(memory.is_canon), scope: memory.scope || "conversation", replaceMemoryId: "" });
    setDraftCharacterId(memory.character_id); setError(""); setEditorOpen(true);
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
        content, category: draft.category, importance: Number(draft.importance), is_pinned: Boolean(draft.isPinned || draft.isCanon), is_canon: Boolean(draft.isCanon), scope: draft.scope,
        why_remembered: draft.isCanon ? "Marked as canon by you. Velvet should treat this as authoritative continuity." : "Added manually so Velvet can preserve this detail.",
        updated_at: new Date().toISOString(), source: "manual",
      };
      let saved;
      if (editingMemory) {
        const { data, error: requestError } = await supabase.from("memories").update(payload).eq("id", editingMemory.id).select().single();
        if (requestError) throw requestError;
        saved = data;
        setMemories((current) => current.map((item) => item.id === saved.id ? { ...saved, character: item.character } : item).sort(sortMemoryRows));
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
    try { setWorkingId(memory.id); const isPinned = !memory.is_pinned; const { error: requestError } = await supabase.from("memories").update({ is_pinned: isPinned, updated_at: new Date().toISOString() }).eq("id", memory.id); if (requestError) throw requestError; setMemories((current) => current.map((item) => item.id === memory.id ? { ...item, is_pinned: isPinned } : item).sort(sortMemoryRows)); }
    catch (requestError) { setError(requestError.message); } finally { setWorkingId(null); }
  }

  async function toggleCanon(memory) {
    if (memory.superseded_at) return;
    try { setWorkingId(memory.id); const isCanon = !memory.is_canon; const { error: requestError } = await supabase.from("memories").update({ is_canon: isCanon, is_pinned: isCanon ? true : memory.is_pinned, why_remembered: isCanon ? "Marked as canon by you. Velvet should treat this as authoritative continuity." : (memory.why_remembered || "Saved memory."), updated_at: new Date().toISOString() }).eq("id", memory.id); if (requestError) throw requestError; setMemories((current) => current.map((item) => item.id === memory.id ? { ...item, is_canon: isCanon, is_pinned: isCanon ? true : item.is_pinned } : item).sort(sortMemoryRows)); }
    catch (requestError) { setError(requestError.message); } finally { setWorkingId(null); }
  }

  async function deleteMemory(memory) {
    if (!await confirmAction({ title: "Delete this memory?", message: "The character will no longer receive this fact as long-term context.", confirmLabel: "Delete memory" })) return;
    scheduleDeletion({ message: "Deleting memory", onCommit: async () => { setWorkingId(memory.id); const { error: requestError } = await supabase.from("memories").delete().eq("id", memory.id); if (requestError) throw requestError; setMemories((current) => current.filter((item) => item.id !== memory.id)); setWorkingId(null); }, onError: (requestError) => { setWorkingId(null); setError(requestError.message); } });
  }

  const activeMemories = useMemo(() => memories.filter((memory) => !memory.superseded_at), [memories]);
  const replacementCandidates = useMemo(() => activeMemories.filter((memory) => memory.character_id === draftCharacterId && !memory.is_canon && memory.id !== editingMemory?.id), [activeMemories, draftCharacterId, editingMemory?.id]);
  const filtered = useMemo(() => memories.filter((memory) => {
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

  return <section className="memories-page">
    <header className="page-heading memories-page__heading"><div><button className="memories-page__back" onClick={onBack}><ArrowLeft size={17}/>Back</button><p>LONG-TERM MEMORY</p><h1>Memories 2.5</h1><span>Canon, relationship history, corrections, source context and exactly why Velvet kept something.</span></div><button className="memories-page__add" onClick={openCreate} disabled={!characters.length}><Plus size={18}/>Add memory</button></header>
    {error && !editorOpen && <div className="memories-page__notice"><Sparkles size={17}/><span>{error}</span><button onClick={()=>setError("")}><X size={16}/></button></div>}
    {characters.length > 0 && <div className="memory-toolbar"><label className="memory-toolbar__search"><Search size={18}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search memories or their source…"/></label><label className="memory-toolbar__select"><select value={selectedCharacterId} onChange={(event)=>setSelectedCharacterId(event.target.value)}><option value="all">All characters</option>{characters.map((character)=><option key={character.id} value={character.id}>{character.name}</option>)}</select><ChevronDown size={17}/></label></div>}
    {characters.length > 0 && <div className="memory-view-tabs" aria-label="Memory views">{views.map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>{setView(id);setCategory("all")}}>{id==="history"&&<History size={12}/>} {label}</button>)}</div>}
    {characters.length > 0 && <div className="memory-categories">{categories.map((item)=><button key={item.id} className={category===item.id?"active":""} onClick={()=>setCategory(item.id)}>{item.label}</button>)}</div>}

    {loading && <div className="page-state"><LoaderCircle className="spin" size={28}/><p>Opening the memory vault…</p></div>}
    {!loading && characters.length===0 && <div className="page-state page-state--empty"><span><Brain size={28}/></span><h2>No characters yet</h2><p>Create someone before giving them long-term memories.</p><button onClick={onBrowseCharacters}>Create a character</button></div>}
    {!loading && characters.length>0 && activeMemories.length===0 && view!=="history" && <div className="page-state page-state--empty"><span><Brain size={28}/></span><h2>The memory vault is empty</h2><p>Memories will appear automatically as stories develop, or you can add one yourself.</p><button onClick={openCreate}>Add the first memory</button></div>}
    {!loading && memories.length>0 && filtered.length===0 && <div className="page-state"><Search size={27}/><p>No memories match this view.</p></div>}
    {!loading && filtered.length>0 && <div className="memory-grid">{filtered.map((memory)=><MemoryCard key={memory.id} memory={memory} busy={workingId===memory.id} onCanon={()=>toggleCanon(memory)} onPin={()=>togglePinned(memory)} onEdit={()=>openEdit(memory)} onDelete={()=>deleteMemory(memory)} onOpenCharacter={onOpenCharacter}/>)}</div>}

    {editorOpen && <div className="memory-editor-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&!saving&&setEditorOpen(false)}><form className="memory-editor" onSubmit={saveMemory}><header><div><p>MEMORY VAULT</p><h2>{editingMemory?"Refine this memory":"Add something important"}</h2></div><button type="button" onClick={()=>setEditorOpen(false)} disabled={saving}><X size={20}/></button></header>
      {!editingMemory && <label>Character<select value={draftCharacterId} onChange={(event)=>{setDraftCharacterId(event.target.value);setDraft((current)=>({...current,replaceMemoryId:""}))}} disabled={saving}><option value="">Choose a character</option>{characters.map((character)=><option key={character.id} value={character.id}>{character.name}</option>)}</select></label>}
      <label>What should they remember?<textarea value={draft.content} onChange={(event)=>{setDraft((current)=>({...current,content:event.target.value}));setError("")}} maxLength={500} rows="5" placeholder="A specific fact, boundary, promise or relationship shift…" autoFocus disabled={saving}/><small>{draft.content.length}/500</small></label>
      <div className="memory-editor__row"><label>Category<select value={draft.category} onChange={(event)=>setDraft((current)=>({...current,category:event.target.value}))}>{categories.slice(1).map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Importance<select value={draft.importance} onChange={(event)=>setDraft((current)=>({...current,importance:event.target.value}))}>{[1,2,3,4,5].map((value)=><option key={value} value={value}>{value} · {importanceLabel(value)}</option>)}</select></label></div>
      <label>Memory scope<select value={draft.scope} onChange={(event)=>setDraft((current)=>({...current,scope:event.target.value}))}><option value="conversation">This story only</option><option value="character">All stories with this character</option></select><small>Use “all stories” only for facts that belong to the character across different timelines.</small></label>
      {!editingMemory && replacementCandidates.length>0 && <label className="memory-editor__replace"><span><Archive size={15}/>Replace an older memory <em>(optional)</em></span><select value={draft.replaceMemoryId} onChange={(event)=>setDraft((current)=>({...current,replaceMemoryId:event.target.value}))}><option value="">Keep every existing memory</option>{replacementCandidates.map((memory)=><option key={memory.id} value={memory.id}>{memory.content.slice(0,90)}</option>)}</select><small>The old memory moves to Replaced history instead of being silently deleted.</small></label>}
      <label className="memory-editor__pin"><input type="checkbox" checked={draft.isPinned} onChange={(event)=>setDraft((current)=>({...current,isPinned:event.target.checked}))}/><span><Pin size={17}/><strong>Never forget this</strong><small>Pinned memories are always shown to the character first.</small></span></label>
      <label className="memory-editor__pin memory-editor__canon"><input type="checkbox" checked={draft.isCanon} onChange={(event)=>setDraft((current)=>({...current,isCanon:event.target.checked,isPinned:event.target.checked?true:current.isPinned}))}/><span><ShieldCheck size={17}/><strong>Canon</strong><small>Velvet treats this as authoritative continuity and automatic learning cannot rewrite it.</small></span></label>
      {error&&<p className="memory-editor__error">{error}</p>}<footer><button type="button" onClick={()=>setEditorOpen(false)} disabled={saving}>Cancel</button><button type="submit" disabled={saving||!draft.content.trim()||!draftCharacterId}>{saving?<LoaderCircle className="spin" size={17}/>:<Check size={17}/>} {saving?"Saving…":"Save memory"}</button></footer>
    </form></div>}
  </section>;
}

function MemoryCard({ memory, busy, onCanon, onPin, onEdit, onDelete, onOpenCharacter }) {
  const character=memory.character; const replaced=Boolean(memory.superseded_at);
  return <article className={`memory-card${memory.is_pinned?" memory-card--pinned":""}${memory.is_canon?" memory-card--canon":""}${replaced?" memory-card--superseded":""}`}><header><button className="memory-card__character" onClick={()=>character&&onOpenCharacter(character)}><span style={{"--character-color":character?.color}}>{character?.imageUrl?<img src={character.imageUrl} alt=""/>:character?.initials||"?"}</span><span><strong>{character?.name||"Unknown character"}</strong><small>{replaced?"Replaced memory":memory.is_canon?"Canon":memory.source==="manual"?"Saved by you":"Learned automatically"}{memory.scope==="character"?" · all stories":" · this story"}</small></span></button><span className={`memory-card__category memory-card__category--${memory.category}`}>{categoryLabel(memory.category)}</span></header><p>{memory.content}</p>{memory.why_remembered&&<small className="memory-card__why">Why Velvet remembers this: {memory.why_remembered}</small>}{memory.source_excerpt&&<small className="memory-card__source-excerpt">Learned from your message: “{memory.source_excerpt}”</small>}<footer><span>{Array.from({length:5},(_,index)=><i key={index} className={index<memory.importance?"filled":""}/>)}</span><div>{!replaced&&<><button className={memory.is_canon?"is-canon":""} onClick={onCanon} disabled={busy} aria-label={memory.is_canon?"Remove canon status":"Mark as canon"}><ShieldCheck size={16}/></button><button onClick={onPin} disabled={busy} aria-label={memory.is_pinned?"Unpin":"Pin"}>{memory.is_pinned?<PinOff size={16}/>:<Pin size={16}/>}</button><button onClick={onEdit} disabled={busy} aria-label="Edit"><Pencil size={16}/></button></>}<button className="danger" onClick={onDelete} disabled={busy} aria-label="Delete">{busy?<LoaderCircle className="spin" size={16}/>:<Trash2 size={16}/>}</button></div></footer></article>;
}

function sortMemoryRows(a,b){ if(Boolean(a.superseded_at)!==Boolean(b.superseded_at)) return a.superseded_at?1:-1; if(Boolean(a.is_canon)!==Boolean(b.is_canon)) return a.is_canon?-1:1; if(Boolean(a.is_pinned)!==Boolean(b.is_pinned)) return a.is_pinned?-1:1; return (b.importance||0)-(a.importance||0)||new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at); }
function normalize(value){return String(value||"").toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi," ").trim()}
function categoryLabel(value){return categories.find((item)=>item.id===value)?.label||"Event"}
function importanceLabel(value){return({1:"Minor",2:"Useful",3:"Important",4:"Major",5:"Essential"})[value]}
export default Memories;
