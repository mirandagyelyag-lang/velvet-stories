import { useState } from "react";
import { ArrowUpRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
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

    <section className="auth__card" aria-label="Velvet account access">
      <aside className="auth__identity">
      <header className="auth__brand"><div className="auth__brand-mark" aria-hidden="true"><span>VS</span><i>✦</i></div><p className="auth__brand-name">Velvet Stories</p><div className="auth__brand-divider" aria-hidden="true"><span/><i>✦</i><span/></div></header>
      <div className="auth__universe" aria-hidden="true"><span className="auth__orbit auth__orbit--one"/><span className="auth__orbit auth__orbit--two"/><span className="auth__orbit auth__orbit--three"/><span className="auth__core">V</span><i className="auth__star auth__star--one"/><i className="auth__star auth__star--two"/></div>
      <div className="auth__manifesto"><span className="auth__eyebrow">A WORLD OF YOUR MAKING</span><h2>Every connection.<br/><em>A new possibility.</em></h2><p>Your characters. Your choices.<br/>Stories that become yours.</p></div>
      <div className="auth__identity-footer"><span>VELVET STORIES</span><span>✦</span><span>MADE TO FEEL</span></div>
      </aside>
      <div className="auth__access">
      <span className="auth__eyebrow auth__access-label"><i aria-hidden="true"/> YOUR VELVET, CONTINUED</span>
      <div className="auth__welcome"><h1>{mode === "signup" ? "Create your story" : "Welcome back"}</h1><p>{mode === "signup" ? "Your Velvet begins here." : "Your stories are waiting."}</p></div>
      <div className="auth__mode-switch"><button type="button" aria-pressed={mode==="signin"} disabled={submitting} className={mode==="signin"?"is-active":""} onClick={()=>{setMode("signin");setError("");setNotice("");}}>Sign in</button><button type="button" aria-pressed={mode==="signup"} disabled={submitting} className={mode==="signup"?"is-active":""} onClick={()=>{setMode("signup");setError("");setNotice("");}}>Create account</button></div>
      <form className="auth__form" onSubmit={handleSubmit}>
        <label className="auth__password-row"><Mail size={21} strokeWidth={1.6}/><input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} placeholder="Email" aria-label="Email" autoComplete="email" required/></label>
        <label className="auth__password-row"><LockKeyhole size={22} strokeWidth={1.6}/><input type={showPassword?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("");}} placeholder="Password" aria-label="Password" autoComplete={mode==="signup"?"new-password":"current-password"} required minLength={6}/><button className="auth__eye" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={24} strokeWidth={1.55}/>:<Eye size={24} strokeWidth={1.55}/>}</button></label>
        {error?<p className="auth__error" role="alert">{error}</p>:null}{notice?<p className="auth__notice" role="status">{notice}</p>:null}
        <button className="auth__enter" type="submit" disabled={submitting}>{submitting?"Opening Velvet…":mode==="signup"?"Create Velvet account":"Enter Velvet"}<ArrowUpRight size={20} aria-hidden="true"/></button>
      </form>
      <p className="auth__private-line">Your stories. Your characters. Your Velvet.</p>
      </div>
    </section>
  </main>;
}
