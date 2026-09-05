const PREFIX = "velvet_experience_v3250_";

export const EXPERIENCE_DEFAULTS = Object.freeze({
  composer: { compact: false, quickTools: true, showContext: true, maxHeight: 170 },
  group: { realisticTurns: true, allowSilence: true, avoidRoundRobin: true },
  availability: { mode: "realistic", note: "" },
  notifications: [],
  visual: { storyTheme: "inherit", sceneCards: true },
  chaptering: { enabled: true, every: 28 },
  director: { lastPreset: "" },
});

function cloneDefaults() { return JSON.parse(JSON.stringify(EXPERIENCE_DEFAULTS)); }
function key(id) { return `${PREFIX}${String(id || "unknown")}`; }
function text(v) { return String(v || "").trim(); }
function norm(v) { return text(v).toLowerCase().replace(/\s+/g, " "); }

function merge(raw = {}) {
  const base = cloneDefaults();
  return {
    ...base,
    ...raw,
    composer: { ...base.composer, ...(raw.composer || {}) },
    group: { ...base.group, ...(raw.group || {}) },
    availability: { ...base.availability, ...(raw.availability || {}) },
    visual: { ...base.visual, ...(raw.visual || {}) },
    chaptering: { ...base.chaptering, ...(raw.chaptering || {}) },
    director: { ...base.director, ...(raw.director || {}) },
    notifications: Array.isArray(raw.notifications) ? raw.notifications.slice(-24) : [],
  };
}

export function readExperience(id) {
  if (typeof localStorage === "undefined") return cloneDefaults();
  try { return merge(JSON.parse(localStorage.getItem(key(id)) || "{}")); }
  catch { return cloneDefaults(); }
}

export function writeExperience(id, next) {
  const value = merge(next);
  try { localStorage.setItem(key(id), JSON.stringify(value)); } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("velvet:experience", { detail: { conversationId: id, value } }));
  return value;
}

export function patchExperience(id, state, section, patch) {
  return writeExperience(id, { ...state, [section]: { ...(state?.[section] || {}), ...patch } });
}

export function deriveRecap(messages = [], characterName = "Character") {
  const rows = (Array.isArray(messages) ? messages : []).filter((m) => !m?.isStreaming && text(m?.content)).slice(-8);
  if (!rows.length) return "No story beats yet.";
  return rows.map((m) => `${m.sender === "user" ? "You" : characterName}: ${text(m.content).replace(/\s+/g," ").slice(0, 150)}`).join(" · ").slice(0, 780);
}

export function deriveAutomaticChapters(messages = [], every = 28) {
  const rows = (Array.isArray(messages) ? messages : []).filter((m) => !m?.isStreaming && text(m?.content));
  const size = Math.max(12, Number(every) || 28);
  const chapters = [];
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    if (!slice.length) continue;
    const first = text(slice.find((m)=>m.sender === "character")?.content || slice[0]?.content);
    const title = first.split(/[.!?\n]/)[0].slice(0, 52) || `Story beat ${chapters.length + 1}`;
    chapters.push({ number: chapters.length + 1, title, startMessageId: slice[0]?.id, endMessageId: slice.at(-1)?.id, count: slice.length });
  }
  return chapters;
}

export function searchConversation(messages = [], query = "", speaker = "all") {
  const q = norm(query);
  if (!q) return [];
  return (Array.isArray(messages) ? messages : []).filter((m) => {
    if (m?.isStreaming || !text(m?.content)) return false;
    if (speaker !== "all" && m.sender !== speaker) return false;
    return norm(m.content).includes(q);
  }).slice(-80).reverse();
}

export function deriveVoicePreview(character = {}) {
  const name = character?.name || "This character";
  const personality = text(character?.personality || character?.description || character?.characterPrompt);
  const seed = personality ? personality.split(/[.!?\n]/).find((x)=>x.trim().length > 12)?.trim() : "";
  return seed ? `${name}: “${seed.slice(0, 130)}”` : `${name}: “Give me one normal second before you turn this into a whole thing.”`;
}

export function relationshipHistory(conversation = {}) {
  const timeline = Array.isArray(conversation?.storyTimeline) ? conversation.storyTimeline : [];
  const rows = timeline.filter((x) => x && typeof x === "object" && (x.kind === "relationship" || x.relationship || x.tension != null || x.trust != null));
  return rows.slice(-12).map((x, i) => ({
    label: text(x.label || x.title || `Shift ${i + 1}`),
    trust: Number(x.trust ?? x.relationship?.trust ?? 50),
    tension: Number(x.tension ?? x.relationship?.tension ?? 25),
  }));
}

export function buildSceneCards(conversation = {}) {
  const timeline = Array.isArray(conversation?.storyTimeline) ? conversation.storyTimeline : [];
  const cards = timeline.filter((x)=>x && typeof x === "object").slice(-10).map((x, i)=>({
    id: x.message_id || x.id || `scene-${i}`,
    title: text(x.label || x.title || x.location || "Story beat"),
    detail: text(x.summary || x.detail || x.time || ""),
    messageId: x.message_id || x.start_message_id || "",
  }));
  const scene = conversation?.sceneState || {};
  if (scene.location || scene.time_label || scene.activity) cards.push({
    id: "current-scene",
    title: text(scene.location || "Current scene"),
    detail: [scene.time_label || scene.time, scene.activity].filter(Boolean).join(" · "),
    messageId: "",
  });
  return cards.slice(-10).reverse();
}

export function buildExperienceDirectorHint(state, { characterName = "the character", groupMode = false } = {}) {
  const s = merge(state);
  const lines = [];
  if (s.availability.mode === "realistic") lines.push(`${characterName} has a life outside this chat. Respect established schedule, sleep, class/work and plausible availability; do not make them magically free.`);
  if (text(s.availability.note)) lines.push(`Availability note: ${text(s.availability.note).slice(0, 180)}.`);
  if (groupMode && s.group.realisticTurns) lines.push("Group pacing: do not force every present character to speak each turn. Let some react silently, miss a beat, enter late, leave, or respond to each other when natural.");
  if (groupMode && s.group.avoidRoundRobin) lines.push("Avoid rigid round-robin dialogue and shared hive-mind knowledge. Keep voices and knowledge separate.");
  if (s.notifications.length) {
    const active = s.notifications.filter((x)=>x && x.status !== "done").slice(-3).map((x)=>`${text(x.type || "message")}: ${text(x.text).slice(0,100)}`);
    if (active.length) lines.push(`Story inbox may surface naturally when relevant: ${active.join(" | ")}. Do not force all notifications into one turn.`);
  }
  return lines.join("\n").slice(0, 900);
}

export function dedupeLocalWorldLists(world = {}) {
  const next = JSON.parse(JSON.stringify(world || {}));
  let removed = 0;
  for (const key of ["inbox","commitments","secrets","rumors","objects","places","privateNotes","photos"]) {
    const rows = Array.isArray(next[key]) ? next[key] : [];
    const seen = new Set();
    next[key] = rows.filter((item) => {
      const signature = norm(item?.text || item?.title || item?.subject || item?.name || JSON.stringify(item));
      if (!signature) return false;
      if (seen.has(signature)) { removed += 1; return false; }
      seen.add(signature); return true;
    });
  }
  return { world: next, removed };
}
