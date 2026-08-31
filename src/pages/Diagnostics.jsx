import { Activity, ArrowLeft, Bug, Check, Clipboard, Cpu, Database, LoaderCircle, RefreshCw, Smartphone, Trash2, Wifi, XCircle, Volume2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { VELVET_BUILD_TIME, VELVET_RELEASE, VELVET_VERSION } from "../config/version";
import { formatBugReport } from "../utils/bugReporter";
import { auditAmbienceTracks } from "../utils/ambienceQuality";
import { isSafeModeEnabled, leaveVelvetSafeMode, startVelvetSafeMode } from "../utils/safeMode";
import { readGenerationMetrics, summarizeGenerationMetrics } from "../utils/velvetResilience";
import "../styles/diagnostics.css";

export default function Diagnostics({ onBack }) {
  const [checks, setChecks] = useState(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bugNote, setBugNote] = useState("");
  const [includePrivate, setIncludePrivate] = useState(false);
  const [bugCopied, setBugCopied] = useState(false);
  const [safeMode, setSafeMode] = useState(() => isSafeModeEnabled());
  const [audioAudit, setAudioAudit] = useState(null);
  const [audioAuditRunning, setAudioAuditRunning] = useState(false);
  const sessionStats = useMemo(readSessionStats, [checks]);
  const performanceRows = useMemo(() => readGenerationMetrics(), [checks]);
  const performanceSummary = useMemo(() => summarizeGenerationMetrics(performanceRows), [performanceRows]);
  const device = useMemo(getDeviceSnapshot, []);

  async function runChecks(probeAi = false) {
    setRunning(true);
    const startedAt = Date.now();
    const next = {
      version: { ok: true, detail: `Velvet ${VELVET_VERSION} · ${VELVET_RELEASE}` },
      browser: { ok: navigator.onLine, detail: navigator.onLine ? "Online" : "Offline" },
      audio: { ok: Boolean(window.AudioContext || window.webkitAudioContext || window.speechSynthesis), detail: safeMode ? "Available, paused by Safe Mode" : "Audio engine available" },
    };
    try {
      const versionResponse = await fetch(`/velvet-version.json?doctor=${Date.now()}`, { cache: "no-store" });
      if (!versionResponse.ok) throw new Error(`Host returned ${versionResponse.status}`);
      const hostPayload = await versionResponse.json().catch(() => ({}));
      const host = window.location.hostname;
      next.hosting = { ok: true, detail: `${/vercel\.app$/i.test(host) ? "Vercel" : host || "Current host"} · serving v${hostPayload?.version || VELVET_VERSION}` };
    } catch (error) {
      next.hosting = { ok: false, detail: error?.message || "Could not reach the deployed app shell" };
    }
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        next.pwa = { ok: registrations.length > 0 || !device.standalone, detail: registrations.length ? `${registrations.length} service worker registration${registrations.length === 1 ? "" : "s"}` : device.standalone ? "No active service worker" : "Browser mode" };
      } else next.pwa = { ok: !device.standalone, detail: "Service workers unsupported" };
    } catch { next.pwa = { ok: false, detail: "Could not inspect service worker" }; }
    try {
      const { data, error } = await supabase.auth.getSession();
      next.supabase = error || !data?.session ? { ok: false, detail: error?.message || "No active session" } : { ok: true, detail: "Authenticated session is healthy" };
    } catch (error) {
      next.supabase = { ok: false, detail: error.message || "Supabase check failed" };
    }
    try {
      const { data, error } = await supabase.functions.invoke("character-chat", { body: { action: "diagnostics", probeAi } });
      if (error) throw error;
      next.edge = { ok: Boolean(data?.edge?.ok), detail: data?.edge?.ok ? `Edge v${data.version || "?"} reachable` : "Edge check failed" };
      next.ai = data?.ai || { ok: null, detail: probeAi ? "AI probe unavailable" : "Not probed" };
      next.models = data?.models || {};
    } catch (error) {
      next.edge = { ok: false, detail: normalizeInvokeError(error) };
      next.ai = { ok: null, detail: "Could not reach Edge Function, so AI was not tested" };
    }
    next.durationMs = Date.now() - startedAt;
    setChecks(next);
    setRunning(false);
  }

  async function runAudioAudit() {
    setAudioAuditRunning(true);
    try {
      const results = await auditAmbienceTracks();
      setAudioAudit({ ok: results.every((item) => item.ok), results, error: "" });
    } catch (error) {
      setAudioAudit({ ok: false, results: [], error: error?.message || "Could not analyze ambience tracks." });
    } finally {
      setAudioAuditRunning(false);
    }
  }

  async function copyDiagnostics() {
    const payload = JSON.stringify({ version: VELVET_VERSION, release: VELVET_RELEASE, build: VELVET_BUILD_TIME, device, sessionStats, checks }, null, 2);
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function copyBugReport() {
    const text = formatBugReport({ includePrivate, note: bugNote });
    await navigator.clipboard.writeText(text);
    setBugCopied(true);
    window.setTimeout(() => setBugCopied(false), 1800);
  }

  async function clearAppCache() {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } finally {
      window.location.reload();
    }
  }

  return <section className="diagnostics-page">
    <header className="page-heading diagnostics-page__heading"><div><button onClick={onBack}><ArrowLeft size={17}/>Settings</button><p>VELVET DOCTOR</p><h1>Diagnostics</h1><span>Find out whether a problem belongs to the app, Supabase, Gemini or your device.</span></div></header>

    <div className="diagnostics-hero">
      <div><small>INSTALLED VERSION</small><strong>v{VELVET_VERSION}</strong><span>{VELVET_RELEASE}</span></div>
      <div><small>BUILD</small><strong>{formatBuildTime(VELVET_BUILD_TIME)}</strong><span>{device.standalone ? "Installed PWA" : "Browser mode"}</span></div>
      <div><small>AI REQUESTS THIS SESSION</small><strong>{sessionStats.started}</strong><span>{sessionStats.success} completed · {sessionStats.failed} failed</span></div>
    </div>

    <section className="diagnostics-card"><header><Smartphone size={18}/><div><h2>Device & touch</h2><p>The exact things that matter when mobile scrolling acts cursed.</p></div></header><div className="diagnostics-grid">
      <Metric label="Viewport" value={`${device.width} × ${device.height}`}/><Metric label="Touch points" value={String(device.touchPoints)}/><Metric label="Coarse pointer" value={device.coarsePointer ? "Yes" : "No"}/><Metric label="Standalone" value={device.standalone ? "Yes" : "No"}/><Metric label="Online" value={device.online ? "Yes" : "No"}/><Metric label="Service worker" value={device.serviceWorker ? "Supported" : "Unavailable"}/>
    </div></section>

    <section className="diagnostics-card"><header><Activity size={18}/><div><h2>Live checks</h2><p>The normal check does not spend a Gemini generation. “Test AI too” sends one tiny diagnostic request.</p></div></header>
      <div className="diagnostics-actions"><button onClick={()=>runChecks(false)} disabled={running}>{running?<LoaderCircle className="spin" size={16}/>:<RefreshCw size={16}/>}Run app checks</button><button onClick={()=>runChecks(true)} disabled={running}><Cpu size={16}/>Test AI too</button></div>
      {checks && <div className="diagnostics-status-list"><Status icon={Check} label="App version" data={checks.version}/><Status icon={Wifi} label="Browser/network" data={checks.browser}/><Status icon={Activity} label="Hosting / Vercel" data={checks.hosting}/><Status icon={Database} label="Supabase session" data={checks.supabase}/><Status icon={Activity} label="Edge Function" data={checks.edge}/><Status icon={Cpu} label="Gemini" data={checks.ai}/><Status icon={Smartphone} label="PWA / cache" data={checks.pwa}/><Status icon={Volume2} label="Audio engine" data={checks.audio}/>{checks.models && <div className="diagnostics-models"><small>Configured models</small><code>{[checks.models.primary, checks.models.fallback, checks.models.emergency].filter(Boolean).join(" → ") || "Unknown"}</code></div>}</div>}
    </section>

    <section className="diagnostics-card"><header><Cpu size={18}/><div><h2>Last AI activity</h2><p>Local session counters help separate a quota problem from a UI problem.</p></div></header><div className="diagnostics-grid"><Metric label="Last successful AI request" value={formatActivityTime(sessionStats.lastSuccessAt)}/><Metric label="Last model" value={sessionStats.lastModel || "None yet"}/><Metric label="Repairs" value={String(sessionStats.repairs)}/><Metric label="Last error" value={sessionStats.lastError || "None"}/><Metric label="Last error time" value={formatActivityTime(sessionStats.lastErrorAt)}/><Metric label="First reply text" value={sessionStats.firstTokenMs ? `${sessionStats.firstTokenMs} ms` : "—"}/><Metric label="Full response" value={sessionStats.lastDurationMs ? `${sessionStats.lastDurationMs} ms` : "—"}/></div></section>

    <section className="diagnostics-card v312-performance-card"><header><Activity size={18}/><div><h2>Real response speed</h2><p>Measured on this device from your actual Velvet replies, not a synthetic benchmark.</p></div></header>
      <div className="diagnostics-grid"><Metric label="Median first text" value={performanceSummary.p50FirstTokenMs ? `${performanceSummary.p50FirstTokenMs} ms` : "—"}/><Metric label="Median full reply" value={performanceSummary.p50DurationMs ? `${performanceSummary.p50DurationMs} ms` : "—"}/><Metric label="Average first text" value={performanceSummary.avgFirstTokenMs ? `${performanceSummary.avgFirstTokenMs} ms` : "—"}/><Metric label="Fallback wins" value={`${performanceSummary.fallbackCount} / ${performanceSummary.success || 0}`}/><Metric label="Repair passes" value={String(performanceSummary.repairCount)}/><Metric label="Recorded replies" value={String(performanceSummary.total)}/></div>
      {performanceRows.length > 0 && <div className="v312-performance-list">{performanceRows.slice(0,6).map((row,index)=><div key={`${row.at}-${index}`}><span><strong>{row.model || "Unknown model"}</strong><small>{formatActivityTime(row.at)}</small></span><em>{row.firstTokenMs ? `${row.firstTokenMs} ms first` : "no first-token timing"} · {row.durationMs ? `${row.durationMs} ms total` : "unfinished"}{row.fallbackUsed ? " · fallback" : ""}{row.repairUsed ? " · repaired" : ""}</em></div>)}</div>}
    </section>

    <section className="diagnostics-card diagnostics-card--audio-quality"><header><Volume2 size={18}/><div><h2>Ambience quality check</h2><p>Checks all eight local tracks for quiet edges, clipping and obvious loop mismatches. It never uploads your audio.</p></div></header>
      <div className="diagnostics-actions"><button onClick={runAudioAudit} disabled={audioAuditRunning}>{audioAuditRunning ? <LoaderCircle className="spin" size={16}/> : <RefreshCw size={16}/>}Check ambience audio</button></div>
      {audioAudit && <div className="ambience-audit">{audioAudit.error ? <div className="ambience-audit__error"><XCircle size={16}/><span>{audioAudit.error}</span></div> : <>{audioAudit.results.map((item)=><div key={item.mode} className={`ambience-audit__row${item.ok ? " is-ok" : " is-warning"}`}><span>{item.ok ? <Check size={15}/> : <XCircle size={15}/>}<strong>{formatAmbienceMode(item.mode)}</strong></span><small>{item.ok ? `Clean · ${item.duration.toFixed(1)}s` : item.issues.join(" · ")}</small></div>)}<p className="ambience-audit__summary">{audioAudit.ok ? "All ambience tracks look healthy. Seamless Loop will still crossfade every repeat." : "One or more tracks may need a cleaner source or trim. Seamless Loop still masks small edge gaps."}</p></>}</div>}
    </section>


    <section className="diagnostics-card diagnostics-card--bug"><header><Bug size={18}/><div><h2>Report a problem</h2><p>Creates a technical report you can paste into ChatGPT. Private chat text stays out unless you explicitly include it.</p></div></header>
      <label className="bug-report-note"><span>What went wrong?</span><textarea rows="4" maxLength="1200" value={bugNote} onChange={(event)=>setBugNote(event.target.value)} placeholder="Example: Party ambience stopped after I switched from Rain."/></label>
      <label className="bug-report-private"><input type="checkbox" checked={includePrivate} onChange={(event)=>setIncludePrivate(event.target.checked)}/><span><strong>Include current chat excerpt</strong><small>Off by default. Only use this if the conversation text itself is needed to reproduce the bug.</small></span></label>
      <div className="diagnostics-actions"><button onClick={copyBugReport}><Clipboard size={16}/>{bugCopied ? "Copied report" : "Copy bug report"}</button><button onClick={()=>{ setBugNote(""); setIncludePrivate(false); }}>Clear</button></div>
    </section>

    <section className="diagnostics-card diagnostics-card--safe"><header><Wrench size={18}/><div><h2>Velvet Safe Mode</h2><p>Use this when an update, audio engine or mobile effect behaves strangely. It never clears stories, characters, Memories or account data.</p></div></header><div className="diagnostics-actions"><button onClick={async()=>{ if (safeMode) leaveVelvetSafeMode(); else await startVelvetSafeMode(); setSafeMode(!safeMode); }}>{safeMode ? "Leave Safe Mode" : "Start Safe Mode"}</button><span className={`diagnostics-safe-state${safeMode ? " is-active" : ""}`}>{safeMode ? "Safe Mode active" : "Normal mode"}</span></div></section>

    <section className="diagnostics-card diagnostics-card--danger"><header><Trash2 size={18}/><div><h2>Cache rescue</h2><p>If your phone is stuck on an old PWA build, this removes app caches and reloads from the server. Your Supabase stories are not deleted.</p></div></header><div className="diagnostics-actions"><button onClick={clearAppCache}><Trash2 size={16}/>Clear app cache & reload</button><button onClick={copyDiagnostics}><Clipboard size={16}/>{copied?"Copied":"Copy diagnostics"}</button></div></section>
  </section>;
}

