import portalArtwork from "../assets/velvet-portal-bg.webp";

export default function NativePortalLaunch() {
  const stars = Array.from({ length: 28 }, (_, index) => index);
  const petals = Array.from({ length: 8 }, (_, index) => index);

  return (
    <main className="app-loading app-loading--native app-loading--portal" aria-label="Velvet Stories is opening">
      <div className="velvet-portal__scene" aria-hidden="true">
        <img src={portalArtwork} alt="" draggable="false" />
      </div>

      <div className="velvet-portal__curtain velvet-portal__curtain--left" aria-hidden="true" />
      <div className="velvet-portal__curtain velvet-portal__curtain--right" aria-hidden="true" />
      <div className="velvet-portal__moon-glow" aria-hidden="true" />

      <div className="velvet-portal__stars" aria-hidden="true">
        {stars.map((star) => (
          <i
            key={star}
            style={{
              "--x": `${(star * 37 + 8) % 94}%`,
              "--y": `${(star * 53 + 6) % 78}%`,
              "--d": `${(star % 7) * -0.21}s`,
              "--s": `${1 + (star % 4) * 0.7}px`,
            }}
          />
        ))}
      </div>

      <div className="velvet-portal__petals" aria-hidden="true">
        {petals.map((petal) => (
          <i key={petal} style={{ "--petal": petal }} />
        ))}
      </div>

      <section className="velvet-portal__brand" aria-hidden="true">
        <span className="velvet-portal__ornament">✦</span>
        <strong>VELVET</strong>
        <span>STORIES</span>
      </section>

      <section className="velvet-portal__loading">
        <p>Entrando a tu historia...</p>
        <div className="velvet-portal__progress" aria-hidden="true">
          <i />
          <b>✦</b>
        </div>
        <small>Cada historia te espera.</small>
      </section>
    </main>
  );
}
