// v3.53.41 — conservative clarity gate; never blocks a safe opening solely for style.
const jargon = /\b(?:treasury|seating committee|quorum|endowment funds|fiscal quarter|budget allocation|override the treasury)\b/gi;
const filler = /\b(?:unshielded focus|usual armor|effortless certainty|sharp intensity|practiced disarming grin)\b/gi;
const generic = /\b(?:you're coming with me|i didn't plan on coming up here|you okay\??)\b/i;
export function instantStoryClarityIssuesV35341(opening = "") {
  const text = String(opening || "").replace(/[’‘]/g,"'");
  const jargonHits = [...text.matchAll(jargon)].length;
  const fillerHits = [...text.matchAll(filler)].length;
  const issues = [];
  if (jargonHits >= 2) issues.push("instant_story_unexplained_jargon");
  if (fillerHits >= 2) issues.push("instant_story_abstract_filler");
  if (generic.test(text)) issues.push("instant_story_generic_hook");
  const narration=text.replace(/["“][^"”]*["”]/g," ");
  if (/\byou (?:say|reply|decide|think|feel|follow|nod|smile|agree)\b/i.test(narration)) issues.push("instant_story_user_action");
  return issues;
}
export function instantStoryClarityPromptV35341() {
  return [
    "INSTANT STORY CLARITY v3.53.41",
    "Within the first two sentences, make clear who is present, where they are, and what concrete event is happening.",
    "Keep ONE understandable conflict; do not invent unexplained committees, budgets, or procedural lore.",
    "Give supporting characters meaningful actions and consequences, not decorative interruptions.",
    "Use natural, character-specific dialogue; avoid generic stock lines or abstract emotional descriptions.",
    "Never write the user's decisions, movements, speech, feelings or consent.",
    "Preserve creator canon, existing locations, approved names and user-provided IDEA.",
    "Finish on a clear live beat with room for the user's choice.",
  ].join("\n");
}
