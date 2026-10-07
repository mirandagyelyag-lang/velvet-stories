import assert from "node:assert/strict";
import test from "node:test";
import { activeLivingThreads, buildLivingThreadPrompt, LIVING_THREAD_LIMITS, livingThreadResponseSchema, normalizeLivingThreads, prepareLivingThreadBranch, reduceLivingThreads, selectLivingThreads } from "../supabase/functions/character-chat/engine/living-threads-v1.js";

const quote = "Roman kept your necklace in his jacket.";
function change(overrides = {}) {
  return { thread_id: "", subject_key: "roman_necklace_return", type: "important_object", status: "open", importance: "medium", summary: "Roman still has your necklace and needs to return it.", characters: ["Roman", "you"], evidence: quote, evidence_source: "reply", source_message_id: "", ...overrides };
}
function turn(current = { threads: [], state: {} }, changes = [], options = {}) {
  const n = (current.state?.turn_index || 0) + 1;
  return reduceLivingThreads({ previous: current.threads, state: current.state, changes, messageId: `reply-${n}`, userMessageId: `user-${n}`, latestUserMessage: ".", reply: quote, now: `2026-10-07T15:${String(n).padStart(2, "0")}:00Z`, ...options });
}

test("legacy strings/objects keep identity and source data; progressing becomes developing", () => {
  const input = ["A conversation postponed", { id: "old", title: "An old promise", status: "progressing", detail: "Keep this", opened_at_message_id: "original" }, { id: "done", title: "Returned keys", status: "resolved" }, { id: "cancelled", title: "Cancelled plan", status: "abandoned" }];
  const before = JSON.stringify(input), out = normalizeLivingThreads(input);
  assert.equal(out[1].id, "old"); assert.equal(out[1].status, "developing"); assert.equal(out[1].detail, "Keep this");
  assert.equal(out[1].opened_at_message_id, "original"); assert.equal(activeLivingThreads(out).length, 2);
  assert.equal(JSON.stringify(input), before); assert.deepEqual(normalizeLivingThreads(null), []);
});

test("jealousy evolves into concealed attraction under one stable id", () => {
  const firstQuote = "Roman's jaw tightened when Theo took the seat beside you.";
  let s = turn(undefined, [change({ type: "jealousy", subject_key: "roman_theo_attention", summary: "Roman was bothered by Theo sitting beside you.", evidence: firstQuote })], { reply: firstQuote });
  const id = s.threads[0].id;
  const nextQuote = "He stayed close, unwilling to admit why Theo's attention bothered him.";
  s = turn(s, [change({ thread_id: id, subject_key: "roman_theo_attention", type: "unconfessed_feeling", status: "developing", summary: "Roman hides his attraction after Theo's attention made him jealous.", evidence: nextQuote })], { reply: nextQuote });
  assert.equal(s.threads.length, 1); assert.equal(s.threads[0].id, id); assert.equal(s.threads[0].type, "unconfessed_feeling");
  assert.equal(s.threads[0].status, "developing"); assert.equal(s.threads[0].opened_at_message_id, "reply-1"); assert.equal(s.threads[0].last_touched_message_id, "reply-2");
});

test("same subject keys deduplicate; repeated delivery is idempotent without mutating input", () => {
  let s = turn(undefined, [change(), change({ summary: "Roman has not returned your necklace yet." })]);
  assert.equal(s.threads.length, 1);
  const before = JSON.stringify(s);
  const duplicate = reduceLivingThreads({ previous: s.threads, state: s.state, changes: [change()], messageId: "reply-1", reply: quote });
  assert.equal(duplicate.state.turn_index, 1); assert.equal(duplicate.stats.duplicate, true); assert.equal(JSON.stringify(s), before);
  assert.equal(duplicate.threads.length, 1);
});

test("rejected/rewritten draft evidence and invented source ids never become threads", () => {
  const s = turn(undefined, [change(), change({ evidence_source: "context", source_message_id: "missing" })], { reply: "Roman stepped closer and waited beside you." });
  assert.equal(s.threads.length, 0); assert.equal(s.stats.rejected, 2);
});

test("first adoption can discover visible opening evidence; it cannot keep rediscovering history", () => {
  const messages = [{ id: "opening", sender: "character", content: quote }];
  let s = turn(undefined, [change({ evidence_source: "context", source_message_id: "opening" })], { messages, reply: "He waited beside you without adding anything." });
  assert.equal(s.threads[0].opened_at_message_id, "opening");
  s = turn(s, [change({ subject_key: "another_matter", evidence_source: "context", source_message_id: "opening" })], { messages, reply: "He waited beside you without adding anything." });
  assert.equal(s.stats.rejected, 1); assert.equal(s.threads.length, 1);
});

