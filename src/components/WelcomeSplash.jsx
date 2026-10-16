import { useEffect, useState } from "react";
import "../styles/velvet-entry-from-zip.css";

export default function WelcomeSplash() {
  const [stage,setStage]=useState("loading");
  const [visible,setVisible]=useState(() => {
    try { return sessionStorage.getItem("velvet-entry-seen-restored-v1")!=="1"; } catch { return true; }
  });
  useEffect(() => {
    if (!visible) return;
    const timer=window.setTimeout(()=>{
      setStage("gate");
    },3200);
    return ()=>window.clearTimeout(timer);
  },[visible]);
  useEffect(() => {
    if (stage!=="leaving") return;
    const timer=window.setTimeout(()=>setVisible(false),850);
    return ()=>window.clearTimeout(timer);
  },[stage]);
  const enterVelvet=()=>{
    try { sessionStorage.setItem("velvet-entry-seen-restored-v1","1"); } catch {}
    setStage("leaving");
  };
  if(!visible)return null;
  return <div className={`velvet-zip-entry velvet-zip-entry--${stage}`} aria-label="Velvet Stories entrance">
    <div className="velvet-zip-entry__silk velvet-zip-entry__silk--left" aria-hidden="true"/>
    <div className="velvet-zip-entry__silk velvet-zip-entry__silk--right" aria-hidden="true"/>
    <div className="velvet-zip-entry__glow" aria-hidden="true"/>
    <svg className="velvet-zip-entry__ribbons" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="velvetGlassEdge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bc8398" stopOpacity="0"/>
          <stop offset=".42" stopColor="#d9a0b4" stopOpacity=".12"/>
          <stop offset=".54" stopColor="#edc0cb" stopOpacity=".32"/>
          <stop offset="1" stopColor="#bc8398" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="velvetGlassFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bc8398" stopOpacity="0"/>
          <stop offset=".52" stopColor="#b76d89" stopOpacity=".07"/>
          <stop offset="1" stopColor="#bc8398" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <g fill="url(#velvetGlassFill)" stroke="url(#velvetGlassEdge)" strokeWidth=".8">
        <path d="M-42 -52 C106 45 55 123 16 210 C-15 286 -10 339 33 381 C-38 332 -53 266 -25 187 C11 91 59 45 -42 -52Z"/>
        <path d="M440 101 C347 145 377 214 398 281 C424 351 401 405 357 441 C395 372 380 310 365 259 C341 178 349 139 440 101Z"/>
        <path d="M-53 877 C47 787 108 789 159 748 C202 714 225 664 246 616 C210 712 164 773 99 813 C41 850 -1 857 -53 877Z"/>
        <path d="M448 882 C337 788 309 764 290 724 C325 779 378 803 448 834Z"/>
      </g>
      <g fill="none" stroke="url(#velvetGlassEdge)" strokeWidth=".7">
        <path d="M-29 8 C92 111 -30 239 19 336"/>
        <path d="M413 130 C341 196 424 306 369 407"/>
        <path d="M-20 850 C84 765 173 787 232 657"/>
        <path d="M419 846 C332 790 309 746 291 717"/>
      </g>
    </svg>
    <div className="velvet-zip-entry__crystal velvet-zip-entry__crystal--back" aria-hidden="true" />
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
    {stage==="gate" && <div className="velvet-zip-entry__pink-gate"><button type="button" onClick={enterVelvet}>ENTRAR</button></div>}
  </div>;
}
