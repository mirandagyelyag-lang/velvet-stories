import { buildRepetitionAvoidanceHint, compactForPrompt, sanitizeWorldState, secretsForCharacter } from "./stabilitySweep";
const STORE_PREFIX = "velvet_living_world_v3240_";
const CRASH_PREFIX = "velvet_living_world_crashes_";

export const DEFAULT_LIVING_WORLD = Object.freeze({
  routine: { schedule: "", habits: "", availability: "realistic" },
  scene: {
    medium: "face_to_face",
    goal: "",
    intensity: 50,
    boredomGuard: true,
    interruptions: true,
    realEndings: true,
    outfit: "",
  },
  relationship: {
    trust: 50,
    comfort: 50,
    tension: 25,
    resentment: 0,
    curiosity: 50,
    boundaries: "",
    attraction: "",
    triggers: "",
    soothers: "",
    romanceSpeed: "medium",
    autonomy: 72,
    dialogueRatio: 65,
  },
  behavior: {
    povLock: true,
    antiCliche: true,
    tooMuchGuard: true,
    maxReplyWords: 220,
    silentActions: true,
    narrativeEchoes: true,
    consistencyGuard: true,
    repetitionRadar: true,
  },
  world: {
    inbox: [],
    commitments: [],
    secrets: [],
    rumors: [],
    objects: [],
    places: [],
    privateNotes: [],
    photos: [],
    canonLocks: [],
  },
  modes: {
    whatIf: false,
    testRoom: false,
    performance: false,
    offlineReading: true,
  },
  simulation: {
    lastOpenedAt: "",
    previousOpenedAt: "",
  },
});

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_LIVING_WORLD));
}

function mergeState(raw = {}) {
  const base = cloneDefault();
  return {
    ...base,
    ...raw,
    routine: { ...base.routine, ...(raw.routine || {}) },
    scene: { ...base.scene, ...(raw.scene || {}) },
    relationship: { ...base.relationship, ...(raw.relationship || {}) },
    behavior: { ...base.behavior, ...(raw.behavior || {}) },
    world: { ...base.world, ...(raw.world || {}) },
    modes: { ...base.modes, ...(raw.modes || {}) },
    simulation: { ...base.simulation, ...(raw.simulation || {}) },
  };
}

function key(conversationId) {
  return `${STORE_PREFIX}${String(conversationId || "unknown")}`;
}

export function readLivingWorld(conversationId) {
  if (typeof localStorage === "undefined") return cloneDefault();
  try {
    const parsed = JSON.parse(localStorage.getItem(key(conversationId)) || "{}");
    return mergeState(parsed);
  } catch {
    return cloneDefault();
  }
}

export function writeLivingWorld(conversationId, next) {
  const value = sanitizeWorldState(mergeState(next));
  if (typeof localStorage !== "undefined") {
    try { localStorage.setItem(key(conversationId), JSON.stringify(value)); } catch {}
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("velvet:living-world", { detail: { conversationId, value } }));
  }
  return value;
}

export function patchLivingWorld(conversationId, state, section, patch) {
  return writeLivingWorld(conversationId, {
    ...state,
    [section]: { ...(state?.[section] || {}), ...patch },
  });
}

export function touchLivingWorld(conversationId, state) {
  const now = new Date().toISOString();
  const previous = state?.simulation?.lastOpenedAt || "";
  return writeLivingWorld(conversationId, {
    ...state,
    simulation: { ...(state?.simulation || {}), previousOpenedAt: previous, lastOpenedAt: now },
  });
}

export function elapsedLabel(iso) {
  const then = Date.parse(iso || "");
  if (!Number.isFinite(then)) return "First tracked visit";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes}m since last open`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h since last open`;
  return `${Math.round(hours / 24)}d since last open`;
}

function compact(value, max = 180) {
  return compactForPrompt(value, max);
}

function activeList(list, max = 4) {
  return (Array.isArray(list) ? list : []).filter((item) => item && item.status !== "done" && item.status !== "resolved").slice(-max);
}

