import {
  Activity,
  ArrowRight,
  BookOpenText,
  Clock3,
  LoaderCircle,
  MapPin,
  MessageCircleMore,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import "../styles/pulse.css";

function Pulse({ onOpenCharacter, onBrowseStories }) {
  const { user } = useAuth();
  const { characters, charactersLoading } = useCharacters();
  const { theme } = useTheme();
  const [stories, setStories] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("velvet-burgundy-route");
    document.body.classList.add("velvet-burgundy-route");
    return () => {
      document.documentElement.classList.remove("velvet-burgundy-route");
      document.body.classList.remove("velvet-burgundy-route");
    };
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const colors = { light: "#f7eff2", comfort: "#eee4dc", dark: "#10090e" };
    meta?.setAttribute("content", colors[theme] || colors.dark);
  }, [theme]);

  useEffect(() => {
    let alive = true;

    async function loadPulse() {
      if (!user?.id) {
        if (alive) {
          setStories([]);
          setLoading(false);
        }
        return;
      }
      if (charactersLoading) return;

      setLoading(true);
      setError("");

      const { data, error: conversationsError } = await supabase
        .from("conversations")
        .select("id, character_id, title, summary, updated_at, group_mode, group_character_ids, group_title, cover_url, scene_state, story_recap, unresolved_threads")
        .eq("user_id", user.id)
        .is("trashed_at", null)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(60);

      if (!alive) return;
      if (conversationsError) {
        setError("Pulse couldn't read your stories right now.");
        setLoading(false);
        return;
      }

      const charactersById = new Map(characters.map((character) => [character.id, character]));
      const nextStories = (data || []).map((conversation) => {
        const character = charactersById.get(conversation.character_id);
        const groupCharacters = conversation.group_mode
          ? (conversation.group_character_ids || []).map((id) => charactersById.get(id)).filter(Boolean)
          : [];

        if (!character) return null;
        return shapeStory(conversation, character, groupCharacters);
      }).filter(Boolean);

      setStories(nextStories);
      setLoading(false);
    }

    loadPulse();
    return () => { alive = false; };
  }, [user?.id, characters, charactersLoading, reloadKey]);

  const sections = useMemo(() => {
    const needsAttention = stories.filter((story) => story.openThreads.length > 0);
    const comingUp = stories.filter((story) => (
      story.openThreads.length === 0 && hasScene(story.scene)
    ));
    const continueStories = stories.filter((story) => (
      story.openThreads.length === 0 && !hasScene(story.scene)
    ));

    return [
      {
        id: "attention",
        eyebrow: "NEEDS ATTENTION",
        title: "Loose threads",
        description: "Moments you left unfinished.",
        stories: needsAttention,
      },
      {
        id: "coming",
        eyebrow: "COMING UP",
        title: "Scenes waiting",
        description: "Stories with a place and moment ready for you.",
        stories: comingUp,
      },
      {
        id: "continue",
        eyebrow: "CONTINUE",
        title: "Pick up where you left off",
        description: "Everything else you have been living in Velvet.",
        stories: continueStories,
      },
    ].filter((section) => section.stories.length > 0);
  }, [stories]);

  return (
    <section className="chats-page chats-page--reference pulse-page">
      <div className="pulse-shell">
        <header className="pulse-header">
          <div className="pulse-header__copy">
            <span className="pulse-header__eyebrow"><Activity size={15}/> STORY PULSE</span>
            <h1>Pulse</h1>
            <p>A clear way back into the stories that are still with you.</p>
          </div>
          <button className="pulse-header__library" type="button" onClick={onBrowseStories}>
            <BookOpenText size={17}/>
            <span>Open Stories</span>
          </button>
        </header>

        {error ? (
          <PulseState icon={RotateCw} title="Pulse missed a beat" text={error}>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again <RotateCw size={16}/></button>
          </PulseState>
        ) : loading ? (
          <PulseState icon={LoaderCircle} iconClassName="spin" text="Finding your unfinished moments…"/>
        ) : stories.length ? (
          <div className="pulse-sections">
            {sections.map((section) => (
              <PulseSection
                key={section.id}
                section={section}
                onContinue={(story) => onOpenCharacter?.(story.character, story.id)}
              />
            ))}
          </div>
        ) : (
          <PulseState icon={Sparkles} title="Your Pulse is quiet—for now" text="Start a story and the moment you leave will appear here.">
            <button type="button" onClick={onBrowseStories}>Browse Stories <ArrowRight size={16}/></button>
          </PulseState>
        )}
      </div>
    </section>
  );
}

