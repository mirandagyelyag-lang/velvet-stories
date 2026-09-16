const SWEEP_KEY = "velvet_stability_v3241";
const RECOVERY_KEY = "velvet_stability_recovery_v3241";
const STOCK_BEATS = ["his jaw tightened", "her jaw tightened", "a low chuckle", "a low growl", "his gaze darkened", "her gaze darkened", "you drive me crazy", "you have no idea what you do to me", "you're playing with fire", "you’re playing with fire", "you're going to be the death of me", "you’re going to be the death of me", "he leaned closer", "she leaned closer", "the corner of his mouth", "the corner of her mouth"];
function text(value) {
  return String(value ?? "").trim();
}
function norm(value) {
  return text(value).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9áéíóúüñ'\s]/gi, " ").replace(/\s+/g, " ").trim();
}
function words(value) {
  return norm(value).split(/\s+/).filter(Boolean);
}
function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, Number(n) || 0));
}
export function capWorldList(items, max = 24) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  const active = rows.filter(x => !["done", "resolved", "expired", "discarded"].includes(norm(x?.status)));
  const closed = rows.filter(x => !active.includes(x)).slice(-Math.max(2, Math.floor(max / 4)));
  return [...closed, ...active].slice(-max);
}
export function sanitizeWorldState(state = {}) {
  const next = JSON.parse(JSON.stringify(state || {}));
  next.world ||= {};
  for (const key of ["inbox", "commitments", "secrets", "rumors", "objects", "places", "privateNotes", "photos", "canonLocks"]) {
    next.world[key] = capWorldList(next.world[key], key === "objects" || key === "places" ? 30 : 24);
  }
  next.world.objects = next.world.objects.filter(x => text(x?.name));
  next.world.places = next.world.places.filter(x => text(x?.name));
  next.world.secrets = next.world.secrets.filter(x => text(x?.subject || x?.text));
  next.world.rumors = next.world.rumors.filter(x => text(x?.text || x?.subject));
  next.world.canonLocks = next.world.canonLocks.filter(x => text(x?.text || x?.title));
  next.world.privateNotes = next.world.privateNotes.filter(x => text(x?.text || x?.title));
  next.scene ||= {};
  next.scene.outfit = text(next.scene.outfit).slice(0, 220);
  next.scene.goal = text(next.scene.goal).slice(0, 220);
  next.relationship ||= {};
  next.behavior ||= {};
  next.scene.intensity = clamp(next.scene.intensity ?? 50, 0, 100);
  for (const key of ["trust", "comfort", "tension", "resentment", "curiosity", "autonomy", "dialogueRatio"]) {
    next.relationship[key] = clamp(next.relationship[key] ?? 50, 0, 100);
  }
  next.behavior.maxReplyWords = clamp(next.behavior.maxReplyWords ?? 220, 80, 400);
  return next;
}
function splitKnownBy(value) {
  return norm(value).split(/[,;/|]+|\band\b|\by\b/).map(x => x.trim()).filter(Boolean);
}
export function characterCanKnowSecret(secret, characterName) {
  const who = norm(characterName);
  const known = splitKnownBy(secret?.knownBy);
  if (!who || known.length === 0) return false;
  if (known.some(x => ["everyone", "everybody", "public", "all", "todos", "todo el mundo"].includes(x))) return true;
  return known.some(x => x === who || who.includes(x) || x.includes(who));
}
export function secretsForCharacter(secrets, characterName) {
  return (Array.isArray(secrets) ? secrets : []).filter(item => item && !["done", "resolved", "expired"].includes(norm(item.status))).filter(item => characterCanKnowSecret(item, characterName));
}
function factPolarity(value) {
  const n = norm(value);
  const negative = /\b(no|not|never|isn't|isnt|wasn't|wasnt|doesn't|doesnt|didn't|didnt|hasn't|hasnt|without|nunca|jamás|no tiene|no es|no fue)\b/.test(n);
  const stripped = n.replace(/\b(no|not|never|isn't|isnt|wasn't|wasnt|doesn't|doesnt|didn't|didnt|hasn't|hasnt|without|nunca|jamás)\b/g, "").replace(/\s+/g, " ").trim();
  return {
    negative,
    stripped
  };
}
export function detectCanonConflicts(canonLocks = [], candidates = []) {
  const canon = (Array.isArray(canonLocks) ? canonLocks : []).map(x => text(x?.text || x?.title || x)).filter(Boolean);
  const rows = (Array.isArray(candidates) ? candidates : []).map(x => text(x?.text || x?.subject || x?.title || x)).filter(Boolean);
  const conflicts = [];
  for (const locked of canon) {
    const a = factPolarity(locked);
    if (!a.stripped || a.stripped.length < 8) continue;
    for (const candidate of rows) {
      const b = factPolarity(candidate);
      const overlap = words(a.stripped).filter(w => words(b.stripped).includes(w) && w.length > 3).length;
      if (a.negative !== b.negative && overlap >= 2) conflicts.push({
        canon: locked,
        candidate
      });
    }
  }
  return conflicts.slice(0, 8);
}
export function detectPOVViolations(reply = "") {
  const s = text(reply);
  const patterns = [/\byou (?:felt|feel|thought|think|wanted|want|decided|decide|realized|realise|knew|know|remembered|remember|hoped|hope|wished|wish)\b/gi, /\byour (?:heart|stomach|chest|mind) (?:tightened|dropped|raced|fluttered|ached|sank)\b/gi, /\byou (?:smiled|laughed|nodded|shrugged|walked|stepped|turned|looked away|blushed|sighed)\b/gi];
  const hits = [];
  for (const re of patterns) for (const m of s.matchAll(re)) hits.push(m[0]);
  return [...new Set(hits)].slice(0, 12);
}
export function analyzeRepetition(messages = []) {
  const replies = (Array.isArray(messages) ? messages : []).filter(m => m?.sender === "character" && !m?.isStreaming && text(m?.content)).slice(-12).map(m => text(m.content));
  const openingMap = new Map();
  const beatMap = new Map();
  const cliches = new Set();
  const pov = [];
  for (const reply of replies) {
    const opening = words(reply).slice(0, 5).join(" ");
    if (opening) openingMap.set(opening, (openingMap.get(opening) || 0) + 1);
    const lower = norm(reply);
    for (const phrase of STOCK_BEATS) if (lower.includes(norm(phrase))) cliches.add(phrase);
    for (let i = 0; i < words(reply).length - 3; i++) {
      const beat = words(reply).slice(i, i + 4).join(" ");
      if (beat.length >= 18) beatMap.set(beat, (beatMap.get(beat) || 0) + 1);
    }
    pov.push(...detectPOVViolations(reply));
  }
  const repeatedOpenings = [...openingMap.entries()].filter(([, c]) => c > 1).map(([text, count]) => ({
    text,
    count
  })).slice(0, 5);
  const repeatedBeats = [...beatMap.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([text, count]) => ({
    text,
    count
  }));
  const avgWords = replies.length ? Math.round(replies.reduce((n, r) => n + words(r).length, 0) / replies.length) : 0;
  return {
    replies: replies.length,
    avgWords,
    repeatedOpenings,
    repeatedBeats,
    cliches: [...cliches],
    povViolations: [...new Set(pov)].slice(0, 8)
  };
}
export function buildRepetitionAvoidanceHint(messages = []) {
  const a = analyzeRepetition(messages);
  const avoid = [...a.repeatedOpenings.map(x => `opening “${x.text}”`), ...a.cliches.map(x => `phrase “${x}”`), ...a.repeatedBeats.slice(0, 3).map(x => `beat “${x.text}”`)].slice(0, 6);
  if (!avoid.length) return "";
  return `Recent repetition radar: avoid reusing ${avoid.join("; ")}.`;
}
export function compactForPrompt(value, max = 140) {
  const s = text(value).replace(/\s+/g, " ");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
export function captureRecoverySnapshot({
  conversationId,
  characterId,
  draft = "",
  replyTo = null,
  directorNote = ""
} = {}) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${RECOVERY_KEY}_${conversationId || characterId || "unknown"}`, JSON.stringify({
      conversationId,
      characterId,
      draft,
      replyTo,
      directorNote,
      at: Date.now()
    }));
  } catch {}
}
export function clearRecoverySnapshot(conversationId, characterId) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(`${RECOVERY_KEY}_${conversationId || characterId || "unknown"}`);
  } catch {}
}
export function readRecoverySnapshot(conversationId, characterId, maxAgeMs = 24 * 60 * 60 * 1000) {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(`${RECOVERY_KEY}_${conversationId || characterId || "unknown"}`) || "null");
    if (!raw || Date.now() - Number(raw.at || 0) > maxAgeMs) return null;
    return raw;
  } catch {
    return null;
  }
}
export function writeStabilityEvent(type, detail = {}) {
  if (typeof localStorage === "undefined") return;
  try {
    const current = JSON.parse(localStorage.getItem(SWEEP_KEY) || "[]");
    const next = [...(Array.isArray(current) ? current : []), {
      type,
      detail,
      at: Date.now()
    }].slice(-80);
    localStorage.setItem(SWEEP_KEY, JSON.stringify(next));
  } catch {}
}
export function readStabilityEvents() {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SWEEP_KEY) || "[]");
  } catch {
    return [];
  }
}
