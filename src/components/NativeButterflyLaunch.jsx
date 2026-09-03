import butterflyArtwork from "../assets/velvet-launch-butterfly.png";

export default function NativeButterflyLaunch() {
  const stars = Array.from({ length: 24 }, (_, index) => index);
  const motes = Array.from({ length: 11 }, (_, index) => index);

  return (
    <main className="app-loading app-loading--native app-loading--butterfly-cinematic" aria-label="Velvet Stories is starting">
      <div className="velvet-cinematic__aurora" aria-hidden="true" />
      <div className="velvet-cinematic__silk velvet-cinematic__silk--one" aria-hidden="true" />
      <div className="velvet-cinematic__silk velvet-cinematic__silk--two" aria-hidden="true" />

      <div className="velvet-cinematic__stars" aria-hidden="true">
        {stars.map((star) => (
          <i
            key={star}
            style={{
              "--star-x": `${(star * 41 + 9) % 96}%`,
              "--star-y": `${(star * 59 + 11) % 91}%`,
              "--star-size": `${1.4 + (star % 4) * 0.65}px`,
              "--star-delay": `${star * -117}ms`,
            }}
          />
        ))}
      </div>

      <div className="velvet-cinematic__flight" aria-hidden="true">
        <div className="velvet-cinematic__butterfly-wrap">
          <img className="velvet-cinematic__butterfly" src={butterflyArtwork} alt="" draggable="false" />
          <div className="velvet-cinematic__halo" />
        </div>
        <div className="velvet-cinematic__trail">
          {motes.map((mote) => (
            <i key={mote} style={{ "--mote": mote }} />
          ))}
        </div>
      </div>

      <section className="velvet-cinematic__brand" aria-hidden="true">
        <span className="velvet-cinematic__monogram">V</span>
        <strong>VELVET</strong>
        <span className="velvet-cinematic__stories">STORIES</span>
        <i className="velvet-cinematic__diamond">✦</i>
      </section>

      <section className="velvet-cinematic__loading">
        <p>Entrando a tu historia...</p>
        <div className="velvet-cinematic__progress" aria-hidden="true">
          <i />
          <b>✦</b>
        </div>
        <div className="velvet-cinematic__dots" aria-hidden="true">
          <i /><i /><i /><b>✦</b><i /><i /><i />
        </div>
      </section>
    </main>
  );
}
