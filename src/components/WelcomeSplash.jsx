import { useEffect, useRef, useState } from "react";

export default function WelcomeSplash() {
  const frameRef = useRef(null);
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem("velvet-user-supplied-entry-v1") !== "1"; }
    catch { return true; }
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type !== "velvet-original-entry-enter") return;
      try { sessionStorage.setItem("velvet-user-supplied-entry-v1", "1"); } catch {}
      document.documentElement.classList.add("velvet-entry-transitioning");
      setLeaving(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [visible]);

  useEffect(() => {
    if (!leaving) return;
    const timeout = window.setTimeout(() => {
      setVisible(false);
      document.documentElement.classList.remove("velvet-entry-transitioning");
    }, 1150);
    return () => window.clearTimeout(timeout);
  }, [leaving]);

  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2147483000, background: "#0f080d",
      opacity: leaving ? 0 : 1,
      filter: leaving ? "blur(14px)" : "blur(0px)",
      transform: leaving ? "scale(1.055)" : "scale(1)",
      pointerEvents: leaving ? "none" : "auto",
      transition: "opacity 1.1s cubic-bezier(.22,1,.36,1), filter 1.1s ease, transform 1.1s cubic-bezier(.22,1,.36,1)"
    }} aria-label="Inicio de Velvet Stories">
      <iframe ref={frameRef} title="Inicio Velvet Stories" src="/velvet-original-entry.html"
        style={{ width: "100%", height: "100%", display: "block", border: 0, background: "#0f080d" }} />
    </div>
  );
}
