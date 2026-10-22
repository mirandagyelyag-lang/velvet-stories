import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { CHASE_APPROVED_OPENING } from '../supabase/functions/character-chat/engine/instant-story-identity.js';
import { instantStoryProseValidation } from '../supabase/functions/character-chat/engine/instant-story-prose.js';

// Contract test: the frontend must accept complete server prose even when
// editorial heuristics warn. Editorial quality is tested separately below.
const source = fs.readFileSync(new URL('../src/context/CharactersContext.jsx', import.meta.url), 'utf8');
const start = source.indexOf('      const leakedTemplate');
const end = source.indexOf('      const usedSceneSeed', start);
assert.ok(start >= 0 && end > start, 'Instant Story client validation markers changed: update this test');
const checks = source.slice(start, end);
const base = CHASE_APPROVED_OPENING;
function validate(opening) {
  const { wordCount, complete } = instantStoryProseValidation(opening);
  const warnings = [];
  const ctx = {
    opening, wordCount, complete, variationKey: 'test',
    console: { warn(...args) { warnings.push(args); } },
    rejectedOpening: (error, code) => Object.assign(new Error(error), { code }),
  };
  const result = vm.runInNewContext(`(()=>{${checks};return opening})()`, ctx);
  return { result, warnings };
}
assert.equal(validate('Under a flickering neon sign, ' + base).result, 'Under a flickering neon sign, ' + base);
assert.equal(validate(base).result, base);
for (const phrase of [
  'Between you sits a toolbox. ',
  'Their response carries across the room. ',
  'Without turning it into a performance, ',
]) {
  const { result, warnings } = validate(phrase + base);
  assert.equal(result, phrase + base);
  assert.ok(warnings.length, 'Expected an editorial warning for ' + phrase);
}
assert.throws(() => validate('Short.'), e => e.code === 'incomplete_provider_opening');
assert.throws(() => validate(''), e => e.code === 'empty_provider_opening');

// Separate quality diagnostics: they must never be confused with the
// production frontend's accept/reject decision.
function qualityIssues(opening, { previous = [], establishedLocation, allowedNamedNpcs = [] } = {}) {
  const issues = [];
  const text = String(opening || '');
  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\\s+/g, ' ').trim();
  const canonical = s => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\\s+/g, ' ').trim();
  const forbidden = [
    /you(?:'re| are) coming with me/i,
    /(?:get in|come with me|my car(?:'s| is) parked)/i,
    /you(?:'re| are) enjoying this/i,
    /(?:between you sits|their response carries|without turning it into a performance)/i,
  ];
  if (forbidden.some(re => re.test(text))) issues.push('recycled_phrase');
  if (previous.some(p => canonical(p) === normalized)) issues.push('duplicate_opening');
  if (previous.some(p => {
    const a = new Set(canonical(p).split(' ').filter(Boolean));
    const b = new Set(normalized.split(' ').filter(Boolean));
    return a.size >= 15 && b.size >= 15 &&
      [...a].filter(word => b.has(word)).length / new Set([...a, ...b]).size > 0.86;
  })) issues.push('near_duplicate_opening');
  if (establishedLocation && /\\b(?:you are already|you(?:'re| are) (?:now|suddenly|back))\\b/i.test(text)) {
    const location = establishedLocation.toLowerCase();
    if (!text.toLowerCase().includes(location)) issues.push('possible_location_reset');
  }
  // Only flag explicit introductions; ordinary names may be established cast.
  const introductions = [...text.matchAll(/\\b(?:meet|introduces? you to|this is)\\s+([A-Z][a-z]{2,})\\b/g)];
  for (const match of introductions) {
    if (!allowedNamedNpcs.some(name => name.toLowerCase().split(' ')[0] === match[1].toLowerCase())) {
      issues.push('unapproved_named_npc');
      break;
    }
  }
  return [...new Set(issues)];
}
const issues = (s, options) => qualityIssues(s, options);
assert.ok(issues('Chase jingles his keys. "You\'re coming with me."').includes('recycled_phrase'));
assert.ok(issues('He says, "You\'re enjoying this."').includes('recycled_phrase'));
assert.ok(issues(base, { previous: [base] }).includes('duplicate_opening'));
assert.ok(issues(base + ' Again.', { previous: [base] }).includes('near_duplicate_opening'));
assert.ok(issues('You are now in the kitchen.', { establishedLocation: 'rooftop' }).includes('possible_location_reset'));
assert.ok(issues('Chase introduces you to Brenda.', { allowedNamedNpcs: ['Chase', 'Nathan'] }).includes('unapproved_named_npc'));
assert.ok(!issues('Chase introduces you to Nathan.', { allowedNamedNpcs: ['Chase', 'Nathan'] }).includes('unapproved_named_npc'));
assert.deepEqual(issues('Chase crosses the room and asks if you want to stay.'), []);
console.log('PASS: client acceptance, editorial warnings, incomplete output, repeated lines, duplicate openings, location-reset and introduced-NPC diagnostics.');
