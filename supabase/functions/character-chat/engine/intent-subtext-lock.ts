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


function obviousRhetoricalContradiction(value = "") {
  const raw = String(value || "").trim();
  const m = raw.match(/^\s*(?:yeah|yea|yep|sure|right|okay|ok)[,\s]+(?:and\s+)?(?:my\s+name\s+is|i(?:'m| am))\s+([A-Za-z][A-Za-z0-9_-]{1,30})[.!?\s]*$/i);
  if (!m) return null;
  return { payload: normalized(m[1] || "") };
}

export function hasPragmaticSarcasmMiss(reply = "", latestUserMessage = "", recentCharacterReplies = []) {
  const cue = obviousRhetoricalContradiction(latestUserMessage);
  if (!cue) return false;
  const text = normalized(reply);
  const dialogue = normalized(dialogueOnly(reply).join(" ")) || text;
  if (!dialogue) return true;

  // The payload in "yeah, and I'm X" is a vehicle for disbelief, not a new topic.
  // Repeating/explaining/expanding X means the model followed words instead of the speech act.
  if (cue.payload && new RegExp(`\\b${cue.payload.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i").test(dialogue)) return true;
  if (/^(?:okay|ok|right|sure|yeah|yep|mhm|uh huh)[.! ]*$/.test(dialogue)) return true;

  // Do not answer an ironic contradiction by inventing a fresh analogy/comparison target
  // or by extending the semantic field of the payload. v3.49.21 treats this as a
  // comprehension failure, not merely a style preference.
  if (/\b(?:choir boy|pope|saint peter|walk on water|heaven|holy|holier|miracle|miracles|disciple|apostle|canonized|canonised|divine|divinity|deity|deities|religion|religious|scripture|gospel|prayer|pray|blessed|blessing|worship|church|chapel|halo|angel|heavenly|salvation|savior|saviour)\b/.test(dialogue)) return true;

  // A tiny sarcastic cue should not trigger a polished comedy monologue. One compact
  // reaction is enough; two+ dialogue sentences or a long bit means the model is
  // performing around the cue instead of answering the social move.
  const spoken = dialogueOnly(reply);
  const spokenWords = wordCount(spoken.join(" "));
  if (spoken.length > 1 || spokenWords > 18) return true;
  return false;
}

export function pragmaticSarcasmFallback(character = {}, recentCharacterReplies = []) {
  const profile = normalized([character?.personality, character?.description, character?.background, character?.notes, character?.scenario, character?.relationship].filter(Boolean).join(" "));
  const recent = normalized((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).slice(-2).join(" "));
  // Deliberately no narration: the fallback must never manufacture a user gesture,
  // and it must not need a stage direction to communicate the character's reaction.
  if (/\b(?:cocky|smug|arrogant|confident|shameless|heartthrob|playboy)\b/.test(profile)) return '"Cute. Still doesn\'t make me wrong."';
  if (/\b(?:sarcastic|dry|snark|teas|banter)\b/.test(profile)) return '"Very funny. You know what I meant."';
  if (/\b(?:blunt|direct|stoic|reserved|guarded|cold)\b/.test(profile)) return '"You know what I meant."';
  if (/\b(?:playful|warm|easygoing|charming)\b/.test(profile)) return '"Okay, that was good. My point stands."';
  if (/\b(?:saint|practically a saint)\b/.test(recent)) return '"Very funny. I stand by it."';
  return '"Fair. Still not taking it back."';
}


function directCausalQuestion(value = "") {
  const text = normalized(value);
  if (!text || !/\?*$/.test(String(value || "").trim())) {
    // Roleplay users often omit the question mark; wording is authoritative.
  }
  return /\bwhy (?:did|do|are|were|would|will|have|had|didn'?t|don'?t|aren'?t|weren'?t)\b/.test(text)
    || /\bwhat (?:made|makes) you\b/.test(text)
    || /\bwhat did you mean\b/.test(text);
}

function causalApproachQuestion(value = "") {
  const text = normalized(value);
  return /\bwhy (?:did|do) you (?:come|came|come up|came up|walk over|walked over|approach|approached|talk to|speak to|call|text|message|invite|ask|follow|show up|stop by)(?:\s+(?:to|over to|up to))?\s*(?:me)?\b/.test(text)
    || /\bwhat (?:made|makes) you (?:come|come over|walk over|approach|talk to|call|text|message)\b/.test(text);
}

function distinctiveWords(value = "") {
  const stop = new Set(["something","everything","anything","nothing","because","actually","apparently","probably","seriously","literally","everyone","someone","another","without","through","really","already","around","before","should","would","could","there","their","about","where","which","while"]);
  return new Set((normalized(value).match(/[a-z][a-z'-]{9,}/g) || []).filter((word) => !stop.has(word)));
}

export function hasDirectCausalAnswerMiss(reply = "", latestUserMessage = "", recentCharacterReplies = []) {
  if (!directCausalQuestion(latestUserMessage)) return false;
  const dialogue = normalized(dialogueOnly(reply).join(" ")) || normalized(reply);
  if (!dialogue) return true;
  // A direct why/what-made-you question cannot be answered with an acknowledgement.
  if (/^(?:okay|ok|right|sure|yeah|yep|mhm|uh huh|whatever|fine)[.! ]*$/.test(dialogue)) return true;

  // When the user asks why the character just approached/contacted them, resurrecting
  // an old distinctive joke-word is lexical autocomplete, not causal memory.
  if (causalApproachQuestion(latestUserMessage)) {
    const recent = Array.isArray(recentCharacterReplies) ? recentCharacterReplies : [];
    const old = recent.slice(-4, -1).join(" ");
    const stale = distinctiveWords(old);
    const latest = normalized(latestUserMessage);
    for (const word of stale) {
      if (dialogue.includes(word) && !latest.includes(word)) return true;
    }
  }
  return false;
}


export function hasPersonalityPerformanceOverride(reply = "", latestUserMessage = "") {
  if (!directCausalQuestion(latestUserMessage)) return false;
  const spoken = dialogueOnly(reply).join(" ").trim();
  const text = normalized(spoken || reply);
  if (!text) return true;

  // Human Conversation Director: on a direct causal question, attitude may color the
  // answer but cannot replace it. Reject screenplay-like pretexts, self-branding,
  // and ornamental mini-monologues that manufacture a clever line instead of giving
  // a socially plausible reason tied to the prior interaction.
  const words = text.split(/\s+/).filter(Boolean);
  const groundedMotive = /\b(?:because|wanted|want|curious|wondered|saw|seen|noticed|heard|thought|figured|came over to|talk to you|speak to you|ask you|tell you|see you|check on you|make sure you(?: were| are| re)? (?:okay|alright|fine)|reason|your friend|that (?:guy|girl|person)|him|her|them)\b/.test(text);
  const referentialEvasion = /\b(?:do i need a reason|can t i (?:come|talk|speak)|maybe i (?:wanted|felt like)|i just (?:did|wanted|felt like)|does it matter)\b/.test(text);
  const performanceFrame = /\b(?:someone had to|somebody had to|keep things interesting|maintain standards|for the scenery|checking for (?!you\b)|check(?:ing)? for (?:survivors?|a pulse|pulse|signs? of life)|public service|community service|quality control|damage control|entertainment value|moral support)\b/.test(text);
  const polishedPitch = words.length > 24 && /\b(?:someone|everyone|interesting|standards|obviously|apparently|busy being|while you(?: re| are))\b/.test(text);
  if (performanceFrame || polishedPitch) return true;
  if (causalApproachQuestion(latestUserMessage) && !groundedMotive && !referentialEvasion) return true;
  return false;
}

export function hasHumanMindDialogueArtifice(reply: string, latestUserMessage = ""): boolean {
  const text = normalized(reply);
  const latest = normalized(latestUserMessage);
  if (!text) return false;
  const spoken = dialogueOnly(reply).join(" ").trim() || text;
  const userNameHits = (spoken.match(/\bantonia\b/g) || []).length;
  const therapy = /\b(?:your feelings are valid|hold space|safe space|process (?:this|that|your feelings)|communicate your needs|set boundaries|emotional bandwidth)\b/.test(spoken);
  const quoteCard = /\b(?:you really are something|careful what you wish for|you have no idea what you do to me|you're playing with fire|don't tempt me|someone has to keep you on your toes|where's the fun in that)\b/.test(spoken);
  const trailer = /\b(?:this isn't over|you haven't seen anything yet|we're just getting started|game on)\b/.test(spoken);
  const forcedHook = /(?:,|\.)?\s*(?:or are you|aren't you|wouldn't you agree|don't you think)\??$/.test(spoken) && !/[?]\s*$/.test(latest);
  const tooManyNames = userNameHits >= 2 || (userNameHits >= 1 && spoken.split(/\s+/).length <= 14 && !/\bantonia\b/.test(latest));
  return therapy || quoteCard || trailer || forcedHook || tooManyNames;
}


export function hasDeadAcknowledgementAfterNonverbalCue(reply = "", latestUserMessage = "") {
  const latest = String(latestUserMessage || "").trim();
  // A user-authored action beat such as *i sigh* is observable input, not an empty turn.
  // A bare acknowledgement contributes no character reaction, no thread continuity and,
  // on regeneration, easily collapses every candidate into the same "Okay." dead end.
  const actionOnly = /^\s*\*[^*]+\*\s*[.!?]*\s*$/.test(latest);
  if (!actionOnly) return false;
  const dialogue = normalized(dialogueOnly(reply).join(" ")) || normalized(reply);
  return /^(?:okay|ok|right|sure|yeah|yep|mhm|uh huh|fine)[.! ]*$/.test(dialogue);
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
  if (hasPragmaticSarcasmMiss(reply, latestUserMessage, recentCharacterReplies)) issues.push("pragmatic_sarcasm_miss");
  if (hasDirectCausalAnswerMiss(reply, latestUserMessage, recentCharacterReplies)) issues.push("direct_causal_answer_miss");
  if (hasPersonalityPerformanceOverride(reply, latestUserMessage)) issues.push("personality_performance_override");
  if (hasHumanMindDialogueArtifice(reply, latestUserMessage)) issues.push("human_mind_dialogue_artifice");
  if (hasDeadAcknowledgementAfterNonverbalCue(reply, latestUserMessage)) issues.push("dead_ack_after_nonverbal_cue");
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
