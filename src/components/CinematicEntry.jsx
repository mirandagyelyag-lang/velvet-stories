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
          <button type="button" className="orv-cinema__listen" onClick={()=>setIndex(i=>(i+1)%lines.length)}>Conocer sus voces ↗</button>
        </div>
      </section>
      <section className="orv-cinema__theater" aria-label="Fragmentos de conversaciones con personajes">
        <div className="orv-cinema__orbit" aria-hidden="true"/>
        <div className="orv-cinema__halo" aria-hidden="true"/>
        <div className="orv-cinema__core" aria-hidden="true"><span>O</span></div>
        <div className="orv-cinema__scene">
          <div className="orv-cinema__scene-top"><span className="orv-cinema__live-dot"/> UNA HISTORIA EN CURSO <span className="orv-cinema__scene-number">0{index+1} / 03</span></div>
          <div className="orv-cinema__scene-body" key={index}>
            <span className="orv-cinema__sender">{voices[index].name}</span>
            <blockquote>“{lines[index][index]}”</blockquote>
            <p>{voices[index].detail}</p>
          </div>
          <div className="orv-cinema__scene-bottom"><span>LAS HISTORIAS CONTINÚAN CONTIGO</span><button type="button" onClick={()=>setIndex(i=>(i+1)%lines.length)} aria-label="Siguiente conversación">↗</button></div>
        </div>
        <div className="orv-cinema__scene-dots" aria-label="Conversación seleccionada">{voices.map((v,i)=><button key={v.name} type="button" aria-label={`Ver a ${v.name}`} aria-pressed={index===i} className={index===i?"active":""} onClick={()=>setIndex(i)}/>)}</div>
      </section>
    </main>
    <footer className="orv-cinema__foot"><span>ORVAYNE <strong>PRIVATE STORIES</strong></span><span>NO SOLO LEES LA HISTORIA. FORMAS PARTE DE ELLA.</span></footer>
  </div>;
}
