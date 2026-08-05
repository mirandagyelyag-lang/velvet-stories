import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";

import { useState } from "react";
import { useCharacters } from "../context/CharactersContext";
import "../styles/create-character-modal.css";

const initialForm = {
  name: "",
  role: "",
  description: "",
  personality: "",
  relationship: "",
  world: "",
  responseLength: "balanced",
  narrationStyle: "balanced",
  firstMessage: "",
};

function CreateCharacterModal({
  onClose,
  onCreated,
}) {
  const { createCharacter } = useCharacters();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setError("");
  }

  function validateCurrentStep() {
    if (
      step === 1 &&
      (!form.name.trim() || !form.role.trim())
    ) {
      setError(
        "Write your character's name and role."
      );

      return false;
    }

    if (
      step === 2 &&
      !form.personality.trim()
    ) {
      setError(
        "Describe your character's personality."
      );

      return false;
    }

    if (
      step === 3 &&
      !form.firstMessage.trim()
    ) {
      setError(
        "Write the first message of your story."
      );

      return false;
    }

    return true;
  }

  function goForward() {
    if (!validateCurrentStep()) {
      return;
    }

    setStep((currentStep) => currentStep + 1);
  }

  function goBack() {
    if (saving) {
      return;
    }

    setError("");
    setStep((currentStep) => currentStep - 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateCurrentStep() || saving) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const newCharacter =
        await createCharacter({
          ...form,
          color: "#7a2942",
        });

      onCreated(newCharacter);
    } catch (requestError) {
      console.error(
        "Error creating character:",
        requestError
      );

      setError(
        translateCharacterError(
          requestError.message
        )
      );
    } finally {
      setSaving(false);
    }
  }

  function handleBackdropClick(event) {
    if (
      event.target === event.currentTarget &&
      !saving
    ) {
      onClose();
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={handleBackdropClick}
    >
      <section
        className="character-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-modal-title"
      >
        <header className="character-modal__header">
          <div>
            <p>CHARACTER ATELIER</p>

            <h2 id="character-modal-title">
              Create someone unforgettable
            </h2>
          </div>

          <button
            className="character-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close character creator"
          >
            <X size={22} />
          </button>
        </header>

        <div className="character-modal__steps">
          <span className={step === 1 ? "active" : ""}>
            1 · Identity
          </span>

          <span className={step === 2 ? "active" : ""}>
            2 · Personality
          </span>

          <span className={step === 3 ? "active" : ""}>
            3 · Voice
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="character-form">
              <label>
                Character name <strong>*</strong>

                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="e.g. Lucien Thorne"
                  autoFocus
                  disabled={saving}
                />
              </label>

              <label>
                Role or archetype <strong>*</strong>

                <input
                  name="role"
                  value={form.role}
                  onChange={updateField}
                  placeholder="e.g. Rival, best friend, detective..."
                  disabled={saving}
                />
              </label>

              <label className="character-form__wide">
                Short introduction

                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="The first detail someone should know..."
                  rows="4"
                  disabled={saving}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="character-form">
              <label className="character-form__wide">
                Personality <strong>*</strong>

                <textarea
                  name="personality"
                  value={form.personality}
                  onChange={updateField}
                  placeholder="Their virtues, flaws, fears, habits and contradictions..."
                  rows="6"
                  autoFocus
                  disabled={saving}
                />
              </label>

              <label>
                Relationship to you

                <input
                  name="relationship"
                  value={form.relationship}
                  onChange={updateField}
                  placeholder="Strangers, rivals, friends..."
                  disabled={saving}
                />
              </label>

              <label>
                World

                <input
                  name="world"
                  value={form.world}
                  onChange={updateField}
                  placeholder="Modern university, fantasy kingdom..."
                  disabled={saving}
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="character-form">
              <label>
                Response length

                <select
                  name="responseLength"
                  value={form.responseLength}
                  onChange={updateField}
                  disabled={saving}
                >
                  <option value="short">
                    Short
                  </option>

                  <option value="balanced">
                    Balanced
                  </option>

                  <option value="long">
                    Long and detailed
                  </option>
                </select>
              </label>

              <label>
                Narration style

                <select
                  name="narrationStyle"
                  value={form.narrationStyle}
                  onChange={updateField}
                  disabled={saving}
                >
                  <option value="dialogue">
                    Mostly dialogue
                  </option>

                  <option value="balanced">
                    Balanced
                  </option>

                  <option value="immersive">
                    Immersive narration
                  </option>
                </select>
              </label>

              <label className="character-form__wide">
                First message <strong>*</strong>

                <textarea
                  name="firstMessage"
                  value={form.firstMessage}
                  onChange={updateField}
                  placeholder="How does your character open the story?"
                  rows="5"
                  autoFocus
                  disabled={saving}
                />
              </label>
            </div>
          )}

          {error && (
            <p className="character-modal__error">
              {error}
            </p>
          )}

          <footer className="character-modal__footer">
            <button
              type="button"
              className="character-modal__back"
              onClick={
                step === 1 ? onClose : goBack
              }
              disabled={saving}
            >
              {step > 1 && (
                <ArrowLeft size={17} />
              )}

              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step < 3 ? (
              <button
                type="button"
                className="character-modal__continue"
                onClick={goForward}
                disabled={saving}
              >
                Continue
                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                type="submit"
                className="character-modal__continue"
                disabled={saving}
              >
                {saving ? (
                  <>
                    Saving character
                    <LoaderCircle
                      className="character-modal__spinner"
                      size={17}
                    />
                  </>
                ) : (
                  <>
                    Create character
                    <Check size={17} />
                  </>
                )}
              </button>
            )}
          </footer>
        </form>

        <Sparkles className="character-modal__decoration" />
      </section>
    </div>
  );
}

function translateCharacterError(message = "") {
  const error = message.toLowerCase();

  if (
    error.includes("row-level security") ||
    error.includes("permission")
  ) {
    return "Your account doesn't have permission to save this character.";
  }

  if (error.includes("not-null")) {
    return "A required character field is missing.";
  }

  if (error.includes("network")) {
    return "We couldn't connect to the database. Check your internet connection.";
  }

  return (
    message ||
    "We couldn't create the character. Try again."
  );
}

export default CreateCharacterModal;