function Status({ icon: Icon, label, data }) { const state = data?.ok === true ? "ok" : data?.ok === false ? "bad" : "idle"; return <div className={`diagnostics-status diagnostics-status--${state}`}><span>{state==="ok"?<Check size={15}/>:state==="bad"?<XCircle size={15}/>:<Icon size={15}/>}</span><div><strong>{label}</strong><small>{data?.detail || "Not checked"}</small></div></div>; }
function Metric({ label, value }) { return <div className="diagnostics-metric"><small>{label}</small><strong>{value}</strong></div>; }
function getDeviceSnapshot(){ return { width: window.innerWidth, height: window.innerHeight, touchPoints: navigator.maxTouchPoints || 0, coarsePointer: Boolean(window.matchMedia?.("(pointer: coarse)")?.matches), standalone: Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone), online: navigator.onLine, serviceWorker: "serviceWorker" in navigator, userAgent: navigator.userAgent }; }
function readSessionStats(){ try { return { started:0, success:0, failed:0, repairs:0, lastModel:"", lastError:"", lastSuccessAt:"", lastErrorAt:"", lastDurationMs:0, firstTokenMs:0, ...JSON.parse(sessionStorage.getItem("velvet_ai_session_v19") || sessionStorage.getItem("velvet_ai_session_v18") || "{}") }; } catch { return { started:0, success:0, failed:0, repairs:0, lastModel:"", lastError:"", lastSuccessAt:"", lastErrorAt:"", lastDurationMs:0, firstTokenMs:0 }; } }
function normalizeInvokeError(error){ return String(error?.message || "Edge Function request failed").replace(/^edge function returned a non-2xx status code$/i,"Edge Function returned an error"); }

function formatAmbienceMode(mode) {
  return ({ rain:"Rain", night_city:"Night", street_racing:"Street racing", cafe:"Café", campus:"Campus", fireplace:"Fireplace", home:"Home · TV", party:"Party" })[mode] || mode;
}
function formatBuildTime(value){ const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" }); }

function formatActivityTime(value){ if(!value) return "None yet"; const date=new Date(value); return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString([], { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" }); }
