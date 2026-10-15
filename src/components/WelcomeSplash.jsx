import { useEffect, useState } from "react";
import "../styles/velvet-cinematic-entry.css";

export default function WelcomeSplash() {
  const [phase, setPhase] = useState("loading");
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem("velvet-splash-seen") !== "1"; }
    catch { return true; }
  });

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setPhase("entrance"), 3600);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const enter = (withSound) => {
    if (withSound) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const context = new AudioContextClass();
          [220, 329.63, 440].forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = "sine";
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0, context.currentTime);
            gain.gain.linearRampToValueAtTime(0.025, context.currentTime + 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.5);
            oscillator.connect(gain).connect(context.destination);
            oscillator.start(context.currentTime + index * 0.06);
            oscillator.stop(context.currentTime + 1.55);
          });
          window.setTimeout(() => context.close().catch(() => {}), 2200);
        }
      } catch {}
    }
    dismiss();
  };

  const dismiss = () => {
    try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={`velvet-film velvet-film--${phase}`}
      aria-label="Velvet Stories cinematic entrance">
      <div className="velvet-film__stage">
        <svg className="velvet-film__sigil" viewBox="0 0 420 420" aria-hidden="true">
          <g className="velvet-film__emblem" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <circle className="velvet-film__line velvet-film__ring" cx="210" cy="210" r="143"/>
            <path className="velvet-film__line velvet-film__arch" d="M107 277 A143 143 0 0 1 313 277"/>
            <path className="velvet-film__line velvet-film__monogram" d="M126 146 L210 282 L294 146"/>
            <path className="velvet-film__line velvet-film__crown" d="M151 123 Q210 87 269 123"/>
          </g>
        </svg>
        <div className="velvet-film__word">VELVET<span>STORIES</span></div>
      </div>
      {phase === "entrance" ? <div className="velvet-film__choices"><button type="button" onClick={() => enter(true)}>ENTER WITH SOUND</button><button type="button" onClick={() => enter(false)}>ENTER WITHOUT SOUND</button></div> : <div className="velvet-film__footer">
        <span>ENTERING VELVET</span>
        <div className="velvet-film__track"><i/></div>
      </div>}
      {phase === "loading" && <button type="button" className="velvet-film__skip" onClick={() => setPhase("entrance")}>SKIP INTRO ↗</button>}
    </div>
  );
}
