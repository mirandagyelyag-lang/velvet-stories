const METRICS_KEY = "velvet_generation_metrics_v312";
const STORY_THEME_PREFIX = "velvet_story_theme_v312_";
const MAX_METRICS = 40;
export const STORY_THEMES = [{
  id: "velvet",
  label: "Velvet",
  description: "Classic burgundy",
  accent: "#7b2945"
}, {
  id: "night",
  label: "Night",
  description: "Cooler, darker reading",
  accent: "#4d4568"
}, {
  id: "cafe",
  label: "Café",
  description: "Warm paper glow",
  accent: "#8a5a46"
}, {
  id: "campus",
  label: "Campus",
  description: "Soft neutral daylight",
  accent: "#56675d"
}, {
  id: "rain",
  label: "Rain",
  description: "Muted blue-grey",
  accent: "#536775"
}];
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
      error: String(metric.error || "").slice(0, 180)
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
  const successful = rows.filter(row => row.status === "success");
  const firstTokens = successful.map(row => Number(row.firstTokenMs)).filter(value => value > 0);
  const durations = successful.map(row => Number(row.durationMs)).filter(value => value > 0);
  return {
    total: rows.length,
    success: successful.length,
    failed: rows.filter(row => row.status === "error").length,
    avgFirstTokenMs: average(firstTokens),
    avgDurationMs: average(durations),
    p50FirstTokenMs: median(firstTokens),
    p50DurationMs: median(durations),
    fallbackCount: successful.filter(row => row.fallbackUsed).length,
    repairCount: successful.filter(row => row.repairUsed).length
  };
}
export function readStoryTheme(conversationId) {
  if (!conversationId) return "velvet";
  try {
    const value = localStorage.getItem(`${STORY_THEME_PREFIX}${conversationId}`) || "velvet";
    return STORY_THEMES.some(theme => theme.id === value) ? value : "velvet";
  } catch {
    return "velvet";
  }
}
export function saveStoryTheme(conversationId, themeId) {
  if (!conversationId) return;
  const safe = STORY_THEMES.some(theme => theme.id === themeId) ? themeId : "velvet";
  try {
    localStorage.setItem(`${STORY_THEME_PREFIX}${conversationId}`, safe);
  } catch {}
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
  await new Promise(resolve => setTimeout(resolve, ms));
}
export function triggerJsonDownload(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });
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

