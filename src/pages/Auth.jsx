import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const frame = useRef(null);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "velvet-original-entry-enter") setEntered(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        const result = await signUp({ email, password });
        if (!result?.session) setMessage("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
      } else {
        await signIn({ email, password });
      }
      try { sessionStorage.setItem("velvet-user-supplied-entry-v1", "1"); } catch {}
    } catch (error) {
      setMessage(/invalid login credentials/i.test(error?.message || "") ? "Correo o contraseña incorrectos." : (error?.message || "No se pudo iniciar sesión."));
    } finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!email.trim()) { setMessage("Escribe tu correo primero para recuperar tu contraseña."); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setMessage("Si existe una cuenta con ese correo, recibirás un enlace para recuperar tu contraseña.");
    } catch (error) { setMessage(error?.message || "No se pudo enviar el correo."); }
    finally { setBusy(false); }
  }

  return <main className="velvet-gold-auth">
    <style>{`
      .velvet-gold-auth{position:fixed;inset:0;overflow:hidden;background:#0a0306;color:#f3e7d3;font-family:Manrope,system-ui,sans-serif;z-index:100}
      .velvet-gold-auth iframe{width:100%;height:100%;border:0;display:block}
      .velvet-gold-auth .login{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;background:radial-gradient(ellipse at 78% 8%,rgba(218,136,67,.43),transparent 37%),radial-gradient(ellipse at 15% 42%,rgba(153,51,65,.65),transparent 53%),radial-gradient(ellipse at 90% 85%,rgba(201,114,65,.36),transparent 42%),linear-gradient(145deg,#32111b,#792837 58%,#280c15);display:flex;justify-content:center;align-items:center;padding:24px 24px max(30px,env(safe-area-inset-bottom));}
      .velvet-gold-auth .login::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.3;background:repeating-radial-gradient(ellipse at 50% 20%,transparent 0 31px,rgba(245,187,112,.07) 32px 34px,transparent 36px 74px)}
      .velvet-gold-auth .panel{width:min(100%,420px);position:relative;display:flex;flex-direction:column;align-items:center;margin:auto}
      .velvet-gold-auth .back{position:absolute;right:0;top:0;border:1px solid rgba(230,211,168,.45);border-radius:50%;width:43px;height:43px;background:rgba(40,13,22,.45);color:#e6d3a8;font-size:24px;cursor:pointer}
      .velvet-gold-auth .emblem{height:clamp(200px,35vh,320px);width:100%;display:grid;place-items:center;position:relative;margin-top:30px}
      .velvet-gold-auth .ring{position:absolute;border:1px solid rgba(230,191,117,.75);border-radius:50%;width:min(70vw,280px);aspect-ratio:1;box-shadow:0 0 16px rgba(216,184,120,.22)}
      .velvet-gold-auth .ring.outer{width:min(79vw,320px);opacity:.48}
      .velvet-gold-auth .letter{font-family:Georgia,serif;font-size:clamp(145px,39vw,225px);font-weight:bold;line-height:1;color:#c79a50;text-shadow:3px 5px 0 #815022,0 0 20px rgba(216,184,120,.4);transform:scaleX(.92)}
      .velvet-gold-auth h1{font-family:"Cormorant Garamond",Georgia,serif;font-size:clamp(25px,7vw,38px);font-weight:400;letter-spacing:.16em;text-align:center;white-space:nowrap;margin:0;color:#e6d3a8}
      .velvet-gold-auth .tag{font-family:"Cormorant Garamond",Georgia,serif;font-size:22px;font-style:italic;color:#d8b878;margin:10px 0 30px}
      .velvet-gold-auth form{width:100%;display:flex;flex-direction:column;gap:12px}
      .velvet-gold-auth input{width:100%;height:62px;padding:0 20px;border-radius:14px;border:1px solid rgba(216,184,120,.35);background:rgba(35,9,17,.74);color:#f3e7d3;font:300 18px Manrope,system-ui,sans-serif;outline:none}
      .velvet-gold-auth input::placeholder{color:#c2a67a}
      .velvet-gold-auth input:focus{border-color:#e6d3a8}
      .velvet-gold-auth .submit{margin-top:8px;height:62px;border:0;border-radius:14px;background:linear-gradient(110deg,#c9a35e,#f0dba8 55%,#c9a35e);color:#1c0a12;letter-spacing:.32em;font-size:14px;cursor:pointer}
      .velvet-gold-auth .links{width:100%;display:flex;justify-content:space-between;gap:10px;margin-top:20px}
      .velvet-gold-auth .links button{background:none;border:0;padding:0;color:#e6d3a8;text-decoration:underline;font-size:13px;cursor:pointer}
      .velvet-gold-auth .message{font-size:13px;line-height:1.5;color:#f3e7d3;margin:12px 0 0;text-align:center}

      .velvet-gold-auth .login{isolation:isolate;background:radial-gradient(ellipse at 80% 10%,rgba(183,88,58,.3),transparent 48%),radial-gradient(ellipse at 0% 75%,rgba(130,38,61,.3),transparent 55%),linear-gradient(145deg,#19070e,#42101e 55%,#200810)}
      .velvet-gold-auth .login::before{background:radial-gradient(ellipse at 85% 25%,rgba(239,165,100,.15),transparent 45%),radial-gradient(ellipse at 5% 85%,rgba(224,111,84,.13),transparent 45%);opacity:1}
      .velvet-gold-auth .chat-decor{position:absolute;inset:0;overflow:hidden;pointer-events:none}
      .velvet-gold-auth .bubble{position:absolute;width:95px;height:55px;display:grid;place-items:center;border:1px solid rgba(224,172,106,.36);border-radius:22px 22px 22px 7px;background:rgba(112,52,59,.22);backdrop-filter:blur(5px);color:rgba(242,198,135,.72);font-size:22px;letter-spacing:7px;animation:velvetBubbleFloat 8s ease-in-out infinite alternate}
      .velvet-gold-auth .bubble-one{top:8%;left:-38px;transform:rotate(-13deg)}
      .velvet-gold-auth .bubble-two{top:17%;right:-36px;transform:rotate(12deg);animation-delay:-3s}
      .velvet-gold-auth .bubble-three{top:57%;left:-65px;animation-delay:-5s}
      .velvet-gold-auth .bubble-four{bottom:5%;right:-26px;animation-delay:-2s}
      @keyframes velvetBubbleFloat{to{translate:0 -15px;opacity:.55}}
      .velvet-gold-auth .panel{z-index:1}
      .velvet-gold-auth .emblem{height:clamp(170px,28vh,250px);margin-top:10px}
      .velvet-gold-auth .ring{width:min(57vw,235px)}
      .velvet-gold-auth .ring.outer{width:min(66vw,275px)}
      .velvet-gold-auth .letter{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;color:#e5b76c;text-shadow:3px 5px #70401e,0 0 24px rgba(223,166,92,.3)}
      .velvet-gold-auth h1{font-size:clamp(48px,14vw,70px);line-height:.95;letter-spacing:.14em;padding-left:.14em;background:linear-gradient(160deg,#fff2d5,#ddb377 55%,#b37a3e);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
      .velvet-gold-auth .stories-word{display:flex;align-items:center;gap:13px;width:85%;margin-top:11px;color:#e6c38c;font:400 12px "Cormorant Garamond",Georgia,serif;letter-spacing:.55em;padding-left:.55em}
      .velvet-gold-auth .stories-word::before,.velvet-gold-auth .stories-word::after{content:"";height:1px;flex:1;background:rgba(220,176,120,.6)}
      .velvet-gold-auth .ornament{color:#e6c38c;margin-top:8px}
      .velvet-gold-auth .tag{font-size:22px;margin:7px 0 22px;text-align:center}
      .velvet-gold-auth input{height:60px;border-radius:19px;border-color:rgba(220,166,103,.5);background:rgba(33,9,18,.8);box-shadow:inset 0 1px rgba(249,208,146,.08);font-size:16px}
      .velvet-gold-auth .submit{height:62px;margin-top:13px;border:1px solid #e2b575;border-radius:18px;background:linear-gradient(110deg,rgba(35,9,19,.94),rgba(77,25,34,.85),rgba(35,9,19,.94));box-shadow:0 0 23px rgba(225,164,92,.16);color:#f1d29c;font:400 20px "Cormorant Garamond",Georgia,serif;letter-spacing:.4em}
      .velvet-gold-auth .links button{font:400 17px "Cormorant Garamond",Georgia,serif;text-underline-offset:4px}
      @media(max-height:760px){.velvet-gold-auth .emblem{height:160px}.velvet-gold-auth .ring{width:175px}.velvet-gold-auth .ring.outer{width:205px}.velvet-gold-auth .letter{font-size:145px}.velvet-gold-auth .tag{margin-bottom:13px}.velvet-gold-auth input{height:53px}.velvet-gold-auth .submit{height:54px}}

      /* Continuous cinematic scene: keep the original animated canvas mounted. */
      .velvet-gold-auth .entry-scene{position:absolute;inset:0;z-index:0;transition:filter .8s ease,transform 1.1s cubic-bezier(.2,.7,.2,1);transform-origin:center 43%}
      .velvet-gold-auth .entry-scene--behind{filter:brightness(.4) saturate(.9);transform:scale(1.035);pointer-events:none}
      .velvet-gold-auth .login{z-index:2;visibility:hidden;opacity:0;pointer-events:none;transform:translateY(18px);transition:opacity .7s ease,transform .8s cubic-bezier(.2,.7,.2,1),visibility 0s linear .8s;background:linear-gradient(180deg,rgba(19,5,12,.23),rgba(35,7,18,.4))!important;backdrop-filter:blur(3px)}
      .velvet-gold-auth .login.login--visible{visibility:visible;opacity:1;pointer-events:auto;transform:translateY(0);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.7,.2,1),visibility 0s}
      .velvet-gold-auth .login::before{opacity:.28}
      .velvet-gold-auth .panel{animation:none}
      @media(prefers-reduced-motion:reduce){.velvet-gold-auth .entry-scene,.velvet-gold-auth .login{transition:none;transform:none}}
      @media(prefers-reduced-motion:reduce){.velvet-gold-auth .bubble{animation:none}}
      @media(max-height:730px){.velvet-gold-auth .emblem{height:190px;margin-top:15px}.velvet-gold-auth .ring{width:180px}.velvet-gold-auth .ring.outer{width:210px}.velvet-gold-auth .letter{font-size:140px}.velvet-gold-auth .tag{margin-bottom:16px}}
    `}</style>
    <iframe ref={frame} className={entered ? "entry-scene entry-scene--behind" : "entry-scene"} title="Velvet Stories — entrada" src={`/velvet-original-entry.html?build=${encodeURIComponent(__VELVET_BUILD_TIME__)}`} />
      <section className={entered ? "login login--visible" : "login"} aria-hidden={!entered} inert={!entered}><div className="chat-decor" aria-hidden="true"><span className="bubble bubble-one">•••</span><span className="bubble bubble-two">•••</span><span className="bubble bubble-three">•••</span><span className="bubble bubble-four">•••</span></div><div className="panel">
        <button className="back" type="button" onClick={() => {setEntered(false);setMessage("");}} aria-label="Volver al inicio">↶</button>
        <div className="emblem" aria-hidden="true"><span className="ring outer"/><span className="ring"/><span className="letter">V</span></div>
        <h1>VELVET</h1><div className="stories-word">STORIES</div><span className="ornament">✦</span><p className="tag">Historias para leer y vivir</p>
        <form onSubmit={submit}>
          <input type="email" required autoComplete="email" placeholder="Correo" value={email} onChange={e=>setEmail(e.target.value)} />
          <input type="password" required minLength={6} autoComplete={mode==="signup"?"new-password":"current-password"} placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="submit" type="submit" disabled={busy}>{busy?"UN MOMENTO…":mode==="signup"?"CREAR CUENTA":"ENTRAR"}</button>
        </form>
        {message && <p className="message" role="status">{message}</p>}
        <div className="links"><button type="button" disabled={busy} onClick={resetPassword}>¿Olvidaste tu contraseña?</button><button type="button" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setMessage("");}}>{mode==="signin"?"Crear cuenta":"Iniciar sesión"}</button></div>
      </div></section>
  </main>;
}
