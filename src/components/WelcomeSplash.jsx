import { useEffect, useState } from "react";
import { isVelvetNativeRuntime } from "../native/velvetNative";
import velvetLogo from "../assets/velvet-logo.webp";
import velvetDarkReference from "../assets/velvet-cinematic-dark-reference.png";
import "../styles/welcome-splash.css";

function NativeDarkVelvetReveal() {
  return (
    <div className="velvet-reference velvet-reference--fluid" aria-hidden="true">
      <div className="velvet-reference__ambient" />

      <div className="velvet-reference__art-stage">
        <img
          className="velvet-reference__art"
          src={velvetDarkReference}
          alt=""
          draggable="false"
        />
      </div>

      <div className="velvet-reference__ribbon velvet-reference__ribbon--left" />
      <div className="velvet-reference__ribbon velvet-reference__ribbon--right" />
      <div className="velvet-reference__sheen" />
      <div className="velvet-reference__bloom" />
      <div className="velvet-reference__grain" />
    </div>
  );
}

export default function WelcomeSplash() {
  const nativeRuntime = isVelvetNativeRuntime();
  const [visible, setVisible] = useState(() => {
    if (nativeRuntime) return true;
    try { return sessionStorage.getItem("velvet-splash-seen") !== "1"; }
    catch { return true; }
  });

  useEffect(() => {
    if (!visible) return;
    const duration = nativeRuntime ? 3060 : 1250;
    const timer = window.setTimeout(() => {
      if (!nativeRuntime) {
        try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}
      }
      setVisible(false);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [visible, nativeRuntime]);

  if (!visible) return null;

  if (nativeRuntime) {
    return (
      <div className="velvet-splash velvet-splash--native velvet-splash--reference-dark velvet-splash--fluid">
        <NativeDarkVelvetReveal />
      </div>
    );
  }

  return (
    <div
      className="velvet-splash"
      onClick={() => {
        try { sessionStorage.setItem("velvet-splash-seen", "1"); } catch {}
        setVisible(false);
      }}
    >
      <img src={velvetLogo} alt="" />
      <h1>Velvet Stories</h1>
      <p>Every story begins with you.</p>
    </div>
  );
}
