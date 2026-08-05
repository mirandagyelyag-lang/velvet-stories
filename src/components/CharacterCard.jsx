import { ArrowUpRight, Heart } from "lucide-react";

function CharacterCard({ character, onOpen }) {
  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.(character);
    }
  }

  return (
    <article
      className="character-card"
      style={{ "--character-color": character.color }}
      onClick={() => onOpen?.(character)}
      onKeyDown={handleKeyDown}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="character-card__portrait">
        <span className="character-card__halo" />

        <span className="character-card__initials">
          {character.initials}
        </span>

        <span className="character-card__style">
          {character.style}
        </span>
      </div>

      <div className="character-card__content">
        <h3>{character.name}</h3>
        <span className="character-card__role">
          {character.role}
        </span>
        <p>{character.description}</p>
      </div>

      <footer className="character-card__footer">
        <span>
          <Heart size={16} />
          {character.likes}
        </span>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onOpen?.(character);
          }}
          aria-label={`Chat with ${character.name}`}
        >
          <ArrowUpRight size={17} />
        </button>
      </footer>
    </article>
  );
}

export default CharacterCard;