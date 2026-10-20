import { useEffect, useState } from "react";
import "./CinematicEntry.css";

const lines = [
  ["You really thought I'd leave without saying goodbye?", "It's 2 a.m. You're still working?", "You noticed that too."],
  ["Don't look at me like that. I'm trying to behave.", "I made coffee. Don't make it a big deal.", "I remembered what you said."],
  ["You always have something to say, don't you?", "Stay. We're almost finished.", "I was hoping you'd come back."]
];
const voices = [
  {name:"CHASE", detail:"He hasn't moved from the doorway."},
  {name:"THEO", detail:"A warm cup lands beside your notes."},
  {name:"ROWAN", detail:"For once, he looks genuinely surprised."}
];

export default function CinematicEntry({ theme, onTheme, onEnter }) {
  const [index,setIndex]=useState(0);
  useEffect(()=>{
    const timer=window.setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%lines.length)},9000);
    return ()=>window.clearInterval(timer);
  },[]);
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
          <button type="button" className="orv-cinema__listen" onClick={()=>setIndex(i=>(i+1)%lines.length)}>Escuchar sus voces ↗</button>
        </div>
      </section>
      <section className="orv-cinema__theater" aria-label="Fragmentos de conversaciones con personajes">
        <div className="orv-cinema__orbit" aria-hidden="true"/>
        <div className="orv-cinema__halo" aria-hidden="true"/>
        <div className="orv-cinema__core" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M24 52C24 25 76 25 76 52S24 80 24 52Z"/><path d="M50 16C76 32 76 70 50 85M50 16C24 32 24 70 50 85"/><path d="M18 50H82"/></svg></div>
        {voices.map((v,i)=><article className={`orv-cinema__message orv-cinema__message--${i+1}`} key={v.name}>
          <span className="orv-cinema__sender"><b/> {v.name}</span>
          <p key={index}>{'“'+lines[index][i]+'”'}</p>
          <small>{v.detail}</small>
        </article>)}
      </section>
    </main>
    <footer className="orv-cinema__foot"><span>ORVAYNE <strong>PRIVATE STORIES</strong></span><span>NO SOLO LEES LA HISTORIA. FORMAS PARTE DE ELLA.</span></footer>
  </div>;
}