// Invisible reliability + live diagnostics
// Local-only technical traces. Never stores prompts, replies, memory text, lore text,
// persona text, auth tokens, API keys or full account/conversation identifiers.
const GENERATION_TRACE_KEY = "velvet_generation_traces_v3498";
const MAX_GENERATION_TRACES = 60;
const MAX_TRACE_ATTEMPTS = 16;
export function beginGenerationTrace(input = {}) {
  const requestRef = shortRef(input.requestId || `req-${Date.now()}`);
  const row = {
    at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requestRef,
    generationRef: shortRef(input.generationId || ""),
    conversationRef: shortRef(input.conversationId || ""),
    operation: cleanDiagnosticLabel(input.operation || "reply", 48),
    source: cleanDiagnosticLabel(input.source || input.operation || "reply", 48),
    status: "started",
    phase: "request",
    network: safeOnlineState(),
    model: "",
    modelTrail: [],
    firstTokenMs: 0,
    durationMs: 0,
    fallbackUsed: false,
    repairUsed: false,
    recovery: "",
    errorCategory: "",
    error: "",
    httpStatus: 0,
    context: {},
    attempts: []
  };
  writeGenerationTrace(row);
  return requestRef;
}
export function updateGenerationTrace(requestId, patch = {}) {
  const requestRef = shortRef(requestId || "");
  if (!requestRef) return;
  const rows = readGenerationTraces();
  const index = rows.findIndex(row => row.requestRef === requestRef);
  if (index < 0) return;
  const current = rows[index];
  const nextTrail = Array.isArray(current.modelTrail) ? [...current.modelTrail] : [];
  const incomingModels = [patch.model, ...(Array.isArray(patch.models) ? patch.models : [])].map(value => cleanDiagnosticLabel(value, 90)).filter(Boolean);
  for (const model of incomingModels) if (!nextTrail.includes(model)) nextTrail.push(model);
  const nextAttempts = Array.isArray(current.attempts) ? [...current.attempts] : [];
  if (patch.attempt && typeof patch.attempt === "object") {
    nextAttempts.push(sanitizeTraceAttempt(patch.attempt));
    if (nextAttempts.length > MAX_TRACE_ATTEMPTS) nextAttempts.splice(0, nextAttempts.length - MAX_TRACE_ATTEMPTS);
  }
  const next = {
    ...current,
    ...pickTraceFields(patch),
    updatedAt: new Date().toISOString(),
    modelTrail: nextTrail.slice(0, 8),
    attempts: nextAttempts,
    context: {
      ...(current.context && typeof current.context === "object" ? current.context : {}),
      ...(patch.context && typeof patch.context === "object" ? sanitizeTraceContext(patch.context) : {})
    }
  };
  if (!next.model && nextTrail.length) next.model = nextTrail[nextTrail.length - 1];
  rows[index] = next;
  persistGenerationTraces(rows);
}
export function finishGenerationTrace(requestId, patch = {}) {
  const status = ["success", "error", "cancelled"].includes(String(patch.status)) ? String(patch.status) : "success";
  updateGenerationTrace(requestId, {
    ...patch,
    status,
    phase: cleanDiagnosticLabel(patch.phase || (status === "success" ? "done" : status), 48),
    errorCategory: status === "error" ? patch.errorCategory || classifyGenerationError(patch.error) : ""
  });
}
export function readGenerationTraces() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GENERATION_TRACE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, MAX_GENERATION_TRACES) : [];
  } catch {
    return [];
  }
}
export function clearGenerationTraces() {
  try {
    localStorage.removeItem(GENERATION_TRACE_KEY);
  } catch {}
  notifyTraceChange();
}
export function summarizeGenerationTraces(rows = readGenerationTraces()) {
  const finished = rows.filter(row => ["success", "error", "cancelled"].includes(row.status));
  const success = finished.filter(row => row.status === "success");
  const errors = finished.filter(row => row.status === "error");
  const durations = success.map(row => Number(row.durationMs || 0)).filter(value => value > 0);
  const firstTokens = success.map(row => Number(row.firstTokenMs || 0)).filter(value => value > 0);
  const last = rows[0] || null;
  return {
    total: rows.length,
    success: success.length,
    failed: errors.length,
    cancelled: finished.filter(row => row.status === "cancelled").length,
    fallbackCount: success.filter(row => row.fallbackUsed || (row.modelTrail || []).length > 1).length,
    recoveryCount: success.filter(row => Boolean(row.recovery)).length,
    medianFirstTokenMs: median(firstTokens),
    medianDurationMs: median(durations),
    lastOperation: last?.operation || "—",
    lastStatus: last?.status || "—",
    lastModel: last?.model || (last?.modelTrail || []).at?.(-1) || "—",
    lastErrorCategory: last?.errorCategory || "—"
  };
}
export function classifyGenerationError(error) {
  const text = String(error?.message || error || "").toLowerCase();
  if (!text) return "unknown";
  if (/abort|cancel|stopp?ed/.test(text)) return "cancelled";
  if (/offline|failed to fetch|network|load failed|connection|dns|internet/.test(text)) return "network";
  if (/429|quota|rate.?limit|resource_exhausted|high demand|overload/.test(text)) return "provider_capacity";
  if (/500|502|503|504|temporarily unavailable|upstream|model.*unavailable/.test(text)) return "provider_transient";
  if (/timeout|deadline|timed out/.test(text)) return "timeout";
  if (/401|403|auth|session expired|jwt|permission/.test(text)) return "auth";
  if (/supabase|database|postgres|row level|rls|persist|save/.test(text)) return "persistence";
  if (/json|schema|parse|malformed|empty reply|empty response/.test(text)) return "response_format";
  return "app_or_provider";
}
function writeGenerationTrace(row) {
  const rows = readGenerationTraces().filter(item => item.requestRef !== row.requestRef);
  persistGenerationTraces([row, ...rows]);
}
function persistGenerationTraces(rows) {
  try {
    localStorage.setItem(GENERATION_TRACE_KEY, JSON.stringify(rows.slice(0, MAX_GENERATION_TRACES)));
  } catch {}
  notifyTraceChange();
}
function notifyTraceChange() {
  try {
    window.dispatchEvent(new CustomEvent("velvet:generation-diagnostics"));
  } catch {}
}
function shortRef(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const compact = text.replace(/[^A-Za-z0-9]/g, "");
  return compact.slice(-10) || text.slice(-10);
}
function cleanDiagnosticLabel(value, max = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function pickTraceFields(patch = {}) {
  const next = {};
  for (const key of ["status", "phase", "operation", "source", "model", "recovery", "errorCategory", "network"]) {
    if (patch[key] !== undefined) next[key] = cleanDiagnosticLabel(patch[key], key === "model" ? 90 : 80);
  }
  for (const key of ["firstTokenMs", "durationMs", "httpStatus"]) {
    if (patch[key] !== undefined) next[key] = finiteOrZero(patch[key]);
  }
  for (const key of ["fallbackUsed", "repairUsed"]) {
    if (patch[key] !== undefined) next[key] = Boolean(patch[key]);
  }
  if (patch.error !== undefined) next.error = cleanDiagnosticLabel(patch.error?.message || patch.error, 220);
  return next;
}
function sanitizeTraceAttempt(attempt = {}) {
  return {
    phase: cleanDiagnosticLabel(attempt.phase || "attempt", 48),
    model: cleanDiagnosticLabel(attempt.model || "", 90),
    mode: cleanDiagnosticLabel(attempt.mode || "", 32),
    status: finiteOrZero(attempt.status),
    elapsedMs: finiteOrZero(attempt.elapsedMs),
    reason: cleanDiagnosticLabel(attempt.reason || attempt.errorCategory || "", 90)
  };
}
function sanitizeTraceContext(context = {}) {
  const next = {};
  for (const key of ["memoryCount", "pinnedMemoryCount", "loreCount", "promptChars", "responseTokenCeiling", "overallDeadlineMs", "historyCount"]) {
    if (context[key] !== undefined) next[key] = finiteOrZero(context[key]);
  }
  if (Array.isArray(context.hedgeDelaysMs)) next.hedgeDelaysMs = context.hedgeDelaysMs.slice(0, 6).map(finiteOrZero);
  if (context.route) next.route = cleanDiagnosticLabel(context.route, 40);
  return next;
}
function safeOnlineState() {
  try {
    return navigator.onLine === false ? "offline" : "online";
  } catch {
    return "unknown";
  }
}
