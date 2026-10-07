import {
  Heart,
  PenLine,
  Search,
  Sparkles,
  Tag,
  Trash2,
  RotateCcw,
  X,
  MoreHorizontal,
  Pencil,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCharacters } from "../context/CharactersContext";
import { useSettings } from "../context/SettingsContext";
import { useFeedback } from "../context/FeedbackContext";
import { supabase } from "../services/supabase";
import "../styles/my-characters.css";

const MAIN_FILTERS = ["All", "Favorites"];

function MyCharacters({ onCreateCharacter, onOpenCharacter, onOpenStory, onEditCharacter, onRemixCharacter }) {
  const {
    characters,
    deleteCharacter,
    toggleFavorite,
    updateTags,
    listTrashedCharacters,
    restoreCharacter,
    permanentlyDeleteCharacter,
  } = useCharacters();

  const { settings } = useSettings();
  const { confirmAction, scheduleDeletion } = useFeedback();

  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState("All");
  const [tagEditor, setTagEditor] = useState(null);
  const [tagValue, setTagValue] = useState("");
  const [view, setView] = useState("active");
  const [trashed, setTrashed] = useState([]);
  const [menuId, setMenuId] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [storyHighlights, setStoryHighlights] = useState([]);

  useEffect(() => {
    document.documentElement.classList.add("velvet-burgundy-route", "velvet-discover-route");
    document.body.classList.add("velvet-burgundy-route", "velvet-discover-route");
    return () => {
      document.documentElement.classList.remove("velvet-burgundy-route", "velvet-discover-route");
      document.body.classList.remove("velvet-burgundy-route", "velvet-discover-route");
    };
  }, []);

  useEffect(() => {
    if (view === "trash") listTrashedCharacters().then(setTrashed).catch(console.error);
  }, [view, listTrashedCharacters]);

  useEffect(() => {
    if (view !== "active" || !characters.length) return;
    let active = true;
    supabase.from("conversations").select("id, character_id, title, updated_at, story_recap, unresolved_threads").eq("group_mode", false).is("trashed_at", null).is("archived_at", null).order("updated_at", { ascending: false }).limit(40)
      .then(({ data, error }) => {
        if (!active || error) return;
        const latestByCharacter = new Map();
        for (const row of data || []) if (!latestByCharacter.has(row.character_id)) latestByCharacter.set(row.character_id, row);
        const rows = [...latestByCharacter.values()].map((row)=>({ ...row, character: characters.find((item)=>item.id===row.character_id) })).filter((row)=>row.character);
        const now=Date.now();
        const picks=[];
        if(rows[0]) picks.push({ ...rows[0], reason:`${rows[0].character.name} is still where you left them`, kind:"recent" });
        const unresolved=rows.find((row)=>Array.isArray(row.unresolved_threads)&&row.unresolved_threads.length>0&&row.id!==rows[0]?.id);
        if(unresolved) picks.push({ ...unresolved, reason:`Something is still unresolved with ${unresolved.character.name}`, kind:"thread" });
        const stale=rows.find((row)=>now-new Date(row.updated_at).getTime()>3*24*60*60*1000&&!picks.some((pick)=>pick.id===row.id));
        if(stale) picks.push({ ...stale, reason:`${stale.character.name} might have something to say after some time apart`, kind:"return" });
        const favorite=rows.find((row)=>row.character.isFavorite&&!picks.some((pick)=>pick.id===row.id));
        if(favorite&&picks.length<3) picks.push({ ...favorite, reason:"One of your favorites", kind:"favorite" });
        setStoryHighlights(picks.slice(0,3));
      });
    return ()=>{ active=false; };
  }, [view, characters]);

  const sourceCharacters = view === "trash" ? trashed : characters;
  const dynamicTags = useMemo(
    () => [...new Set(characters.flatMap((character) => character.tags || []))].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [characters]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const chip = activeChip.toLowerCase();
    return sourceCharacters
      .filter((character) => {
        const haystack = `${character.name || ""} ${character.role || ""} ${character.description || ""} ${character.world || ""} ${(character.tags || []).join(" ")}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesChip =
          chip === "all" ||
          (chip === "favorites" && character.isFavorite) ||
          (character.tags || []).some((tag) => normalizeLabel(tag).toLowerCase() === chip);
        return matchesQuery && matchesChip;
      })
      .sort((a, b) => {
        if (Number(b.isFavorite) !== Number(a.isFavorite)) return Number(b.isFavorite) - Number(a.isFavorite);
        return new Date(b.updated_at || b.updatedAt || b.created_at || 0) - new Date(a.updated_at || a.updatedAt || a.created_at || 0);
      });
  }, [sourceCharacters, search, activeChip]);

  async function handleDelete(character) {
    const approved = !settings.confirmBeforeDelete || (await confirmAction({
      title: `Delete ${character.name}?`,
      message: "Every conversation and memory connected to this character will also be deleted.",
      confirmLabel: "Delete character",
    }));
    if (!approved) return;
    scheduleDeletion({
      message: `Deleting ${character.name}`,
      onCommit: () => deleteCharacter(character.id),
      onError: (error) => { console.error(error); window.alert("We couldn't delete this character."); },
    });
  }

  async function handleRestore(character) {
    await restoreCharacter(character.id);
    setTrashed((current) => current.filter((item) => item.id !== character.id));
  }

  async function handleDeleteForever(character) {
    const approved = await confirmAction({ title: `Delete ${character.name} forever?`, message: "This cannot be undone.", confirmLabel: "Delete forever" });
    if (!approved) return;
    await permanentlyDeleteCharacter(character.id);
    setTrashed((current) => current.filter((item) => item.id !== character.id));
  }

  function openTags(character) {
    setMenuId(null);
    setTagEditor(character);
    setTagValue((character.tags || []).join(", "));
  }

  async function saveTags(event) {
    event.preventDefault();
    await updateTags(tagEditor.id, tagValue.split(","));
    setTagEditor(null);
  }

  function openTrash() {
    setView("trash");
    setSearch("");
    setActiveChip("All");
    setShowMore(false);
    setMenuId(null);
  }

  function openCharacters() {
    setView("active");
    setSearch("");
    setActiveChip("All");
    setShowMore(false);
    setMenuId(null);
  }

  if (view === "active" && characters.length === 0) {
    return (
      <section className="chats-page chats-page--reference discover-burgundy discover-burgundy--empty-page">
        <CharacterLibraryHero count={0} onCreateCharacter={onCreateCharacter} />
        <div className="discover-burgundy__empty-hero">
          <small>YOUR PRIVATE CAST</small>
          <h2>No characters yet</h2>
          <p>Create anyone you want. This is your private character library, not a public feed.</p>
          <button className="discover-burgundy__primary" onClick={onCreateCharacter}><PenLine size={18} /> Create a character</button>
        </div>
      </section>
    );
  }

  return (
    <section className={`chats-page chats-page--reference discover-burgundy characters-library ${view === "trash" ? "discover-burgundy--trash" : ""}`}>
      <CharacterLibraryHero view={view} count={sourceCharacters.length} onCreateCharacter={onCreateCharacter} onBack={openCharacters} />

      {view === "active" && storyHighlights.length > 0 && !search && activeChip === "All" && <section className="v311-discover-now">
        <header><div><small>FOR YOU</small><h2>Pick the story back up</h2></div><Sparkles size={18}/></header>
        <div className="v311-discover-now__rail">{storyHighlights.map((item)=><button type="button" key={item.id} onClick={()=>onOpenStory ? onOpenStory(item.character,item.id) : onOpenCharacter(item.character)}>
          <span className="v311-discover-now__art">{item.character.imageUrl||item.character.coverUrl?<img src={item.character.imageUrl||item.character.coverUrl} alt=""/>:<i style={{"--character-color":item.character.color}}>{item.character.initials||item.character.name?.slice(0,2)}</i>}</span>
          <span><small>{item.reason}</small><strong>{item.character.name}</strong><p>{item.story_recap || item.title || "Your story is still here."}</p><em>{relativeStoryTime(item.updated_at)}</em></span><ArrowRight size={16}/>
        </button>)}</div>
      </section>}

      <div className="discover-burgundy__controls characters-library__controls">
        <label className="discover-burgundy__search">
          <Search size={20} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={view === "trash" ? "Search trash" : "Search characters or tags..."} />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={17} /></button>}
        </label>

        {view === "active" && (
          <>
            <div className="discover-burgundy__chips" role="tablist" aria-label="Character filters">
              {MAIN_FILTERS.map((chip) => (
                <button key={chip} className={activeChip === chip ? "active" : ""} onClick={() => { setActiveChip(chip); setSearch(""); }}>{chip}</button>
              ))}
              <button className={showMore ? "active" : ""} onClick={() => setShowMore((current) => !current)} aria-expanded={showMore}>Tags <ChevronDown size={14} /></button>
            </div>
            {showMore && (
              <div className="discover-burgundy__more-filters characters-library__more-filters">
                {dynamicTags.length ? dynamicTags.slice(0, 10).map((tag) => <button key={tag} className={activeChip === normalizeLabel(tag) ? "active" : ""} onClick={() => { setActiveChip(normalizeLabel(tag)); setSearch(""); }}>{normalizeLabel(tag)}</button>) : <span>No tags yet.</span>}
                <button className="danger" onClick={openTrash}><Trash2 size={14} /> Trash</button>
              </div>
            )}
          </>
        )}
      </div>

      {view === "trash" ? (
        filtered.length > 0 ? (
          <div className="discover-burgundy__trash-list">
            {filtered.map((character) => (
              <article key={character.id} className="discover-burgundy__trash-row">
                <div className="discover-burgundy__trash-media"><CharacterImage character={character} /></div>
                <div className="discover-burgundy__trash-copy"><small>{character.role || "Character"}</small><h2>{character.name}</h2><p>{character.description || "This character can still be restored."}</p></div>
                <div className="discover-burgundy__trash-actions"><button onClick={() => handleRestore(character)}><RotateCcw size={15} /> Restore</button><button className="danger" onClick={() => handleDeleteForever(character)}><Trash2 size={15} /> Forever</button></div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Trash is empty" text="Deleted characters will wait here until you restore them or remove them forever." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No characters found" text="Try another name, role or tag." />
      ) : (
        <section className="discover-burgundy__section discover-burgundy__section--featured characters-library__section">
          {(search.trim() || activeChip !== "All") && (
            <div className="characters-library__result-meta">{filtered.length} of {sourceCharacters.length} characters</div>
          )}
          <div className="discover-burgundy__featured-rail characters-library__grid">
            {filtered.map((character) => (
              <FeatureCard
                key={character.id}
                character={character}
                menuId={menuId}
                setMenuId={setMenuId}
                onOpenCharacter={onOpenCharacter}
                onToggleFavorite={toggleFavorite}
                onEditCharacter={onEditCharacter}
                onRemixCharacter={onRemixCharacter}
                onOpenTags={openTags}
                onDeleteCharacter={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {tagEditor && (
        <div className="tag-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setTagEditor(null)}>
          <form className="tag-modal" onSubmit={saveTags}>
            <header><span><Tag size={18} /></span><div><small>ORGANIZE CHARACTER</small><h2>{tagEditor.name}'s tags</h2></div><button type="button" onClick={() => setTagEditor(null)}><X size={19} /></button></header>
            <label>Tags separated by commas<input autoFocus value={tagValue} onChange={(event) => setTagValue(event.target.value)} placeholder="university, romance, favorite" /><small>Use up to 12 short tags.</small></label>
            <footer><button type="button" onClick={() => setTagEditor(null)}>Cancel</button><button type="submit">Save tags</button></footer>
          </form>
        </div>
      )}
    </section>
  );
}

function CharacterLibraryHero({ view = "active", count = 0, onCreateCharacter, onBack }) {
  const inTrash = view === "trash";
  return (
    <header className="characters-library__compact-hero">
      <div className="characters-library__compact-copy">
        {inTrash ? (
          <h1>Trash</h1>
        ) : (
          <div className="characters-library__wordmark" aria-label="Your characters">
            <span>your</span>
            <strong>CHARACTERS</strong>
          </div>
        )}
        <p>{inTrash ? `${count} deleted ${count === 1 ? "character" : "characters"}` : `Your private cast · ${count} saved`}</p>
      </div>

      {inTrash ? (
        <button className="characters-library__hero-back" type="button" onClick={onBack}>Back</button>
      ) : (
        <button className="characters-library__hero-create reference-stories-new" type="button" onClick={onCreateCharacter} aria-label="Create character"><Sparkles size={26}/></button>
      )}
    </header>
  );
}

function FeatureCard({ character, menuId, setMenuId, onOpenCharacter, onToggleFavorite, onEditCharacter, onRemixCharacter, onOpenTags, onDeleteCharacter }) {
  const tags = (character.tags || []).filter(Boolean).slice(0, 2);
  return (
    <article className="discover-burgundy__feature-card characters-library__card">
      <button className="discover-burgundy__feature-card-main" onClick={() => onOpenCharacter(character)}>
        <CharacterImage character={character} />
        <span className="discover-burgundy__feature-card-shade" />
        {character.isFavorite && (
          <span className="characters-library__favorite-mark" aria-label="Favorite">
            <Heart size={13} fill="currentColor" />
          </span>
        )}
        <span className="discover-burgundy__feature-card-copy">
          <strong>{character.name}</strong>
          <small>{character.role || character.world || "Character"}</small>
          {tags.length > 0 && (
            <span className="characters-library__card-tags">
              {tags.map((tag) => <i key={tag}>{normalizeLabel(tag)}</i>)}
            </span>
          )}
        </span>
      </button>
      <CharacterMenu character={character} menuId={menuId} setMenuId={setMenuId} onOpenCharacter={onOpenCharacter} onToggleFavorite={onToggleFavorite} onEditCharacter={onEditCharacter} onRemixCharacter={onRemixCharacter} onOpenTags={onOpenTags} onDeleteCharacter={onDeleteCharacter} />
    </article>
  );
}

function CharacterMenu({ character, menuId, setMenuId, onOpenCharacter, onToggleFavorite, onEditCharacter, onRemixCharacter, onOpenTags, onDeleteCharacter }) {
  return (
    <div className="discover-burgundy__menu-wrap">
      <button className="discover-burgundy__more" onClick={() => setMenuId(menuId === character.id ? null : character.id)} aria-label={`${character.name} actions`}><MoreHorizontal size={17} /></button>
      {menuId === character.id && (
        <div className="discover-burgundy__menu">
          <button onClick={() => { setMenuId(null); onOpenCharacter(character); }}><ArrowRight size={14} /> Open</button>
          <button onClick={() => { setMenuId(null); onToggleFavorite(character.id); }}><Heart size={14} /> {character.isFavorite ? "Unfavorite" : "Favorite"}</button>
          <button onClick={() => { setMenuId(null); onEditCharacter(character); }}><Pencil size={14} /> Edit</button>
          {onRemixCharacter && <button onClick={() => { setMenuId(null); onRemixCharacter(character); }}><Sparkles size={14} /> Duplicate & remix</button>}
          <button onClick={() => onOpenTags(character)}><Tag size={14} /> Tags</button>
          <button className="danger" onClick={() => { setMenuId(null); onDeleteCharacter(character); }}><Trash2 size={14} /> Delete</button>
        </div>
      )}
    </div>
  );
}

function CharacterImage({ character }) {
  const source = character.coverUrl || character.imageUrl;
  if (source) return <img src={source} alt="" loading="lazy" decoding="async" />;
  return <span className="discover-burgundy__image-fallback" style={{ "--character-color": character.color || "var(--accent)" }}>{character.initials || character.name?.slice(0, 2) || "VS"}</span>;
}

function EmptyState({ title, text }) {
  return <div className="discover-burgundy__empty"><Sparkles size={24} /><h2>{title}</h2><p>{text}</p></div>;
}

function relativeStoryTime(value){
  const diff=Math.max(0,Date.now()-new Date(value||0).getTime());
  if(diff<60*60*1000) return `${Math.max(1,Math.round(diff/60000))} min ago`;
  if(diff<24*60*60*1000) return `${Math.round(diff/3600000)} h ago`;
  const days=Math.round(diff/86400000); return days===1?"Yesterday":`${days} days ago`;
}

function normalizeLabel(value) {
  return String(value || "").trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default MyCharacters;
