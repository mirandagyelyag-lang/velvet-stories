import { useEffect, useState } from "react";
import "../styles/velvet-cinematic-entry.css";

export default function WelcomeSplash() {
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem("velvet-splash-seen") !== "1"; }
    catch { return true; }
  });

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}
      setVisible(false);
    }, 4900);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="velvet-film" role="button" tabIndex={0}
      aria-label="Velvet Stories opening. Tap or press Enter to skip."
      onClick={dismiss}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          dismiss();
        }
      }}>
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
      <div className="velvet-film__footer">
        <span>ENTERING VELVET</span>
        <div className="velvet-film__track"><i/></div>
      </div>
      <span className="velvet-film__skip">SKIP INTRO ↗</span>
    </div>
  );
}
