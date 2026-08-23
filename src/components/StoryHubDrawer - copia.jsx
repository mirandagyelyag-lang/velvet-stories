import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark, BookOpen, ChevronRight, Download, FileDown, GitBranch, HeartHandshake,
  ImagePlus, ListTodo, MapPin, Music2, Pause, Play, RotateCcw, Search, Sparkles, Star, Trash2,
  Upload, UserRound, Users, Volume2, Square, X,
} from "lucide-react";
import { useChats } from "../context/ChatsContext";
import { useCharacters } from "../context/CharactersContext";
import { useFeedback } from "../context/FeedbackContext";
import { exportStoryBook, downloadStoryBackup } from "../utils/storyExport";
import { AMBIENT_MODES, normalizeAmbientMode, readAmbienceVolume, writeAmbienceVolume } from "./StoryAmbience";
import { suggestAmbienceForScene } from "../utils/ambienceIntelligence";
import { getDeviceVoices, getVoiceCapabilities, speakText, stopSpeech } from "../utils/speech";
import { getAudioState, readAudioPreference, stopAllAudio, subscribeAudioState, writeAudioPreference } from "../utils/audioBus";

const TABS = [
  ["dashboard", "Story", BookOpen],
  ["saved", "Moments", Bookmark],
  ["experience", "Experience", Sparkles],
  ["backups", "Backups", RotateCcw],
  ["timelines", "Timelines", GitBranch],
];