export function buildLivingWorldDirectorHint(state, { characterName = "the character", recentMessages = [] } = {}) {
  const s = sanitizeWorldState(mergeState(state));
  const lines = [];
  const r = s.relationship;
  const scene = s.scene;
  const behavior = s.behavior;
  const world = s.world;

  lines.push("Living World guidance (quietly obey; never mention these controls or metadata):");
  lines.push(`Scene: ${scene.medium.replaceAll("_", " ")}; intensity ${scene.intensity}/100; autonomy ${r.autonomy}/100; dialogue target ~${r.dialogueRatio}%.`);
  lines.push(`Romance ${r.romanceSpeed}. Relationship tendencies: trust ${r.trust}, comfort ${r.comfort}, tension ${r.tension}, resentment ${r.resentment}, curiosity ${r.curiosity}; never state numbers in prose.`);

  if (scene.goal) lines.push(`Current scene goal: ${compact(scene.goal)}.`);
  if (scene.outfit) lines.push(`Current outfit continuity: ${compact(scene.outfit)}.`);
  if (s.routine.schedule) lines.push(`${characterName}'s routine/schedule: ${compact(s.routine.schedule)}.`);
  if (s.routine.habits) lines.push(`Routine habits: ${compact(s.routine.habits)}.`);
  if (r.boundaries) lines.push(`Character boundaries: ${compact(r.boundaries)}.`);
  if (r.attraction) lines.push(`Specific attraction cues already established: ${compact(r.attraction)}.`);
  if (r.triggers) lines.push(`Emotional triggers: ${compact(r.triggers)}.`);
  if (r.soothers) lines.push(`Known soothers: ${compact(r.soothers)}.`);

  const commitments = activeList(world.commitments).map((x) => `${compact(x.title || x.text, 75)}${x.when ? ` @ ${compact(x.when, 45)}` : ""}`);
  if (commitments.length) lines.push(`Open commitments/promises: ${commitments.join(" | ")}.`);
  const secrets = secretsForCharacter(world.secrets, characterName).slice(-3).map((x) => compact(x.subject || x.text, 78));
  if (secrets.length) lines.push(`Secrets ${characterName} is allowed to know: ${secrets.join(" | ")}. Knowledge not listed here stays unavailable.`);
  const rumors = activeList(world.rumors, 3).map((x) => compact(x.text || x.subject, 90));
  if (rumors.length) lines.push(`Rumors are unverified and may distort: ${rumors.join(" | ")}.`);
  const objects = activeList(world.objects, 5).map((x) => `${compact(x.name, 55)}${x.owner ? ` (${compact(x.owner, 35)})` : ""}${x.status ? `: ${compact(x.status, 55)}` : ""}`);
  if (objects.length) lines.push(`Persistent objects: ${objects.join(" | ")}.`);
  const canon = activeList(world.canonLocks, 5).map((x) => compact(x.text || x.title, 95));
  if (canon.length) lines.push(`Canon locks that cannot be contradicted: ${canon.join(" | ")}.`);
  const notes = activeList(world.privateNotes, 3).map((x) => compact(x.text || x.title, 100));
  if (notes.length) lines.push(`Private director notes: ${notes.join(" | ")}.`);
  if (canon.length) lines.push("Canon locks outrank rumors, guesses, auto-memory, and private notes if any source conflicts.");
  const repetitionHint = buildRepetitionAvoidanceHint(recentMessages);
  if (repetitionHint) lines.push(repetitionHint);

  if (behavior.povLock) lines.push("POV LOCK: never write the user's thoughts, feelings, intentions, decisions, dialogue, or unprovided actions.");
  if (behavior.antiCliche) lines.push("Anti-cliche: reject generic AI-romance phrasing, recycled dominance beats, canned smirks/gazes/jaw beats, and stock banter cadence.");
  if (behavior.tooMuchGuard) lines.push(`Too-much guard: prefer the shortest complete human response; normally stay under roughly ${behavior.maxReplyWords} words unless the scene truly requires more.`);
  if (behavior.silentActions) lines.push("Silent actions are allowed: the character does not need dialogue every turn if a grounded action or silence is more human.");
  if (behavior.narrativeEchoes) lines.push("Use rare, specific callbacks to established phrases/objects/places only when genuinely natural; never force nostalgia.");
  if (behavior.consistencyGuard) lines.push("Before finalizing, silently reject a response that could belong to any generic character; preserve this character's distinct voice, limits, habits, and decision style.");
  if (behavior.repetitionRadar) lines.push("Silently avoid repeating recent openings, jokes, body-language beats, conflict tactics, or romantic escalation patterns.");
  if (scene.boredomGuard) lines.push("If the scene has stalled, advance it with one plausible character-led action, topic change, obligation, arrival, departure, or consequence. Do not add random chaos.");
  if (scene.interruptions) lines.push("Natural interruptions are allowed only when grounded in the place, cast, schedule, or existing world. Never use an interruption as a cheap romance device.");
  if (scene.realEndings) lines.push("Characters may realistically end conversations, leave, hang up, go to class/work, or change locations when their priorities call for it.");
  if (s.modes.whatIf) lines.push("WHAT-IF MODE: treat this beat as exploratory and avoid creating irreversible canon claims unless the user explicitly confirms them later.");
  if (s.modes.testRoom) lines.push("CHARACTER TEST ROOM: prioritize voice/behavior consistency over plot advancement; do not create major canon events.");

  return lines.join("\n").slice(0, 2800);
}

