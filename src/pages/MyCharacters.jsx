import { PenLine, Sparkles } from "lucide-react";
import CharacterCard from "../components/CharacterCard";
import { useCharacters } from "../context/CharactersContext";
import "../styles/my-characters.css";

function MyCharacters({
  onCreateCharacter,
  onOpenCharacter,
}) {
  const { characters } = useCharacters();

  if (characters.length === 0) {
    return (
      <section className="my-characters-empty">
        <span className="my-characters-empty__symbol">
          <Sparkles size={30} />
        </span>

        <p>YOUR PRIVATE COLLECTION</p>

        <h1>My characters</h1>

        <span className="my-characters-empty__line" />

        <p>
          The personalities and worlds you create will live here.
        </p>

        <button
          className="primary-button"
          onClick={onCreateCharacter}
        >
          <PenLine size={18} />
          <span>Create your first character</span>
        </button>
      </section>
    );
  }

  return (
    <section className="my-characters">
      <header className="my-characters__header">
        <div>
          <p>YOUR PRIVATE COLLECTION</p>

          <h1>My characters</h1>

          <span>
            {characters.length}{" "}
            {characters.length === 1
              ? "character"
              : "characters"}
          </span>
        </div>

        <button
          className="primary-button"
          onClick={onCreateCharacter}
        >
          <PenLine size={18} />
          <span>Create a character</span>
        </button>
      </header>

      <div className="character-grid">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onOpen={onOpenCharacter}
          />
        ))}
      </div>
    </section>
  );
}

export default MyCharacters;