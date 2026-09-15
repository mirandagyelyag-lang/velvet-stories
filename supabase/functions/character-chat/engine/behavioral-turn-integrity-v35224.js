const norm = (value = "") => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[’‘`]/g, "'").replace(/[^a-z0-9'\s.!?]/g, " ")
  .replace(/\s+/g, " ").trim();

const list = (value) => Array.isArray(value) ? value : [];

function sentences(value = "") {
  return String(value || "")
    .split(/(?<=[.!?][\"”']?)\s+|\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const CARE_DIRECTIVE_PATTERNS = [
  /\b(?:get in|sit down|lie down|stay here|wait here|come on|wake up|stop moving|don't move|do not move|put your head back|lock the door|close your eyes|open your eyes|drink this|eat this|take this)\b/,
  /\b(?:don't|do not)\s+(?:fall asleep|argue|fight me|make me repeat myself|move|stand|walk|leave)\b/,
  /\byou(?:'re| are)\s+(?:getting|going)\s+(?:in|inside|to bed|to sleep)\b/,
  /\bno arguments?\b/,
];

function directiveCount(value = "") {
  let text = norm(value);
  // Permission/choice language is not an order even when it contains an
  // imperative-shaped phrase. Preserve gentle autonomy-preserving care.
  text = text
    .replace(/\b(?:close your eyes|lie down|sit down|stay here|wait here) if you want\b/g, "")
    .replace(/\byou can (?:close your eyes|lie down|sit down|stay here|wait here) if you want\b/g, "");
  return CARE_DIRECTIVE_PATTERNS.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function embodiedCareContext(latestUserMessage = "", recentUserMessages = []) {
  const text = norm([latestUserMessage, ...list(recentUserMessages).slice(-4)].join(" "));
  return /\b(?:sick|ill|tired|exhausted|dizzy|faint|fainting|sleepy|drowsy|hurt|pain|fever|nauseous|weak|worse|dying|pass out|passed out|close my eyes|closed my eyes)\b/.test(text);
}

function priorTransitAlreadyActive(recentCharacterReplies = []) {
  const text = norm(list(recentCharacterReplies).slice(-4).join(" "));
  return /\b(?:navigat(?:e|ed|ing)|drov(?:e|ing)|driving|kept (?:his|her|their) eyes on the road|eyes on the road|pulled onto|turned onto|merged onto|as (?:he|she|they) drove|behind the wheel)\b/.test(text);
}

function restartsVehicleSequence(reply = "") {
  const text = norm(reply);
  return /\bdriver'?s side\b.{0,80}\b(?:open|opened|clicked open)\b/.test(text)
    || /\b(?:slid|got|climbed) in\b.{0,80}\b(?:start(?:ed|ing)? the engine|engine)\b/.test(text)
    || /\b(?:start(?:ed|ing)?|turn(?:ed|ing) on) the engine\b/.test(text)
    || /\b(?:shut|shutting|closed|closing) the (?:passenger )?door\b/.test(text);
}

function repeatedDirectiveLoop(reply = "", recentCharacterReplies = [], latestUserMessage = "", recentUserMessages = []) {
  if (!embodiedCareContext(latestUserMessage, recentUserMessages)) return false;
  const current = directiveCount(reply);
  if (!current) return false;
  const recent = list(recentCharacterReplies).slice(-5).reduce((sum, item) => sum + directiveCount(item), 0);
  return current >= 2 || recent >= 2;
}

function excessiveCommandDensity(reply = "") {
  const parts = sentences(reply);
  if (parts.length < 2) return false;
  const commanded = parts.filter((part) => directiveCount(part) > 0).length;
  return commanded >= 2 && commanded / parts.length >= 0.5;
}

export function behavioralTurnIntegrityIssues({
  reply = "",
  latestUserMessage = "",
  recentUserMessages = [],
  recentCharacterReplies = [],
} = {}) {
  const issues = [];
  if (repeatedDirectiveLoop(reply, recentCharacterReplies, latestUserMessage, recentUserMessages)) {
    issues.push("care_command_loop");
  }
  if (embodiedCareContext(latestUserMessage, recentUserMessages) && excessiveCommandDensity(reply)) {
    issues.push("care_command_density");
  }
  if (priorTransitAlreadyActive(recentCharacterReplies) && restartsVehicleSequence(reply)) {
    issues.push("transit_state_rewind_after_departure");
  }
  return [...new Set(issues)];
}

export function sanitizeBehavioralTurnIntegrity(reply = "", issues = [], { recentCharacterReplies = [] } = {}) {
  const active = new Set(list(issues));
  let parts = sentences(reply);

  if (active.has("transit_state_rewind_after_departure") && priorTransitAlreadyActive(recentCharacterReplies)) {
    parts = parts.filter((part) => !restartsVehicleSequence(part));
  }

  if (active.has("care_command_loop")) {
    // Once the recent scene already contains repeated care orders, adding yet
    // another imperative is the bug. Strip directive-heavy sentences entirely
    // and let the repair pipeline preserve non-command action/dialogue.
    parts = parts.filter((part) => !directiveCount(part));
  } else if (active.has("care_command_density")) {
    let keptDirective = false;
    parts = parts.filter((part) => {
      if (!directiveCount(part)) return true;
      if (keptDirective) return false;
      keptDirective = true;
      return true;
    });
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}
