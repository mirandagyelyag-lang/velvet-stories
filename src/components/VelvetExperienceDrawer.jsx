import {
  Activity, Bell, BookHeart, BookOpen, Check, Clock3, Gauge, Heart, LayoutDashboard,
  MessageCircle, Palette, Search, ShieldCheck, Sparkles, Star, UsersRound, WandSparkles, X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePWA } from "../context/PWAContext";
import { VELVET_BUILD_TIME, VELVET_RELEASE, VELVET_VERSION } from "../config/version";
import { readGenerationMetrics, summarizeGenerationMetrics } from "../utils/velvetResilience";
import { readLivingWorld, writeLivingWorld } from "../utils/livingWorldSafe";
import {
  buildSceneCards, dedupeLocalWorldLists, deriveAutomaticChapters, deriveRecap, deriveVoicePreview,
  patchExperience, readExperience, relationshipHistory, searchConversation, writeExperience,
} from "../utils/velvetExperience";

const TABS = [
  ["chat", MessageCircle, "Chat"], ["story", BookOpen, "Story"], ["character", LayoutDashboard, "Character"],
  ["visual", Palette, "Visual"], ["system", ShieldCheck, "System"],
];

function text(v){ return String(v || "").trim(); }
function Toggle({checked,onChange,title,detail}){ return <button type="button" className={`experience__toggle${checked?" is-on":""}`} onClick={()=>onChange(!checked)}><span><b>{title}</b><small>{detail}</small></span><i><u/></i></button>; }

