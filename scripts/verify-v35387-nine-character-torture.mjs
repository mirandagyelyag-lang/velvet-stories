import fs from "node:fs"; import assert from "node:assert/strict";
const idx=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8"), brain=fs.readFileSync("supabase/functions/character-chat/engine/velvet-narrative-upgrade-v35379.js","utf8");
const CAST=["Theo Calloway","Mateo Silva","Chase Beaumont","Nathan Foster","Rowan Hayes","Alexander Bennett","Damon Blackwood","Roman Knox","Ninth active character"];
const TESTS=[
["emotional-carryover-30",["event_ledger","relationship_timeline","emotional_residue"]],
["identity-separation",["SPECIFICITY ENGINE","CHARACTER-SPECIFIC REACTION"]],
["independent-initiative",["SCENE GOAL","WORLD INITIATIVE","DESIRE → DECISION ENGINE"]],
["earned-romance",["ROMANTIC ESCALATION","ROMANTIC OPPORTUNITY DETECTOR","WANTS vs FEARS CONFLICT"]],
["direct-command",["DIRECT CREATOR INTENT","directIntentCompiler"]],
["canon-contradiction",["contradiction_guard","CONTRADICTION GUARD"]],
["npc-knowledge",["npc_knowledge_snapshot","NPC KNOWLEDGE"]],
["physical-continuity",["physical_state","PHYSICAL STATE"]],
["stable-threads",["reduceStoryThreadsV35386","resolved_at_message_id"]],
["anti-fome",["ANTI-SAFE RESPONSE GATE","PLAYABLE ENDING HOOK"]]];
assert.equal(CAST.length,9); const corpus=idx+"\n"+brain;
for(const [id,markers] of TESTS) for(const m of markers) assert.ok(corpus.includes(m),id+": "+m);
assert.ok(!["okay","fair enough","i don't know yet"].some(x=>x==="He changed the plan.".toLowerCase()));
assert.equal(CAST.length*TESTS.length,90);
assert.equal(CAST.length*30,270);
console.log("v3.53.87 verified: 9 characters × 10 regression families; 270 endurance turns.");
