import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookOpen, ChevronRight, GitBranch, HeartHandshake, ListTodo, Search, Sparkles, Users, X } from "lucide-react";
import { useChats } from "../context/ChatsContext";

const TABS = [
  ["story", "Story", BookOpen],
  ["saved", "Saved", Bookmark],
  ["timelines", "Timelines", GitBranch],
];

export default function StoryHubDrawer({ open, onClose, character, onJumpToMessage, onOpenConversation }) {
  const { getStoryHubData, searchConversationMessages, getConversation } = useChats();
  const conversation = getConversation(character.id);
  const [tab, setTab] = useState("story");
  const [hub, setHub] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !conversation?.conversationId) return;
    let live = true;
    setLoading(true);
    getStoryHubData(character.id).then((data) => live && setHub(data)).catch(console.error).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [open, character.id, conversation?.conversationId]);

  useEffect(() => {
    if (!open || tab !== "saved") return;
    const clean = query.trim();
    if (clean.length < 2) return setResults([]);
    const timer = window.setTimeout(() => searchConversationMessages(character.id, clean).then(setResults).catch(console.error), 220);
    return () => window.clearTimeout(timer);
  }, [open, tab, query, character.id]);

  const castEntries = useMemo(() => Object.entries(hub?.cast || {}), [hub?.cast]);
  if (!open) return null;

  return <div className="story-hub-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="story-hub" role="dialog" aria-modal="true" aria-label="Story Hub">
      <header className="story-hub__header"><div><span><Sparkles size={15}/> LIVING STORY</span><strong>Story Hub</strong></div><button onClick={onClose} aria-label="Close Story Hub"><X size={20}/></button></header>
      <nav className="story-hub__tabs" aria-label="Story Hub sections">{TABS.map(([id,label,Icon]) => <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={16}/><span>{label}</span></button>)}</nav>
      <div className="story-hub__body">
        {loading && !hub && <p className="story-hub__empty">Reading the story…</p>}
        {tab === "story" && <StoryOverview hub={hub} character={character} castEntries={castEntries}/>} 
        {tab === "saved" && <section className="story-hub__section">
          <label className="story-hub__search"><Search size={17}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search this story…"/></label>
          {(hub?.bookmarks || []).length > 0 && <><div className="story-hub__mini-heading"><Bookmark size={14}/> Saved moments</div>{(hub.bookmarks || []).map((message)=><button key={message.id} className="story-hub__result" onClick={()=>onJumpToMessage?.(message.id)}><Bookmark size={15} fill="currentColor"/><span>{message.bookmarkLabel || message.content}</span><small>{formatDate(message.createdAt)}</small></button>)}</>}
          {query.trim().length >= 2 && <><div className="story-hub__mini-heading"><Search size={14}/> Search results</div>{results.map((message)=><button key={message.id} className="story-hub__result" onClick={()=>onJumpToMessage?.(message.id)}><small>{message.sender === "user" ? "YOU" : character.name.toUpperCase()} · {formatDate(message.createdAt)}</small><span>{message.content}</span><ChevronRight size={16}/></button>)}</>}
          {!hub?.bookmarks?.length && query.trim().length < 2 && <p className="story-hub__empty">Bookmark favorite moments or search the full story from here.</p>}
        </section>}
        {tab === "timelines" && <section className="story-hub__section story-hub__branches">{(hub?.branches || []).map((branch)=><button key={branch.id} className={`story-hub__branch${branch.id===conversation?.conversationId?" active":""}`} onClick={()=>branch.id!==conversation?.conversationId&&onOpenConversation?.(branch.id)}><GitBranch size={17}/><span><strong>{branch.title || "Untitled timeline"}</strong><small>{branch.id===conversation?.conversationId?"Current timeline":branch.branch_parent_id?"Branch":"Original timeline"}</small></span><ChevronRight size={16}/></button>)}{!hub?.branches?.length && <p className="story-hub__empty">Alternate timelines will stay here without cluttering the rest of Story Hub.</p>}</section>}
      </div>
    </aside>
  </div>;
}

function StoryOverview({ hub, character, castEntries }) {
  const relationship = hub?.relationship || {};
  const openThreads = (hub?.unfinishedThreads || []).filter((thread)=>thread?.status !== "resolved");
  return <section className="story-hub__section story-hub__overview">
    <article className="story-hub__chapter story-hub__chapter--active"><small>WHERE THE STORY IS NOW</small><strong>{hub?.activeChapter?.title || relationship.current_dynamic || "Still unfolding"}</strong>{hub?.activeChapter?.summary && <p>{hub.activeChapter.summary}</p>}</article>
    <div className="story-hub__overview-block"><div className="story-hub__mini-heading"><HeartHandshake size={14}/> Bond</div><strong>{relationship.current_dynamic || `Your dynamic with ${character.name} is still being established.`}</strong></div>
    <div className="story-hub__overview-block"><div className="story-hub__mini-heading"><Users size={14}/> Cast</div>{castEntries.length ? castEntries.slice(0,8).map(([name,item])=><div className="story-hub__compact-row" key={name}><span>{name}</span><small>{item.role || item.current_status || "Recurring character"}</small></div>) : <p className="story-hub__empty">Recurring characters will appear naturally.</p>}</div>
    <div className="story-hub__overview-block"><div className="story-hub__mini-heading"><ListTodo size={14}/> Open threads</div>{openThreads.length ? openThreads.slice(0,8).map((thread,index)=><div className="story-hub__compact-row" key={thread.id || index}><span>{thread.title || thread.label || "Unfinished thread"}</span><small>{thread.detail || thread.context || "Still unresolved"}</small></div>) : <p className="story-hub__empty">No loose threads right now.</p>}</div>
    {(hub?.chapters || []).length > 0 && <div className="story-hub__overview-block"><div className="story-hub__mini-heading"><BookOpen size={14}/> Earlier chapters</div>{[...(hub.chapters || [])].reverse().slice(0,6).map((chapter)=><div className="story-hub__compact-row" key={`${chapter.number}-${chapter.title}`}><span>{chapter.title}</span><small>Chapter {chapter.number}</small></div>)}</div>}
  </section>;
}
function formatDate(value){ if(!value) return ""; return new Date(value).toLocaleDateString([], { day:"2-digit", month:"short" }); }
