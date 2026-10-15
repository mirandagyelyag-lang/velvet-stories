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

  return <main className="auth-world">
    <div className="auth-world__atmosphere" aria-hidden="true"/>
    <header className="auth-world__top"><span className="auth-world__brand">VELVET <small>STORIES</small></span><span className="auth-world__edition">AN IMMERSIVE STORY UNIVERSE · 001</span></header>
    <section className="auth-world__scene" aria-label="Velvet access">
      <div className="auth-world__artifact" aria-hidden="true">
        <div className="auth-world__halo auth-world__halo--outer"/>
        <div className="auth-world__halo auth-world__halo--inner"/>
        <svg viewBox="0 0 400 400" className="auth-world__symbol">
          <circle cx="200" cy="200" r="155" fill="none" stroke="currentColor" strokeWidth=".7" opacity=".5"/>
          <path d="M85 104 L174 306 Q195 348 222 299 L318 104" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <path d="M80 287 C139 205 221 183 298 209 C354 229 324 304 271 305 C202 310 158 236 117 168" fill="none" stroke="currentColor" strokeWidth="2.5"/>
        </svg>
        <span className="auth-world__artifact-name">VELVET</span>
      </div>
      <div className="auth-world__intro"><span className="auth-world__index">01 / THE BEGINNING</span><h1>Some stories<br/><em>stay with you.</em></h1><p>Step inside a world that remembers.</p></div>
      <div className="auth-world__portal">
        <div className="auth-world__portal-head"><span className="auth-world__index">YOUR ACCESS / VELVET</span><span className="auth-world__portal-cross">✳</span></div>
        <h2>{mode === "signup" ? "Begin your story." : "The story continues."}</h2>
        <p>{mode === "signup" ? "Make this world your own." : "Your world is right where you left it."}</p>
        <div className="auth-world__tabs"><button type="button" aria-pressed={mode==="signin"} className={mode==="signin"?"is-active":""} disabled={submitting} onClick={()=>{setMode("signin");setError("");setNotice("");}}>SIGN IN</button><button type="button" aria-pressed={mode==="signup"} className={mode==="signup"?"is-active":""} disabled={submitting} onClick={()=>{setMode("signup");setError("");setNotice("");}}>CREATE ACCOUNT</button></div>
        <form onSubmit={handleSubmit} className="auth-world__form">
          <label><span>01 / EMAIL</span><div><Mail size={17}/><input type="email" autoComplete="email" aria-label="Email" placeholder="you@example.com" value={email} required onChange={e=>{setEmail(e.target.value);setError("");}}/></div></label>
          <label><span>02 / PASSWORD</span><div><LockKeyhole size={17}/><input type={showPassword?"text":"password"} autoComplete={mode==="signup"?"new-password":"current-password"} aria-label="Password" placeholder="At least 6 characters" value={password} minLength={6} required onChange={e=>{setPassword(e.target.value);setError("");}}/><button type="button" className="auth-world__eye" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          {error?<p role="alert" className="auth-world__error">{error}</p>:null}{notice?<p role="status" className="auth-world__notice">{notice}</p>:null}
          <button className="auth-world__submit" disabled={submitting} type="submit"><span>{submitting?"OPENING…":mode==="signup"?"CREATE YOUR WORLD":"ENTER THE WORLD"}</span><ArrowUpRight size={22}/></button>
        </form>
        <span className="auth-world__footnote">PRIVATE WORLDS. ENDLESS POSSIBILITIES.</span>
      </div>
    </section>
    <footer className="auth-world__bottom"><span>© VELVET STORIES</span><span>MADE TO FEEL ✦</span><span>SCROLL INTO YOUR STORY</span></footer>
  </main>;
}
