import {
  Activity,
  ArrowRight,
  BookOpenText,
  Clock3,
  LoaderCircle,
  MapPin,
  MessageCircleMore,
  RotateCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import "../styles/pulse.css";

const FILTERS = [
  { id: "recent", label: "Recent" },
  { id: "threads", label: "Open threads" },
];

function Pulse({ onOpenCharacter, onBrowseStories }) {
  const { user } = useAuth();
  const { characters, charactersLoading } = useCharacters();
  const { theme } = useTheme();
  const [stories, setStories] = useState([]);
  const [filter, setFilter] = useState("recent");
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

  const featured = stories[0] || null;
  const threadCount = useMemo(
    () => stories.reduce((total, story) => total + story.openThreads.length, 0),
    [stories],
  );
  const visibleStories = useMemo(
    () => filter === "threads" ? stories.filter((story) => story.openThreads.length) : stories,
    [filter, stories],
  );

  const continueStory = (story) => onOpenCharacter?.(story.character, story.id);

  return (
    <section className="chats-page chats-page--reference pulse-page">
      <div className="pulse-shell">
        <header className="pulse-heading">
          <div className="pulse-heading__eyebrow"><Activity size={15}/><span>YOUR STORIES, RIGHT NOW</span></div>
          <div className="pulse-heading__title" aria-label="Your Pulse">
            <span>your</span><h1>PULSE</h1><i aria-hidden="true">✦</i>
          </div>
          <p>Return to what matters without losing the thread.</p>
        </header>

        {error ? (
          <PulseState icon={RotateCw} title="Pulse missed a beat" text={error}>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again <RotateCw size={16}/></button>
          </PulseState>
        ) : loading ? (
          <PulseState icon={LoaderCircle} iconClassName="spin" text="Gathering your stories…"/>
        ) : featured ? (
          <>
            <FeaturedStory story={featured} onContinue={() => continueStory(featured)}/>

            <div className="pulse-glance" aria-label="Pulse overview">
              <div><BookOpenText size={18}/><span><strong>{stories.length}</strong>{pluralize(stories.length, "active story", "active stories")}</span></div>
              <i aria-hidden="true"/>
              <div><MessageCircleMore size={18}/><span><strong>{threadCount}</strong>{pluralize(threadCount, "open thread", "open threads")}</span></div>
            </div>

            <section className="pulse-library" aria-labelledby="pulse-library-title">
              <header className="pulse-library__heading">
                <div>
                  <span>KEEP MOVING</span>
                  <h2 id="pulse-library-title">Your stories</h2>
                </div>
                <div className="pulse-filters" aria-label="Filter stories">
                  {FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={filter === item.id ? "is-active" : ""}
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                      {item.id === "threads" && threadCount ? <b>{threadCount}</b> : null}
                    </button>
                  ))}
                </div>
              </header>

              {visibleStories.length ? (
                <div className="pulse-list">
                  {visibleStories.map((story) => (
                    <StoryRow key={story.id} story={story} onContinue={() => continueStory(story)}/>
                  ))}
                </div>
              ) : (
                <div className="pulse-threads-empty">
                  <MessageCircleMore size={22}/>
                  <div><strong>Nothing is waiting on you</strong><span>Your stories have no open threads right now.</span></div>
                </div>
              )}
            </section>
          </>
        ) : (
          <PulseState icon={Activity} title="Your Pulse is quiet—for now" text="Start or continue a story and its latest moments will appear here.">
            <button type="button" onClick={onBrowseStories}>Browse Stories <ArrowRight size={16}/></button>
          </PulseState>
        )}
      </div>
    </section>
  );
}

function FeaturedStory({ story, onContinue }) {
  const sceneLabel = getSceneLabel(story.scene);
  const mainThread = story.openThreads[0];

  return (
    <article className="pulse-feature">
      <div className="pulse-feature__art">
        {story.art ? <img src={story.art} alt="" fetchPriority="high" decoding="async"/> : <span>{story.initials}</span>}
        <div className="pulse-feature__shade"/>
        <span className="pulse-feature__time">{formatRelativeDate(story.updated_at)}</span>
      </div>
      <div className="pulse-feature__body">
        <span className="pulse-feature__label"><i aria-hidden="true"/> CONTINUE NOW</span>
        <h2>{story.displayName}</h2>
        {sceneLabel ? <p className="pulse-feature__scene"><MapPin size={14}/>{sceneLabel}</p> : null}
        <div className="pulse-feature__recap">
          <span>LAST TIME</span>
          <p>{story.recap}</p>
        </div>
        {mainThread ? (
          <div className="pulse-feature__thread">
            <MessageCircleMore size={17}/>
            <span><b>Still open</b>{truncate(mainThread, 118)}</span>
          </div>
        ) : null}
        <button type="button" onClick={onContinue}>Continue story <ArrowRight size={18}/></button>
      </div>
    </article>
  );
}

function StoryRow({ story, onContinue }) {
  const mainThread = story.openThreads[0];
  const sceneLabel = getSceneLabel(story.scene);

  return (
    <article className="pulse-row">
      <button className="pulse-row__button" type="button" onClick={onContinue} aria-label={`Continue ${story.displayName}`}>
        <span className="pulse-row__art">
          {story.art ? <img src={story.art} alt="" loading="lazy" decoding="async"/> : story.initials}
        </span>
        <span className="pulse-row__copy">
          <span className="pulse-row__topline"><strong>{story.displayName}</strong><time>{formatRelativeDate(story.updated_at)}</time></span>
          <span className="pulse-row__recap">{truncate(story.recap, 125)}</span>
          <span className="pulse-row__meta">
            {mainThread ? <><MessageCircleMore size={13}/><b>{story.openThreads.length}</b> {pluralize(story.openThreads.length, "open thread", "open threads")}</> : sceneLabel ? <><MapPin size={13}/>{sceneLabel}</> : <><Clock3 size={13}/>Ready to continue</>}
          </span>
        </span>
        <span className="pulse-row__action"><span>Continue</span><ArrowRight size={18}/></span>
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

function normalizeThreads(value) {
  if (!Array.isArray(value)) return [];
  return value.map((thread) => {
    if (typeof thread === "string") return clean(thread);
    if (!thread || typeof thread !== "object") return "";
    return clean(thread.title || thread.label || thread.summary || thread.detail || thread.text || "");
  }).filter(Boolean);
}

function getSceneLabel(scene = {}) {
  const location = clean(scene.location);
  const time = clean(scene.time_label || scene.time);
  return [location, time].filter(Boolean).join(" · ");
}

function pluralize(value, singular, plural) {
  return value === 1 ? singular : plural;
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

function formatRelativeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const today = date.toDateString() === now.toDateString();
  if (today) return `Today · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default Pulse;
