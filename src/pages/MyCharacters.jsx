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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCharacters } from "../context/CharactersContext";
import { useSettings } from "../context/SettingsContext";
import { useFeedback } from "../context/FeedbackContext";
import "../styles/my-characters.css";

function MyCharacters({ onCreateCharacter, onOpenCharacter, onEditCharacter }) {
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
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [tagEditor, setTagEditor] = useState(null);
  const [tagValue, setTagValue] = useState("");
  const [view, setView] = useState("active");
  const [trashed, setTrashed] = useState([]);
  const [menuId, setMenuId] = useState(null);

  useEffect(() => {
    if (view === "trash") {
      listTrashedCharacters().then(setTrashed).catch(console.error);
    }
  }, [view, listTrashedCharacters]);

  const sourceCharacters = view === "trash" ? trashed : characters;

  const tags = useMemo(
    () =>
      [...new Set(sourceCharacters.flatMap((character) => character.tags || []))]
        .filter(Boolean)
        .sort(),
    [sourceCharacters]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sourceCharacters
      .filter((character) => {
        const haystack = `${character.name || ""} ${character.role || ""} ${character.description || ""} ${character.world || ""} ${(character.tags || []).join(" ")}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesFavorite = filter !== "favorites" || character.isFavorite;
        const matchesTag = !tagFilter || character.tags?.includes(tagFilter);
        return matchesQuery && matchesFavorite && matchesTag;
      })
      .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  }, [sourceCharacters, search, filter, tagFilter]);

  const featured = view === "active" ? filtered[0] : null;
  const remaining = view === "active" ? filtered.slice(1) : filtered;

  async function handleDelete(character) {
    const approved =
      !settings.confirmBeforeDelete ||
      (await confirmAction({
        title: `Delete ${character.name}?`,
        message: "Every conversation and memory connected to this character will also be deleted.",
        confirmLabel: "Delete character",
      }));

    if (!approved) return;

    scheduleDeletion({
      message: `Deleting ${character.name}`,
      onCommit: () => deleteCharacter(character.id),
      onError: (error) => {
        console.error(error);
        window.alert("We couldn't delete this character.");
      },
    });
  }

  async function handleRestore(character) {
    await restoreCharacter(character.id);
    setTrashed((current) => current.filter((item) => item.id !== character.id));
  }

  async function handleDeleteForever(character) {
    const approved = await confirmAction({
      title: `Delete ${character.name} forever?`,
      message: "This cannot be undone.",
      confirmLabel: "Delete forever",
    });

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

  if (view === "active" && characters.length === 0) {
    return (
      <section className="discover-index-empty">
        <span><Sparkles size={28} /></span>
        <small>DISCOVER</small>
        <h1>Your cast begins here.</h1>
        <p>Create someone, give them a world, then see where the story takes you.</p>
        <button onClick={onCreateCharacter}><PenLine size={17} /> Create a character</button>
      </section>
    );
  }

  return (
    <section className="discover-index">
      <header className="discover-index__header">
        <div>
          <small>DISCOVER</small>
          <h1>Your cast.</h1>
          <p>Characters worth coming back to.</p>
        </div>

        <div className="discover-index__header-actions">
          <button className="discover-index__create" onClick={onCreateCharacter}>
            <PenLine size={17} />
            <span>Create</span>
          </button>

          <button
            className={view === "trash" ? "discover-index__trash active" : "discover-index__trash"}
            onClick={() => {
              setView(view === "trash" ? "active" : "trash");
              setFilter("all");
              setTagFilter("");
              setMenuId(null);
            }}
          >
            <Trash2 size={16} />
            <span>{view === "trash" ? "Back" : "Trash"}</span>
          </button>
        </div>
      </header>

      <div className="discover-index__controls">
        <label className="discover-index__search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={view === "trash" ? "Search trash" : "Search characters, worlds or tags"}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </label>

        {view === "active" && (
          <div className="discover-index__filters">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
              All
            </button>
            <button className={filter === "favorites" ? "active" : ""} onClick={() => setFilter("favorites")}>
              <Heart size={13} />
              Favorites
            </button>

            {tags.length > 0 && (
              <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                <option value="">Every tag</option>
                {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {view === "trash" ? (
        remaining.length > 0 ? (
          <div className="discover-index__trash-list">
            {remaining.map((character) => (
              <article key={character.id} className="discover-index__trash-row">
                <CharacterImage character={character} />
                <div className="discover-index__trash-copy">
                  <small>{character.role || "Character"}</small>
                  <h2>{character.name}</h2>
                  <p>{character.description || "This character can still be restored."}</p>
                </div>
                <div className="discover-index__trash-actions">
                  <button onClick={() => handleRestore(character)}><RotateCcw size={14} /> Restore</button>
                  <button className="danger" onClick={() => handleDeleteForever(character)}><Trash2 size={14} /> Forever</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Trash is empty" text="Deleted characters will wait here until you restore them or remove them forever." />
        )
      ) : filtered.length === 0 ? (
        <EmptyState title="No characters found" text="Try another search or remove a filter." />
      ) : (
        <>
          {featured && (
            <section className="discover-index__featured">
              <div className="discover-index__featured-media">
                <CharacterImage character={featured} />
              </div>

              <div className="discover-index__featured-copy">
                <div className="discover-index__featured-topline">
                  <span>FEATURED CHARACTER</span>
                  <button
                    className={featured.isFavorite ? "active" : ""}
                    onClick={() => toggleFavorite(featured.id)}
                    aria-label="Toggle favorite"
                  >
                    <Heart size={16} fill={featured.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>

                <small>{featured.role || "Character"}</small>
                <h2>{featured.name}</h2>
                <p>{featured.description || "Open the character to see their story, world and personality."}</p>

                {(featured.tags || []).length > 0 && (
                  <div className="discover-index__featured-tags">
                    {(featured.tags || []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                )}

                <div className="discover-index__featured-actions">
                  <button className="primary" onClick={() => onOpenCharacter(featured)}>
                    Open character <ArrowRight size={15} />
                  </button>
                  <button onClick={() => onEditCharacter(featured)}><Pencil size={14} /> Edit</button>
                  <button onClick={() => openTags(featured)}><Tag size={14} /> Tags</button>
                </div>
              </div>
            </section>
          )}

          {remaining.length > 0 && (
            <section className="discover-index__directory">
              <header>
                <div>
                  <small>CHARACTER INDEX</small>
                  <h2>Everyone else</h2>
                </div>
                <span>{remaining.length}</span>
              </header>

              <div className="discover-index__rows">
                {remaining.map((character, index) => (
                  <article key={character.id} className="discover-index__row">
                    <span className="discover-index__number">{String(index + 2).padStart(2, "0")}</span>

                    <button className="discover-index__row-media" onClick={() => onOpenCharacter(character)}>
                      <CharacterImage character={character} />
                    </button>

                    <button className="discover-index__row-copy" onClick={() => onOpenCharacter(character)}>
                      <small>{character.role || "Character"}</small>
                      <h3>{character.name}</h3>
                      <p>{character.description || "Open this character to continue."}</p>
                    </button>

                    <div className="discover-index__row-tags">
                      {(character.tags || []).slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                    </div>

                    <button
                      className={character.isFavorite ? "discover-index__heart active" : "discover-index__heart"}
                      onClick={() => toggleFavorite(character.id)}
                      aria-label="Toggle favorite"
                    >
                      <Heart size={15} fill={character.isFavorite ? "currentColor" : "none"} />
                    </button>

                    <div className="discover-index__menu-wrap">
                      <button
                        className="discover-index__more"
                        onClick={() => setMenuId(menuId === character.id ? null : character.id)}
                        aria-label="Character actions"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {menuId === character.id && (
                        <div className="discover-index__menu">
                          <button onClick={() => { setMenuId(null); onEditCharacter(character); }}><Pencil size={14} /> Edit</button>
                          <button onClick={() => openTags(character)}><Tag size={14} /> Tags</button>
                          <button className="danger" onClick={() => { setMenuId(null); handleDelete(character); }}><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {tagEditor && (
        <div className="tag-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setTagEditor(null)}>
          <form className="tag-modal" onSubmit={saveTags}>
            <header>
              <span><Tag size={18} /></span>
              <div>
                <small>ORGANIZE CHARACTER</small>
                <h2>{tagEditor.name}'s tags</h2>
              </div>
              <button type="button" onClick={() => setTagEditor(null)}><X size={19} /></button>
            </header>

            <label>
              Tags separated by commas
              <input
                autoFocus
                value={tagValue}
                onChange={(event) => setTagValue(event.target.value)}
                placeholder="university, romance, favorite"
              />
              <small>Use up to 12 short tags.</small>
            </label>

            <footer>
              <button type="button" onClick={() => setTagEditor(null)}>Cancel</button>
              <button type="submit">Save tags</button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

function CharacterImage({ character }) {
  const source = character.coverUrl || character.imageUrl;

  if (source) {
    return <img src={source} alt="" loading="lazy" />;
  }

  return (
    <span className="discover-index__image-fallback" style={{ "--character-color": character.color }}>
      {character.initials || character.name?.slice(0, 2)}
    </span>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="discover-index__empty">
      <Sparkles size={24} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export default MyCharacters;
