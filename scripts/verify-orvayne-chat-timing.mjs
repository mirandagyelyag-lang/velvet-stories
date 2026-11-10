import assert from "node:assert/strict";
import { createChatTimer } from "../supabase/functions/character-chat/chat-timing.ts";

let clock = 100;
const timer = createChatTimer(() => clock);
assert.match(timer.traceId, /^[0-9a-f-]{36}$/i);
clock = 124.7;
assert.equal(timer.mark("first_token"), 25);
clock = 190;
const snapshot = timer.snapshot();
assert.equal(snapshot.elapsedMs, 90);
assert.equal(snapshot.phases.first_token, 25);
snapshot.phases.first_token = 999;
assert.equal(timer.snapshot().phases.first_token, 25);
assert.deepEqual(Object.keys(timer.snapshot()).sort(), ["elapsedMs", "phases", "traceId"]);
console.log("ORVAYNE chat timing checks passed");
