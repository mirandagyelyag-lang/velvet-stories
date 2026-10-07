import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookHeart,
  BookOpenText,
  CirclePlay,
  Clock3,
  Crown,
  LoaderCircle,
  MapPin,
  MessageCircleMore,
  Plus,
  RotateCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import "../styles/pulse.css";

const PULSE_LIBRARY_SCROLL_KEY = "velvet:pulse:library-scroll";
const PULSE_DETAIL_SCROLL_KEY = "velvet:pulse:detail-scroll";
const PULSE_SHELF_KEY = "velvet:pulse:shelf";
const RECENT_WINDOW_MS = 72 * 60 * 60 * 1000;

function Pulse({ onOpenCharacter, onBrowseStories, onNewStory, onOpenMemories, onOpenProfile }) {
  const { user } = useAuth();
  const { characters, charactersLoading } = useCharacters();
  const { theme } = useTheme();
  const [stories, setStories] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedShelfKey, setSelectedShelfKey] = useState(() => {
    try { return sessionStorage.getItem(PULSE_SHELF_KEY) || ""; } catch { return ""; }
  });

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
        .limit(80);

      if (!alive) return;
      if (conversationsError) {
        setError("Pulse couldn't read your stories right now.");
        setLoading(false);
        return;
      }

      const charactersById = new Map(characters.map((character) => [character.id, character]));
      const nextStories = (data || []).map((conversation) => {
        const groupIds = Array.from(new Set([
          ...(conversation.group_character_ids || []),
          conversation.character_id,
        ].filter(Boolean)));
        const groupCharacters = conversation.group_mode
          ? groupIds.map((id) => charactersById.get(id)).filter(Boolean)
          : [];
        const directCharacter = charactersById.get(conversation.character_id);
        const fallbackCharacter = directCharacter || groupCharacters[0] || null;

        // Keep orphaned conversations visible in Pulse. If at least one group member
        // still exists, that character can reopen the conversation; otherwise Stories
        // remains the safe fallback instead of silently dropping the row.
        return shapeStory(conversation, fallbackCharacter, groupCharacters);
      });

      setStories(nextStories);
      setLoading(false);
    }

    loadPulse();
    return () => { alive = false; };
  }, [user?.id, characters, charactersLoading, reloadKey]);

  const shelves = useMemo(() => buildShelves(stories, characters), [stories, characters]);
  const selectedShelf = shelves.find((shelf) => shelf.key === selectedShelfKey) || null;

  useEffect(() => {
    if (!loading && selectedShelfKey && !selectedShelf) {
      setSelectedShelfKey("");
      try { sessionStorage.removeItem(PULSE_SHELF_KEY); } catch { /* ignore */ }
    }
  }, [loading, selectedShelf, selectedShelfKey]);

  useEffect(() => {
    if (loading) return;
    let saved = 0;
    try {
      const key = selectedShelfKey ? PULSE_DETAIL_SCROLL_KEY : PULSE_LIBRARY_SCROLL_KEY;
      saved = Number(sessionStorage.getItem(key) || 0);
    } catch { saved = 0; }
    const frame = requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [loading, selectedShelfKey]);

  function chooseShelf(key) {
    try {
      sessionStorage.setItem(PULSE_LIBRARY_SCROLL_KEY, String(window.scrollY || 0));
      sessionStorage.setItem(PULSE_DETAIL_SCROLL_KEY, "0");
      sessionStorage.setItem(PULSE_SHELF_KEY, key);
    } catch { /* ignore */ }
    setSelectedShelfKey(key);
  }

  function closeShelf() {
    try {
      sessionStorage.setItem(PULSE_DETAIL_SCROLL_KEY, String(window.scrollY || 0));
      sessionStorage.removeItem(PULSE_SHELF_KEY);
    } catch { /* ignore */ }
    setSelectedShelfKey("");
  }

  function continueStory(story) {
    try {
      sessionStorage.setItem(PULSE_DETAIL_SCROLL_KEY, String(window.scrollY || 0));
      if (selectedShelfKey) sessionStorage.setItem(PULSE_SHELF_KEY, selectedShelfKey);
    } catch { /* ignore */ }

    if (story.character?.id) onOpenCharacter?.(story.character, story.id);
    else onBrowseStories?.();
  }

  return (
    <section className="chats-page chats-page--reference pulse-page">
      <div className="pulse-shell">
        {selectedShelf ? (
          <PulseShelfView
            shelf={selectedShelf}
            onBack={closeShelf}
            onContinue={continueStory}
            onBrowseStories={onBrowseStories}
            onNewStory={onNewStory}
            onOpenMemories={onOpenMemories}
            onOpenProfile={onOpenProfile}
          />
        ) : (
          <>
            <header className="pulse-header pulse-header--editorial reference-stories-hero">
              <div className="reference-stories-hero__private"><Crown size={19}/><span>STORY MOMENTS</span></div>
              <div className="pulse-header__copy">
                <div className="reference-stories-title pulse-header__editorial-title" aria-label="Your Pulse">
                  <span className="reference-stories-title__script">your</span>
                  <span className="reference-stories-title__line reference-stories-title__line--left" />
                  <h1>PULSE</h1>
                  <span className="reference-stories-title__spark">✦</span>
                  <span className="reference-stories-title__line reference-stories-title__line--right" />
                </div>
                <p>Your stories, tucked back into the people they belong to.</p>
              </div>
              <button className="pulse-header__library reference-stories-new" type="button" onClick={onBrowseStories} aria-label="Open Stories">
                <BookOpenText size={26}/>
              </button>
            </header>

            {error ? (
              <PulseState icon={RotateCw} title="Pulse missed a beat" text={error}>
                <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again <RotateCw size={16}/></button>
              </PulseState>
            ) : loading ? (
              <PulseState icon={LoaderCircle} iconClassName="spin" text="Gathering each character's moments…"/>
            ) : shelves.length ? (
              <PulseCharacterLibrary shelves={shelves} onOpen={chooseShelf}/>
            ) : (
              <PulseState icon={Sparkles} title="Your Pulse is quiet—for now" text="Start a story and its moments will settle here under that character.">
                <button type="button" onClick={onBrowseStories}>Browse Stories <ArrowRight size={16}/></button>
              </PulseState>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function PulseCharacterLibrary({ shelves, onOpen }) {
  return (
    <div className="pulse-library" aria-label="Pulse by character">
      <div className="pulse-library__heading">
        <span>STORY SHELVES</span>
        <h2>Who are you returning to?</h2>
        <p>Open a character to see only the moments that belong to them.</p>
      </div>

      <div className="pulse-character-grid">
        {shelves.map((shelf) => (
          <button className="pulse-character-card" type="button" key={shelf.key} onClick={() => onOpen(shelf.key)}>
            <PulsePortrait shelf={shelf}/>
            <span className="pulse-character-card__shade" aria-hidden="true"/>
            <span className="pulse-character-card__copy">
              <small>{shelf.isGroup ? "GROUP STORY" : storyCountLabel(shelf.stories.length)}</small>
              <strong>{shelf.name}</strong>
              <em>{truncate(shelfNudge(shelf), 82)}</em>
              <span>{shelf.latestAt ? relativeTime(shelf.latestAt) : "Ready when you are"}</span>
            </span>
            <span className={`pulse-character-card__status${shelf.unfinishedCount ? " is-attention" : ""}`}>
              {shelf.unfinishedCount ? `${shelf.unfinishedCount} OPEN` : shelf.stories.length ? "UP TO DATE" : "NEW"}
            </span>
            <span className="pulse-character-card__arrow" aria-hidden="true"><ArrowRight size={18}/></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PulsePortrait({ shelf, compact = false }) {
  const portraits = shelf.portraits.filter(Boolean).slice(0, 3);
  if (shelf.isGroup && portraits.length > 1) {
    return (
      <span className={`pulse-portrait pulse-portrait--group pulse-portrait--group-${portraits.length}${compact ? " pulse-portrait--compact" : ""}`} aria-hidden="true">
        {portraits.map((src, index) => <img src={src} alt="" key={`${src}-${index}`} loading="lazy" decoding="async"/>)}
      </span>
    );
  }

  return (
    <span className={`pulse-portrait${compact ? " pulse-portrait--compact" : ""}`} aria-hidden="true">
      {portraits[0] ? <img src={portraits[0]} alt="" loading="lazy" decoding="async"/> : <b>{shelf.initials}</b>}
    </span>
  );
}

function PulseShelfView({ shelf, onBack, onContinue, onBrowseStories, onNewStory, onOpenMemories, onOpenProfile }) {
  const priorityStory = shelf.priorityStory;
  const otherStories = useMemo(
    () => shelf.stories.filter((story) => story.id !== priorityStory?.id),
    [shelf.stories, priorityStory?.id]
  );
  const sections = useMemo(() => categorizeStories(otherStories), [otherStories]);
  const character = shelf.character;

  return (
    <div className="pulse-detail">
      <header className="pulse-detail__hero">
        <button className="pulse-detail__back" type="button" onClick={onBack} aria-label="Back to Pulse characters">
          <ArrowLeft size={19}/>
        </button>
        <PulsePortrait shelf={shelf} compact/>
        <div className="pulse-detail__identity">
          <span>{shelf.isGroup ? "GROUP PULSE" : "CHARACTER PULSE"}</span>
          <h1>{shelf.name}</h1>
          <p>{shelf.stories.length ? `${shelf.stories.length} saved ${shelf.stories.length === 1 ? "story" : "stories"} · latest ${relativeTime(shelf.latestAt).toLowerCase()}` : "No stories yet · a clean beginning"}</p>
        </div>
      </header>

      <div className="pulse-detail__sections">
        {priorityStory ? (
          <PulseContinueCard story={priorityStory} onContinue={() => onContinue(priorityStory)}/>
        ) : (
          <PulseEmptyCharacter shelf={shelf} onStart={() => character && onNewStory?.(character)}/>
        )}

        <div className="pulse-detail__actions" aria-label={`Quick actions for ${shelf.name}`}>
          {priorityStory ? (
            <button className="pulse-quick-action pulse-quick-action--primary" type="button" onClick={() => onContinue(priorityStory)}>
              <CirclePlay size={17}/><span>Continue</span>
            </button>
          ) : null}
          {!shelf.isGroup && character ? (
            <button className="pulse-quick-action" type="button" onClick={() => onNewStory?.(character)}>
              <Plus size={17}/><span>New Story</span>
            </button>
          ) : null}
          {!shelf.isGroup && character ? (
            <button className="pulse-quick-action" type="button" onClick={() => onOpenMemories?.(character.id)}>
              <BookHeart size={17}/><span>Memories</span>
            </button>
          ) : null}
          {!shelf.isGroup && character ? (
            <button className="pulse-quick-action" type="button" onClick={() => onOpenProfile?.(character)}>
              <UserRound size={17}/><span>Profile</span>
            </button>
          ) : null}
          {shelf.isGroup ? (
            <button className="pulse-quick-action" type="button" onClick={onBrowseStories}>
              <BookOpenText size={17}/><span>All Stories</span>
            </button>
          ) : null}
        </div>

        {sections.map((section) => (
          <section className="pulse-moment-section" key={section.id} aria-labelledby={`pulse-${section.id}`}>
            <header>
              <span>{section.eyebrow}</span>
              <h2 id={`pulse-${section.id}`}>{section.title}</h2>
              <p>{section.description}</p>
            </header>
            <div className="pulse-moment-list">
              {section.stories.map((story) => (
                <PulseMomentRow key={story.id} story={story} onContinue={() => onContinue(story)}/>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PulseContinueCard({ story, onContinue }) {
  const location = clean(story.scene.location);
  const sceneTime = clean(story.scene.time_label || story.scene.time);

  return (
    <section className="pulse-continue" aria-labelledby="pulse-continue-title">
      <div className="pulse-continue__eyebrow"><Sparkles size={14}/> CONTINUE NOW</div>
      <div className="pulse-continue__body">
        <div className="pulse-continue__copy">
          <small>{storyTitle(story)}</small>
          <h2 id="pulse-continue-title">{getMomentText(story)}</h2>
          <p>
            {location ? <><MapPin size={13}/><span>{location}</span></> : sceneTime ? <><Clock3 size={13}/><span>{sceneTime}</span></> : <><MessageCircleMore size={13}/><span>Last scene saved</span></>}
            {location && sceneTime ? <><i aria-hidden="true">·</i><span>{sceneTime}</span></> : null}
            <i aria-hidden="true">·</i><span>{relativeTime(story.updated_at)}</span>
          </p>
        </div>
        <button type="button" onClick={onContinue}>Continue <ArrowRight size={17}/></button>
      </div>
    </section>
  );
}

function PulseEmptyCharacter({ shelf, onStart }) {
  return (
    <section className="pulse-empty-character">
      <span><Sparkles size={22}/></span>
      <div><small>FIRST CHAPTER</small><h2>Nothing has happened yet.</h2><p>Start a story with {shelf.name} and Pulse will keep every return point here.</p></div>
      <button type="button" onClick={onStart}>Start first story <ArrowRight size={16}/></button>
    </section>
  );
}

function PulseMomentRow({ story, onContinue }) {
  const location = clean(story.scene.location);
  const sceneTime = clean(story.scene.time_label || story.scene.time);

  return (
    <button className="pulse-moment-row" type="button" onClick={onContinue}>
      <span className="pulse-moment-row__copy">
        <small>{story.openThreads.length ? "UNFINISHED" : relativeTime(story.updated_at).toUpperCase()}</small>
        <strong>{getMomentText(story)}</strong>
        <span className="pulse-moment-row__meta">
          {location ? <><MapPin size={13}/><span>{location}</span></> : sceneTime ? <><Clock3 size={13}/><span>{sceneTime}</span></> : <><MessageCircleMore size={13}/><span>Last moment saved</span></>}
          {location && sceneTime ? <><i aria-hidden="true">·</i><span>{sceneTime}</span></> : null}
          <i aria-hidden="true">·</i><span>{relativeTime(story.updated_at)}</span>
        </span>
      </span>
      <ArrowRight className="pulse-moment-row__arrow" size={18}/>
    </button>
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

function buildShelves(stories, characters = []) {
  const map = new Map();

  stories.forEach((story) => {
    const key = getShelfKey(story);
    if (!map.has(key)) {
      map.set(key, {
        key,
        isGroup: Boolean(story.group_mode),
        name: story.group_mode ? story.displayName : (story.character?.name || story.displayName),
        initials: story.initials,
        portraits: story.portraits,
        stories: [],
        latestAt: story.updated_at,
        character: story.group_mode ? null : story.character,
      });
    }

    const shelf = map.get(key);
    shelf.stories.push(story);
    if (toTime(story.updated_at) > toTime(shelf.latestAt)) shelf.latestAt = story.updated_at;
    shelf.portraits = unique([...shelf.portraits, ...story.portraits]);
  });

  characters.forEach((character) => {
    const key = `character:${character.id}`;
    if (map.has(key)) return;
    map.set(key, {
      key,
      isGroup: false,
      name: character.name || "Unnamed character",
      initials: character.initials || initialsFor(character.name),
      portraits: unique([character.coverUrl, character.imageUrl]),
      stories: [],
      latestAt: null,
      character,
    });
  });

  return Array.from(map.values())
    .map((shelf) => {
      const sortedStories = [...shelf.stories].sort(sortNewest);
      return {
        ...shelf,
        stories: sortedStories,
        priorityStory: pickPriorityStory(sortedStories),
        unfinishedCount: sortedStories.filter((story) => story.openThreads.length).length,
      };
    })
    .sort((a, b) => {
      const timeDifference = toTime(b.latestAt) - toTime(a.latestAt);
      return timeDifference || a.name.localeCompare(b.name);
    });
}

function pickPriorityStory(stories) {
  return stories.find((story) => story.openThreads.length) || stories[0] || null;
}

function shelfNudge(shelf) {
  const latest = shelf?.stories?.[0];
  if (!latest) return `Begin a new story with ${shelf?.name || "this character"}.`;
  const name = shelf.isGroup ? shelf.name : (shelf.name || "This character");
  if (latest.openThreads?.length) return `You left something unfinished with ${name}.`;
  const age = Date.now() - toTime(latest.updated_at);
  const day = 24 * 60 * 60 * 1000;
  if (age > 5 * day) return `${name} hasn't seen you in ${Math.max(1, Math.floor(age / day))} days.`;
  if (age > day) return `${name}'s story has been quiet since ${relativeTime(latest.updated_at).toLowerCase()}.`;
  return getMomentText(latest);
}

function getShelfKey(story) {
  if (!story.group_mode) return `character:${story.character?.id || story.character_id || story.displayName}`;
  // A Group Story is its own shelf. Two different stories can use the same cast
  // without being collapsed into one character bucket.
  return `group:${story.id}`;
}

function categorizeStories(stories) {
  const now = Date.now();
  const unfinished = [];
  const recent = [];
  const waiting = [];

  stories.forEach((story) => {
    if (story.openThreads.length) unfinished.push(story);
    else if (now - toTime(story.updated_at) <= RECENT_WINDOW_MS) recent.push(story);
    else waiting.push(story);
  });

  return [
    { id: "unfinished", eyebrow: "OPEN THREADS", title: "Unfinished", description: "Moments that still have something hanging in the air.", stories: unfinished },
    { id: "recent", eyebrow: "RECENTLY LIVED", title: "Recent", description: "The scenes you were in most recently.", stories: recent },
    { id: "waiting", eyebrow: "STILL HERE", title: "Waiting for you", description: "Older moments kept safe until you want them again.", stories: waiting },
  ].filter((section) => section.stories.length > 0);
}

function shapeStory(conversation, character, groupCharacters) {
  const groupNames = groupCharacters.map((item) => item.name).filter(Boolean);
  const displayName = conversation.group_mode
    ? (clean(conversation.group_title) || groupNames.join(" · ") || clean(conversation.title) || "Group story")
    : (character?.name || clean(conversation.title) || "Saved story");
  const openThreads = normalizeThreads(conversation.unresolved_threads);
  const recap = clean(conversation.story_recap || conversation.summary)
    || (openThreads[0] ? `An unfinished moment is waiting: ${openThreads[0]}` : "Your story is ready where you left it.");
  const portraitSources = unique([
    conversation.cover_url,
    ...(conversation.group_mode ? groupCharacters.flatMap((item) => [item.coverUrl, item.imageUrl]) : []),
    character?.coverUrl,
    character?.imageUrl,
  ].filter(Boolean));

  return {
    ...conversation,
    character,
    groupCharacters,
    displayName,
    openThreads,
    recap: truncate(recap, 260),
    portraits: portraitSources,
    initials: character?.initials || initialsFor(displayName),
    scene: conversation.scene_state || {},
  };
}

function getMomentText(story) {
  if (story.openThreads[0]) return truncate(story.openThreads[0], 155);
  return story.recap || "The last scene is waiting for you.";
}

function storyTitle(story) {
  return clean(story.title) || clean(story.group_title) || clean(story.displayName) || "Saved story";
}

function storyCountLabel(count) {
  if (!count) return "NO STORIES YET";
  return `${count} ${count === 1 ? "STORY" : "STORIES"}`;
}

function normalizeThreads(value) {
  if (!Array.isArray(value)) return [];
  return value.map((thread) => {
    if (typeof thread === "string") return clean(thread);
    if (!thread || typeof thread !== "object") return "";
    return clean(thread.title || thread.label || thread.summary || thread.detail || thread.text || "");
  }).filter(Boolean);
}

function relativeTime(value) {
  const timestamp = toTime(value);
  if (!timestamp) return "Saved earlier";
  const difference = Date.now() - timestamp;
  if (difference < 60_000) return "Just now";
  if (difference < 3_600_000) return `${Math.max(1, Math.floor(difference / 60_000))} min ago`;
  if (difference < 86_400_000) {
    const hours = Math.max(1, Math.floor(difference / 3_600_000));
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (difference < 172_800_000) return "Yesterday";
  if (difference < 604_800_000) return `${Math.floor(difference / 86_400_000)} days ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function clean(value = "") {
  if (value == null) return "";

  const normalized = String(value)
    .replace(/\*+/g, "")
    .replaceAll("[", "")
    .replaceAll("]", "")
    .replace(/\s+/g, " ")
    .trim();

  return /^(?:null|undefined)$/i.test(normalized) ? "" : normalized;
}

function truncate(value = "", max = 140) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function initialsFor(value = "VS") {
  const words = clean(value).split(" ").filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]).join("").toUpperCase() || "VS";
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sortNewest(a, b) {
  return toTime(b.updated_at) - toTime(a.updated_at);
}

function toTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export default Pulse;
