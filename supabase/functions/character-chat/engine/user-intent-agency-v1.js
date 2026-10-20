// User intent and agency contract for all character-chat turns.
// This module is intentionally character-neutral; voice belongs to each character.
export function classifyUserIntent(message = "") {
  const text = String(message).trim();
  const lower = text.toLowerCase();
  const negatedInvitation = /(?:then |well |fine,? )?(?:don't|do not) (?:go|come|bother|join)/i.test(text);
  const explicitPlan = /\b(?:we could|let's|lets|how about we|i want to|we should|vamos|podríamos|quiero que)\b/i.test(text);
  const playful = /\b(?:dramatic|kidding|joking|teasing|bromeando|exagerad[oa])\b/i.test(text);
  const boundary = /\b(?:stop|leave me alone|no means no|don't touch|déjame en paz|para|basta)\b/i.test(text);
  return {
    kind: boundary ? "boundary" : negatedInvitation ? "possible-frustration" : explicitPlan ? "proposal" : playful ? "banter" : "conversation",
    needsClarification: negatedInvitation && !boundary,
    plan: explicitPlan ? text : null,
  };
}
export function buildUserAgencyContract({ latestUserMessage = "", activePlan = "", location = "", characterName = "" } = {}) {
  const intent = classifyUserIntent(latestUserMessage);
  return [
    "USER AGENCY AND PRAGMATIC INTENT — HIGHEST NARRATIVE PRIORITY:",
    "Treat the user's concrete proposals, actions, preferences and corrections as authoritative story events.",
    "Do not overwrite a user's proposed plan with the character's preferred routine or repeated coffee/food suggestions.",
    "Distinguish sarcasm, teasing and irritation from a literal cancellation. If a user says 'then don't go' after the character mocks their suggestion, first acknowledge the friction; do not silently cancel the whole outing.",
    "Never force the user to accompany, agree, forgive, or feel anything. Character may react, apologize, negotiate or ask a short clarification; user decides.",
    "Maintain existing location, objects, participants, chronology, orders and agreed plans until a narrated action changes them.",
    "If the character's banter has visibly annoyed the user, stop doubling down; respond to what the user actually said and advance the scene.",
    "Preserve the character's distinct personality, but do not use personality as an excuse for repetitive contempt or refusal.",
    "Honor explicit refusals and safety boundaries immediately. Do not reinterpret clear boundaries as flirting.",
    "Avoid generic internal thoughts; italicized thoughts must reveal a specific character insight, not summarize the obvious.",
    characterName ? "CHARACTER: " + characterName : "",
    location ? "CURRENT LOCATION: " + location : "",
    activePlan ? "ACTIVE USER-APPROVED PLAN (preserve unless user changes it): " + activePlan : "",
    "LATEST USER INTENT: " + intent.kind,
    "LATEST USER MESSAGE: " + latestUserMessage,
  ].filter(Boolean).join("\n");
}
