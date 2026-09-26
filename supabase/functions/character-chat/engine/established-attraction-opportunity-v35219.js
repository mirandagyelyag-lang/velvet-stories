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

function isSilentMarker(value = "") {
  const raw = String(value || "").trim();
  return /^\[(?:SILENT_CONTINUE|RETURN_MAIN_POV)/.test(raw) || /^[.…。]+$/u.test(raw);
}

function effectiveUserBeat(latestUserMessage = "", recentUserMessages = []) {
  if (!isSilentMarker(latestUserMessage)) return String(latestUserMessage || "");
  const recent = Array.isArray(recentUserMessages) ? recentUserMessages : [];
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const candidate = String(recent[index] || "").trim();
    if (candidate && !isSilentMarker(candidate)) return candidate;
  }
  return String(latestUserMessage || "");
}

function fallbackTemperament(character = {}) {
  const profile = profileText(character);
  if (/\b(?:gentle|warm|kind|soft spoken|soft-spoken|patient|sweet|caring)\b/.test(profile)) return "warm";
  if (/\b(?:guarded|cold|reserved|stoic|private|emotionally closed|distant)\b/.test(profile)) return "guarded";
  if (/\b(?:confident|cocky|proud|bold|persistent|competitive|teasing|provocative|dominant personality)\b/.test(profile)) return "proud";
  return "direct";
}

function pursuitFallback({ name, character }) {
  const temperament = fallbackTemperament(character);
  if (temperament === "warm") return name + ' goes after you instead of letting the distance grow. “Wait.” ' + name + ' catches up without reaching for you. “I know you’re angry. I’m not leaving it like this.”';
  if (temperament === "guarded") return name + ' goes after you faster than the expression on their face gives away. “Wait.” ' + name + ' catches up without reaching for you. “I heard what you said. I’m not pretending it didn’t land.”';
  if (temperament === "proud") return name + ' goes after you immediately. If someone tries to get their attention, ' + name + ' cuts them off without slowing. “Not now.” ' + name + ' catches up. “You can be pissed at me. I’m still not leaving it like that.”';
  return name + ' goes after you instead of staying behind. “Wait.” ' + name + ' catches up. “I’m not letting that be the last thing between us.”';
}