test("user facts require evidence in the perceptible latest turn", () => {
  const evidence = "You still have my necklace.";
  const s = turn(undefined, [change({ evidence, evidence_source: "user" })], { latestUserMessage: evidence, reply: "Roman touched his jacket pocket." });
  assert.equal(s.threads[0].evidence.source_message_id, "user-1");
  const wrong = turn(undefined, [change({ evidence, evidence_source: "user" })], { latestUserMessage: "*looks up*" });
  assert.equal(wrong.threads.length, 0);
});

test("closure needs actual completion; closed matters do not leak into focus or reopen on echoes", () => {
  let s = turn(undefined, [change()]); const id = s.threads[0].id;
  const future = "I'll bring your necklace tomorrow.";
  const pending = turn(s, [change({ thread_id: id, status: "resolved", evidence: future })], { reply: future });
  assert.equal(pending.threads[0].status, "open");
  const completed = "Roman placed your necklace back in your hand.";
  s = turn(s, [change({ thread_id: id, status: "resolved", summary: "Roman returned your necklace.", evidence: completed })], { reply: completed });
  assert.equal(activeLivingThreads(s.threads).length, 0); assert.equal(selectLivingThreads({ threads: s.threads }).length, 0);
  s = turn(s, [change()]); assert.equal(s.stats.rejected, 1); assert.equal(s.threads[0].status, "resolved");
  const prompt = buildLivingThreadPrompt({ threads: s.threads, state: s.state });
  assert.match(prompt, /Candidates to advance IF the scene naturally permits: \[\]/);
});

test("abandoned matters remain archived until a grounded explicitly referenced new event", () => {
  let s = turn(undefined, [change()]); const id = s.threads[0].id;
  const evidence = "Roman cancelled the necklace exchange.";
  s = turn(s, [change({ thread_id: id, status: "abandoned", evidence })], { reply: evidence });
  assert.equal(activeLivingThreads(s.threads).length, 0);
  const fresh = "Roman arranged a new meeting to return your necklace.";
  s = turn(s, [change({ thread_id: id, status: "developing", evidence: fresh })], { reply: fresh });
  assert.equal(s.threads[0].status, "developing"); assert.equal(s.threads[0].id, id);
});

test("latest regeneration restores the exact before-image; rejected kiss has no thread consequences", () => {
  let s = turn(undefined, [change()]); const objectId = s.threads[0].id;
  const kiss = "Roman kissed you, then stopped before admitting how much he wanted this.";
  s = turn(s, [change({ subject_key: "roman_unspoken_kiss", type: "unconfessed_feeling", summary: "Roman has not admitted what the kiss meant to him.", evidence: kiss })], { reply: kiss });
  assert.equal(s.threads.length, 2);
  const branch = prepareLivingThreadBranch({ threads: s.threads, state: s.state, replacementMessageId: "reply-2" });
  assert.equal(branch.threads.length, 1); assert.equal(branch.threads[0].id, objectId); assert.equal(branch.state.turn_index, 1);
  const rewritten = turn(branch, [], { messageId: "reply-2", reply: "Roman settled beside you without speaking." });
  assert.equal(rewritten.state.turn_index, 2); assert.equal(rewritten.threads.length, 1); assert.ok(!JSON.stringify(rewritten).includes("kiss"));
});

test("old rewrites without a before-image cannot reuse modern state from the rejected branch", () => {
  const s = turn(undefined, [change()]);
  const branch = prepareLivingThreadBranch({ threads: [...s.threads, { id: "legacy", title: "Older untouched promise" }], state: s.state, replacementMessageId: "untracked-old-reply" });
  assert.deepEqual(branch.threads.map(t => t.id), ["legacy"]); assert.deepEqual(branch.state, {});
});

test("state is isolated between stories and cooldowns rotate focus without forcing a beat", () => {
  const a = turn(undefined, [change()]), b = turn(undefined, []);
  assert.equal(b.threads.length, 0); assert.equal(a.threads.length, 1);
  const first = selectLivingThreads({ threads: a.threads, characterName: "Roman Knox" });
  assert.equal(first.length, 1);
  assert.equal(selectLivingThreads({ threads: a.threads, state: { focus_ids: [first[0].id] }, characterName: "Roman Knox" }).length, 0);
  assert.equal(selectLivingThreads({ threads: a.threads, state: { focus_ids: [first[0].id] }, latestUserMessage: "What about my necklace?", characterName: "Roman Knox" }).length, 1);
  assert.equal(selectLivingThreads({ threads: a.threads, characterName: "Chase Beaumont" }).length, 0);
});

