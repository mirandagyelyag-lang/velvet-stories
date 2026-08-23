const listeners = new Set();
const stoppers = new Map();

let state = {
  voiceActive: false,
  voiceLabel: "",
  ambienceActive: false,
  ambiencePaused: false,
  ambienceLabel: "",
};

function emit() {
  const snapshot = { ...state };
  listeners.forEach((listener) => {
    try { listener(snapshot); } catch {}
  });
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent("velvet:audio-state", { detail: snapshot })); } catch {}
  }
}

export function getAudioState() { return { ...state }; }
export function subscribeAudioState(listener) { listeners.add(listener); listener(getAudioState()); return () => listeners.delete(listener); }
export function setVoiceAudioState(active, label = "") { state = { ...state, voiceActive: Boolean(active), voiceLabel: active ? String(label || "Voice") : "" }; emit(); }
export function setAmbienceAudioState(active, label = "", paused = false) {
  const isActive = Boolean(active);
  const isPaused = Boolean(paused);
  state = { ...state, ambienceActive: isActive, ambiencePaused: isPaused, ambienceLabel: isActive || isPaused ? String(label || "Ambience") : "" };
  emit();
}
export function registerAudioStopper(kind, stopper) { stoppers.set(kind, stopper); return () => { if (stoppers.get(kind) === stopper) stoppers.delete(kind); }; }
export function stopAllAudio() { [...stoppers.values()].forEach((stopper) => { try { stopper(); } catch {} }); state = { voiceActive: false, voiceLabel: "", ambienceActive: false, ambiencePaused: false, ambienceLabel: "" }; emit(); }
export function audioPreferenceKey(scope, id) { return `velvet_audio_${String(scope || "global")}_${String(id || "default")}`; }
export function readAudioPreference(scope, id, fallback = {}) { try { const parsed = JSON.parse(localStorage.getItem(audioPreferenceKey(scope, id)) || "{}"); return { ...fallback, ...(parsed && typeof parsed === "object" ? parsed : {}) }; } catch { return { ...fallback }; } }
export function writeAudioPreference(scope, id, patch = {}) { const current = readAudioPreference(scope, id, {}); const next = { ...current, ...patch }; try { localStorage.setItem(audioPreferenceKey(scope, id), JSON.stringify(next)); } catch {} return next; }

if (typeof window !== "undefined") {
  // Ambience owns visibility pause/resume so Android returning from the background does not restart or double-stack a room.
  // A real page exit still tears everything down.
  window.addEventListener("pagehide", stopAllAudio);
}