export default function VelvetExperienceDrawer({
  open, onClose, character, conversation, messages = [], onJumpToMessage, onOpenMemoryBook,
  onOpenTimeline, onOpenLivingWorld, onQueueDirector, onThemeChange,
}) {
  const pwa = usePWA();
  const conversationId = conversation?.conversationId || conversation?.id || character?.id || "unknown";
  const [tab,setTab] = useState("chat");
  const [state,setState] = useState(()=>readExperience(conversationId));
  const [query,setQuery] = useState("");
  const [speaker,setSpeaker] = useState("all");
  const [noticeText,setNoticeText] = useState("");
  const [serverVersion,setServerVersion] = useState("");
  const [cleanupNotice,setCleanupNotice] = useState("");

  useEffect(()=>{ if(open) setState(readExperience(conversationId)); },[open,conversationId]);
  useEffect(()=>{ if(!open) return; fetch(`/velvet-version.json?experience=${Date.now()}`,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(v=>setServerVersion(v?.version||"")).catch(()=>setServerVersion("")); },[open]);

  const results = useMemo(()=>searchConversation(messages,query,speaker),[messages,query,speaker]);
  const favorites = useMemo(()=>messages.filter((m)=>m?.isBookmarked && text(m.content)).slice(-20).reverse(),[messages]);
  const recap = useMemo(()=>deriveRecap(messages,character?.name),[messages,character?.name]);
  const autoChapters = useMemo(()=>deriveAutomaticChapters(messages,state.chaptering.every),[messages,state.chaptering.every]);
  const sceneCards = useMemo(()=>buildSceneCards(conversation),[conversation]);
  const relationship = useMemo(()=>relationshipHistory(conversation),[conversation]);
  const mind = conversation?.intelligenceState?.character_mind || {};
  const presence = conversation?.intelligenceState?.presence_engine_state || {};
  const living = readLivingWorld(conversationId);
  const generationMetrics = summarizeGenerationMetrics(readGenerationMetrics());
  const context = [conversation?.sceneState?.location, conversation?.sceneState?.time_label || conversation?.sceneState?.time, mind.current_emotion, conversation?.groupMode ? "Group" : null].filter(Boolean);

  if(!open) return null;
  function patch(section,values){ setState((current)=>patchExperience(conversationId,current,section,values)); }
  function addNotification(){ const value=text(noticeText); if(!value) return; const next={...state,notifications:[...state.notifications,{id:`${Date.now()}`,type:"message",text:value,status:"open"}]}; setState(writeExperience(conversationId,next)); setNoticeText(""); }
  function applyDirector(note){ onQueueDirector?.(note); setState((current)=>patchExperience(conversationId,current,"director",{lastPreset:note})); }
  function cleanLocalMemory(){ const result=dedupeLocalWorldLists(living.world); writeLivingWorld(conversationId,{...living,world:result.world}); setCleanupNotice(result.removed ? `Removed ${result.removed} exact duplicate local continuity item${result.removed===1?"":"s"}.` : "No exact duplicate local continuity items found."); }
  const device = typeof navigator !== "undefined" ? `${navigator.hardwareConcurrency || "?"} cores${navigator.deviceMemory ? ` · ${navigator.deviceMemory} GB` : ""}` : "Unknown";

  return createPortal(<div className="experience-backdrop" onMouseDown={(e)=>e.target===e.currentTarget&&onClose?.()}>
    <aside className="experience" role="dialog" aria-modal="true" aria-label="Velvet Experience">
      <div className="experience__grab"/>
      <header className="experience__header"><div><small>VELVET EXPERIENCE · v{VELVET_VERSION}</small><h2>Story experience</h2><p>Polish and control layered over the protected chat core.</p></div><button type="button" onClick={onClose}><X size={19}/></button></header>
      <nav className="experience__tabs">{TABS.map(([id,Icon,label])=><button key={id} type="button" className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={15}/><span>{label}</span></button>)}</nav>
      <div className="experience__scroll">
        {tab==="chat" && <>
          <section><header><MessageCircle size={15}/><strong>Chat Composer 2.0</strong></header><div className="experience__toggle-grid"><Toggle checked={state.composer.compact} onChange={(v)=>patch("composer",{compact:v})} title="Compact composer" detail="More story space on mobile"/><Toggle checked={state.composer.quickTools} onChange={(v)=>patch("composer",{quickTools:v})} title="Quick tools" detail="Keep Direct and context actions close"/><Toggle checked={state.composer.showContext} onChange={(v)=>patch("composer",{showContext:v})} title="Context chips" detail="Scene context above the story"/></div></section>
          <section><header><Sparkles size={15}/><strong>Context Chips</strong></header><div className="experience__chips">{context.length?context.map((x)=><span key={x}>{x}</span>):<small>They appear as the scene establishes itself.</small>}</div></section>
          <section><header><Search size={15}/><strong>Conversation Search 2.0</strong></header><div className="experience__search"><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search dialogue, places, names…"/><select value={speaker} onChange={(e)=>setSpeaker(e.target.value)}><option value="all">Everyone</option><option value="user">You</option><option value="character">Character</option></select></div>{query&&<div className="experience__results">{results.slice(0,16).map((m)=><button key={m.id} onClick={()=>onJumpToMessage?.(m.id)}><b>{m.sender==="user"?"You":character?.name}</b><span>{text(m.content).slice(0,150)}</span></button>)}{!results.length&&<small>No matches.</small>}</div>}</section>
          <section><header><Star size={15}/><strong>Favorite moments</strong><span>{favorites.length}</span></header><div className="experience__results">{favorites.slice(0,10).map((m)=><button key={m.id} onClick={()=>onJumpToMessage?.(m.id)}><Star size={12}/><span>{text(m.content).slice(0,150)}</span></button>)}{!favorites.length&&<small>Bookmark a reply and it will appear here.</small>}</div></section>
          <section><header><Bell size={15}/><strong>Notification simulation</strong></header><div className="experience__inline"><input value={noticeText} onChange={(e)=>setNoticeText(e.target.value)} placeholder="Missed call from Jules…"/><button onClick={addNotification}>Add</button></div><div className="experience__mini-list">{state.notifications.slice(-6).reverse().map((x)=><span key={x.id}><Bell size={11}/>{x.text}</span>)}</div></section>
        </>}
        {tab==="story" && <>
          <section className="experience__hero"><header><WandSparkles size={15}/><strong>Smart story recap</strong></header><p>{recap}</p></section>
          <section><header><BookHeart size={15}/><strong>Memory Book 3.0</strong></header><p>Canon, pinned memories, confidence and exact-duplicate cleanup stay separate from generation.</p><button className="experience__primary" onClick={onOpenMemoryBook}>Open Memory Book</button></section>
          <section><header><Clock3 size={15}/><strong>Scene Cards</strong></header><div className="experience__cards">{sceneCards.slice(0,8).map((c)=><button key={c.id} onClick={()=>c.messageId&&onJumpToMessage?.(c.messageId)}><b>{c.title}</b><small>{c.detail||"Story beat"}</small></button>)}{!sceneCards.length&&<small>No scene cards yet.</small>}</div></section>
          <section><header><BookOpen size={15}/><strong>Automatic chaptering</strong><span>{autoChapters.length}</span></header><div className="experience__toggle-grid"><Toggle checked={state.chaptering.enabled} onChange={(v)=>patch("chaptering",{enabled:v})} title="Auto chapters" detail={`About every ${state.chaptering.every} messages`}/></div>{state.chaptering.enabled&&<div className="experience__cards">{autoChapters.slice(-8).reverse().map((c)=><button key={c.number} onClick={()=>c.startMessageId&&onJumpToMessage?.(c.startMessageId)}><b>Chapter {c.number} · {c.title}</b><small>{c.count} messages</small></button>)}</div>}<button className="experience__link" onClick={onOpenTimeline}>Open full timeline</button></section>
          <section><header><Sparkles size={15}/><strong>Director Notes 2.0</strong></header><div className="experience__preset-grid">{[["No romance","Keep this beat non-romantic. Focus on ordinary life, friendship, obligations or conflict without erasing established feelings."],["More dialogue","Use more audible dialogue and less descriptive filler."],["Awkward ending","Let this scene end naturally and a little awkwardly instead of forcing emotional closure."],["Let them leave",`If it fits ${character?.name}'s priorities, let them end the conversation or leave instead of waiting for me.`]].map(([label,note])=><button key={label} onClick={()=>applyDirector(note)}>{label}</button>)}</div></section>
          <section><header><WandSparkles size={15}/><strong>Scene templates</strong></header><div className="experience__preset-grid">{[["Rainy walk","Start or steer the next beat into a grounded rainy walk. Keep continuity and existing relationship dynamics."],["Late-night call","Move the next beat into a late-night phone call with realistic pauses and no forced confession."],["Party","Move into a social party scene with independent side-character motives and realistic interruptions."],["Road trip","Move into a road-trip beat with physical continuity, small talk and room for silence."],["Argument","Let a real disagreement develop without therapy-speak or instant resolution."]].map(([label,note])=><button key={label} onClick={()=>applyDirector(note)}>{label}</button>)}</div></section>
        </>}
        {tab==="character" && <>
          <section className="experience__dashboard"><header><LayoutDashboard size={15}/><strong>Character dashboard</strong></header><div><span><small>Mood</small><b>{mind.current_emotion||"Unclear"}</b></span><span><small>Energy</small><b>{mind.energy||"Normal"}</b></span><span><small>Goal</small><b>{text(mind.short_goal).slice(0,60)||"Not stated"}</b></span><span><small>Mode</small><b>{presence.conversation_mode||"Natural"}</b></span></div></section>
          <section><header><Clock3 size={15}/><strong>Character availability</strong></header><select value={state.availability.mode} onChange={(e)=>patch("availability",{mode:e.target.value})}><option value="realistic">Respect routine automatically</option><option value="always">Always available</option><option value="manual">Manual note</option></select><textarea rows="2" value={state.availability.note} onChange={(e)=>patch("availability",{note:e.target.value})} placeholder="In class until 4 PM, works Saturdays…"/></section>
          <section><header><UsersRound size={15}/><strong>Group Stories 2.0</strong></header><div className="experience__toggle-grid"><Toggle checked={state.group.realisticTurns} onChange={(v)=>patch("group",{realisticTurns:v})} title="Natural turns" detail="Not everyone must speak"/><Toggle checked={state.group.allowSilence} onChange={(v)=>patch("group",{allowSilence:v})} title="Allow silence" detail="Characters may only react"/><Toggle checked={state.group.avoidRoundRobin} onChange={(v)=>patch("group",{avoidRoundRobin:v})} title="No round-robin" detail="Avoid mechanical turn order"/></div></section>
          <section><header><Sparkles size={15}/><strong>Character voice preview</strong></header><blockquote>{deriveVoicePreview(character)}</blockquote><small>Preview uses the saved character profile only. It does not alter canon.</small></section>
          <section><header><Heart size={15}/><strong>Relationship history</strong></header>{relationship.length?<div className="experience__graph">{relationship.map((r,i)=><div key={`${r.label}-${i}`} title={r.label}><i style={{height:`${Math.max(8,Math.min(100,r.trust))}%`}}/><u style={{height:`${Math.max(8,Math.min(100,r.tension))}%`}}/><small>{i+1}</small></div>)}</div>:<p>No relationship timeline points yet.</p>}</section>
        </>}
        {tab==="visual" && <>
          <section><header><Palette size={15}/><strong>Visual themes per story</strong></header><div className="experience__preset-grid">{[["velvet","Velvet"],["night","Night"],["cafe","Café"],["campus","Campus"],["rain","Rain"]].map(([id,label])=><button key={id} className={state.visual.storyTheme===id?"is-active":""} onClick={()=>{patch("visual",{storyTheme:id});onThemeChange?.(id);}}>{label}</button>)}</div></section>
          <section><header><Clock3 size={15}/><strong>Scene cards</strong></header><Toggle checked={state.visual.sceneCards} onChange={(v)=>patch("visual",{sceneCards:v})} title="Show story scene cards" detail="Editorial dividers in Experience and Timeline"/></section>
          <section><header><MessageCircle size={15}/><strong>Composer density</strong></header><p>Compact mode reduces vertical chrome while preserving the native one-finger scroll and keyboard behavior.</p></section>
        </>}
        {tab==="system" && <>
          <section className="experience__dashboard"><header><Gauge size={15}/><strong>Performance dashboard</strong></header><div><span><small>Loaded messages</small><b>{messages.length}</b></span><span><small>Device</small><b>{device}</b></span><span><small>Network</small><b>{pwa.online?"Online":"Offline"}</b></span><span><small>Avg generation</small><b>{generationMetrics.avgDurationMs ? `${(generationMetrics.avgDurationMs/1000).toFixed(1)}s` : "No data"}</b></span></div></section>
          <section><header><Sparkles size={15}/><strong>Auto-clean memory</strong></header><p>Safely removes only exact duplicates from Living World local continuity. Canon memories in Supabase are never deleted here.</p><button className="experience__primary" onClick={cleanLocalMemory}>Clean exact local duplicates</button>{cleanupNotice&&<small className="experience__good">{cleanupNotice}</small>}<button className="experience__link" onClick={onOpenLivingWorld}>Open Living World</button></section>
          <section><header><ShieldCheck size={15}/><strong>Release Center</strong></header><div className="experience__release"><span>Installed <b>v{VELVET_VERSION}</b></span><span>Server <b>{serverVersion?`v${serverVersion}`:"Checking…"}</b></span><span>Release <b>{VELVET_RELEASE}</b></span><span>Build <b>{VELVET_BUILD_TIME ? new Date(VELVET_BUILD_TIME).toLocaleString() : "Unknown"}</b></span></div><div className="experience__actions"><button onClick={()=>pwa.checkForUpdate({silent:false})}>Check update</button><button onClick={()=>pwa.repairUpdate()} disabled={pwa.updating}>Repair updater</button></div></section>
        </>}
      </div>
    </aside>
  </div>,document.body);
}
