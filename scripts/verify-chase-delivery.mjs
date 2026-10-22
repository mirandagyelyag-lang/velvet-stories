import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { instantStoryProseValidation } from '../supabase/functions/character-chat/engine/instant-story-prose.js';

const source = readFileSync(new URL('../supabase/functions/character-chat/index.ts', import.meta.url), 'utf8');

// Editorial diagnostics are separate from the delivery contract. They flag
// suspicious output but must not silently reject otherwise complete prose.
function narrativeWarnings(opening, { recentOpenings = [], allowedNpcNames = [] } = {}) {
  const text = String(opening || '');
  const normalize = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const warnings = [];
  if (/you(?:'re| are) coming with me|come with me|my car(?:'s| is) parked|you're enjoying this/i.test(text)) {
    warnings.push('recycled_chase_line');
  }
  if (/between you sits|their response carries|without turning it into a performance/i.test(text)) {
    warnings.push('editorial_template');
  }
  if (recentOpenings.some(previous => normalize(previous) === normalize(text))) {
    warnings.push('duplicate_opening');
  }
  const introduced = [...text.matchAll(/\b(?:introduces? you to|this is|meet)\s+([A-Z][a-z]{2,})\b/g)]
    .map(match => match[1]);
  if (introduced.some(name => !allowedNpcNames.some(allowed => allowed.toLowerCase().split(' ')[0] === name.toLowerCase()))) {
    warnings.push('unapproved_npc_introduction');
  }
  return warnings;
}

const complete = 'Chase ignored the interruption and crossed the crowded room toward you. The music grew louder as someone called his name. He stopped by the table, glanced at the person following him, and then looked back at you. "They keep trying to decide where I should be tonight," he said. "I was about to disagree."';
assert.equal(instantStoryProseValidation(complete).valid, true);
assert.equal(instantStoryProseValidation('Short.').valid, false);
assert.equal(instantStoryProseValidation('').valid, false);
assert.ok(narrativeWarnings('Chase says, "You\'re coming with me."').includes('recycled_chase_line'));
assert.ok(narrativeWarnings('Between you sits a toolbox.').includes('editorial_template'));
assert.ok(narrativeWarnings(complete, { recentOpenings: [complete] }).includes('duplicate_opening'));
assert.ok(narrativeWarnings('Chase introduces you to Brenda.', { allowedNpcNames: ['Chase', 'Nathan'] }).includes('unapproved_npc_introduction'));
assert.ok(!narrativeWarnings('Chase introduces you to Nathan.', { allowedNpcNames: ['Chase', 'Nathan'] }).includes('unapproved_npc_introduction'));
assert.deepEqual(narrativeWarnings(complete), []);

const start = source.indexOf('  const instantStoryResponse =');
const end = start >= 0 ? source.indexOf('  const readOpening =', start) : -1;
if (start < 0 || end <= start) {
  console.error('BLOCKED: character-chat/index.ts does not contain the expected instantStoryResponse/readOpening section.');
  console.error('The narrative fixture checks ran, but live delivery integration has NOT been verified.');
  process.exitCode = 1;
} else {
  const delivery = source.slice(start, end);
  assert.ok(!delivery.includes('requestOpening'), 'Delivery must not regenerate an opening');
  assert.ok(!source.includes('reviewChaseOpening'), 'Legacy Chase review hook must be absent');
  assert.ok(source.includes('quota_model_fallback'), 'Expected quota fallback hook missing');
  assert.ok(source.includes('identityDirection'), 'Expected identity direction hook missing');
  const context = {
    safeDraft: { emotional_dna: { official_engine: 'chase_electricity_v1' } },
    requestId: 'test', VELVET_ENGINE_RELEASE: 'test', startedAt: Date.now(),
    openingFamily: 'party', providerDiagnostics: [], diagnose() {},
    console: { info() {} },
    instantStoryProseValidation,
    json: (body, status = 200) => ({ body, status }),
  };
  const fn = vm.runInNewContext(`${delivery};instantStoryResponse`, context);
  for (const deliverySource of ['ai', 'ai_best_effort']) {
    const result = fn({ opening: complete, source: deliverySource });
    assert.equal(result.status, 200, `complete ${deliverySource} story should be delivered`);
  }
  for (const invalid of ['', 'Short.', 'A story that stops in the middle']) {
    assert.equal(fn({ opening: invalid, source: 'ai' }).status, 503);
  }
  console.log('PASS: delivery and recovery, incomplete output rejection, and independent narrative diagnostics.');
}
