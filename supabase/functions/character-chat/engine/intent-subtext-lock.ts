// Velvet v3.35.4 · Character Intent + Subtext Lock
// Deterministic guards for scene-purpose persistence, filler restraint, POV consistency,
// gesture economy and the "serious answer -> compulsory quip" habit.

function normalized(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripQuotedDialogue(value = "") {
  return String(value || "")
    .replace(/[“\"][^”\"]*[”\"]/gs, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dialogueOnly(value = "") {
  const matches = [...String(value || "").matchAll(/[“\"]([^”\"]+)[”\"]/g)];
  return matches.map((match) => String(match[1] || "").trim()).filter(Boolean);
}

function wordCount(value = "") {
  return normalized(value).split(/\s+/).filter(Boolean).length;
}

function evidenceText(recentUserMessages = [], recentCharacterReplies = [], groundedAnchors = [], character = {}) {
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

function narrationMode(value = "", characterName = "") {
  const narration = stripQuotedDialogue(value);
  if (!narration) return "unknown";
  const lower = normalized(narration);
  const firstPatterns = [
    /\bi (?:look|looked|glance|glanced|stare|stared|turn|turned|shift|shifted|lean|leaned|sit|sat|stand|stood|walk|walked|move|moved|push|pushed|pull|pulled|take|took|grab|grabbed|tap|tapped|nod|nodded|shake|shook|smile|smiled|laugh|laughed|say|said|ask|asked|mutter|muttered|let|keep|kept|give|gave)\b/,
    /\bmy (?:hand|hands|eyes|gaze|shoulder|shoulders|voice|fingers|thumb|head|chair|cup|menu|phone)\b/,
  ];
  const thirdPatterns = [
    /\b(?:he|she) (?:look|looked|glance|glanced|stare|stared|turn|turned|shift|shifted|lean|leaned|sit|sat|stand|stood|walk|walked|move|moved|push|pushed|pull|pulled|take|took|grab|grabbed|tap|tapped|nod|nodded|shake|shook|smile|smiled|laugh|laughed|say|said|ask|asked|mutter|muttered|let|kept|gave)\b/,
    /\b(?:his|her) (?:hand|hands|eyes|gaze|shoulder|shoulders|voice|fingers|thumb|head|chair|cup|menu|phone)\b/,
  ];
  const name = String(characterName || "").trim();
  let first = firstPatterns.reduce((count, pattern) => count + (pattern.test(lower) ? 1 : 0), 0);
  let third = thirdPatterns.reduce((count, pattern) => count + (pattern.test(lower) ? 1 : 0), 0);
  if (name) {
    try {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\s+(?:didn'?t|did not|looked|turned|leaned|sat|stood|walked|moved|pushed|pulled|took|grabbed|nodded|smiled|laughed|said|asked|muttered)\\b`, "i").test(narration)) third += 2;
    } catch (_) {}
  }
  if (first && third) return "mixed";
  if (first) return "first";
  if (third) return "third";
  return "unknown";
}

export function inferNarrationPovMode(recentCharacterReplies = [], characterName = "") {
  const recent = (Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).filter(Boolean).slice(-6);
  const modes = recent.map((reply) => narrationMode(reply, characterName)).filter((mode) => mode !== "unknown");
  const first = modes.filter((mode) => mode === "first").length;
  const third = modes.filter((mode) => mode === "third").length;
  const mixed = modes.filter((mode) => mode === "mixed").length;
  if (mixed) return "mixed";
  if (first >= 2 && third === 0) return "first";
  if (third >= 2 && first === 0) return "third";
  if (modes.length && first > third) return "first";
  if (modes.length && third > first) return "third";
  return "unknown";
}

export function hasNarrationPovFlip(reply = "", recentCharacterReplies = [], characterName = "", expectedMode = "") {
  const current = narrationMode(reply, characterName);
  const expected = ["first", "third"].includes(String(expectedMode)) ? String(expectedMode) : inferNarrationPovMode(recentCharacterReplies, characterName);
  if (current === "mixed") return true;
  if (!["first", "third"].includes(current) || !["first", "third"].includes(expected)) return false;
  return current !== expected;
}

export function hasRandomActivityFiller(reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], character = {}, groundedAnchors = []) {
  const text = normalized(reply);
  if (!text) return false;
  const evidence = evidenceText(recentUserMessages, recentCharacterReplies, groundedAnchors, character);
  const latest = normalized(latestUserMessage);
  const latestIsSmallBeat = wordCount(latestUserMessage) <= 12 || /^(?:hmm+|hm+|right|okay|ok|sure|yeah|yep|fine|whatever|mhm|uh huh|i see)[.! ]*$/.test(latest);
  if (!latestIsSmallBeat) return false;

  const candidates = [
    { key: "waiter", pattern: /\b(?:waiter|server|student waiter|waitress)\b.{0,90}\b(?:drop|dropped|drops|clatter|clattered|spill|spilled|tray|glassware|plates?)\b/ },
    { key: "tray", pattern: /\b(?:tray|glassware|glasses|plates?)\b.{0,70}\b(?:drop|dropped|drops|clatter|clattered|crash|crashed|shatter|shattered)\b/ },
    { key: "couple", pattern: /\b(?:a|the) couple (?:at|from|on) (?:the )?(?:next|nearby) table\b/ },
    { key: "stranger", pattern: /\b(?:a|some) (?:guy|girl|student|stranger|employee)\b.{0,70}\b(?:walked over|came over|approached|called out|interrupted)\b/ },
    { key: "ambient interruption", pattern: /\b(?:someone|somebody)\b.{0,55}\b(?:dropped|knocked|called out|walked over|came over|interrupted)\b/ },
  ];
  for (const candidate of candidates) {
    if (!candidate.pattern.test(text)) continue;
    const supportTokens = candidate.key === "waiter" ? ["waiter", "server", "waitress"]
      : candidate.key === "tray" ? ["tray", "glassware", "glasses", "plates"]
      : candidate.key === "couple" ? ["couple", "next table", "nearby table"]
      : candidate.key === "stranger" ? ["guy", "girl", "student", "stranger", "employee"]
      : ["someone", "somebody", "interrupted"];
    const supported = supportTokens.some((token) => evidence.includes(token));
    const userIntroduced = supportTokens.some((token) => latest.includes(token));
    if (!supported && !userIntroduced) return true;
  }
  return false;
}

export function hasFakeSharedDayHistory(reply = "", recentUserMessages = [], recentCharacterReplies = [], groundedAnchors = []) {
  const text = normalized(reply);
  if (!text) return false;
  const claims = [
    /\bwith the luck we(?:'ve| have) been having today\b/,
    /\bwith our luck today\b/,
    /\bafter the day we(?:'ve| have) had\b/,
    /\bthe way today(?:'s| has) been going for us\b/,
    /\beverything that(?:'s| has) happened to us today\b/,
    /\bafter everything today\b/,
    /\bjust like the rest of our day\b/,
    /\bpar for the course today\b/,
  ];
  if (!claims.some((pattern) => pattern.test(text))) return false;
  const evidence = normalized([...(recentUserMessages || []), ...(recentCharacterReplies || []), ...(groundedAnchors || [])].join(" "));
  const actualDayTrouble = /\b(?:bad day|rough day|awful day|terrible day|everything went wrong|bad luck|rough morning|rough afternoon|rough night|one thing after another)\b/.test(evidence);
  return !actualDayTrouble;
}

export function hasGestureBudgetOverflow(reply = "", latestUserMessage = "") {
  if (wordCount(latestUserMessage) > 18) return false;
  const narration = normalized(stripQuotedDialogue(reply));
  if (!narration) return false;
  const lowSignalGestures = [
    /\blet out (?:a|one) (?:short |slow |quiet )?breath\b/g,
    /\b(?:tension|tightness) in (?:my|his|her) shoulders?\b/g,
    /\bshoulders? (?:relax|relaxed|droop|dropped)\b/g,
    /\b(?:i|he|she) look(?:ed)? at (?:you|her|him|them)\b/g,
    /\b(?:i|he|she) push(?:ed)? (?:the|my|his|her) \w+ (?:away|aside|across)\b/g,
    /\blean(?:ed|ing)? back\b/g,
    /\b(?:i|he|she) shook (?:my|his|her) head\b/g,
    /\b(?:small|faint|tiny|slight|genuine) smile\b/g,
    /\bsmile (?:finally )?(?:reached|touching) (?:my|his|her) eyes\b/g,
    /\bfingers? (?:curl(?:ed|ing)?|tighten(?:ed|ing)?)\b/g,
    /\bshift(?:ed|ing)? (?:my|his|her) weight\b/g,
    /\beyes? (?:drift(?:ed|ing)?|flick(?:ed|ing)?|slid|moved)\b/g,
    /\b(?:gave|give|offered) (?:a|one) (?:short |small |faint |tired )?(?:nod|shrug|smile)\b/g,
    /\b(?:tap(?:ped|ping)?|nudge(?:d|ing)?) (?:the|my|his|her)\b/g,
  ];
  let count = 0;
  for (const pattern of lowSignalGestures) count += (narration.match(pattern) || []).length;
  const dialogueWords = wordCount(dialogueOnly(reply).join(" "));
  return count >= 4 || (count >= 3 && dialogueWords <= 35);
}

export function hasObligatoryBanterExit(reply = "", latestUserMessage = "") {
  const latest = normalized(latestUserMessage);
  const seriousQuestion = /\b(?:why (?:are|were) you (?:so )?(?:mad|angry|annoyed|upset)|are you (?:mad|angry|annoyed|upset)|what(?:'s| is) wrong|why did you (?:call|invite|ask|bring|want) me|what do you want|why are you acting|why did you do that)\b/.test(latest);
  if (!seriousQuestion) return false;
  const lines = dialogueOnly(reply);
  if (lines.length < 2) return false;
  const last = normalized(lines.at(-1) || "");
  const quipTail = /\b(?:you(?:'re| are) still paying|you still owe me|you owe me|your fault|that(?:'s| is) on you|try not to|don'?t make me|huh\??$|deal with it|you asked for it|not my problem)\b/.test(last);
  return quipTail;
}

export function hasIntentThreadAbandonment(reply = "", latestUserMessage = "", intent = {}) {
  const active = normalized(intent?.subtextThread || intent?.sceneObjective || intent?.activeIntent || "");
  if (!active || active === "none") return false;
  const latest = normalized(latestUserMessage);
  const pressure = /^(?:(?:hmm+|hm+)(?:,? (?:right|okay|ok|sure|yeah|mhm|i see))?|right|okay|ok|sure|yeah|mhm|i see)[,.! ]*$/.test(latest)
    || /\b(?:why did you (?:call|invite|ask|bring|want) me|are you sure|really|that(?:'s| is) it|is that why)\b/.test(latest);
  if (!pressure) return false;
  const replyText = normalized(reply);
  const unrelatedFiller = /\b(?:waiter|server|tray|glassware|phone buzzed|door opened|someone walked over|somebody walked over|couple at the next table)\b/.test(replyText);
  const noDialogue = dialogueOnly(reply).length === 0;
  return unrelatedFiller || noDialogue;
}

export function intentSubtextIssues({
  reply = "",
  latestUserMessage = "",
  recentUserMessages = [],
  recentCharacterReplies = [],
  character = {},
  groundedAnchors = [],
  intent = {},
} = {}) {
  const issues = [];
  if (hasNarrationPovFlip(reply, recentCharacterReplies, character?.name || "", intent?.povMode || "")) issues.push("narration_pov_flip");
  if (hasRandomActivityFiller(reply, latestUserMessage, recentUserMessages, recentCharacterReplies, character, groundedAnchors)) issues.push("random_activity_filler");
  if (hasFakeSharedDayHistory(reply, recentUserMessages, recentCharacterReplies, groundedAnchors)) issues.push("fake_shared_day_history");
  if (hasGestureBudgetOverflow(reply, latestUserMessage)) issues.push("gesture_budget_overflow");
  if (hasObligatoryBanterExit(reply, latestUserMessage)) issues.push("obligatory_banter_exit");
  if (hasIntentThreadAbandonment(reply, latestUserMessage, intent)) issues.push("intent_thread_abandoned");
  return [...new Set(issues)];
}

function splitPieces(value = "") {
  return String(value || "")
    .split(/(?<=[.!?][”\"]?)\s+|\n{2,}/)
    .map((piece) => piece.trim())
    .filter(Boolean);
}

export function sanitizeIntentSubtextReply(reply = "", issues = []) {
  const active = new Set(Array.isArray(issues) ? issues : []);
  let text = String(reply || "").trim();
  if (!text) return text;

  if (active.has("narration_pov_flip")) {
    const dialogue = dialogueOnly(text);
    if (dialogue.length) text = dialogue.map((line) => `"${line}"`).join(" ");
  }

  let pieces = splitPieces(text);
  if (active.has("random_activity_filler")) {
    pieces = pieces.filter((piece) => !/\b(?:waiter|server|student waiter|waitress|tray|glassware|couple at (?:the )?(?:next|nearby) table|someone .*?(?:walked over|came over|interrupted)|somebody .*?(?:walked over|came over|interrupted))\b/i.test(piece));
  }
  if (active.has("fake_shared_day_history")) {
    pieces = pieces.map((piece) => piece
      .replace(/\bwith the luck we(?:'ve| have) been having today\b/ig, "")
      .replace(/\bwith our luck today\b/ig, "")
      .replace(/\bafter the day we(?:'ve| have) had\b/ig, "")
      .replace(/\bthe way today(?:'s| has) been going for us\b/ig, "")
      .replace(/\beverything that(?:'s| has) happened to us today\b/ig, "")
      .replace(/\bafter everything today\b/ig, "")
      .replace(/\bjust like the rest of our day\b/ig, "")
      .replace(/\bpar for the course today\b/ig, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.!?])/g, "$1")
      .trim()
    ).filter(Boolean);
  }
  if (active.has("obligatory_banter_exit") && pieces.length > 1) {
    const last = pieces.at(-1) || "";
    if (/\b(?:you(?:'re| are) still paying|you still owe me|you owe me|your fault|that(?:'s| is) on you|try not to|don'?t make me|deal with it|you asked for it|not my problem)\b/i.test(last)) pieces.pop();
  }
  if (active.has("gesture_budget_overflow")) {
    const dialoguePieces = pieces.filter((piece) => /[“\"][^”\"]+[”\"]/.test(piece));
    const narrationPieces = pieces.filter((piece) => !/[“\"][^”\"]+[”\"]/.test(piece));
    pieces = [...narrationPieces.slice(0, 1), ...dialoguePieces.slice(0, 3)];
  }

  return pieces.join(" ").replace(/\s+/g, " ").trim();
}
