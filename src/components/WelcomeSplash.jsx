import { useEffect, useState } from "react";
import { isVelvetNativeRuntime } from "../native/velvetNative";
import velvetLogo from "../assets/velvet-logo.webp";
import velvetDarkReference from "../assets/velvet-cinematic-dark-reference.png";
import "../styles/welcome-splash.css";

function NativeDarkVelvetReveal() {
  return (
    <div className="velvet-reference" aria-hidden="true">
      <div className="velvet-reference__ambient" />

      <div className="velvet-reference__stage">
        <img
          className="velvet-reference__image velvet-reference__image--ghost"
          src={velvetDarkReference}
          alt=""
          draggable="false"
        />
        <img
          className="velvet-reference__image velvet-reference__image--slice velvet-reference__image--slice-a"
          src={velvetDarkReference}
          alt=""
          draggable="false"
        />
        <img
          className="velvet-reference__image velvet-reference__image--slice velvet-reference__image--slice-b"
          src={velvetDarkReference}
          alt=""
          draggable="false"
        />
        <img
          className="velvet-reference__image velvet-reference__image--slice velvet-reference__image--slice-c"
          src={velvetDarkReference}
          alt=""
          draggable="false"
        />
        <img
          className="velvet-reference__image velvet-reference__image--sweep"
          src={velvetDarkReference}
          alt=""
          draggable="false"
        />
        <img
          className="velvet-reference__image velvet-reference__image--final"
          src={velvetDarkReference}
          alt=""
          draggable="false"
        />
      </div>

      <div className="velvet-reference__beam velvet-reference__beam--left" />
      <div className="velvet-reference__beam velvet-reference__beam--right" />
      <div className="velvet-reference__flash" />
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
    const duration = nativeRuntime ? 2860 : 1250;
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
      <div className="velvet-splash velvet-splash--native velvet-splash--reference-dark">
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