const CLICHES = [
  "you drive me crazy", "you have no idea what you do to me", "his jaw tightened", "her jaw tightened",
  "a low chuckle", "a low growl", "darkened gaze", "his gaze darkened", "her gaze darkened",
  "you’re playing with fire", "you're playing with fire", "you’re going to be the death of me", "you're going to be the death of me",
];

export function analyzeRecentReplies(messages = []) {
  const replies = (Array.isArray(messages) ? messages : [])
    .filter((m) => m?.sender === "character" && !m?.isStreaming && String(m?.content || "").trim())
    .slice(-10)
    .map((m) => String(m.content).trim());
  const openings = new Map();
  for (const reply of replies) {
    const opening = reply.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
    if (opening) openings.set(opening, (openings.get(opening) || 0) + 1);
  }
  const repeatedOpenings = [...openings.entries()].filter(([, count]) => count > 1).map(([text, count]) => ({ text, count }));
  const lower = replies.join("\n").toLowerCase();
  const cliches = CLICHES.filter((phrase) => lower.includes(phrase));
  const avgWords = replies.length ? Math.round(replies.reduce((n, s) => n + s.split(/\s+/).filter(Boolean).length, 0) / replies.length) : 0;
  const repetitionPenalty = Math.min(35, repeatedOpenings.reduce((n, x) => n + (x.count - 1) * 8, 0));
  const clichePenalty = Math.min(30, cliches.length * 8);
  const lengthPenalty = avgWords > 320 ? 12 : avgWords > 240 ? 6 : 0;
  const consistencyScore = Math.max(35, 100 - repetitionPenalty - clichePenalty - lengthPenalty);
  return { replies: replies.length, repeatedOpenings, cliches, avgWords, consistencyScore };
}

export function recordLivingWorldCrash(conversationId) {
  if (typeof localStorage === "undefined") return 0;
  const k = `${CRASH_PREFIX}${conversationId || "unknown"}`;
  try {
    const current = Number(localStorage.getItem(k) || 0) + 1;
    localStorage.setItem(k, String(current));
    return current;
  } catch { return 0; }
}

export function clearLivingWorldCrashes(conversationId) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(`${CRASH_PREFIX}${conversationId || "unknown"}`); } catch {}
}

export function shouldUseLivingWorldSafeMode(conversationId) {
  if (typeof localStorage === "undefined") return false;
  try { return Number(localStorage.getItem(`${CRASH_PREFIX}${conversationId || "unknown"}`) || 0) >= 3; }
  catch { return false; }
}
