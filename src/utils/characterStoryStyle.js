const KEY = "velvet_character_story_style_v1";
export const STORY_STYLE_OPTIONS = [{
  id: "dialogue",
  label: "More dialogue",
  instruction: "Favor audible dialogue. Keep narration sparse unless the moment truly needs it."
}, {
  id: "brief",
  label: "Keep it concise",
  instruction: "Keep ordinary turns compact. Do not pad a simple exchange into a long literary passage."
}, {
  id: "natural",
  label: "Casual speech",
  instruction: "Use casual, age-appropriate spoken language with contractions, fragments and imperfect rhythm."
}, {
  id: "initiative",
  label: "Let them initiate",
  instruction: "Let the character initiate plans, questions, contact or choices when it fits their personality."
}, {
  id: "guarded",
  label: "Hide feelings",
  instruction: "Do not make the character verbalize every feeling. Let guarded emotions show through choices and subtext."
}, {
  id: "touch",
  label: "Natural touch",
  instruction: "When established consent and context support it, allow small natural physical affection without making every beat about touch."
}, {
  id: "banter",
  label: "Playful banter",
  instruction: "Allow light banter when earned, but avoid nonstop sarcasm, mock-formal dialogue or sitcom punchlines."
}, {
  id: "slow-soften",
  label: "Slow to soften",
  instruction: "Do not make the character become instantly warm, apologetic or emotionally fluent after one vulnerable moment."
}];
function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}
export function readCharacterStoryStyle(characterId) {
  if (!characterId || typeof localStorage === "undefined") return {
    traits: [],
    note: ""
  };
  const all = readAll();
  const value = all[characterId] || {};
  return {
    traits: Array.isArray(value.traits) ? value.traits.filter(id => STORY_STYLE_OPTIONS.some(item => item.id === id)).slice(0, 6) : [],
    note: String(value.note || "").slice(0, 360)
  };
}
export function writeCharacterStoryStyle(characterId, value = {}) {
  if (!characterId || typeof localStorage === "undefined") return;
  const all = readAll();
  all[characterId] = {
    traits: Array.isArray(value.traits) ? [...new Set(value.traits)].filter(id => STORY_STYLE_OPTIONS.some(item => item.id === id)).slice(0, 6) : [],
    note: String(value.note || "").trim().slice(0, 360),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(KEY, JSON.stringify(all));
}
export function characterStoryStyleInstruction(characterId) {
  const value = readCharacterStoryStyle(characterId);
  const traitInstructions = value.traits.map(id => STORY_STYLE_OPTIONS.find(item => item.id === id)?.instruction).filter(Boolean);
  const note = value.note ? `Character-specific direction: ${value.note}` : "";
  return [...traitInstructions, note].filter(Boolean).join(" ").slice(0, 720);
}
