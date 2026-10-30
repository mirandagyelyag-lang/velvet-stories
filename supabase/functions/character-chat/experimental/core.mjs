// Isolated experiment. No imports from the production orchestration pipeline.
import { buildCrisisResponse } from './crisis-response.js';
import {sourceCatalog} from './provenance.mjs';
import {turnObligations} from './turn-obligations.mjs';

const copy = value => structuredClone(value);
const check = (condition, message) => { if (!condition) throw new Error(message); };
const sceneKeys = new Set(['location', 'present', 'positions', 'objects']);

export function createSession({profile, scene = {location: 'unspecified', present: [], positions: {}, objects: []}}) {
  check(profile?.id && profile?.name, 'Profile identity required');
  return {revision: 0, profile: copy(profile), scene: copy(scene), evidence: [], history: []};
}

// Events are explicit inputs from an authenticated user-action parser or UI,
// never inferred from an assistant reply. This prototype tests the reducer;
// automatic language-to-event extraction is deliberately not wired to production.
export function applyUserEvents(session, message, events = []) {
  const next = copy(session);
  for (const event of events) {
    check(event.source === 'user' && event.messageId === message.id, 'User provenance required');
    check(typeof event.quote === 'string' && event.quote.trim() && message.content.includes(event.quote), 'Exact source excerpt required');
    if (event.type === 'scene') {
      check(event.patch && Object.keys(event.patch).every(key => sceneKeys.has(key)), 'Unsupported scene field');
      Object.assign(next.scene, copy(event.patch));
    } else if (event.type === 'fact') {
      check(typeof event.fact === 'string' && event.fact.trim(), 'Fact required');
      next.evidence.push({id: `${message.id}:${next.evidence.length}`, source: 'user', messageId: message.id, quote: event.quote, fact: event.fact});
    } else throw new Error('Unsupported user event');
  }
  return next;
}

export function turnContract(session, message) {
  return {
    version: 'orvayne-core-v4.6', turnObligations: turnObligations(message.content), regeneration: copy(session.regeneration || null), profile: copy(session.profile),
    sources: sourceCatalog(session,message),
    confirmedFacts: copy(session.evidence), scene: copy(session.scene),
    presentation: 'Narration is third person about the named character and second person about the user. Spoken words use quotation marks with an unambiguous named speaker. Do not switch into first-person narration or present unquoted dialogue as narrator fact.',
    canon: 'An NPC name mentioned by the user establishes that reference, not their habits, career, personality, whereabouts or shared history. Distinguish new present-world actions from claims about an existing person. For claims about established people or the user, use only the supplied profile, confirmed facts or explicit user messages. An earlier assistant invention is not evidence.',
    recentConversation: copy(session.history.slice(-12)), latestUserMessage: copy(message),
    authority: ['Safety overrides fictional performance.', 'Profile establishes identity; user evidence establishes user facts.', 'Dialogue and guesses never become confirmed user biography or consent.', 'Maintain scene positions, hearing, objects, completed transitions and named speakers.', 'Make a character-specific choice responding to the full latest message.', 'Do not prescribe user reactions, feelings, movement, possessions or agreement.', 'Supporting characters have only established knowledge and biographies.'],
    care: 'Respond to vulnerable disclosures with respect and grounded listening. Voice does not justify contempt, blame, guilt or demands for reassurance. After a disclosure of self-harm or medical care, do not reproach the user for scaring or upsetting the character, order private isolation, or replace support with possessive control. Do not invent anger from family or others unless disclosed.',
    responsiveness: 'Address the actual latest question or emotional meaning. A witty sentence alone is not an answer. Do not invent a prior promise, seminar, secret or object to answer a question. When a premise was never established, clarify it naturally.',
    quality: {
      progression: 'Compare with the last two assistant turns. Preserve established positions but do not merely restate watching, waiting, looking away, staying put or returning to a conversation. Give a small new present-tense choice, consequence or specific interaction. If the user has not noticed the lead, do not pretend there is mutual eye contact or audible remote dialogue. The lead can pursue an independent action, or physically approach and establish speaking distance before addressing the user. Lack of user awareness is not a command to freeze. If the user explicitly asks for space, silence or listening, honor it without manufacturing a new demand or event. Never force activity, romance or relocation just to create variety.',
      purpose: 'Each turn should answer, clarify, reveal an immediate personal intention, make a grounded choice, or give the listening the user explicitly asked for. Choose the move from the full user message, not from a keyword. A nod plus a quip is insufficient when a question or emotional concern remains unanswered.',
      voice: 'Show personality through what he chooses to admit, pursue, revise or withhold. Dryness is optional. Do not turn each reply into a sarcastic assessment of the user, their manners, schedule or usefulness. Avoid repeatedly describing a dry grin, an eyebrow, a weight shift and pockets instead of making a conversational move.',
      care: 'A concern about being a burden calls for acknowledgement and room to speak, not a debate about whether the concern is irrational. Never imply only the user is to blame for feeling hurt. A request to listen should reduce pressure; do not keep proposing relocation or give a menu when it is unnecessary.',
      agency: 'A declined invitation is complete information, not a rejection of the character. Preserve warmth and independent initiative without demanding explanations, sulking or making the user repair his feelings.'
    },
    delivery: 'Return prose and a proposed character-only scene patch. The patch must describe actions shown in the prose; do not change the user or add biography. No validator commentary or canned acknowledgements.'
  };
}

