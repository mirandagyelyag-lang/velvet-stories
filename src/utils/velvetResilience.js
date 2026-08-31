const METRICS_KEY = "velvet_generation_metrics_v312";
const STORY_THEME_PREFIX = "velvet_story_theme_v312_";
const MAX_METRICS = 40;

export const STORY_THEMES = [
  { id: "velvet", label: "Velvet", description: "Classic burgundy", accent: "#7b2945" },
  { id: "night", label: "Night", description: "Cooler, darker reading", accent: "#4d4568" },
  { id: "cafe", label: "Café", description: "Warm paper glow", accent: "#8a5a46" },
  { id: "campus", label: "Campus", description: "Soft neutral daylight", accent: "#56675d" },
  { id: "rain", label: "Rain", description: "Muted blue-grey", accent: "#536775" },
];

export function recordGenerationMetric(metric = {}) {
  try {
    const rows = readGenerationMetrics();
    const next = [{
      at: new Date().toISOString(),
      status: metric.status || "success",
      model: String(metric.model || "unknown"),
      firstTokenMs: finiteOrZero(metric.firstTokenMs),
      durationMs: finiteOrZero(metric.durationMs),
      fallbackUsed: Boolean(metric.fallbackUsed),
      repairUsed: Boolean(metric.repairUsed),
      error: String(metric.error || "").slice(0, 180),
    }, ...rows].slice(0, MAX_METRICS);
    localStorage.setItem(METRICS_KEY, JSON.stringify(next));
  } catch {
    // Performance telemetry is local-only and must never interfere with chat.
  }
}

export function readGenerationMetrics() {
  try {
    const parsed = JSON.parse(localStorage.getItem(METRICS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function summarizeGenerationMetrics(rows = readGenerationMetrics()) {
  const successful = rows.filter((row) => row.status === "success");
  const firstTokens = successful.map((row) => Number(row.firstTokenMs)).filter((value) => value > 0);
  const durations = successful.map((row) => Number(row.durationMs)).filter((value) => value > 0);
  return {
    total: rows.length,
    success: successful.length,
    failed: rows.filter((row) => row.status === "error").length,
    avgFirstTokenMs: average(firstTokens),
    avgDurationMs: average(durations),
    p50FirstTokenMs: median(firstTokens),
    p50DurationMs: median(durations),
    fallbackCount: successful.filter((row) => row.fallbackUsed).length,
    repairCount: successful.filter((row) => row.repairUsed).length,
  };
}

export function readStoryTheme(conversationId) {
  if (!conversationId) return "velvet";
  try {
    const value = localStorage.getItem(`${STORY_THEME_PREFIX}${conversationId}`) || "velvet";
    return STORY_THEMES.some((theme) => theme.id === value) ? value : "velvet";
  } catch {
    return "velvet";
  }
}

export function saveStoryTheme(conversationId, themeId) {
  if (!conversationId) return;
  const safe = STORY_THEMES.some((theme) => theme.id === themeId) ? themeId : "velvet";
  try { localStorage.setItem(`${STORY_THEME_PREFIX}${conversationId}`, safe); } catch {}
}

export function isProbablyUuid(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

export function isRetryableNetworkError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return error?.name === "TypeError" || /failed to fetch|network|load failed|connection|temporarily unavailable|timeout/.test(message);
}

export function isRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || status === 502 || status === 503 || status === 504;
}

export async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function triggerJsonDownload(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function finiteOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2);
}
