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
import "../styles/my-characters.css";

const MAIN_FILTERS = ["All", "Favorites"];

function MyCharacters({ onCreateCharacter, onOpenCharacter, onEditCharacter, onRemixCharacter }) {
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
        <h1>{inTrash ? "Trash" : "Characters"}</h1>
        <p>{inTrash ? `${count} deleted ${count === 1 ? "character" : "characters"}` : `Your private cast · ${count} saved`}</p>
      </div>

      {inTrash ? (
        <button className="characters-library__hero-back" type="button" onClick={onBack}>Back</button>
      ) : (
        <button className="characters-library__hero-create" type="button" onClick={onCreateCharacter} aria-label="Create character"><Sparkles size={20} /></button>
      )}
    </header>
  );
}

function FeatureCard({ character, menuId, setMenuId, onOpenCharacter, onToggleFavorite, onEditCharacter, onRemixCharacter, onOpenTags, onDeleteCharacter }) {
  return (
    <article className="discover-burgundy__feature-card characters-library__card">
      <button className="discover-burgundy__feature-card-main" onClick={() => onOpenCharacter(character)}>
        <CharacterImage character={character} />
        <span className="discover-burgundy__feature-card-shade" />
        <span className="discover-burgundy__feature-card-copy"><strong>{character.name}</strong><small>{character.role || character.world || "Character"}</small><em>{shortQuote(character)}</em></span>
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
  if (source) return <img src={source} alt="" loading="lazy" />;
  return <span className="discover-burgundy__image-fallback" style={{ "--character-color": character.color || "var(--accent)" }}>{character.initials || character.name?.slice(0, 2) || "VS"}</span>;
}

function EmptyState({ title, text }) {
  return <div className="discover-burgundy__empty"><Sparkles size={24} /><h2>{title}</h2><p>{text}</p></div>;
}

function normalizeLabel(value) {
  return String(value || "").trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function shortQuote(character) {
  const source = character.description || character.world || "Open their profile";
  const clean = source.replace(/\s+/g, " ").trim();
  return clean.length > 52 ? `${clean.slice(0, 49).trim()}…` : clean;
}

export default MyCharacters;
