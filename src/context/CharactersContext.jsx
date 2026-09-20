import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import { supabase } from "../services/supabase";

const CharactersContext = createContext();

export function CharactersProvider({ children }) {
  const { user } = useAuth();

  const [characters, setCharacters] = useState([]);
  const [charactersLoading, setCharactersLoading] =
    useState(true);

  const [charactersError, setCharactersError] =
    useState("");

  useEffect(() => {
    if (!user) {
      setCharacters([]);
      setCharactersLoading(false);
      setCharactersError("");
      return;
    }

    loadCharacters();
  }, [user?.id]);

  async function loadCharacters() {
    if (!user) {
      return;
    }

    try {
      setCharactersLoading(true);
      setCharactersError("");

      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .is("trashed_at", null)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setCharacters(
        (data || []).map(convertDatabaseCharacter)
      );
    } catch (error) {
      console.error("Error loading characters:", error);
      setCharactersError(
        "We couldn't load your characters."
      );
    } finally {
      setCharactersLoading(false);
    }
  }

  async function createCharacter(characterData) {
    if (!user) {
      throw new Error(
        "You need to sign in before creating a character."
      );
    }

    const imageUrl = characterData.imageFile
      ? await uploadCharacterMedia(characterData.imageFile, "avatar")
      : characterData.imageUrl || null;
    const coverUrl = characterData.coverFile
      ? await uploadCharacterMedia(characterData.coverFile, "cover")
      : characterData.coverUrl || null;

    const databaseCharacter = {
      user_id: user.id,
      name: characterData.name.trim(),
      role: characterData.role.trim(),

      description:
        characterData.description?.trim() || null,

      personality:
        characterData.personality.trim(),

      relationship:
        characterData.relationship?.trim() || null,

      world:
        characterData.world?.trim() || null,

      character_values: characterData.values?.trim() || null,
      fears: characterData.fears?.trim() || null,
      habits: characterData.habits?.trim() || null,
      contradictions: characterData.contradictions?.trim() || null,
      core_motivation: characterData.coreMotivation?.trim() || null,
      emotional_defense: characterData.emotionalDefense?.trim() || null,
      softening_triggers: characterData.softeningTriggers?.trim() || null,
      growth_direction: characterData.growthDirection?.trim() || null,
      speech_style: characterData.speechStyle?.trim() || null,
      voice_vocabulary: characterData.voiceVocabulary?.trim() || null,
      humor_style: characterData.humorStyle?.trim() || null,
      conflict_style: characterData.conflictStyle?.trim() || null,
      affection_style: characterData.affectionStyle?.trim() || null,
      verbal_tells: characterData.verbalTells?.trim() || null,
      voice_avoidances: characterData.voiceAvoidances?.trim() || null,
      boundaries: characterData.boundaries?.trim() || null,
      scenario: characterData.scenario?.trim() || null,
      example_dialogue: characterData.exampleDialogue?.trim() || null,

      response_length:
        characterData.responseLength || "balanced",

      narration_style:
        characterData.narrationStyle || "balanced",

      first_message:
        characterData.firstMessage.trim(),

      image_url: imageUrl,

      cover_url: coverUrl,

      color:
        characterData.color || "#7a2942",
    };

    const { data, error } = await supabase
      .from("characters")
      .insert(databaseCharacter)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const newCharacter =
      convertDatabaseCharacter(data);

    setCharacters((currentCharacters) => [
      newCharacter,
      ...currentCharacters,
    ]);

    return newCharacter;
  }

  async function updateCharacter(characterId, characterData) {
    if (!user) throw new Error("You need to sign in before editing a character.");

    const imageUrl = characterData.imageFile
      ? await uploadCharacterMedia(characterData.imageFile, "avatar")
      : characterData.imageUrl?.trim() || null;
    const coverUrl = characterData.coverFile
      ? await uploadCharacterMedia(characterData.coverFile, "cover")
      : characterData.coverUrl?.trim() || null;

    const databaseCharacter = {
      name: characterData.name.trim(),
      role: characterData.role.trim(),
      description: characterData.description?.trim() || null,
      personality: characterData.personality.trim(),
      relationship: characterData.relationship?.trim() || null,
      world: characterData.world?.trim() || null,
      character_values: characterData.values?.trim() || null,
      fears: characterData.fears?.trim() || null,
      habits: characterData.habits?.trim() || null,
      contradictions: characterData.contradictions?.trim() || null,
      core_motivation: characterData.coreMotivation?.trim() || null,
      emotional_defense: characterData.emotionalDefense?.trim() || null,
      softening_triggers: characterData.softeningTriggers?.trim() || null,
      growth_direction: characterData.growthDirection?.trim() || null,
      speech_style: characterData.speechStyle?.trim() || null,
      voice_vocabulary: characterData.voiceVocabulary?.trim() || null,
      humor_style: characterData.humorStyle?.trim() || null,
      conflict_style: characterData.conflictStyle?.trim() || null,
      affection_style: characterData.affectionStyle?.trim() || null,
      verbal_tells: characterData.verbalTells?.trim() || null,
      voice_avoidances: characterData.voiceAvoidances?.trim() || null,
      boundaries: characterData.boundaries?.trim() || null,
      scenario: characterData.scenario?.trim() || null,
      example_dialogue: characterData.exampleDialogue?.trim() || null,
      response_length: characterData.responseLength || "balanced",
      narration_style: characterData.narrationStyle || "balanced",
      first_message: characterData.firstMessage.trim(),
      image_url: imageUrl,
      cover_url: coverUrl,
      color: characterData.color || "#7a2942",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("characters")
      .update(databaseCharacter)
      .eq("id", characterId)
      .select()
      .single();

    if (error) throw error;

    const updatedCharacter = convertDatabaseCharacter(data);
    setCharacters((currentCharacters) =>
      currentCharacters.map((character) =>
        character.id === characterId ? updatedCharacter : character
      )
    );

    return updatedCharacter;
  }

  async function uploadCharacterMedia(file, kind) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}-${kind}.${extension}`;
    const { error } = await supabase.storage
      .from("character-media")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from("character-media").getPublicUrl(path);
    return data.publicUrl;
  }

  async function requestCharacterAssist(characterData, mode = "polish", focusFields = []) {
    const { data, error } = await supabase.functions.invoke("character-chat", {
      body: {
        action: "character_assist",
        mode,
        focusFields: Array.isArray(focusFields) ? focusFields.slice(0, 8) : [],
        draft: characterDraftPayload(characterData),
      },
      timeout: 32000,
    });
    if (error) throw new Error(await readCharacterFunctionError(error, "Velvet couldn't refine this character."));
    return data?.suggestions || {};
  }

  async function enhanceCharacterDraft(characterData) {
    return requestCharacterAssist(characterData, "polish");
  }

  async function enhanceCharacterFields(characterData, focusFields = []) {
    return requestCharacterAssist(characterData, "polish", focusFields);
  }

  async function organizeCharacterDraft(characterData) {
    return requestCharacterAssist(characterData, "organize");
  }

  async function generateCharacterDraft(concept = "", { signal } = {}) {
    const { data, error } = await supabase.functions.invoke("character-chat", {
      body: { action: "character_generate", concept: String(concept || "").slice(0, 1200) },
      signal,
      timeout: 32000,
    });
    if (error) throw new Error(await readCharacterFunctionError(error, "Velvet couldn't create this character."));
    return data?.character || {};
  }

  async function generateInstantStory(characterData, idea = "") {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 34000);
    const historyKey = `velvet:instant-story-scenes:${characterData?.id || characterData?.name || "character"}`;
    let recentSceneSeeds = [];
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey) || "[]");
      recentSceneSeeds = Array.isArray(stored) ? stored.filter(Boolean).slice(-6) : [];
    } catch {
      recentSceneSeeds = [];
    }
    const variationKey = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (sessionError || !accessToken) throw new Error("Your session expired. Sign in again.");

      // Use the already validated Supabase client configuration. Raw Vite env
      // values may be redacted by local Vercel pulls (e.g. "[SENSITIVE]").
      const supabaseUrl = supabase.supabaseUrl;
      const publishableKey =
        supabase.supabaseKey ||
        import.meta.env.VITE_SUPABASE_ANON_KEY ||
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        "";
      if (!supabaseUrl) throw new Error("Velvet couldn't reach Instant Story.");

      const response = await fetch(`${supabaseUrl}/functions/v1/character-chat`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(publishableKey ? { apikey: publishableKey } : {}),
        },
        body: JSON.stringify({
          action: "instant_story",
          draft: characterDraftPayload(characterData),
          idea: String(idea || "").slice(0, 700),
          variationKey,
          recentSceneSeeds,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Instant Story failed with status ${response.status}.`);
      }
      const opening = String(data?.opening || "").trim();
      const instantWords = opening.split(/\s+/).filter(Boolean);
      const leakedTemplate = /\b(?:between you sits|their response carries|without turning it into a performance|neither a stranger nor a convenient accident|what happens next depends on what you choose to say)\b/i.test(opening);
      const genericInstantStory = /\b(?:flickering neon|the kind of .{0,55} (?:he|she|they) usually reserved for|expression shifted from .{0,80} to something (?:much )?softer|gaze lingering .{0,30} too long|spotting you (?:near|by|at|beside)|poor life choices|saved (?:you|your|the) (?:a )?seat|defended this seat|drove across (?:campus|town)|ordered (?:an )?extra.{0,40}(?:your usual|your favorite)|quiet evening or the drive)\b/i.test(opening);
      const visiblyComplete = /[.!?…][\"'”’)]?$/.test(opening) && !/[’'][A-Za-z]{0,2}$/.test(opening);
      if (!opening) throw new Error("Velvet returned an empty Instant Story. Try again.");
      if (instantWords.length < 130 || !visiblyComplete || leakedTemplate || genericInstantStory) {
        throw new Error("Velvet received a cut-off Instant Story instead of a complete opening. Try again.");
      }
      const usedSceneSeed = String(data?.sceneSeed || "").trim();
      if (usedSceneSeed) {
        try {
          localStorage.setItem(historyKey, JSON.stringify([...recentSceneSeeds, usedSceneSeed].slice(-6)));
        } catch {
          // Storage can be unavailable in private/restricted WebViews. Diversity
          // still works for this request through variationKey.
        }
      }
      return opening;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Instant Story took too long and was stopped. Try once more.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function deleteCharacter(characterId) {
    const { error } = await supabase
      .from("characters")
      .update({ trashed_at: new Date().toISOString() })
      .eq("id", characterId);

    if (error) {
      throw error;
    }

    setCharacters((currentCharacters) =>
      currentCharacters.filter(
        (character) =>
          character.id !== characterId
      )
    );
  }

  async function listTrashedCharacters() {
    if (!user) return [];
    const { data, error } = await supabase.from("characters").select("*").not("trashed_at", "is", null).order("trashed_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(convertDatabaseCharacter);
  }

  async function restoreCharacter(characterId) {
    const { data, error } = await supabase.from("characters").update({ trashed_at: null, updated_at: new Date().toISOString() }).eq("id", characterId).select().single();
    if (error) throw error;
    const restored = convertDatabaseCharacter(data);
    setCharacters((current) => [restored, ...current.filter((item) => item.id !== restored.id)]);
    return restored;
  }

  async function permanentlyDeleteCharacter(characterId) {
    const { error } = await supabase.from("characters").delete().eq("id", characterId);
    if (error) throw error;
  }

  async function testCharacterVoice(characterData, situation = "") {
    const { data, error } = await supabase.functions.invoke("character-chat", {
      body: { action: "character_voice_test", draft: characterDraftPayload(characterData), situation },
      timeout: 24000,
    });
    if (error) throw new Error(await readCharacterFunctionError(error, "Velvet couldn't test this voice."));
    return data?.sample || "";
  }

  async function buildCharacterVoiceLab(characterData) {
    const { data, error } = await supabase.functions.invoke("character-chat", {
      body: { action: "character_voice_lab", draft: characterDraftPayload(characterData) },
      timeout: 30000,
    });
    if (error) throw new Error(await readCharacterFunctionError(error, "Velvet couldn't build this Voice Lab."));
    return data?.lab || {};
  }
  async function openCharacterLearningRoom(characterData, situation) {
    const { data, error } = await supabase.functions.invoke("character-chat", { body: { action: "character_learning_room", draft: characterDraftPayload(characterData), situation }, timeout: 32000 });
    if (error) throw new Error(await readCharacterFunctionError(error, "Velvet couldn't open the Learning Room."));
    return Array.isArray(data?.samples) ? data.samples : [];
  }

  async function learnCharacterDialogueGenome(characterData, samples = []) {
    const { data, error } = await supabase.functions.invoke("character-chat", {
      body: { action: "character_dialogue_genome", draft: characterDraftPayload(characterData), samples },
      timeout: 32000,
    });
    if (error) throw new Error(await readCharacterFunctionError(error, "Velvet couldn't learn this Dialogue Genome."));
    if (data?.error) throw new Error(data.error);
    return data?.genome || {};
  }

  async function toggleFavorite(characterId) {
    const character = characters.find((item) => item.id === characterId);
    if (!character) return null;
    const isFavorite = !character.isFavorite;
    const { data, error } = await supabase
      .from("characters")
      .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
      .eq("id", characterId)
      .select()
      .single();
    if (error) throw error;
    const updated = convertDatabaseCharacter(data);
    setCharacters((current) => current.map((item) => item.id === characterId ? updated : item));
    return updated;
  }

  async function updateTags(characterId, tags) {
    const cleanTags = [...new Set((tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
    const { data, error } = await supabase
      .from("characters")
      .update({ tags: cleanTags, updated_at: new Date().toISOString() })
      .eq("id", characterId)
      .select()
      .single();
    if (error) throw error;
    const updated = convertDatabaseCharacter(data);
    setCharacters((current) => current.map((item) => item.id === characterId ? updated : item));
    return updated;
  }


  return (
    <CharactersContext.Provider
      value={{
        characters,
        charactersLoading,
        charactersError,
        loadCharacters,
        createCharacter,
        updateCharacter,
        enhanceCharacterDraft,
        enhanceCharacterFields,
        organizeCharacterDraft,
        generateCharacterDraft,
        testCharacterVoice,
        buildCharacterVoiceLab,
        openCharacterLearningRoom,
        learnCharacterDialogueGenome,
        generateInstantStory,
        deleteCharacter,
        listTrashedCharacters,
        restoreCharacter,
        permanentlyDeleteCharacter,
        toggleFavorite,
        updateTags,
      }}
    >
      {children}
    </CharactersContext.Provider>
  );
}

function characterDraftPayload(characterData = {}) {
  return {
    name: characterData.name || "",
    role: characterData.role || "",
    description: characterData.description || "",
    personality: characterData.personality || "",
    relationship: characterData.relationship || "",
    world: characterData.world || "",
    values: characterData.values || "",
    fears: characterData.fears || "",
    habits: characterData.habits || "",
    contradictions: characterData.contradictions || "",
    coreMotivation: characterData.coreMotivation || "",
    emotionalDefense: characterData.emotionalDefense || "",
    softeningTriggers: characterData.softeningTriggers || "",
    growthDirection: characterData.growthDirection || "",
    speechStyle: characterData.speechStyle || "",
    voiceVocabulary: characterData.voiceVocabulary || "",
    humorStyle: characterData.humorStyle || "",
    conflictStyle: characterData.conflictStyle || "",
    affectionStyle: characterData.affectionStyle || "",
    verbalTells: characterData.verbalTells || "",
    voiceAvoidances: characterData.voiceAvoidances || "",
    boundaries: characterData.boundaries || "",
    scenario: characterData.scenario || "",
    exampleDialogue: characterData.exampleDialogue || "",
    responseLength: characterData.responseLength || "balanced",
    narrationStyle: characterData.narrationStyle || "balanced",
    firstMessage: characterData.firstMessage || "",
  };
}

async function readCharacterFunctionError(error, fallback) {
  try {
    const response = error?.context;
    if (response && typeof response.clone === "function") {
      const text = await response.clone().text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          const message = parsed?.error || parsed?.message;
          if (message) return String(message);
        } catch {
          if (!/^edge function returned/i.test(text.trim())) return text.trim().slice(0, 500);
        }
      }
    }
  } catch {
    // Use the normalized client error below when the response body is unavailable.
  }
  const message = String(error?.message || "").trim();
  if (message && !/^edge function returned a non-2xx/i.test(message)) return message;
  return fallback;
}

function convertDatabaseCharacter(character) {
  return {
    id: character.id,
    userId: character.user_id,

    name: character.name,
    role: character.role,
    description: character.description || "",
    personality: character.personality,
    relationship: character.relationship || "",
    world: character.world || "",
    values: character.character_values || "",
    fears: character.fears || "",
    habits: character.habits || "",
    contradictions: character.contradictions || "",
    coreMotivation: character.core_motivation || "",
    emotionalDefense: character.emotional_defense || "",
    softeningTriggers: character.softening_triggers || "",
    growthDirection: character.growth_direction || "",
    speechStyle: character.speech_style || "",
    voiceVocabulary: character.voice_vocabulary || "",
    humorStyle: character.humor_style || "",
    conflictStyle: character.conflict_style || "",
    affectionStyle: character.affection_style || "",
    verbalTells: character.verbal_tells || "",
    voiceAvoidances: character.voice_avoidances || "",
    boundaries: character.boundaries || "",
    scenario: character.scenario || "",
    exampleDialogue: character.example_dialogue || "",

    responseLength: character.response_length,
    narrationStyle: character.narration_style,
    firstMessage: character.first_message,

    imageUrl: character.image_url || "",
    coverUrl: character.cover_url || "",
    color: character.color || "#7a2942",
    isFavorite: Boolean(character.is_favorite),
    tags: Array.isArray(character.tags) ? character.tags : [],

    initials: createInitials(character.name),
    likes: "0",

    style: getStyleName(
      character.narration_style
    ),

    createdAt: character.created_at,
    updatedAt: character.updated_at,
  };
}

function createInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function getStyleName(narrationStyle) {
  if (narrationStyle === "dialogue") {
    return "Dialogue focused";
  }

  if (narrationStyle === "immersive") {
    return "Immersive roleplay";
  }

  return "Balanced storytelling";
}

export function useCharacters() {
  const context = useContext(CharactersContext);

  if (!context) {
    throw new Error(
      "useCharacters debe utilizarse dentro de CharactersProvider"
    );
  }

  return context;
}