function emotionalFallback({ name, character, latestUserMessage = "" }) {
  const temperament = fallbackTemperament(character);
  const turn = normalize(latestUserMessage);

  // High-salience disclosures need a reaction to what was actually said, not
  // a generic therapist prompt. Keep the character active without inventing
  // the user's feelings or solving the problem for them.
  if (/\b(?:pill|pills|med|meds|medication|medicine|dose|prescription)\b/.test(turn)) {
    return name + '’s expression changes at once. “Your pills?” The teasing drops out completely. ' +
      name + ' stays close, attention fixed on you. “Okay. When were you supposed to take them?”';
  }

  if (/\b(?:shitty day|bad day|awful day|rough day|terrible day|hard day|cried|crying|panic|panicking|scared|upset|hurt|overwhelmed)\b/.test(turn)) {
    if (temperament === "proud") {
      return name + ' loses the comeback before it lands. “Okay. That was me being an ass.” ' +
        name + ' stays put instead of retreating into a joke. “What happened?”';
    }
    if (temperament === "guarded") {
      return name + ' goes still for a beat, the usual deflection gone. “Okay.” ' +
        name + ' stays close instead of changing the subject. “What happened?”';
    }
    return name + '’s attention sharpens. “Okay.” ' + name + ' stays with you instead of smoothing it over. “What happened?”';
  }

  if (temperament === "warm") return name + ' stops trying to smooth it over. “I know saying I didn’t mean to doesn’t make it hurt less.”';
  if (temperament === "guarded") return name + ' goes quiet for a beat. “I heard you.” The usual defense is gone from the next line. “I’m not brushing that off.”';
  if (temperament === "proud") return name + ' loses the comeback before it lands. “Yeah. I heard you.” ' + name + ' doesn’t look away. “I’m not going to argue my way out of that.”';
  return name + ' doesn’t dodge it. “I heard you. I’m not pretending that makes it fine.”';
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

export function buildGroundedLastResortReply({ character = {}, latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], issues = [] } = {}) {
  const fullName = String(character?.name || "The character").trim() || "The character";
  const name = fullName.split(/\s+/)[0] || fullName;
  const effectiveTurn = effectiveUserBeat(latestUserMessage, recentUserMessages);
  const normalizedTurn = normalize(effectiveTurn);
  const failures = new Set(Array.isArray(issues) ? issues : []);

  if (failures.has("chosen_time_attraction_flattened") || failures.has("delegated_social_task_condescension")) {
    return "“Fine. I’ll handle them.” " + name + " starts toward the others, then looks back at you. “Wait for me. I want to do this with you.”";
  }

  if (failures.has("trusted_choice_attraction_flattened")) {
    const recent = normalize((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "");
    const destination = /\bdiner\b/.test(recent) ? "The diner" : /\bdrive thru\b/.test(recent) ? "Drive-thru" : "I’ve got it";
    if (hasOpenFlirtCanon(character)) return "“" + destination + ".” " + name + " heads that way without asking again. “Better choice. I wanted extra time with you anyway.”";
    return "“" + destination + ".” " + name + " heads that way without asking again. “I wasn’t in a hurry to head back yet.”";
  }

  if (failures.has("delegated_choice_returned")) {
    const recent = normalize((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "");
    if (hasExplicitAttraction(character) && userDelegatesChoice(effectiveTurn) && /\b(?:diner|drive thru|drive through|where are we going|fries)\b/.test(recent)) {
      if (/\bdiner\b/.test(recent)) return "“The diner.” " + name + " makes the decision and heads that way. “Better fries. I wanted extra time with you anyway.”";
      if (/\bdrive thru\b/.test(recent)) return "“Drive-thru.” " + name + " decides and leads the way. “I wanted extra time with you anyway.”";
    }
    if (/\bdiner\b/.test(recent)) return "“The diner.” " + name + " makes the decision and heads that way without handing it back to you. “Come on.”";
    if (/\bdrive thru\b/.test(recent)) return "“Drive-thru.” " + name + " makes the decision and leads the way. “I’ve got it.”";
    return name + " makes the decision instead of handing it back to you. “I’ve got it. Come on.”";
  }

  const pursuitFailures = ["required_pursuit_missing","departure_passively_released","departure_priority_stolen_by_npc","pursuit_emotion_flattened","passive_exit_after_rupture","charged_departure_dropped"];
  if (pursuitFailures.some((issue) => failures.has(issue))) return pursuitFallback({ name, character });

  const emotionalFailures = ["emotional_bid_practical_escape","relational_hurt_deflected","canned_distress_checkin","emotional_care_therapized","attachment_failed_to_affect_behavior","therapist_service_voice","perfect_empathy_package","therapeutic_deescalation_pivot"];
  if (emotionalFailures.some((issue) => failures.has(issue))) return emotionalFallback({ name, character, latestUserMessage: effectiveTurn });

  if (/\b(?:dont|do not|no|stop|leave it|never mind|won t|wont|can t|cant)\b/.test(normalizedTurn)) return name + " stops instead of pushing the point. “Okay.”";
  if (/\?$|\b(?:what|why|who|where|when|how|which)\b/.test(normalizedTurn)) return name + " answers without dressing it up. “I don’t know yet.”";

  const temperament = fallbackTemperament(character);

  // Never leak engine-language such as "stays with the moment" into visible
  // prose. Last-resort replies must still sound like an actual character turn.
  if (/\b(?:pill|pills|med|meds|medication|medicine|dose|prescription)\b/.test(normalizedTurn)) {
    return name + '’s expression changes. “Your pills?” ' + name + ' focuses on you properly now. “When were you supposed to take them?”';
  }
  if (/\b(?:shitty day|bad day|awful day|rough day|terrible day|hard day|cried|crying|panic|panicking|scared|upset|hurt|overwhelmed)\b/.test(normalizedTurn)) {
    if (temperament === "proud") return name + ' loses the comeback. “Okay. What happened?”';
    if (temperament === "guarded") return name + ' goes quiet, attention settling fully on you. “What happened?”';
    return name + ' turns fully toward you. “What happened?”';
  }

  if (temperament === "proud") return name + ' drops the automatic comeback. “Fine. Say it.”';
  if (temperament === "guarded") return name + ' goes quiet, watching you for a beat. “I’m listening.”';
  if (temperament === "warm") return name + ' gives you their full attention. “I’m here.”';
  return name + ' stays focused on you. “I’m listening.”';
}
