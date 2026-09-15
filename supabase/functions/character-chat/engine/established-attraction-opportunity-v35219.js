function normalize(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function profileText(character = {}) {
  return normalize([
    character.relationship,
    character.personality,
    character.description,
    character.affection_style,
    character.scenario,
    character.notes,
  ].filter(Boolean).join(" "));
}

function hasExplicitAttraction(character = {}) {
  const profile = profileText(character);
  return /\b(?:already likes|likes you|likes the user|has (?:a )?(?:crush|thing|feelings) for you|has feelings for the user|attracted to you|into you|secretly likes you|romantic feelings for you|flirts openly|never hidden how much he likes you|never hidden how much she likes you|le gustas|gusta de ti|siente algo por ti|enamorado de ti|enamorada de ti)\b/.test(profile);
}

function hasOpenFlirtCanon(character = {}) {
  const profile = profileText(character);
  return /\b(?:flirts openly|openly flirty|flirtatious|flirty|natural flirt|likes to flirt|coquetea abiertamente|coqueto|coqueta)\b/.test(profile);
}

function userDelegatesChoice(latestUserMessage = "") {
  const latest = normalize(latestUserMessage);
  return /^(?:i(?: ll| will)? trust you|i trust you|you choose|your choice|surprise me|up to you|you decide|whatever you want|whatever you think|confio en ti|tu elige|elige tu|sorprendeme|lo que tu quieras)$/.test(latest);
}

function isChosenOneOnOneWindow(latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = []) {
  const context = normalize([
    ...(Array.isArray(recentUserMessages) ? recentUserMessages.slice(-6) : []),
    ...(Array.isArray(recentCharacterReplies) ? recentCharacterReplies.slice(-6) : []),
    latestUserMessage,
  ].join(" "));
  const outing = /\b(?:grab your jacket|take you somewhere|taking you somewhere|bailing|head out|leave a room|going to get|go somewhere|do something|where are we going|held the door|holding the door|walking toward .* jacket|walking towards .* jacket|diner|drive thru|drive through|fries|come on|lets go|let s go|parking lot|car ride)\b/.test(context);
  const shared = /\b(?:we|us|you and me|with you|take you|taking you|lets|let s|come on|follow you|i follow you)\b/.test(context);
  return outing && shared;
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
  return /\b(?:wait for me|dont leave without me|do not leave without me|wanted (?:some |more |extra )?time with you|want (?:some |more |extra )?time with you|rather be with you|rather stay with you|rather go with you|just the two of us|just us|you and me|my excuse was you|because i wanted to go with you|because i wanted you there|i asked you|i invited you|im taking you somewhere i like|save me a spot|meet me (?:by|at|outside)|steal you (?:away|from them)|have you to myself|keep you to myself|not in a hurry to (?:go|head) back|wasnt in a hurry to (?:go|head) back|wasn t in a hurry to (?:go|head) back|good excuse to .*with you|perfect excuse to .*with you|esp[eé]rame|no te vayas sin mi|queria estar contigo|quiero estar contigo|solo nosotros|tu y yo)\b/.test(text);
}

function replyShowsOpenFlirtSignal(reply = "") {
  const text = normalize(reply);
  return replyShowsChosenPersonalInterest(reply)
    || /\b(?:stole you from them|stealing you from them|keeping you for myself|i get you to myself|i get to keep you|call it a date|sounds like a date|i wanted you there|i wanted you with me)\b/.test(text);
}

export function establishedAttractionOpportunityIssues({ reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], character = {} } = {}) {
  if (!hasExplicitAttraction(character)) return [];
  const issues = [];
  const chosenTimeWindow = isChosenTimeTogetherWindow(latestUserMessage, recentUserMessages, recentCharacterReplies);
  if (chosenTimeWindow) {
    if (!replyShowsChosenPersonalInterest(reply)) issues.push("chosen_time_attraction_flattened");
    if (/\bpass the buck\b/.test(normalize(reply))) issues.push("delegated_social_task_condescension");
  }

  const trustedChoiceWindow = userDelegatesChoice(latestUserMessage)
    && isChosenOneOnOneWindow(latestUserMessage, recentUserMessages, recentCharacterReplies);
  if (trustedChoiceWindow) {
    const visibleSignal = hasOpenFlirtCanon(character) ? replyShowsOpenFlirtSignal(reply) : replyShowsChosenPersonalInterest(reply);
    if (!visibleSignal) issues.push("trusted_choice_attraction_flattened");
  }
  return [...new Set(issues)];
}

export function buildGroundedLastResortReply({ character = {}, latestUserMessage = "", recentCharacterReplies = [], issues = [] } = {}) {
  const name = String(character?.name || "The character").trim() || "The character";
  const normalizedTurn = normalize(latestUserMessage);
  const failures = new Set(Array.isArray(issues) ? issues : []);

  if (failures.has("chosen_time_attraction_flattened") || failures.has("delegated_social_task_condescension")) {
    return `“Fine. I’ll handle them.” ${name} starts toward the others, then looks back at you. “Wait for me. I want to do this with you.”`;
  }
  if (failures.has("trusted_choice_attraction_flattened")) {
    const recent = normalize((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "");
    const destination = /\bdiner\b/.test(recent) ? "The diner" : /\bdrive thru\b/.test(recent) ? "Drive-thru" : "I’ve got it";
    if (hasOpenFlirtCanon(character)) return `“${destination}.” ${name} makes the call and starts that way. “Better choice. And I’m not wasting an excuse to steal you from them for a while.”`;
    return `“${destination}.” ${name} makes the call and starts that way. “I wasn’t in a hurry to head back yet.”`;
  }
  if (failures.has("delegated_choice_returned")) {
    const recent = normalize((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "");
    if (hasExplicitAttraction(character) && userDelegatesChoice(latestUserMessage) && /\b(?:diner|drive thru|drive through|where are we going|fries)\b/.test(recent)) {
      if (/\bdiner\b/.test(recent)) return `“The diner.” ${name} makes the decision and heads that way. “Better fries. I wanted the extra time with you anyway.”`;
      if (/\bdrive thru\b/.test(recent)) return `“Drive-thru.” ${name} decides and leads the way. “I wanted the extra time with you anyway.”`;
    }
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
