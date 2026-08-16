import { Activity, ArrowLeft, Check, Clipboard, Cpu, Database, LoaderCircle, RefreshCw, Smartphone, Trash2, Wifi, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { VELVET_BUILD_TIME, VELVET_RELEASE, VELVET_VERSION } from "../config/version";
import "../styles/diagnostics.css";

export default function Diagnostics({ onBack }) {
  const [checks, setChecks] = useState(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const sessionStats = useMemo(readSessionStats, [checks]);
  const device = useMemo(getDeviceSnapshot, []);

  async function runChecks(probeAi = false) {
    setRunning(true);
    const startedAt = Date.now();
    const next = { browser: { ok: navigator.onLine, detail: navigator.onLine ? "Online" : "Offline" } };
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

  async function copyDiagnostics() {
    const payload = JSON.stringify({ version: VELVET_VERSION, release: VELVET_RELEASE, build: VELVET_BUILD_TIME, device, sessionStats, checks }, null, 2);
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
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
      {checks && <div className="diagnostics-status-list"><Status icon={Wifi} label="Browser/network" data={checks.browser}/><Status icon={Database} label="Supabase session" data={checks.supabase}/><Status icon={Activity} label="Edge Function" data={checks.edge}/><Status icon={Cpu} label="Gemini" data={checks.ai}/>{checks.models && <div className="diagnostics-models"><small>Configured models</small><code>{[checks.models.primary, checks.models.fallback, checks.models.emergency].filter(Boolean).join(" → ") || "Unknown"}</code></div>}</div>}
    </section>

    <section className="diagnostics-card"><header><Cpu size={18}/><div><h2>Last AI activity</h2><p>Local session counters help separate a quota problem from a UI problem.</p></div></header><div className="diagnostics-grid"><Metric label="Last model" value={sessionStats.lastModel || "None yet"}/><Metric label="Repairs" value={String(sessionStats.repairs)}/><Metric label="Last error" value={sessionStats.lastError || "None"}/><Metric label="First reply text" value={sessionStats.firstTokenMs ? `${sessionStats.firstTokenMs} ms` : "—"}/><Metric label="Full response" value={sessionStats.lastDurationMs ? `${sessionStats.lastDurationMs} ms` : "—"}/></div></section>

    <section className="diagnostics-card diagnostics-card--danger"><header><Trash2 size={18}/><div><h2>Cache rescue</h2><p>If your phone is stuck on an old PWA build, this removes app caches and reloads from the server. Your Supabase stories are not deleted.</p></div></header><div className="diagnostics-actions"><button onClick={clearAppCache}><Trash2 size={16}/>Clear app cache & reload</button><button onClick={copyDiagnostics}><Clipboard size={16}/>{copied?"Copied":"Copy diagnostics"}</button></div></section>
  </section>;
}

function Status({ icon: Icon, label, data }) { const state = data?.ok === true ? "ok" : data?.ok === false ? "bad" : "idle"; return <div className={`diagnostics-status diagnostics-status--${state}`}><span>{state==="ok"?<Check size={15}/>:state==="bad"?<XCircle size={15}/>:<Icon size={15}/>}</span><div><strong>{label}</strong><small>{data?.detail || "Not checked"}</small></div></div>; }
function Metric({ label, value }) { return <div className="diagnostics-metric"><small>{label}</small><strong>{value}</strong></div>; }
function getDeviceSnapshot(){ return { width: window.innerWidth, height: window.innerHeight, touchPoints: navigator.maxTouchPoints || 0, coarsePointer: Boolean(window.matchMedia?.("(pointer: coarse)")?.matches), standalone: Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone), online: navigator.onLine, serviceWorker: "serviceWorker" in navigator, userAgent: navigator.userAgent }; }
function readSessionStats(){ try { return { started:0, success:0, failed:0, repairs:0, lastModel:"", lastError:"", lastDurationMs:0, firstTokenMs:0, ...JSON.parse(sessionStorage.getItem("velvet_ai_session_v19") || sessionStorage.getItem("velvet_ai_session_v18") || "{}") }; } catch { return { started:0, success:0, failed:0, repairs:0, lastModel:"", lastError:"", lastDurationMs:0, firstTokenMs:0 }; } }
function normalizeInvokeError(error){ return String(error?.message || "Edge Function request failed").replace(/^edge function returned a non-2xx status code$/i,"Edge Function returned an error"); }
function formatBuildTime(value){ const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" }); }
