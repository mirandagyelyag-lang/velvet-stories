import { useEffect, useState } from "react";
import "../styles/velvet-entry-from-zip.css";

let activeAudio = null;
function stopAudio() {
  if (!activeAudio) return;
  const { context, oscillators, gain } = activeAudio;
  activeAudio = null;
  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(0.0001, now, 0.15);
  window.setTimeout(() => { oscillators.forEach(o => { try { o.stop(); } catch {} }); context.close().catch(() => {}); }, 850);
}
function playAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    stopAudio();
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.045, context.currentTime + 1.5);
    gain.connect(context.destination);
    const oscillators = [55,82.41,110].map((frequency,index) => {
      const oscillator=context.createOscillator();
      oscillator.type=index===0?"sine":"triangle";
      oscillator.frequency.value=frequency;
      const level=context.createGain();level.gain.value=[0.48,0.2,0.1][index];
      oscillator.connect(level).connect(gain);oscillator.start();return oscillator;
    });
    activeAudio={context,gain,oscillators};
    window.setTimeout(stopAudio,3500);
  } catch {}
}
export default function WelcomeSplash() {
  const [stage,setStage]=useState("loading");
  const [visible,setVisible]=useState(() => {
    try { return sessionStorage.getItem("velvet-entry-seen-v2")!=="1"; } catch { return true; }
  });
  useEffect(() => {
    if (!visible) return;
    const timer=window.setTimeout(()=>setStage("gate"),2400);
    return ()=>window.clearTimeout(timer);
  },[visible]);
  useEffect(() => () => stopAudio(),[]);
  const enter=(sound=false)=>{
    if(sound) playAudio();
    try { sessionStorage.setItem("velvet-entry-seen-v2","1"); } catch {}
    setStage("leaving");
    window.setTimeout(()=>setVisible(false),850);
  };
  if(!visible)return null;
  return <div className={`velvet-zip-entry velvet-zip-entry--${stage}`} aria-label="Velvet Stories entrance">
    <div className="velvet-zip-entry__silk velvet-zip-entry__silk--left" aria-hidden="true"/>
    <div className="velvet-zip-entry__silk velvet-zip-entry__silk--right" aria-hidden="true"/>
    <div className="velvet-zip-entry__glow" aria-hidden="true"/>
    <div className="velvet-zip-entry__core">
      <svg viewBox="0 0 400 400" className="velvet-zip-entry__emblem" fill="none" stroke="currentColor" aria-hidden="true">
        <defs><linearGradient id="velvetLuminousMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffebec"/><stop offset=".24" stopColor="#f5a6bc"/><stop offset=".52" stopColor="#8c3e62"/><stop offset=".78" stopColor="#ffd2de"/><stop offset="1" stopColor="#b75e84"/></linearGradient></defs>
        <g className="velvet-zip-entry__outer"><circle cx="200" cy="200" r="186" strokeWidth=".6"/><path d="M200 14 A186 186 0 0 1 386 200" strokeWidth=".9"/></g>
        <g className="velvet-zip-entry__inner"><circle cx="200" cy="200" r="132" strokeWidth=".5" strokeDasharray="1 10"/></g>
        <path className="velvet-zip-entry__line" d="M88 92 L200 336 L312 92" strokeWidth=".9"/>
        <path className="velvet-zip-entry__line velvet-zip-entry__line--2" d="M116 92 L200 288 L284 92" strokeWidth=".7"/>
        <path className="velvet-zip-entry__line velvet-zip-entry__line--3" d="M142 92 L200 246 L258 92" strokeWidth=".55"/>
        <circle cx="200" cy="336" r="3.6" fill="#ffe0e8" stroke="none" className="velvet-zip-entry__tip"/>
        <path className="velvet-zip-entry__shine" d="M88 92 L200 336 L312 92" fill="none" stroke="url(#velvetLuminousMetal)" strokeWidth="2.7" strokeLinecap="round"/>
        <path className="velvet-zip-entry__shine velvet-zip-entry__shine--inner" d="M116 92 L200 288 L284 92" fill="none" stroke="url(#velvetLuminousMetal)" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      <div className="velvet-zip-entry__brand">VELVET<small>STORIES</small></div>
    </div>
    {stage==="loading" ? <div className="velvet-zip-entry__loading"><span>ENTERING VELVET</span><i/></div> :
      stage==="gate" ? <div className="velvet-zip-entry__gate"><button type="button" onClick={()=>enter(false)}>ENTRAR <span aria-hidden="true">↗</span></button></div> : null}
  </div>;
}
