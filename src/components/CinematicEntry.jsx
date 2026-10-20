import "./CinematicEntry.css";

export default function CinematicEntry({ theme, onTheme, onEnter }) {
  return <div className={`orv-cinema orv-cinema--${theme}`}>
    <div className="orv-cinema__grain" aria-hidden="true"/>
    <div className="orv-cinema__aura orv-cinema__aura--one" aria-hidden="true"/>
    <div className="orv-cinema__aura orv-cinema__aura--two" aria-hidden="true"/>
    <header className="orv-cinema__top">
      <div className="orv-cinema__logo" aria-label="ORVAYNE">ORVAYN<span className="orv-cinema__e"><i/><i/><i/></span></div>
      <div className="orv-cinema__topnote" aria-label="Personajes, conversaciones e historias"><span>PERSONAJES</span><i aria-hidden="true"/><span>CONVERSACIONES</span><i aria-hidden="true"/><span>HISTORIAS</span></div>
      <div className="orv-cinema__themes" aria-label="Apariencia">
        {[["dark","Oscuro"],["light","Blanco"],["comfort","Celeste"]].map(([value,label])=><button key={value} type="button" className={theme===value?"is-active":""} aria-pressed={theme===value} onClick={()=>onTheme(value)}>{label}</button>)}
      </div>
    </header>
    <main className="orv-cinema__stage">
      <section className="orv-cinema__copy">
        <h1>La historia<br/><em>te responde.</em></h1>
        <p>Crea personajes, habla con ellos y deja que cada decisión cambie lo que viene.</p>
        <div className="orv-cinema__actions">
          <button type="button" className="orv-cinema__enter" onClick={onEnter}>ENTRAR <span>↗</span></button>
        </div>
      </section>
      <section className="orv-cinema__theater orv-cinema__theater--art" aria-label="Arte abstracto inspirado en conversaciones">
        <div className="orv-cinema__art-halo" aria-hidden="true"/>
        <div className="orv-cinema__art-ring orv-cinema__art-ring--one" aria-hidden="true"/>
        <div className="orv-cinema__art-ring orv-cinema__art-ring--two" aria-hidden="true"/>
        <div className="orv-cinema__art-mark" aria-hidden="true">“</div>
        <div className="orv-cinema__art-caption">CADA PALABRA ABRE UN MUNDO <span>✦</span></div>
      </section>
    </main>
    <footer className="orv-cinema__foot"><span>ORVAYNE <strong>PRIVATE STORIES</strong></span><span>IMAGINA · CONVERSA · CREA</span></footer>
  </div>;
}
