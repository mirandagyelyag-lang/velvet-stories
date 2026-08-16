const RECOVERY_QUERY = "velvet_recovered";
const RECOVERY_SESSION_KEY = "velvet_runtime_recovery_v202";

function safeSessionGet(key) {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}

function safeSessionSet(key, value) {
  try { window.sessionStorage.setItem(key, value); } catch {}
}

export function recordVelvetRuntimeError(error, source = "runtime") {
  try {
    const message = error instanceof Error ? error.message : String(error || "Unknown error");
    window.sessionStorage.setItem("velvet_last_runtime_error", JSON.stringify({
      source,
      message: message.slice(0, 900),
      at: new Date().toISOString(),
    }));
  } catch {}
}

export async function clearVelvetRuntimeCaches() {
  const jobs = [];

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      jobs.push(...registrations.map((registration) => registration.unregister().catch(() => false)));
    } catch {}
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      jobs.push(...keys.map((key) => caches.delete(key).catch(() => false)));
    } catch {}
  }

  if (jobs.length) await Promise.allSettled(jobs);
}

export async function repairVelvetRuntime(reason = "manual") {
  recordVelvetRuntimeError(reason, "recovery");
  safeSessionSet(RECOVERY_SESSION_KEY, "1");
  await clearVelvetRuntimeCaches();

  const url = new URL(window.location.href);
  url.searchParams.set(RECOVERY_QUERY, String(Date.now()));
  url.searchParams.delete("open");
  window.location.replace(url.toString());
}

export function canAutoRepairVelvet() {
  return safeSessionGet(RECOVERY_SESSION_KEY) !== "1";
}

export function markVelvetHealthy() {
  safeSessionSet(RECOVERY_SESSION_KEY, "0");
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(RECOVERY_QUERY)) {
      url.searchParams.delete(RECOVERY_QUERY);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {}
}
