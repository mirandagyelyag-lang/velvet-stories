import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRelationshipInterpretationV35343,
  relationshipInterpretationIssuesV35343,
  __testV35343,
} from "../supabase/functions/character-chat/engine/relationship-interpretation-v35343.js";

assert.equal(__testV35343.observableUserFunction("*I cross my arm with yours*"),"approach");
assert.equal(__testV35343.observableUserFunction("*I let go and step back*"),"withdraw");
assert.equal(__testV35343.observableUserFunction("You choose"),"delegation");

assert.match(
  __testV35343.localPattern([
    "*I hold your hand*","okay","*I let go*","hi","*I link my arm with yours*","*I step back*"
  ]),
  /approach-withdraw/
);

const flatReplies=[
  'He smiled. "Sure."',
  "He glanced over and shrugged.",
  "He laughed and kept walking.",
  "He nodded, checking his phone.",
];
assert.equal(__testV35343.flatRecentScene(flatReplies),true);

const flatIssues=relationshipInterpretationIssuesV35343({
  reply:'He smiled. "Sure."',
  latestUserMessage:"Okay",
  recentCharacterReplies:flatReplies,
});
assert.ok(flatIssues.includes("flat_scene_not_interrupted"));

const mindread=relationshipInterpretationIssuesV35343({
  reply:"He knew you were jealous, even if you would not admit it.",
  latestUserMessage:"Whatever.",
});
assert.ok(mindread.includes("relationship_interpretation_mindread_user"));

const delegation=relationshipInterpretationIssuesV35343({
  reply:'"Your choice. What do you want to do?"',
  latestUserMessage:"You choose.",
});
assert.ok(delegation.includes("delegated_decision_returned_to_user"));

const perfect=relationshipInterpretationIssuesV35343({
  reply:'"I understand how you feel. Your feelings are valid, and I respect whatever you decide."',
  latestUserMessage:"I am mad at you.",
});
assert.ok(perfect.includes("character_became_emotionally_perfect"));

const directive=buildRelationshipInterpretationV35343({
  character:{name:"Roman Knox"},
  latestUserMessage:"*I let go and step back*",
  recentUserMessages:["*I hold your hand*","*I let go*"],
  recentCharacterReplies:flatReplies,
  behavior:{relationship_interpretation:"access had increased"},
});
for(const key of [
  "INTERPRET BEFORE REACTING",
  "RELATIONSHIP DELTA IS MULTI-AXIS",
  "DECISION DERIVATION",
  "CHARACTER STRESS SIGNATURE",
  "ANTI-PERFECT RESPONSE",
  "DYNAMIC SCENE OBJECTIVE",
  "CONSEQUENCE CAN ARRIVE LATER",
  "UNCERTAINTY IS REAL",
  "LOCAL PATTERN MEMORY ONLY",
  "DO NOT RESOLVE TOO FAST",
  "FLAT-SCENE INTERVENTION IS DUE NOW",
]) assert.ok(directive.includes(key), key);

const index=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");
assert.match(index,/buildRelationshipInterpretationV35343/);
assert.match(index,/relationshipInterpretationIssuesV35343/);
assert.ok(index.includes("RELATIONSHIP INTERPRETATION\n${relationshipInterpretationV35343}"));
assert.doesNotMatch(index,/worldConsequences: worldConsequences \|\| \{\}/);

console.log("PASS  visible events are interpreted without mind-reading");
console.log("PASS  local interaction patterns remain chat-scoped");
console.log("PASS  flat scenes require a grounded state change");
console.log("PASS  delegated decisions cannot be handed back");
console.log("PASS  emotionally perfect AI speech is rejected");
console.log("PASS  main + recovery generation both receive relationship interpretation");
console.log("\n6 Relationship Interpretation v3.53.43 groups passed.");
