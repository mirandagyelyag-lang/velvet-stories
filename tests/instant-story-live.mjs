// Requires a separately provisioned, explicitly authorized, disposable fixture account.
// This runner never creates users or changes authentication settings. Revoke sessions
// and delete the fixture account and its cascaded data after collecting evidence.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { webcrypto, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const require = createRequire(process.cwd() + '/package.json');
const { createClient } = require('@supabase/supabase-js');
const credentialsPath = process.env.VELVET_INSTANT_TEST_ACCOUNT_JSON;
assert.ok(credentialsPath, 'Provide an explicitly authorized temporary account via VELVET_INSTANT_TEST_ACCOUNT_JSON');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
assert.match(credentials.marker, /^instant-story-live-[a-f0-9-]{36}$/);
assert.equal(credentials.email, `velvet-regression-${credentials.userId}@example.invalid`);
const source = fs.readFileSync('src/context/CharactersContext.jsx', 'utf8');
const chats = fs.readFileSync('src/context/ChatsContext.jsx', 'utf8');
const publicConfig = fs.readFileSync('src/services/supabase.js', 'utf8');
const key = publicConfig.match(/DEFAULT_SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)[1];
const url = 'https://vwyudrmxatuukcbncats.supabase.co';
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, options = {}) => fetch(input, { ...options, signal: options.signal || AbortSignal.timeout(20000) }) },
});
const { instantStoryError } = await import(pathToFileURL(process.cwd() + '/src/utils/instantStoryDiagnostics.js'));
const { instantStoryProseValidation } = await import(pathToFileURL(process.cwd() + '/supabase/functions/character-chat/engine/instant-story-prose.js'));
const evidencePath = '/tmp/velvet-instant-live-evidence.json';
const evidence = { startedAt: new Date().toISOString(), frontendVersion: JSON.parse(fs.readFileSync('package.json','utf8')).version, engineVersion: fs.readFileSync('supabase/functions/character-chat/index.ts','utf8').match(/VELVET_ENGINE_RELEASE = "([^"]+)"/)[1], execution: 'Actual frontend generation and persistence functions; authenticated production HTTP; live Gemini; no browser button click', userId: credentials.userId, characterId: credentials.characterId, cases: [], cleanup: null };
function checkpoint() { fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n'); }
function extract(text, start, end) { const a = text.indexOf(start); const b = text.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a); return text.slice(a, b); }
function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
async function read(table, id) {
  const query = supabase.from(table).select('*');
  const { data, error } = await (id ? query.eq('conversation_id', id) : query);
  if (error) throw new Error(`${table} read failed: ${error.message}`);
  return data;
}
let client;
let stage = 'authentication';
try {
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: credentials.email, password: credentials.password });
  if (authError) throw new Error(`Temporary account authentication failed: ${authError.message}`);
  assert.equal(auth.user.id, credentials.userId);
  assert.equal(auth.user.user_metadata?.test_fixture, credentials.marker, 'The authenticated user must be the isolated authorized fixture');
  console.log(JSON.stringify({ stage: 'authenticated', userId: auth.user.id }));

  stage = 'load-character';
  const { data: characterRow, error: charError } = await supabase.from('characters').select('*').eq('id', credentials.characterId).single();
  if (charError) throw new Error(`Roman fixture read failed: ${charError.message}`);
  assert.equal(characterRow.name, 'Roman Knox');
  const storage = new Map();
  const transport = [];
  client = vm.createContext({ supabase, user: auth.user, crypto: webcrypto, AbortController, setTimeout, clearTimeout, instantStoryError, instantStoryProseValidation, console,
    localStorage: { getItem: name => storage.get(name) ?? null, setItem: (name, value) => storage.set(name, value) },
    createConversationTitle: () => 'Temporary Instant Story validation',
    convertDatabaseMessage: row => row,
    fetch: async (input, options) => {
      const request = JSON.parse(options.body);
      const started = Date.now();
      const response = await fetch(input, options);
      const body = await response.clone().json().catch(() => ({}));
      fs.writeFileSync('/tmp/velvet-instant-live-last-response.json', JSON.stringify(body,null,2));
      transport.push({ requestId: request.variationKey, status: response.status, durationMs: Date.now() - started, engineVersion: body.engineVersion, model: body.model, source: body.source, sceneSeed: body.sceneSeed, response: body, recentOpeningCount: request.recentOpenings.length });
      console.log(JSON.stringify({ stage: 'provider-response', requestId: request.variationKey, status: response.status, model: body.model, source: body.source, durationMs: Date.now() - started }));
      return response;
    },
  });
  const generation = extract(source, '  async function generateInstantStory(', '\n  async function deleteCharacter(').replace(/\n\s*import\.meta\.env\.VITE_SUPABASE_(?:ANON_KEY|PUBLISHABLE_KEY)\s*\|\|/g, '');
  vm.runInContext([
    extract(source, 'function characterDraftPayload(', '\nasync function readCharacterFunctionError('),
    extract(source, 'function convertDatabaseCharacter(', '\nexport function useCharacters('),
    generation,
    extract(chats, '  async function createConversation(', '\n  async function loadConversationMessages('),
    extract(chats, '  async function createFirstMessage(', '\n  async function bumpStoryRevision('),
  ].join('\n'), client);
  const character = client.convertDatabaseCharacter(characterRow);
  const [initialMessages, initialMemories, initialConversations, initialGenerationRequests] = await Promise.all(['messages','memories','conversations','generation_requests'].map(table => read(table)));
  const initial = { messages: initialMessages.length, memories: initialMemories.length, conversations: initialConversations.length, generationRequests: initialGenerationRequests.length };
  assert.deepEqual(initial, { messages: 0, memories: 0, conversations: 0, generationRequests: 0 });
  evidence.initialState = initial; checkpoint();
  console.log(JSON.stringify({ stage: 'zero-state-confirmed', ...initial }));

  for (const name of ['Fresh conversation + Instant Story + zero Living Threads must generate successfully.', 'Existing Instant Story stays readable and another opening can be generated with prior opening history.']) {
    stage = name;
    const before = (await read('conversations')).map(row => ({ row, messages: null }));
    for (const item of before) item.messages = await read('messages', item.row.id);
    const beforeHash = hash(before);
    const opening = await client.generateInstantStory(character);
    const last = transport.at(-1);
    assert.equal(last.status, 200);
    assert.equal(last.engineVersion, evidence.engineVersion);
    assert.ok(opening.split(/\s+/).length >= 55);
    const conversation = await client.createConversation({ ...character, firstMessage: opening }, { isAdditional: true, title: `Temporary Instant Story validation ${evidence.cases.length + 1}` });
    const [emptyMessages, emptyMemories] = await Promise.all(['messages','memories'].map(table => read(table,conversation.id)));
    const empty = { messages: emptyMessages.length, memories: emptyMemories.length, threads: conversation.unresolved_threads.length, v1State: Boolean(conversation.intelligence_state?.living_threads_v1) };
    assert.deepEqual(empty, { messages: 0, memories: 0, threads: 0, v1State: false });
    const first = await client.createFirstMessage(conversation.id, { ...character, firstMessage: opening });
    assert.equal(first.content, opening);
    const reloaded = await read('messages', conversation.id);
    assert.equal(reloaded.length, 1); assert.equal(reloaded[0].content, opening);
    const after = [];
    for (const item of before) {
      const { data: row, error } = await supabase.from('conversations').select('*').eq('id', item.row.id).single();
      if (error) throw error;
      after.push({ row, messages: await read('messages', row.id) });
    }
    assert.equal(hash(after), beforeHash, 'Existing story and its saved opening must remain unchanged');
    assert.equal((await read('generation_requests')).length, 0, 'Instant Story must not require a generation_request');
    const result = { name, passed: true, requestId: last.requestId, status: last.status, engineVersion: last.engineVersion, model: last.model, source: last.source, durationMs: last.durationMs, words: opening.split(/\s+/).length, openingSha256: hash(opening), conversationId: conversation.id, initialConversationState: empty, persistedMessages: reloaded.length, recentOpeningCount: last.recentOpeningCount, priorStoriesPreserved: before.length };
    evidence.cases.push(result); checkpoint();
    fs.writeFileSync(`/tmp/velvet-instant-live-opening-${evidence.cases.length}.txt`, opening + '\n');
    console.log(JSON.stringify(result));
  }
  evidence.completedAt = new Date().toISOString(); evidence.passed = true; checkpoint();
} catch (error) {
  evidence.passed = false; evidence.failure = { stage, name: error?.name, message: String(error?.message || error).slice(0,500), diagnostics: error?.diagnostics };
  evidence.completedAt = new Date().toISOString(); checkpoint();
  console.error(JSON.stringify(evidence.failure)); process.exitCode = 1;
} finally {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  evidence.signedOut = !error; if (error) evidence.signOutError = error.message;
  checkpoint(); console.log(JSON.stringify({ stage: 'session-sign-out', success: !error }));
}
