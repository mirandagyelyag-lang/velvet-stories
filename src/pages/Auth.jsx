import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/auth.css";

const initialForm = {
  displayName: "",
  email: "",
  password: "",
};

function Auth() {
  const { signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isRegister = mode === "register";

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setError("");
    setSuccessMessage("");
  }

  function changeMode(newMode) {
    setMode(newMode);
    setError("");
    setSuccessMessage("");
    setShowPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (
      isRegister &&
      form.displayName.trim().length < 2
    ) {
      setError("Write a name with at least 2 characters.");
      return;
    }

    if (!form.email.trim()) {
      setError("Write your email address.");
      return;
    }

    if (form.password.length < 6) {
      setError("Your password needs at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);

      if (isRegister) {
        const data = await signUp(form);

        if (!data.session) {
          setSuccessMessage(
            "We sent you a confirmation email. Open it before signing in."
          );

          setForm(initialForm);
          return;
        }

        return;
      }

      await signIn(form);
    } catch (requestError) {
      setError(
        translateAuthError(requestError.message)
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <button
        className="auth__theme-button"
        onClick={toggleTheme}
        aria-label="Change theme"
      >
        {theme === "dark" ? (
          <Sun size={19} />
        ) : (
          <Moon size={19} />
        )}
      </button>

      <section className="auth__story">
        <div className="auth__brand">
          <Sparkles size={18} />
          <span>VELVET</span>
        </div>

        <div className="auth__story-content">
          <p>PRIVATE WORLDS · ENDLESS STORIES</p>

          <h1>
            Every story
            <br />
            begins with
            <br />
            a voice
          </h1>

          <div className="auth__ornament">
            <Sparkles size={13} />
          </div>

          <blockquote>
            “Some characters are imagined.
            <br />
            Others feel remembered.”
          </blockquote>
        </div>

        <span className="auth__privacy">
          <LockKeyhole size={14} />
          Your stories remain private
        </span>
      </section>

      <section className="auth__panel">
        <div className="auth__form-container">
          <header className="auth__form-header">
            <p>
              {isRegister
                ? "BEGIN A NEW STORY"
                : "WELCOME BACK"}
            </p>

            <h2>
              {isRegister
                ? "Create your account"
                : "Return to your stories"}
            </h2>

            <span>
              {isRegister
                ? "Create characters, worlds and conversations of your own."
                : "Your characters have been waiting for you."}
            </span>
          </header>

          <div className="auth__tabs">
            <button
              className={
                mode === "login" ? "active" : ""
              }
              onClick={() => changeMode("login")}
            >
              Sign in
            </button>

            <button
              className={
                mode === "register" ? "active" : ""
              }
              onClick={() => changeMode("register")}
            >
              Create account
            </button>
          </div>

          <form className="auth__form" onSubmit={handleSubmit}>
            {isRegister && (
              <label>
                Display name

                <div className="auth__input">
                  <UserRound size={18} />

                  <input
                    name="displayName"
                    value={form.displayName}
                    onChange={updateField}
                    placeholder="How should we call you?"
                    autoComplete="name"
                  />
                </div>
              </label>
            )}

            <label>
              Email address

              <div className="auth__input">
                <Mail size={18} />

                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label>
              Password

              <div className="auth__input">
                <LockKeyhole size={18} />

                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={updateField}
                  placeholder="At least 6 characters"
                  autoComplete={
                    isRegister
                      ? "new-password"
                      : "current-password"
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <p className="auth__message auth__message--error">
                {error}
              </p>
            )}

            {successMessage && (
              <p className="auth__message auth__message--success">
                {successMessage}
              </p>
            )}

            <button
              className="auth__submit"
              type="submit"
              disabled={submitting}
            >
              <span>
                {submitting
                  ? "Please wait..."
                  : isRegister
                    ? "Create account"
                    : "Enter Velvet"}
              </span>

              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth__switch">
            {isRegister
              ? "Already have an account?"
              : "New to Velvet?"}

            <button
              onClick={() =>
                changeMode(
                  isRegister ? "login" : "register"
                )
              }
            >
              {isRegister
                ? "Sign in"
                : "Create an account"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

function translateAuthError(message = "") {
  const error = message.toLowerCase();

  if (error.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }

  if (error.includes("email not confirmed")) {
    return "Confirm your email before signing in.";
  }

  if (error.includes("user already registered")) {
    return "An account already exists with this email.";
  }

  if (error.includes("password")) {
    return "The password does not meet the requirements.";
  }

  if (error.includes("rate limit")) {
    return "Too many attempts. Wait a moment and try again.";
  }

  return message || "Something went wrong. Try again.";
}

export default Auth;