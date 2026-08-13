import {
  Heart,
  PenLine,
  Search,
  Sparkles,
  Tag,
  X,
  Trash2,
  RotateCcw,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CharacterCard from "../components/CharacterCard";
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

  useEffect(() => {
    if (view === "trash") {
      listTrashedCharacters().then(setTrashed).catch(console.error);
    }
  }, [view]);

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
        const haystack = `${character.name} ${character.role} ${character.description} ${character.world} ${(character.tags || []).join(" ")}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesFavorite = filter !== "favorites" || character.isFavorite;
        const matchesTag = !tagFilter || character.tags?.includes(tagFilter);
        return matchesQuery && matchesFavorite && matchesTag;
      })
      .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  }, [sourceCharacters, search, filter, tagFilter]);

  const spotlight = view === "active" ? filtered[0] : null;
  const quickPicks = view === "active" ? filtered.slice(1, 3) : [];
  const galleryCharacters = view === "active" ? filtered.slice(3) : filtered;

  async function handleDelete(character) {
    const approved =
      !settings.confirmBeforeDelete ||
      (await confirmAction({
        title: `Delete ${character.name}?`,
        message:
          "Every conversation and memory connected to this character will also be deleted.",
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
    setTagEditor(character);
    setTagValue((character.tags || []).join(", "));
  }

  async function saveTags(event) {
    event.preventDefault();
    await updateTags(tagEditor.id, tagValue.split(","));
    setTagEditor(null);
  }

  function chooseTag(tag) {
    setTagFilter((current) => (current === tag ? "" : tag));
    setView("active");
  }

  if (view === "active" && characters.length === 0) {
    return (
      <section className="discover-empty">
        <div className="discover-empty__halo"><Sparkles size={30} /></div>
        <p>YOUR CAST STARTS HERE</p>
        <h1>Create someone<br />you want to meet.</h1>
        <span>Characters, chemistry, worlds and all the bad decisions in between.</span>
        <button onClick={onCreateCharacter}>
          <PenLine size={17} />
          Create your first character
        </button>
      </section>
    );
  }

  return (
    <section className="discover-page">
      <header className="discover-top">
        <div className="discover-top__copy">
          <span className="discover-top__eyebrow">DISCOVER</span>
          <h1>Find your next<br />favorite person.</h1>
          <p>Your characters, arranged less like a database and more like a cast worth browsing.</p>
        </div>

        <div className="discover-top__actions">
          <button className="discover-create" onClick={onCreateCharacter}>
            <PenLine size={17} />
            <span>Create</span>
          </button>
          <button
            className={`discover-trash-toggle ${view === "trash" ? "active" : ""}`}
            onClick={() => {
              setView(view === "trash" ? "active" : "trash");
              setFilter("all");
              setTagFilter("");
            }}
          >
            <Trash2 size={16} />
            <span>{view === "trash" ? "Back" : "Trash"}</span>
          </button>
        </div>
      </header>

      <div className="discover-toolbar">
        <label className="discover-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={view === "trash" ? "Search deleted characters" : "Search a name, world, vibe..."}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </label>

        {view === "active" && (
          <div className="discover-mode">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              className={filter === "favorites" ? "active" : ""}
              onClick={() => setFilter("favorites")}
            >
              <Heart size={14} />
              Favorites
            </button>
          </div>
        )}
      </div>

      {view === "active" && tags.length > 0 && (
        <div className="discover-tags" aria-label="Character tags">
          <span><SlidersHorizontal size={13} /> Browse by mood</span>
          <div>
            {tags.slice(0, 12).map((tag) => (
              <button
                key={tag}
                className={tagFilter === tag ? "active" : ""}
                onClick={() => chooseTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "trash" ? (
        filtered.length > 0 ? (
          <section className="discover-trash">
            <div className="discover-section-title">
              <div>
                <span>RECOVERABLE</span>
                <h2>Trash</h2>
              </div>
              <small>{filtered.length}</small>
            </div>

            <div className="discover-trash__grid">
              {filtered.map((character) => (
                <article key={character.id} className="discover-trash-card">
                  <CharacterImage character={character} />
                  <div>
                    <span>{character.role || "Character"}</span>
                    <h3>{character.name}</h3>
                    <p>{character.description || "This character can still be restored."}</p>
                  </div>
                  <footer>
                    <button onClick={() => handleRestore(character)}>
                      <RotateCcw size={15} /> Restore
                    </button>
                    <button className="danger" onClick={() => handleDeleteForever(character)}>
                      <Trash2 size={15} /> Forever
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <div className="discover-none">
            <Trash2 size={26} />
            <h2>Trash is empty</h2>
            <p>Deleted characters will wait here until you restore or remove them forever.</p>
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="discover-none">
          <Search size={26} />
          <h2>No one matches that</h2>
          <p>Try another search, mood or filter.</p>
        </div>
      ) : (
        <>
          <section className="discover-feature">
            {spotlight && (
              <button className="discover-spotlight" onClick={() => onOpenCharacter(spotlight)}>
                <CharacterImage character={spotlight} />
                <span className="discover-spotlight__shade" />
                <div className="discover-spotlight__label">SPOTLIGHT</div>
                <div className="discover-spotlight__content">
                  <span>{spotlight.role || "Character"}</span>
                  <h2>{spotlight.name}</h2>
                  <p>{spotlight.description || "A new story is waiting to begin."}</p>
                  <div className="discover-spotlight__tags">
                    {(spotlight.tags || []).slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}
                  </div>
                  <b>Meet them <ArrowUpRight size={17} /></b>
                </div>
              </button>
            )}

            {quickPicks.length > 0 && (
              <aside className="discover-picks">
                <header>
                  <span>QUICK PICKS</span>
                  <small>{quickPicks.length}</small>
                </header>
                {quickPicks.map((character, index) => (
                  <button key={character.id} onClick={() => onOpenCharacter(character)}>
                    <div className="discover-picks__image">
                      <CharacterImage character={character} />
                    </div>
                    <div>
                      <small>0{index + 1}</small>
                      <strong>{character.name}</strong>
                      <span>{character.role || "Character"}</span>
                    </div>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
                <button className="discover-picks__new" onClick={onCreateCharacter}>
                  <span>+</span>
                  <div>
                    <strong>Someone new?</strong>
                    <small>Create another character</small>
                  </div>
                </button>
              </aside>
            )}
          </section>

          {galleryCharacters.length > 0 && (
            <section className="discover-gallery">
              <div className="discover-section-title">
                <div>
                  <span>YOUR CAST</span>
                  <h2>Keep exploring</h2>
                </div>
                <small>{galleryCharacters.length}</small>
              </div>

              <div className="discover-mosaic">
                {galleryCharacters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onOpen={onOpenCharacter}
                    onEdit={onEditCharacter}
                    onDelete={handleDelete}
                    onFavorite={toggleFavorite}
                    onTags={openTags}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {tagEditor && (
        <div
          className="tag-modal-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && setTagEditor(null)}
        >
          <form className="tag-modal" onSubmit={saveTags}>
            <header>
              <span><Tag size={18} /></span>
              <div>
                <small>ORGANIZE CHARACTER</small>
                <h2>{tagEditor.name}'s tags</h2>
              </div>
              <button type="button" onClick={() => setTagEditor(null)}>
                <X size={19} />
              </button>
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
  if (source) return <img src={source} alt="" />;
  return <span className="discover-image-fallback" style={{ "--character-color": character.color }}>
    {character.initials || character.name?.slice(0, 2)}
  </span>;
}

export default MyCharacters;
