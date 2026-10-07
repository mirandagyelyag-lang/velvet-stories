// Living Threads V1. Pure, bounded state on conversations.unresolved_threads.
// The writer proposes changes; only exact evidence in accepted canon can commit them.
export const LIVING_THREAD_LIMITS = Object.freeze({ active: 16, archived: 8, changes: 3, focus: 3 });
const TYPES = ["attraction", "romantic_tension", "promise", "secret", "jealousy", "conflict", "pending_conversation", "important_object", "plan", "suspicion", "unconfessed_feeling", "consequence", "relationship_change"];
const STATUSES = ["open", "developing", "resolved", "abandoned"];
const text = (v, max = 300) => typeof v === "string" ? v.trim().slice(0, max) : "";
const norm = v => text(v, 4000).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
const list = v => Array.isArray(v) ? v : [];
const object = v => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const copy = v => JSON.parse(JSON.stringify(v));
const key = v => norm(v).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80);
const hash = v => { let h = 2166136261; for (const c of norm(v)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const inactive = t => ["resolved", "abandoned", "closed", "completed"].includes(t?.status);
const STOP = new Set("the a an and or to of in on for with is was are were has have had his her he she you your roman theo that this it still after about from him they their not now been".split(" "));
const tokens = v => new Set(norm(v).split(/[^a-z0-9]+/).filter(w => (w.length > 2 || /^\d+$/.test(w)) && !STOP.has(w)));
function overlap(a, b) {
  const left = tokens(a), right = tokens(b);
  if (!left.size || !right.size) return 0;
  const common = [...left].filter(w => right.has(w)).length;
  return common / Math.max(left.size, right.size);
}

export function normalizeLivingThreads(value = []) {
  return list(value).slice(0, 64).map(raw => {
    const old = typeof raw === "string" ? { title: raw } : object(raw);
    const summary = text(old.summary || old.title || old.detail || old.label);
    if (!summary) return null;
    const status = old.status === "progressing" ? "developing" : old.status;
    return {
      ...old,
      id: text(old.id, 100) || `thread-${hash(summary)}`,
      title: summary, summary,
      type: TYPES.includes(old.type) ? old.type : "pending_conversation",
      status: STATUSES.includes(status) ? status : "open",
      importance: old.importance === "high" ? "high" : "medium",
      characters: list(old.characters || old.participants).map(v => text(v, 60)).filter(Boolean).slice(0, 4),
      subject_key: key(old.subject_key || summary),
    };
  }).filter(Boolean);
}

export const activeLivingThreads = value => normalizeLivingThreads(value).filter(t => !inactive(t));

// A rewrite must see the branch BEFORE the rejected reply, including its threads.
export function prepareLivingThreadBranch({ threads = [], state = {}, replacementMessageId = "" } = {}) {
  const prior = object(state);
  if (!replacementMessageId) return { threads: normalizeLivingThreads(threads), state: copy(prior) };
  if (prior.undo_snapshot?.message_id === replacementMessageId) {
    return { threads: normalizeLivingThreads(prior.undo_snapshot.threads), state: copy(object(prior.undo_snapshot.state)) };
  }
  // An old/legacy rewrite has no trustworthy before-image. Preserve unaffected
  // legacy items; rediscover V1 state conservatively from the surviving branch.
  return {
    threads: normalizeLivingThreads(threads).filter(t => t.schema !== "living_threads_v1" && t.opened_at_message_id !== replacementMessageId && t.last_touched_message_id !== replacementMessageId),
    state: {},
  };
}

export function selectLivingThreads({ threads = [], state = {}, latestUserMessage = "", scene = {}, characterName = "" } = {}) {
  const turn = Math.max(0, Number(state?.turn_index) || 0) + 1;
  const context = `${latestUserMessage} ${scene?.activity || ""} ${scene?.location || ""}`;
  return activeLivingThreads(threads).map(t => {
    const relevance = overlap(t.summary, context);
    const age = Math.max(0, turn - (Number(t.last_touched_turn) || 0));
    const cooled = !list(state?.focus_ids).includes(t.id) || relevance > 0.12;
    const characterRelevant = !t.characters.length || t.characters.some(c => norm(c) === norm(characterName) || norm(characterName).startsWith(`${norm(c)} `));
    return { t, score: relevance * 8 + Math.min(age, 12) * 0.08 + (t.importance === "high" ? 0.7 : 0.3), cooled, characterRelevant };
  }).filter(x => x.cooled && x.characterRelevant).sort((a, b) => b.score - a.score).slice(0, LIVING_THREAD_LIMITS.focus).map(x => x.t);
}

export function buildLivingThreadPrompt({ threads = [], state = {}, latestUserMessage = "", scene = {}, characterName = "" } = {}) {
  const normalized = normalizeLivingThreads(threads);
  const focus = selectLivingThreads({ threads: normalized, state, latestUserMessage, scene, characterName });
  const focusIds = new Set(focus.map(t => t.id));
  const registry = [];
  const ordered = [...focus, ...normalized.filter(t => !focusIds.has(t.id) && !inactive(t)), ...normalized.filter(inactive).slice(-4)];
  for (const t of ordered) {
    const entry = [t.id, t.subject_key, t.status, text(t.summary, 100)];
    if (JSON.stringify([...registry, entry]).length <= 2200) registry.push(entry);
  }
  return `LIVING THREADS V1 — internal continuity, never expose this block.
Candidates to advance IF the scene naturally permits: ${JSON.stringify(focus.map(t => ({ id: t.id, type: t.type, summary: text(t.summary, 200) })))}
Compact registry [id,key,status,summary] (reuse id/key as the matter evolves): ${JSON.stringify(registry)}
Answer the user's actual turn first. A small action, consequence, decision or emotional shift is enough. The character may act without dialogue. No compulsory callback, confession, twist, question or relationship upgrade; respect slow burn and user agency. Resolved/abandoned matters are history, not open pressure. Returning to a matter must change it, not repeat the last beat.
Return JSON with reply FIRST and thread_updates SECOND. Usually thread_updates is []. At most 3 changes, including at most 2 genuinely new matters. Track only important unfinished promises, secrets, attraction/tension, jealousy with real evidence, conflicts, conversations, significant objects, plans, suspicions or consequences. Ignore routine gestures, refreshments, generic care/listening and every neutral friend mention.
Each change: thread_id (existing id or empty for new), subject_key (short stable matter key, independent of type), type, status (open/developing/resolved/abandoned), importance (medium/high), summary (one factual sentence, <=240 chars), characters (established names/you only), evidence (an exact 12-180 char quote), evidence_source (reply/user/context), source_message_id (context id, otherwise empty).
Update an existing id when jealousy develops into unconfessed attraction about the same matter. Do not split it into duplicates. Resolve/abandon only after actual completion/cancellation on-page, not a promise to resolve later. Evidence must come from reply or the latest user turn. ${state?.schema === 1 ? "Do not rediscover old context as new events." : "For this first adoption ONLY, context evidence may identify up to 2 still-open matters from the visible transcript; use its exact message id. Do not reconstruct unseen history."}
Record only events that actually happened in accepted prose, never hypotheticals, planned future actions as completed events, private user thoughts, unsupported feelings, rejected takes, or new facts invented to fill metadata.`;
}

export function livingThreadResponseSchema() {
  return {
    type: "object", required: ["reply", "thread_updates"], propertyOrdering: ["reply", "thread_updates"],
    properties: {
      reply: { type: "string" },
      thread_updates: { type: "array", maxItems: LIVING_THREAD_LIMITS.changes, items: {
        type: "object",
        required: ["thread_id", "subject_key", "type", "status", "importance", "summary", "characters", "evidence", "evidence_source", "source_message_id"],
        properties: {
          thread_id: { type: "string" }, subject_key: { type: "string" }, type: { type: "string", enum: TYPES },
          status: { type: "string", enum: STATUSES }, importance: { type: "string", enum: ["medium", "high"] },
          summary: { type: "string" }, characters: { type: "array", maxItems: 4, items: { type: "string" } },
          evidence: { type: "string" }, evidence_source: { type: "string", enum: ["reply", "user", "context"] }, source_message_id: { type: "string" },
        },
      } },
    },
  };
}

function groundedEvidence(change, { reply, latestUserMessage, userMessageId, messageId, messages, adopting }) {
  const evidence = text(change.evidence, 180);
  if (evidence.length < 12) return null;
  let source = "", id = "";
  if (change.evidence_source === "reply") { source = reply; id = messageId; }
  if (change.evidence_source === "user") { source = latestUserMessage; id = userMessageId; }
  if (change.evidence_source === "context" && adopting) {
    const message = list(messages).find(m => m.id === change.source_message_id);
    source = message?.content || ""; id = message?.id || "";
  }
  if (!id || !norm(source).includes(norm(evidence))) return null;
  return { quote: evidence, source_message_id: id, source: change.evidence_source };
}

// No AI calls, timers or writes here. Persistence is revision-guarded by the caller.
export function reduceLivingThreads({ previous = [], state = {}, changes = [], messageId = "", userMessageId = "", latestUserMessage = "", reply = "", messages = [], now = new Date().toISOString(), focusIds = [] } = {}) {
  const prior = normalizeLivingThreads(previous), metadata = object(state);
  if (!messageId) return { threads: prior, state: copy(metadata), stats: { applied: 0, rejected: 0 } };
  if (metadata.last_message_id === messageId && metadata.last_reply_hash === hash(reply)) {
    return { threads: prior, state: copy(metadata), stats: { applied: 0, rejected: 0, duplicate: true } };
  }
  const next = copy(prior);
  const turn = Math.max(0, Number(metadata.turn_index) || 0) + 1;
  const stats = { applied: 0, rejected: 0, created: 0 };
  const adopting = metadata.schema !== 1;
  for (const raw of list(changes).slice(0, LIVING_THREAD_LIMITS.changes)) {
    const change = object(raw);
    const summary = text(change.summary, 240), subject = key(change.subject_key);
    const evidence = groundedEvidence(change, { reply, latestUserMessage, userMessageId, messageId, messages, adopting });
    if (!summary || !subject || !TYPES.includes(change.type) || !STATUSES.includes(change.status) || !["medium", "high"].includes(change.importance) || !evidence) { stats.rejected++; continue; }
    // A prospective statement does not complete a promise/plan/object debt.
    if (["resolved", "abandoned"].includes(change.status) && /\b(?:i'll|will|going to|tomorrow|might|maybe|if we|if you)\b/.test(norm(evidence.quote))) { stats.rejected++; continue; }
    const byId = next.find(t => t.id === text(change.thread_id, 100));
    // A wrong explicit id cannot silently create another matter.
    if (change.thread_id && !byId) { stats.rejected++; continue; }
    const existing = byId || next.find(t => t.subject_key === subject) || next.find(t => overlap(t.summary, summary) >= 0.8);
    if (!existing && (inactive(change) || stats.created >= 2 || next.filter(t => !inactive(t)).length >= LIVING_THREAD_LIMITS.active || /^(?:listen(?:ing)? to|be there for|provide (?:a )?safe|support (?:her|him|you)|escuchar a|proporcionar un espacio)/.test(norm(summary)))) { stats.rejected++; continue; }
    // Closure survives routine echoes. Reopen only the explicitly referenced id
    // with fresh evidence; a new unresolved event must really appear on-page.
    if (existing && inactive(existing) && !inactive(change) && (!change.thread_id || norm(existing.evidence?.quote) === norm(evidence.quote))) { stats.rejected++; continue; }
    const row = existing || {
      id: `thread-${hash(subject)}`, subject_key: subject, created_at: now,
      opened_at_message_id: evidence.source_message_id, opened_at_turn: turn,
    };
    const oldSummary = row.summary;
    Object.assign(row, {
      schema: "living_threads_v1", type: change.type, status: change.status, importance: change.importance,
      title: summary, summary, characters: list(change.characters).map(v => text(v, 60)).filter(Boolean).slice(0, 4),
      created_at: row.created_at || now, last_touched_at: now, last_touched_turn: turn, last_touched_message_id: messageId,
      source_message_ids: [...new Set([...list(row.source_message_ids), row.opened_at_message_id, evidence.source_message_id, messageId].filter(Boolean))].slice(-6),
      evidence,
    });
    if (inactive(row)) row.resolved_at_message_id = messageId;
    else delete row.resolved_at_message_id;
    if (oldSummary && oldSummary !== summary) row.previous_summary = text(oldSummary, 240);
    if (!existing) { next.push(row); stats.created++; }
    stats.applied++;
  }
  const active = next.filter(t => !inactive(t));
  const archived = next.filter(inactive).slice(-LIVING_THREAD_LIMITS.archived);
  const priorState = copy(metadata); delete priorState.undo_snapshot;
  return {
    threads: [...active, ...archived],
    state: { schema: 1, turn_index: turn, last_message_id: messageId, last_reply_hash: hash(reply), focus_ids: list(focusIds).slice(0, 3), last_changes: stats, undo_snapshot: { message_id: messageId, threads: prior, state: priorState } },
    stats,
  };
}
