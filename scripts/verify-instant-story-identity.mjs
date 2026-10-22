import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  buildInstantStoryIdentity,
  CHASE_ELECTRICITY_ENGINE,
  CHASE_OPENING_VARIETY_RULE,
  NATHAN_EXCEPTION_ENGINE,
  ALEXANDER_DEVOTION_ENGINE,
  SCENE_PRESENCE_CONTRACT,
} from '../supabase/functions/character-chat/engine/instant-story-identity.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS  ${name}`); }
  catch (error) { failed++; console.error(`FAIL  ${name}: ${error.message}`); }
}
const pilot = {
  name: 'A', role: 'Piloto', world: 'Circuito',
  coreMotivation: 'Ganar con su propio diseño', values: 'Juego limpio',
  fears: 'Depender de patrocinadores', habits: 'Dibuja mejoras',
  contradictions: 'Competitiva pero generosa', emotionalDefense: 'Se refugia en el trabajo',
  softeningTriggers: 'Respeto por su oficio', growthDirection: 'Aprender a delegar',
  firstMessage: 'Circuito '.repeat(120),
  exampleDialogue: 'No cambies la presión. Primero medimos.',
};
test('empty profile has no invented identity', () => assert.equal(buildInstantStoryIdentity({}, 'empty'), ''));
test('sparse profile retains its creator text', () => {
  assert.ok(buildInstantStoryIdentity({ values: 'Solo un rasgo' }, 'x', ['FOCUS=values\n']).includes('Solo un rasgo'));
});
test('identity selection is deterministic', () => {
  assert.equal(buildInstantStoryIdentity(pilot, 'stable'), buildInstantStoryIdentity(pilot, 'stable'));
});
test('different creators produce different directions', () => {
  const musician = { name: 'B', role: 'Violinista', coreMotivation: 'Rescatar partituras olvidadas', values: 'Memoria cultural' };
  assert.notEqual(buildInstantStoryIdentity(pilot, 'same'), buildInstantStoryIdentity(musician, 'same'));
});
test('rotate six distinct creator facets before reuse', () => {
  const history = [];
  const focuses = new Set();
  for (let n = 0; n < 6; n++) {
    const direction = buildInstantStoryIdentity(pilot, `variation-${n}`, history);
    const focus = direction.match(/^FOCUS=(\\w+)/)?.[1];
    assert.ok(focus, 'Missing focus tag');
    assert.ok(!focuses.has(focus), `Repeated focus: ${focus}`);
    assert.ok(direction.includes(pilot[focus]), 'Creator text lost');
    focuses.add(focus);
    history.push(direction);
  }
});
test('official Chase/Nathan/Alexander engines stay distinct', () => {
  const ids = ['chase_electricity_v1', 'nathan_exception_v1', 'alexander_devotion_v1'];
  const prompts = ids.map(official_engine => buildInstantStoryIdentity({ emotional_dna: { official_engine } }, 'same'));
  assert.equal(new Set(prompts).size, 3);
  assert.ok(prompts[0].includes(CHASE_ELECTRICITY_ENGINE));
  assert.ok(prompts[1].includes(NATHAN_EXCEPTION_ENGINE));
  assert.ok(prompts[2].includes(ALEXANDER_DEVOTION_ENGINE));
});
test('Chase anti-car-order constraint remains explicit', () => {
  assert.match(CHASE_OPENING_VARIETY_RULE, /You're coming with me|Come with me/);
  assert.match(CHASE_ELECTRICITY_ENGINE, /ELECTRICITY/);
});
test('scene continuity and user agency remain explicit', () => {
  assert.match(SCENE_PRESENCE_CONTRACT, /never reset or teleport/i);
  assert.match(SCENE_PRESENCE_CONTRACT, /Never invent the user's arrival/i);
});

// Integration checks must fail clearly when the deployed entrypoint source is absent.
let edge = '';
try { edge = readFileSync(new URL('../supabase/functions/character-chat/index.ts', import.meta.url), 'utf8'); }
catch (error) { console.error(`FAIL  Cannot read character-chat/index.ts: ${error.message}`); failed++; }
if (!edge.trim()) {
  console.error('FAIL  character-chat/index.ts is missing or empty: identity wiring and draft compaction NOT verified.');
  failed++;
} else {
  const begin = edge.indexOf('function compactInstantStoryDraft(');
  const end = edge.indexOf('export function instantStoryFallbackOpening(', begin);
  if (begin < 0 || end <= begin) {
    console.error('FAIL  Draft compaction extraction markers missing or reordered.');
    failed++;
  } else {
    test('creator traits survive draft compaction', () => {
      const compactSource = edge.slice(begin, end);
      const compact = vm.runInNewContext(`${compactSource};compactInstantStoryDraft`, {
        cleanPromptValue: (value, limit) => String(value || '').trim().slice(0, limit),
      });
      const preserved = compact(pilot);
      for (const key of ['values', 'fears', 'habits', 'contradictions', 'coreMotivation', 'emotionalDefense', 'softeningTriggers', 'growthDirection']) {
        assert.equal(preserved[key], pilot[key], `${key} survives compaction`);
      }
      assert.ok(preserved.firstMessage.length > 520);
      assert.equal(preserved.exampleDialogue, pilot.exampleDialogue);
    });
  }
  for (const [name, snippet] of [
    ['identity direction wired into prompt', 'identityDirection].filter(Boolean).join'],
    ['recent openings avoidance wired', 'RECENT OPENINGS TO AVOID'],
    ['emotional DNA retained', 'emotional_dna: source?.emotional_dna'],
    ['prompt excludes prewritten firstMessage', 'const promptDraft = { ...safeDraft, firstMessage: "" }'],
  ]) {
    test(name, () => assert.ok(edge.includes(snippet), `Missing integration snippet: ${snippet}`));
  }
}
console.log(`\nInstant Story identity audit: ${passed} passed, ${failed} failed.`);
console.log('NOTE: Prompt identity checks do not prove generated prose follows the profile; live story evaluation remains necessary.');
if (failed) process.exitCode = 1;
