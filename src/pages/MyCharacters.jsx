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
  Bookmark,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCharacters } from "../context/CharactersContext";
import { useSettings } from "../context/SettingsContext";
import { useFeedback } from "../context/FeedbackContext";
import "../styles/my-characters.css";

const DEFAULT_CHIPS = ["All", "Trending", "Romance", "Dark", "College", "Fantasy", "Mystery", "Favorites"];
const TROPE_CHIPS = [
  { id: "enemies", label: "Enemies\nto Lovers", mark: "⚔" },
  { id: "forbidden", label: "Forbidden\nLove", mark: "✦" },
  { id: "broken", label: "Broken\nHeroes", mark: "♡" },
  { id: "slow", label: "Slow\nBurn", mark: "⌛" },
  { id: "secret", label: "Secret\nIdentity", mark: "◌" },
  { id: "chaos", label: "Who Did\nThis To You?", mark: "❣" },
];

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
  const [activeChip, setActiveChip] = useState("All");
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

  const dynamicTags = useMemo(
    () =>
      [...new Set(characters.flatMap((character) => character.tags || []))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [characters]
  );

  const filterChips = useMemo(() => {
    const extras = dynamicTags.slice(0, 6).map((tag) => normalizeLabel(tag));
    return Array.from(new Set([...DEFAULT_CHIPS, ...extras]));
  }, [dynamicTags]);

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
          (chip === "trending") ||
          haystack.includes(chip) ||
          (character.tags || []).some((tag) => normalizeLabel(tag).toLowerCase() === chip);

        return matchesQuery && matchesChip;
      })
      .sort((a, b) => {
        if (Number(b.isFavorite) !== Number(a.isFavorite)) return Number(b.isFavorite) - Number(a.isFavorite);
        return new Date(b.updated_at || b.updatedAt || b.created_at || 0) - new Date(a.updated_at || a.updatedAt || a.created_at || 0);
      });
  }, [sourceCharacters, search, activeChip]);

  const featured = view === "active" ? filtered[0] : null;
  const trending = useMemo(() => pickCharacters(filtered, 1, 3), [filtered]);
  const newcomers = useMemo(() => pickCharacters(filtered, 4, 3), [filtered]);

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
      <section className="discover-burgundy discover-burgundy--empty">
        <div className="discover-burgundy__empty-hero">
          <small>DISCOVER</small>
          <h1>
            Who will <span>you</span> choose?
          </h1>
          <p>Create your first character and start building the dark, romantic library you wanted.</p>
          <button className="discover-burgundy__primary" onClick={onCreateCharacter}>
            <PenLine size={18} /> Create a character
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`discover-burgundy ${view === "trash" ? "discover-burgundy--trash" : ""}`}>
      <header className="discover-burgundy__hero">
        <div className="discover-burgundy__headline">
          <small>DISCOVER</small>
          <h1>
            Who will <span>you</span> choose?
          </h1>
          <div className="discover-burgundy__ornament" aria-hidden="true">
            <span />
            <i>✦</i>
            <span />
          </div>
        </div>

        <div className="discover-burgundy__hero-actions">
          <button className="discover-burgundy__glow" onClick={onCreateCharacter} aria-label="Create character">
            <Sparkles size={22} />
          </button>
          <button
            className="discover-burgundy__utility"
            onClick={() => {
              setView(view === "trash" ? "active" : "trash");
              setActiveChip("All");
              setSearch("");
              setMenuId(null);
            }}
          >
            <Trash2 size={16} />
            <span>{view === "trash" ? "Back to Discover" : "Trash"}</span>
          </button>
        </div>
      </header>

      <div className="discover-burgundy__controls">
        <label className="discover-burgundy__search">
          <Search size={21} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={view === "trash" ? "Search trash" : "Search characters, stories, or moments..."}
          />
          <button type="button" onClick={search ? () => setSearch("") : onCreateCharacter} aria-label={search ? "Clear search" : "Create character"}>
            {search ? <X size={18} /> : <Sparkles size={18} />}
          </button>
        </label>

        {view === "active" && (
          <div className="discover-burgundy__chips" role="tablist" aria-label="Discover filters">
            {filterChips.map((chip) => (
              <button
                key={chip}
                className={activeChip === chip ? "active" : ""}
                onClick={() => setActiveChip(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === "trash" ? (
        filtered.length > 0 ? (
          <div className="discover-burgundy__trash-list">
            {filtered.map((character) => (
              <article key={character.id} className="discover-burgundy__trash-row">
                <div className="discover-burgundy__trash-media">
                  <CharacterImage character={character} />
                </div>
                <div className="discover-burgundy__trash-copy">
                  <small>{character.role || "Character"}</small>
                  <h2>{character.name}</h2>
                  <p>{character.description || "This character can still be restored."}</p>
                </div>
                <div className="discover-burgundy__trash-actions">
                  <button onClick={() => handleRestore(character)}><RotateCcw size={15} /> Restore</button>
                  <button className="danger" onClick={() => handleDeleteForever(character)}><Trash2 size={15} /> Forever</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Trash is empty" text="Deleted characters will wait here until you restore them or remove them forever." />
        )
      ) : filtered.length === 0 ? (
        <EmptyState title="No characters found" text="Try another search or switch to a different mood." />
      ) : (
        <>
          {featured && (
            <section className="discover-burgundy__feature">
              <div className="discover-burgundy__feature-copy">
                <small>FEATURED THIS WEEK</small>
                <h2>{featured.name}</h2>
                <p className="discover-burgundy__feature-role">{featured.role || featured.world || "Velvet favorite"}</p>
                <p className="discover-burgundy__feature-quote">“{extractQuote(featured)}”</p>
                <div className="discover-burgundy__feature-actions">
                  <button className="discover-burgundy__primary" onClick={() => onOpenCharacter(featured)}>
                    Open <ArrowRight size={16} />
                  </button>
                  <button className={featured.isFavorite ? "active" : ""} onClick={() => toggleFavorite(featured.id)} aria-label="Toggle favorite">
                    <Heart size={18} fill={featured.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button onClick={() => onEditCharacter(featured)} aria-label="Edit character">
                    <Pencil size={18} />
                  </button>
                </div>
              </div>

              <button className="discover-burgundy__feature-media" onClick={() => onOpenCharacter(featured)}>
                <CharacterImage character={featured} />
              </button>
            </section>
          )}

          <div className="discover-burgundy__tropes">
            {TROPE_CHIPS.map((item) => (
              <button key={item.id} className="discover-burgundy__trope" onClick={() => setSearch(item.label.replace(/\n/g, " "))}>
                <span>{item.mark}</span>
                <strong>{item.label.split("\n").map((part) => <em key={part}>{part}</em>)}</strong>
              </button>
            ))}
          </div>

          <DiscoverSection
            title="Trending now"
            actionLabel="View all"
            onAction={() => setActiveChip("Trending")}
            items={trending}
            menuId={menuId}
            setMenuId={setMenuId}
            onOpenCharacter={onOpenCharacter}
            onToggleFavorite={toggleFavorite}
            onEditCharacter={onEditCharacter}
            onOpenTags={openTags}
            onDeleteCharacter={handleDelete}
          />

          <DiscoverSection
            title="New for you"
            actionLabel="View all"
            onAction={() => setSearch("")}
            items={newcomers}
            menuId={menuId}
            setMenuId={setMenuId}
            onOpenCharacter={onOpenCharacter}
            onToggleFavorite={toggleFavorite}
            onEditCharacter={onEditCharacter}
            onOpenTags={openTags}
            onDeleteCharacter={handleDelete}
            badgeLabel="NEW"
          />
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

function DiscoverSection({
  title,
  actionLabel,
  onAction,
  items,
  menuId,
  setMenuId,
  onOpenCharacter,
  onToggleFavorite,
  onEditCharacter,
  onOpenTags,
  onDeleteCharacter,
  badgeLabel,
}) {
  if (!items.length) return null;

  return (
    <section className="discover-burgundy__section">
      <header>
        <h3>{title}</h3>
        <button onClick={onAction}>{actionLabel} <ArrowRight size={15} /></button>
      </header>

      <div className="discover-burgundy__grid">
        {items.map((character) => (
          <article key={character.id} className="discover-burgundy__card">
            <button className="discover-burgundy__card-media" onClick={() => onOpenCharacter(character)}>
              <CharacterImage character={character} />
              <span className="discover-burgundy__card-bookmark">
                <Bookmark size={16} />
              </span>
            </button>

            <div className="discover-burgundy__card-copy">
              <button className="discover-burgundy__card-name" onClick={() => onOpenCharacter(character)}>
                <h4>{character.name}</h4>
                <p>{character.role || character.world || "Velvet story"}</p>
              </button>

              <div className="discover-burgundy__card-meta">
                <span>{badgeLabel || fauxPopularity(character)}</span>
                <button className={character.isFavorite ? "active" : ""} onClick={() => onToggleFavorite(character.id)} aria-label="Toggle favorite">
                  <Heart size={15} fill={character.isFavorite ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            <div className="discover-burgundy__menu-wrap">
              <button className="discover-burgundy__more" onClick={() => setMenuId(menuId === character.id ? null : character.id)} aria-label="Character actions">
                <MoreHorizontal size={18} />
              </button>

              {menuId === character.id && (
                <div className="discover-burgundy__menu">
                  <button onClick={() => { setMenuId(null); onOpenCharacter(character); }}><ArrowRight size={14} /> Open</button>
                  <button onClick={() => { setMenuId(null); onEditCharacter(character); }}><Pencil size={14} /> Edit</button>
                  <button onClick={() => onOpenTags(character)}><Tag size={14} /> Tags</button>
                  <button className="danger" onClick={() => { setMenuId(null); onDeleteCharacter(character); }}><Trash2 size={14} /> Delete</button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CharacterImage({ character }) {
  const source = character.coverUrl || character.imageUrl;

  if (source) {
    return <img src={source} alt="" loading="lazy" />;
  }

  return (
    <span className="discover-burgundy__image-fallback" style={{ "--character-color": character.color || "var(--accent)" }}>
      {character.initials || character.name?.slice(0, 2) || "VS"}
    </span>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="discover-burgundy__empty">
      <Sparkles size={24} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function pickCharacters(list, start, count) {
  const primary = list.slice(start, start + count);
  if (primary.length >= count) return primary;

  const fallback = list.filter((_, index) => !primary.includes(list[index])).slice(0, count - primary.length);
  return [...primary, ...fallback].slice(0, count);
}

function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function extractQuote(character) {
  const source = character.description || character.world || character.role || "A story worth opening again.";
  return source.length > 110 ? `${source.slice(0, 107).trim()}…` : source;
}

function fauxPopularity(character) {
  const seed = (character.name || "Velvet").split("").reduce((total, letter) => total + letter.charCodeAt(0), 0);
  const value = ((seed % 48) + 52) / 10;
  return `↗ ${value.toFixed(1)}K`;
}

export default MyCharacters;
