/**
 * Instant Story Clarity Control
 * Pure, dependency-free quality gate for narrative openings.
 * This is a conservative heuristic, not a substitute for semantic evaluation.
 */
const JARGON = /\b(?:treasury|seating committee|override the treasury|quorum|endowment funds|fiscal quarter|committee vote|budget allocation)\b/gi;
const ABSTRACT = /\b(?:unshielded focus|usual armor|effortless certainty|sharp intensity|practiced disarming grin)\b/gi;
const LOCATION = /\b(?:library|hallway|corridor|cafe|coffee shop|party|rooftop|classroom|kitchen|campus|quad|stairs|balcony|dorm|apartment|house|desk|table)\b/i;
const ACTION = /\b(?:grabbed|snatched|kissed|shoved|blocked|interrupted|slammed|dropped|spilled|stole|called|accused|confronted|followed|stopped|pulled|walked|ran|took|handed|caught|opened|closed|broke|left|arrived|asked|told)\b/i;
const GENERIC = /\b(?:you're coming with me|i didn't plan on coming up here|you okay\??)\b/i;
const matches = (text, regex) => [...text.matchAll(regex)].map(m => m[0]);

export function evaluateInstantStoryClarity(story, options = {}) {
  const text = typeof story === "string" ? story.trim() : "";
  const words = text.split(/\s+/).filter(Boolean);
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  const dialogue = (text.match(/[“"][^”"\n]{2,}[”"]/g) || []);
  const jargon = matches(text, JARGON);
  const abstractions = matches(text, ABSTRACT);
  const problems = [];
  if (!text || words.length < 35) problems.push("opening_too_short");
  if (words.length > (options.maxWords ?? 230)) problems.push("opening_too_long");
  if (!LOCATION.test(text)) problems.push("setting_not_grounded");
  if (!ACTION.test(text)) problems.push("no_observable_action");
  if (!dialogue.length) problems.push("no_dialogue");
  if (jargon.length >= 2) problems.push("unexplained_institutional_jargon");
  if (abstractions.length >= 2) problems.push("abstract_emotional_filler");
  if (GENERIC.test(text)) problems.push("repetitive_generic_hook");
  if (/\byou (?:say|reply|decide|think|feel|follow|nod|smile|agree)\b/i.test(text))
    problems.push("user_agency_violation");
  return {
    passed: problems.length === 0,
    score: Math.max(0, 100 - problems.length * 18),
    problems,
    metrics: { words: words.length, paragraphs: paragraphs.length, dialogueTurns: dialogue.length, jargon, abstractions },
  };
}

export function instantStoryClarityInstructions() {
  return [
    "INSTANT STORY CLARITY CONTROL:",
    "Make the setting, participants, and immediate situation understandable on first reading.",
    "Use one primary conflict and concrete observable actions. Avoid unexplained committees, finances, and invented institutional lore.",
    "A secondary character must meaningfully affect the scene; do not exist solely to be ignored.",
    "Keep dialogue natural and distinct to the selected character. Avoid stock lines and recycled opening structures.",
    "Never narrate the user's speech, decisions, thoughts, or feelings.",
    "Preserve established continuity, locations, and the approved NPC roster.",
    "Do not equate simplicity with low stakes: allow tension, surprise, conflict, and consequences.",
    "Finish on a clear, playable situation, not an abstract emotional statement.",
  ].join("\n");
}
