import { useEffect, useState } from "react";
import "./CinematicEntry.css";

const scenes = [
  [{line:"“You came back.”",detail:"The door stays open a moment longer."},{line:"“I wasn’t finished talking to you.”",detail:"A smile almost breaks through."},{line:"“Then stay.”",detail:"Neither of them moves."}],
  [{line:"“You remembered?”",detail:"The question comes out softer than intended."},{line:"“Of course I did.”",detail:"A small pause follows."},{line:"“I didn’t think you would.”",detail:"The silence says enough."}],
  [{line:"“You’re impossible.”",detail:"There’s no real anger in it."},{line:"“And yet you’re still here.”",detail:"A glance lingers."},{line:"“Don’t get used to it.”",detail:"The smile gives everything away."}],
  [{line:"“What happens now?”",detail:"Outside, the rain begins."},{line:"“That depends on you.”",detail:"No one looks away."},{line:"“Then don’t leave yet.”",detail:"The night stretches ahead."}]
];

export default function CinematicEntry({ theme, onTheme, onEnter, entered=false, children }) {
  const [sceneIndex,setSceneIndex] = useState(0);
  useEffect(() => { if (entered) return; const timer = setInterval(() => setSceneIndex(i => (i+1)%scenes.length), 8500); return () => clearInterval(timer); }, [entered]);
  return <div className={`orv-cinema orv-cinema--${theme}${entered?" orv-cinema--login":""}`}>
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
        <h1 className="orv-cinema__slogan">Beyond<br/><em>the Script.</em></h1>
        <p>Más allá del guion. Personajes, conversaciones e historias que toman forma con tus decisiones.</p>
        <div className="orv-cinema__actions">
          <button type="button" className="orv-cinema__enter" onClick={onEnter}>ENTRAR <span>↗</span></button>
        </div>
      </section>
      <section className="orv-cinema__theater orv-cinema__theater--art" aria-label="Arte abstracto inspirado en conversaciones">
        <div className="orv-cinema__art-halo" aria-hidden="true"/>
        <div className="orv-cinema__art-ring orv-cinema__art-ring--one" aria-hidden="true"/>
        <div className="orv-cinema__art-ring orv-cinema__art-ring--two" aria-hidden="true"/>
        <div className="orv-cinema__chat-preview" aria-label="Fragmentos ficticios de conversaciones" aria-live="off" key={sceneIndex}>
          {scenes[sceneIndex].map((item,i)=><div key={i} className={`orv-cinema__chat-bubble orv-cinema__chat-bubble--card-${i+1}`}><span className="orv-cinema__chat-dot" aria-hidden="true"/><span className="orv-cinema__chat-line">{item.line}</span><span className="orv-cinema__chat-detail">{item.detail}</span></div>)}
        </div>{children}
        <div className="orv-cinema__art-caption">CADA PALABRA ABRE UN MUNDO <span>✦</span></div>
      </section>
    </main>
    <footer className="orv-cinema__foot"><span>ORVAYNE <strong>PRIVATE STORIES</strong></span><span>IMAGINA · CONVERSA · CREA</span></footer>
  </div>;
}
