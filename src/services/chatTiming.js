// Lightweight browser instrumentation for character-chat requests.
// Does not inspect or persist message bodies, auth headers or response content.
export function createTimedSupabaseFetch(baseFetch = globalThis.fetch, onTiming = () => {}) {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url || "";
    if (!/\/functions\/v1\/character-chat(?:[/?#]|$)/.test(url)) {
      return baseFetch(input, init);
    }
    const started = performance.now();
    const traceId = globalThis.crypto?.randomUUID?.() || "unknown";
    try {
      const response = await baseFetch(input, init);
      onTiming({ traceId, phase: "headers", elapsedMs: Math.round(performance.now() - started), status: response.status });
      return response;
    } catch (error) {
      onTiming({ traceId, phase: "network_error", elapsedMs: Math.round(performance.now() - started) });
      throw error;
    }
  };
}
