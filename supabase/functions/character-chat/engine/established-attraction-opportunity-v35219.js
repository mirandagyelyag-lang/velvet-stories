function normalize(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasExplicitAttraction(character = {}) {
  const profile = normalize([
    character.relationship,
    character.personality,
    character.description,
    character.affection_style,
    character.scenario,
  ].filter(Boolean).join(" "));
  return /\b(?:likes you|likes the user|has feelings for you|attracted to you|into you|flirts openly|never hidden how much he likes you|never hidden how much she likes you|le gustas|siente algo por ti)\b/.test(profile);
}

function isChosenTimeTogetherWindow(latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = []) {
  const context = normalize([
    ...(Array.isArray(recentUserMessages) ? recentUserMessages.slice(-5) : []),
    ...(Array.isArray(recentCharacterReplies) ? recentCharacterReplies.slice(-5) : []),
    latestUserMessage,
  ].join(" "));
  const leavingTogether = /\b(?:grab your jacket|take you somewhere|bailing|head out|leave a room|going to get|go somewhere|do something|coming|held the door|walking towards? .* jacket|walking toward .* jacket)\b/.test(context);
  const delegatesGroup = /\b(?:you (?:are|re) the older one|you have to deal with them|you tell them|you explain it|you face them|tu eres el mayor|tu eres la mayor|hazte cargo|diles tu)\b/.test(normalize(latestUserMessage));
  return leavingTogether && delegatesGroup;
}

function replyShowsChosenPersonalInterest(reply = "") {
  const text = normalize(reply);
  return /\b(?:wait for me|dont leave without me|do not leave without me|wanted time with you|want time with you|rather be with you|just the two of us|just us|you and me|my excuse was you|because i wanted to go with you|because i wanted you there|i asked you|i invited you|im taking you somewhere i like|save me a spot|meet me (?:by|at|outside)|esp[eé]rame|no te vayas sin mi|queria estar contigo|quiero estar contigo|solo nosotros|tu y yo)\b/.test(text);
}

export function establishedAttractionOpportunityIssues({ reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], character = {} } = {}) {
  if (!hasExplicitAttraction(character)) return [];
  if (!isChosenTimeTogetherWindow(latestUserMessage, recentUserMessages, recentCharacterReplies)) return [];
  const issues = [];
  if (!replyShowsChosenPersonalInterest(reply)) issues.push("chosen_time_attraction_flattened");
  if (/\bpass the buck\b/.test(normalize(reply))) issues.push("delegated_social_task_condescension");
  return issues;
}

export function buildGroundedLastResortReply({ character = {}, latestUserMessage = "", recentCharacterReplies = [], issues = [] } = {}) {
  const name = String(character?.name || "The character").trim() || "The character";
  const normalizedTurn = normalize(latestUserMessage);
  const failures = new Set(Array.isArray(issues) ? issues : []);

  if (failures.has("chosen_time_attraction_flattened") || failures.has("delegated_social_task_condescension")) {
    return `“Fine. I’ll handle them.” ${name} starts toward the others, then looks back at you. “Wait for me. I want to do this with you.”`;
  }
  if (failures.has("delegated_choice_returned")) {
    const recent = normalize((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "");
    if (/\bdiner\b/.test(recent)) return `“The diner.” ${name} makes the decision and heads that way without handing it back to you. “Come on.”`;
    if (/\bdrive thru\b/.test(recent)) return `“Drive-thru.” ${name} makes the decision and leads the way. “I’ve got it.”`;
    return `${name} makes the decision instead of handing it back to you. “I’ve got it. Come on.”`;
  }
  if (/\b(?:dont|do not|no|stop|leave it|never mind|won t|wont|can t|cant)\b/.test(normalizedTurn)) {
    return `${name} stops instead of pushing the point. “Okay. I heard you.”`;
  }
  if (/\?$|\b(?:what|why|who|where|when|how|which)\b/.test(normalizedTurn)) {
    return `${name} takes a moment before answering. “I’m not sure yet. Let me be honest about that.”`;
  }
  return `${name} lets the moment settle without deciding anything for you. “All right. I’m listening.”`;
}
