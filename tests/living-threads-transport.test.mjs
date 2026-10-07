import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import * as livingThreads from "../supabase/functions/character-chat/engine/living-threads-v1.js";

// Execute the actual Edge entrypoint/parser/transports in a mocked runtime.
// No provider credits, production data or credentials are used by these tests.
const source = stripTypeScriptTypes(fs.readFileSync("supabase/functions/character-chat/index.ts", "utf8"), { mode: "strip" }).replace(/^import[^\n]+\n/gm, "").replace(/^export (?=(?:async )?function|const)/gm, "");
const runtime = { TextEncoder, TextDecoder, ReadableStream, Response, Request, AbortController, DOMException, setTimeout, clearTimeout, ...livingThreads };
const logs = [];
const context = vm.createContext({ ...runtime, console: { log: (...v) => logs.push(v), warn: (...v) => logs.push(v), error: (...v) => logs.push(v) }, Deno: {
  env: { get: name => /^GEMINI_(?:MODEL|FALLBACK_MODEL|EMERGENCY_MODEL|RECOVERY_MODEL)$/.test(name) ? "fixture-model" : undefined },
  serve: handler => { context.edgeHandler = handler; },
} });
vm.runInContext(`${source}\nglobalThis.testApi = { parseModelEnvelope, streamGeminiEnvelopeWithFailover, callGeminiWithFailover };`, context);
const api = context.testApi;
const quote = "Roman kept your necklace in his jacket.";
const envelope = { reply: `Roman stepped closer. "Keep it," he said.\n${quote}`, thread_updates: [{ thread_id: "", subject_key: "necklace_return", type: "important_object", status: "open", importance: "medium", summary: "Roman still has your necklace.", characters: ["Roman", "you"], evidence: quote, evidence_source: "reply", source_message_id: "" }] };
const bodyLog = [];
function streamResponse(text) {
  const pieces = Array.from({ length: Math.ceil(text.length / 13) }, (_, i) => text.slice(i * 13, (i + 1) * 13));
  const encoded = new TextEncoder().encode(pieces.map((piece, i) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: piece }] }, ...(i === pieces.length - 1 ? { finishReason: "STOP" } : {}) }], ...(i === pieces.length - 1 ? { usageMetadata: { promptTokenCount: 321, candidatesTokenCount: 111 } } : {}) })}\n\n`).join(""));
  return new Response(new ReadableStream({ start(c) { c.enqueue(encoded); c.close(); } }), { headers: { "content-type": "text/event-stream" } });
}
const args = { apiKey: "fixture", systemInstruction: "Fixture", prompt: "Fixture", maxOutputTokens: 1400, isCancelled: async () => false, performancePlan: { completeWinnerOnly: false }, livingThreads: true };

context.fetch = async (_url, options) => { bodyLog.push(JSON.parse(options.body)); return streamResponse(JSON.stringify(envelope)); };
const visible = [];
const result = await api.streamGeminiEnvelopeWithFailover({ ...args, onReply: reply => visible.push(reply) });
assert.equal(result.reply, envelope.reply);
assert.equal(result.thread_updates.length, 1);
assert.equal(result.promptTokens, 321);
assert.deepEqual(bodyLog[0].generationConfig.responseSchema.propertyOrdering, ["reply", "thread_updates"]);
assert.ok(visible.length > 0);
assert.ok(visible.every(reply => !/thread_updates|subject_key|evidence_source/.test(reply)));
assert.equal(visible.at(-1), envelope.reply);
console.log("PASS actual SSE transport decodes prose only and retains bounded hidden thread updates");

bodyLog.length = 0;
context.fetch = async (_url, options) => {
  const body = JSON.parse(options.body); bodyLog.push(body);
  return bodyLog.length === 1 ? new Response(JSON.stringify({ error: { message: "Fixture schema rejected", status: "INVALID_ARGUMENT" } }), { status: 400 }) : streamResponse("Roman stepped closer without saying a word.");
};
const fallback = await api.streamGeminiEnvelopeWithFailover(args);
assert.equal(bodyLog.length, 2);
assert.ok(bodyLog[0].generationConfig.responseSchema);
assert.equal(bodyLog[1].generationConfig, undefined);
assert.equal(fallback.reply, "Roman stepped closer without saying a word.");
assert.equal(fallback.thread_updates.length, 0);
console.log("PASS schema rejection preserves the existing plain-prose recovery lane");

bodyLog.length = 0;
context.fetch = async (_url, options) => { bodyLog.push(JSON.parse(options.body)); return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(envelope) }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 42, candidatesTokenCount: 30 } }); };
const recovered = await api.callGeminiWithFailover({ ...args, interactionDeadlineMs: 7000 });
assert.equal(recovered.thread_updates.length, 1); assert.ok(bodyLog[0].generationConfig.responseSchema);
console.log("PASS actual nonstream recovery requests and parses the same lean envelope");

const partial = api.parseModelEnvelope('{"reply":"Roman stepped closer.","thread_updates":[{"subject_key":');
assert.equal(partial.reply, "Roman stepped closer."); assert.equal(partial.thread_updates.length, 0);
const plain = api.parseModelEnvelope("Roman stayed beside you without speaking.");
assert.equal(plain.thread_updates.length, 0);
const malformed = api.parseModelEnvelope(JSON.stringify({ reply: "Roman waited.", thread_updates: "bad" }));
assert.equal(malformed.thread_updates.length, 0);
assert.throws(() => api.parseModelEnvelope('{"thread_updates":['));
console.log("PASS incomplete/malformed metadata is discarded without leaking JSON into chat");

const requestsBeforeCancellation = bodyLog.length;
await assert.rejects(api.streamGeminiEnvelopeWithFailover({ ...args, isCancelled: async () => true }), /cancelled/i);
assert.equal(bodyLog.length, requestsBeforeCancellation);
console.log("PASS cancelled generations do not start provider requests");

// The actual sanitizer is imported, so load its real implementation for this check.
const { sanitizeUserTurnForPerception } = await import("../supabase/functions/character-chat/engine/story-contract.ts");
const userRaw = "*I look at Roman. I secretly wish he would kiss me.*";
const perceivable = sanitizeUserTurnForPerception(userRaw);
assert.ok(!perceivable.includes("secretly wish"));
const contaminated = livingThreads.reduceLivingThreads({ messageId: "reply", userMessageId: "user", latestUserMessage: perceivable, reply: "Roman stayed nearby.", changes: [{ ...envelope.thread_updates[0], evidence_source: "user", evidence: "I secretly wish he would kiss me." }] });
assert.equal(contaminated.threads.length, 0);
console.log("PASS private user narration cannot become a thread's evidence");

assert.match(source, /stateCommit\.eq\("story_revision", storyRevision\)/);
assert.match(source, /stateCommit\.eq\(livingThreadMessagePath, expectedLivingThreadMessageId\)/);
assert.match(source, /stateCommit\.is\(livingThreadMessagePath, null\)/);
assert.ok(!source.includes("function reduceStoryThreadsV35386("));
console.log("PASS V1 has a single thread writer and revision-guarded persistence");
