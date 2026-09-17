import { Check, LoaderCircle, Search, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useCharacters } from "../context/CharactersContext";
import { useChats } from "../context/ChatsContext";
import { useLorebooks } from "../context/LorebooksContext";
import { usePersonas } from "../context/PersonasContext";

export default function GroupStoryModal({ onClose, onOpenStory }) {
  const { characters } = useCharacters();
  const { createGroupConversation } = useChats();
  const { personas } = usePersonas();
  const { lorebooks } = useLorebooks();
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [personaId, setPersonaId] = useState(personas.find((item) => item.isDefault)?.id || "");
  const [lorebookId, setLorebookId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return characters.filter((item) => !needle || `${item.name} ${item.role || ""} ${item.description || ""}`.toLowerCase().includes(needle));
  }, [characters, search]);

  const selected = selectedIds.map((id) => characters.find((item) => item.id === id)).filter(Boolean);
  const suggestedTitle = selected.length ? selected.map((item) => item.name.split(" ")[0]).join(" · ") : "";

  function toggle(id) {
    setError("");
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 5) {
        setError("Group Stories currently support up to five characters.");
        return current;
      }
      return [...current, id];
    });
  }

  async function create() {
    if (selected.length < 2 || saving) return;
    try {
      setSaving(true);
      setError("");
      const primary = selected[0];
      const created = await createGroupConversation(selected, {
        groupTitle: title.trim() || suggestedTitle,
        personaId,
        lorebookId,
      });
      onClose();
      onOpenStory(primary, created.conversationId);
    } catch (requestError) {
      setError(requestError?.message || "Velvet couldn't create this Group Story.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="group-story-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="group-story-sheet" role="dialog" aria-modal="true" aria-label="Create Group Story">
        <span className="velvet-sheet-grabber" aria-hidden="true" />
        <header>
          <div><small>ENSEMBLE STORY</small><h2>Group Story</h2><p>Choose 2–5 characters. Velvet keeps each voice, relationship and knowledge separate.</p></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close"><X size={20}/></button>
        </header>

        <div className="group-story-sheet__scroll">
        <label className="group-story-search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find characters…"/></label>

        <div className="group-story-cast">
          {visible.map((character) => {
            const active = selectedIds.includes(character.id);
            return <button type="button" key={character.id} className={active ? "is-selected" : ""} onClick={() => toggle(character.id)}>
              <span>{character.imageUrl ? <img src={character.imageUrl} alt="" loading="lazy" decoding="async"/> : character.initials}</span>
              <strong>{character.name}</strong>
              <small>{character.role || "Character"}</small>
              {active && <i><Check size={13}/></i>}
            </button>;
          })}
        </div>

        <div className="group-story-selected">
          <UsersRound size={16}/><span>{selected.length ? `${selected.length} selected · ${selected.map((item) => item.name).join(", ")}` : "Choose at least two characters"}</span>
        </div>

        <div className="group-story-settings">
          <label>Story name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={suggestedTitle || "After Hours"} maxLength={80}/></label>
          <label>Your persona<select value={personaId} onChange={(event) => setPersonaId(event.target.value)}><option value="">Account identity</option>{personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.isDefault ? "★ " : ""}{persona.name}{persona.role ? ` · ${persona.role}` : ""}</option>)}</select></label>
          <label>World / lorebook<select value={lorebookId} onChange={(event) => setLorebookId(event.target.value)}><option value="">No linked world</option>{lorebooks.map((book) => <option key={book.id} value={book.id}>{book.name}{book.genre ? ` · ${book.genre}` : ""}</option>)}</select></label>
        </div>

        {error && <p className="group-story-error">{error}</p>}
        </div>
        <footer><button type="button" className="secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="primary" onClick={create} disabled={saving || selected.length < 2}>{saving ? <LoaderCircle className="spin" size={16}/> : <UsersRound size={16}/>} {saving ? "Creating…" : "Start Group Story"}</button></footer>
      </section>
    </div>
  );
}
