import { useEffect, useState } from "react";
import { isVelvetNativeRuntime } from "../native/velvetNative";
import velvetLogo from "../assets/velvet-logo.webp";
import velvetDarkReference from "../assets/velvet-cinematic-dark-reference.webp";
import velvetCinematicInk from "../assets/velvet-cinematic-ink.webp";
import velvetCinematicCore from "../assets/velvet-cinematic-core.webp";
import "../styles/welcome-splash.css";

function NativeDarkVelvetReveal() {
  return (
    <div className="velvet-reference velvet-reference--build" aria-hidden="true">
      <div className="velvet-build__ambient" />

      <div className="velvet-build__reveal velvet-build__reveal--core">
        <img className="velvet-build__layer velvet-build__layer--core" src={velvetCinematicCore} alt="" draggable="false" />
      </div>

      <div className="velvet-build__reveal velvet-build__reveal--ink">
        <img className="velvet-build__layer velvet-build__layer--ink" src={velvetCinematicInk} alt="" draggable="false" />
      </div>

      <div className="velvet-build__draw-front" />
      <div className="velvet-build__ribbon velvet-build__ribbon--a" />
      <div className="velvet-build__ribbon velvet-build__ribbon--b" />

      <img
        className="velvet-build__final"
        src={velvetDarkReference}
        alt=""
        draggable="false"
      />

      <div className="velvet-build__final-glow" />
      <div className="velvet-build__grain" />
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
      <div className="velvet-splash velvet-splash--native velvet-splash--reference-dark velvet-splash--true-build">
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
