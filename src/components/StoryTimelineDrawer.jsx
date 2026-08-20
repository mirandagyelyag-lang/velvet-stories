import { BookOpen, Box, CheckCircle2, Clock3, Eye, HelpCircle, MapPin, RefreshCw, Sparkles, UsersRound, X } from "lucide-react";

const KIND_LABELS = {
  relationship: "Relationship",
  conflict: "Conflict",
  promise: "Promise",
  reveal: "Reveal",
  decision: "Decision",
  scene: "Scene",
  other: "Story beat",
};

export default function StoryTimelineDrawer({ open, onClose, conversation, onRefresh, refreshing = false, onJumpToMessage }) {
  if (!open) return null;
  const scene = conversation?.sceneState || {};
  const intelligence = conversation?.intelligenceState || {};
  const timeline = Array.isArray(conversation?.storyTimeline) ? conversation.storyTimeline : [];
  const chapters = Array.isArray(conversation?.storyChapters) ? conversation.storyChapters : [];
  const activeChapter = conversation?.activeChapter || {};
  const present = Array.isArray(scene.present) ? scene.present : [];
  const absent = Array.isArray(scene.absent) ? scene.absent : [];
  const objects = Array.isArray(intelligence.objects) ? intelligence.objects : [];
  const commitments = Array.isArray(intelligence.commitments) ? intelligence.commitments : [];
  const knowledge = Array.isArray(intelligence.knowledge) ? intelligence.knowledge : [];
  const recap = conversation?.storyRecap || conversation?.summary || "";

  return (
    <div className="timeline-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="timeline-drawer timeline-drawer--v250" role="dialog" aria-modal="true" aria-labelledby="story-timeline-title">
        <header>
          <div><small>STORY INTELLIGENCE</small><h2 id="story-timeline-title">Timeline & chapters</h2></div>
          <button type="button" onClick={onClose} aria-label="Close timeline"><X size={20}/></button>
        </header>

        {recap && <section className="timeline-recap"><span><BookOpen size={15}/> 20-second recap</span><p>{recap}</p></section>}

        <section className="timeline-scene-card">
          <div className="timeline-scene-card__heading"><Sparkles size={17}/><strong>Right now</strong></div>
          <div className="timeline-scene-grid">
            <span><MapPin size={15}/><b>Location</b><em>{scene.location || "Not established"}</em></span>
            <span><Clock3 size={15}/><b>Time</b><em>{scene.time_label || scene.time || "Not established"}</em></span>
            <span><UsersRound size={15}/><b>Present</b><em>{present.length ? present.join(", ") : "Not established"}</em></span>
          </div>
          {intelligence.stakes && <p><strong>Current pressure:</strong> {intelligence.stakes}</p>}
          {absent.length > 0 && <small>Off-screen: {absent.join(", ")}</small>}
        </section>

        {(chapters.length > 0 || activeChapter?.title) && <section className="timeline-chapters-v250">
          <div className="timeline-events__title"><strong>Chapters</strong><span>{chapters.length + (activeChapter?.title ? 1 : 0)}</span></div>
          <div className="timeline-chapters-v250__rail">
            {chapters.map((chapter)=><article key={`${chapter.number}-${chapter.title}`}><small>CHAPTER {chapter.number}</small><strong>{chapter.title}</strong>{chapter.summary && <p>{chapter.summary}</p>}</article>)}
            {activeChapter?.title && <article className="is-active"><small>CHAPTER {activeChapter.number || chapters.length + 1} · NOW</small><strong>{activeChapter.title}</strong>{activeChapter.summary && <p>{activeChapter.summary}</p>}</article>}
          </div>
        </section>}

        {(objects.length > 0 || commitments.length > 0 || knowledge.length > 0) && <section className="timeline-intelligence timeline-intelligence--v250">
          {objects.length > 0 && <div><span><Box size={14}/> Established objects</span><p>{objects.slice(0, 8).join(" · ")}</p></div>}
          {commitments.length > 0 && <div><span><CheckCircle2 size={14}/> Still unresolved</span><ul>{commitments.slice(0, 6).map((item, index)=><li key={`${item}-${index}`}>{typeof item === "string" ? item : item?.title || item?.detail}</li>)}</ul></div>}
          {knowledge.length > 0 && <div className="timeline-awareness"><span><Eye size={14}/> Who knows what</span><ul>{knowledge.slice(-10).map((item, index)=><li key={`${item?.who}-${index}`}><strong>{item?.who || "Someone"}:</strong> {item?.knows}<small className={`knowledge-status knowledge-status--${item?.status || "known"}`}>{knowledgeStatus(item)}{item?.source ? ` · ${item.source}` : ""}</small></li>)}</ul><p className="timeline-awareness__note"><HelpCircle size={13}/> Suspicions and rumors stay separate from confirmed knowledge.</p></div>}
        </section>}

        <section className="timeline-events">
          <div className="timeline-events__title"><strong>Major story beats</strong><span>{timeline.length}</span></div>
          {timeline.length ? (
            <ol>{timeline.map((item, index) => {
              const label = typeof item === "string" ? item : item?.label || item?.separator_label || item?.note || "Story beat";
              const detail = typeof item === "string" ? "" : item?.detail || item?.note || "";
              const kind = typeof item === "string" ? "other" : item?.kind || (item?.scene_changed ? "scene" : "other");
              const clickable = Boolean(item?.message_id && onJumpToMessage);
              return <li key={`${item?.message_id || label}-${index}`} className={`timeline-event timeline-event--${kind}`}>
                <button type="button" disabled={!clickable} onClick={() => clickable && onJumpToMessage(item.message_id)}>
                  <span className="timeline-event__number">{index + 1}</span>
                  <div><small>{item?.chapter_number ? `Chapter ${item.chapter_number} · ` : ""}{KIND_LABELS[kind] || "Story beat"}{item?.importance ? ` · ${item.importance}/5` : ""}</small><strong>{label}</strong>{detail && detail !== label && <p>{detail}</p>}</div>
                </button>
              </li>;
            })}</ol>
          ) : <div className="timeline-empty"><Clock3 size={24}/><p>Important confessions, fights, promises, reveals and scene milestones will appear here automatically.</p></div>}
        </section>

        <footer><button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? <RefreshCw className="spin" size={16}/> : <RefreshCw size={16}/>}Refresh continuity</button></footer>
      </aside>
    </div>
  );
}

function knowledgeStatus(item = {}) {
  const status = String(item.status || "known").toLowerCase();
  if (status === "suspected") return "Suspected";
  if (status === "rumor" || status === "rumoured" || status === "rumored") return "Rumor";
  if (status === "forgotten") return "Faded detail";
  return "Known";
}
