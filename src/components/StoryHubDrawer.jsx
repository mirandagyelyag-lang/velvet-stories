import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark, BookOpen, ChevronRight, Download, FileDown, GitBranch, HeartHandshake,
  ImagePlus, ListTodo, MapPin, RotateCcw, Search, Sparkles, Star, Trash2,
  Upload, UserRound, Users, X,
} from "lucide-react";
import { useChats } from "../context/ChatsContext";
import { useFeedback } from "../context/FeedbackContext";
import { exportStoryBook, downloadStoryBackup } from "../utils/storyExport";

const TABS = [
  ["dashboard", "Story", BookOpen],
  ["saved", "Moments", Bookmark],
  ["experience", "Experience", Sparkles],
  ["backups", "Backups", RotateCcw],
  ["timelines", "Timelines", GitBranch],
];

export default function StoryHubDrawer({
  open, onClose, character, characters = [], persona = null, lorebook = null,
  onJumpToMessage, onOpenConversation,
}) {
  const {
    getStoryHubData, searchConversationMessages, getConversation,
    updateStoryExperience, uploadStoryCover, createStorySnapshot, listStorySnapshots,
    deleteStorySnapshot, restoreStorySnapshot, exportStoryBackupData, importStoryBackupData,
    getStoryExportData,
  } = useChats();
  const { confirmAction } = useFeedback();
  const conversation = getConversation(character.id);
  const [tab, setTab] = useState("dashboard");
  const [hub, setHub] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [busy, setBusy] = useState("");
  const [coverDraft, setCoverDraft] = useState({ title: "", mood: "" });
  const coverInputRef = useRef(null);
  const backupInputRef = useRef(null);

  async function refreshHub() {
    if (!conversation?.conversationId) return;
    const data = await getStoryHubData(character.id);
    setHub(data);
    setCoverDraft({
      title: data.coverTitle || conversation.coverTitle || conversation.title || character.name,
      mood: data.coverMood || conversation.coverMood || "",
    });
  }

  async function refreshSnapshots() {
    if (!conversation?.conversationId) return;
    setSnapshots(await listStorySnapshots(character.id));
  }

  useEffect(() => {
    if (!open || !conversation?.conversationId) return;
    let live = true;
    setLoading(true);
    Promise.all([getStoryHubData(character.id), listStorySnapshots(character.id)])
      .then(([data, rows]) => {
        if (!live) return;
        setHub(data);
        setSnapshots(rows);
        setCoverDraft({
          title: data.coverTitle || conversation.coverTitle || conversation.title || character.name,
          mood: data.coverMood || conversation.coverMood || "",
        });
      })
      .catch(console.error)
      .finally(() => live && setLoading(false));
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
  const groupCharacters = useMemo(() => {
    const ids = new Set([character.id, ...(conversation?.groupCharacterIds || [])]);
    return characters.filter((item) => ids.has(item.id));
  }, [characters, character.id, conversation?.groupCharacterIds]);

  if (!open) return null;

  async function saveCover() {
    try {
      setBusy("cover");
      setNotice("");
      await updateStoryExperience(character.id, { coverTitle: coverDraft.title, coverMood: coverDraft.mood });
      await refreshHub();
      setNotice("Story cover saved.");
    } catch (error) { setNotice(error.message || "Could not save the cover."); }
    finally { setBusy(""); }
  }

  async function uploadCover(file) {
    if (!file) return;
    try {
      setBusy("cover-upload");
      setNotice("");
      await uploadStoryCover(character.id, file);
      await refreshHub();
      setNotice("Cover image updated.");
    } catch (error) { setNotice(error.message || "Could not upload the cover."); }
    finally { setBusy(""); }
  }

  async function exportBook(format) {
    try {
      setBusy(`export-${format}`);
      const data = await getStoryExportData(character.id);
      exportStoryBook({
        ...data,
        characterName: character.name,
        personaName: persona?.name || "You",
      }, format);
    } catch (error) { setNotice(error.message || "Could not export this story."); }
    finally { setBusy(""); }
  }

  async function createSnapshot() {
    try {
      setBusy("snapshot");
      await createStorySnapshot(character.id, snapshotLabel.trim() || "Manual snapshot");
      setSnapshotLabel("");
      await refreshSnapshots();
      setNotice("Snapshot created.");
    } catch (error) { setNotice(error.message || "Could not create a snapshot."); }
    finally { setBusy(""); }
  }

  async function restoreSnapshot(row) {
    const approved = await confirmAction({
      title: `Restore “${row.label}”?`,
      message: "Velvet will first create a safety snapshot, then replace the current story state with this saved version.",
      confirmLabel: "Restore snapshot",
    });
    if (!approved) return;
    try {
      setBusy(`restore-${row.id}`);
      await restoreStorySnapshot(character.id, row.id);
      await Promise.all([refreshHub(), refreshSnapshots()]);
      setNotice("Story restored. A safety snapshot was kept.");
    } catch (error) { setNotice(error.message || "Could not restore this snapshot."); }
    finally { setBusy(""); }
  }

  async function removeSnapshot(row) {
    const approved = await confirmAction({ title: "Delete this snapshot?", message: "The story itself will not be changed.", confirmLabel: "Delete snapshot" });
    if (!approved) return;
    try {
      setBusy(`delete-${row.id}`);
      await deleteStorySnapshot(row.id);
      await refreshSnapshots();
    } catch (error) { setNotice(error.message || "Could not delete the snapshot."); }
    finally { setBusy(""); }
  }

  async function exportBackup() {
    try {
      setBusy("backup-export");
      const backup = await exportStoryBackupData(character.id);
      downloadStoryBackup(backup, `${safeFile(conversation?.title || character.name)}-velvet-backup.json`);
      setNotice("Backup exported.");
    } catch (error) { setNotice(error.message || "Could not export the backup."); }
    finally { setBusy(""); }
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      setBusy("backup-import");
      const backup = JSON.parse(await file.text());
      const approved = await confirmAction({
        title: "Restore this backup?",
        message: "Velvet will create a safety snapshot before replacing the current story.",
        confirmLabel: "Restore backup",
      });
      if (!approved) return;
      await importStoryBackupData(character.id, backup);
      await Promise.all([refreshHub(), refreshSnapshots()]);
      setNotice("Backup restored.");
    } catch (error) { setNotice(error.message || "Could not restore that backup."); }
    finally { setBusy(""); if (backupInputRef.current) backupInputRef.current.value = ""; }
  }

  return <div className="story-hub-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="story-hub story-hub--v260" role="dialog" aria-modal="true" aria-label="Story dashboard">
      <header className="story-hub__header"><div><span><Sparkles size={15}/> LIVING STORY</span><strong>{conversation?.groupTitle || conversation?.title || character.name}</strong></div><button onClick={onClose} aria-label="Close Story Hub"><X size={20}/></button></header>
      <nav className="story-hub__tabs story-hub__tabs--v260" aria-label="Story Hub sections">{TABS.map(([id,label,Icon]) => <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={16}/><span>{label}</span></button>)}</nav>
      {notice && <div className="story-hub__notice">{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
      <div className="story-hub__body">
        {loading && !hub && <p className="story-hub__empty">Reading the story…</p>}
        {tab === "dashboard" && <StoryDashboard hub={hub} character={character} groupCharacters={groupCharacters} persona={persona} lorebook={lorebook} castEntries={castEntries} onContinue={onClose} onJumpToMessage={onJumpToMessage}/>}
        {tab === "saved" && <section className="story-hub__section">
          <label className="story-hub__search"><Search size={17}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search this story…"/></label>
          {(hub?.bookmarks || []).length > 0 && <><div className="story-hub__mini-heading"><Star size={14}/> Favorite moments</div>{(hub.bookmarks || []).map((message)=><button key={message.id} className="story-hub__result" onClick={()=>onJumpToMessage?.(message.id)}><Star size={15} fill="currentColor"/><span>{message.bookmarkLabel || message.content}</span><small>{formatDate(message.createdAt)}</small></button>)}</>}
          {query.trim().length >= 2 && <><div className="story-hub__mini-heading"><Search size={14}/> Search results</div>{results.map((message)=><button key={message.id} className="story-hub__result" onClick={()=>onJumpToMessage?.(message.id)}><small>{message.sender === "user" ? "YOU" : character.name.toUpperCase()} · {formatDate(message.createdAt)}</small><span>{message.content}</span><ChevronRight size={16}/></button>)}</>}
          {!hub?.bookmarks?.length && query.trim().length < 2 && <p className="story-hub__empty">Save favorite moments from the message menu. They stay here like highlighted pages in a book.</p>}
        </section>}
        {tab === "experience" && <section className="story-hub__section keepsake-experience">
          <div className="keepsake-card">
            <div className="story-hub__mini-heading"><ImagePlus size={14}/> Story cover</div>
            <div className="keepsake-cover" style={(conversation?.coverUrl || hub?.coverUrl || character.coverUrl || character.imageUrl) ? { backgroundImage:`linear-gradient(180deg,transparent,rgba(8,4,7,.72)),url(${JSON.stringify(conversation?.coverUrl || hub?.coverUrl || character.coverUrl || character.imageUrl)})` } : undefined}>
              <strong>{coverDraft.title || conversation?.title || character.name}</strong><span>{coverDraft.mood || "Your private story"}</span>
            </div>
            <div className="keepsake-fields"><input value={coverDraft.title} onChange={(e)=>setCoverDraft((v)=>({...v,title:e.target.value}))} placeholder="Cover title"/><input value={coverDraft.mood} onChange={(e)=>setCoverDraft((v)=>({...v,mood:e.target.value}))} placeholder="Mood / subtitle"/></div>
            <div className="keepsake-actions"><button onClick={()=>coverInputRef.current?.click()} disabled={Boolean(busy)}><Upload size={15}/>Image</button><button onClick={saveCover} disabled={busy==="cover"}>Save cover</button><input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(e)=>uploadCover(e.target.files?.[0])}/></div>
          </div>

          <div className="keepsake-card">
            <div className="story-hub__mini-heading"><FileDown size={14}/> Export as a book</div>
            <p className="keepsake-copy">Turn the complete story into a clean keepsake with no app controls.</p>
            <div className="keepsake-export"><button onClick={()=>exportBook("pdf")}><Download size={15}/>PDF</button><button onClick={()=>exportBook("html")}>HTML</button><button onClick={()=>exportBook("markdown")}>Markdown</button></div>
          </div>
        </section>}
        {tab === "backups" && <section className="story-hub__section keepsake-backups">
          <div className="keepsake-card keepsake-card--snapshot">
            <div className="story-hub__mini-heading"><RotateCcw size={14}/> Story snapshots</div>
            <p className="keepsake-copy">Freeze the entire story before experimenting. Restore messages, memories, timeline, settings and cover later.</p>
            <div className="keepsake-snapshot-create"><input value={snapshotLabel} onChange={(e)=>setSnapshotLabel(e.target.value)} placeholder="Before the breakup scene…"/><button onClick={createSnapshot} disabled={busy==="snapshot"}>Create snapshot</button></div>
          </div>
          <div className="keepsake-snapshot-list">{snapshots.map((row)=><article key={row.id}><span><strong>{row.label}</strong><small>{new Date(row.created_at).toLocaleString()}</small></span><button onClick={()=>restoreSnapshot(row)} disabled={Boolean(busy)}><RotateCcw size={15}/>Restore</button><button className="danger" onClick={()=>removeSnapshot(row)} disabled={Boolean(busy)}><Trash2 size={15}/></button></article>)}{!snapshots.length && <p className="story-hub__empty">No snapshots yet.</p>}</div>
          <div className="keepsake-card">
            <div className="story-hub__mini-heading"><Download size={14}/> Portable backup</div>
            <p className="keepsake-copy">Export a complete JSON backup you can keep outside Velvet, or restore one back into this exact story.</p>
            <div className="keepsake-actions"><button onClick={exportBackup} disabled={Boolean(busy)}><Download size={15}/>Export backup</button><button onClick={()=>backupInputRef.current?.click()} disabled={Boolean(busy)}><Upload size={15}/>Restore file</button><input ref={backupInputRef} type="file" accept=".json,application/json" hidden onChange={(e)=>importBackup(e.target.files?.[0])}/></div>
          </div>
        </section>}
        {tab === "timelines" && <section className="story-hub__section story-hub__branches">{(hub?.branches || []).map((branch)=><button key={branch.id} className={`story-hub__branch${branch.id===conversation?.conversationId?" active":""}`} onClick={()=>branch.id!==conversation?.conversationId&&onOpenConversation?.(branch.id)}><GitBranch size={17}/><span><strong>{branch.title || "Untitled timeline"}</strong><small>{branch.id===conversation?.conversationId?"Current timeline":branch.branch_parent_id?"Branch":"Original timeline"}</small></span><ChevronRight size={16}/></button>)}{!hub?.branches?.length && <p className="story-hub__empty">Alternate timelines will stay here without cluttering the main story.</p>}</section>}
      </div>
    </aside>
  </div>;
}

function StoryDashboard({ hub, character, groupCharacters, persona, lorebook, castEntries, onContinue, onJumpToMessage }) {
  const relationship = hub?.relationship || {};
  const openThreads = (hub?.unfinishedThreads || []).filter((thread)=>!["resolved", "abandoned"].includes(thread?.status));
  const latestBeat = (hub?.storyTimeline || []).at(-1);
  const recentMemories = hub?.recentMemories || [];
  const activeChapter = hub?.activeChapter || {};
  const intelligence = hub?.intelligenceState || {};
  const cover = hub?.coverUrl || character.coverUrl || character.imageUrl;

  return <section className="story-hub__section story-dashboard">
    <article className={`story-dashboard__hero${cover?" has-cover":""}`} style={cover ? { "--story-cover":`url(${JSON.stringify(cover)})` } : undefined}>
      <div className="story-dashboard__hero-copy"><small>CURRENT STORY</small><h2>{hub?.coverTitle || activeChapter.title || relationship.current_dynamic || "Still unfolding"}</h2><p>{hub?.coverMood || hub?.storyRecap || activeChapter.summary || `Your story with ${character.name} is still taking shape.`}</p></div>
      <button type="button" onClick={onContinue}>Continue story <ChevronRight size={17}/></button>
    </article>
    <div className="story-dashboard__identity">
      <span><UserRound size={15}/><b>Persona</b><em>{persona?.name || "Default you"}</em></span>
      <span><MapPin size={15}/><b>World</b><em>{lorebook?.name || "No world selected"}</em></span>
      <span><HeartHandshake size={15}/><b>Relationship</b><em>{relationship.current_dynamic || character.relationship || "Still unfolding"}</em></span>
    </div>
    <div className="story-dashboard__cast"><div className="story-hub__mini-heading"><Users size={14}/> Cast</div><div>{groupCharacters.length ? groupCharacters.map((item)=><span key={item.id}>{item.imageUrl || item.coverUrl ? <img src={item.imageUrl || item.coverUrl} alt=""/> : item.initials || item.name?.[0]}<b>{item.name}</b></span>) : castEntries.slice(0,6).map(([name])=><span key={name}><i>{name[0]}</i><b>{name}</b></span>)}</div></div>
    {latestBeat && <button className="story-dashboard__last-beat" type="button" onClick={()=>latestBeat.message_id && onJumpToMessage?.(latestBeat.message_id)} disabled={!latestBeat.message_id}><small>LAST IMPORTANT MOMENT</small><strong>{latestBeat.label || latestBeat.note || "Story beat"}</strong>{latestBeat.detail && <p>{latestBeat.detail}</p>}</button>}
    {recentMemories.length > 0 && <div className="story-dashboard__memories"><div className="story-hub__mini-heading"><Sparkles size={14}/> Recent memories</div>{recentMemories.slice(0,4).map((memory)=><article key={memory.id}><small>{String(memory.category || "memory").toUpperCase()}</small><p>{memory.content}</p>{memory.why_remembered && <span>Why remembered: {memory.why_remembered}</span>}</article>)}</div>}
    <div className="story-dashboard__two-col">
      <div className="story-hub__overview-block"><div className="story-hub__mini-heading"><ListTodo size={14}/> Open threads</div>{openThreads.length ? openThreads.slice(0,5).map((thread,index)=><div className="story-hub__compact-row" key={thread.id || index}><span>{thread.title || thread.label || thread || "Unfinished thread"}</span><small>{thread.detail || thread.context || "Still unresolved"}</small></div>) : <p className="story-hub__empty">No loose threads right now.</p>}</div>
      <div className="story-hub__overview-block"><div className="story-hub__mini-heading"><BookOpen size={14}/> Chapters</div>{(hub?.chapters || []).length ? [...hub.chapters].slice(-4).reverse().map((chapter)=><div className="story-hub__compact-row" key={`${chapter.number}-${chapter.title}`}><span>{chapter.title}</span><small>Chapter {chapter.number}</small></div>) : <p className="story-hub__empty">Long time jumps will begin new chapters automatically.</p>}</div>
    </div>
    {(intelligence?.knowledge?.length || intelligence?.commitments?.length) ? <details className="story-dashboard__continuity"><summary>Continuity ledger</summary>{(intelligence.knowledge || []).slice(-4).map((item,index)=><div key={`know-${index}`}><b>{item.who || "Someone"}</b><span>{item.knows}</span><small>{item.status || "known"}{item.source ? ` · ${item.source}` : ""}</small></div>)}</details> : null}
  </section>;
}

function safeFile(value="story"){return String(value).replace(/[<>:"/\\|?*\u0000-\u001f]/g,"").replace(/\s+/g," ").trim().slice(0,80)||"story";}
function formatDate(value){ if(!value) return ""; return new Date(value).toLocaleDateString([], { day:"2-digit", month:"short" }); }
