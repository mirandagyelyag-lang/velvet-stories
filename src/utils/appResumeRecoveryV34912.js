const STATE_KEY = "velvet_runtime_resume_v34912";
const MIN_BACKGROUND_MS = 900;
let installed = false;
let hiddenAt = 0;
let sequence = 0;
function safeStore(value) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(value));
  } catch {}
}
function emitResume(source = "visibility") {
  const now = Date.now();
  const backgroundMs = hiddenAt ? Math.max(0, now - hiddenAt) : 0;
  sequence += 1;
  const detail = {
    source,
    backgroundMs,
    at: now,
    sequence
  };
  safeStore(detail);
  window.dispatchEvent(new CustomEvent("velvet:app-resume", {
    detail
  }));
  hiddenAt = 0;
}
function emitPause(source = "visibility") {
  hiddenAt = Date.now();
  window.dispatchEvent(new CustomEvent("velvet:app-pause", {
    detail: {
      source,
      at: hiddenAt
    }
  }));
}
export function installAppResumeRecoveryV34912() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return () => {};
  installed = true;
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      emitPause("visibility");
      return;
    }
    if (!hiddenAt || Date.now() - hiddenAt >= MIN_BACKGROUND_MS) emitResume("visibility");
  };
  const onPageShow = event => emitResume(event?.persisted ? "bfcache" : "pageshow");
  const onNativePause = () => emitPause("android-native");
  const onNativeResume = () => emitResume("android-native");
  const onOnline = () => window.dispatchEvent(new CustomEvent("velvet:connectivity-restored", {
    detail: {
      at: Date.now()
    }
  }));
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("velvet:native-pause", onNativePause);
  window.addEventListener("velvet:native-resume", onNativeResume);
  window.addEventListener("online", onOnline);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("velvet:native-pause", onNativePause);
    window.removeEventListener("velvet:native-resume", onNativeResume);
    window.removeEventListener("online", onOnline);
    installed = false;
  };
}
export function readLastResumeStateV34912() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY) || "null");
  } catch {
    return null;
  }
}
