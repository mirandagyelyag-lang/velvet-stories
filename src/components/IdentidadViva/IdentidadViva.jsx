import { useEffect, useRef, useState } from "react";
import "./IdentidadViva.css";

export default function IdentidadViva({open,theme="dark",onBack,onSignIn,onSignUp,onResetPassword}) {
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
    <div className="iv-content"><span className="iv-spark" aria-hidden="true">✦</span>
      <div className="iv-step" key={step+"-"+mode}>
        <h1>{step==="email"?(mode==="signup"?"Empecemos por tu correo":"¿Cuál es tu correo?"):"Ahora tu contraseña"}</h1>
        <form onSubmit={next}>
          {step==="email"?<input ref={input} aria-label="Correo electrónico" type="email" autoComplete="email" required value={email} placeholder="tu@correo.com" onChange={e=>setEmail(e.target.value)}/>:<input ref={input} aria-label="Contraseña" type="password" autoComplete={mode==="signup"?"new-password":"current-password"} required minLength={6} value={password} placeholder="••••••••" onChange={e=>setPassword(e.target.value)}/>}
          <button type="submit" className="iv-next" disabled={busy} aria-label="Continuar">{busy?"…":"→"}</button>
        </form>
      </div>
      {step==="password"&&<button className="iv-change" type="button" onClick={()=>{setStep("email");setMessage("")}}>← Cambiar correo</button>}
      {message&&<p className="iv-message" role="status">{message}</p>}
      <div className="iv-links">
        <button type="button" disabled={busy} onClick={recover}>¿Olvidaste tu contraseña?</button>
        <button type="button" disabled={busy} onClick={()=>{setMode(mode==="signin"?"signup":"signin");setStep("email");setPassword("");setMessage("")}}>{mode==="signin"?"Crear cuenta":"Iniciar sesión"}</button>
      </div>
    </div>
  </section>;
}
