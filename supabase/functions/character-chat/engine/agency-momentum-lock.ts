// Velvet v3.35.2 · Character Agency + Scene Momentum
// Deterministic guardrails that let characters act without turning initiative into canon fabrication.

function normalized(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s*.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function spokenUserText(value = "") {
  return String(value || "").replace(/\*[^*]*\*/gs, " ").replace(/\s+/g, " ").trim();
}

function evidenceText(recentUserMessages = [], recentCharacterReplies = [], character = {}, groundedAnchors = []) {
  return normalized([
    ...(Array.isArray(recentUserMessages) ? recentUserMessages : []),
    ...(Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []),
    ...(Array.isArray(groundedAnchors) ? groundedAnchors : []),
    character?.name || "",
    character?.role || "",
    character?.background || "",
    character?.notes || "",
    character?.scenario || "",
    character?.world || "",
    character?.relationship || "",
  ].join(" "));
}

function latestWordCount(latestUserMessage = "") {
  const spoken = spokenUserText(latestUserMessage);
  const actions = (String(latestUserMessage || "").match(/\*[^*]*\*/g) || []).join(" ");
  return normalized(`${spoken} ${actions}`).split(/\s+/).filter(Boolean).length;
}

function hasExplicitActionTrigger(latestUserMessage = "") {
  const value = normalized(latestUserMessage);
  return /\b(?:leave|left|go|went|walk|walked|stand|stood|sit|sat|come|came|follow|wait|stay|move|moved|open|opened|close|closed|call|called|text|texted|phone|door|knock|arrive|arrived|enter|entered|pick|picked|grab|grabbed|take|took|drive|drove)\b/.test(value);
}

export function hasCommitmentInertiaBreak(reply = "", latestUserMessage = "", recentCharacterReplies = []) {
  const previous = normalized((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "");
  const text = normalized(reply);
  const user = normalized(latestUserMessage);
  if (!previous || !text) return false;

  const committedStay = /\b(?:i'?ll stay|i am staying|i'?m staying|not going anywhere|i can wait|i'?ll wait|i am not leaving|i'?m not leaving)\b/.test(previous);
  const committedLeave = /\b(?:i'?m leaving|i am leaving|i'?ll leave|i have to go|i need to go|i'?m heading out)\b/.test(previous);
  const leavesNow = /\b(?:i left|i leave|i stood and left|i got up and left|i headed out|i walked away|i followed you|i went after you|i chased after you)\b/.test(text);
  const staysNow = /\b(?:i stayed|i remain|i remained|i sat back down|i decided to stay|i was still there)\b/.test(text);

  const explicitReverseToLeave = /\b(?:come with me|follow me|let'?s go|you should go|go now|leave now|we should leave|we need to leave)\b/.test(user);
  const explicitReverseToStay = /\b(?:stay|don'?t go|do not go|wait|come back|sit down)\b/.test(user);

  if (committedStay && leavesNow && !explicitReverseToLeave) return true;
  if (committedLeave && staysNow && !explicitReverseToStay) return true;
  return false;
}

export function hasGratuitousExternalHook(reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], character = {}, groundedAnchors = []) {
  const text = normalized(reply);
  if (!text) return false;
  const evidence = evidenceText(recentUserMessages, recentCharacterReplies, character, groundedAnchors);
  const userTrigger = hasExplicitActionTrigger(latestUserMessage);

  const hookPatterns = [
    /\b(?:my|his|her|their|the) phone (?:buzzed|rang|lit up|vibrated)\b/,
    /\b(?:a|the) notification (?:appeared|popped up|came through)\b/,
    /\b(?:someone|somebody) (?:knocked|called out|appeared|walked in|came over|approached)\b/,
    /\b(?:the|a) door (?:opened|swung open)\b/,
    /\b(?:before i could|just then|at that exact moment|right then)\b.{0,60}\b(?:phone|door|someone|somebody|voice|notification|knock)\b/,
  ];
  const hook = hookPatterns.find((pattern) => pattern.test(text));
  if (!hook) return false;

  const supportPatterns = [
    /\bphone\b/, /\bnotification\b/, /\bdoor\b/, /\bknock\b/, /\bwaiting for\b/, /\bexpect(?:ing|ed)\b/, /\barriv(?:e|al|ing)\b/, /\bcall\b/, /\btext\b/
  ];
  const supported = supportPatterns.some((pattern) => pattern.test(evidence));
  return !supported && !userTrigger;
}

export function hasInitiativeBudgetOverflow(reply = "", latestUserMessage = "") {
  const words = latestWordCount(latestUserMessage);
  if (words > 14) return false;
  const raw = String(reply || "");
  if (!raw.trim()) return false;

  const actionPatterns = [
    /\b(?:i|he|she) (?:stood|got up|walked|crossed|left|followed|turned|moved|sat|grabbed|picked up|put down|opened|closed|checked|pulled out|called|texted|headed|started|stopped|drove|returned|came back)\b/i,
    /\b(?:phone|door|notification|knock|someone|somebody)\b/i,
    /\b(?:minutes later|a moment later|later that|the next|afterward|after that)\b/i,
  ];
  const sentences = raw.split(/(?<=[.!?]["”']?)\s+|\n+/).map((x) => x.trim()).filter(Boolean);
  const actionCount = sentences.filter((sentence) => actionPatterns.some((pattern) => pattern.test(sentence))).length;
  const sceneChangeCount = sentences.filter((sentence) => /\b(?:left the|walked out|headed to|arrived at|returned to|came back to|drove to|outside|hallway|parking lot|car|home|apartment|dorm)\b/i.test(sentence)).length;
  return actionCount >= 4 || sceneChangeCount >= 2;
}

export function hasForcedContinuationHook(reply = "", latestUserMessage = "") {
  const text = String(reply || "").trim();
  if (!text) return false;
  const user = normalized(latestUserMessage);
  const userOpenQuestion = /\?|\b(?:why|what|how|where|when|who|tell me|wait)\b/.test(user);
  if (userOpenQuestion) return false;

  const tail = normalized(text.split(/\n+/).filter(Boolean).slice(-2).join(" "));
  const bait = [
    /\bbut before (?:i|he|she|we) could\b/,
    /\bthen (?:my|his|her|their|the) phone (?:buzzed|rang|lit up)\b/,
    /\bjust then\b/,
    /\bthat was when\b.{0,50}\b(?:door|phone|someone|voice|knock)\b/,
    /\bneither of us knew\b/,
    /\blittle did (?:i|he|she|we) know\b/,
    /\bwhat happened next\b/,
  ];
  return bait.some((pattern) => pattern.test(tail));
}

export function hasInventedUserPhysicalAction(reply = "", latestUserMessage = "") {
  const rawReply = String(reply || "");
  const rawUser = String(latestUserMessage || "");
  if (!rawReply.trim()) return false;

  // User physical actions are canon only when the user actually writes them as actions.
  // Dialogue, refusal, tone, implication, hesitation, or phrases such as "I'll pass"
  // must NEVER be converted into movement by the narrator.
  const explicitUserActions = (rawUser.match(/\*[^*]*\*/gs) || []).join(" ");
  const actionEvidence = normalized(explicitUserActions);

  const inventedActionPatterns = [
    /\b(?:watch(?:es|ed|ing)?|see(?:s|ing)?|as) you (?:turn(?:ed|ing)? (?:to )?(?:leave|go)|walk(?:ed|ing)? away|walk(?:ed|ing)? out|leave|left|head(?:ed|ing)? (?:out|away)|step(?:ped|ping)? away|move(?:d|ing)? away|stand|stood|get up|got up|sit|sat|approach(?:ed|ing)?|come closer|follow(?:ed|ing)?|reach(?:ed|ing)?|grab(?:bed|bing)?|pick(?:ed|ing)? up)\b/i,
    /\byou (?:turn(?:ed|ing)? (?:to )?(?:leave|go)|walk(?:ed|ing)? away|walk(?:ed|ing)? out|leave|left|head(?:ed|ing)? (?:out|away)|step(?:ped|ping)? away|move(?:d|ing)? away|stand|stood|get up|got up|sit|sat|approach(?:ed|ing)?|come closer|follow(?:ed|ing)?|reach(?:ed|ing)?|grab(?:bed|bing)?|pick(?:ed|ing)? up)\b/i,
  ];

  const matched = inventedActionPatterns.some((pattern) => pattern.test(rawReply));
  if (!matched) return false;

  const matchingEvidence = [
    /\b(?:turn|leave|left|go|walk|walked|away|out)\b/,
    /\b(?:head|headed|step|stepped|move|moved)\b/,
    /\b(?:stand|stood|get up|got up|sit|sat)\b/,
    /\b(?:approach|approached|closer|follow|followed)\b/,
    /\b(?:reach|reached|grab|grabbed|pick|picked)\b/,
  ];
  return !matchingEvidence.some((pattern) => pattern.test(actionEvidence));
}

export function hasAgencyContradiction(reply = "", latestUserMessage = "", recentCharacterReplies = []) {
  const text = normalized(reply);
  const latest = normalized(latestUserMessage);
  if (!text) return false;

  const userLeaves = /\*[^*]*\b(?:leave|left|walk(?:ed)? away|walk(?:ed)? out|exit(?:ed)?|drive|drove away|go home|went home)\b[^*]*\*/i.test(String(latestUserMessage || ""));
  const follows = /\b(?:i followed you|i went after you|i chased after you|i caught up with you|i was right behind you|i followed her|i followed him)\b/.test(text);
  const explicitInvite = /\b(?:follow me|come with me|come on|you coming|walk with me)\b/.test(latest);
  if (userLeaves && follows && !explicitInvite) return true;

  return hasCommitmentInertiaBreak(reply, latestUserMessage, recentCharacterReplies);
}

export function agencyMomentumIssues({ reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], character = {}, groundedAnchors = [] } = {}) {
  const issues = [];
  if (hasInventedUserPhysicalAction(reply, latestUserMessage)) issues.push("invented_user_physical_action");
  if (hasAgencyContradiction(reply, latestUserMessage, recentCharacterReplies)) issues.push("agency_commitment_inertia_break");
  if (hasGratuitousExternalHook(reply, latestUserMessage, recentUserMessages, recentCharacterReplies, character, groundedAnchors)) issues.push("gratuitous_external_hook");
  if (hasInitiativeBudgetOverflow(reply, latestUserMessage)) issues.push("initiative_budget_overflow");
  if (hasForcedContinuationHook(reply, latestUserMessage)) issues.push("forced_scene_continuation_hook");
  return [...new Set(issues)];
}

export function sanitizeAgencyMomentumReply(reply = "", issues = []) {
  const active = new Set(Array.isArray(issues) ? issues : []);
  let pieces = String(reply || "")
    .split(/(?<=[.!?]["”']?)\s+|\n{2,}/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (active.has("gratuitous_external_hook") || active.has("forced_scene_continuation_hook")) {
    pieces = pieces.filter((piece) => !/\b(?:phone (?:buzzed|rang|lit up|vibrated)|notification|someone (?:knocked|appeared|walked in|came over)|somebody (?:knocked|appeared|walked in|came over)|door (?:opened|swung open)|just then|little did .* know|neither of us knew|what happened next)\b/i.test(piece));
  }
  if (active.has("invented_user_physical_action")) {
    pieces = pieces.filter((piece) => !hasInventedUserPhysicalAction(piece, ""));
  }
  if (active.has("agency_commitment_inertia_break")) {
    pieces = pieces.filter((piece) => !/\b(?:followed you|went after you|chased after you|caught up with you|right behind you|headed out|walked away|left)\b/i.test(piece));
  }
  if (active.has("initiative_budget_overflow") && pieces.length > 3) {
    const dialogueFirst = pieces.filter((piece) => /["“”']/.test(piece));
    const decisive = pieces.filter((piece) => /\b(?:said|asked|answered|stayed|waited|sat|looked|nodded|shrugged)\b/i.test(piece));
    const keep = [...dialogueFirst.slice(0,2), ...decisive.slice(0,1)];
    pieces = keep.length ? [...new Set(keep)] : pieces.slice(0,3);
  }
  return pieces.join(" ").replace(/\s+/g, " ").trim();
}
