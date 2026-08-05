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

      response_length:
        characterData.responseLength || "balanced",

      narration_style:
        characterData.narrationStyle || "balanced",

      first_message:
        characterData.firstMessage.trim(),

      image_url:
        characterData.imageUrl || null,

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

  async function deleteCharacter(characterId) {
    const { error } = await supabase
      .from("characters")
      .delete()
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

  return (
    <CharactersContext.Provider
      value={{
        characters,
        charactersLoading,
        charactersError,
        loadCharacters,
        createCharacter,
        deleteCharacter,
      }}
    >
      {children}
    </CharactersContext.Provider>
  );
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

    responseLength: character.response_length,
    narrationStyle: character.narration_style,
    firstMessage: character.first_message,

    imageUrl: character.image_url || "",
    color: character.color || "#7a2942",

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