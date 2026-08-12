import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "../services/supabase";
import { useAuth } from "./AuthContext";

const SettingsContext = createContext();
const STORAGE_KEY = "velvet_general_settings";
const SETTINGS_SCHEMA_VERSION = 2;

const defaults = {
  settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
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
  storyPositiveFeedbackCounts: {},
  storyNegativeFeedbackCounts: {},
};

const POSITIVE_FEEDBACK_CODES = new Set(["voice", "emotion", "dialogue", "pacing"]);
const NEGATIVE_FEEDBACK_CODES = new Set([
  "ignored_idea",
  "too_short",
  "out_of_character",
  "too_much_narration",
  "not_enough_dialogue",
  "repetitive",
  "pov_violation",
  "missing_emotional_impact",
]);

function loadLocalSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const legacyNegative = saved.storyFeedbackCounts || {};
    return {
      ...defaults,
      ...saved,
      settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
      storyPositiveFeedbackCounts: saved.storyPositiveFeedbackCounts || {},
      storyNegativeFeedbackCounts: Object.keys(saved.storyNegativeFeedbackCounts || {}).length
        ? saved.storyNegativeFeedbackCounts
        : legacyNegative,
    };
  } catch {
    return { ...defaults };
  }
}

function remoteStorySettings(data = {}) {
  return {
    storyProse: data.story_prose || defaults.storyProse,
    storyDialogue: data.story_dialogue || defaults.storyDialogue,
    storyEmotion: data.story_emotion || defaults.storyEmotion,
    storyPacing: data.story_pacing || defaults.storyPacing,
    storyInstructions: data.custom_instructions || "",
    storyPositiveFeedbackCounts: data.positive_feedback || {},
    storyNegativeFeedbackCounts: data.negative_feedback || {},
  };
}

function databaseStorySettings(userId, settings) {
  return {
    user_id: userId,
    story_prose: settings.storyProse,
    story_dialogue: settings.storyDialogue,
    story_emotion: settings.storyEmotion,
    story_pacing: settings.storyPacing,
    custom_instructions: String(settings.storyInstructions || "").slice(0, 900),
    positive_feedback: settings.storyPositiveFeedbackCounts || {},
    negative_feedback: settings.storyNegativeFeedbackCounts || {},
    updated_at: new Date().toISOString(),
  };
}

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(loadLocalSettings);
  const [storySyncReady, setStorySyncReady] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.dataset.textSize = settings.textSize;
    document.documentElement.dataset.density = settings.density;
    document.documentElement.dataset.reduceMotion = String(settings.reduceMotion);
  }, [settings]);

  useEffect(() => {
    let active = true;
    setStorySyncReady(false);
    if (!user?.id) return () => { active = false; };

    async function hydrateStoryPreferences() {
      const { data, error } = await supabase
        .from("user_story_preferences")
        .select("story_prose, story_dialogue, story_emotion, story_pacing, custom_instructions, positive_feedback, negative_feedback")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Story preference sync failed:", error);
        setStorySyncReady(true);
        return;
      }

      if (data) {
        setSettings((current) => ({ ...current, ...remoteStorySettings(data) }));
      } else {
        const { error: createError } = await supabase
          .from("user_story_preferences")
          .upsert(databaseStorySettings(user.id, loadLocalSettings()), { onConflict: "user_id" });
        if (createError) console.error("Story preference setup failed:", createError);
      }
      if (active) setStorySyncReady(true);
    }

    hydrateStoryPreferences();
    return () => { active = false; };
  }, [user?.id]);

  const storySyncPayload = useMemo(() => JSON.stringify({
    storyProse: settings.storyProse,
    storyDialogue: settings.storyDialogue,
    storyEmotion: settings.storyEmotion,
    storyPacing: settings.storyPacing,
    storyInstructions: settings.storyInstructions,
    storyPositiveFeedbackCounts: settings.storyPositiveFeedbackCounts,
    storyNegativeFeedbackCounts: settings.storyNegativeFeedbackCounts,
  }), [
    settings.storyProse,
    settings.storyDialogue,
    settings.storyEmotion,
    settings.storyPacing,
    settings.storyInstructions,
    settings.storyPositiveFeedbackCounts,
    settings.storyNegativeFeedbackCounts,
  ]);

  useEffect(() => {
    if (!user?.id || !storySyncReady) return undefined;
    const timer = window.setTimeout(async () => {
      const current = JSON.parse(storySyncPayload);
      const { error } = await supabase
        .from("user_story_preferences")
        .upsert(databaseStorySettings(user.id, current), { onConflict: "user_id" });
      if (error) console.error("Story preference save failed:", error);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [storySyncPayload, storySyncReady, user?.id]);

  function updateSetting(name, value) {
    setSettings((current) => ({ ...current, [name]: value }));
  }

  function changeStoryFeedback(kind, codes = [], amount = 1) {
    const positive = kind === "positive";
    const allowed = positive ? POSITIVE_FEEDBACK_CODES : NEGATIVE_FEEDBACK_CODES;
    const accepted = [...new Set(codes)].filter((code) => allowed.has(code));
    if (!accepted.length) return [];
    const key = positive ? "storyPositiveFeedbackCounts" : "storyNegativeFeedbackCounts";
    setSettings((current) => {
      const nextCounts = { ...(current[key] || {}) };
      for (const code of accepted) {
        const next = Math.max(0, Math.min(99, Number(nextCounts[code] || 0) + amount));
        if (next) nextCounts[code] = next;
        else delete nextCounts[code];
      }
      return { ...current, [key]: nextCounts };
    });
    return accepted;
  }

  function recordStoryFeedback(kind, codes = []) {
    return changeStoryFeedback(kind, codes, 1);
  }

  function undoStoryFeedback(kind, codes = []) {
    return changeStoryFeedback(kind, codes, -1);
  }

  function removeStoryFeedback(kind, code) {
    const key = kind === "positive" ? "storyPositiveFeedbackCounts" : "storyNegativeFeedbackCounts";
    setSettings((current) => {
      const nextCounts = { ...(current[key] || {}) };
      delete nextCounts[code];
      return { ...current, [key]: nextCounts };
    });
  }

  function resetSettings() {
    setSettings({ ...defaults, storyPositiveFeedbackCounts: {}, storyNegativeFeedbackCounts: {} });
  }

  return (
    <SettingsContext.Provider value={{
      settings,
      storySyncReady,
      updateSetting,
      recordStoryFeedback,
      undoStoryFeedback,
      removeStoryFeedback,
      resetSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
