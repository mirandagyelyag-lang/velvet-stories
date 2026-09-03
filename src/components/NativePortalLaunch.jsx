import { useEffect } from "react";

import portalArtwork from "../assets/velvet-portal-bg.webp";
import { setNativeLaunchFullscreen } from "../native/velvetNative";

const VELVET_LETTERS = [..."VELVET"];

export default function NativePortalLaunch() {
  const stars = Array.from({ length: 22 }, (_, index) => index);
  const petals = Array.from({ length: 6 }, (_, index) => index);

  useEffect(() => {
    setNativeLaunchFullscreen(true);
    return () => { setNativeLaunchFullscreen(false); };
  }, []);

  return (
    <main className="app-loading app-loading--native app-loading--portal app-loading--portal-living" aria-label="Velvet Stories is opening">
      <div className="velvet-portal__scene" aria-hidden="true">
        <img src={portalArtwork} alt="" draggable="false" />
        <div className="velvet-portal__depth velvet-portal__depth--near" />
        <div className="velvet-portal__depth velvet-portal__depth--far" />
      </div>

      <div className="velvet-portal__curtain velvet-portal__curtain--left" aria-hidden="true"><i /></div>
      <div className="velvet-portal__curtain velvet-portal__curtain--right" aria-hidden="true"><i /></div>
      <div className="velvet-portal__moon-glow" aria-hidden="true" />

      <div className="velvet-portal__stars" aria-hidden="true">
        {stars.map((star) => (
          <i
            key={star}
            style={{
              "--x": `${(star * 41 + 7) % 91}%`,
              "--y": `${(star * 57 + 5) % 70}%`,
              "--delay": `${1.05 + (star % 8) * 0.19}s`,
              "--size": `${1 + (star % 3) * 0.8}px`,
            }}
          />
        ))}
      </div>

      <div className="velvet-portal__traveler" aria-hidden="true">
        <span className="velvet-portal__trail" />
        <svg viewBox="0 0 120 82" role="presentation">
          <g className="velvet-portal__wing velvet-portal__wing--left">
            <path d="M59 43C44 15 15 5 9 24c-5 18 16 32 47 24-19 18-34 21-36 7-2-11 12-15 39-12Z" />
            <path d="M57 45C42 32 24 29 20 42c-4 13 13 21 36 10" />
          </g>
          <g className="velvet-portal__wing velvet-portal__wing--right">
            <path d="M61 43c15-28 44-38 50-19 5 18-16 32-47 24 19 18 34 21 36 7 2-11-12-15-39-12Z" />
            <path d="M63 45c15-13 33-16 37-3 4 13-13 21-36 10" />
          </g>
          <path className="velvet-portal__body" d="M60 38c2 9 2 18 0 30M60 39c-4-10-10-15-15-18M60 39c4-10 10-15 15-18" />
        </svg>
      </div>

      <div className="velvet-portal__petals" aria-hidden="true">
        {petals.map((petal) => <i key={petal} style={{ "--petal": petal }} />)}
      </div>

      <section className="velvet-portal__brand" aria-hidden="true">
        <div className="velvet-portal__word" aria-label="Velvet">
          {VELVET_LETTERS.map((letter, index) => (
            <strong key={`${letter}-${index}`} style={{ "--letter": index }}>{letter}</strong>
          ))}
        </div>
        <span className="velvet-portal__stories">STORIES</span>
        <span className="velvet-portal__ornament">✦</span>
      </section>

      <section className="velvet-portal__loading">
        <p>Entrando a tu historia...</p>
        <div className="velvet-portal__progress" aria-hidden="true">
          <i />
          <b>✦</b>
        </div>
        <small>Cada historia te espera.</small>
      </section>

      <div className="velvet-portal__final-glow" aria-hidden="true" />
    </main>
  );
}
