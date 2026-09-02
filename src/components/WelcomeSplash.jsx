import { useEffect, useState } from "react";
import { isVelvetNativeRuntime } from "../native/velvetNative";
import velvetLogo from "../assets/velvet-logo.webp";
import "../styles/welcome-splash.css";

function NativeCinematicSplash() {
  return (
    <div className="velvet-cinematic" aria-hidden="true">
      <div className="velvet-cinematic__haze velvet-cinematic__haze--one" />
      <div className="velvet-cinematic__haze velvet-cinematic__haze--two" />

      <svg
        className="velvet-cinematic__mark"
        viewBox="0 0 900 330"
        role="presentation"
        focusable="false"
      >
        <defs>
          <linearGradient id="velvetWordGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7e173d" />
            <stop offset="34%" stopColor="#f0a5ad" />
            <stop offset="55%" stopColor="#fff0e6" />
            <stop offset="72%" stopColor="#b52e58" />
            <stop offset="100%" stopColor="#541026" />
          </linearGradient>
          <linearGradient id="velvetRibbonGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4b0d22" stopOpacity="0" />
            <stop offset="42%" stopColor="#b72e57" stopOpacity=".82" />
            <stop offset="58%" stopColor="#ffd0c8" stopOpacity=".95" />
            <stop offset="100%" stopColor="#6c1432" stopOpacity="0" />
          </linearGradient>
          <filter id="velvetGlow" x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0.28  0 0.36 0 0 0.02  0 0 0.32 0 0.08  0 0 0 1 0"
            />
          </filter>
        </defs>

        <g className="velvet-cinematic__ribbons">
          <path
            className="velvet-cinematic__ribbon velvet-cinematic__ribbon--a"
            d="M80 255 C205 70 300 68 410 168 S625 292 832 82"
          />
          <path
            className="velvet-cinematic__ribbon velvet-cinematic__ribbon--b"
            d="M118 48 C280 118 338 282 506 191 S710 55 838 214"
          />
          <path
            className="velvet-cinematic__ribbon velvet-cinematic__ribbon--c"
            d="M35 205 C236 300 334 28 532 104 S711 299 875 158"
          />
        </g>

        <text className="velvet-cinematic__word velvet-cinematic__word--glow" x="450" y="215" textAnchor="middle">
          Velvet
        </text>
        <text className="velvet-cinematic__word velvet-cinematic__word--trace" x="450" y="215" textAnchor="middle">
          Velvet
        </text>
        <text className="velvet-cinematic__word velvet-cinematic__word--fill" x="450" y="215" textAnchor="middle">
          Velvet
        </text>
      </svg>

      <div className="velvet-cinematic__stories">STORIES</div>
      <div className="velvet-cinematic__spark velvet-cinematic__spark--one" />
      <div className="velvet-cinematic__spark velvet-cinematic__spark--two" />
      <div className="velvet-cinematic__spark velvet-cinematic__spark--three" />
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
    const duration = nativeRuntime ? 2380 : 1250;
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
      <div className="velvet-splash velvet-splash--native velvet-splash--cinematic">
        <NativeCinematicSplash />
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
