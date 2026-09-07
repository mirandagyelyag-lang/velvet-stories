const GENERIC_CLONE_PATTERNS = [
  /\bcareful\b[,.! ]{0,4}(?:you|that)/i,
  /\byou(?:'re| are) (?:trouble|impossible)\b/i,
  /\bthere it is\b/i,
  /\byou have no idea\b/i,
  /\bdon't tempt me\b/i,
  /\bwhat am i supposed to do with you\b/i,
  /\blook at you\b/i,
  /\byou know that, right\??/i,
];

function clean(value: unknown, limit = 360) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function profileText(character: Record<string, any> = {}) {
  return clean([
    character.speech_style,
    character.voice_vocabulary,
    character.humor_style,
    character.conflict_style,
    character.affection_style,
    character.verbal_tells,
    character.voice_avoidances,
    character.personality,
  ].filter(Boolean).join(" "), 2200).toLowerCase();
}

function dialogueText(reply = "") {
  const quotes = [...String(reply).matchAll(/["“]([^"”]{1,900})["”]/g)].map((m) => m[1].trim()).filter(Boolean);
  return quotes.length ? quotes.join(" ") : String(reply || "");
}

function wordCount(value = "") {
  return clean(value, 5000).split(/\s+/).filter(Boolean).length;
}

function questionCount(value = "") {
  return (dialogueText(value).match(/\?/g) || []).length;
}

function contractionRate(value = "") {
  const text = dialogueText(value);
  const words = Math.max(1, wordCount(text));
  const contractions = (text.match(/\b\w+'(?:t|re|ve|ll|d|m|s)\b/gi) || []).length;
  return contractions / words;
}

export function voiceFingerprintV34911(character: Record<string, any> = {}) {
  const p = profileText(character);
  const terse = /\b(?:terse|laconic|brief|few words|quiet|blunt|concise)\b/.test(p);
  const expansive = /\b(?:talkative|chatty|rambl|verbose|overshar|storyteller)\b/.test(p);
  const dry = /\b(?:dry|deadpan|understatement|wry)\b/.test(p);
  const sarcastic = /\b(?:sarcastic|teas|banter|snark)\b/.test(p);
  const direct = /\b(?:direct|blunt|straightforward|plainspoken)\b/.test(p);
  const evasive = /\b(?:avoid|deflect|guarded|private|withdraw|dodg)\b/.test(p);
  const formal = /\b(?:formal|precise|measured|polished|proper)\b/.test(p);
  const fragments = /\b(?:fragment|false start|unfinished|trails off|interrupt)\b/.test(p);
  const questionLow = /\b(?:rarely asks|few questions|does not ask|doesn't ask)\b/.test(p);
  const questionHigh = /\b(?:curious|inquisitive|asks questions)\b/.test(p);
  return {
    length: terse ? "compact" : expansive ? "expansive" : "mixed",
    humor: dry ? "dry" : sarcastic ? "teasing" : "situational",
    directness: direct ? "direct" : evasive ? "guarded" : "mixed",
    register: formal ? "measured" : "natural",
    fragments: fragments ? "native" : "optional",
    questions: questionLow ? "low" : questionHigh ? "high" : "medium",
    affection: clean(character.affection_style || "behavior-led / profile-grounded", 180),
    conflict: clean(character.conflict_style || "profile-grounded", 180),
    tells: clean(character.verbal_tells || "none required", 160),
    avoid: clean(character.voice_avoidances || "generic romance cadence; therapist language; interchangeable witty banter", 220),
  };
}

export function buildVoiceAuditDirectiveV34911({
  character = {},
  recentReplies = [],
  cast = [],
}: {
  character?: Record<string, any>;
  recentReplies?: string[];
  cast?: Record<string, any>[];
} = {}) {
  const fp = voiceFingerprintV34911(character);
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-5);
  const avg = recent.length ? Math.round(recent.reduce((sum, item) => sum + wordCount(dialogueText(item)), 0) / recent.length) : 0;
  const questions = recent.reduce((sum, item) => sum + questionCount(item), 0);
  const siblingNames = (Array.isArray(cast) ? cast : []).filter((x) => x?.id !== character?.id).map((x) => clean(x?.name, 50)).filter(Boolean).slice(0, 5);
  return [
    `VOICE AUDIT 2.0 — identity must survive name removal.`,
    `Fingerprint: length=${fp.length}; directness=${fp.directness}; humor=${fp.humor}; register=${fp.register}; fragments=${fp.fragments}; questions=${fp.questions}.`,
    `Conflict tactic: ${fp.conflict}. Affection tactic: ${fp.affection}.`,
    `Owned tells: ${fp.tells}. Hard avoid: ${fp.avoid}.`,
    `Recent calibration: avg spoken words=${avg || "unknown"}; question marks across recent replies=${questions}. Do not copy the last response shape.`,
    siblingNames.length ? `Cast collision watch: do not borrow the voice mechanics of ${siblingNames.join(", ")}.` : `Cast collision watch: do not fall back to Velvet's generic attractive/witty voice.`,
    `Clone test: if this reply could be reassigned to another character by changing only the name or one slang word, rewrite the response logic, sentence architecture, and social tactic before returning it.`,
  ].join("\n");
}

export function voiceAuditV34911Issues({
  reply = "",
  character = {},
  recentReplies = [],
}: {
  reply?: string;
  character?: Record<string, any>;
  recentReplies?: string[];
} = {}) {
  const issues: string[] = [];
  const text = String(reply || "").trim();
  if (!text) return issues;
  const fp = voiceFingerprintV34911(character);
  const spoken = dialogueText(text);
  const words = wordCount(spoken);
  const qs = questionCount(spoken);
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-5);
  const p = profileText(character);

  if (GENERIC_CLONE_PATTERNS.some((pattern) => pattern.test(spoken)) && !GENERIC_CLONE_PATTERNS.some((pattern) => pattern.test(clean(character.example_dialogue || "", 3000)))) {
    issues.push("voice_clone_generic_cadence_v34911");
  }
  if (fp.length === "compact" && words > 85) issues.push("voice_length_identity_drift_v34911");
  if (fp.questions === "low" && qs >= 2) issues.push("voice_question_identity_drift_v34911");
  if (fp.directness === "guarded" && /\b(?:i feel|i'm feeling|what i need emotionally|let me be vulnerable|here's what i'm afraid of)\b/i.test(spoken) && !/\b(?:open|emotionally fluent|direct about feelings)\b/.test(p)) {
    issues.push("voice_emotional_fluency_drift_v34911");
  }
  if (recent.length >= 2) {
    const openings = recent.map((item) => clean(dialogueText(item), 90).toLowerCase().split(/\s+/).slice(0, 4).join(" ")).filter(Boolean);
    const currentOpening = clean(spoken, 90).toLowerCase().split(/\s+/).slice(0, 4).join(" ");
    if (currentOpening && openings.filter((x) => x === currentOpening).length >= 1) issues.push("voice_opening_shape_repeat_v34911");
  }
  const recentContraction = recent.length ? recent.reduce((sum, item) => sum + contractionRate(item), 0) / recent.length : 0;
  const currentContraction = contractionRate(spoken);
  if (recent.length >= 3 && recentContraction > 0.035 && currentContraction === 0 && words > 25 && fp.register !== "measured") {
    issues.push("voice_register_drift_v34911");
  }
  return [...new Set(issues)];
}
