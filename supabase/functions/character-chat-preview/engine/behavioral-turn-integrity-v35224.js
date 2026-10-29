const norm = (value = "") => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[’‘`]/g, "'").replace(/[^a-z0-9'\s.!?]/g, " ")
  .replace(/\s+/g, " ").trim();

const list = (value) => Array.isArray(value) ? value : [];

// Keep complete quoted spans together so deleting a command cannot leave
// half a quotation or turn its remainder into unattributed narration.
function sentences(value = "") {
  const text = typeof value === "string" ? value : "";
  const parts = [];
  let start = 0, quote = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!quote && (c === '"' || c === '“')) quote = c === '“' ? '”' : '"';
    else if (quote && c === quote) quote = "";
    if (!quote && ((/[.!?]/.test(c) && /\s|$/.test(text[i + 1] || "")) || ((c === '"' || c === '”') && /[.!?]/.test(text[i - 1] || "") && /^\s+[A-Z]/.test(text.slice(i + 1))))) {
      parts.push(text.slice(start, i + 1).trim()); start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

const CARE_DIRECTIVE_PATTERNS = [
  /\b(?:get in|sit down|lie down|stay here|wait here|come on|wake up|stop moving|don't move|do not move|put your head back|lock the door|close your eyes|open your eyes|drink this|eat this|take this)\b/,
  /\b(?:don't|do not)\s+(?:fall asleep|argue|fight me|make me repeat myself|move|stand|walk|leave)\b/,
  /\byou(?:'re| are)\s+(?:getting|going)\s+(?:in|inside|to bed|to sleep)\b/,
  /\bno arguments?\b/,
];

function directiveCount(value = "") {
  let text = norm(value);
  const action = "(?:get in|sit down|lie down|stay here|wait here|close your eyes|open your eyes|drink this|eat this|take this)";
  text = text
    .replace(new RegExp("\\b(?:you can|you could|you may|would you like to|do you want to) " + action + "\\b", "g"), "")
    .replace(new RegExp("\\b" + action + " if you (?:want|wish|like)(?: to)?\\b", "g"), "")
    .replace(new RegExp("\\b(?:i|he|she|they) (?:said|asked|told me) to " + action + "\\b", "g"), "");
  // Count actual occurrences, not pattern categories. Overlapping patterns
  // such as "don't move" must still count as just one order.
  const spans = CARE_DIRECTIVE_PATTERNS.flatMap(pattern =>
    [...text.matchAll(new RegExp(pattern.source, "g"))].map(m => [m.index, m.index + m[0].length])
  ).sort((a, b) => a[0] - b[0]);
  let end = -1, count = 0;
  for (const [start, stop] of spans) {
    if (start >= end) count++;
    end = Math.max(end, stop);
  }
  return count;
}

function embodiedCareContext(latestUserMessage = "", recentUserMessages = []) {
  const text = norm([latestUserMessage, ...list(recentUserMessages).slice(-4)].join(" "));
  return /\b(?:sick|ill|tired|exhausted|dizzy|faint|fainting|sleepy|drowsy|hurt|pain|fever|nauseous|weak|worse|dying|pass out|passed out|close my eyes|closed my eyes)\b/.test(text);
}

function priorTransitAlreadyActive(recentCharacterReplies = []) {
  let active = false;
  for (const reply of list(recentCharacterReplies).slice(-4)) {
    for (const part of sentences(reply)) {
      const text = norm(part);
      if (/\b(?:driving|drove|eyes on the road|pulled onto|turned onto|merged onto|as (?:he|she|they) drove)\b/.test(text)) active = true;
      if (/\b(?:parked|switched off the engine|turned off the engine|cut the engine|got out of the car|stepped out of the car)\b/.test(text)) active = false;
    }
  }
  return active;
}

function restartsVehicleSequence(reply = "") {
  const text = norm(reply);
  if (/\b(?:didn't|did not|never)\s+(?:start|open|close|shut|turn)\b/.test(text)) return false;
  return /\bdriver'?s side\b.{0,80}\b(?:open|opened|clicked open)\b/.test(text)
    || /\b(?:slid|got|climbed) in\b.{0,80}\b(?:start(?:ed|ing)? the engine|engine)\b/.test(text)
    || /\b(?:start(?:ed|ing)?|turn(?:ed|ing) on) the engine\b/.test(text)
;
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
  if (!active.size) return typeof reply === "string" ? reply : "";
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

export const BEHAVIORAL_TURN_INTEGRITY_TESTS = { directiveCount, sentences, priorTransitAlreadyActive };
