import { createContext, useContext, useEffect, useState } from "react";

const SettingsContext = createContext();
const STORAGE_KEY = "velvet_general_settings";
const defaults = {
  textSize: "comfortable",
  density: "comfortable",
  reduceMotion: false,
  showMessageTimestamps: false,
  haptics: true,
  confirmBeforeDelete: true,
  exportFormat: "markdown",
  storyProse: "contemporary",
  storyDialogue: "dialogue_forward",
  storyEmotion: "interior_visible",
  storyPacing: "medium_fast",
  storyInstructions: "",
  storyFeedbackCounts: {},
};

const STORY_FEEDBACK_CODES = new Set([
  "ignored_idea",
  "too_short",
  "out_of_character",
  "too_much_narration",
  "not_enough_dialogue",
  "repetitive",
  "pov_violation",
  "missing_emotional_impact",
]);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
    catch { return defaults; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.dataset.textSize = settings.textSize;
    document.documentElement.dataset.density = settings.density;
    document.documentElement.dataset.reduceMotion = String(settings.reduceMotion);
  }, [settings]);

  function updateSetting(name, value) {
    setSettings((current) => ({ ...current, [name]: value }));
  }

  function recordStoryFeedback(codes = []) {
    const accepted = [...new Set(codes)].filter((code) => STORY_FEEDBACK_CODES.has(code));
    if (!accepted.length) return;
    setSettings((current) => {
      const nextCounts = { ...(current.storyFeedbackCounts || {}) };
      for (const code of accepted) nextCounts[code] = Math.min(5, Number(nextCounts[code] || 0) + 1);
      return { ...current, storyFeedbackCounts: nextCounts };
    });
  }

  function resetSettings() { setSettings(defaults); }

  return <SettingsContext.Provider value={{ settings, updateSetting, recordStoryFeedback, resetSettings }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
