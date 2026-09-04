import { useEffect, useState } from "react";
import "../styles/welcome-splash.css";

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
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="velvet-splash velvet-splash--entry"
      role="button"
      tabIndex={0}
      aria-label="Velvet Stories is loading. Tap to skip."
      onClick={() => {
        try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}
        setVisible(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}
          setVisible(false);
        }
      }}
    >
      <div className="velvet-splash__art" aria-hidden="true" />
      <div className="velvet-splash__glow" aria-hidden="true" />
      <div className="velvet-splash__sheen" aria-hidden="true" />
      <span className="sr-only">Loading Velvet Stories</span>
    </div>
  );
}
