import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import { pathToFileURL } from "node:url";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { CHASE_APPROVED_OPENING, chaseOpeningIssues, NATHAN_APPROVED_OPENING, buildInstantStoryIdentity, nathanOpeningIssues, ALEXANDER_APPROVED_OPENING, SCENE_PRESENCE_CONTRACT, SHARED_YEARNING_CONTRACT } from "../supabase/functions/character-chat/engine/instant-story-identity.js";
import { instantStoryError } from "../src/utils/instantStoryDiagnostics.js";
import { instantStoryProseValidation } from "../supabase/functions/character-chat/engine/instant-story-prose.js";

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

function runtime({ latencyMs = 0, rejectConfig = false, unavailable = false, structured = false, repairAfterUnsafe = false, distinctRecovery = false, transientOnce = false, markdown = false, truncated = false, providerTexts = null, canonicalProfile = null } = {}) {
  const start = Date.now();
  const scale = 50;
  class Clock extends Date { static now() { return start + (Date.now() - start) * scale; } }
  const requests = [], modelRequests = [], tables = [], logs = [];
  const user = { id: "fixture-owner", email: "fixture@example.invalid", user_metadata: {} };
  const client = { auth: { getUser: async () => ({ data: { user }, error: null }) }, from: table => {
    tables.push(table);
    if (table === 'characters' && canonicalProfile) {
      const query = { select: () => query, eq: (key, value) => {
        if (key === 'user_id') assert.equal(value, user.id);
        if (key === 'name') assert.equal(value, canonicalProfile.name);
        return query;
      }, is: () => query, limit: async () => ({ data: [canonicalProfile], error: null }) };
      return query;
    }
    assert.equal(table, "subscriptions", "Instant Story must not require conversation state or generation_requests");
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  }};
  const context = vm.createContext({ ...imports, TextEncoder, TextDecoder, ReadableStream, Response, Request, AbortController, DOMException, crypto: webcrypto, Date: Clock,
    setTimeout: (callback, ms, ...args) => setTimeout(callback, ms / scale, ...args), clearTimeout,
    createClient: () => client,
    console: { log: (...v) => logs.push(v), info: (...v) => logs.push(v), warn: (...v) => logs.push(v), error: (...v) => logs.push(v) },
    Deno: { env: { get: key => /^GEMINI_(?:MODEL|FALLBACK_MODEL|EMERGENCY_MODEL|RECOVERY_MODEL|INSTANT_RECOVERY_MODEL)$/.test(key) ? (distinctRecovery && key === "GEMINI_INSTANT_RECOVERY_MODEL" ? "fixture-recovery" : "fixture-model") : ({ SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_ANON_KEY: "fixture-public", SUPABASE_SERVICE_ROLE_KEY: "fixture-server", GEMINI_API_KEY: "fixture-provider" })[key] }, serve: handler => { context.handler = handler; } },
  });
  let completedProviderResponses = 0;
  context.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    const model = String(_url).match(/models\/([^/:?]+)/)?.[1]; modelRequests.push(model);
    if (rejectConfig && body.generationConfig) return Response.json({ error: { code: 400, status: "INVALID_ARGUMENT", message: "Fixture rejects optional generation config" } }, { status: 400 });
    if (unavailable) return Response.json({ error: { code: 503, status: "UNAVAILABLE", message: "Fixture provider unavailable" } }, { status: 503 });
    if (distinctRecovery && model !== "fixture-recovery") return Response.json({ error: { code: 503, status: "UNAVAILABLE", message: "Fixture Lite model overloaded" } }, { status: 503 });
    if (transientOnce && requests.length === 1) return Response.json({ error: { code: 503, status: "UNAVAILABLE", message: "Fixture transient overload" } }, { status: 503 });
    const primaryUnsafe = repairAfterUnsafe && requests.length === 1;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, (repairAfterUnsafe ? (primaryUnsafe ? 6900 : 8000) : latencyMs) / scale);
      options.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("The signal has been aborted", "AbortError")); }, { once: true });
    });
    let text = providerTexts ? providerTexts[Math.min(completedProviderResponses++, providerTexts.length - 1)] : primaryUnsafe ? `You sat in the passenger seat. ${opening}` : opening;
    if (markdown) text = `*${text}*`;
    if (truncated) text = opening.slice(0, -18);
    return Response.json(providerData(structured ? JSON.stringify({ reply: text, thread_updates: [] }) : text));
  };
  vm.runInContext(source, context);
  return { context, requests, modelRequests, tables, logs };
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
  assert.equal(data.engineVersion, "494");
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
  const error = instantStoryError({ error: "Velvet couldn't create an Instant Story this time. Try again.", requestId: "trace-fixture", engineVersion: "494", rejectionReasons: ["invented_user_action_or_state"], diagnostics: { durationMs: 10000, attempts: [{ phase: "repair", model: "fixture-model", status: 0, code: "provider_timeout", error: "The signal has been aborted" }] }, draft, authorization: "never-log-this" }, { status: 503 });
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

