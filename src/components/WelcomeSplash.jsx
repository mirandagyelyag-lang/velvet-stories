import { useEffect, useState } from "react";
import { isVelvetNativeRuntime } from "../native/velvetNative";
import velvetLogo from "../assets/velvet-logo.webp";
import "../styles/welcome-splash.css";

export default function WelcomeSplash() {
  const nativeRuntime = isVelvetNativeRuntime();
  const [visible, setVisible] = useState(() => {
    // Native Android gets one deliberate, visible launch continuation.
    // It bridges the very brief Android system splash into Velvet instead of
    // disappearing before the user can perceive it.
    if (nativeRuntime) return true;
    try { return sessionStorage.getItem("velvet-splash-seen") !== "1"; }
    catch { return true; }
  });

  useEffect(() => {
    if (!visible) return;
    const duration = nativeRuntime ? 1050 : 1250;
    const timer = window.setTimeout(() => {
      if (!nativeRuntime) {
        try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}
      }
      setVisible(false);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  return (
    <div
      className={`velvet-splash${nativeRuntime ? " velvet-splash--native" : ""}`}
      onClick={() => {
        if (!nativeRuntime) {
          try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}
        }
        setVisible(false);
      }}
    >
      <img src={velvetLogo} alt="" />
      {!nativeRuntime && <h1>Velvet Stories</h1>}
      {!nativeRuntime && <p>Every story begins with you.</p>}
    </div>
  );
}
