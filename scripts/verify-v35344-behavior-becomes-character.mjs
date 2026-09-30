import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBehaviorBecomesCharacterV35344,
  behaviorBecomesCharacterIssuesV35344,
  __testV35344,
} from "../supabase/functions/character-chat/engine/behavior-becomes-character-v35344.js";

assert.equal(__testV35344.userEventKind("*I hold your hand*"),"closeness");
assert.equal(__testV35344.userEventKind("*I let go and step back*"),"distance");
assert.equal(__testV35344.userEventKind("You choose"),"trust_or_delegation");

const pattern=__testV35344.localBehaviorPattern(
  ["*I hold your hand*","okay","*I let go*","*I link arms with you*","*I step back*"],
  ["He stayed beside you.","He gave you room."]
);
assert.match(pattern,/changed access/);

assert.equal(__testV35344.timeSkipSignal({time_label:"Three weeks later"},""),"long");

const obsession=behaviorBecomesCharacterIssuesV35344({
  reply:"Nothing else mattered anymore. You were all he cared about.",
  character:{name:"Alexander Bennett",personality:"protective, confident"},
});
assert.ok(obsession.includes("attachment_became_user_obsession"));

const repair=behaviorBecomesCharacterIssuesV35344({
  reply:"Everything was fine now. Trust was fully restored.",
  character:{name:"Alexander Bennett",personality:"protective, confident"},
  behavior:{conflict_scar:"He broke a promise and trust narrowed."},
});
assert.ok(repair.includes("trust_repair_declared_without_evidence"));

const regen=behaviorBecomesCharacterIssuesV35344({
  reply:"It felt like they were strangers again, with no history between them.",
  character:{name:"Roman Knox",personality:"proud, intense rival"},
  behavior:{relationship_history_compression:"Repeated choices created reluctant trust."},
  isRegeneration:true,
});
assert.ok(regen.includes("regeneration_erased_relationship_history"));

const skip=behaviorBecomesCharacterIssuesV35344({
  reply:"Three weeks later, everything was normal again and nothing from before mattered.",
  character:{name:"Roman Knox",personality:"proud, intense rival"},
  behavior:{conflict_scar:"A serious argument changed access."},
  scene:{time_label:"Three weeks later"},
});
assert.ok(skip.includes("time_skip_erased_durable_relationship_state"));

const directive=buildBehaviorBecomesCharacterV35344({
  character:{name:"Theo Calloway",personality:"kind, socially magnetic",relationship:"friends to lovers"},
  latestUserMessage:"*I hold your hand*",
  recentUserMessages:["*I held your hand*","*I linked arms with you*"],
  recentCharacterReplies:["Theo stayed beside you.","Theo chose the seat beside you."],
  behavior:{conflict_scar:"A prior misunderstanding made him more careful."},
  scene:{time_label:"Later that evening"},
  isRegeneration:false,
});
for(const key of [
  "RELATIONSHIP HISTORY COMPRESSION",
  "BEHAVIORAL HABIT FORMATION",
  "CONTROLLED TRAIT DRIFT",
  "CONFLICT MEMORY",
  "RELATIONSHIP EXPECTATIONS",
  "TRUST REPAIR MODEL",
  "ATTACHMENT WITHOUT OBSESSION",
  "TIME-SKIP CARRYOVER",
  "MILESTONE DETECTION",
  "REGENERATION ANTI-AMNESIA",
]) assert.ok(directive.includes(key), key);

const index=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");
assert.match(index,/buildBehaviorBecomesCharacterV35344/);
assert.match(index,/behaviorBecomesCharacterIssuesV35344/);
assert.ok(index.includes("${behaviorBecomesCharacterV35344}"));
for(const field of [
  "relationship_history_compression",
  "earned_behavior_habits",
  "trait_drift_summary",
  "conflict_scar",
  "relationship_expectations",
  "trust_repair_evidence",
  "milestone_summary",
  "time_skip_carryover",
  "regeneration_continuity_anchor",
]) assert.ok(index.includes(field), field);

console.log("PASS  repeated behavior can become earned habit");
console.log("PASS  trait drift remains identity-anchored");
console.log("PASS  conflict scars and trust repair survive");
console.log("PASS  attachment cannot erase independent life");
console.log("PASS  time skips preserve durable relationship state");
console.log("PASS  regeneration cannot reset earned history");
console.log("PASS  persistence fields are wired into live state");
console.log("\n7 Behavior Becomes Character v3.53.44 groups passed.");
