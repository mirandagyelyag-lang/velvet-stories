import { useEffect } from "react";

import portalArtwork from "../assets/velvet-portal-bg.webp";
import { setNativeLaunchFullscreen } from "../native/velvetNative";

const VELVET_LETTERS = [..."VELVET"];

export default function NativePortalLaunch() {
  const stars = Array.from({ length: 22 }, (_, index) => index);
  const petals = Array.from({ length: 4 }, (_, index) => index);

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
