import { useEffect, useRef, useState } from "react";
import { Activity, ArrowLeft, Check, Crown, Download, Eye, FileDown, FileUp, Heart, LoaderCircle, MessageCircle, MonitorSmartphone, Moon, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Sun, Trash2, Type, WifiOff, X, Wrench } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useFeedback } from "../context/FeedbackContext";
import { usePWA } from "../context/PWAContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { VELVET_BUILD_TIME, VELVET_RELEASE, VELVET_VERSION } from "../config/version";
import { isSafeModeEnabled, leaveVelvetSafeMode, startVelvetSafeMode } from "../utils/safeMode";
import {
  createAccountSafetySnapshotV34915,
  deleteAccountSafetySnapshotV34915,
  downloadSafetyPayloadV34915,
  listAccountSafetySnapshotsV34915,
  restoreAccountSafetySnapshotV34915,
} from "../utils/dataSafetyV34915";
import "../styles/settings.css";

function Settings({ onBack, onOpenDiagnostics }) {
  const { settings, storySyncReady, updateSetting, removeStoryFeedback, resetSettings } = useSettings();
  const { confirmAction } = useFeedback();
  const pwa = usePWA();
  const { theme, setTheme } = useTheme();
  const [health, setHealth] = useState({ supabase: "checking", engine: "checking", engineVersion: "" });
  const [safeMode, setSafeMode] = useState(() => isSafeModeEnabled());
  const [safeModeBusy, setSafeModeBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupNotice, setBackupNotice] = useState("");
  const [safetySnapshots, setSafetySnapshots] = useState([]);
  const [plan, setPlan] = useState({ name: "free", status: "active", usedToday: 0, dailyLimit: 30, loading: true });
  const restoreInputRef = useRef(null);
  const { user } = useAuth();
  useEffect(() => {
    let live = true;
    (async () => {
      let supabaseState = "offline";
      let engineState = "offline";
      try {
        const { data, error } = await supabase.auth.getSession();
        supabaseState = !error && data?.session ? "connected" : "signed out";
      } catch {}
      try {
        const { data, error } = await supabase.functions.invoke("character-chat", { body: { action: "diagnostics", probeAi: false } });
        engineState = !error && data?.edge?.ok ? "connected" : "unavailable";
        const { data: releaseData } = await supabase.functions.invoke("character-chat", { body: { action: "release_status" } });
        if (live && releaseData?.engineVersion) setHealth((current) => ({ ...current, engineVersion: String(releaseData.engineVersion) }));
      } catch {}
      if (live) setHealth({ supabase: supabaseState, engine: engineState });
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("velvet-burgundy-route");
    document.body.classList.add("velvet-burgundy-route");
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.getAttribute("content") || "";
    const colors = { light: "#f7eff2", comfort: "#eee4dc", dark: "#10090e" };
    themeMeta?.setAttribute("content", colors[theme] || colors.dark);
    return () => {
      document.documentElement.classList.remove("velvet-burgundy-route");
      document.body.classList.remove("velvet-burgundy-route");
      if (themeMeta && previousThemeColor) themeMeta.setAttribute("content", previousThemeColor);
    };
  }, [theme]);
  useEffect(() => {
    if (!user?.id) { setSafetySnapshots([]); return; }
    listAccountSafetySnapshotsV34915(user.id).then(setSafetySnapshots).catch(()=>setSafetySnapshots([]));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) { setPlan({ name:"free", status:"active", usedToday:0, dailyLimit:30, loading:false }); return; }
    let live = true;
    (async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const [{ data: subscription }, { count }] = await Promise.all([
        supabase.from("subscriptions").select("plan,status,founder_price").eq("user_id", user.id).maybeSingle(),
        supabase.from("ai_usage_events").select("id", { count:"exact", head:true }).eq("user_id", user.id).gte("created_at", today.toISOString()),
      ]);
      if (!live) return;
      const name = String(subscription?.plan || "free");
      setPlan({ name, status:String(subscription?.status || "active"), founder:Boolean(subscription?.founder_price), usedToday:Number(count || 0), dailyLimit:name==="owner"?null:name==="plus"?300:30, loading:false });
    })().catch(()=>live&&setPlan((current)=>({ ...current, loading:false })));
    return () => { live=false; };
  }, [user?.id]);

  async function refreshLocalSafetySnapshots() {
    if (!user?.id) return;
    try { setSafetySnapshots(await listAccountSafetySnapshotsV34915(user.id)); } catch {}
  }

  async function exportVelvetBackup() {
    if (!user?.id || backupBusy) return;
    setBackupBusy(true); setBackupNotice("");
    try {
      const snapshot = await createAccountSafetySnapshotV34915({ supabase, userId:user.id, reason:"manual-export" });
      downloadSafetyPayloadV34915(`Velvet-Backup-${new Date().toISOString().slice(0,10)}.json`, snapshot.payload);
      await refreshLocalSafetySnapshots();
      setBackupNotice(`Backup ready · ${snapshot.recordCount} records saved locally and downloaded${snapshot.skippedCount ? ` · ${snapshot.skippedCount} optional sections unavailable` : ""}.`);
    } catch (error) {
      setBackupNotice(error?.message || "Velvet couldn't create the backup.");
    } finally { setBackupBusy(false); }
  }

  async function restoreVelvetBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user?.id || backupBusy) return;
    let payload;
    try { payload = JSON.parse(await file.text()); } catch { return setBackupNotice("That file isn't a valid Velvet backup."); }
    if (payload?.format !== "velvet-full-backup" || !payload?.tables) return setBackupNotice("That file isn't a full Velvet backup.");
    if (payload.userId && payload.userId !== user.id) return setBackupNotice("This backup belongs to a different Velvet account.");
    const approved = await confirmAction({ title:"Restore this Velvet backup?", message:"Existing rows with the same IDs will be updated. Current stories not present in the backup are left alone.", confirmLabel:"Restore backup" });
    if (!approved) return;
    setBackupBusy(true); setBackupNotice("");
    try {
      const result = await restoreAccountSafetySnapshotV34915({ supabase, userId:user.id, payload });
      setBackupNotice(`Restore finished · ${result.restored} records${result.failures.length ? ` · ${result.failures.length} optional sections need attention` : ""}. Reopen Velvet to refresh everything.`);
    } catch (error) { setBackupNotice(error?.message || "Restore stopped unexpectedly."); }
    finally { setBackupBusy(false); }
  }

  async function createLocalSafetyCopy() {
    if (!user?.id || backupBusy) return;
    try {
      setBackupBusy(true); setBackupNotice("");
      const snapshot = await createAccountSafetySnapshotV34915({ supabase, userId:user.id, reason:"manual-local" });
      await refreshLocalSafetySnapshots();
      setBackupNotice(`Local Safety Vault updated · ${snapshot.recordCount} records protected.`);
    } catch (error) { setBackupNotice(error?.message || "Velvet couldn't create a local safety copy."); }
    finally { setBackupBusy(false); }
  }

  async function restoreLatestLocalSafetyCopy() {
    const latest = safetySnapshots[0];
    if (!latest || backupBusy || !user?.id) return;
    const approved = await confirmAction({ title:"Restore the latest local safety copy?", message:`Captured ${formatSafetyTime(latest.capturedAt)}. Existing rows with the same IDs will be updated.`, confirmLabel:"Restore local copy" });
    if (!approved) return;
    try {
      setBackupBusy(true); setBackupNotice("");
      const result = await restoreAccountSafetySnapshotV34915({ supabase, userId:user.id, payload:latest.payload });
      setBackupNotice(`Local restore finished · ${result.restored} records restored${result.failures.length ? ` · ${result.failures.length} optional sections skipped` : ""}.`);
    } catch (error) { setBackupNotice(error?.message || "Velvet couldn't restore the local safety copy."); }
    finally { setBackupBusy(false); }
  }

  function downloadLatestLocalSafetyCopy() {
    const latest = safetySnapshots[0];
    if (!latest) return;
    downloadSafetyPayloadV34915(`Velvet-Safety-${new Date(latest.capturedAt).toISOString().slice(0,10)}.json`, latest.payload);
  }

  async function removeLocalSafetyCopy(snapshotId) {
    await deleteAccountSafetySnapshotV34915(snapshotId);
    await refreshLocalSafetySnapshots();
  }

  async function confirmReset() { if (await confirmAction({ title: "Reset all preferences?", message: "Reading, story style, learned feedback, export and safety preferences will return to their defaults.", confirmLabel: "Reset settings" })) resetSettings(); }
  async function toggleSafeMode() {
    if (safeModeBusy) return;
    setSafeModeBusy(true);
    try {
      if (safeMode) leaveVelvetSafeMode();
      else await startVelvetSafeMode();
      setSafeMode(!safeMode);
    } finally { setSafeModeBusy(false); }
  }
  const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: settings.reduceMotion ? "auto" : "smooth", block: "start" });
  return <section className="settings-page settings-page--editorial">
    <header className="page-heading settings-page__heading"><div><button onClick={onBack}><ArrowLeft size={17}/>Profile</button><p>YOUR VELVET</p><h1>Settings</h1><span>Everything you can shape, protect and update, in one calm place.</span></div></header>
    <nav className="settings-page__nav" aria-label="Settings sections">
      <button onClick={()=>jumpTo("settings-personalize")}><Sparkles size={14}/>Personalize</button>
      <button onClick={()=>jumpTo("settings-storytelling")}><Heart size={14}/>Stories</button>
      <button onClick={()=>jumpTo("settings-safety")}><ShieldCheck size={14}/>Safety</button>
      <button onClick={()=>jumpTo("settings-updates")}><RefreshCw size={14}/>Updates</button>
      <button onClick={()=>jumpTo("settings-system")}><Wrench size={14}/>System</button>
    </nav>
    <div className="settings-plan-card">
      <span className="settings-plan-card__icon"><Crown size={20}/></span>
      <div className="settings-plan-card__copy"><small>VELVET PLAN</small><strong>{plan.loading ? "Checking…" : plan.name === "owner" ? "Owner" : plan.name === "plus" ? "Velvet+" : "Velvet Free"}</strong><span>{plan.name === "owner" ? "Full access · no daily generation limit" : plan.name === "plus" ? "Up to 300 AI generations per day" : "30 AI generations per day"}</span></div>
      <div className="settings-plan-card__usage"><small>TODAY</small><strong>{plan.loading ? "…" : plan.dailyLimit ? `${plan.usedToday} / ${plan.dailyLimit}` : "∞"}</strong><span>{plan.name === "free" ? "Velvet+ founder price · $2.990 CLP/month · coming soon" : plan.name === "plus" ? (plan.founder ? "Founder plan" : "Plus plan") : "Creator account"}</span></div>
    </div>
    <div className="settings-section-label" id="settings-personalize"><span>01</span><div><strong>Personalize</strong><small>How Velvet looks and feels on your phone.</small></div></div>
    <div className="settings-group" id="settings-appearance"><header><Eye size={19}/><div><h2>Appearance</h2><p>Choose the light that feels best for reading.</p></div></header>
      <div className="setting-row"><strong>Theme</strong><div className="setting-segments">
        <button className={theme==='light'?'active':''} onClick={()=>setTheme('light')}><Sun size={14}/> Light</button>
        <button className={theme==='dark'?'active':''} onClick={()=>setTheme('dark')}><Moon size={14}/> Dark</button>
        <button className={theme==='comfort'?'active':''} onClick={()=>setTheme('comfort')}><Eye size={14}/> Comfort</button>
      </div></div>
    </div>
    <div className="settings-group settings-group--reading"><header><Type size={19}/><div><h2>Reading experience</h2><p>Adjust stories without changing their content.</p></div></header>
      <SettingChoice label="Text size" value={settings.textSize} options={[['compact','Compact'],['comfortable','Comfortable'],['large','Large']]} onChange={(value)=>updateSetting('textSize',value)}/>
      <SettingChoice label="Interface density" value={settings.density} options={[['comfortable','Comfortable'],['compact','Compact']]} onChange={(value)=>updateSetting('density',value)}/>
      <Toggle label="Reduce motion" description="Minimize transitions and animated effects." checked={settings.reduceMotion} onChange={(value)=>updateSetting('reduceMotion',value)}/>
      <Toggle label="Message timestamps" description="Show the exact time below every message." checked={settings.showMessageTimestamps} onChange={(value)=>updateSetting('showMessageTimestamps',value)}/>
      <Toggle label="Haptic feedback" description="Use a tiny vibration when sending or stopping on supported phones." checked={settings.haptics} onChange={(value)=>updateSetting('haptics',value)}/>
      <SettingChoice label="Desktop Enter key" value={settings.enterToSend === false ? "newline" : "send"} options={[["send","Send message"],["newline","New line"]]} onChange={(value)=>updateSetting("enterToSend",value === "send")}/>
      <SettingChoice label="Reading width" value={settings.readingWidth || "comfortable"} options={[["narrow","Narrow"],["comfortable","Comfortable"],["wide","Wide"]]} onChange={(value)=>updateSetting("readingWidth",value)}/>
      <SettingChoice label="Reading font" value={settings.readingFont || "clean"} options={[["clean","Clean"],["serif","Book serif"]]} onChange={(value)=>updateSetting("readingFont",value)}/>
    </div>
    <div className="settings-section-label" id="settings-storytelling"><span>02</span><div><strong>Your stories</strong><small>Shape the reading and storytelling experience.</small></div></div>
    <div className="settings-group settings-story-dna"><header><Heart size={19}/><div><h2>How I like stories</h2><p>Your global storytelling style. Character identity still comes first.</p></div></header>
      <SettingChoice label="Prose" value={settings.storyProse} options={[["contemporary","Natural"],["literary","Literary"],["minimal","Clean"]]} onChange={(value)=>updateSetting("storyProse",value)}/>
      <SettingChoice label="Conversation" value={settings.storyDialogue} options={[["dialogue_forward","Dialogue-forward"],["balanced","Balanced"],["narration_forward","Narration-forward"]]} onChange={(value)=>updateSetting("storyDialogue",value)}/>
      <SettingChoice label="Emotional interior" value={settings.storyEmotion} options={[["interior_visible","Visible"],["subtle","Subtle"],["restrained","Restrained"]]} onChange={(value)=>updateSetting("storyEmotion",value)}/>
      <SettingChoice label="Romance pacing" value={settings.storyPacing} options={[["medium_fast","Medium / fast"],["medium","Medium"],["slow","Slow burn"]]} onChange={(value)=>updateSetting("storyPacing",value)}/>
      <div className="settings-story-director">
        <div className="settings-story-director__heading"><Sparkles size={16}/><span><strong>Current direction</strong><small>Steer the scene without writing instructions into the chat.</small></span></div>
        <SettingChoice label="Romantic tension" value={settings.storyRomanticTension || "high"} options={[["low","Low"],["medium","Medium"],["high","High"]]} onChange={(value)=>updateSetting("storyRomanticTension",value)}/>
        <SettingChoice label="Jealousy" value={settings.storyJealousy || "subtle"} options={[["off","Off"],["subtle","Subtle"],["medium","Medium"],["high","High"]]} onChange={(value)=>updateSetting("storyJealousy",value)}/>
        <SettingChoice label="Character initiative" value={settings.storyCharacterInitiative || "high"} options={[["balanced","Balanced"],["high","High"],["very_high","Very high"]]} onChange={(value)=>updateSetting("storyCharacterInitiative",value)}/>
        <SettingChoice label="Scene pace" value={settings.storyScenePace || "fast"} options={[["slow","Slow"],["steady","Steady"],["fast","Fast"]]} onChange={(value)=>updateSetting("storyScenePace",value)}/>
      </div>
      <label className="settings-story-dna__notes">
        <span><MessageCircle size={15}/><strong>Anything else Velvet should remember?</strong></span>
        <textarea value={settings.storyInstructions || ""} maxLength={900} rows="4" onChange={(event)=>updateSetting("storyInstructions",event.target.value)} placeholder="For example: Keep the dialogue natural and let important admissions affect the character before they answer." />
        <small>{String(settings.storyInstructions || "").length}/900 · Applied silently to every character.</small>
      </label>
      <LearnedStoryPreferences
        positiveCounts={settings.storyPositiveFeedbackCounts}
        negativeCounts={settings.storyNegativeFeedbackCounts}
        onRemove={removeStoryFeedback}
      />
    </div>
    <div className="settings-section-label" id="settings-safety"><span>03</span><div><strong>Safety & data</strong><small>Backups, recovery and protection for your Velvet world.</small></div></div>
    <div className="settings-group settings-group--exports"><header><FileDown size={19}/><div><h2>Stories & backup</h2><p>Export one story normally, or keep a full safety copy of your Velvet world.</p></div></header>
      <SettingChoice label="Default story export" value={settings.exportFormat} options={[["markdown","Markdown"],["text","Plain text"],["json","JSON story"]]} onChange={(value)=>updateSetting("exportFormat",value)}/>
      <div className="v312-backup-center v34915-safety-center">
        <div><strong>Safety Vault</strong><small>Velvet keeps up to five private local account snapshots for 30 days. One is refreshed automatically each day; manual downloads still work too.</small></div>
        <div className="v312-backup-center__actions">
          <button type="button" onClick={exportVelvetBackup} disabled={backupBusy}>{backupBusy?<LoaderCircle className="spin" size={15}/>:<FileDown size={15}/>}Back up & download</button>
          <button type="button" onClick={createLocalSafetyCopy} disabled={backupBusy}><ShieldCheck size={15}/>Save local copy</button>
          <button type="button" onClick={()=>restoreInputRef.current?.click()} disabled={backupBusy}><FileUp size={15}/>Restore file</button>
          <input ref={restoreInputRef} type="file" accept="application/json,.json" hidden onChange={restoreVelvetBackup}/>
        </div>
        <div className="v34915-safety-snapshots">
          <header><span><ShieldCheck size={15}/><strong>Local recovery copies</strong></span><small>{safetySnapshots.length}/5</small></header>
          {safetySnapshots.length ? <div>{safetySnapshots.map((snapshot,index)=><article key={snapshot.id} className={index===0?"is-latest":""}><span><strong>{index===0?"Latest safety copy":"Earlier safety copy"}</strong><small>{formatSafetyTime(snapshot.capturedAt)} · {snapshot.recordCount || 0} records · {snapshot.reason === "automatic-daily" ? "automatic" : "manual"}</small></span><span className="v34915-safety-snapshot-actions">{index===0&&<><button type="button" onClick={restoreLatestLocalSafetyCopy} disabled={backupBusy}><RotateCcw size={14}/>Restore</button><button type="button" onClick={downloadLatestLocalSafetyCopy}><Download size={14}/>Download</button></>}<button type="button" className="danger" onClick={()=>removeLocalSafetyCopy(snapshot.id)} aria-label="Remove local safety copy"><Trash2 size={14}/></button></span></article>)}</div> : <p className="v34915-safety-empty">No local safety copy yet. Velvet will create one automatically after you sign in, or you can make one now.</p>}
        </div>
        {backupNotice&&<p className="v312-backup-center__notice">{backupNotice}</p>}
      </div>
    </div>
    <div className="settings-group" id="settings-privacy"><header><ShieldCheck size={19}/><div><h2>Privacy & safety</h2><p>Protection against accidental destructive actions.</p></div></header>
      <Toggle label="Confirm before deleting" description="Ask before deleting characters, conversations and lore." checked={settings.confirmBeforeDelete} onChange={(value)=>updateSetting('confirmBeforeDelete',value)}/>
    </div>
    <div className="settings-section-label" id="settings-updates"><span>04</span><div><strong>Updates</strong><small>You choose when this phone moves to a new Velvet build.</small></div></div>
    <div className="settings-group settings-update-center"><header><RefreshCw size={19}/><div><h2>Velvet updates</h2><p>You decide when the app on this phone changes.</p></div></header>
      <div className="settings-update-center__status">
        <div><small>APP ON THIS PHONE</small><strong>v{pwa.localVersion}</strong><em>{pwa.serverUpdateAvailable ? `v${pwa.serverVersion} is ready` : "Latest app installed ✓"}</em></div>
        <div><small>STORY ENGINE</small><strong>{health.engineVersion ? `Engine ${health.engineVersion}` : health.engine === "checking" ? "Checking…" : "Connected"}</strong><em>{health.engine === "connected" ? "Live on Supabase ✓" : health.engine}</em></div>
      </div>
      <div className="settings-update-center__actions">
        <button type="button" onClick={()=>pwa.checkForUpdate({ silent:false })} disabled={pwa.checkingForUpdate || pwa.updating}><RefreshCw size={16}/>{pwa.checkingForUpdate ? "Checking…" : "Check for updates"}</button>
        <button type="button" className="primary" onClick={pwa.updateApp} disabled={pwa.updating || (!pwa.serverUpdateAvailable && !pwa.needRefresh)}>{pwa.updating ? "Updating Velvet…" : pwa.serverUpdateAvailable || pwa.needRefresh ? `Update to v${pwa.serverVersion || "latest"}` : "Velvet is up to date ✓"}</button>
        {pwa.updateProblem && <button type="button" onClick={pwa.repairUpdate}>Repair updater</button>}
      </div>
      <p className="settings-update-center__note">Checking never installs anything. When a new app build is available, Velvet waits for you to press Update.</p>
    </div>
    <div className="settings-section-label" id="settings-system"><span>05</span><div><strong>System</strong><small>Installation, diagnostics and technical details.</small></div></div>
    <div className="settings-group settings-diagnostics" id="settings-app"><header><Activity size={19}/><div><h2>AI & diagnostics</h2><p>Check the app version, mobile touch, Supabase, the Edge Function and Gemini separately.</p></div></header><div className="settings-install__body"><span className="settings-install__icon">✦</span><div><strong>Something acting weird?</strong><small>Open diagnostics before changing code or reinstalling the app.</small></div><button onClick={onOpenDiagnostics}><Activity size={17}/>Open diagnostics</button></div><div className={`settings-safe-mode${safeMode ? " is-active" : ""}`}><span><Wrench size={17}/><span><strong>Velvet Safe Mode</strong><small>Temporarily disables motion-heavy extras, then clears only app cache. Stories, characters and Memories stay untouched.</small></span></span><button type="button" onClick={toggleSafeMode} disabled={safeModeBusy}>{safeModeBusy ? "Working…" : safeMode ? "Leave Safe Mode" : "Start Safe Mode"}</button></div></div>
    <div className="settings-group settings-install"><header><MonitorSmartphone size={19}/><div><h2>Velvet on your phone</h2><p>Install it with its own icon and full-screen experience.</p></div></header>
      <div className="settings-install__body">
        <span className="settings-install__icon">✦</span>
        <div>
          <strong>{pwa.installed ? "Velvet Stories is installed" : "Add Velvet Stories to your home screen"}</strong>
          <small>{pwa.installed ? "You are already using the app experience." : "It opens without browser controls and stays close to your stories."}</small>
          <em><WifiOff size={13}/>The interface works offline. AI replies still require Wi-Fi or mobile data.</em>
        </div>
        {!pwa.installed && <button onClick={pwa.installApp}><Download size={17}/>Install app</button>}
        {pwa.installed && <span className="settings-install__installed"><Check size={16}/>Installed</span>}
      </div>
    </div>
    <details className="settings-group settings-about settings-about--collapsed" id="settings-about"><summary><span><Sparkles size={18}/><span><strong>Technical details</strong><small>Version, build, connection and engine status</small></span></span><span>View</span></summary><div className="settings-about__inside"><header><Sparkles size={19}/><div><h2>About Velvet</h2><p>Know exactly which build is on your phone before chasing ghosts.</p></div></header>
      <div className="settings-about__grid">
        <span><small>VERSION</small><strong>Velvet Stories {VELVET_VERSION}</strong><em>{VELVET_RELEASE}</em></span>
        <span><small>BUILD</small><strong>Production build</strong><em>{formatBuild(VELVET_BUILD_TIME)}</em></span>
        <span><small>SUPABASE</small><strong>{health.supabase === "connected" ? "Connected ✓" : health.supabase}</strong><em>Private account sync</em></span>
        <span><small>STORY ENGINE</small><strong>{health.engineVersion ? `Engine ${health.engineVersion} ✓` : health.engine === "connected" ? "Connected ✓" : health.engine}</strong><em>Edge Function health</em></span>
        <span><small>PWA</small><strong>{pwa.serverUpdateAvailable ? `Update v${pwa.serverVersion} ready` : "Up to date ✓"}</strong><em>Installed v{pwa.localVersion}</em></span>
        <span><small>SAFE MODE</small><strong>{safeMode ? "Active" : "Off ✓"}</strong><em>{safeMode ? "Heavy effects paused" : "Normal Velvet experience"}</em></span>
      </div>
      <div className="settings-about__actions"><button onClick={()=>pwa.checkForUpdate({ silent:false })} disabled={pwa.checkingForUpdate}><RefreshCw size={16}/>{pwa.checkingForUpdate ? "Checking…" : "Check for update"}</button>{pwa.serverUpdateAvailable && <button className="primary" onClick={pwa.updateApp} disabled={pwa.updating}>{pwa.updating ? "Updating…" : "Update now"}</button>}{pwa.updateProblem && <button onClick={pwa.repairUpdate}>Repair updater</button>}</div>
    </div></details>
    <button className="settings-page__reset" onClick={confirmReset}><RotateCcw size={16}/>Reset preferences</button>
    <div className="settings-page__saved"><Check size={15}/>{storySyncReady ? "Story preferences sync to your Velvet account." : "Saving preferences…"}</div>
  </section>;
}