test("malformed, routine and excessive proposals are bounded", () => {
  const s = turn(undefined, [null, change({ evidence: "hi" }), change({ summary: "Listen to you and provide a safe space." })]);
  assert.equal(s.threads.length, 0);
  const many = Array.from({ length: 30 }, (_, i) => change({ subject_key: `promise_${i}`, summary: `Unique obligation ${i}`, evidence: `Roman promised obligation number ${i}.` }));
  let state = { threads: [], state: {} };
  for (const c of many) state = turn(state, [c], { reply: c.evidence });
  assert.equal(state.threads.length, LIVING_THREAD_LIMITS.active);
  assert.equal(state.stats.created, 0);
  const schema = livingThreadResponseSchema(); assert.deepEqual(schema.propertyOrdering, ["reply", "thread_updates"]); assert.equal(schema.properties.thread_updates.maxItems, 3);
  const worst = Array.from({length: 24}, (_, i) => ({ id: `thread-${i}-${"i".repeat(80)}`, title: `${i} ${"summary ".repeat(40)}`, subject_key: `${i}_${"subject_".repeat(15)}`, characters: ["Roman"], importance: "high", status: i < 16 ? "open" : "resolved" }));
  assert.ok(buildLivingThreadPrompt({threads: worst, characterName: "Roman Knox"}).length < 6500, "Added prompt must remain bounded for long stories");
});

test("50-turn Roman continuity fixture: matters survive, return, evolve and resolve on-page", () => {
  let s = { threads: [], state: {} }; const births = new Set(); let developed = 0, resolved = 0;
  for (let i = 1; i <= 50; i++) {
    let reply = "Roman stayed beside you, leaving the quiet between you intact.", changes = [];
    if (i === 1) { reply = quote; changes = [change()]; }
    if (i === 7) { reply = "Roman's jaw tightened when Theo took the seat beside you."; changes = [change({ subject_key: "roman_theo_attention", type: "jealousy", summary: "Roman was bothered by Theo sitting beside you.", evidence: reply })]; }
    if (i === 12) { reply = "Roman placed your necklace back in your hand."; changes = [change({ thread_id: s.threads.find(t => t.type === "important_object").id, status: "resolved", summary: "Roman returned your necklace.", evidence: reply })]; resolved++; }
    if (i === 20) { reply = "Roman admitted Theo's closeness had bothered him, but kept the reason to himself."; changes = [change({ thread_id: s.threads.find(t => t.type === "jealousy").id, subject_key: "roman_theo_attention", type: "unconfessed_feeling", status: "developing", summary: "Roman hides why Theo's closeness matters to him.", evidence: reply })]; developed++; }
    if (i === 30) { reply = "Roman promised to explain what happened at the garage when they had privacy."; changes = [change({ subject_key: "roman_garage_explanation", type: "pending_conversation", summary: "Roman owes you an explanation about the garage.", evidence: reply })]; }
    if (i === 43) { reply = "Roman finally explained the garage incident, answering the question he had avoided."; changes = [change({ thread_id: s.threads.find(t => t.subject_key === "roman_garage_explanation").id, subject_key: "roman_garage_explanation", type: "pending_conversation", status: "resolved", summary: "Roman explained the garage incident.", evidence: reply })]; resolved++; }
    const focusIds = selectLivingThreads({ threads: s.threads, state: s.state, characterName: "Roman Knox", latestUserMessage: "." }).map(t => t.id);
    s = turn(s, changes, { reply, focusIds }); s.threads.forEach(t => births.add(t.id));
    assert.equal(s.state.turn_index, i); assert.ok(s.threads.length <= 3); assert.ok(buildLivingThreadPrompt({ threads: s.threads, state: s.state, characterName: "Roman Knox" }).length < 6500);
  }
  assert.equal(births.size, 3); assert.equal(developed, 1); assert.equal(resolved, 2);
  assert.equal(activeLivingThreads(s.threads).length, 1); assert.equal(activeLivingThreads(s.threads)[0].type, "unconfessed_feeling");
  assert.equal(s.threads.find(t => t.subject_key === "roman_theo_attention").opened_at_message_id, "reply-7");
  console.log("50-turn FIXTURE passed; this is a state regression, not 50 live model replies.");
});
