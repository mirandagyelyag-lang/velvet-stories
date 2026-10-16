import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/velvet-conversation-auth.css";

const steps = {
  signup: [
    { key: "name", question: "Antes de comenzar… ¿cómo te llamas?", type: "text", placeholder: "Tu nombre", autocomplete: "name" },
    { key: "email", question: (d) => `Mucho gusto, ${d.name}. ¿Dónde te escribo?`, type: "email", placeholder: "tu@correo.com", autocomplete: "email" },
    { key: "password", question: "Última cosa: elige una contraseña. Será nuestro secreto.", type: "password", placeholder: "Mínimo 6 caracteres", autocomplete: "new-password" },
  ],
  signin: [
    { key: "email", question: "Qué bueno verte de nuevo. ¿Cuál es tu correo?", type: "email", placeholder: "tu@correo.com", autocomplete: "email" },
    { key: "password", question: "Y tu contraseña, por favor.", type: "password", placeholder: "Tu contraseña", autocomplete: "current-password" },
  ],
};

function readableError(error) {
  const message = String(error?.message || "");
  if (/invalid login credentials/i.test(message)) return "Ese correo o contraseña no coincide. ¿Lo intentamos otra vez?";
  if (/email not confirmed/i.test(message)) return "Confirma tu correo electrónico antes de entrar.";
  if (/already registered/i.test(message)) return "Ya existe una cuenta con ese correo. Prueba iniciar sesión.";
  if (/rate limit/i.test(message)) return "Demasiados intentos. Espera un momento y vuelve a probar.";
  return message || "No pude abrir tu sesión. Inténtalo nuevamente.";
}


function TypedMessage({ text, delay = 320, onComplete }) {
  const [visible, setVisible] = useState("");
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      setVisible(text);
      setStarted(true);
      onComplete?.();
      return;
    }
    let interval;
    const chars = Array.from(text);
    let count = 0;
    const start = window.setTimeout(() => {
      setStarted(true);
      interval = window.setInterval(() => {
        count = Math.min(count + 1, chars.length);
        setVisible(chars.slice(0, count).join(""));
        if (count >= chars.length) {
          window.clearInterval(interval);
          onComplete?.();
        }
      }, 34);
    }, delay);
    return () => { window.clearTimeout(start); window.clearInterval(interval); };
  }, [text, delay]);
  return <span className="velvet-chat-auth__typed">{visible}{started && visible.length < text.length && <span className="velvet-chat-auth__caret" aria-hidden="true" />}</span>;
}

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signup");
  const [index, setIndex] = useState(0);
  const [data, setData] = useState({});
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState([{ from: "velvet", text: "Te estaba esperando…" }, { from: "velvet", text: steps.signup[0].question }]);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(true);
  const [reveal, setReveal] = useState(false);
  const input = useRef(null);
  const bottom = useRef(null);
  const conversation = useRef(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(null);
  const current = steps[mode][index];
  const lastVelvet = messages.reduce((last, message, i) => message.from === "velvet" ? i : last, -1);

  useEffect(() => {
    const area = conversation.current;
    if (area) area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const height = viewport.height;
      const open = window.innerHeight - height > 140;
      setKeyboardOpen(open);
      setViewportHeight(height);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  function switchMode(next) {
    setMode(next); setIndex(0); setData({}); setValue(""); setBusy(false); setReveal(false); setTyping(true);
    setMessages(next === "signin" ? [{ from: "velvet", text: "Te estaba esperando…" }, { from: "velvet", text: steps.signin[0].question }] : [{ from: "velvet", text: "Te estaba esperando…" }, { from: "velvet", text: steps.signup[0].question }]);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || typing) return;
    const answer = value.trim();
    if (!answer) return;
    if (current.key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(answer)) {
      setTyping(true); setMessages(m => [...m, { from: "velvet", text: "Ese correo no parece válido. ¿Lo revisamos?" }]); return;
    }
    if (current.key === "password" && answer.length < 6) {
      setTyping(true); setMessages(m => [...m, { from: "velvet", text: "Necesitamos al menos seis caracteres." }]); return;
    }
    const nextData = { ...data, [current.key]: answer };
    setData(nextData);
    setMessages(m => [...m, { from: "me", text: current.key === "password" ? "••••••••" : answer }]);
    setValue("");
    if (index + 1 < steps[mode].length) {
      const next = steps[mode][index + 1];
      setTyping(true);
      setMessages(m => [...m, { from: "velvet", text: typeof next.question === "function" ? next.question(nextData) : next.question }]);
      setIndex(i => i + 1);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn({ email: nextData.email, password: nextData.password });
      } else {
        const result = await signUp({ email: nextData.email, password: nextData.password });
        if (!result?.session) {
          setTyping(true); setMessages(m => [...m, { from: "velvet", text: "Tu cuenta está creada. Revisa tu correo para confirmarla; después podrás iniciar sesión." }]);
          setBusy(false);
          return;
        }
      }
    } catch (error) {
      setTyping(true); setMessages(m => [...m, { from: "velvet", text: readableError(error) }]);
      setBusy(false);
    }
  }

  return <main className={`velvet-chat-auth${keyboardOpen ? " velvet-chat-auth--keyboard" : ""}`} style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}>
    <div className="velvet-chat-auth__ambient" aria-hidden="true" />
    <header className="velvet-chat-auth__head">
      <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M15 17 50 88 85 17 M27 17 50 68 73 17" /></svg>
      <h1>VELVET</h1><p>STORIES</p>
    </header>
    <section ref={conversation} className="velvet-chat-auth__conversation" aria-label="Conversación de acceso" aria-live="polite">
      {messages.map((m, i) => <div key={`${mode}-${i}`} className={`velvet-chat-auth__message velvet-chat-auth__message--${m.from}`}>
        {m.from === "velvet" && <span className="velvet-chat-auth__avatar">V</span>}
        <span className="velvet-chat-auth__bubble">{m.from === "velvet" ? <TypedMessage text={m.text} delay={i === 0 ? 350 : i === 1 ? 1600 : 400} onComplete={i === lastVelvet ? () => setTyping(false) : undefined} /> : m.text}</span>
      </div>)}
      <div ref={bottom} />
    </section>
    <footer className="velvet-chat-auth__footer">
      <form className="velvet-chat-auth__form" onSubmit={submit}>
        <input ref={input} aria-label={current.key} type={current.type === "password" && reveal ? "text" : current.type} autoComplete={current.autocomplete} placeholder={current.placeholder} value={value} onChange={e => setValue(e.target.value)} disabled={busy || typing} required />
        {current.type === "password" && <button type="button" className="velvet-chat-auth__eye" onClick={() => setReveal(v => !v)}>{reveal ? "ocultar" : "ver"}</button>}
        <button type="submit" className="velvet-chat-auth__send" disabled={busy || typing} aria-label="Enviar">{busy ? "…" : "↑"}</button>
      </form>
      <button type="button" className="velvet-chat-auth__switch" disabled={busy} onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "¿Ya tienes cuenta? Iniciar sesión" : "¿Primera vez aquí? Crear cuenta"}</button>
    </footer>
  </main>;
}
