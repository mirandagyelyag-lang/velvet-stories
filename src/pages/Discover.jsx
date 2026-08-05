import { PenLine, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import CharacterCard from "../components/CharacterCard";
import { characters } from "../data/characters";
import "../styles/discover.css";

function Discover({ onCreateCharacter }) {
  const [search, setSearch] = useState("");

  const filteredCharacters = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return characters;
    }

    return characters.filter((character) => {
      const information = `
        ${character.name}
        ${character.role}
        ${character.description}
      `.toLowerCase();

      return information.includes(value);
    });
  }, [search]);

  return (
    <div className="discover">
      <header className="discover__topbar">
        <label className="discover__search">
          <Search size={20} />

          <input
            type="search"
            placeholder="Search characters, worlds, stories..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <button
  className="primary-button"
  onClick={onCreateCharacter}
>
          <PenLine size={18} />
          <span>Create a character</span>
        </button>
      </header>

      <section className="discover__hero">
        <div className="discover__hero-copy">
          <p className="discover__eyebrow">
            PRIVATE WORLDS · ENDLESS STORIES
          </p>

          <h1>Every story begins with a voice</h1>

          <div className="discover__ornament">
            <Sparkles size={13} />
          </div>

          <p className="discover__description">
            Create meaningful connections and unforgettable stories with
            characters that feel truly alive.
          </p>

          <button className="secondary-button">
            <Sparkles size={17} />
            Discover characters
          </button>
        </div>

        <div className="discover__hero-art">
          <div className="discover__moon" />
          <span className="discover__hero-initials">LT</span>

          <div className="discover__hero-character">
            <strong>Lucien Thorne</strong>
            <small>Antiquarian · London, 1891</small>
          </div>
        </div>
      </section>

      <section className="featured">
        <header className="featured__header">
          <div>
            <p>CHARACTERS WAITING FOR YOU</p>
            <h2>
              {search ? "Search results" : "Featured characters"}
            </h2>
          </div>

          <span>
            {filteredCharacters.length}{" "}
            {filteredCharacters.length === 1 ? "story" : "stories"}
          </span>
        </header>

        {filteredCharacters.length > 0 ? (
          <div className="character-grid">
            {filteredCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
              />
            ))}
          </div>
        ) : (
          <div className="discover__empty">
            <Sparkles size={25} />
            <h3>No story found</h3>
            <p>Try searching for another name or role.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Discover;