const text = (value, limit = 240) => String(value || "").slice(0, limit);

export function instantStoryError(data = {}, { status = 0, requestId = "" } = {}) {
  const error = new Error(typeof data.error === "string" ? data.error : "Velvet couldn't create an Instant Story this time. Try again.");
  error.name = "InstantStoryError";
  // Deliberately retain a small allowlist, never the request, character draft,
  // auth headers, provider key, transcript or arbitrary backend fields.
  error.diagnostics = {
    action: "instant_story", status, requestId: text(data.requestId || requestId, 100),
    engineVersion: text(data.engineVersion, 30), openingFamily: text(data.openingFamily, 80),
    source: text(data.source, 80), model: text(data.model, 80), code: text(data.code, 100),
    wordCount: Number(data.wordCount) || 0, complete: Boolean(data.complete),
    retryable: Boolean(data.retryable),
    rejectionReasons: Array.isArray(data.rejectionReasons) ? data.rejectionReasons.slice(0, 16).map(reason => text(reason, 100)) : [],
    durationMs: Number(data.diagnostics?.durationMs) || 0,
    attempts: Array.isArray(data.diagnostics?.attempts) ? data.diagnostics.attempts.slice(0, 12).map(attempt => ({
      phase: text(attempt.phase, 40), model: text(attempt.model, 80),
      status: Number(attempt.status) || 0, code: text(attempt.code, 100), error: text(attempt.error),
      finishReason: text(attempt.finishReason, 40), words: Number(attempt.words) || 0,
      durationMs: Number(attempt.durationMs) || 0,
      reasons: Array.isArray(attempt.reasons) ? attempt.reasons.slice(0, 16).map(reason => text(reason, 100)) : [],
    })) : [],
  };
  return error;
}
