import { useEffect, useState } from "react";
import velvetLogo from "../assets/velvet-logo.webp";
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
    }, 1250);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="velvet-splash" onClick={() => { try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}; setVisible(false); }}>
      <img src={velvetLogo} alt="" />
      <h1>Velvet Stories</h1>
      <p>Every story begins with you.</p>
    </div>
  );
}
