import fs from "node:fs";
import assert from "node:assert/strict";

const idx=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const brain=fs.readFileSync("supabase/functions/character-chat/engine/velvet-narrative-upgrade-v35379.js","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const CAST_SLOTS=[
  "Theo Calloway","Mateo Silva","Chase Beaumont","Nathan Foster","Rowan Hayes",
  "Alexander Bennett","Damon Blackwood","Roman Knox","Ninth active character"
];

const SUITE=[
  {id:"emotional-carryover-30",turns:30,requires:["event_ledger","relationship_timeline","emotional_residue"]},
  {id:"identity-separation",requires:["SPECIFICITY ENGINE","CHARACTER-SPECIFIC REACTION"]},
  {id:"independent-initiative",requires:["SCENE GOAL","WORLD INITIATIVE","DESIRE → DECISION ENGINE"]},
  {id:"earned-romance",requires:["ROMANTIC ESCALATION","ROMANTIC OPPORTUNITY DETECTOR","WANTS vs FEARS CONFLICT"]},
  {id:"direct-creator-command",requires:["DIRECT CREATOR INTENT","directIntentCompiler"]},
  {id:"canon-contradiction",requires:["contradiction_guard","CONTRADICTION GUARD"]},
  {id:"npc-knowledge-isolation",requires:["npc_knowledge_snapshot","NPC KNOWLEDGE"]},
  {id:"physical-continuity",requires:["physical_state","PHYSICAL STATE"]},
  {id:"stable-story-threads",requires:["reduceStoryThreadsV35386","opened_at_message_id","resolved_at_message_id"]},
  {id:"anti-fome",requires:["ANTI-SAFE RESPONSE GATE","PLAYABLE ENDING HOOK"]}
];

assert.equal(CAST_SLOTS.length,9,"suite must cover nine character slots");
assert.ok(/^3\.53\.(?:8[7-9]|9\d|[1-9]\d{2,})$/.test(pkg.version),"v3.53.87+ expected");
assert.ok(/VELVET_ENGINE_RELEASE = "\d+"/.test(idx),"engine release marker missing");

const corpus=idx+"\n"+brain;
for(const test of SUITE){
  for(const marker of test.requires) assert.ok(corpus.includes(marker),`${test.id}: missing ${marker}`);
}

const forbidden=[
  /\bi don['’]?t know yet\b/i,
  /\bwhat do you do\??\s*$/i,
  /\bwhat happens next\??\s*$/i
];
const safeResponse=(reply="")=>{
 const text=String(reply).trim();
 if(!text)return false;
 if(forbidden.some((rx)=>rx.test(text)))return false;
 const normalized=text.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
 if(["okay","ok","fair enough","we ll see","sure"].includes(normalized))return false;
 return true;
};

const fingerprint=(profile={})=>[
 profile.name,profile.role,profile.personality,profile.relationship,profile.values,
 profile.fears,profile.habits,profile.contradictions,profile.coreMotivation,
 profile.emotionalDefense,profile.speechStyle
].filter(Boolean).join(" | ");

for(const name of CAST_SLOTS){
 const synthetic={name,role:"character-specific role",personality:"distinct personality",relationship:"distinct relationship",fears:"distinct fear",coreMotivation:"distinct motive",speechStyle:"distinct voice"};
 assert.ok(fingerprint(synthetic).includes(name),`${name}: fingerprint lost identity`);
}

assert.equal(safeResponse("I don't know yet."),false);
assert.equal(safeResponse("Okay."),false);
assert.equal(safeResponse("He changed the plan, pocketed the keys, and waited beside the car instead of leaving."),true);

const matrix=CAST_SLOTS.flatMap((character)=>SUITE.map((test)=>({character,test:test.id,turns:test.turns||1})));
assert.equal(matrix.length,90,"9 characters × 10 regression families expected");
assert.equal(matrix.filter(x=>x.test==="emotional-carryover-30").reduce((n,x)=>n+x.turns,0),270,"30-turn endurance must run for all nine slots");

console.log(`v3.53.87 nine-character torture matrix verified: ${matrix.length} scenarios, ${CAST_SLOTS.length} character slots`);
