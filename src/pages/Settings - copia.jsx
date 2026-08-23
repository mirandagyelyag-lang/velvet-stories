import { useEffect, useState } from "react";
import { Activity, ArrowLeft, Check, Download, Eye, FileDown, Heart, MessageCircle, MonitorSmartphone, Moon, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Sun, Type, WifiOff, X, Wrench } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useFeedback } from "../context/FeedbackContext";
import { usePWA } from "../context/PWAContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { VELVET_BUILD_TIME, VELVET_RELEASE, VELVET_VERSION } from "../config/version";
import { isSafeModeEnabled, leaveVelvetSafeMode, startVelvetSafeMode } from "../utils/safeMode";
import "../styles/settings.css";

function Settings({ onBack, onOpenDiagnostics }) {
  const { settings, storySyncReady, updateSetting, removeStoryFeedback, resetSettings } = useSettings();
  const { confirmAction } = useFeedback();
  const pwa = usePWA();
  const { theme, setTheme } = useTheme();
  const [health, setHealth] = useState({ supabase: "checking", engine: "checking" });
  const [safeMode, setSafeMode] = useState(() => isSafeModeEnabled());
  const [safeModeBusy, setSafeModeBusy] = useState(false);
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
    <header className="page-heading settings-page__heading"><div><button onClick={onBack}><ArrowLeft size={17}/>Profile</button><p>MAKE VELVET YOURS</p><h1>Settings</h1><span>A quieter control room for reading, storytelling and the app.</span></div></header>
    <nav className="settings-page__nav" aria-label="Settings sections">
      <button onClick={()=>jumpTo("settings-appearance")}>Appearance</button>
      <button onClick={()=>jumpTo("settings-storytelling")}>Storytelling</button>
      <button onClick={()=>jumpTo("settings-app")}>AI & app</button>
      <button onClick={()=>jumpTo("settings-privacy")}>Privacy</button>
      <button onClick={()=>jumpTo("settings-about")}>About</button>
    </nav>
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
    <div className="settings-group settings-story-dna" id="settings-storytelling"><header><Heart size={19}/><div><h2>How I like stories</h2><p>Your global storytelling style. Character identity still comes first.</p></div></header>
      <SettingChoice label="Prose" value={settings.storyProse} options={[["contemporary","Natural"],["literary","Literary"],["minimal","Clean"]]} onChange={(value)=>updateSetting("storyProse",value)}/>
      <SettingChoice label="Conversation" value={settings.storyDialogue} options={[["dialogue_forward","Dialogue-forward"],["balanced","Balanced"],["narration_forward","Narration-forward"]]} onChange={(value)=>updateSetting("storyDialogue",value)}/>
      <SettingChoice label="Emotional interior" value={settings.storyEmotion} options={[["interior_visible","Visible"],["subtle","Subtle"],["restrained","Restrained"]]} onChange={(value)=>updateSetting("storyEmotion",value)}/>
      <SettingChoice label="Romance pacing" value={settings.storyPacing} options={[["medium_fast","Medium / fast"],["medium","Medium"],["slow","Slow burn"]]} onChange={(value)=>updateSetting("storyPacing",value)}/>
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
    <div className="settings-group settings-group--exports"><header><FileDown size={19}/><div><h2>Stories & exports</h2><p>Choose how your private stories leave Velvet.</p></div></header>
      <SettingChoice label="Default export format" value={settings.exportFormat} options={[['markdown','Markdown'],['text','Plain text'],['json','JSON backup']]} onChange={(value)=>updateSetting('exportFormat',value)}/>
    </div>
    <div className="settings-group" id="settings-privacy"><header><ShieldCheck size={19}/><div><h2>Privacy & safety</h2><p>Protection against accidental destructive actions.</p></div></header>
      <Toggle label="Confirm before deleting" description="Ask before deleting characters, conversations and lore." checked={settings.confirmBeforeDelete} onChange={(value)=>updateSetting('confirmBeforeDelete',value)}/>
    </div>
    <div className="settings-group settings-diagnostics" id="settings-app"><header><Activity size={19}/><div><h2>AI & diagnostics</h2><p>Check the app version, mobile touch, Supabase, the Edge Function and Gemini separately.</p></div></header><div className="settings-install__body"><span className="settings-install__icon">✦</span><div><strong>Something acting weird?</strong><small>Open diagnostics before changing code or reinstalling the app.</small></div><button onClick={onOpenDiagnostics}><Activity size={17}/>Open diagnostics</button></div><div className={`settings-safe-mode${safeMode ? " is-active" : ""}`}><span><Wrench size={17}/><span><strong>Velvet Safe Mode</strong><small>Temporarily disables voice, ambience and motion-heavy extras, then clears only app cache. Stories, characters and Memories stay untouched.</small></span></span><button type="button" onClick={toggleSafeMode} disabled={safeModeBusy}>{safeModeBusy ? "Working…" : safeMode ? "Leave Safe Mode" : "Start Safe Mode"}</button></div></div>
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
    <div className="settings-group settings-about" id="settings-about"><header><Sparkles size={19}/><div><h2>About Velvet</h2><p>Know exactly which build is on your phone before chasing ghosts.</p></div></header>
      <div className="settings-about__grid">
        <span><small>VERSION</small><strong>Velvet Stories {VELVET_VERSION}</strong><em>{VELVET_RELEASE}</em></span>
        <span><small>BUILD</small><strong>Production build</strong><em>{formatBuild(VELVET_BUILD_TIME)}</em></span>
        <span><small>SUPABASE</small><strong>{health.supabase === "connected" ? "Connected ✓" : health.supabase}</strong><em>Private account sync</em></span>
        <span><small>STORY ENGINE</small><strong>{health.engine === "connected" ? "Connected ✓" : health.engine}</strong><em>Edge Function health</em></span>
        <span><small>PWA</small><strong>{pwa.serverUpdateAvailable ? `Update v${pwa.serverVersion} ready` : "Up to date ✓"}</strong><em>Installed v{pwa.localVersion}</em></span>
        <span><small>SAFE MODE</small><strong>{safeMode ? "Active" : "Off ✓"}</strong><em>{safeMode ? "Audio + heavy effects paused" : "Normal Velvet experience"}</em></span>
      </div>
      <div className="settings-about__actions"><button onClick={()=>pwa.checkForUpdate({ silent:false })} disabled={pwa.checkingForUpdate}><RefreshCw size={16}/>{pwa.checkingForUpdate ? "Checking…" : "Check for update"}</button>{pwa.serverUpdateAvailable && <button className="primary" onClick={pwa.updateApp} disabled={pwa.updating}>{pwa.updating ? "Updating…" : "Update now"}</button>}{pwa.updateProblem && <button onClick={pwa.repairUpdate}>Repair updater</button>}</div>
    </div>
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
export default Settings;
