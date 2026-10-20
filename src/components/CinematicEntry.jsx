import "./CinematicEntry.css";

export default function CinematicEntry({ theme, onTheme, onEnter }) {
  return <div className={`orv-cinema orv-cinema--${theme}`}>
    <div className="orv-cinema__grain" aria-hidden="true"/>
    <div className="orv-cinema__aura orv-cinema__aura--one" aria-hidden="true"/>
    <div className="orv-cinema__aura orv-cinema__aura--two" aria-hidden="true"/>
    <header className="orv-cinema__top">
      <div className="orv-cinema__logo" aria-label="ORVAYNE">ORVAYN<span className="orv-cinema__e"><i/><i/><i/></span></div>
      <span className="orv-cinema__topnote">PERSONAJES · CONVERSACIONES · HISTORIAS</span>
      <div className="orv-cinema__themes" aria-label="Apariencia">
        {[["dark","Oscuro"],["light","Blanco"],["comfort","Celeste"]].map(([value,label])=><button key={value} type="button" className={theme===value?"is-active":""} aria-pressed={theme===value} onClick={()=>onTheme(value)}>{label}</button>)}
      </div>
    </header>
    <main className="orv-cinema__stage">
      <section className="orv-cinema__copy">
        <span className="orv-cinema__eyebrow">TU HISTORIA COMIENZA AQUÍ</span>
        <h1>Hay historias<br/>que <em>te esperan.</em></h1>
        <p>Personajes con voz propia. Conversaciones que dejan huella. Un universo que cambia con cada palabra que eliges.</p>
        <div className="orv-cinema__actions">
          <button type="button" className="orv-cinema__enter" onClick={onEnter}>ENTRAR A ORVAYNE <span>↗</span></button>
          <button type="button" className="orv-cinema__listen" onClick={onEnter}>Comenzar tu historia ↗</button>
        </div>
      </section>
      <section className="orv-cinema__theater" aria-label="Un universo privado de historias">
        <div className="orv-cinema__orbit" aria-hidden="true"/>
        <div className="orv-cinema__halo" aria-hidden="true"/>
        <div className="orv-cinema__core" aria-hidden="true"><span>O</span></div>
        <div className="orv-cinema__scene orv-cinema__scene--private">
          <div className="orv-cinema__scene-top"><span className="orv-cinema__live-dot"/> UN UNIVERSO POR DESCUBRIR</div>
          <div className="orv-cinema__scene-body">
            <span className="orv-cinema__sender">SOLO TUYO</span>
            <blockquote>Cada conversación abre una nueva posibilidad.</blockquote>
            <p>Tus personajes y tus historias permanecen dentro de tu espacio personal.</p>
          </div>
          <div className="orv-cinema__scene-bottom"><span>TU HISTORIA. TUS DECISIONES.</span><span aria-hidden="true">✧</span></div>
        </div>
      </section>
    </main>
    <footer className="orv-cinema__foot"><span>ORVAYNE <strong>PRIVATE STORIES</strong></span><span>NO SOLO LEES LA HISTORIA. FORMAS PARTE DE ELLA.</span></footer>
  </div>;
}
