/** Privacy-safe timing primitives for ORVAYNE's streaming chat migration.
 * Does not log prompts, messages, tokens, or credentials.
 */
export type ChatTimingPhase = "request" | "context" | "provider" | "first_token" | "complete";
export type ChatTimingSnapshot = {
  traceId: string;
  elapsedMs: number;
  phases: Partial<Record<ChatTimingPhase, number>>;
};
export function createChatTimer(now: () => number = () => performance.now()) {
  const started = now();
  const traceId = crypto.randomUUID();
  const phases: Partial<Record<ChatTimingPhase, number>> = {};
  return {
    traceId,
    mark(phase: ChatTimingPhase) {
      const elapsed = Math.max(0, Math.round(now() - started));
      phases[phase] = elapsed;
      return elapsed;
    },
    snapshot(): ChatTimingSnapshot {
      return { traceId, elapsedMs: Math.max(0, Math.round(now() - started)), phases: { ...phases } };
    },
  };
}