function SettingChoice({ label, value, options, onChange }) { return <div className="setting-row"><strong>{label}</strong><div className="setting-segments">{options.map(([id,name])=><button key={id} className={value===id?'active':''} onClick={()=>onChange(id)}>{value===id&&<Sparkles size={13}/>} {name}</button>)}</div></div>; }
function Toggle({ label, description, checked, onChange }) { return <label className="setting-toggle"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event)=>onChange(event.target.checked)}/><i/></label>; }

const feedbackLabels = {
  voice: "Keep this character voice",
  emotion: "Keep the emotional depth",
  dialogue: "Keep this dialogue balance",
  pacing: "Keep this pacing",
  ignored_idea: "Follow my direction",
  too_short: "Finish the full beat",
  out_of_character: "Protect character voice",
  too_much_narration: "Use less narration",
  not_enough_dialogue: "Use more dialogue",
  repetitive: "Avoid repeated beats",
  pov_violation: "Never control my POV",
  missing_emotional_impact: "Show emotional impact",
};

function LearnedStoryPreferences({ positiveCounts = {}, negativeCounts = {}, onRemove }) {
  const positive = Object.entries(positiveCounts || {}).filter(([, count]) => Number(count) > 0);
  const negative = Object.entries(negativeCounts || {}).filter(([, count]) => Number(count) > 0);
  if (!positive.length && !negative.length) return <div className="settings-story-dna__learning"><Sparkles size={15}/><span>Use 👍 or 👎 under replies. After the same choice twice, Velvet applies that preference to every character.</span></div>;
  return <div className="settings-story-dna__learned">
    <div><span><Sparkles size={15}/><strong>What Velvet has learned</strong></span></div>
    <LearningPreferenceGroup title="Preserve" kind="positive" entries={positive} onRemove={onRemove}/>
    <LearningPreferenceGroup title="Avoid" kind="negative" entries={negative} onRemove={onRemove}/>
  </div>;
}

function LearningPreferenceGroup({ title, kind, entries, onRemove }) {
  if (!entries.length) return null;
  return <section className="settings-story-dna__preference-group">
    <h3>{title}</h3>
    <p>{entries.map(([code, count])=><em key={code} className={Number(count) >= 2 ? "learned" : "learning"}>
      <span>{feedbackLabels[code] || code}<small>{Number(count) >= 2 ? `Learned · ${count}` : `${count}/2`}</small></span>
      <button onClick={()=>onRemove(kind, code)} aria-label={`Forget ${feedbackLabels[code] || code}`}><X size={12}/></button>
    </em>)}</p>
  </section>;
}
function formatBuild(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" }); }
function formatSafetyTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return `Today · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}


export default Settings;