function reviewResult(value) {
  check(value && typeof value.accepted === 'boolean' && Array.isArray(value.issues), 'Invalid reviewer result');
  check(value.issues.every(issue => typeof issue.code === 'string' && typeof issue.reason === 'string'), 'Reviewer reasons required');
  check(!value.accepted || value.issues.length === 0, 'Reviewer cannot accept unresolved issues');
  return value;
}

export function repetitionIssues(history, prose) {
  const normalize = value => String(value || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  const current = normalize(prose);
  if (current.split(' ').length < 12) return [];
  const grams = value => { const words = value.split(' '); return new Set(words.slice(0, -3).map((_, i) => words.slice(i, i + 4).join(' '))); };
  const next = grams(current);
  for (const row of history.filter(row => row.role === 'assistant').slice(-2)) {
    const previous = normalize(row.content);
    const prior = grams(previous);
    const overlap = [...next].filter(gram => prior.has(gram)).length / Math.max(1, Math.min(next.size, prior.size));
    if (current === previous || (overlap >= 0.7 && Math.min(next.size, prior.size) >= 9)) return [{code:'repeated_turn',reason:'The prose repeats a recent assistant turn instead of continuing it. Retain continuity and choose a genuinely new present beat without controlling the user.'}];
  }
  return [];
}

function proposedScene(scene, patch, characterId) {
  check(patch && typeof patch === 'object' && !Array.isArray(patch), 'Invalid character scene patch');
  check(Object.keys(patch).every(key => key === 'characterPosition'), 'Only character position may be proposed');
  const next = copy(scene);
  if ('characterPosition' in patch) {
    check(typeof patch.characterPosition === 'string' && patch.characterPosition.length <= 200, 'Invalid position');
    next.positions = {...next.positions, [characterId]: patch.characterPosition};
  }
  return next;
}

export async function runTurn({session, message, events = [], author, reviewer, provenance, signal, commit}) {
  check(message?.id && typeof message.content === 'string', 'Message identity required');
  check(!session.history.some(row => row.id === message.id), 'Duplicate user turn');
  signal?.throwIfAborted();
  const userHistory = session.history.filter(row => row.role === 'user').map(row => row.content);
  const crisis = buildCrisisResponse({latestUserMessage: message.content, recentUserMessages: userHistory, spanish: session.profile.language === 'es'});
  const prepared = crisis ? copy(session) : applyUserEvents(session, message, events);
  const contract = turnContract(prepared, message);
  const attempts = [];
  let accepted = crisis ? {prose: crisis, scenePatch: {}} : null;
  if (!accepted) {
    check(typeof provenance==='function','Factual provenance auditor required');
    for (let attempt = 0; attempt < 2; attempt++) {
      signal?.throwIfAborted();
      const draft = await author({contract: copy(contract), repair: copy(attempts.at(-1) || null), signal});
      check(typeof draft?.prose === 'string' && draft.prose.trim() && draft.prose.length <= 8000, 'Invalid author prose');
      const nextScene = proposedScene(prepared.scene, draft.scenePatch || {}, prepared.profile.id);
      const repeated = repetitionIssues(prepared.history, draft.prose);
      const factual = repeated.length ? {accepted:false,issues:repeated} : reviewResult(await provenance({contract:copy(contract),draft:copy(draft),signal}));
      const verdict = !factual.accepted ? factual : reviewResult(await reviewer({contract: copy(contract), draft: copy(draft), nextScene, signal}));
      attempts.push({draft: copy(draft), verdict, provenance:copy(factual)});
      if (verdict.accepted) { accepted = draft; break; }
    }
  }
  signal?.throwIfAborted();
  if (!accepted) return {status: 'rejected', revision: session.revision, attempts, session: copy(session)};
  const next = {...prepared, revision: session.revision + 1,
    scene: proposedScene(prepared.scene, accepted.scenePatch || {}, session.profile.id),
    history: [...prepared.history, {id: message.id, role: 'user', content: message.content}, {id: `${message.id}:reply`, role: 'assistant', content: accepted.prose}]
  };
  // Persistence adapters must compare expectedRevision atomically and be
  // idempotent by message ID. No visible reply is released before commit succeeds.
  if (commit) await commit({expectedRevision: session.revision, messageId: message.id, nextSession: copy(next), signal});
  return {status: crisis ? 'support' : 'accepted', reply: accepted.prose, revision: next.revision, attempts, session: next};
}

