import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { buildInstantStoryIdentity } from '../supabase/functions/character-chat/engine/instant-story-identity.js';
const edge = readFileSync(new URL('../supabase/functions/character-chat/index.ts', import.meta.url), 'utf8');
const compactSource = edge.slice(edge.indexOf('function compactInstantStoryDraft('), edge.indexOf('export function instantStoryFallbackOpening('));
const compact = vm.runInNewContext(`${compactSource}; compactInstantStoryDraft`, {
  cleanPromptValue: (value, limit) => String(value || '').trim().slice(0, limit),
});
const pilot = { name: 'A', role: 'Piloto', world: 'Circuito', coreMotivation: 'Ganar con su propio diseño',
  values: 'Juego limpio', fears: 'Depender de patrocinadores', habits: 'Dibuja mejoras',
  contradictions: 'Competitiva pero generosa', emotionalDefense: 'Se refugia en el trabajo',
  softeningTriggers: 'Respeto por su oficio', growthDirection: 'Aprender a delegar',
  firstMessage: 'Circuito '.repeat(120), exampleDialogue: 'No cambies la presión. Primero medimos.' };
const preserved = compact(pilot);
for (const key of ['values', 'fears', 'habits', 'contradictions', 'coreMotivation', 'emotionalDefense', 'softeningTriggers', 'growthDirection']) {
  assert.equal(preserved[key], pilot[key], `${key} survives compaction`);
}
assert.ok(preserved.firstMessage.length > 520);
assert.equal(preserved.exampleDialogue, pilot.exampleDialogue);
const history = [];
const focuses = new Set();
for (let n = 0; n < 6; n++) {
  const direction = buildInstantStoryIdentity(preserved, `variation-${n}`, history);
  const focus = direction.match(/^FOCUS=(\w+)/)[1];
  assert.ok(!focuses.has(focus), 'Rotate profile facets before reuse');
  assert.ok(direction.includes(preserved[focus]), 'Use actual creator text');
  focuses.add(focus);
  history.push(direction);
}
const musician = compact({ name: 'B', role: 'Violinista', coreMotivation: 'Rescatar partituras olvidadas', values: 'Memoria cultural' });
assert.notEqual(buildInstantStoryIdentity(preserved, 'same'), buildInstantStoryIdentity(musician, 'same'));
assert.equal(buildInstantStoryIdentity({}, 'empty'), '');
assert.ok(buildInstantStoryIdentity({ values: 'Solo un rasgo' }, 'x', ['FOCUS=values\n']).includes('Solo un rasgo'));
assert.equal(buildInstantStoryIdentity(preserved, 'stable'), buildInstantStoryIdentity(preserved, 'stable'));
assert.ok(edge.includes('identityDirection].filter(Boolean).join'));
assert.ok(edge.includes('RECENT OPENINGS TO AVOID'));
assert.ok(edge.includes('emotional_dna: source?.emotional_dna'));
assert.ok(edge.includes('const promptDraft = { ...safeDraft, firstMessage: "" }')); 
console.log('PASS: profile preservation, long opening, distinct character premises, facet rotation, exhausted history, sparse profiles, repeatable selection and generation wiring.');
