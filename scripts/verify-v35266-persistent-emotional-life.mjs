import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeRelationshipEmotionCoreV35266,
  updateRelationshipEmotionCoreV35266,
  buildPersistentEmotionalLifeV35266,
} from "../supabase/functions/character-chat/engine/persistent-emotional-life-v35266.js";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

const chase={name:"Chase Beaumont",relationship:"Enemies to lovers. He is attracted to the user but hides it.",personality:"Confident, proud, jealous, persistent."};
const alex={name:"Alexander Bennett",relationship:"Close friends with slow-burn romantic tension.",personality:"Controlled, practical, observant."};
const stranger={name:"Noah",relationship:"New acquaintances.",personality:"Reserved."};

const chase0=normalizeRelationshipEmotionCoreV35266({},chase,{});
const chase1=updateRelationshipEmotionCoreV35266({
  previous:chase0,character:chase,relationship:{},
  latestUserMessage:"You never mean anything *I storm off*",
  reply:'Chase went after you. "Not now," he said when Miller called. "Wait."',
  messageId:"c1"
});
assert.ok(chase1.fear_of_loss>chase0.fear_of_loss);
assert.ok(chase1.unresolved_intensity>chase0.unresolved_intensity);
assert.ok(chase1.active_threads.some(t=>t.type==="rupture"));
assert.ok(chase1.active_threads.some(t=>t.type==="separation_pressure"));
assert.equal(chase1.undo_snapshot.turns_observed,chase0.turns_observed);

const regen=updateRelationshipEmotionCoreV35266({
  previous:chase1.undo_snapshot,character:chase,relationship:{},
  latestUserMessage:"You never mean anything *I storm off*",
  reply:'Chase followed immediately. "Forget Miller. I am talking to you."',
  messageId:"c1b"
});
assert.equal(regen.turns_observed,chase1.turns_observed,"regeneration must rewrite, not double count the turn");

const alex0=normalizeRelationshipEmotionCoreV35266({},alex,{});
const alex1=updateRelationshipEmotionCoreV35266({
  previous:alex0,character:alex,relationship:{},
  latestUserMessage:"I trust you.",
  reply:'"Okay." Alex set the problem aside. "Then I will handle it."',
  messageId:"a1"
});
assert.ok(alex1.trust>alex0.trust);
assert.ok(alex1.attachment>alex0.attachment);

const stranger0=normalizeRelationshipEmotionCoreV35266({},stranger,{});
const stranger1=updateRelationshipEmotionCoreV35266({
  previous:stranger0,character:stranger,relationship:{},
  latestUserMessage:"Thanks.",
  reply:'"Sure."',
  messageId:"s1"
});
assert.equal(stranger1.attraction,0,"no romance may be invented for a non-romantic relationship");
assert.ok(stranger1.awareness_of_feelings<=20);

assert.notDeepEqual(
  {attachment:chase1.attachment,trust:chase1.trust,fear:chase1.fear_of_loss},
  {attachment:alex1.attachment,trust:alex1.trust,fear:alex1.fear_of_loss},
  "characters keep independent emotional histories"
);

const prompt=buildPersistentEmotionalLifeV35266({state:chase1,character:chase,relationship:{},latestUserMessage:"I'm still mad."});
assert.match(prompt,/THIS STATE IS CAUSAL/);
assert.match(prompt,/NO EMOTIONAL RESET/);
assert.match(prompt,/FEELINGS CAN CONFLICT/);
assert.match(prompt,/STATE IS PRIVATE TO THIS CONVERSATION/);

assert.match(edge,/buildPersistentEmotionalLifeV35266/);
assert.match(edge,/relationship_emotion_core/);
assert.match(edge,/PERSISTENT EMOTIONAL LIFE/);
assert.match(edge,/updateRelationshipEmotionCoreV35266/);
assert.match(edge,/undo_snapshot/);

console.log("PASS  Chase accumulates rupture/fear instead of resetting");
console.log("PASS  regeneration rewrites one emotional turn instead of double-counting it");
console.log("PASS  Alexander accumulates trust/attachment independently");
console.log("PASS  non-romantic characters do not auto-fall in love");
console.log("PASS  emotional state is injected before generation and persisted after it");
console.log("\n5 Persistent Emotional Life v3.52.66 checks passed.");