function PulseSection({ section, onContinue }) {
  return (
    <section className={`pulse-section pulse-section--${section.id}`} aria-labelledby={`pulse-${section.id}-title`}>
      <header className="pulse-section__heading">
        <div>
          <span>{section.eyebrow}</span>
          <h2 id={`pulse-${section.id}-title`}>{section.title}</h2>
          <p>{section.description}</p>
        </div>
      </header>

      <div className="pulse-list">
        {section.stories.map((story) => (
          <PulseStoryCard key={story.id} story={story} onContinue={() => onContinue(story)}/>
        ))}
      </div>
    </section>
  );
}

function PulseStoryCard({ story, onContinue }) {
  const location = clean(story.scene.location);
  const time = clean(story.scene.time_label || story.scene.time);
  const companions = story.group_mode
    ? story.groupCharacters.map((character) => character.name).filter(Boolean).join(" · ")
    : "";

  return (
    <article className="pulse-story-card">
      <span className="pulse-story-card__art">
        {story.art ? <img src={story.art} alt="" loading="lazy" decoding="async"/> : story.initials}
      </span>
      <div className="pulse-story-card__copy">
        <h3>{story.displayName}</h3>
        {companions ? <span className="pulse-story-card__companions">with {companions}</span> : null}
        <p>{getMomentText(story)}</p>
        <span className="pulse-story-card__where">
          {location ? <><MapPin size={14}/><span>{location}</span></> : time ? <><Clock3 size={14}/><span>{time}</span></> : <><MessageCircleMore size={14}/><span>Last moment saved</span></>}
          {location && time ? <><i aria-hidden="true">·</i><span>{time}</span></> : null}
        </span>
      </div>
      <button className="pulse-story-card__continue" type="button" onClick={onContinue}>
        <span>Continue story</span>
        <ArrowRight size={18}/>
      </button>
    </article>
  );
}

function PulseState({ icon: Icon, iconClassName = "", title, text, children }) {
  return (
    <div className="pulse-state">
      <Icon className={iconClassName} size={29}/>
      {title ? <h2>{title}</h2> : null}
      {text ? <p>{text}</p> : null}
      {children}
    </div>
  );
}

function shapeStory(conversation, character, groupCharacters) {
  const groupNames = groupCharacters.map((item) => item.name).filter(Boolean);
  const displayName = conversation.group_mode
    ? (clean(conversation.group_title) || groupNames.join(" · ") || clean(conversation.title) || "Group story")
    : character.name;
  const openThreads = normalizeThreads(conversation.unresolved_threads);
  const recap = clean(conversation.story_recap || conversation.summary)
    || (openThreads[0] ? `An unfinished moment is waiting: ${openThreads[0]}` : "Your story is ready where you left it.");
  const artCharacter = groupCharacters.find((item) => item.coverUrl || item.imageUrl) || character;

  return {
    ...conversation,
    character,
    groupCharacters,
    displayName,
    openThreads,
    recap: truncate(recap, 260),
    art: conversation.cover_url || artCharacter.coverUrl || artCharacter.imageUrl,
    initials: character.initials || displayName.slice(0, 2).toUpperCase(),
    scene: conversation.scene_state || {},
  };
}

function getMomentText(story) {
  if (story.openThreads[0]) return `Unfinished: ${truncate(story.openThreads[0], 155)}`;
  return story.recap || "The last scene is waiting for you.";
}

function hasScene(scene = {}) {
  return Boolean(clean(scene.location) || clean(scene.time_label || scene.time));
}

function normalizeThreads(value) {
  if (!Array.isArray(value)) return [];
  return value.map((thread) => {
    if (typeof thread === "string") return clean(thread);
    if (!thread || typeof thread !== "object") return "";
    return clean(thread.title || thread.label || thread.summary || thread.detail || thread.text || "");
  }).filter(Boolean);
}

function clean(value = "") {
  return String(value)
    .replace(/\*+/g, "")
    .replaceAll("[", "")
    .replaceAll("]", "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value = "", max = 140) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

export default Pulse;
