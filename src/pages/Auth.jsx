import { ArrowRight, Eye, EyeOff, KeyRound, Mail, Moon, Sun, SunMoon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import velvetLogo from "../assets/velvet-logo.webp";
import "../styles/auth.css";

const SAVED_EMAIL_KEY = "velvet-private-email-v1";

function getSavedEmail() {
  try {
    return window.localStorage.getItem(SAVED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

function translateAuthError(message = "") {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "That password doesn't match your Velvet account.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email before entering Velvet.";
  }
  if (normalized.includes("rate limit")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return message || "Velvet could not open your private session.";
}

const THEME_ICON = { light: Sun, dark: Moon, comfort: SunMoon };

// A handful of drifting embers for the cinematic backdrop. Fixed positions
// so the scene is deterministic across renders (no layout shift, no RNG).
const EMBERS = [
  { left: "12%", delay: "0s", duration: "9s", size: 3 },
  { left: "22%", delay: "2.4s", duration: "11s", size: 2 },
  { left: "34%", delay: "5.1s", duration: "8.5s", size: 4 },
  { left: "48%", delay: "1.2s", duration: "10s", size: 2 },
  { left: "61%", delay: "3.6s", duration: "9.5s", size: 3 },
  { left: "74%", delay: "6.2s", duration: "12s", size: 2 },
  { left: "83%", delay: "0.8s", duration: "8s", size: 3 },
  { left: "91%", delay: "4.4s", duration: "10.5s", size: 2 },
];

export default function Auth() {
  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const rememberedEmail = getSavedEmail();

  const [email, setEmail] = useState(rememberedEmail);
  const [useSavedAccount, setUseSavedAccount] = useState(Boolean(rememberedEmail));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const ThemeIcon = THEME_ICON[theme] || Sun;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (password.length < 6) {
      setError("Your password needs at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);
      await signIn({ email: email.trim(), password });
      try {
        window.localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
      } catch {
        // localStorage is only a convenience.
      }
    } catch (requestError) {
      setError(translateAuthError(requestError.message));
    } finally {
      setSubmitting(false);
    }
  }

  function chooseDifferentAccount() {
    setUseSavedAccount(false);
    setEmail("");
    setPassword("");
    setError("");
  }

  return (
    <main className="auth auth--cinematic">
      <div className="auth-scene" aria-hidden="true">
        <div className="auth-scene__glow" />
        <div className="auth-scene__vignette" />
        <div className="auth-scene__grain" />
        <div className="auth-scene__embers">
          {EMBERS.map((ember, index) => (
            <span
              key={index}
              className="auth-scene__ember"
              style={{
                left: ember.left,
                width: ember.size,
                height: ember.size,
                animationDelay: ember.delay,
                animationDuration: ember.duration,
              }}
            />
          ))}
        </div>
      </div>

      <button
        className="auth__theme-toggle"
        onClick={toggleTheme}
        type="button"
        aria-label="Change theme"
      >
        <ThemeIcon size={17} />
      </button>

      <section className="auth__stage">
        <header className="auth__hero">
          <img className="auth__logo" src={velvetLogo} alt="Velvet" />
          <h1 className="auth__wordmark">Velvet Stories</h1>
          <p className="auth__tagline">Every story begins with you.</p>
        </header>

        <form className="auth__form" onSubmit={handleSubmit}>
          {useSavedAccount ? (
            <div className="auth__remembered">
              <div className="auth__remembered-icon">
                <Mail size={15} />
              </div>
              <div className="auth__remembered-copy">
                <small>Continue as</small>
                <strong>{email}</strong>
              </div>
              <button type="button" onClick={chooseDifferentAccount}>Change</button>
            </div>
          ) : (
            <label className="auth__field">
              <span>Email</span>
              <div className="auth__input">
                <Mail size={15} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </label>
          )}

          <label className="auth__field">
            <span>Password</span>
            <div className="auth__input">
              <KeyRound size={15} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                autoFocus={useSavedAccount}
              />
              <button
                type="button"
                className="auth__reveal"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {error ? <p className="auth__error" role="alert">{error}</p> : null}

          <button className="auth__submit" type="submit" disabled={submitting}>
            <span>{submitting ? "Opening Velvet…" : "Enter Velvet"}</span>
            <ArrowRight size={17} className="auth__submit-arrow" />
          </button>
        </form>
      </section>
    </main>
  );
}
