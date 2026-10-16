import { useState } from "react";
import VelvetStarburst from "../components/VelvetStarburst";
import { ArrowUpRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/velvet-crystal-auth.css";

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

  return <main className="velvet-crystal-auth velvet-atelier-auth">
    <div className="velvet-atelier-auth__grid" aria-hidden="true"/>
    <VelvetStarburst />
    <header className="velvet-crystal-auth__header"><span>VELVET<small>STORIES</small></span></header>
    <div className="velvet-crystal-auth__layout">
      <section className="velvet-atelier-auth__identity" aria-label="Velvet Stories">
        <div className="velvet-atelier-auth__index">EST. 2026 <span> / </span> THE STORY IS YOURS</div>
        <div className="velvet-atelier-auth__monogram" aria-hidden="true"><span>V</span><i/></div>
        <div className="velvet-atelier-auth__identity-copy"><span>AN OPEN WORLD OF STORIES</span><h1>Enter a world<br/>of <em>your own.</em></h1><p>Characters to meet. Stories to shape.<br/>Every choice belongs to you.</p></div>
        <div className="velvet-atelier-auth__bottom">VELVET STORIES <span>✳</span> MADE TO FEEL</div>
      </section>
      <section className="velvet-crystal-auth__access" aria-label="Account access">
        <div className="velvet-crystal-auth__eyebrow">THE NEXT CHAPTER / 001</div>
        <h2>{mode==="signup"?"Begin your story.":"Your story awaits."}</h2>
        <p className="velvet-crystal-auth__subtitle">{mode==="signup"?"A world of your own is waiting.":"Step back into your world."}</p>
        <div className="velvet-crystal-auth__tabs"><button type="button" aria-pressed={mode==="signin"} className={mode==="signin"?"active":""} disabled={submitting} onClick={()=>{setMode("signin");setError("");setNotice("");}}>SIGN IN</button><button type="button" aria-pressed={mode==="signup"} className={mode==="signup"?"active":""} disabled={submitting} onClick={()=>{setMode("signup");setError("");setNotice("");}}>CREATE ACCOUNT</button></div>
        <form className="velvet-crystal-auth__form" onSubmit={handleSubmit}>
          <label><span>EMAIL ADDRESS</span><div className="velvet-crystal-auth__field"><Mail size={17}/><input type="email" placeholder="you@example.com" autoComplete="email" value={email} required onChange={e=>{setEmail(e.target.value);setError("");}}/></div></label>
          <label><span>PASSWORD</span><div className="velvet-crystal-auth__field"><LockKeyhole size={17}/><input type={showPassword?"text":"password"} placeholder="At least 6 characters" autoComplete={mode==="signup"?"new-password":"current-password"} value={password} minLength={6} required onChange={e=>{setPassword(e.target.value);setError("");}}/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          {error&&<p className="velvet-crystal-auth__error" role="alert">{error}</p>}{notice&&<p className="velvet-crystal-auth__notice" role="status">{notice}</p>}
          <button className="velvet-crystal-auth__submit" type="submit" disabled={submitting}>{submitting?"Opening...":mode==="signup"?"Create account":"Enter Velvet"}<ArrowUpRight size={21}/></button>
        </form>
        <p className="velvet-crystal-auth__footer">A little more than a story.</p>
      </section>
    </div>
  </main>;
}
