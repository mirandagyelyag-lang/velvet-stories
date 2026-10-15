import { useState } from "react";
import { ArrowUpRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/velvet-access.css";

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

  return <main className="velvet-access">
    <div className="velvet-access__aura" aria-hidden="true"/>
    <header className="velvet-access__header"><span>VELVET <small>STORIES</small></span><span>AN UNWRITTEN WORLD / 001</span></header>
    <section className="velvet-access__composition" aria-label="Velvet account access">
      <div className="velvet-access__art" aria-hidden="true">
        <svg viewBox="0 0 400 400" fill="none" stroke="currentColor">
          <circle cx="200" cy="200" r="186" strokeWidth=".6" opacity=".5"/>
          <circle cx="200" cy="200" r="132" strokeWidth=".5" strokeDasharray="1 10" opacity=".5"/>
          <path d="M88 92 L200 336 L312 92" strokeWidth="1.1"/>
          <path d="M116 92 L200 288 L284 92" strokeWidth=".8" opacity=".65"/>
          <path d="M142 92 L200 246 L258 92" strokeWidth=".6" opacity=".4"/>
        </svg>
      </div>
      <div className="velvet-access__editorial"><span className="velvet-access__micro">I. THE NEXT CHAPTER</span><h1>Every story<br/>begins <em>somewhere.</em></h1><p>And this one belongs to you.</p></div>
      <div className="velvet-access__panel">
        <div className="velvet-access__panel-top"><span className="velvet-access__micro">YOUR SPACE / VELVET</span><span>✳</span></div>
        <h2>{mode==="signup"?"Make it yours.":"Welcome home."}</h2>
        <p>{mode==="signup"?"A new world is waiting.":"Pick up where your story left off."}</p>
        <div className="velvet-access__tabs"><button type="button" className={mode==="signin"?"selected":""} disabled={submitting} onClick={()=>{setMode("signin");setError("");setNotice("");}}>SIGN IN</button><button type="button" className={mode==="signup"?"selected":""} disabled={submitting} onClick={()=>{setMode("signup");setError("");setNotice("");}}>CREATE ACCOUNT</button></div>
        <form onSubmit={handleSubmit} className="velvet-access__form">
          <label><span>01 — EMAIL ADDRESS</span><div><Mail size={17}/><input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} placeholder="you@example.com" autoComplete="email" required/></div></label>
          <label><span>02 — PASSWORD</span><div><LockKeyhole size={17}/><input type={showPassword?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("");}} placeholder="At least 6 characters" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={6} required/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
          {error&&<p role="alert" className="velvet-access__error">{error}</p>}{notice&&<p role="status" className="velvet-access__notice">{notice}</p>}
          <button type="submit" className="velvet-access__submit" disabled={submitting}><span>{submitting?"OPENING…":mode==="signup"?"CREATE MY WORLD":"ENTER VELVET"}</span><ArrowUpRight size={20}/></button>
        </form>
        <span className="velvet-access__legal">YOUR STORIES. YOUR WORLD. YOUR VELVET.</span>
      </div>
    </section>
    <footer className="velvet-access__footer"><span>© VELVET STORIES</span><span>MADE TO FEEL ✦</span></footer>
  </main>;
}
