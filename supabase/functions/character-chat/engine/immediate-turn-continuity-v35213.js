const norm = (value = "") => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export function immediateTurnContinuityIssues(reply = "", latestUserMessage = "", recentCharacterReplies = []) {
  const issues = [];
  const text = norm(reply);
  const latest = norm(latestUserMessage);
  const previous = norm((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "");

  const userKeepsOwnFood = /\b(?:its fine|it is fine|no thanks|im fine|i am fine)\b.{0,55}\b(?:ill|i will|let me|i can)\s+(?:eat|keep|take|have)\s+(?:mine|my own|my order)\b/.test(latest)
    || /\b(?:ill|i will)\s+(?:eat|keep|take|have)\s+(?:mine|my own|my order)\b/.test(latest);
  const characterForcesSwap = /\b(?:push(?:es|ed|ing)?|slide(?:s|d|ing)?|shove(?:s|d|ing)?|place(?:s|d|ing)?)\b.{0,75}\b(?:container|food|meal|order|plate|drink|mine|extra)\b/.test(text)
    || /\b(?:take mine|eat mine|eat this|youre eating this|you are eating this|no arguments?|relax)\b/.test(text);
  if (userKeepsOwnFood && characterForcesSwap) issues.push("immediate_user_choice_overridden");

  const previousSaysMissing = /\b(?:forgot|missing|left out|didnt include|did not include|messed up)\b.{0,60}\b(?:your|yours|order|food|drink)\b|\b(?:your|yours)\b.{0,35}\b(?:forgotten|missing|left out)\b/.test(previous);
  const previousHasDifferentSpare = /\b(?:spare|extra|backup)\b.{0,90}\b(?:thing|item|order|food|drink|usually|usual)\b|\b(?:ordered|got|bought)\b.{0,35}\b(?:spare|extra|backup)\b/.test(previous);
  const replyRewritesAsDuplicate = /\b(?:i|he|she|they)\s+(?:ordered|got|bought)\s+(?:two|2|another|an extra)\b.{0,35}\b(?:on purpose|for you|because|just in case)?\b/.test(text);
  if (previousSaysMissing && previousHasDifferentSpare && replyRewritesAsDuplicate) issues.push("immediate_event_truth_rewritten");

  return [...new Set(issues)];
}
