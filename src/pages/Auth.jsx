import { useState } from "react";
import { ArrowUpRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/velvet-access.css";
import "../styles/velvet-glass-login.css";

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

  return <main className="velvet-access velvet-glass-login">
    <div className="velvet-glass-login__ambient" aria-hidden="true"/>
    <section className="velvet-glass-login__stage" aria-label="Velvet Stories sign in">
      <div className="velvet-glass-login__showpiece" aria-hidden="true">
        <div className="velvet-glass-login__silk velvet-glass-login__silk--back"/>
        <div className="velvet-glass-login__orbit velvet-glass-login__orbit--one"/>
        <div className="velvet-glass-login__orbit velvet-glass-login__orbit--two"/>
        <div className="velvet-glass-login__sculpture">
          <span className="velvet-glass-login__v velvet-glass-login__v--shadow">V</span>
          <span className="velvet-glass-login__v velvet-glass-login__v--body">V</span>
          <span className="velvet-glass-login__v velvet-glass-login__v--light">V</span>
        </div>
        <div className="velvet-glass-login__silk velvet-glass-login__silk--front"/>
        <div className="velvet-glass-login__floor"/>
        <div className="velvet-glass-login__sparkles"><i/><i/><i/><i/><i/><i/><i/><i/></div>
      </div>
      <div className="velvet-glass-login__content">
        <div className="velvet-glass-login__brand">VELVET STORIES</div>
        <div className="velvet-glass-login__rule"/>
        <h1>{mode === "signup" ? "Your story begins" : "Welcome back"}</h1>
        <p className="velvet-glass-login__subtitle">{mode === "signup" ? "A world of your own is waiting." : "Your stories are waiting."}</p>
        <form onSubmit={handleSubmit} className="velvet-glass-login__form">
          <label className="velvet-glass-login__field"><Mail size={18}/><input type="email" aria-label="Email" placeholder="Email" autoComplete="email" required value={email} onChange={e=>{setEmail(e.target.value);setError("");}}/></label>
          <label className="velvet-glass-login__field"><LockKeyhole size={18}/><input type={showPassword ? "text" : "password"} aria-label="Password" placeholder="Password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={e=>{setPassword(e.target.value);setError("");}}/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></label>
          {error&&<p className="velvet-access__error" role="alert">{error}</p>}{notice&&<p className="velvet-access__notice" role="status">{notice}</p>}
          <button className="velvet-glass-login__submit" type="submit" disabled={submitting}><span>{submitting ? "Opening..." : mode === "signup" ? "Create account" : "Sign in"}</span><ArrowUpRight size={21}/></button>
        </form>
        <div className="velvet-glass-login__divider"><span>or</span></div>
        <button className="velvet-glass-login__switch" type="button" disabled={submitting} onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setNotice("");}}>{mode==="signin"?"Create account":"Back to sign in"}</button>
        <p className="velvet-glass-login__closing">Your stories. Your characters. Your Velvet.</p>
      </div>
    </section>
  </main>;
}
