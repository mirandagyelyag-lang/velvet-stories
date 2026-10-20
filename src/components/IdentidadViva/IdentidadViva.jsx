import { useEffect, useRef, useState } from "react";
import "./IdentidadViva.css";

function OrvayneGlobe({theme='dark'}){
  const host=useRef(null);
  useEffect(()=>{
    let disposed=false,globe,script;
    const el=host.current;
    if(!el)return;
    const setup=async()=>{
      if(disposed||!window.Globe||!el)return;
      try{
        const size=180;
        globe=window.Globe()(el).width(size).height(size).backgroundColor('rgba(0,0,0,0)')
          .showAtmosphere(true).atmosphereColor(theme==='comfort'?'#5eaeef':theme==='light'?'#e6d8de':'#b879e9').atmosphereAltitude(.055).showGraticules(false);
        const material=globe.globeMaterial();
        if(material?.color)material.color.set('#ffffff');
        if(material?.emissive)material.emissive.set('#000000');
        // Avoid geographic paths that draw diagonal lines over the globe.
        globe.pointOfView({lat:18,lng:-42,altitude:1.9},0);
        const controls=globe.controls();controls.autoRotate=true;controls.autoRotateSpeed=1.1;
        controls.enableZoom=false;controls.enablePan=false;controls.enableDamping=true;
        const response=await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
        if(!response.ok)throw new Error('Map data unavailable');
        const geo=await response.json();if(disposed)return;
        const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
        const ctx=canvas.getContext('2d');
        const xy=p=>[(p[0]+180)/360*canvas.width,(90-p[1])/180*canvas.height];
        ctx.fillStyle=theme==='comfort'?'#7ec7ff':theme==='light'?'#66505e':'#d5a1f7';
        for(const feature of geo.features){
          const geom=feature.geometry;if(!geom)continue;
          const polys=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
          for(const rings of polys){
            ctx.beginPath();
            for(const ring of rings){ring.forEach((point,i)=>{const [x,y]=xy(point);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.closePath()}
            ctx.fill('evenodd');
          }
        }
        // Keep only tiny white dots inside geographic land shapes.
        const pattern=document.createElement('canvas');pattern.width=8;pattern.height=8;
        const pc=pattern.getContext('2d');pc.fillStyle=theme==='comfort'?'#7ec7ff':theme==='light'?'#66505e':'#d5a1f7';pc.beginPath();pc.arc(4,4,1.5,0,Math.PI*2);pc.fill();
        ctx.globalCompositeOperation='destination-in';ctx.fillStyle=ctx.createPattern(pattern,'repeat');ctx.fillRect(0,0,2048,1024);
        // A faint dot field on the oceans prevents the globe going blank as it turns.
        ctx.globalCompositeOperation='destination-over';
        const ocean=document.createElement('canvas');ocean.width=12;ocean.height=12;
        const oc=ocean.getContext('2d');oc.fillStyle=theme==='comfort'?'rgba(65,139,207,.3)':theme==='light'?'rgba(149,127,139,.14)':'rgba(145,88,182,.24)';
        oc.beginPath();oc.arc(6,6,.85,0,Math.PI*2);oc.fill();
        ctx.fillStyle=ctx.createPattern(ocean,'repeat');ctx.fillRect(0,0,2048,1024);
        ctx.fillStyle=theme==='comfort'?'#061c39':theme==='light'?'#e9e2e5':'#090512';ctx.fillRect(0,0,2048,1024);
        globe.globeImageUrl(canvas.toDataURL('image/png'));
      }catch(err){console.warn('ORVAYNE globe detail unavailable',err)}
    };
    if(window.Globe){setup()}else{
      script=document.createElement('script');script.src='https://unpkg.com/globe.gl@2.45.0/dist/globe.gl.min.js';
      script.async=true;script.onload=setup;document.head.appendChild(script);
    }
    return()=>{disposed=true;if(script)script.onload=null;if(globe){try{globe.pauseAnimation();globe._destructor?.()}catch{}}if(el)el.replaceChildren()};
  },[theme]);
  return <div className="iv-globe" aria-label="Globo terráqueo violeta con continentes punteados y órbitas animadas" role="img"><div ref={host} className="iv-globe__canvas"/><span className="iv-globe__ring iv-globe__ring--one"/><span className="iv-globe__ring iv-globe__ring--two"/></div>;
}

export default function IdentidadViva({open,theme="dark",onBack,onSignIn,onSignUp,onResetPassword,onSocialSignIn}) {
  const [step,setStep]=useState("email");
  const [mode,setMode]=useState("signin");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const input=useRef(null);
  useEffect(()=>{if(!open)return;const t=setTimeout(()=>input.current?.focus(),400);return()=>clearTimeout(t)},[open,step,mode]);
  async function next(e){
    e.preventDefault();if(busy)return;setMessage("");
    if(step==="email"){setStep("password");return}
    setBusy(true);
    try{
      if(mode==="signup"){const result=await onSignUp({email,password});if(!result?.session){setMessage("Cuenta creada. Revisa tu correo para confirmarla.");setStep("email");setPassword("");setMode("signin")}}
      else await onSignIn({email,password});
    }catch(error){setMessage(/invalid login credentials/i.test(error?.message||"")?"Correo o contraseña incorrectos.":error?.message||"No se pudo continuar.")}
    finally{setBusy(false)}
  }
  async function social(provider) {
    if (busy || !onSocialSignIn) return;
    setBusy(true); setMessage("");
    try { await onSocialSignIn(provider); }
    catch (error) { setMessage(error?.message || "No se pudo conectar. Revisa la configuración del proveedor."); setBusy(false); }
  }
  async function recover(){
    if(!email.trim()){setStep("email");setMessage("Escribe tu correo primero.");return}
    setBusy(true);setMessage("");
    try{await onResetPassword(email.trim());setMessage("Si existe una cuenta con ese correo, recibirás un enlace.")}
    catch(error){setMessage(error?.message||"No se pudo enviar el correo.")}
    finally{setBusy(false)}
  }
  return <section className={`identidad-viva identidad-viva--${theme}${open?" is-open":""}`} aria-hidden={!open} inert={!open} aria-label="Acceso a Orvayne">
    <button type="button" className="iv-back" onClick={onBack}>← VOLVER</button>
    <div className="iv-halo" aria-hidden="true"/>
    <div className="iv-content"><div className="iv-wordmark" aria-label="ORVAYNE"><span>ORVAYN</span><span className="iv-wordmark__e" aria-hidden="true"><i/><i/><i/></span></div><OrvayneGlobe theme={theme}/>
      <div className="iv-step" key={step+"-"+mode}>
        <h1>{step==="email"?(mode==="signup"?"Empecemos por tu correo":"¿Cuál es tu correo?"):"Ahora tu contraseña"}</h1>
        <form onSubmit={next}>
          {step==="email"?<input ref={input} aria-label="Correo electrónico" type="email" autoComplete="email" required value={email} placeholder="tu@correo.com" onChange={e=>setEmail(e.target.value)}/>:<input ref={input} aria-label="Contraseña" type="password" autoComplete={mode==="signup"?"new-password":"current-password"} required minLength={6} value={password} placeholder="••••••••" onChange={e=>setPassword(e.target.value)}/>}
          <button type="submit" className="iv-next" disabled={busy} aria-label="Continuar">{busy?"…":"→"}</button>
        </form>
      </div>
      {step==="password"&&<button className="iv-change" type="button" onClick={()=>{setStep("email");setMessage("")}}>← Cambiar correo</button>}
      {message&&<p className="iv-message" role="status">{message}</p>}
      <div className="iv-social" aria-label="Otras formas de acceder">
        <span className="iv-social__divider">O continúa con</span>
        <div className="iv-social__options">
          <button type="button" disabled={busy} onClick={() => social("google")} aria-label="Continuar con Google"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.23c0-.7-.06-1.39-.18-2.05H12v3.87h5.24a4.48 4.48 0 0 1-1.95 2.94v2.44h3.16c1.85-1.71 2.9-4.23 2.9-7.2z"/><path fill="#34A853" d="M12 21.75c2.64 0 4.86-.87 6.45-2.32l-3.16-2.44c-.87.58-1.99.93-3.29.93-2.53 0-4.68-1.71-5.45-4.01H3.29v2.51A9.75 9.75 0 0 0 12 21.75z"/><path fill="#FBBC05" d="M6.55 13.91a5.86 5.86 0 0 1 0-3.82V7.58H3.29a9.75 9.75 0 0 0 0 8.84z"/><path fill="#EA4335" d="M12 6.08c1.44 0 2.72.49 3.73 1.46l2.8-2.8A9.33 9.33 0 0 0 12 2.25a9.75 9.75 0 0 0-8.71 5.33l3.26 2.51c.77-2.3 2.92-4.01 5.45-4.01z"/></svg><span>Google</span></button>
          <button type="button" disabled={busy} onClick={() => social("apple")} aria-label="Continuar con Apple"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M17.1 12.5c0-2.06 1.69-3.07 1.77-3.12-.96-1.39-2.46-1.58-2.99-1.6-1.27-.14-2.5.75-3.14.75-.65 0-1.65-.74-2.73-.72-1.4.02-2.7.81-3.42 2.05-1.45 2.5-.37 6.2 1.04 8.22.71 1.01 1.55 2.15 2.66 2.11 1.07-.04 1.47-.69 2.75-.69 1.28 0 1.64.69 2.75.67 1.15-.02 1.87-1.03 2.55-2.05.82-1.18 1.15-2.35 1.17-2.41-.03-.01-2.22-.86-2.24-3.42zM15.02 6.43c.57-.7.96-1.65.85-2.6-.82.03-1.81.55-2.4 1.24-.53.6-.99 1.57-.87 2.49.91.07 1.84-.46 2.42-1.13z"/></svg><span>Apple</span></button>
        </div>
      </div>
      <div className="iv-links">
        <button type="button" disabled={busy} onClick={recover}>¿Olvidaste tu contraseña?</button>
        <button type="button" disabled={busy} onClick={()=>{setMode(mode==="signin"?"signup":"signin");setStep("email");setPassword("");setMessage("")}}>{mode==="signin"?"Crear cuenta":"Iniciar sesión"}</button>
      </div>
    </div>
  </section>;
}
