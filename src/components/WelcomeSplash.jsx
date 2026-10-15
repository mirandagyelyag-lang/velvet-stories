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
          <circle className="velvet-film__line velvet-film__ring" cx="210" cy="210" r="161"/>
          <circle className="velvet-film__line velvet-film__ring2" cx="210" cy="210" r="135"/>
          <path className="velvet-film__line velvet-film__v" d="M91 112 L184 314 Q201 350 224 301 L327 110"/>
          <path className="velvet-film__line velvet-film__ribbon" d="M87 296 C145 217 229 194 303 217 C359 236 328 306 273 308 C206 311 161 241 120 171"/>
          <path className="velvet-film__line velvet-film__axis" d="M210 30 V390 M30 210 H390"/>
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
