import { useState } from "react";
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
      <div className="auth__owner-stage">
        <img
          className="auth__owner-art"
          src="/velvet-owner-login-scene.png"
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <form className="auth__owner-overlay" onSubmit={handleSubmit} aria-label="Private Velvet login">
          <div className="auth__owner-password-shell">
            <input
              className="auth__owner-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              aria-label="Password"
              autoComplete="current-password"
              autoFocus
            />
            {password ? (
              <span className="auth__owner-password-live" aria-hidden="true">
                {showPassword ? password : "•".repeat(Math.min(password.length, 18))}
              </span>
            ) : null}
            <button
              className="auth__owner-eye"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            />
          </div>

          <button
            className="auth__owner-enter"
            type="submit"
            disabled={submitting}
            aria-label={submitting ? "Opening Velvet" : "Enter Velvet"}
          >
            <span className="sr-only">{submitting ? "Opening Velvet..." : "Enter Velvet"}</span>
          </button>

          {error ? <p className="auth__owner-error" role="alert">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
