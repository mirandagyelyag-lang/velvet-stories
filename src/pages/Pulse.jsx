import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock3,
  Flame,
  HeartCrack,
  LoaderCircle,
  MapPin,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import "../styles/pulse.css";

const ACTIVE_PLAN = new Set(["proposed", "accepted", "active"]);
const ACTIVE_CONFLICT = new Set(["brewing", "active", "cooling", "repairing"]);
const ACTIVE_ARC = new Set(["planned", "active", "paused"]);
const ACTIVE_CONSEQUENCE = new Set(["pending", "active"]);
const ACTIVE_EVENT = new Set(["upcoming", "active"]);

function Pulse({ onOpenCharacter, onBrowseStories }) {
  const { user } = useAuth();
  const { characters } = useCharacters();
  const { theme } = useTheme();
  const [stories, setStories] = useState([]);
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
      if (!user?.id) return;
      setLoading(true);
      setError("");

      const conversationsResult = await supabase
        .from("conversations")
        .select("id, character_id, title, updated_at, archived_at, trashed_at, group_mode, group_character_ids, group_title, scene_state, story_recap, unresolved_threads")
        .is("trashed_at", null)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(60);

      if (!alive) return;
      if (conversationsResult.error) {
        setError("Pulse couldn't read your stories right now.");
        setLoading(false);
        return;
      }

      const conversations = conversationsResult.data || [];
      const ids = conversations.map((conversation) => conversation.id);
      if (!ids.length) {
        setStories([]);
        setLoading(false);
        return;
      }

      const [arcsResult, plansResult, conflictsResult, consequencesResult, eventsResult, castResult] = await Promise.all([
        supabase.from("story_arcs").select("conversation_id, title, summary, kind, status, progress, stakes, next_pressure, participants, updated_at").in("conversation_id", ids).order("updated_at", { ascending: false }),
        supabase.from("story_plans").select("conversation_id, title, initiator, details, story_time, participants, status, complication, updated_at").in("conversation_id", ids).order("updated_at", { ascending: false }),
        supabase.from("story_conflicts").select("conversation_id, title, cause, intensity, status, resolution_need, participants, updated_at").in("conversation_id", ids).order("updated_at", { ascending: false }),
        supabase.from("story_consequences").select("conversation_id, title, cause, effect, status, weight, participants, updated_at").in("conversation_id", ids).order("updated_at", { ascending: false }),
        supabase.from("story_calendar_events").select("conversation_id, title, story_time, details, participants, status, updated_at").in("conversation_id", ids).order("updated_at", { ascending: false }),
        supabase.from("story_cast_members").select("conversation_id, name, role, current_dynamic, goals, presence, status, updated_at").in("conversation_id", ids).order("updated_at", { ascending: false }),
      ]);

      if (!alive) return;
      const grouped = {
        arcs: groupByConversation(arcsResult.data),
        plans: groupByConversation(plansResult.data),
        conflicts: groupByConversation(conflictsResult.data),
        consequences: groupByConversation(consequencesResult.data),
        events: groupByConversation(eventsResult.data),
        cast: groupByConversation(castResult.data),
      };

      const nextStories = conversations.map((conversation) => {
        const character = characters.find((item) => item.id === conversation.character_id);
        const groupCharacters = conversation.group_mode
          ? (conversation.group_character_ids || []).map((id) => characters.find((item) => item.id === id)).filter(Boolean)
          : [];
        return {
          ...conversation,
          character,
          groupCharacters,
          arcs: (grouped.arcs.get(conversation.id) || []).filter((item) => ACTIVE_ARC.has(item.status)),
          plans: (grouped.plans.get(conversation.id) || []).filter((item) => ACTIVE_PLAN.has(item.status)),
          conflicts: (grouped.conflicts.get(conversation.id) || []).filter((item) => ACTIVE_CONFLICT.has(item.status)),
          consequences: (grouped.consequences.get(conversation.id) || []).filter((item) => ACTIVE_CONSEQUENCE.has(item.status)),
          events: (grouped.events.get(conversation.id) || []).filter((item) => ACTIVE_EVENT.has(item.status)),
          cast: (grouped.cast.get(conversation.id) || []).filter((item) => item.status === "active"),
        };
      }).filter((story) => story.character);

      setStories(nextStories);
      setLoading(false);
    }

    loadPulse();
    return () => { alive = false; };
  }, [user?.id, characters]);

  const sections = useMemo(() => {
    const needsAttention = [];
    const comingUp = [];
    const continueStories = [];
    for (const story of stories) {
      if (story.conflicts.length || story.consequences.length) needsAttention.push(story);
      else if (story.plans.length || story.events.length) comingUp.push(story);
      else continueStories.push(story);
    }
    return [
      { id: "attention", icon: HeartCrack, title: "Needs attention", note: "Something unresolved is still changing this story.", stories: needsAttention },
      { id: "coming", icon: CalendarDays, title: "Coming up", note: "Plans and moments that are already waiting.", stories: comingUp },
      { id: "continue", icon: Clock3, title: "Continue", note: "Pick up naturally from where you left off.", stories: continueStories },
    ];
  }, [stories]);

  return (
    <section className="chats-page chats-page--reference pulse-page">
      <header className="pulse-hero">
        <div className="pulse-hero__eyebrow"><Activity size={17}/><span>WHAT IS STILL ALIVE</span></div>
        <div className="pulse-hero__title" aria-label="Your Pulse">
          <span>your</span><h1>PULSE</h1><i>✦</i>
        </div>
        <p>Choose a moment. Velvet will take you straight back into it.</p>
      </header>

      {error ? <div className="pulse-state pulse-state--error"><HeartCrack size={26}/><p>{error}</p></div> : null}
      {loading ? (
        <div className="pulse-state"><LoaderCircle className="spin" size={28}/><p>Listening to your stories…</p></div>
      ) : stories.length ? (
        <div className="pulse-sections">
          {sections.map((section) => section.stories.length ? <PulseSection key={section.id} section={section} onOpenCharacter={onOpenCharacter}/> : null)}
        </div>
      ) : (
        <div className="pulse-state pulse-state--empty">
          <Activity size={30}/>
          <h2>Your worlds are quiet—for now</h2>
          <p>Continue a story and its meaningful moments will appear here automatically.</p>
          <button type="button" onClick={onBrowseStories}>Browse Stories <ArrowRight size={16}/></button>
        </div>
      )}
    </section>
  );
}

