import {
  Activity, BookOpen, Box, CalendarDays, Camera, Check, Clock3, Download, Eye,
  GitBranch, Globe2, Heart, Inbox, LockKeyhole, MapPin, MessageCircle, Package,
  Phone, Plus, ScrollText, ShieldCheck, SlidersHorizontal, Sparkles, Trash2,
  UsersRound, Video, WifiOff, X, Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { VELVET_RELEASE, VELVET_VERSION } from "../config/version";
import { usePWA } from "../context/PWAContext";
import {
  analyzeRecentReplies,
  elapsedLabel,
  patchLivingWorld,
  readLivingWorld,
  touchLivingWorld,
  writeLivingWorld,
} from "../utils/livingWorldSafe";
import { downloadStoryEpub } from "../utils/epubExport";
import { analyzeRepetition, detectCanonConflicts, secretsForCharacter } from "../utils/stabilitySweep";

const TABS = [
  ["life", Clock3, "Life"],
  ["social", UsersRound, "Social"],
  ["continuity", Package, "Continuity"],
  ["director", SlidersHorizontal, "Director"],
  ["modes", GitBranch, "Modes"],
  ["health", Activity, "Health"],
];

const EMPTY_ITEM = {
  inbox: { text: "", from: "", status: "unread" },
  commitments: { title: "", when: "", status: "open" },
  secrets: { subject: "", knownBy: "", status: "active" },
  rumors: { text: "", source: "", status: "active" },
  objects: { name: "", owner: "", status: "" },
  places: { name: "", note: "", status: "active" },
  privateNotes: { text: "", status: "active" },
  canonLocks: { text: "", status: "active" },
};

function clamp(n, a = 0, b = 100) { return Math.max(a, Math.min(b, Number(n) || 0)); }
function text(v) { return String(v || "").trim(); }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function titleCase(v) { return text(v).replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()); }

function Slider({ label, value, onChange, low, high }) {
  return <label className="living-world__slider"><span><b>{label}</b><em>{value}</em></span><input type="range" min="0" max="100" value={value} onChange={(e)=>onChange(Number(e.target.value))}/><small><i>{low}</i><i>{high}</i></small></label>;
}

function Toggle({ checked, onChange, title, detail }) {
  return <button type="button" className={`living-world__toggle${checked ? " is-on" : ""}`} onClick={()=>onChange(!checked)}><span><b>{title}</b><small>{detail}</small></span><i aria-hidden="true"><u/></i></button>;
}

function ItemEditor({ kind, items = [], onAdd, onRemove }) {
  const [draft, setDraft] = useState({ ...(EMPTY_ITEM[kind] || {}) });
  const fields = Object.keys(EMPTY_ITEM[kind] || {});
  function add() {
    const meaningful = fields.some((field) => field !== "status" && text(draft[field]));
    if (!meaningful) return;
    onAdd({ ...draft, id: uid(), createdAt: new Date().toISOString() });
    setDraft({ ...(EMPTY_ITEM[kind] || {}) });
  }
  return <div className="living-world__list-editor">
    <div className="living-world__list-draft">
      {fields.filter((field)=>field!=="status").map((field)=><input key={field} value={draft[field] || ""} onChange={(e)=>setDraft((s)=>({...s,[field]:e.target.value}))} placeholder={titleCase(field)}/>) }
      <button type="button" onClick={add}><Plus size={14}/>Add</button>
    </div>
    <div className="living-world__list-items">
      {items.slice(-10).reverse().map((item)=><article key={item.id || JSON.stringify(item)}><span>{fields.filter((f)=>f!=="status" && text(item[f])).map((f)=><span key={f}><b>{titleCase(f)}</b>{item[f]}</span>)}</span><button type="button" onClick={()=>onRemove(item.id)} aria-label="Remove"><Trash2 size={13}/></button></article>)}
      {!items.length && <small className="living-world__empty">Nothing recorded yet.</small>}
    </div>
  </div>;
}

