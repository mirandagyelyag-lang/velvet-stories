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
