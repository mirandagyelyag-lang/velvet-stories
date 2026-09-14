const norm = (value = "") => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export function immediateTurnContinuityIssues(reply = "", latestUserMessage = "", recentCharacterReplies = [], character = {}) {
  const issues = [];
  const text = norm(reply);
  const latest = norm(latestUserMessage);
  const previous = norm((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "");

  const userKeepsOwnFood = /\b(?:its fine|it is fine|no thanks|im fine|i am fine)\b.{0,55}\b(?:ill|i will|let me|i can)\s+(?:eat|keep|take|have)\s+(?:mine|my own|my order)\b/.test(latest)
    || /\b(?:ill|i will)\s+(?:eat|keep|take|have)\s+(?:mine|my own|my order|the other one|the other thing|this one|that one)\b/.test(latest);
  const characterForcesSwap = /\b(?:push(?:es|ed|ing)?|slide(?:s|d|ing)?|shove(?:s|d|ing)?|place(?:s|d|ing)?)\b.{0,75}\b(?:container|food|meal|order|plate|drink|mine|extra)\b/.test(text)
    || /\b(?:take mine|eat mine|eat this|youre eating this|you are eating this|no arguments?|relax)\b/.test(text);
  if (userKeepsOwnFood && characterForcesSwap) issues.push("immediate_user_choice_overridden");

  const userSettledAlternative = /\b(?:dont|do not|no thanks|its fine|it is fine)\b/.test(latest)
    && /\b(?:ill|i will)\s+(?:eat|keep|take|have)\s+(?:mine|my own|my order|the other one|the other thing|this one|that one)\b/.test(latest);
  const replyReopensChoice = /\b(?:you sure|are you sure|sure you dont|sure you do not|still want|change your mind)\b.{0,80}\b(?:other|mine|food|order|thing|one)\b/.test(text)
    || /\b(?:i can|ill|i will)\s+still\s+(?:go|take it back|fix it|call them|get another)\b/.test(text);
  if (userSettledAlternative && replyReopensChoice) issues.push("settled_choice_reopened");

  if (/["”]\s+["“]/.test(String(reply || ""))) issues.push("adjacent_dialogue_fragments");

  const previousSaysMissing = /\b(?:forgot|missing|left out|didnt include|did not include|messed up)\b.{0,60}\b(?:your|yours|order|food|drink)\b|\b(?:your|yours)\b.{0,35}\b(?:forgotten|missing|left out)\b/.test(previous);
  const previousHasDifferentSpare = /\b(?:spare|extra|backup)\b.{0,90}\b(?:thing|item|order|food|drink|usually|usual)\b|\b(?:ordered|got|bought)\b.{0,35}\b(?:spare|extra|backup)\b/.test(previous);
  const replyRewritesAsDuplicate = /\b(?:i|he|she|they)\s+(?:ordered|got|bought)\s+(?:two|2|another|an extra)\b.{0,35}\b(?:on purpose|for you|because|just in case)?\b/.test(text);
  if (previousSaysMissing && previousHasDifferentSpare && replyRewritesAsDuplicate) issues.push("immediate_event_truth_rewritten");

  const firstConcreteSeat = text.search(/\b(?:couch|sofa|chair|seat|stool|bench|bed|floor)\b/);
  const danglingSeat = text.search(/\b(?:drop(?:s|ped|ping)?|sit(?:s|ting)?|sat|settle(?:s|d|ing)?|collapse(?:s|d|ing)?)\s+(?:down\s+)?(?:on|onto|into)\s+it\b/);
  if (danglingSeat >= 0 && (firstConcreteSeat < 0 || danglingSeat < firstConcreteSeat)) issues.push("dangling_scene_reference");

  const userCarriesFood = /\b(?:i|we)\s+(?:took|take|carried|carry|brought|bring|picked up|held|have|had)\b.{0,55}\b(?:my|our)\s+(?:food|meal|order|container|plate|drink)\b/.test(latest);
  const replyHandsBackFood = /\b(?:pass(?:es|ed|ing)?|hand(?:s|ed|ing)?|give(?:s|gave|giving)|slide(?:s|d|ing)?)\s+(?:you|her|him|them)\b.{0,35}\b(?:your|her|his|their)\s+(?:food|meal|order|container|plate|drink)\b/.test(text);
  if (userCarriesFood && replyHandsBackFood) issues.push("immediate_object_ownership_rewritten");

  const recent = (Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).map(norm).join(" ");
  if (/\bsave room for later\b/.test(text) && !/\b(?:dessert|cake|later we|after dinner|reservation|second course|ordered dessert|plans? for later)\b/.test(`${latest} ${recent}`)) issues.push("unsupported_future_callback");

  const profile = norm(Object.values(character && typeof character === "object" ? character : {}).join(" "));
  const explicitAttraction = /\b(?:likes you|like you|attracted to you|crush on you|feelings for you|into you|has never hidden how much he likes you)\b/.test(profile);
  const openingProvedInterest = /\b(?:knew your order|your order well enough|ordered a spare|the thing you usually chose|harder to explain as coincidence)\b/.test(recent);
  const distancingReset = /\b(?:opposite end|far end|furthest end|across the room|as far (?:away )?as possible)\b/.test(text);
  const selectiveInterest = /\b(?:saved|kept|left|made|cleared|held|moved|set aside|remembered|checked|waited|stayed|offered|invited|reserved)\b.{0,80}\b(?:for you|your|beside him|next to him|space|seat|spot|drink|food|order)\b/.test(text)
    || /\b(?:dont touch hers|don t touch hers|get your own|thats hers|that s hers)\b/.test(text);
  if (explicitAttraction && openingProvedInterest && distancingReset && !selectiveInterest) issues.push("opening_attraction_thread_dropped");

  const inventedEatingHabit = /\b(?:make sure|ensure|see that)\s+you\s+(?:actually\s+)?eat\b|\byou\s+(?:never|always|usually|keep)\s+(?:eat|eating|pick|picking)\b|\bpicking at (?:your|the) (?:food|dinner|meal)\b|\bget distracted\b.{0,45}\b(?:movie|tv|show|conversation|everyone)\b/.test(text);
  const groundedEatingHabit = /\b(?:i|me|my)\b.{0,80}\b(?:not eating|dont eat|do not eat|forgot to eat|forget to eat|picking at|distracted|no appetite|not hungry)\b/.test(latest);
  if (inventedEatingHabit && !groundedEatingHabit) issues.push("unsupported_user_habit_claim");

  return [...new Set(issues)];
}
