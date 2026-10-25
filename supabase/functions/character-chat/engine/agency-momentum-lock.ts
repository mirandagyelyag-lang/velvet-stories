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
 if (latestWordCount(latestUserMessage) > 14) return false;
 const jumps = [...String(reply || "").matchAll(/\b(?:minutes later|hours later|the next morning|the next day|afterward|later that night|arrived at|drove to|returned to|came back to|headed to|walked out of|left the)\b/gi)].length;
 return jumps >= 3;
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

const USER_ACTION_FAMILIES = [
 { name:"leave", pattern:/\b(?:turn(?:ed|ing)? to (?:leave|go)|walk(?:ed|ing)? (?:away|out)|leave|left|head(?:ed|ing)? (?:out|away)|step(?:ped|ping)? away|move(?:d|ing)? away)\b/i },
 { name:"stand", pattern:/\b(?:stand|stood|standing|get up|got up)\b/i },
 { name:"sit", pattern:/\b(?:sit|sat|sitting|sit down)\b/i },
 { name:"approach", pattern:/\b(?:approach(?:ed|ing)?|come closer|step(?:ped)? closer)\b/i },
 { name:"follow", pattern:/\b(?:follow(?:ed|ing)?)\b/i },
 { name:"reach", pattern:/\b(?:reach(?:ed|ing)?)\b/i },
 { name:"grab", pattern:/\b(?:grab(?:bed|bing)?|pick(?:ed|ing)? up|take|took)\b/i },
];
function userActionFamilies(value = "") { return USER_ACTION_FAMILIES.filter(item => item.pattern.test(value)).map(item => item.name); }
export function hasInventedUserPhysicalAction(reply = "", latestUserMessage = "") {
 const assertions = [...String(reply || "").matchAll(/\byou\s+((?:turn(?:ed|ing)? to (?:leave|go)|walk(?:ed|ing)? (?:away|out)|leave|left|head(?:ed|ing)? (?:out|away)|step(?:ped|ping)? away|move(?:d|ing)? away|stand|stood|standing|get up|got up|sit|sat|sitting|approach(?:ed|ing)?|come closer|follow(?:ed|ing)?|reach(?:ed|ing)?|grab(?:bed|bing)?|pick(?:ed|ing)? up|take|took))\b/gi)];
 if (!assertions.length) return false;
 const actionEvidence = normalized((String(latestUserMessage || "").match(/\*[^*]*\*/gs) || []).join(" "));
 const authorized = new Set(userActionFamilies(actionEvidence));
 return assertions.some(match => userActionFamilies(match[1]).some(family => !authorized.has(family)));
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
 const original = String(reply || "").trim();
 const active = new Set(Array.isArray(issues) ? issues : []);
 if (!original || !active.size) return original;
 if (active.has("invented_user_physical_action") || active.has("agency_commitment_inertia_break") || active.has("initiative_budget_overflow")) return original;
 if (!active.has("gratuitous_external_hook") && !active.has("forced_scene_continuation_hook")) return original;
 const paragraphs = original.split(/(\n\s*\n)/);
 if (paragraphs.length < 3) return original;
 const last = paragraphs[paragraphs.length-1].trim();
 const teaser = /^(?:just then|little did (?:i|he|she|we) know|neither of us knew|what happened next|then (?:my|his|her|their|the) phone (?:buzzed|rang|lit up)|(?:my|his|her|their|the) phone (?:buzzed|rang|lit up|vibrated)|(?:someone|somebody) (?:knocked|appeared|walked in|came over)|(?:the|a) door (?:opened|swung open))\b/i.test(last);
 if (!teaser || /[“"]/u.test(last) || last.length > 180) return original;
 return paragraphs.slice(0,-2).join("").trim() || original;
}

