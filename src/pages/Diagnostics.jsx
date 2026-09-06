import { Activity, ArrowLeft, Bug, Check, Clipboard, Clock3, Cpu, Database, Fingerprint, LoaderCircle, RefreshCw, Smartphone, Trash2, Wifi, XCircle, Volume2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { useCharacters } from "../context/CharactersContext";
import { VELVET_BUILD_TIME, VELVET_RELEASE, VELVET_VERSION } from "../config/version";
import { formatBugReport } from "../utils/bugReporter";
import { auditAmbienceTracks } from "../utils/ambienceQuality";
import { isSafeModeEnabled, leaveVelvetSafeMode, startVelvetSafeMode } from "../utils/safeMode";
import { readGenerationMetrics, summarizeGenerationMetrics } from "../utils/velvetResilience";
import "../styles/diagnostics.css";

export default function Diagnostics({ onBack }) {
  const { characters = [] } = useCharacters();
  const [checks, setChecks] = useState(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bugNote, setBugNote] = useState("");
  const [includePrivate, setIncludePrivate] = useState(false);
  const [bugCopied, setBugCopied] = useState(false);
  const [safeMode, setSafeMode] = useState(() => isSafeModeEnabled());
  const [audioAudit, setAudioAudit] = useState(null);
  const [audioAuditRunning, setAudioAuditRunning] = useState(false);
  const [cloneSituation, setCloneSituation] = useState("I had a terrible day. I don't really want to talk about it.");
  const [cloneSelected, setCloneSelected] = useState([]);
  const [cloneRunning, setCloneRunning] = useState(false);
  const [cloneResult, setCloneResult] = useState(null);
  const [sceneLabSituation, setSceneLabSituation] = useState("The character and the user are eating lunch on campus. Keep the scene ordinary unless their established life makes something relevant.");
  const [sceneLabCharacterId, setSceneLabCharacterId] = useState("");
  const [sceneLabRunning, setSceneLabRunning] = useState(false);
  const [sceneLabResult, setSceneLabResult] = useState(null);
  const [evolutionLabSituation, setEvolutionLabSituation] = useState("Six months of repeated earned trust: they have learned that leaving every difficult conversation damages the relationship. A new argument now puts that old defense under pressure.");
  const [evolutionLabCharacterId, setEvolutionLabCharacterId] = useState("");
  const [evolutionLabRunning, setEvolutionLabRunning] = useState(false);
  const [evolutionLabResult, setEvolutionLabResult] = useState(null);
  const [socialGraphSituation, setSocialGraphSituation] = useState("Several recurring characters cross paths on campus after separate obligations. Keep their own relationships active and do not make everyone orbit one person.");
  const [socialGraphSelected, setSocialGraphSelected] = useState([]);
  const [socialGraphRunning, setSocialGraphRunning] = useState(false);
  const [socialGraphResult, setSocialGraphResult] = useState(null);
  const [timelineLabSituation, setTimelineLabSituation] = useState("Monday, 1:10 PM: lunch on campus. The character has an established evening training routine and previously agreed to meet the user again Friday, but no exact Friday time was set.");
  const [timelineLabCharacterId, setTimelineLabCharacterId] = useState("");
  const [timelineLabRunning, setTimelineLabRunning] = useState(false);
  const [timelineLabResult, setTimelineLabResult] = useState(null);
  const [causalityLabSituation, setCausalityLabSituation] = useState("Friday: Roman damages his car during an established race. Saturday: it has not been repaired. One student hears a rumor about the race but did not witness it. Monday: Roman needs to get to campus. Keep rumor ≠ fact and preserve only grounded consequences.");
  const [causalityLabCharacterId, setCausalityLabCharacterId] = useState("");
  const [causalityLabRunning, setCausalityLabRunning] = useState(false);
  const [causalityLabResult, setCausalityLabResult] = useState(null);
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
      const servedVersion = String(hostPayload?.version || "");
      const versionMatch = !servedVersion || servedVersion === String(VELVET_VERSION);
      next.hosting = { ok: versionMatch, detail: `${/vercel\.app$/i.test(host) ? "Vercel" : host || "Current host"} · serving v${servedVersion || VELVET_VERSION}${versionMatch ? " · matches installed build" : ` · MISMATCH: installed v${VELVET_VERSION}`}` };
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

  function toggleCloneCharacter(id) {
    setCloneSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 5 ? current : [...current, id]);
  }

  async function runCloneLab() {
    const chosenIds = cloneSelected.length >= 2 ? cloneSelected : characters.slice(0, Math.min(4, characters.length)).map((item) => item.id);
    const chosen = characters.filter((item) => chosenIds.includes(item.id)).slice(0, 5);
    if (chosen.length < 2) {
      setCloneResult({ error: "Create or choose at least two characters first." });
      return;
    }
    setCloneRunning(true);
    setCloneResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("character-chat", { body: { action: "character_clone_lab", characters: chosen, situation: cloneSituation } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCloneResult(data || { error: "Clone Lab returned no result." });
    } catch (error) {
      setCloneResult({ error: normalizeInvokeError(error) });
    } finally {
      setCloneRunning(false);
    }
  }

  async function runSceneLab() {
    const chosen = characters.find((item) => item.id === sceneLabCharacterId) || characters[0];
    if (!chosen) {
      setSceneLabResult({ error: "Create a character first." });
      return;
    }
    setSceneLabRunning(true);
    setSceneLabResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("character-chat", { body: { action: "scene_intelligence_lab", character: chosen, situation: sceneLabSituation } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSceneLabResult(data || { error: "Scene Lab returned no result." });
    } catch (error) {
      setSceneLabResult({ error: normalizeInvokeError(error) });
    } finally {
      setSceneLabRunning(false);
    }
  }

  async function runEvolutionLab() {
    const chosen = characters.find((item) => item.id === evolutionLabCharacterId) || characters[0];
    if (!chosen) {
      setEvolutionLabResult({ error: "Create a character first." });
      return;
    }
    setEvolutionLabRunning(true);
    setEvolutionLabResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("character-chat", { body: { action: "character_evolution_lab", character: chosen, situation: evolutionLabSituation } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEvolutionLabResult(data || { error: "Character Evolution Lab returned no result." });
    } catch (error) {
      setEvolutionLabResult({ error: normalizeInvokeError(error) });
    } finally {
      setEvolutionLabRunning(false);
    }
  }

  function toggleSocialGraphCharacter(id) {
    setSocialGraphSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 8 ? current : [...current, id]);
  }

  async function runSocialGraphLab() {
    const chosenIds = socialGraphSelected.length >= 2 ? socialGraphSelected : characters.slice(0, Math.min(6, characters.length)).map((item) => item.id);
    const chosen = characters.filter((item) => chosenIds.includes(item.id)).slice(0, 8);
    if (chosen.length < 2) { setSocialGraphResult({ error: "Create or choose at least two characters first." }); return; }
    setSocialGraphRunning(true); setSocialGraphResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("character-chat", { body: { action: "npc_social_graph_lab", characters: chosen, situation: socialGraphSituation } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      setSocialGraphResult(data || { error: "Social Graph Lab returned no result." });
    } catch (error) { setSocialGraphResult({ error: normalizeInvokeError(error) }); }
    finally { setSocialGraphRunning(false); }
  }

  async function runTimelineLab() {
    const chosen = characters.find((item) => item.id === timelineLabCharacterId) || characters[0];
    if (!chosen) { setTimelineLabResult({ error:"Create a character first." }); return; }
    setTimelineLabRunning(true); setTimelineLabResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("character-chat", { body: { action:"timeline_life_simulation_lab", character:chosen, situation:timelineLabSituation } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      setTimelineLabResult(data || { error:"Timeline Lab returned no result." });
    } catch (error) { setTimelineLabResult({ error:normalizeInvokeError(error) }); }
    finally { setTimelineLabRunning(false); }
  }

  async function runCausalityLab() {
    const chosen = characters.find((item) => item.id === causalityLabCharacterId) || characters[0];
    if (!chosen) { setCausalityLabResult({ error:"Create a character first." }); return; }
    setCausalityLabRunning(true); setCausalityLabResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("character-chat", { body: { action:"causality_lab", character:chosen, situation:causalityLabSituation } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      setCausalityLabResult(data || { error:"Causality Lab returned no result." });
    } catch (error) { setCausalityLabResult({ error:normalizeInvokeError(error) }); }
    finally { setCausalityLabRunning(false); }
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

    <section className="diagnostics-card diagnostics-card--clone" data-legacy-name="Character Clone Lab">{/* Run blind clone test */}<header><Fingerprint size={18}/><div><h2>Same Scene Voice Lab 2.0</h2><p>One line, several characters. Velvet stress-tests sentence DNA, question personality, selective answering, vocabulary ownership, silence tolerance and generic-voice collisions.</p></div></header>
      <label className="clone-lab-situation"><span>Same situation for everyone</span><textarea rows="3" maxLength="700" value={cloneSituation} onChange={(event)=>setCloneSituation(event.target.value)} /></label>
      <div className="clone-lab-cast">{characters.slice(0,12).map((character)=>{ const selected=cloneSelected.includes(character.id); return <button type="button" key={character.id} className={selected?"is-selected":""} onClick={()=>toggleCloneCharacter(character.id)}><span>{character.name}</span><small>{character.role || "Character"}</small></button>; })}</div>
      <div className="diagnostics-actions"><button onClick={runCloneLab} disabled={cloneRunning || characters.length < 2}>{cloneRunning ? <LoaderCircle className="spin" size={16}/> : <Fingerprint size={16}/>}Run same-scene blind test</button><span className="clone-lab-hint">Choose 2-5, or leave none selected to test your first saved characters.</span></div>
      {cloneResult && <div className="clone-lab-result">{cloneResult.error ? <div className="clone-lab-error"><XCircle size={16}/><span>{cloneResult.error}</span></div> : <><div className="clone-lab-score"><strong>{cloneResult.score || 0}<small>/100</small></strong><div><b>{Number(cloneResult.score || 0) >= 80 ? "Distinct" : Number(cloneResult.score || 0) >= 60 ? "Some overlap" : "Clone risk"}</b><span>{cloneResult.verdict || "Blind test complete."}</span></div></div>{Array.isArray(cloneResult.collisions) && cloneResult.collisions.length > 0 && <div className="clone-lab-collisions"><small>Shared patterns detected</small>{cloneResult.collisions.map((item,index)=><span key={`${item}-${index}`}>{item}</span>)}</div>}<div className="clone-lab-samples">{(cloneResult.samples || []).map((sample)=><article key={sample.name}><header><strong>{sample.name}</strong><small>{sample.tactic}</small></header><p>{sample.reply}</p>{sample.whyDistinct && <em>{sample.whyDistinct}</em>}</article>)}</div></>}</div>}
    </section>

    <section className="diagnostics-card diagnostics-card--scene-lab"><header><Activity size={18}/><div><h2>Scene Intelligence Lab</h2><p>Stress-test whether one character can inhabit a real place without wallpaper, protagonist-orbit, frozen props or random plot hooks.</p></div></header>
      <div className="clone-lab-controls">
        <label><span>Scene</span><textarea rows="3" maxLength="900" value={sceneLabSituation} onChange={(event)=>setSceneLabSituation(event.target.value)} /></label>
        <div className="clone-lab-cast">{characters.slice(0,12).map((character)=>{ const selected=(sceneLabCharacterId || characters[0]?.id)===character.id; return <button type="button" key={character.id} className={selected?"is-selected":""} onClick={()=>setSceneLabCharacterId(character.id)}><span>{character.name}</span><small>{character.role || "Character"}</small></button>; })}</div>
      </div>
      <div className="diagnostics-actions"><button onClick={runSceneLab} disabled={sceneLabRunning || characters.length < 1}>{sceneLabRunning ? <LoaderCircle className="spin" size={16}/> : <Activity size={16}/>}Run scene intelligence test</button><span className="clone-lab-hint">Checks purpose, progression, environment consequence, social gravity, scene memory, world independence and closure.</span></div>
      {sceneLabResult && <div className="clone-lab-result">{sceneLabResult.error ? <div className="clone-lab-error"><XCircle size={16}/><span>{sceneLabResult.error}</span></div> : <><div className="clone-lab-score"><strong>{sceneLabResult.score || 0}<small>/100</small></strong><div><b>{Number(sceneLabResult.score || 0) >= 82 ? "Living scene" : Number(sceneLabResult.score || 0) >= 65 ? "Needs tuning" : "Scene feels synthetic"}</b><span>{sceneLabResult.verdict || "Scene test complete."}</span></div></div>{Array.isArray(sceneLabResult.warnings) && sceneLabResult.warnings.length > 0 && <div className="clone-lab-collisions"><small>Scene warnings</small>{sceneLabResult.warnings.map((item,index)=><span key={`${item}-${index}`}>{item}</span>)}</div>}<div className="clone-lab-samples"><article><header><strong>{sceneLabResult.character || "Character"}</strong><small>{sceneLabResult.phase || "scene"}</small></header><p>{sceneLabResult.sample || ""}</p>{sceneLabResult.why && <em>{sceneLabResult.why}</em>}</article></div></>}</div>}
    </section>

    <section className="diagnostics-card diagnostics-card--evolution-lab"><header><Fingerprint size={18}/><div><h2>Character Evolution Lab</h2><p>Compare chapter-one behavior with earned long-term growth while checking that the character stays recognizably themselves.</p></div></header>
      <div className="clone-lab-controls">
        <label><span>History / pressure test</span><textarea rows="3" maxLength="1000" value={evolutionLabSituation} onChange={(event)=>setEvolutionLabSituation(event.target.value)} /></label>
        <div className="clone-lab-cast">{characters.slice(0,12).map((character)=>{ const selected=(evolutionLabCharacterId || characters[0]?.id)===character.id; return <button type="button" key={character.id} className={selected?"is-selected":""} onClick={()=>setEvolutionLabCharacterId(character.id)}><span>{character.name}</span><small>{character.role || "Character"}</small></button>; })}</div>
      </div>
      <div className="diagnostics-actions"><button onClick={runEvolutionLab} disabled={evolutionLabRunning || characters.length < 1}>{evolutionLabRunning ? <LoaderCircle className="spin" size={16}/> : <Fingerprint size={16}/>}Run evolution test</button><span className="clone-lab-hint">Checks core identity, earned behavior change, relationship-specific growth, regression and personality-replacement risk.</span></div>
      {evolutionLabResult && <div className="clone-lab-result">{evolutionLabResult.error ? <div className="clone-lab-error"><XCircle size={16}/><span>{evolutionLabResult.error}</span></div> : <><div className="clone-lab-score"><strong>{evolutionLabResult.score || 0}<small>/100</small></strong><div><b>{Number(evolutionLabResult.score || 0) >= 82 ? "Same person, real growth" : Number(evolutionLabResult.score || 0) >= 65 ? "Growth needs tuning" : "Personality drift risk"}</b><span>{evolutionLabResult.verdict || "Evolution test complete."}</span></div></div>{Array.isArray(evolutionLabResult.preserved) && evolutionLabResult.preserved.length > 0 && <div className="clone-lab-collisions"><small>Preserved identity</small>{evolutionLabResult.preserved.map((item,index)=><span key={`p-${index}`}>{item}</span>)}</div>}{Array.isArray(evolutionLabResult.evolved) && evolutionLabResult.evolved.length > 0 && <div className="clone-lab-collisions"><small>Earned evolution</small>{evolutionLabResult.evolved.map((item,index)=><span key={`e-${index}`}>{item}</span>)}</div>}{Array.isArray(evolutionLabResult.warnings) && evolutionLabResult.warnings.length > 0 && <div className="clone-lab-collisions"><small>Warnings</small>{evolutionLabResult.warnings.map((item,index)=><span key={`w-${index}`}>{item}</span>)}</div>}<div className="clone-lab-samples"><article><header><strong>Chapter one</strong><small>{evolutionLabResult.character || "Character"}</small></header><p>{evolutionLabResult.baseline || ""}</p></article><article><header><strong>Later history</strong><small>earned change</small></header><p>{evolutionLabResult.later || ""}</p>{evolutionLabResult.why && <em>{evolutionLabResult.why}</em>}</article></div></>}</div>}
    </section>

    <section className="diagnostics-card diagnostics-card--social-graph-lab"><header><Activity size={18}/><div><h2>Social Graph Lab</h2><p>Stress-test whether recurring characters have lives and relationships with each other instead of forming a wheel around one protagonist.</p></div></header>
      <label className="clone-lab-situation"><span>Social situation</span><textarea rows="3" maxLength="1100" value={socialGraphSituation} onChange={(event)=>setSocialGraphSituation(event.target.value)} /></label>
      <div className="clone-lab-cast">{characters.slice(0,12).map((character)=>{ const selected=socialGraphSelected.includes(character.id); return <button type="button" key={character.id} className={selected?"is-selected":""} onClick={()=>toggleSocialGraphCharacter(character.id)}><span>{character.name}</span><small>{character.role || "Character"}</small></button>; })}</div>
      <div className="diagnostics-actions"><button onClick={runSocialGraphLab} disabled={socialGraphRunning || characters.length < 2}>{socialGraphRunning ? <LoaderCircle className="spin" size={16}/> : <Activity size={16}/>}Run social graph test</button><span className="clone-lab-hint">Choose 2-8. Checks NPC↔NPC bonds, recurring identity, availability, sparse group traffic, information routes, circles and anti-orbit behavior.</span></div>
      {socialGraphResult && <div className="clone-lab-result">{socialGraphResult.error ? <div className="clone-lab-error"><XCircle size={16}/><span>{socialGraphResult.error}</span></div> : <><div className="clone-lab-score"><strong>{socialGraphResult.score || 0}<small>/100</small></strong><div><b>{Number(socialGraphResult.score || 0) >= 82 ? "Living social world" : Number(socialGraphResult.score || 0) >= 65 ? "Network needs tuning" : "Protagonist-orbit risk"}</b><span>{socialGraphResult.verdict || "Social graph test complete."}</span></div></div>{Array.isArray(socialGraphResult.warnings)&&socialGraphResult.warnings.length>0&&<div className="clone-lab-collisions"><small>Warnings</small>{socialGraphResult.warnings.map((item,index)=><span key={`sgw-${index}`}>{item}</span>)}</div>}{Array.isArray(socialGraphResult.edges)&&socialGraphResult.edges.length>0&&<div className="clone-lab-collisions"><small>NPC ↔ NPC edges</small>{socialGraphResult.edges.slice(0,10).map((edge,index)=><span key={`sge-${index}`}>{edge.from} ↔ {edge.to}: {edge.relationship}</span>)}</div>}{Array.isArray(socialGraphResult.information_flow)&&socialGraphResult.information_flow.length>0&&<div className="clone-lab-collisions"><small>Information routes</small>{socialGraphResult.information_flow.map((item,index)=><span key={`sgi-${index}`}>{item}</span>)}</div>}<div className="clone-lab-samples"><article><header><strong>Network sample</strong><small>independent social beat</small></header><p>{socialGraphResult.sample || ""}</p>{socialGraphResult.why && <em>{socialGraphResult.why}</em>}</article></div></>}</div>}
    </section>


    <section className="diagnostics-card diagnostics-card--timeline-lab"><header><Clock3 size={18}/><div><h2>Timeline + Life Simulation Lab</h2><p>Stress-test story clock, routines, plans, availability, travel and schedule collisions without inventing precision.</p></div></header>
      <label className="clone-lab-situation"><span>Timeline / scenario</span><textarea rows="4" maxLength="1200" value={timelineLabSituation} onChange={(event)=>setTimelineLabSituation(event.target.value)} /></label>
      <div className="clone-lab-cast">{characters.slice(0,12).map((character)=>{ const selected=(timelineLabCharacterId || characters[0]?.id)===character.id; return <button type="button" key={character.id} className={selected?"is-selected":""} onClick={()=>setTimelineLabCharacterId(character.id)}><span>{character.name}</span><small>{character.role || "Character"}</small></button>; })}</div>
      <div className="diagnostics-actions"><button onClick={runTimelineLab} disabled={timelineLabRunning || characters.length < 1}>{timelineLabRunning ? <LoaderCircle className="spin" size={16}/> : <Clock3 size={16}/>}Run timeline test</button><span className="clone-lab-hint">Checks exact-time invention, recurring-routine overprecision, plan persistence, availability, travel order, double-booking and message-count time jumps.</span></div>
      {timelineLabResult && <div className="clone-lab-result">{timelineLabResult.error ? <div className="clone-lab-error"><XCircle size={16}/><span>{timelineLabResult.error}</span></div> : <><div className="clone-lab-score"><strong>{timelineLabResult.score || 0}<small>/100</small></strong><div><b>{Number(timelineLabResult.score || 0) >= 82 ? "Temporal world feels alive" : Number(timelineLabResult.score || 0) >= 65 ? "Timeline needs tuning" : "Time continuity risk"}</b><span>{timelineLabResult.verdict || "Timeline test complete."}</span></div></div>{timelineLabResult.story_clock && <div className="clone-lab-collisions"><small>Story clock</small><span>{timelineLabResult.story_clock.now || timelineLabResult.story_clock.raw || "Unknown"} · confidence {timelineLabResult.story_clock.confidence || "unknown"}</span></div>}{Array.isArray(timelineLabResult.conflicts)&&timelineLabResult.conflicts.length>0&&<div className="clone-lab-collisions"><small>Schedule conflicts</small>{timelineLabResult.conflicts.map((item,index)=><span key={`tlc-${index}`}>{item}</span>)}</div>}{Array.isArray(timelineLabResult.warnings)&&timelineLabResult.warnings.length>0&&<div className="clone-lab-collisions"><small>Warnings</small>{timelineLabResult.warnings.map((item,index)=><span key={`tlw-${index}`}>{item}</span>)}</div>}<div className="clone-lab-samples"><article><header><strong>Time-aware sample</strong><small>calendar + life simulation</small></header><p>{timelineLabResult.sample || ""}</p>{timelineLabResult.why && <em>{timelineLabResult.why}</em>}</article></div></>}</div>}
    </section>

    <section className="diagnostics-card diagnostics-card--causality-lab"><header><Activity size={18}/><div><h2>Causality Lab</h2><p>Stress-test cause → effect, consequence persistence, institutional memory, rumor truth and off-screen life windows.</p></div></header>
      <label className="clone-lab-situation"><span>Causal history / scenario</span><textarea rows="4" maxLength="1400" value={causalityLabSituation} onChange={(event)=>setCausalityLabSituation(event.target.value)} /></label>
      <div className="clone-lab-cast">{characters.slice(0,12).map((character)=>{ const selected=(causalityLabCharacterId || characters[0]?.id)===character.id; return <button type="button" key={character.id} className={selected?"is-selected":""} onClick={()=>setCausalityLabCharacterId(character.id)}><span>{character.name}</span><small>{character.role || "Character"}</small></button>; })}</div>
      <div className="diagnostics-actions"><button onClick={runCausalityLab} disabled={causalityLabRunning || characters.length < 1}>{causalityLabRunning ? <LoaderCircle className="spin" size={16}/> : <Activity size={16}/>}Run causality test</button><span className="clone-lab-hint">Checks unsupported effects, magical resets, cancelled-event resurrection, rumor→fact drift, off-screen milestones and consequence overkill.</span></div>
      {causalityLabResult && <div className="clone-lab-result">{causalityLabResult.error ? <div className="clone-lab-error"><XCircle size={16}/><span>{causalityLabResult.error}</span></div> : <><div className="clone-lab-score"><strong>{causalityLabResult.score || 0}<small>/100</small></strong><div><b>{Number(causalityLabResult.score || 0) >= 82 ? "Causality grounded" : Number(causalityLabResult.score || 0) >= 65 ? "Chains need tuning" : "Causal hallucination risk"}</b><span>{causalityLabResult.verdict || "Causality test complete."}</span></div></div>{Array.isArray(causalityLabResult.warnings)&&causalityLabResult.warnings.length>0&&<div className="clone-lab-collisions"><small>Warnings</small>{causalityLabResult.warnings.map((item,index)=><span key={`clw-${index}`}>{item}</span>)}</div>}{Array.isArray(causalityLabResult.rejected_inventions)&&causalityLabResult.rejected_inventions.length>0&&<div className="clone-lab-collisions"><small>Rejected inventions</small>{causalityLabResult.rejected_inventions.map((item,index)=><span key={`clr-${index}`}>{item}</span>)}</div>}{Array.isArray(causalityLabResult.causal_chain)&&causalityLabResult.causal_chain.length>0&&<div className="clone-lab-collisions"><small>Causal chain</small>{causalityLabResult.causal_chain.map((item,index)=><span key={`clc-${index}`}>{item.cause || "cause"} → {item.effect || "effect"} · {item.status || "active"}</span>)}</div>}<div className="clone-lab-samples"><article><header><strong>Causal sample</strong><small>world consequences</small></header><p>{causalityLabResult.sample || ""}</p>{causalityLabResult.why && <em>{causalityLabResult.why}</em>}</article></div></>}</div>}
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
