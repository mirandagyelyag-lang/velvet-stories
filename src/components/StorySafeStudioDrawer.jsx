import {
  Bookmark, BookOpen, Brain, Camera, CheckCircle2, Clock3, Eye, Film, Heart,
  Image as ImageIcon, MapPin, MessageCircle, Search, ShieldCheck, Sparkles,
  Star, UsersRound, WandSparkles, X
} from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { VELVET_RELEASE, VELVET_VERSION } from "../config/version";

function text(value) { return String(value || "").trim(); }
function asList(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function titleCase(value) { return text(value).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function clip(value, max = 150) { const s = text(value); return s.length > max ? `${s.slice(0, max - 1)}…` : s; }

function inferConfidence(item = {}) {
  const status = text(item.status).toLowerCase();
  if (status === "known" || status === "certain") return "Certain";
  if (status === "suspected" || status === "likely") return "Likely";
  if (status.includes("rumor")) return "Rumor";
  if (status === "forgotten" || status === "fading") return "Fading";
  return "Unrated";
}

export default function StorySafeStudioDrawer({
  open,
  onClose,
  character,
  conversation,
  messages = [],
  sceneImages = [],
  onJumpToMessage,
  onOpenMemoryBook,
  onOpenTimeline,
}) {
  const [query, setQuery] = useState("");
  const [debugOpen, setDebugOpen] = useState(false);
  const [appearance, setAppearance] = useState(() => {
    try { return localStorage.getItem(`velvet_character_tint_${character?.id}`) || "balanced"; }
    catch { return "balanced"; }
  });

  const intel = conversation?.intelligenceState || {};
  const mind = intel.character_mind || {};
  const presence = intel.presence_engine_state || {};
  const scene = conversation?.sceneState || {};
  const sceneMemory = intel.scene_memory || {};
  const timeline = asList(conversation?.storyTimeline);
  const chapters = asList(conversation?.storyChapters);
  const unfinished = asList(intel.unfinished_business).length ? asList(intel.unfinished_business) : asList(conversation?.unfinishedThreads);
  const knowledge = asList(intel.knowledge);
  const chemistry = intel.chemistry_fingerprint || presence.chemistry_fingerprint || {};
  const journal = intel.private_character_journal || presence.private_character_journal || {};
  const relationship = conversation?.relationshipState || {};
  const cast = conversation?.castState || {};

  const searchable = useMemo(() => messages.filter((m) => !m?.isStreaming && text(m?.content)), [messages]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchable.filter((m) => text(m.content).toLowerCase().includes(q)).slice(-30).reverse();
  }, [query, searchable]);
  const bookmarks = useMemo(() => searchable.filter((m) => m.isBookmarked).slice(-20).reverse(), [searchable]);
  const relationshipMoments = useMemo(() => timeline.filter((x) => typeof x === "object" && x?.kind === "relationship").slice(-8), [timeline]);
  const gallery = useMemo(() => [...new Set([character?.coverUrl, character?.imageUrl, ...sceneImages].filter(Boolean))].slice(0, 12), [character, sceneImages]);
  const castRows = useMemo(() => Object.entries(cast).slice(0, 10), [cast]);

  if (!open) return null;

  const location = text(scene.location || sceneMemory.location) || "Location not established";
  const time = text(scene.time_label || scene.time || intel.temporal_anchor?.story_now) || "Time not established";
  const activity = text(scene.activity || sceneMemory.activity || presence.presence_action);
  const mood = text(mind.current_emotion || presence.emotional_residue?.emotion || presence.bad_day_state?.mood);
  const energy = text(mind.energy);
  const recap = text(conversation?.storyRecap || conversation?.summary);
  const lastBeat = recap || clip([...searchable].reverse().find((m) => m.sender === "character")?.content, 220);

  function setTint(value) {
    setAppearance(value);
    try { localStorage.setItem(`velvet_character_tint_${character?.id}`, value); } catch {}
    window.dispatchEvent(new CustomEvent("velvet:character-tint", { detail: { characterId: character?.id, value } }));
  }

  return createPortal((
    <div className="safe-studio-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <aside className="safe-studio" role="dialog" aria-modal="true" aria-label="Story Safe Studio">
        <div className="safe-studio__grab" />
        <header className="safe-studio__header">
          <div><small>SAFE STUDIO · v{VELVET_VERSION}</small><h2>Story cockpit</h2><p>High-impact tools that read the story without touching Velvet's generation parser.</p></div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={19}/></button>
        </header>

        <div className="safe-studio__scroll">
          <section className="safe-studio__scene">
            <div><span><MapPin size={13}/>{location}</span><span><Clock3 size={13}/>{time}</span></div>
            {activity && <strong>{activity}</strong>}
            <p>{lastBeat || "Velvet will build a compact catch-up as the story grows."}</p>
          </section>

          <div className="safe-studio__quick-grid">
            <button onClick={onOpenMemoryBook}><Brain size={17}/><span>Memory Book<small>Pins · canon · confidence</small></span></button>
            <button onClick={onOpenTimeline}><BookOpen size={17}/><span>Timeline<small>Chapters · transitions</small></span></button>
            <button onClick={() => setDebugOpen((v) => !v)}><Eye size={17}/><span>Why they acted<small>{debugOpen ? "Hide private lens" : "Private debug lens"}</small></span></button>
            <button onClick={() => document.querySelector('.safe-studio__search input')?.focus()}><Search size={17}/><span>Search chat<small>{searchable.length} messages indexed</small></span></button>
          </div>

          <section className="safe-studio__status">
            <header><Sparkles size={15}/><strong>{character?.name || "Character"} right now</strong></header>
            <div className="safe-studio__chips">
              {mood && <span>Mood · {titleCase(mood)}</span>}
              {energy && <span>Energy · {titleCase(energy)}</span>}
              {presence.conversation_mode && <span>Conversation · {titleCase(presence.conversation_mode)}</span>}
              {presence.flirt_mode && <span>Flirt · {titleCase(presence.flirt_mode)}</span>}
              {presence.jealousy_mode && presence.jealousy_mode !== "none" && <span>Jealousy · {titleCase(presence.jealousy_mode)}</span>}
              {presence.narrative_camera && <span>Camera · {titleCase(presence.narrative_camera)}</span>}
            </div>
          </section>

          {debugOpen && <section className="safe-studio__debug">
            <header><Eye size={15}/><strong>Private character lens</strong><small>Never inserted into visible dialogue.</small></header>
            <div>{mind.believe && <p><b>Believes</b>{mind.believe}</p>}{mind.want && <p><b>Wants</b>{mind.want}</p>}{mind.avoid && <p><b>Avoids</b>{mind.avoid}</p>}{mind.private_intention && <p><b>Private intention</b>{mind.private_intention}</p>}{mind.misunderstand && <p><b>May misunderstand</b>{mind.misunderstand}</p>}{journal.current_private_thought && <p><b>Journal</b>{journal.current_private_thought}</p>}</div>
          </section>}

          <section className="safe-studio__relationship-map">
            <header><Heart size={15}/><strong>Relationship map</strong><small>Current subjective web</small></header>
            <div className="safe-studio__map-core"><span>YOU</span><i>↔</i><span>{character?.name || "CHARACTER"}</span></div>
            <p>{text(relationship.summary || relationship.current_dynamic || relationship.stage || mind.relationship_self_view) || "The relationship will label itself only when the story has enough evidence."}</p>
            {castRows.length > 0 && <div className="safe-studio__cast-links">{castRows.map(([name, state]) => <span key={name}><UsersRound size={11}/>{name}<small>{titleCase(state?.relationship || state?.current_status || "in story")}</small></span>)}</div>}
          </section>

          {(Object.keys(chemistry).length > 0 || relationshipMoments.length > 0) && <section className="safe-studio__chemistry">
            <header><WandSparkles size={15}/><strong>Chemistry fingerprint</strong></header>
            <div className="safe-studio__chips">{Object.entries(chemistry).slice(0, 7).filter(([,v]) => text(v)).map(([k,v]) => <span key={k}>{titleCase(k)} · {clip(v, 64)}</span>)}</div>
            {relationshipMoments.length > 0 && <div className="safe-studio__milestones">{relationshipMoments.map((item, i) => <button key={`${item?.message_id || i}`} onClick={() => item?.message_id && onJumpToMessage?.(item.message_id)}><Star size={12}/><span>{item?.label || "Relationship shift"}</span></button>)}</div>}
          </section>}

          {unfinished.length > 0 && <section className="safe-studio__unfinished"><header><CheckCircle2 size={15}/><strong>Unfinished business</strong><span>{unfinished.length}</span></header><ul>{unfinished.slice(-8).map((item,i)=><li key={i}>{typeof item === "string" ? item : item?.title || item?.label || item?.detail}</li>)}</ul></section>}

          {knowledge.length > 0 && <section className="safe-studio__knowledge"><header><ShieldCheck size={15}/><strong>Memory confidence</strong></header>{knowledge.slice(-8).reverse().map((item,i)=><div key={i}><span><b>{item?.who || character?.name}</b>{item?.knows || item?.detail || item?.content}</span><em>{inferConfidence(item)}</em></div>)}</section>}

          <section className="safe-studio__search">
            <header><Search size={15}/><strong>Search this conversation</strong></header>
            <label><Search size={14}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="A line, place, promise, name…"/></label>
            {query && <div className="safe-studio__results">{results.length ? results.map((m)=><button key={m.id} onClick={()=>onJumpToMessage?.(m.id)}><small>{m.sender === "user" ? "YOU" : character?.name}</small><span>{clip(m.content, 130)}</span></button>) : <p>No matches.</p>}</div>}
          </section>

          {bookmarks.length > 0 && <section className="safe-studio__bookmarks"><header><Bookmark size={15}/><strong>Favorite replies & saved moments</strong><span>{bookmarks.length}</span></header>{bookmarks.slice(0,6).map((m)=><button key={m.id} onClick={()=>onJumpToMessage?.(m.id)}><Star size={12}/><span>{clip(m.content, 115)}</span></button>)}</section>}

          {chapters.length > 0 && <section className="safe-studio__chapters"><header><Film size={15}/><strong>Conversation chapters</strong></header><div>{chapters.slice(-8).map((c,i)=><article key={i}><small>CHAPTER {c.number || i+1}</small><strong>{c.title || "Story chapter"}</strong>{c.summary && <p>{clip(c.summary,150)}</p>}</article>)}</div></section>}

          {gallery.length > 0 && <section className="safe-studio__gallery"><header><ImageIcon size={15}/><strong>Character media gallery</strong></header><div>{gallery.map((src,i)=><img key={`${src}-${i}`} src={src} alt="" loading="lazy"/>)}</div></section>}

          <section className="safe-studio__appearance"><header><Camera size={15}/><strong>Character chat presence</strong></header><p>A tiny visual tint only. It never changes character behavior.</p><div>{["quiet","balanced","cinematic"].map((v)=><button key={v} className={appearance===v?"is-active":""} onClick={()=>setTint(v)}>{titleCase(v)}</button>)}</div></section>

          <section className="safe-studio__version"><header><ShieldCheck size={15}/><strong>Version Safety Net</strong></header><div><span>Installed</span><b>v{VELVET_VERSION}</b></div><div><span>Release</span><b>{VELVET_RELEASE}</b></div><div><span>Origin</span><b>{window.location.hostname}</b></div><p>Rollback support is included in the project as <code>ROLLBACK-PWA-STABLE.sh</code>. It validates a deployment before moving the stable phone alias.</p></section>
        </div>
      </aside>
    </div>
  ), document.body);
}
