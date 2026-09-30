import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

function translateAuthError(message = "") {
  const normalized = message.toLowerCase();
  if (normalized.includes("private owner") || normalized.includes("private velvet")) {
    return "This Velvet belongs to its owner only.";
  }
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

function maskEmail(email = "") {
  const [local = "", domain = ""] = String(email).split("@");
  const [host = "", ...suffixParts] = domain.split(".");
  const suffix = suffixParts.length ? `.${suffixParts.join(".")}` : "";
  const localMask = local ? `${local[0]}${"*".repeat(Math.max(8, Math.min(13, local.length - 1 || 8)))}` : "m************";
  const hostMask = host ? `${host[0]}${"*".repeat(Math.max(4, Math.min(7, host.length - 1 || 4)))}` : "g****";
  return `${localMask}@${hostMask}${suffix || ".com"}`;
}

export default function Auth() {
  const { signIn, ownerEmail } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Your password needs at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);
      await signIn({ email: ownerEmail, password });
    } catch (requestError) {
      setError(translateAuthError(requestError.message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth auth--owner-scene">
      <img
        className="auth__ambient-art"
        src="/velvet-login-bg.webp"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <div className="auth__ambient-shade" aria-hidden="true" />

      <section className="auth__card" aria-label="Private Velvet login">
        <header className="auth__brand">
          <div className="auth__brand-mark" aria-hidden="true">
            <span>VS</span>
            <i>✦</i>
          </div>
          <p className="auth__brand-name">Velvet Stories</p>
          <div className="auth__brand-divider" aria-hidden="true">
            <span />
            <i>✦</i>
            <span />
          </div>
        </header>

        <div className="auth__welcome">
          <h1>Welcome back</h1>
          <p>Your stories are waiting.</p>
        </div>

        <form className="auth__form" onSubmit={handleSubmit}>
          <div className="auth__remembered-row" aria-label="Remembered account">
            <Mail size={22} strokeWidth={1.6} aria-hidden="true" />
            <span className="auth__remembered-email">{maskEmail(ownerEmail)}</span>
            <span className="auth__change-label" aria-hidden="true">Change</span>
          </div>

          <label className="auth__password-row">
            <LockKeyhole size={22} strokeWidth={1.6} aria-hidden="true" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
              autoFocus
            />
            <button
              className="auth__eye"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword
                ? <EyeOff size={24} strokeWidth={1.55} aria-hidden="true" />
                : <Eye size={24} strokeWidth={1.55} aria-hidden="true" />}
            </button>
          </label>

          {error ? <p className="auth__error" role="alert">{error}</p> : null}

          <button
            className="auth__enter"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Opening Velvet…" : "Enter Velvet"}
          </button>
        </form>

        <p className="auth__private-line">Private. Personal. Yours.</p>
      </section>
    </main>
  );
}
