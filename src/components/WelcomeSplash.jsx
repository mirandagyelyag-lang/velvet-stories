import { useEffect, useState } from "react";
import "../styles/velvet-entry-from-zip.css";

export default function WelcomeSplash() {
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem("velvet-entry-seen-v3") !== "1"; }
    catch { return true; }
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLeaving(true), reduced ? 100 : 1250);
    return () => window.clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem("velvet-entry-seen-v3", "1"); } catch {}
      setVisible(false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!visible) return null;
  return (
    <div className={`velvet-private-entry${leaving ? " velvet-private-entry--leaving" : ""}`} aria-label="Abriendo Velvet Stories">
      <div className="velvet-private-entry__fold velvet-private-entry__fold--left" aria-hidden="true" />
      <div className="velvet-private-entry__fold velvet-private-entry__fold--right" aria-hidden="true" />
      <div className="velvet-private-entry__identity">
        <svg className="velvet-private-entry__mark" viewBox="0 0 120 120" aria-hidden="true">
          <defs><linearGradient id="velvetPrivateMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F7F0ED"/><stop offset=".52" stopColor="#EBDACD"/><stop offset="1" stopColor="#BC8398"/></linearGradient></defs>
          <path d="M24 24 L60 98 L96 24" fill="none" stroke="url(#velvetPrivateMetal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="velvet-private-entry__name">VELVET</div>
        <div className="velvet-private-entry__subtitle">STORIES</div>
      </div>
    </div>
  );
}
