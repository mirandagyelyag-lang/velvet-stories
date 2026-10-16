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
        <linearGradient id="velvetRibbonGlass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#efb6c5" stopOpacity=".02"/><stop offset=".38" stopColor="#c57a98" stopOpacity=".22"/><stop offset=".53" stopColor="#f5bdc9" stopOpacity=".37"/><stop offset=".65" stopColor="#9d466b" stopOpacity=".11"/><stop offset="1" stopColor="#b85d80" stopOpacity="0"/></linearGradient>
        <linearGradient id="velvetRibbonEdge" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f7d0d7" stopOpacity="0"/><stop offset=".42" stopColor="#f4a9c0" stopOpacity=".45"/><stop offset=".52" stopColor="#ffd3d9" stopOpacity=".75"/><stop offset=".66" stopColor="#e89db5" stopOpacity=".18"/><stop offset="1" stopColor="#f5b5c8" stopOpacity="0"/></linearGradient>
      </defs>
      <g fill="url(#velvetRibbonGlass)" stroke="url(#velvetRibbonEdge)" strokeWidth=".7">
        <path d="M-64 -60 C115 30 12 130 10 265 C3 400 140 464 380 376 C184 490 -55 405 -48 253 C-39 122 92 57 -64 -60Z"/>
        <path d="M430 90 C264 145 385 239 387 336 C392 441 287 500 -23 484 C181 537 452 475 454 324 C452 212 339 165 430 90Z"/>
        <path d="M-84 431 C77 483 170 478 318 438 C182 521 47 543 -80 491Z"/>
        <path d="M-67 832 C65 738 132 749 229 640 C290 572 338 558 446 538 C328 601 314 665 243 725 C141 802 44 772 -67 892Z"/>
        <path d="M440 705 C308 614 253 637 195 570 C281 606 332 592 446 646Z"/>
      </g>
      <g fill="none" stroke="url(#velvetRibbonEdge)" strokeWidth=".8">
        <path d="M-24 7 C125 102 -19 202 29 321 C88 465 312 458 407 320"/>
        <path d="M411 135 C326 178 397 264 369 361 C337 459 178 502 -10 452"/>
        <path d="M-25 472 C107 531 266 491 384 426"/>
        <path d="M-26 839 C119 741 164 776 258 649 C321 562 367 581 418 534"/>
        <path d="M-50 88 C120 165 -10 335 90 398 C210 478 332 391 419 289" opacity=".42"/>
        <path d="M412 188 C308 240 423 335 312 427 C198 517 64 459 -15 418" opacity=".34"/>
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
