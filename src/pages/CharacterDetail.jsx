import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Heart,
  MessageCircle,
  Pencil,
  Plus,
  Quote,
  Sparkles,
  Volume2,
  WandSparkles,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { useCharacters } from "../context/CharactersContext";
import { usePersonas } from "../context/PersonasContext";
import { useLorebooks } from "../context/LorebooksContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/character-detail.css";

export default function CharacterDetail({
  character,
  onBack,
  onContinue,
  onNewStory,
  onOpenStory,
  onEdit,
  onInstantStory,
}) {
  const [stories, setStories] = useState([]);
  const { generateInstantStory } = useCharacters();
  const { personas } = usePersonas();
  const { lorebooks } = useLorebooks();
  const { theme } = useTheme();
  const [instantLoading, setInstantLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storySetupOpen, setStorySetupOpen] = useState(false);
  const [storyOpening, setStoryOpening] = useState("");
  const [storyPersonaId, setStoryPersonaId] = useState("");
  const [storyLorebookId, setStoryLorebookId] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("velvet-burgundy-route");
    document.body.classList.add("velvet-burgundy-route");
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.getAttribute("content") || "";
    const colors = { light: "#f7eff2", comfort: "#eee4dc", dark: "#10090e" };
    themeMeta?.setAttribute("content", colors[theme] || colors.dark);
    return () => {
      document.documentElement.classList.remove("velvet-burgundy-route");
      document.body.classList.remove("velvet-burgundy-route");
      if (themeMeta && previousThemeColor) themeMeta.setAttribute("content", previousThemeColor);
    };
  }, [theme]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("conversations")
        .select("id, title, updated_at, branch_parent_id")
        .eq("character_id", character.id)
        .eq("group_mode", false)
        .is("trashed_at", null)
        .order("updated_at", { ascending: false })
        .limit(8);

      if (alive) {
        setStories(data || []);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [character.id]);


  function openStorySetup() {
    setStoryOpening("");
    setStoryPersonaId(personas.find((item) => item.isDefault)?.id || "");
    setStoryLorebookId("");
    setStorySetupOpen(true);
  }

  async function handleInstantStory() {
    if (instantLoading) return;
    try {
      setInstantLoading(true);
      const opening = await generateInstantStory(character);
      if (opening) await onInstantStory?.({ ...character, firstMessage: opening });
    } finally { setInstantLoading(false); }
  }

  const tags = character.tags || [];
  const latestStory = stories[0] || null;
  const depth = useMemo(
    () => [
      { label: "Values", value: character.values },
      { label: "Fears", value: character.fears },
      { label: "Habits", value: character.habits },
      { label: "Contradictions", value: character.contradictions },
    ].filter((item) => item.value),
    [character]
  );

  const hasWorldSection = Boolean(character.world || character.scenario);
  const hasVoiceSection = Boolean(character.speechStyle || character.boundaries);

  return (
    <section className="character-profile" style={{ "--character-color": character.color || "var(--accent)" }}>
      <header className="character-profile__topbar">
        <button className="character-profile__back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Characters</span>
        </button>

        {onEdit && (
          <button className="character-profile__edit" onClick={() => onEdit(character)}>
            <Pencil size={16} />
            <span>Edit character</span>
          </button>
        )}
      </header>

      <section className="character-profile__hero">
        <div className="character-profile__cover" aria-hidden="true">
          {character.coverUrl || character.imageUrl ? (
            <img src={character.coverUrl || character.imageUrl} alt="" decoding="async" />
          ) : (
            <span>{character.initials}</span>
          )}
          <div className="character-profile__cover-shade" />
        </div>

        <div className="character-profile__hero-content">
          <div className="character-profile__avatar">
            {character.imageUrl ? <img src={character.imageUrl} alt="" decoding="async" /> : <span>{character.initials}</span>}
          </div>

          <div className="character-profile__identity">
            <p className="character-profile__eyebrow">{character.role || "Character"}</p>
            <h1>{character.name}</h1>
            <p className="character-profile__intro">
              {character.description || "A story waiting to become something unforgettable."}
            </p>

            <div className="character-profile__story-signature" aria-label="Story signature">
              {character.relationship && <span><Heart size={13}/>{String(character.relationship).split(/[.!?]/)[0].slice(0, 56)}</span>}
              {character.world && <span><BookOpen size={13}/>{String(character.world).split(/[.!?]/)[0].slice(0, 48)}</span>}
              {latestStory && <span><MessageCircle size={13}/>Last opened {formatDate(latestStory.updated_at)}</span>}
            </div>

            {tags.length > 0 && (
              <div className="character-profile__tags">
                {tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            )}
          </div>

          <div className="character-profile__hero-actions">
            <button className="character-profile__continue" onClick={() => latestStory ? onOpenStory(character, latestStory.id) : onContinue(character)}>
              <MessageCircle size={18} />
              <span>{latestStory ? "Continue latest story" : "Begin story"}</span>
            </button>
            <button className="character-profile__new" type="button" onClick={openStorySetup} aria-label="Start a new story"><Plus size={18} /><span>New story</span></button><button className="character-profile__instant" onClick={handleInstantStory} disabled={instantLoading}>{instantLoading ? <LoaderCircle className="spin" size={18}/> : <WandSparkles size={18}/>}<span>{instantLoading ? "Opening…" : "Instant Story"}</span></button>
          </div>
        </div>
      </section>

      <div className="character-profile__layout">
        <main className="character-profile__main">
          {character.relationship && (
            <section className="character-profile__relationship">
              <div className="character-profile__section-heading">
                <span className="character-profile__section-icon"><Heart size={17} /></span>
                <div>
                  <small>RELATIONSHIP TO YOU</small>
                  <h2>Your dynamic</h2>
                </div>
              </div>
              <p>{character.relationship}</p>
            </section>
          )}

          {character.personality && (
            <section className="character-profile__section">
              <div className="character-profile__section-heading">
                <span className="character-profile__section-icon"><Sparkles size={17} /></span>
                <div>
                  <small>CHARACTER CORE</small>
                  <h2>Personality</h2>
                </div>
              </div>
              <p className="character-profile__long-copy">{character.personality}</p>

              {depth.length > 0 && (
                <div className="character-profile__dna">
                  {depth.map((item) => (
                    <article key={item.label}>
                      <small>{item.label}</small>
                      <p>{item.value}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {hasWorldSection && (
            <section className="character-profile__section">
              <div className="character-profile__section-heading">
                <span className="character-profile__section-icon"><BookOpen size={17} /></span>
                <div>
                  <small>STORY CONTEXT</small>
                  <h2>World & scenario</h2>
                </div>
              </div>

              <div className="character-profile__context-grid">
                {character.world && (
                  <article>
                    <small>WORLD</small>
                    <p>{character.world}</p>
                  </article>
                )}
                {character.scenario && (
                  <article>
                    <small>SCENARIO</small>
                    <p>{character.scenario}</p>
                  </article>
                )}
              </div>
            </section>
          )}

          {hasVoiceSection && (
            <section className="character-profile__section character-profile__section--quiet">
              <div className="character-profile__section-heading">
                <span className="character-profile__section-icon"><Volume2 size={17} /></span>
                <div>
                  <small>BEHAVIOR</small>
                  <h2>Voice & boundaries</h2>
                </div>
              </div>

              <div className="character-profile__context-grid">
                {character.speechStyle && (
                  <article>
                    <small>SPEECH STYLE</small>
                    <p>{character.speechStyle}</p>
                  </article>
                )}
                {character.boundaries && (
                  <article>
                    <small>BOUNDARIES</small>
                    <p>{character.boundaries}</p>
                  </article>
                )}
              </div>
            </section>
          )}

          {character.firstMessage && (
            <section className="character-profile__opening">
              <div className="character-profile__opening-label">
                <Quote size={17} />
                <span>OPENING SCENE</span>
              </div>
              <blockquote>{character.firstMessage}</blockquote>
              <button onClick={openStorySetup}>
                Start from the beginning <ChevronRight size={16} />
              </button>
            </section>
          )}
        </main>

        <aside className="character-profile__aside">
          <section className="character-profile__stories">
            <header>
              <div>
                <small>YOUR STORIES</small>
                <h2>With {character.name}</h2>
              </div>
              <button onClick={openStorySetup} aria-label="Start new story">
                <Plus size={17} />
              </button>
            </header>

            {loading ? (
              <p className="character-profile__empty">Loading your stories…</p>
            ) : stories.length ? (
              <div className="character-profile__story-list">
                {stories.map((story, index) => (
                  <button key={story.id} onClick={() => onOpenStory(character, story.id)}>
                    <span className="character-profile__story-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="character-profile__story-copy">
                      <strong>{story.title || `${character.name} story`}</strong>
                      <small>{story.branch_parent_id ? "Branch · " : ""}{formatDate(story.updated_at)}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="character-profile__empty character-profile__empty--stories">
                <MessageCircle size={21} />
                <p>No stories yet.</p>
                <button onClick={openStorySetup}>Begin the first one</button>
              </div>
            )}
          </section>

          <section className="character-profile__quick-card">
            <small>STORY STYLE</small>
            <div>
              <span>Response</span>
              <strong>{formatSetting(character.responseLength)}</strong>
            </div>
            <div>
              <span>Narration</span>
              <strong>{formatSetting(character.narrationStyle)}</strong>
            </div>
          </section>
        </aside>
      </div>

      {storySetupOpen && (
        <div className="story-setup-backdrop" onMouseDown={(event)=>event.target === event.currentTarget && setStorySetupOpen(false)}>
          <section className="story-setup-sheet" role="dialog" aria-modal="true" aria-label={`Start a new story with ${character.name}`}>
            <header>
              <div><small>NEW STORY</small><h2>Where should this one begin?</h2><p>Keep the character. Change only the opening if you want a different universe, day or situation.</p></div>
              <button type="button" onClick={()=>setStorySetupOpen(false)} aria-label="Close new story setup"><X size={19}/></button>
            </header>
            <div className="story-setup-sheet__identity-grid">
              <label><span>Your persona <small>this story only</small></span><select value={storyPersonaId} onChange={(event)=>setStoryPersonaId(event.target.value)}><option value="">Account identity</option>{personas.map((persona)=><option key={persona.id} value={persona.id}>{persona.isDefault ? "★ " : ""}{persona.name}{persona.role ? ` · ${persona.role}` : ""}</option>)}</select></label>
              <label><span>World / lorebook <small>optional</small></span><select value={storyLorebookId} onChange={(event)=>setStoryLorebookId(event.target.value)}><option value="">No linked world</option>{lorebooks.map((book)=><option key={book.id} value={book.id}>{book.name}{book.genre ? ` · ${book.genre}` : ""}</option>)}</select></label>
            </div>
            <p className="story-setup-sheet__persona-note">Velvet keeps this persona isolated from your other identities and retrieves only world lore relevant to the current scene.</p>
            <label><span>Opening beat <small>optional</small></span><textarea rows="5" value={storyOpening} onChange={(event)=>setStoryOpening(event.target.value)} placeholder={character.firstMessage || `The next story with ${character.name} begins…`} /></label>
            <div className="story-setup-sheet__choices">
              <button type="button" onClick={()=>setStoryOpening("")} className={!storyOpening.trim() ? "is-active" : ""}><BookOpen size={16}/><span>Original opening<small>Use the character's saved scene</small></span></button>
              <button type="button" onClick={()=>document.querySelector(".story-setup-sheet textarea")?.focus()} className={storyOpening.trim() ? "is-active" : ""}><Sparkles size={16}/><span>Custom opening<small>Write what happens first</small></span></button>
            </div>
            <footer><button type="button" className="secondary" onClick={()=>setStorySetupOpen(false)}>Cancel</button><button type="button" className="primary" onClick={()=>{ setStorySetupOpen(false); onNewStory({ ...character, firstMessage: storyOpening.trim() || character.firstMessage }, { personaId: storyPersonaId, lorebookId: storyLorebookId }); }}><MessageCircle size={17}/>Start story</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function formatSetting(value) {
  if (!value) return "Balanced";
  return String(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
