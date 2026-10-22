import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as nodeModule from 'node:module';

const sourcePath = new URL('../supabase/functions/character-chat/index.ts', import.meta.url);
let source;
try { source = readFileSync(sourcePath, 'utf8'); }
catch (error) {
  console.error(`BLOCKED: Cannot read character-chat/index.ts: ${error.message}`);
  process.exit(1);
}
if (!source.trim()) {
  console.error('BLOCKED: character-chat/index.ts is empty; quota fallback cannot be tested.');
  process.exit(1);
}
if (typeof nodeModule.stripTypeScriptTypes !== 'function') {
  console.error('BLOCKED: Node.js does not support stripTypeScriptTypes (use Node 22.13+).');
  process.exit(1);
}
const start = source.indexOf('  const quotaUnavailableModels =');
const next = start < 0 ? -1 : source.indexOf('  const attempt = async', start);
if (start < 0 || next <= start) {
  console.error('BLOCKED: requestOpening quota block markers changed or disappeared.');
  process.exit(1);
}
const raw = source.slice(start, next);
const tail = raw.lastIndexOf('\n  };');
if (tail < 0 || !raw.includes('requestOpening')) {
  console.error('BLOCKED: Cannot isolate requestOpening safely; update extraction to match the engine.');
  process.exit(1);
}
const block = raw.slice(0, tail + 5);
let fnFactory;
try {
  fnFactory = nodeModule.stripTypeScriptTypes(block, { mode: 'strip' });
} catch (error) {
  console.error(`BLOCKED: requestOpening syntax invalid: ${error.message}`);
  process.exit(1);
}

const complete = 'Chase crossed the crowded room without waiting for his friends. He set the abandoned invitation on the table, looked at you, and asked what you thought of the party.';
const scenarios = [
  { name: '429 switches to Lite', responses: { exhausted: [429], lite: [200] }, expected: ['exhausted', 'lite'] },
  { name: '429 then Lite 429 uses emergency', responses: { exhausted: [429], lite: [429], emergency: [200] }, expected: ['exhausted', 'lite', 'emergency'] },
  { name: 'primary success avoids fallback', responses: { primary: [200] }, expected: ['primary'] },
];
let passed = 0;
let failed = 0;
async function runScenario(scenario) {
  const calls = [];
  const events = [];
  const responses = Object.fromEntries(Object.entries(scenario.responses).map(([key, values]) => [key, [...values]]));
  const context = {
    deadlineAt: Date.now() + 30000, AbortController, DOMException, setTimeout, clearTimeout,
    controllers: new Set(), GEMINI_FALLBACK_MODEL: 'lite', GEMINI_EMERGENCY_MODEL: 'emergency',
    apiKey: 'fake-test-key', primaryWinnerFound: false,
    diagnose: (...args) => events.push(args), getErrorMessage: error => error?.message || String(error),
    geminiHeaders: () => ({}), modelEndpoint: model => model,
    fetch: async model => {
      calls.push(model);
      const status = responses[model]?.shift() ?? 500;
      return {
        ok: status >= 200 && status < 300, status,
        json: async () => status === 200
          ? { candidates: [{ content: { parts: [{ text: complete }] }, finishReason: 'STOP' }] }
          : { error: { code: status, message: 'Simulated provider failure' } },
        text: async () => JSON.stringify({ error: { code: status } }),
      };
    },
  };
  const fn = vm.runInNewContext(`${fnFactory};requestOpening`, context);
  await fn({ model: scenario.name.includes('primary') ? 'primary' : 'exhausted',
    prompt: 'test', phase: 'salvage', timeoutMs: 5000, maxOutputTokens: 200, temperature: 0.1 });
  assert.deepEqual(calls, scenario.expected, `${scenario.name}: unexpected model attempts`);
  assert.ok(calls.length <= 3, `${scenario.name}: possible retry loop`);
  return { calls, events };
}
for (const scenario of scenarios) {
  try {
    const result = await runScenario(scenario);
    console.log(`PASS  ${scenario.name} (${result.calls.join(' -> ')})`);
    passed++;
  } catch (error) {
    console.error(`FAIL  ${scenario.name}: ${error.stack || error.message}`);
    failed++;
  }
}
console.log(`\nQuota fallback integration: ${passed} passed, ${failed} failed.`);
console.log('NOTE: Simulated provider responses do not prove live API availability or final story delivery.');
if (failed) process.exitCode = 1;