export default function StoryHubDrawer({
  open, onClose, character, characters = [], persona = null, lorebook = null,
  onJumpToMessage, onOpenConversation, ambientSoundOn = false, onAmbientSoundToggle, recentSceneText = "",
}) {
  const {
    getStoryHubData, searchConversationMessages, getConversation,
    updateStoryExperience, uploadStoryCover, createStorySnapshot, listStorySnapshots,
    deleteStorySnapshot, restoreStorySnapshot, exportStoryBackupData, importStoryBackupData,
    getStoryExportData,
  } = useChats();
  const { updateCharacterVoice } = useCharacters();
  const { confirmAction } = useFeedback();
  const conversation = getConversation(character.id);
  const [tab, setTab] = useState("dashboard");
  const [hub, setHub] = useState(null);
  const currentAmbientMode = normalizeAmbientMode(conversation?.ambientMode || hub?.ambientMode || "none");
  const currentAmbientVolume = Number(conversation?.ambientVolume ?? hub?.ambientVolume ?? 18);
  const ambienceSuggestion = useMemo(() => suggestAmbienceForScene(recentSceneText), [recentSceneText]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [busy, setBusy] = useState("");
  const [coverDraft, setCoverDraft] = useState({ title: "", mood: "" });
  const [voiceDraft, setVoiceDraft] = useState({ voiceName: "", rate: 1, pitch: 1, volume: 100 });
  const [voiceLanguage, setVoiceLanguage] = useState("all");
  const [voiceGender, setVoiceGender] = useState("all");
  const [favoriteVoiceIds, setFavoriteVoiceIds] = useState(() => { try { return JSON.parse(localStorage.getItem("velvet_favorite_voices") || "[]"); } catch { return []; } });
  const [onlyFavoriteVoices, setOnlyFavoriteVoices] = useState(false);
  const [audioState, setAudioState] = useState(getAudioState);
  const [voices, setVoices] = useState([]);
  const [voiceTesting, setVoiceTesting] = useState(false);
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
        const legacyVoiceVolume = Number(readAudioPreference("voice", character.id, { volume: 100 }).volume ?? 100);
        const storyVoiceVolume = Number(readAudioPreference("story", conversation.conversationId, { voiceVolume: legacyVoiceVolume }).voiceVolume ?? legacyVoiceVolume);
        setVoiceDraft({
          voiceName: character.ttsVoiceName || "",
          rate: Number(character.ttsRate ?? 1),
          pitch: Number(character.ttsPitch ?? 1),
          volume: storyVoiceVolume,
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

  useEffect(() => {
    if (!open || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(getDeviceVoices());
    load();
    const retry = window.setTimeout(load, 350);
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => {
      window.clearTimeout(retry);
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
      stopSpeech();
      setVoiceTesting(false);
    };
  }, [open]);

  useEffect(() => subscribeAudioState(setAudioState), []);

  const voiceCapabilities = useMemo(() => getVoiceCapabilities(), [voices.length]);
  const filteredVoices = useMemo(() => voices.filter((voice) => {
    const id = voice.voiceURI || voice.name;
    if (voiceLanguage !== "all" && voice.lang !== voiceLanguage) return false;
    if (voiceGender !== "all" && String(voice.gender || "").toLowerCase() !== voiceGender) return false;
    if (onlyFavoriteVoices && !favoriteVoiceIds.includes(id)) return false;
    return true;
  }), [voices, voiceLanguage, voiceGender, onlyFavoriteVoices, favoriteVoiceIds]);

  function toggleFavoriteVoice() {
    const id = String(voiceDraft.voiceName || "").trim();
    if (!id) return;
    setFavoriteVoiceIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try { localStorage.setItem("velvet_favorite_voices", JSON.stringify(next)); } catch {}
      return next;
    });
  }

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

  async function saveVoice() {
    try {
      setBusy("voice");
      setNotice("");
      await updateCharacterVoice(character.id, voiceDraft);
      const voiceVolume = Number(voiceDraft.volume ?? 100);
      writeAudioPreference("voice", character.id, { volume: voiceVolume, engine: "device" });
      if (conversation?.conversationId) writeAudioPreference("story", conversation.conversationId, { voiceVolume });
      setNotice("Voice saved. Volume remembered for this story.");
    } catch (error) { setNotice(error.message || "Could not save the voice."); }
    finally { setBusy(""); }
  }

  function stopVoiceTest() {
    stopSpeech();
    setVoiceTesting(false);
  }

  function testVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return setNotice("Text to speech is not available on this device.");
    }
    setNotice("");
    setVoiceTesting(true);
    speakText({
      text: `This is ${character.name}. ${character.exampleDialogue || character.firstMessage || "Ready when you are."}`,
      voiceId: String(voiceDraft.voiceName || ""),
      rate: Number(voiceDraft.rate || 1),
      pitch: Number(voiceDraft.pitch || 1),
      volume: Math.max(0, Math.min(1, Number(voiceDraft.volume ?? 100) / 100)),
      label: `${character.name} voice preview`,
      onEnd: () => setVoiceTesting(false),
      onError: (error) => {
        setVoiceTesting(false);
        if (error?.error && error.error !== "interrupted") {
          setNotice(`Voice stopped: ${error.error}. Try another installed device voice.`);
        }
      },
    });
  }

  async function setAmbient(patch) {
    try {
      setBusy("ambient");
      await updateStoryExperience(character.id, patch);
      await refreshHub();
    } catch (error) { setNotice(error.message || "Could not save the atmosphere."); }
    finally { setBusy(""); }
  }

  function chooseAmbientMode(id) {
    const normalized = normalizeAmbientMode(id);
    if (normalized === "none") {
      onAmbientSoundToggle?.(false);
      void setAmbient({ ambientMode: "none" });
      return;
    }
    const remembered = readAmbienceVolume(normalized, normalized === currentAmbientMode ? currentAmbientVolume : 18);
    onAmbientSoundToggle?.(true);
    void setAmbient({ ambientMode: normalized, ambientVolume: remembered });
  }

  function changeAmbientVolume(value) {
    const next = writeAmbienceVolume(currentAmbientMode, value);
    void setAmbient({ ambientVolume: next });
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

          <div className="keepsake-card keepsake-card--audio-center">
            <div className="story-hub__mini-heading"><Music2 size={14}/> Audio Center</div>
            <div className="audio-center__status"><span><small>{audioState.ambiencePaused && !audioState.voiceActive ? "PAUSED" : "NOW PLAYING"}</small><strong>{[audioState.voiceLabel,audioState.ambienceLabel && `${audioState.ambienceLabel}${audioState.ambiencePaused ? " · Paused" : ""}`].filter(Boolean).join(" · ") || "Nothing"}</strong></span><div className="audio-center__transport">{currentAmbientMode!=="none" && <button type="button" onClick={()=>onAmbientSoundToggle?.(!ambientSoundOn)}>{ambientSoundOn ? <Pause size={14}/> : <Play size={14}/>} {ambientSoundOn ? "Pause ambience" : "Resume ambience"}</button>}<button type="button" onClick={()=>{ stopAllAudio(); stopVoiceTest(); onAmbientSoundToggle?.(false); }} disabled={!audioState.voiceActive&&!audioState.ambienceActive&&!audioState.ambiencePaused}><Square size={14}/>Stop all</button></div></div>
            <small>Voice and ambience have separate volume controls. Switching ambience crossfades instead of stacking two rooms on top of each other.</small>
          </div>

          <div className="keepsake-card">
            <div className="story-hub__mini-heading"><Volume2 size={14}/> {character.name}'s voice</div>
            <div className="audio-center__engine"><span><small>ENGINE</small><strong>Device voice · free</strong></span><em>Neural-ready architecture</em></div>
            <div className="audio-center__voice-filters"><select value={voiceLanguage} onChange={(e)=>setVoiceLanguage(e.target.value)}><option value="all">All languages</option>{voiceCapabilities.languages.map((lang)=><option key={lang} value={lang}>{lang}</option>)}</select>{voiceCapabilities.exposesGender && <select value={voiceGender} onChange={(e)=>setVoiceGender(e.target.value)}><option value="all">All voice types</option>{[...new Set(voices.map((voice)=>String(voice.gender||"").toLowerCase()).filter(Boolean))].map((gender)=><option key={gender} value={gender}>{gender}</option>)}</select>}<button type="button" className={onlyFavoriteVoices?"active":""} onClick={()=>setOnlyFavoriteVoices((v)=>!v)}><Star size={14} fill={onlyFavoriteVoices?"currentColor":"none"}/>Favorites</button></div>
            <label>Voice<select value={voiceDraft.voiceName} onChange={(e)=>{ stopVoiceTest(); setVoiceDraft((v)=>({...v,voiceName:e.target.value})); }}><option value="">Device default</option>{filteredVoices.map((voice)=>{ const id=voice.voiceURI||voice.name; return <option key={`${id}-${voice.lang}`} value={id}>{favoriteVoiceIds.includes(id)?"★ ":""}{voice.name} · {voice.lang}</option>; })}</select></label>
            <button type="button" className="audio-center__favorite" onClick={toggleFavoriteVoice} disabled={!voiceDraft.voiceName}><Star size={14} fill={favoriteVoiceIds.includes(voiceDraft.voiceName)?"currentColor":"none"}/>{favoriteVoiceIds.includes(voiceDraft.voiceName)?"Favorited voice":"Favorite this voice"}</button>
            <label>Speed <span>{Number(voiceDraft.rate).toFixed(2)}×</span><input type="range" min=".65" max="1.45" step=".05" value={voiceDraft.rate} onChange={(e)=>setVoiceDraft((v)=>({...v,rate:Number(e.target.value)}))}/></label>
            <label>Pitch <span>{Number(voiceDraft.pitch).toFixed(2)}</span><input type="range" min=".65" max="1.35" step=".05" value={voiceDraft.pitch} onChange={(e)=>setVoiceDraft((v)=>({...v,pitch:Number(e.target.value)}))}/></label><label>Voice volume <span>{Number(voiceDraft.volume ?? 100)}%</span><input type="range" min="0" max="100" step="1" value={voiceDraft.volume ?? 100} onChange={(e)=>{ const volume=Number(e.target.value); setVoiceDraft((v)=>({...v,volume})); if(conversation?.conversationId) writeAudioPreference("story", conversation.conversationId, { voiceVolume: volume }); }}/></label><small className="keepsake-voice-note">Natural cadence is always on: Velvet reads in shorter phrases with human-like pauses and slight prosody changes. The actual timbre still depends on voices installed on your device.</small>
            <div className="keepsake-actions"><button onClick={voiceTesting ? stopVoiceTest : testVoice}>{voiceTesting ? <X size={15}/> : <Volume2 size={15}/>} {voiceTesting ? "Stop" : "Test"}</button><button onClick={saveVoice} disabled={busy==="voice"}>Save voice</button></div>
          </div>

          <div className="keepsake-card keepsake-card--ambience-v2">
            <div className="story-hub__mini-heading"><Music2 size={14}/> Ambient story mode</div>
            {ambienceSuggestion && <div className={`ambience-suggestion${ambienceSuggestion.mode===currentAmbientMode ? " is-active" : ""}`}><span><small>{ambienceSuggestion.mode===currentAmbientMode ? "SCENE MATCH" : "SUGGESTED FOR THIS SCENE"}</small><strong>{ambienceSuggestion.label}</strong>{ambienceSuggestion.reason && <em>{ambienceSuggestion.reason}</em>}</span>{ambienceSuggestion.mode!==currentAmbientMode && <button type="button" onClick={()=>chooseAmbientMode(ambienceSuggestion.mode)}>Use {ambienceSuggestion.label}</button>}</div>}
            <div className="keepsake-ambience">{AMBIENT_MODES.map(([id,label])=><button key={id} className={currentAmbientMode===id?"active":""} onClick={()=>chooseAmbientMode(id)}>{label}</button>)}</div>
            <label>Volume for {AMBIENT_MODES.find(([id])=>id===currentAmbientMode)?.[1] || "ambience"} <span>{currentAmbientVolume}%</span><input type="range" min="0" max="45" value={currentAmbientVolume} onChange={(e)=>changeAmbientVolume(Number(e.target.value))}/></label>
            <div className="ambience-v2__footer"><button className={`keepsake-sound-toggle${ambientSoundOn?" active":""}`} onClick={()=>onAmbientSoundToggle?.(!ambientSoundOn)} disabled={currentAmbientMode==="none"}>{ambientSoundOn ? <Pause size={16}/> : <Play size={16}/>} {ambientSoundOn ? "Pause" : "Resume"}</button><small>Each room remembers its own volume. Switching rooms uses a soft crossfade and loops are blended automatically.</small></div>
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
  const openThreads = (hub?.unfinishedThreads || []).filter((thread)=>thread?.status !== "resolved");
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
