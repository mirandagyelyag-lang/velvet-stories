import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import { pathToFileURL } from "node:url";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { instantStoryError } from "../src/utils/instantStoryDiagnostics.js";

const entrypoint = "supabase/functions/character-chat/index.ts";
const raw = fs.readFileSync(process.env.VELVET_INSTANT_BASELINE || entrypoint, "utf8");
const imports = {};
for (const match of raw.matchAll(/^import \{([^}]+)\} from "(\.\/engine\/[^\"]+)";/gm)) {
  const module = await import(new URL(match[2], pathToFileURL(process.cwd() + "/" + entrypoint)).href);
  for (const name of match[1].split(",").map(v => v.trim())) imports[name] = module[name];
}
const source = stripTypeScriptTypes(raw, { mode: "strip" }).replace(/^import[^\n]+\n/gm, "").replace(/^export (?=(?:async )?function|const)/gm, "");
const draft = { name: "Roman Knox", role: "The Outlaw", personality: "Roman is quietly confident, loyal and dependable. He speaks sparingly with dry humor and makes his own decisions.", relationship: "You have been friends since high school.", scenario: "Underground races, cars, parking lots and late-night drives.", firstMessage: 'Roman leaned against his black car at the race meet. "They changed the lineup. I am changing it back."' };
const opening = 'Roman put his entry card on the hood of his black car, then turned to the two drivers comparing the race order and told them, "Give my slot to someone else. I am done running their route." He turned the course map over and drew a shorter circuit with a marker. Two drivers stopped talking to look. Roman added, "They can keep the prize money. This one is for the people who actually showed up." He wrote his own name onto the new lineup, making the smaller race official before anyone could talk him out of it.';
const providerData = text => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] });

function runtime({ latencyMs = 0, rejectConfig = false, unavailable = false, structured = false, repairAfterUnsafe = false } = {}) {
  const start = Date.now();
  const scale = 50;
  class Clock extends Date { static now() { return start + (Date.now() - start) * scale; } }
  const requests = [], tables = [], logs = [];
  const user = { id: "fixture-owner", email: "fixture@example.invalid", user_metadata: {} };
  const client = { auth: { getUser: async () => ({ data: { user }, error: null }) }, from: table => {
    tables.push(table);
    assert.equal(table, "subscriptions", "Instant Story must not require conversation state or generation_requests");
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  }};
  const context = vm.createContext({ ...imports, TextEncoder, TextDecoder, ReadableStream, Response, Request, AbortController, DOMException, crypto: webcrypto, Date: Clock,
    setTimeout: (callback, ms, ...args) => setTimeout(callback, ms / scale, ...args), clearTimeout,
    createClient: () => client,
    console: { log: (...v) => logs.push(v), warn: (...v) => logs.push(v), error: (...v) => logs.push(v) },
    Deno: { env: { get: key => /^GEMINI_(?:MODEL|FALLBACK_MODEL|EMERGENCY_MODEL|RECOVERY_MODEL)$/.test(key) ? "fixture-model" : ({ SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_ANON_KEY: "fixture-public", SUPABASE_SERVICE_ROLE_KEY: "fixture-server", GEMINI_API_KEY: "fixture-provider" })[key] }, serve: handler => { context.handler = handler; } },
  });
  context.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    if (rejectConfig && body.generationConfig) return Response.json({ error: { code: 400, status: "INVALID_ARGUMENT", message: "Fixture rejects optional generation config" } }, { status: 400 });
    if (unavailable) return Response.json({ error: { code: 503, status: "UNAVAILABLE", message: "Fixture provider unavailable" } }, { status: 503 });
    const primaryUnsafe = repairAfterUnsafe && requests.length === 1;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, (repairAfterUnsafe ? (primaryUnsafe ? 6900 : 8000) : latencyMs) / scale);
      options.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("The signal has been aborted", "AbortError")); }, { once: true });
    });
    const text = primaryUnsafe ? `You sat in the passenger seat. ${opening}` : opening;
    return Response.json(providerData(structured ? JSON.stringify({ reply: text, thread_updates: [] }) : text));
  };
  vm.runInContext(source, context);
  return { context, requests, tables, logs };
}
async function generate(r, extra = {}) {
  const response = await r.context.handler(new Request("https://fixture/character-chat", { method: "POST", headers: { Authorization: "Bearer fixture", "Content-Type": "application/json" }, body: JSON.stringify({ action: "instant_story", draft, variationKey: "fresh-fixture", recentSceneSeeds: [], recentOpenings: [], ...extra }) }));
  return { response, data: await response.json() };
}