function PulseSection({ section, onOpenCharacter }) {
  const SectionIcon = section.icon;
  return (
    <section className={`pulse-section pulse-section--${section.id}`}>
      <header className="pulse-section__heading">
        <span><SectionIcon size={17}/></span>
        <div><h2>{section.title}</h2><p>{section.note}</p></div>
      </header>
      <div className="pulse-feed">
        {section.stories.map((story) => <PulseStory key={story.id} story={story} onContinue={() => onOpenCharacter(story.character, story.id)} />)}
      </div>
    </section>
  );
}

function PulseStory({ story, onContinue }) {
  const scene = story.scene_state || {};
  const lead = pickLeadSignal(story);
  const LeadIcon = lead.icon;
  const displayName = story.group_mode
    ? (story.group_title || story.title || story.groupCharacters.map((item) => item.name).join(" · "))
    : story.character.name;
  const art = story.character.imageUrl || story.character.coverUrl;
  const people = uniqueNames([
    ...(Array.isArray(scene.present) ? scene.present : []),
    ...story.cast.filter((member) => member.presence === "present").map((member) => member.name),
  ]).slice(0, 3);

  return (
    <article className={`pulse-story pulse-story--${lead.kind}`}>
      <button className="pulse-story__main" type="button" onClick={onContinue} aria-label={`Continue ${displayName}`}>
        <span className="pulse-story__portrait">{art ? <img src={art} alt="" loading="lazy" decoding="async"/> : story.character.initials}</span>
        <span className="pulse-story__body">
          <span className="pulse-story__topline"><strong>{displayName}</strong><time>{formatRelativeDate(story.updated_at)}</time></span>
          <span className="pulse-story__scene">
            {scene.location ? <><MapPin size={13}/>{scene.location}</> : <><Clock3 size={13}/>Story in progress</>}
            {scene.time_label ? <small>{scene.time_label}</small> : null}
          </span>
          <span className={`pulse-story__lead pulse-story__lead--${lead.kind}`}><LeadIcon size={15}/><span><b>{lead.label}</b>{truncate(clean(lead.title), 95)}</span></span>
          {lead.detail ? <span className="pulse-story__detail">{truncate(clean(lead.detail), 120)}</span> : null}
          {people.length > 1 ? <span className="pulse-story__people"><UsersRound size={13}/>With {people.filter((name) => name !== story.character.name).join(" · ") || people.join(" · ")}</span> : null}
        </span>
        <span className="pulse-story__continue"><span>Continue</span><ArrowRight size={18}/></span>
      </button>
    </article>
  );
}

function pickLeadSignal(story) {
  const conflict = story.conflicts[0];
  if (conflict) return { kind: "tension", icon: HeartCrack, label: conflict.status === "repairing" ? "Repair in progress" : "Unresolved tension", title: conflict.title, detail: conflict.resolution_need || conflict.cause };
  const consequence = story.consequences[0];
  if (consequence) return { kind: "consequence", icon: Flame, label: "Still affecting the story", title: consequence.title, detail: consequence.effect || consequence.cause };
  const event = story.events[0];
  if (event) return { kind: "upcoming", icon: CalendarDays, label: event.status === "active" ? "Happening now" : (event.story_time || "Upcoming"), title: event.title, detail: event.details };
  const plan = story.plans[0];
  if (plan) return { kind: "plan", icon: Sparkles, label: plan.status === "proposed" ? "Waiting on a choice" : "Plan in motion", title: plan.title, detail: plan.complication || plan.details };
  const arc = story.arcs[0];
  if (arc) return { kind: "arc", icon: Activity, label: arc.kind || "Active arc", title: arc.title, detail: arc.next_pressure || arc.stakes || arc.summary };
  const thread = Array.isArray(story.unresolved_threads) ? story.unresolved_threads[0] : null;
  if (thread) return { kind: "thread", icon: Activity, label: "Unfinished", title: typeof thread === "string" ? thread : (thread.title || thread.label || "An unfinished moment"), detail: typeof thread === "object" ? (thread.detail || thread.summary || "") : "" };
  return { kind: "quiet", icon: Clock3, label: "Current story", title: story.story_recap || "Ready to continue", detail: "" };
}

function groupByConversation(rows = []) {
  const grouped = new Map();
  for (const row of rows || []) {
    const items = grouped.get(row.conversation_id) || [];
    items.push(row);
    grouped.set(row.conversation_id, items);
  }
  return grouped;
}

function uniqueNames(names) {
  return [...new Set(names.map((name) => String(name || "").trim()).filter(Boolean))];
}

function clean(value = "") {
  return String(value).replaceAll("*", "").replaceAll("[", "").replaceAll("]", "").replace(/\s+/g, " ").trim();
}

function truncate(value = "", max = 140) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function formatRelativeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default Pulse;