test("Fresh Instant Story uses the configured recovery model when Lite models produce no draft", async () => {
  const r = runtime({ distinctRecovery: true });
  const { response, data } = await generate(r, { messages: [], memories: [], unresolved_threads: [] });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, opening);
  assert.equal(data.model, "fixture-recovery");
  assert.ok(r.modelRequests.includes("fixture-recovery"));
  assert.ok(r.logs.some(entry => entry[0].includes("instant_story_completed")));
});

test("A transient Gemini 503 recovers inside the original request budget", async () => {
  const r = runtime({ transientOnce: true });
  const { response, data } = await generate(r);
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, opening);
  assert.equal(r.requests.length, 2);
  assert.ok(r.logs.some(entry => entry[1]?.code === "transient_retry"));
});

test("Balanced Markdown in Gemini prose produces a complete usable opening", async () => {
  const r = runtime({ markdown: true });
  const { response, data } = await generate(r);
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, opening);
  assert.equal(instantStoryProseValidation(data.opening).valid, true);
});

test("A truncated provider draft cannot escape as HTTP 200 through a last-resort lane", async () => {
  const r = runtime({ truncated: true });
  const { response, data } = await generate(r);
  assert.equal(response.status, 503, JSON.stringify(data));
  assert.ok(!data.opening);
});

test("Actual frontend retains backend trace details when HTTP 200 contains invalid prose", async () => {
  const clientSource = fs.readFileSync('src/context/CharactersContext.jsx', 'utf8');
  const start = clientSource.indexOf('  async function generateInstantStory(');
  const end = clientSource.indexOf('\n  async function deleteCharacter(', start);
  const fn = clientSource.slice(start, end).replace(/\n\s*import\.meta\.env\.VITE_SUPABASE_(?:ANON_KEY|PUBLISHABLE_KEY)\s*\|\|/g, '');
  const logs = [];
  const context = vm.createContext({
    supabase: { supabaseUrl: 'https://fixture.supabase.co', supabaseKey: 'fixture-public', auth: { getSession: async () => ({ data: { session: { access_token: 'fixture-session' } } }) } },
    localStorage: { getItem: () => '[]', setItem: () => {} },
    crypto: webcrypto, AbortController, setTimeout, clearTimeout, instantStoryError, instantStoryProseValidation,
    characterDraftPayload: value => value,
    console: { error: (...values) => logs.push(values) },
    fetch: async () => Response.json({ opening: opening.slice(0,-18), requestId: 'provider-trace', engineVersion: '494', model: 'fixture-model', source: 'ai_last_resort' }),
  });
  vm.runInContext(fn, context);
  await assert.rejects(context.generateInstantStory(draft), error => {
    assert.match(error.message, /cut-off Instant Story/);
    assert.equal(error.diagnostics.requestId, 'provider-trace');
    assert.equal(error.diagnostics.engineVersion, '494');
    assert.equal(error.diagnostics.source, 'ai_last_resort');
    assert.equal(error.diagnostics.model, 'fixture-model');
    assert.equal(error.diagnostics.status, 200);
    assert.equal(error.diagnostics.code, 'incomplete_provider_opening');
    assert.equal(error.diagnostics.complete, false);
    assert.ok(!JSON.stringify(error.diagnostics).includes(opening.slice(0,-18)));
    return true;
  });
  assert.equal(logs[0][1].requestId, 'provider-trace');
});

test("Fresh racing dialogue with explicitly staged drivers is not mistaken for floating dialogue", () => {
  const r = runtime();
  const staged = opening.replace(' and told them,', ',');
  assert.ok(!r.context.instantStoryGroundingIssuesV35292(staged, draft, '').includes('ambiguous_first_dialogue_addressee'));
  const floating = 'Roman checked the lineup. "Give my slot to someone else."';
  assert.ok(r.context.instantStoryGroundingIssuesV35292(floating, draft, '').includes('ambiguous_first_dialogue_addressee'));
  assert.ok(r.context.instantStoryGroundingIssuesV35292('You sat in the car. ' + staged, draft, '').includes('invented_user_action_or_state'));
});


