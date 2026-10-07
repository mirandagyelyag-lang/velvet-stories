import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

function translateAuthError(message = "") {
  const n = message.toLowerCase();
  if (n.includes("invalid login credentials")) return "That email or password doesn't match.";
  if (n.includes("email not confirmed")) return "Confirm your email before entering Velvet.";
  if (n.includes("already registered")) return "That email already has a Velvet account. Try signing in.";
  if (n.includes("rate limit")) return "Too many attempts. Wait a moment and try again.";
  return message || "Velvet couldn't open your session.";
}

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event) {
    event.preventDefault(); setError(""); setNotice("");
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (password.length < 6) return setError("Your password needs at least 6 characters.");
    try {
      setSubmitting(true);
      if (mode === "signup") {
        const data = await signUp({ email, password });
        if (!data?.session) setNotice("Account created. Check your email to confirm it, then sign in.");
      } else await signIn({ email, password });
    } catch (e) { setError(translateAuthError(e.message)); }
    finally { setSubmitting(false); }
  }

  return <main className="auth auth--owner-scene">
    <img className="auth__ambient-art" src="/velvet-login-bg.webp" alt="" aria-hidden="true" draggable="false"/>
    <div className="auth__ambient-shade" aria-hidden="true"/>
    <section className="auth__card" aria-label="Velvet account access">
      <header className="auth__brand"><div className="auth__brand-mark" aria-hidden="true"><span>VS</span><i>✦</i></div><p className="auth__brand-name">Velvet Stories</p><div className="auth__brand-divider" aria-hidden="true"><span/><i>✦</i><span/></div></header>
      <div className="auth__welcome"><h1>{mode === "signup" ? "Create your story" : "Welcome back"}</h1><p>{mode === "signup" ? "Your Velvet begins here." : "Your stories are waiting."}</p></div>
      <div className="auth__mode-switch"><button type="button" className={mode==="signin"?"is-active":""} onClick={()=>{setMode("signin");setError("");setNotice("");}}>Sign in</button><button type="button" className={mode==="signup"?"is-active":""} onClick={()=>{setMode("signup");setError("");setNotice("");}}>Create account</button></div>
      <form className="auth__form" onSubmit={handleSubmit}>
        <label className="auth__password-row"><Mail size={21} strokeWidth={1.6}/><input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} placeholder="Email" aria-label="Email" autoComplete="email"/></label>
        <label className="auth__password-row"><LockKeyhole size={22} strokeWidth={1.6}/><input type={showPassword?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("");}} placeholder="Password" aria-label="Password" autoComplete={mode==="signup"?"new-password":"current-password"}/><button className="auth__eye" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={24} strokeWidth={1.55}/>:<Eye size={24} strokeWidth={1.55}/>}</button></label>
        {error?<p className="auth__error" role="alert">{error}</p>:null}{notice?<p className="auth__notice" role="status">{notice}</p>:null}
        <button className="auth__enter" type="submit" disabled={submitting}>{submitting?"Opening Velvet…":mode==="signup"?"Create Velvet account":"Enter Velvet"}</button>
      </form>
      <p className="auth__private-line">Your stories. Your characters. Your Velvet.</p>
    </section>
  </main>;
}