test("Fresh conversation + Instant Story + zero Living Threads must generate successfully.", async () => {
  const r = runtime({ latencyMs: 9600 });
  const { response, data } = await generate(r, { conversationId: "new-conversation", messages: [], memories: [], unresolved_threads: [], intelligence_state: {} });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, opening);
  assert.ok(r.requests.every(body => !body.generationConfig?.responseSchema), "Opening must not require Living Threads metadata");
  assert.deepEqual(r.tables, ["subscriptions"]);
});

test("Existing Instant Story remains usable with surviving history and threads", async () => {
  const r = runtime();
  const { response, data } = await generate(r, { conversationId: "existing-story", recentOpenings: ['Roman folded a diner receipt and told the waiter he would cover the bill. "Keep the change."'], messages: [{ id: "old-opening", sender: "character", content: "An older opening." }], unresolved_threads: [{ id: "promise", status: "open", title: "Roman promised to return a necklace." }] });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, opening);
  assert.deepEqual(r.tables, ["subscriptions"]);
});

test("Instant Story recovers from a provider rejecting optional generation config", async () => {
  const r = runtime({ rejectConfig: true });
  const { response, data } = await generate(r);
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, opening);
  assert.ok(r.requests.some(body => body.generationConfig));
  assert.ok(r.requests.some(body => !body.generationConfig));
});

test("Provider failures retain traceable technical diagnostics without exposing prompts", async () => {
  const r = runtime({ unavailable: true });
  const { response, data } = await generate(r);
  assert.equal(response.status, 503);
  assert.ok(data.requestId);
  assert.equal(data.engineVersion, "491");
  assert.ok(data.diagnostics?.attempts?.some(item => item.status === 503));
  assert.ok(!JSON.stringify(data.diagnostics).includes(draft.firstMessage));
});

test("Structured provider output yields prose without Living Threads leaking into an opening", async () => {
  const r = runtime({ structured: true });
  const { response, data } = await generate(r);
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, opening);
  assert.ok(!data.opening.includes("thread_updates"));
});

test("Frontend keeps a friendly message and bounded backend diagnostics", () => {
  const error = instantStoryError({ error: "Velvet couldn't create an Instant Story this time. Try again.", requestId: "trace-fixture", engineVersion: "491", rejectionReasons: ["invented_user_action_or_state"], diagnostics: { durationMs: 10000, attempts: [{ phase: "repair", model: "fixture-model", status: 0, code: "provider_timeout", error: "The signal has been aborted" }] }, draft, authorization: "never-log-this" }, { status: 503 });
  assert.equal(error.message, "Velvet couldn't create an Instant Story this time. Try again.");
  assert.equal(error.diagnostics.requestId, "trace-fixture");
  assert.equal(error.diagnostics.attempts[0].code, "provider_timeout");
  assert.equal(error.diagnostics.status, 503);
  assert.ok(!JSON.stringify(error.diagnostics).includes("never-log-this"));
  assert.ok(!JSON.stringify(error.diagnostics).includes(draft.firstMessage));
});

test("A rejected user-action draft gets a complete repair without the old 6.5-second abort", async () => {
  const r = runtime({ repairAfterUnsafe: true });
  const { response, data } = await generate(r);
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, opening);
  assert.equal(data.source, "ai_rescue");
  assert.ok(!data.opening.includes("You sat"));
  assert.equal(r.requests.length, 2);
});