export default function LivingWorldDrawer({
  open,
  onClose,
  character,
  conversation,
  messages = [],
  sceneImages = [],
  offlineQueueSize = 0,
  onOpenWorldStudio,
  onOpenStoryHub,
  onOpenTimeline,
  onOpenDiagnostics,
}) {
  const pwa = usePWA();
  const conversationId = conversation?.conversationId || conversation?.id || character?.id || "unknown";
  const [tab, setTab] = useState("life");
  const [state, setState] = useState(() => readLivingWorld(conversationId));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    const current = readLivingWorld(conversationId);
    setState(touchLivingWorld(conversationId, current));
  }, [open, conversationId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.velvetPerformance = state?.modes?.performance ? "1" : "0";
  }, [state?.modes?.performance]);

  const analysis = useMemo(() => analyzeRecentReplies(messages), [messages]);
  const previousOpen = state?.simulation?.previousOpenedAt;
  const relationship = state.relationship;
  const scene = state.scene;
  const behavior = state.behavior;
  const world = state.world;
  const sweepAnalysis = useMemo(() => analyzeRepetition(messages), [messages]);
  const canonConflicts = useMemo(() => detectCanonConflicts(world.canonLocks, [...world.rumors, ...world.privateNotes]), [world.canonLocks, world.rumors, world.privateNotes]);
  const allowedSecrets = useMemo(() => secretsForCharacter(world.secrets, character?.name || ""), [world.secrets, character?.name]);
  const blockedSecrets = Math.max(0, (world.secrets || []).length - allowedSecrets.length);

  if (!open) return null;

  function patch(section, values) {
    setState((current) => patchLivingWorld(conversationId, current, section, values));
  }
  function patchWorld(values) { patch("world", values); }
  function addItem(kind, item) { patchWorld({ [kind]: [...(world[kind] || []), item] }); }
  function removeItem(kind, id) { patchWorld({ [kind]: (world[kind] || []).filter((item) => item.id !== id) }); }
  function resetLivingWorld() {
    const fresh = readLivingWorld("__velvet_fresh_defaults__");
    const next = writeLivingWorld(conversationId, fresh);
    setState(next);
    setNotice("Living World controls reset. Story messages were not touched.");
  }
  function exportEpub() {
    downloadStoryEpub({ title: conversation?.title || `${character?.name || "Velvet"} Story`, characterName: character?.name || "Character", messages });
    setNotice("EPUB exported locally.");
  }

  const groupLabel = conversation?.groupMode ? "Group story active" : "Single-character story";
  const sceneMediumIcon = scene.medium === "call" ? Phone : scene.medium === "video" ? Video : scene.medium === "text" ? MessageCircle : MapPin;
  const SceneMediumIcon = sceneMediumIcon;

  return createPortal(<div className="living-world-backdrop" onMouseDown={(e)=>e.target===e.currentTarget&&onClose?.()}>
    <aside className="living-world" role="dialog" aria-modal="true" aria-label="Living World">
      <div className="living-world__grab"/>
      <header className="living-world__header"><div><small>VELVET v{VELVET_VERSION} · {VELVET_RELEASE}</small><h2>Living World</h2><p>A persistent story layer built on top of the stable chat core.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={19}/></button></header>
      <nav className="living-world__tabs">{TABS.map(([id,Icon,label])=><button type="button" key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={15}/><span>{label}</span></button>)}</nav>

      <div className="living-world__scroll">
        {tab === "life" && <>
          <section className="living-world__hero"><div><Clock3 size={17}/><span><b>Daily-life continuity</b><small>{elapsedLabel(previousOpen)}</small></span></div><p>Velvet can account for elapsed time without inventing major off-screen canon.</p></section>

          <section><header><CalendarDays size={15}/><strong>Character Routine Engine</strong></header><label>Schedule<textarea rows="3" value={state.routine.schedule} onChange={(e)=>patch("routine",{schedule:e.target.value})} placeholder="Classes Tue/Thu, gym evenings, works Saturdays…"/></label><label>Habits<textarea rows="2" value={state.routine.habits} onChange={(e)=>patch("routine",{habits:e.target.value})} placeholder="Checks his phone late, coffee before class…"/></label></section>

          <section><header><SceneMediumIcon size={15}/><strong>Scene medium</strong></header><div className="living-world__segmented">{[["face_to_face","In person"],["text","Texting"],["call","Call"],["video","Video"]].map(([id,label])=><button type="button" key={id} className={scene.medium===id?"active":""} onClick={()=>patch("scene",{medium:id})}>{label}</button>)}</div></section>

          <section><header><Sparkles size={15}/><strong>Scene physics</strong></header><label>Scene goal<input value={scene.goal} onChange={(e)=>patch("scene",{goal:e.target.value})} placeholder="Let this conversation end awkwardly…"/></label><label>Outfit continuity<input value={scene.outfit} onChange={(e)=>patch("scene",{outfit:e.target.value})} placeholder="Black coat, school uniform, borrowed hoodie…"/></label><Slider label="Intensity" value={scene.intensity} onChange={(v)=>patch("scene",{intensity:v})} low="Calm" high="Chaotic"/></section>

          <section><header><Inbox size={15}/><strong>Character Inbox</strong></header><ItemEditor kind="inbox" items={world.inbox} onAdd={(x)=>addItem("inbox",x)} onRemove={(id)=>removeItem("inbox",id)}/></section>
          <section><header><CalendarDays size={15}/><strong>Promises & Consequences Calendar</strong></header><ItemEditor kind="commitments" items={world.commitments} onAdd={(x)=>addItem("commitments",x)} onRemove={(id)=>removeItem("commitments",id)}/></section>
        </>}

        {tab === "social" && <>
          <section className="living-world__hero"><div><UsersRound size={17}/><span><b>{groupLabel}</b><small>{conversation?.groupMode ? "Existing group engine stays in control" : "World relationships still persist"}</small></span></div><button type="button" onClick={onOpenWorldStudio}><Globe2 size={15}/>World Studio</button></section>

          <section><header><Heart size={15}/><strong>Relationship dimensions</strong></header><div className="living-world__two-col"><Slider label="Trust" value={relationship.trust} onChange={(v)=>patch("relationship",{trust:v})} low="Guarded" high="Trusting"/><Slider label="Comfort" value={relationship.comfort} onChange={(v)=>patch("relationship",{comfort:v})} low="Uneasy" high="At ease"/><Slider label="Tension" value={relationship.tension} onChange={(v)=>patch("relationship",{tension:v})} low="Low" high="High"/><Slider label="Resentment" value={relationship.resentment} onChange={(v)=>patch("relationship",{resentment:v})} low="None" high="Lingering"/><Slider label="Curiosity" value={relationship.curiosity} onChange={(v)=>patch("relationship",{curiosity:v})} low="Low" high="Fascinated"/></div></section>

          <section><header><ShieldCheck size={15}/><strong>Boundaries & attraction specificity</strong></header><label>Character boundaries<textarea rows="2" value={relationship.boundaries} onChange={(e)=>patch("relationship",{boundaries:e.target.value})} placeholder="What they will not do, tolerate or admit…"/></label><label>Specific attraction<textarea rows="2" value={relationship.attraction} onChange={(e)=>patch("relationship",{attraction:e.target.value})} placeholder="Specific traits, moments or habits, not generic attraction…"/></label><label>Triggers<input value={relationship.triggers} onChange={(e)=>patch("relationship",{triggers:e.target.value})} placeholder="Being compared to his father…"/></label><label>Soothers<input value={relationship.soothers} onChange={(e)=>patch("relationship",{soothers:e.target.value})} placeholder="Humor, space, practical help…"/></label></section>

          <section><header><LockKeyhole size={15}/><strong>Secrets & knowledge boundaries</strong></header><ItemEditor kind="secrets" items={world.secrets} onAdd={(x)=>addItem("secrets",x)} onRemove={(id)=>removeItem("secrets",id)}/></section>
          <section><header><MessageCircle size={15}/><strong>Rumor Engine</strong></header><ItemEditor kind="rumors" items={world.rumors} onAdd={(x)=>addItem("rumors",x)} onRemove={(id)=>removeItem("rumors",id)}/></section>
        </>}

        {tab === "continuity" && <>
          <section><header><Box size={15}/><strong>Object Persistence</strong></header><ItemEditor kind="objects" items={world.objects} onAdd={(x)=>addItem("objects",x)} onRemove={(id)=>removeItem("objects",id)}/></section>
          <section><header><MapPin size={15}/><strong>Persistent Places Gallery</strong></header><ItemEditor kind="places" items={world.places} onAdd={(x)=>addItem("places",x)} onRemove={(id)=>removeItem("places",id)}/></section>
          <section><header><Camera size={15}/><strong>Photo memories</strong><small>{sceneImages.length} current scene image{sceneImages.length===1?"":"s"}</small></header>{sceneImages.length ? <div className="living-world__photos">{sceneImages.slice(-8).map((src,i)=><img key={`${src}-${i}`} src={src} alt="Scene memory"/>)}</div> : <p className="living-world__empty">Scene images already added in chat will appear here automatically.</p>}</section>
          <section><header><ShieldCheck size={15}/><strong>Canon Lock</strong></header><ItemEditor kind="canonLocks" items={world.canonLocks} onAdd={(x)=>addItem("canonLocks",x)} onRemove={(id)=>removeItem("canonLocks",id)}/></section>
          <section><header><ScrollText size={15}/><strong>Private Notes</strong><small>Used as director context, never visible dialogue.</small></header><ItemEditor kind="privateNotes" items={world.privateNotes} onAdd={(x)=>addItem("privateNotes",x)} onRemove={(id)=>removeItem("privateNotes",id)}/></section>
          <section className="living-world__actions"><button type="button" onClick={onOpenTimeline}><BookOpen size={15}/>Story archive & timeline</button><button type="button" onClick={onOpenStoryHub}><GitBranch size={15}/>Branches & snapshots</button><button type="button" onClick={exportEpub}><Download size={15}/>Export EPUB</button></section>
        </>}

        {tab === "director" && <>
          <section><header><SlidersHorizontal size={15}/><strong>Naturalness controls</strong></header><Slider label="Character autonomy" value={relationship.autonomy} onChange={(v)=>patch("relationship",{autonomy:v})} low="Reactive" high="Independent"/><Slider label="Dialogue ratio" value={relationship.dialogueRatio} onChange={(v)=>patch("relationship",{dialogueRatio:v})} low="Narrative" high="Dialogue"/><label>Romance pace<select value={relationship.romanceSpeed} onChange={(e)=>patch("relationship",{romanceSpeed:e.target.value})}><option value="slow">Slow</option><option value="medium">Medium</option><option value="fast">Fast</option><option value="none">No romance focus</option></select></label></section>

          <section className="living-world__toggle-grid">
            <Toggle checked={behavior.povLock} onChange={(v)=>patch("behavior",{povLock:v})} title="POV Lock" detail="Never control your character"/>
            <Toggle checked={behavior.antiCliche} onChange={(v)=>patch("behavior",{antiCliche:v})} title="Anti-Cliché 3.0" detail="Reject stock AI romance"/>
            <Toggle checked={behavior.consistencyGuard} onChange={(v)=>patch("behavior",{consistencyGuard:v})} title="Character consistency" detail="Reject generic voice drift"/>
            <Toggle checked={behavior.repetitionRadar} onChange={(v)=>patch("behavior",{repetitionRadar:v})} title="Repetition radar" detail="Avoid recycled openings & beats"/>
            <Toggle checked={behavior.tooMuchGuard} onChange={(v)=>patch("behavior",{tooMuchGuard:v})} title="Too Much detector" detail="Prefer human-sized replies"/>
            <Toggle checked={behavior.silentActions} onChange={(v)=>patch("behavior",{silentActions:v})} title="Silent actions" detail="Dialogue is not mandatory"/>
            <Toggle checked={behavior.narrativeEchoes} onChange={(v)=>patch("behavior",{narrativeEchoes:v})} title="Narrative echoes" detail="Rare specific callbacks"/>
            <Toggle checked={scene.boredomGuard} onChange={(v)=>patch("scene",{boredomGuard:v})} title="Boredom detector" detail="Move stalled scenes logically"/>
            <Toggle checked={scene.interruptions} onChange={(v)=>patch("scene",{interruptions:v})} title="Grounded interruptions" detail="Only world-plausible interruptions"/>
            <Toggle checked={scene.realEndings} onChange={(v)=>patch("scene",{realEndings:v})} title="Real scene endings" detail="Characters can leave or hang up"/>
          </section>
          {behavior.tooMuchGuard && <section><header><Zap size={15}/><strong>Reply ceiling</strong></header><Slider label="Approx. max words" value={clamp((behavior.maxReplyWords-80)/3.2)} onChange={(v)=>patch("behavior",{maxReplyWords:Math.round(80+v*3.2)})} low="80" high="400"/><p className="living-world__muted">Current target: about {behavior.maxReplyWords} words. Velvet may exceed it when genuinely necessary.</p></section>}
        </>}

        {tab === "modes" && <>
          <section className="living-world__toggle-grid">
            <Toggle checked={state.modes.whatIf} onChange={(v)=>patch("modes",{whatIf:v})} title="What-if Mode" detail="Exploratory, avoids irreversible canon"/>
            <Toggle checked={state.modes.testRoom} onChange={(v)=>patch("modes",{testRoom:v})} title="Character Test Room" detail="Test voice without major plot"/>
            <Toggle checked={state.modes.performance} onChange={(v)=>patch("modes",{performance:v})} title="Performance Mode" detail="Reduce blur/animation on mobile"/>
            <Toggle checked={state.modes.offlineReading} onChange={(v)=>patch("modes",{offlineReading:v})} title="Offline reading" detail="PWA cache + local drafts stay enabled"/>
          </section>
          <section className="living-world__feature-status"><header><Check size={15}/><strong>Already native in Velvet</strong></header><div><span><GitBranch size={13}/>Branching timelines</span><span><BookOpen size={13}/>Story archive & chapters</span><span><UsersRound size={13}/>Group stories</span><span><WifiOff size={13}/>Offline send queue</span><span><ShieldCheck size={13}/>Crash recovery</span><span><ScrollText size={13}/>Local drafts</span><span><Eye size={13}/>Undo / rewind / branch compare</span></div></section>
        </>}

        {tab === "health" && <>
          <section className="living-world__health-grid">
            <article><small>PWA</small><strong>v{VELVET_VERSION}</strong><span>{pwa.serverVersion ? `server ${pwa.serverVersion}` : VELVET_RELEASE}</span></article>
            <article><small>Network</small><strong>{pwa.online ? "Online" : "Offline"}</strong><span>{offlineQueueSize ? `${offlineQueueSize} queued` : "Queue clear"}</span></article>
            <article><small>Chat core</small><strong>Protected</strong><span>Envelope Guard unchanged</span></article>
            <article><small>Recent voice score</small><strong>{analysis.consistencyScore}/100</strong><span>{analysis.replies} replies sampled</span></article>
          </section>
          <section><header><Activity size={15}/><strong>Repetition Radar</strong></header><p>Average recent character reply: <b>{analysis.avgWords || 0} words</b>.</p>{analysis.repeatedOpenings.length ? <ul>{analysis.repeatedOpenings.map((x)=><li key={x.text}>Opening repeated ×{x.count}: “{x.text}”</li>)}</ul> : <p className="living-world__good">No repeated 4-word openings detected.</p>}{analysis.cliches.length ? <ul>{analysis.cliches.map((x)=><li key={x}>Cliché detected: “{x}”</li>)}</ul> : <p className="living-world__good">No monitored AI-romance clichés detected.</p>}</section>
          <section className="living-world__stability"><header><ShieldCheck size={15}/><strong>Stability Sweep 3.24.1</strong><small>live local audit</small></header><div className="living-world__stability-grid"><span><b>{sweepAnalysis.povViolations.length ? "CHECK" : "PASS"}</b>POV Lock<small>{sweepAnalysis.povViolations.length ? `${sweepAnalysis.povViolations.length} recent possible violations` : "No recent POV-control patterns"}</small></span><span><b>{sweepAnalysis.repeatedBeats.length ? "WATCH" : "PASS"}</b>Repetition<small>{sweepAnalysis.repeatedBeats.length ? `${sweepAnalysis.repeatedBeats.length} repeated phrase patterns` : "No repeated 4-word beats"}</small></span><span><b>{canonConflicts.length ? "CHECK" : "PASS"}</b>Canon<small>{canonConflicts.length ? `${canonConflicts.length} possible conflicts` : "No obvious canon contradictions"}</small></span><span><b>PASS</b>Secrets<small>{blockedSecrets ? `${blockedSecrets} secret(s) withheld from ${character?.name || "character"}` : "Knowledge filter active"}</small></span></div>{canonConflicts.length > 0 && <ul>{canonConflicts.slice(0,3).map((x,i)=><li key={i}>Canon “{x.canon}” may conflict with “{x.candidate}”. Canon wins.</li>)}</ul>}{sweepAnalysis.povViolations.length > 0 && <ul>{sweepAnalysis.povViolations.slice(0,4).map((x)=><li key={x}>Possible POV control: “{x}”</li>)}</ul>}</section>
          <section><header><ShieldCheck size={15}/><strong>Generation health & rollback</strong></header><p>Living World is local-first. If these controls ever misbehave, reset them without deleting your messages, memories or backend data.</p><div className="living-world__actions"><button type="button" onClick={()=>pwa.checkForUpdate({silent:false})}><Zap size={15}/>Check update</button><button type="button" onClick={()=>pwa.repairUpdate()} disabled={pwa.updating}><ShieldCheck size={15}/>{pwa.updating ? "Repairing…" : "Repair updater"}</button><button type="button" onClick={onOpenDiagnostics}><Activity size={15}/>Open Velvet Doctor</button><button type="button" className="danger-lite" onClick={resetLivingWorld}><Trash2 size={15}/>Reset Living World only</button></div></section>
          <section><header><BookOpen size={15}/><strong>Release history</strong></header><div className="living-world__releases"><span><b>3.25.0</b> Velvet Experience</span><span><b>3.24.1</b> Stability Sweep</span><span><b>3.24.0</b> Living World</span><span><b>3.23.0</b> Safe Studio</span><span><b>3.22.1</b> Envelope Guard</span><span><b>3.22.0</b> Presence Engine 2.0</span></div></section>
        </>}
      </div>
      {notice && <footer className="living-world__notice" role="status">{notice}<button type="button" onClick={()=>setNotice("")}><X size={13}/></button></footer>}
    </aside>
  </div>, document.body);
}
