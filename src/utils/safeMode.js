
const SAFE_MODE_KEY = "velvet_safe_mode_v1";

export function isSafeModeEnabled() {
  try { return localStorage.getItem(SAFE_MODE_KEY) === "1"; }
  catch { return false; }
}

export function applySafeModeClass(enabled = isSafeModeEnabled()) {
  if (typeof document === "undefined") return Boolean(enabled);
  document.documentElement.classList.toggle("velvet-safe-mode", Boolean(enabled));
  document.body?.classList.toggle("velvet-safe-mode", Boolean(enabled));
  return Boolean(enabled);
}

export function setSafeModeEnabled(enabled) {
  const value = Boolean(enabled);
  try { localStorage.setItem(SAFE_MODE_KEY, value ? "1" : "0"); } catch {}
  applySafeModeClass(value);
  try { window.dispatchEvent(new CustomEvent("velvet:safe-mode", { detail: { enabled: value } })); } catch {}
  return value;
}

export async function clearVelvetCachesOnly() {
  if (typeof window === "undefined" || !("caches" in window)) return 0;
  try {
    const keys = await caches.keys();
    const results = await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
    return results.filter(Boolean).length;
  } catch { return 0; }
}

export async function startVelvetSafeMode() {
  setSafeModeEnabled(true);
  await clearVelvetCachesOnly();
  return true;
}

export function leaveVelvetSafeMode() {
  return setSafeModeEnabled(false);
}