const chaseDraft = { name: "Chase", role: "Campus Heartthrob", personality: "Socially desired, receptive and emotionally unpredictable.", relationship: "Drawn to you without settled feelings.", emotionalDna: { official_engine: "chase_electricity_v1" } };
const rejectedLibraryOpening = `Chase sat on the low stone wall outside the Westbridge library, tossing his keys from palm to palm with a steady, repetitive click-clack of metal against metal. A pair of sophomores lingered a few feet away, debating the syllabus for midterm week, their voices loud and bright in the cool afternoon air.
He didn’t look at them when you stopped near the edge of the walk. The keys stopped moving, his fingers closing tight over the ring.
“Decided to join the living, then?”
Chase shifted, his shoulder brushing the rough brick behind him. The easy, performative grin didn't quite reach his eyes, his thumb tracing the jagged teeth of his house key.
“Good. I was running out of things to pretend to care about.”`;

test("Chase repairs the reported library opening before any deadline or generic fallback", async () => {
  const r = runtime({ providerTexts: [rejectedLibraryOpening, CHASE_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: chaseDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.source, "ai_chase_repair");
  assert.equal(data.opening, CHASE_APPROVED_OPENING);
  assert.equal(r.requests.length, 2);
  const repairPrompt = r.requests[1].contents[0].parts[0].text;
  assert.ok(repairPrompt.includes('DRAFT: '+rejectedLibraryOpening));
  assert.ok(repairPrompt.includes('invented_user_entrance'));
  assert.ok(repairPrompt.includes('chase_detached_bored_charmer'));
  assert.ok(!data.opening.includes('when you stopped'));
});

test("Chase's detached boredom gets a revision even when the draft is complete and agency-safe", async () => {
  const safeButFlat = rejectedLibraryOpening.replace('when you stopped near the edge of the walk', 'before he spoke');
  const r = runtime({ providerTexts: [safeButFlat, CHASE_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: chaseDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.source, 'ai_chase_repair');
  assert.equal(data.opening, CHASE_APPROVED_OPENING);
});

test("Chase editorial repair remains bounded when a provider cannot improve a safe draft", async () => {
  const safeButFlat = rejectedLibraryOpening.replace('when you stopped near the edge of the walk', 'before he spoke');
  const r = runtime({ providerTexts: [safeButFlat] });
  const { response, data } = await generate(r, { draft: chaseDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(r.requests.length, 2);
  assert.ok(data.softWarnings.includes('chase_detached_bored_charmer'));
});

test("The approved Chase rhythm remains usable and the targeted quality check does not apply to other characters", async () => {
  const r = runtime({ providerTexts: [CHASE_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: chaseDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.source, 'ai_chase_edit');
  assert.equal(r.requests.length, 2);
  assert.deepEqual(chaseOpeningIssues(rejectedLibraryOpening, draft), []);
});


const packetOpening = `Chase tossed a set of heavy brass keys onto the Westbridge admissions desk with a dull clatter that made the student worker behind the counter blink. Half a dozen registration forms fanned out across the polished wood.
“Sign your life away on page four and nobody gets hurt,” Chase muttered.
He didn't look at the freshman clutching a clipboard next to him, even when she giggled and nudged his elbow with hers. His thumb hooked into the belt loop of his jeans, staring straight past the stack of papers.
“Or don't,” he added, his voice dropping flat as his gaze found you. “Honestly, the line is moving too fast anyway.”
He pushed off the counter, leaving the registration forms where they lay, and took two steps into the narrow aisle between the pamphlet racks.
“Take these,” Chase said, grabbing the top three stapled packets and shoving them unceremoniously toward you before his fingers could hesitate.`;

test("Chase's reported packet scene is edited even without triggering a lexical quality heuristic", async () => {
  assert.deepEqual(chaseOpeningIssues(packetOpening, chaseDraft), []);
  const r = runtime({ providerTexts: [packetOpening, CHASE_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: chaseDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.source, 'ai_chase_edit');
  assert.equal(data.opening, CHASE_APPROVED_OPENING);
  assert.equal(r.requests.length, 2);
  const prompt = r.requests[1].contents[0].parts[0].text;
  assert.ok(prompt.includes('DRAFT TO EDIT\n'+packetOpening));
  assert.ok(prompt.includes('What does Chase personally want with the user right now?'));
});

test("Chase editor cannot replace a safe opening with authored user entrance", async () => {
  const r = runtime({ providerTexts: [CHASE_APPROVED_OPENING, rejectedLibraryOpening] });
  const { response, data } = await generate(r, { draft: chaseDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, CHASE_APPROVED_OPENING);
  assert.ok(data.softWarnings.includes('chase_revision_unavailable'));
  assert.equal(r.requests.length, 2);
});


const nathanDraft = { name: 'Nathan', role: "24-year-old university student and brother's best friend", relationship: "Her brother's best friend, guarded with others, familiar with her; forbidden slow burn.", emotionalDna: { official_engine: 'nathan_exception_v1' } };

test("Nathan uses his approved exception sample and edits a complete generic draft without borrowing Chase's engine", async () => {
  const generic = packetOpening.replaceAll('Chase', 'Nathan').replace('“Sign your life', 'Nathan said to you, “Sign your life');
  const r = runtime({ providerTexts: [generic, NATHAN_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: nathanDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.source, 'ai_nathan_edit');
  assert.equal(data.opening, NATHAN_APPROVED_OPENING);
  assert.equal(r.requests.length, 2);
  const first = r.requests[0].contents[0].parts[0].text;
  const editor = r.requests[1].contents[0].parts[0].text;
  assert.ok(first.includes(NATHAN_APPROVED_OPENING));
  assert.ok(first.includes('HER brother'));
  assert.ok(!first.includes(CHASE_APPROVED_OPENING));
  assert.ok(editor.includes('DRAFT TO EDIT\n'+generic));
  assert.ok(data.sceneSeed.includes('FOCUS=nathan_exception'));
});

test("Nathan's approved opening survives generation and editorial transport unchanged", async () => {
  const r = runtime({ providerTexts: [NATHAN_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: nathanDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, NATHAN_APPROVED_OPENING);
  assert.equal(data.source, 'ai_nathan_edit');
  assert.ok(buildInstantStoryIdentity(nathanDraft).includes(NATHAN_APPROVED_OPENING));
});

test("Nathan editor cannot script the user's arrival and preserves the safe opening", async () => {
  const r = runtime({ providerTexts: [NATHAN_APPROVED_OPENING, 'When you stopped at the table, '+NATHAN_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: nathanDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, NATHAN_APPROVED_OPENING);
  assert.ok(data.softWarnings.includes('nathan_revision_unavailable'));
});


const rejectedArchiveOpening = `Nathan sets his heavy espresso cup down in the quiet corner of the faculty archive, deliberately spacing it half an inch from his leather notebook. Two graduate students lingering by the microfilm scanner glance his way, whispering before turning back toward the stacks. He ignores them, sliding a set of uncatalogued architectural folios across the oak table toward you.
“Your brother asked me to drop these off before the seminar,” he says, his voice flat and unhurried. “He forgot them in the car.”
He taps a finger against the edge of the stiff paper, then pauses, his hand hovering an inch too long near yours.
“The restricted section upstairs is open for another hour. I have the keycard.” He looks down at the table, his thumb tracing the seam of his cuff before he withdraws his hand entirely. “If you want to see the original maps before the weekend crowds get in.”`;

test("Nathan repairs the reported archive/errand scene instead of treating restricted access as intimacy", async () => {
  const r = runtime({ providerTexts: [rejectedArchiveOpening, NATHAN_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: nathanDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.source, 'ai_nathan_repair');
  assert.equal(data.opening, NATHAN_APPROVED_OPENING);
  assert.ok(r.requests[1].contents[0].parts[0].text.includes(rejectedArchiveOpening));
  assert.ok(r.requests[1].contents[0].parts[0].text.includes('nathan_literal_access_instead_of_personal_exception'));
});

test("Nathan's final editor cannot substitute the archive scene for an approved personal exception", async () => {
  const r = runtime({ providerTexts: [NATHAN_APPROVED_OPENING, rejectedArchiveOpening] });
  const { response, data } = await generate(r, { draft: nathanDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, NATHAN_APPROVED_OPENING);
  assert.ok(data.softWarnings.includes('nathan_revision_unavailable'));
});

test("Nathan's targeted substitution check honors an explicit user idea and does not apply to Chase", () => {
  assert.deepEqual(nathanOpeningIssues(rejectedArchiveOpening, nathanDraft, 'Faculty archive, keycard. Your brother asked me to drop these off.'), []);
  assert.deepEqual(nathanOpeningIssues(rejectedArchiveOpening, chaseDraft), []);
});


test("Nathan's deadline fallback cannot silently redeliver the rejected archive scene", async () => {
  const r = runtime({ providerTexts: [rejectedArchiveOpening] });
  const { response, data } = await generate(r, { draft: nathanDraft });
  assert.equal(response.status, 503, JSON.stringify(data));
  assert.ok(!data.opening);
  assert.ok(data.rejectionReasons.includes('nathan_literal_access_instead_of_personal_exception'));
  assert.equal(r.requests.length, 2);
});


test("Nathan repairs on the recovery model that produced a draft while other configured models are unavailable", async () => {
  const r = runtime({ distinctRecovery: true, providerTexts: ['When you stopped beside the table, '+NATHAN_APPROVED_OPENING, NATHAN_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: nathanDraft });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.source, 'ai_nathan_repair');
  assert.equal(data.model, 'fixture-recovery');
  assert.equal(data.opening, NATHAN_APPROVED_OPENING);
  const repairIndex = r.requests.findIndex(body => body.contents[0].parts[0].text.includes('CURRENT PASS: nathan_repair'));
  assert.ok(repairIndex >= 0);
  assert.equal(r.modelRequests[repairIndex], 'fixture-recovery');
  assert.equal(r.modelRequests.slice(repairIndex).filter(model => model === 'fixture-model').length, 0);
});


const alexanderProfile = { name: 'Alexander Bennett', role: 'Campus King', personality: 'Confident, playful, loyal and thoughtful.', relationship: 'Close friends for years; open affection without assumed reciprocation.', emotional_dna: { official_engine: 'alexander_devotion_v1' } };

test("Alexander's approved balcony opening survives his persisted-profile and editor routes", async () => {
  const r = runtime({ canonicalProfile: alexanderProfile, providerTexts: [ALEXANDER_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: { name: 'Alexander Bennett', emotionalDna: { official_engine: 'chase_electricity_v1' } } });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.source, 'ai_alexander_edit');
  assert.equal(data.opening, ALEXANDER_APPROVED_OPENING);
  assert.ok(data.sceneSeed.includes('FOCUS=alexander_devotion'));
  assert.ok(r.requests.every(body => body.contents[0].parts[0].text.includes(SCENE_PRESENCE_CONTRACT)));
  assert.ok(r.requests.every(body => body.contents[0].parts[0].text.includes(SHARED_YEARNING_CONTRACT)));
});

test("All Instant Story characters receive static presence and speaker clarity without scripting user actions", async () => {
  const r = runtime();
  const { response } = await generate(r);
  assert.equal(response.status, 200);
  const prompt = r.requests[0].contents[0].parts[0].text;
  assert.ok(prompt.includes(SCENE_PRESENCE_CONTRACT));
  assert.ok(prompt.includes('static starting presence and location'));
  assert.ok(prompt.includes('Never invent the user'));
  assert.ok(prompt.includes('speaker or addressee changes'));
});

test("Alexander's static initial location is allowed without authoring an arrival", async () => {
  const opening = 'You are already on the balcony. '+ALEXANDER_APPROVED_OPENING;
  const r = runtime({ canonicalProfile: alexanderProfile, providerTexts: [opening] });
  const { response, data } = await generate(r, { draft: { name: 'Alexander Bennett' } });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, opening);
});


test("Speaker clarity accepts the approved doorway exchange but still rejects an unowned NPC switch", () => {
  assert.ok(!imports.speakerOwnershipIssuesV35367(ALEXANDER_APPROVED_OPENING, alexanderProfile).includes('ambiguous_multi_speaker_dialogue'));
  const unclear = 'Alex said to you, “I wanted to stay.” A friend leaned against the railing. “That was a mistake.”';
  assert.ok(imports.speakerOwnershipIssuesV35367(unclear, alexanderProfile).includes('ambiguous_multi_speaker_dialogue'));
});

test("Static presence permission does not permit inventing the user's movement in Alexander's editor", async () => {
  const r = runtime({ canonicalProfile: alexanderProfile, providerTexts: [ALEXANDER_APPROVED_OPENING, 'When you arrived on the balcony, '+ALEXANDER_APPROVED_OPENING] });
  const { response, data } = await generate(r, { draft: { name: 'Alexander Bennett' } });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.opening, ALEXANDER_APPROVED_OPENING);
  assert.ok(data.softWarnings.includes('alexander_revision_unavailable'));
});
