import { Heart, PenLine, Search, Sparkles, Tag, X, Trash2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CharacterCard from "../components/CharacterCard";
import { useCharacters } from "../context/CharactersContext";
import { useSettings } from "../context/SettingsContext";
import { useFeedback } from "../context/FeedbackContext";
import "../styles/my-characters.css";

function MyCharacters({ onCreateCharacter, onOpenCharacter, onEditCharacter }) {
  const { characters, deleteCharacter, toggleFavorite, updateTags, listTrashedCharacters, restoreCharacter, permanentlyDeleteCharacter } = useCharacters();
  const { settings } = useSettings();
  const { confirmAction, scheduleDeletion } = useFeedback();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [tagEditor, setTagEditor] = useState(null);
  const [tagValue, setTagValue] = useState("");
  const [view, setView] = useState("active");
  const [trashed, setTrashed] = useState([]);

  useEffect(() => { if (view === "trash") listTrashedCharacters().then(setTrashed).catch(console.error); }, [view]);

  const sourceCharacters = view === "trash" ? trashed : characters;
  const tags = useMemo(() => [...new Set(sourceCharacters.flatMap((character) => character.tags || []))].sort(), [characters]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sourceCharacters.filter((character) => {
      const matchesQuery = !query || `${character.name} ${character.role} ${character.description} ${character.world} ${(character.tags || []).join(" ")}`.toLowerCase().includes(query);
      const matchesFavorite = filter !== "favorites" || character.isFavorite;
      const matchesTag = !tagFilter || character.tags?.includes(tagFilter);
      return matchesQuery && matchesFavorite && matchesTag;
    }).sort((a,b) => Number(b.isFavorite) - Number(a.isFavorite));
  }, [sourceCharacters, search, filter, tagFilter]);

  async function handleDelete(character) {
    const approved = !settings.confirmBeforeDelete || await confirmAction({ title: `Delete ${character.name}?`, message: "Every conversation and memory connected to this character will also be deleted.", confirmLabel: "Delete character" });
    if (!approved) return;
    scheduleDeletion({ message: `Deleting ${character.name}`, onCommit: () => deleteCharacter(character.id), onError: (error) => { console.error(error); window.alert("We couldn't delete this character."); } });
  }

  async function handleRestore(character) { await restoreCharacter(character.id); setTrashed((current)=>current.filter((item)=>item.id!==character.id)); }
  async function handleDeleteForever(character) { const approved = await confirmAction({ title: `Delete ${character.name} forever?`, message: "This cannot be undone.", confirmLabel: "Delete forever" }); if (!approved) return; await permanentlyDeleteCharacter(character.id); setTrashed((current)=>current.filter((item)=>item.id!==character.id)); }

  function openTags(character) { setTagEditor(character); setTagValue((character.tags || []).join(", ")); }
  async function saveTags(event) {
    event.preventDefault();
    await updateTags(tagEditor.id, tagValue.split(","));
    setTagEditor(null);
  }

  if (view === "active" && characters.length === 0) return <section className="my-characters-empty"><span className="my-characters-empty__symbol"><Sparkles size={30}/></span><p>YOUR PRIVATE COLLECTION</p><h1>My characters</h1><span className="my-characters-empty__line"/><p>The personalities and worlds you create will live here.</p><button className="primary-button" onClick={onCreateCharacter}><PenLine size={18}/><span>Create your first character</span></button></section>;

  return <section className="my-characters">
    <header className="my-characters__header">
      <div className="my-characters__heading">
        <p>YOUR PRIVATE COLLECTION</p>
        <h1>My Characters</h1>
        <span className="my-characters__subtitle">Create and shape your cast</span>
        <span className="my-characters__count">{characters.length} {characters.length===1?"character":"characters"}</span>
      </div>

      <button className="my-characters__create" onClick={onCreateCharacter}>
        <span className="my-characters__create-icon"><PenLine size={20}/></span>
        <span>Create a character</span>
      </button>

      <div className="my-characters__ornament" aria-hidden="true"><span>✦</span></div>
    </header>
    <div className="collection-tools"><label><Search size={18}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search characters, worlds or tags..."/>{search&&<button onClick={()=>setSearch("")}><X size={15}/></button>}</label><div><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>All</button><button className={filter==="favorites"?"active":""} onClick={()=>{setFilter("favorites");setView("active")}}><Heart size={14}/>Favorites</button><button className={view==="trash"?"active":""} onClick={()=>{setView(view==="trash"?"active":"trash");setFilter("all")}}><Trash2 size={14}/>Trash</button><select value={tagFilter} onChange={(event)=>setTagFilter(event.target.value)}><option value="">Every tag</option>{tags.map((tag)=><option key={tag}>{tag}</option>)}</select></div></div>
    {filtered.length ? <div className="character-grid">{filtered.map((character)=> view === "trash" ? <article key={character.id} className="trash-character-card"><div><strong>{character.name}</strong><small>{character.role}</small></div><div><button onClick={()=>handleRestore(character)}><RotateCcw size={15}/>Restore</button><button className="danger" onClick={()=>handleDeleteForever(character)}><Trash2 size={15}/>Delete forever</button></div></article> : <CharacterCard key={character.id} character={character} onOpen={onOpenCharacter} onEdit={onEditCharacter} onDelete={handleDelete} onFavorite={toggleFavorite} onTags={openTags}/>)}</div> : <div className="collection-empty"><Trash2 size={26}/><h2>{view === "trash" ? "Trash is empty" : "No characters found"}</h2><p>{view === "trash" ? "Deleted characters will wait here until you restore or remove them forever." : "Try another search or remove a filter."}</p></div>}
    {tagEditor&&<div className="tag-modal-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&setTagEditor(null)}><form className="tag-modal" onSubmit={saveTags}><header><span><Tag size={18}/></span><div><small>ORGANIZE CHARACTER</small><h2>{tagEditor.name}'s tags</h2></div><button type="button" onClick={()=>setTagEditor(null)}><X size={19}/></button></header><label>Tags separated by commas<input autoFocus value={tagValue} onChange={(event)=>setTagValue(event.target.value)} placeholder="university, romance, favorite"/><small>Use up to 12 short tags.</small></label><footer><button type="button" onClick={()=>setTagEditor(null)}>Cancel</button><button type="submit">Save tags</button></footer></form></div>}
  </section>;
}
export default MyCharacters;
