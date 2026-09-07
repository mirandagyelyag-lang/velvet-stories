import { VELVET_BUILD_TIME, VELVET_RELEASE, VELVET_VERSION } from "../config/version";
import { readGenerationTraces, summarizeGenerationTraces } from "./velvetResilience";
let privateContext = null;
export function setBugReportPrivateContext(context) { privateContext = context && typeof context === "object" ? context : null; }
export function clearBugReportPrivateContext() { privateContext = null; }
function readLastRuntimeError() { try { return JSON.parse(sessionStorage.getItem("velvet_last_runtime_error") || "null"); } catch { return null; } }
function readAiSession() { try { return JSON.parse(sessionStorage.getItem("velvet_ai_session_v19") || sessionStorage.getItem("velvet_ai_session_v18") || "{}"); } catch { return {}; } }
function routeSnapshot() { try { const url = new URL(window.location.href); return { path: url.pathname, open: url.searchParams.get("open") || "stories", hasCharacter: Boolean(url.searchParams.get("character")), hasConversation: Boolean(url.searchParams.get("conversation")) }; } catch { return { path: "/", open: "unknown", hasCharacter: false, hasConversation: false }; } }
export function getBugReportSnapshot({ includePrivate = false, note = "" } = {}) {
  const ai = readAiSession();
  const report = {
    velvet: { version: VELVET_VERSION, release: VELVET_RELEASE, build: VELVET_BUILD_TIME },
    route: routeSnapshot(),
    device: { viewport: `${window.innerWidth}x${window.innerHeight}`, touchPoints: navigator.maxTouchPoints || 0, standalone: Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone), online: navigator.onLine, userAgent: navigator.userAgent },
    lastTechnicalError: readLastRuntimeError(),
    ai: { lastModel: ai.lastModel || "", lastError: ai.lastError || "", lastDurationMs: ai.lastDurationMs || 0, repairs: ai.repairs || 0 },
    generationDiagnostics: (() => { const rows = readGenerationTraces(); return { summary: summarizeGenerationTraces(rows), recent: rows.slice(0, 8) }; })(),
    note: String(note || "").trim().slice(0, 1200),
  };
  if (includePrivate && privateContext) report.privateChatExcerpt = privateContext;
  return report;
}
export function formatBugReport(options) { return `VELVET BUG REPORT\n${JSON.stringify(getBugReportSnapshot(options), null, 2)}`; }
