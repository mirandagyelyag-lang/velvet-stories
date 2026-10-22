import fs from "node:fs"; import assert from "node:assert/strict";
const e=fs.readFileSync("supabase/functions/character-chat/engine/live-story-evaluator-v35388.js","utf8");
const i=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
for(const x of ["characterFidelity","storyMovement","emotionalContinuity","romanticProgression","specificity","initiative","subtext","worldLife","continuity","replyValue","character_collision_risk","dead_safe_reply","near_duplicate_reply"])assert.ok(e.includes(x),x);
assert.ok(i.includes("evaluateLiveStoryV35388")); assert.ok(i.includes("liveStoryRepairIssuesV35388"));
assert.match(i,/VELVET_ENGINE_RELEASE\s*=\s*"\d+"/);
assert.ok(!e.includes("fetch(")); assert.ok(!e.includes("Gemini")); assert.ok(!e.includes("generateContent"));
console.log("v3.53.88 deterministic live story evaluator verified");
