import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pursuitEmotionPriorityV35265Issues } from "../supabase/functions/character-chat/engine/pursuit-emotion-priority-v35265.js";
import { normalizeRelationshipEmotionCoreV35266, updateRelationshipEmotionCoreV35266, buildPersistentEmotionalLifeV35266 } from "../supabase/functions/character-chat/engine/persistent-emotional-life-v35266.js";
import { buildGroundedLastResortReply } from "../supabase/functions/character-chat/engine/established-attraction-opportunity-v35219.js";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");
const fallbackCode=readFileSync(new URL("../supabase/functions/character-chat/engine/established-attraction-opportunity-v35219.js",import.meta.url),"utf8");

const chase={name:"Chase Beaumont",relationship:"Enemies to lovers. He is attracted to the user but hides it.",personality:"Confident, proud, persistent, teasing."};
const storm="You never mean anything *i was mad and i storm off*";
const silent="[SILENT_CONTINUE]";
const recent=[storm];

const sterile="Chase followed down the hallway, keeping a few paces back as the noise of the party faded behind them.";
const sterileIssues=pursuitEmotionPriorityV35265Issues({reply:sterile,latestUserMessage:silent,recentUserMessages:recent});
assert.ok(sterileIssues.includes("pursuit_emotion_flattened"));

const alive='Chase went after you immediately. "Not now," he snapped when someone called after him. He caught up. "You can be pissed at me. I’m still not leaving it like that."';
assert.deepEqual(pursuitEmotionPriorityV35265Issues({reply:alive,latestUserMessage:silent,recentUserMessages:recent}),[]);

const base=normalizeRelationshipEmotionCoreV35266({},chase,{});
const once=updateRelationshipEmotionCoreV35266({previous:base,character:chase,relationship:{},latestUserMessage:silent,recentUserMessages:recent,reply:alive,messageId:"m1"});
const twice=updateRelationshipEmotionCoreV35266({previous:once,character:chase,relationship:{},latestUserMessage:silent,recentUserMessages:recent,reply:alive,messageId:"m2"});
assert.ok(once.fear_of_loss>base.fear_of_loss);
assert.ok(once.unresolved_intensity>base.unresolved_intensity);
assert.equal(twice.fear_of_loss,once.fear_of_loss);
assert.equal(twice.unresolved_intensity,once.unresolved_intensity);

const prompt=buildPersistentEmotionalLifeV35266({state:base,character:chase,relationship:{},latestUserMessage:silent,recentUserMessages:recent});
assert.match(prompt,/SILENT CONTINUE CARRIES THE PREVIOUS USER BEAT/);
assert.match(prompt,/storm off/i);

const fallback=buildGroundedLastResortReply({character:chase,latestUserMessage:silent,recentUserMessages:recent,recentCharacterReplies:[],issues:["pursuit_emotion_flattened"]});
assert.match(fallback,/goes after you immediately/i);
assert.match(fallback,/not now/i);
assert.match(fallback,/not leaving it like that/i);

assert.doesNotMatch(fallbackCode,/lets the moment settle without deciding anything for you/);
assert.doesNotMatch(fallbackCode,/I’m not sure yet\. Let me be honest about that\./);
assert.match(edge,/buildGroundedLastResortReply\(\{ character, latestUserMessage, recentUserMessages/);
assert.match(edge,/recentUserMessages,\s*reply: result\.reply/);

console.log("PASS  silent continue carries storm-off emotional/physical beat");
console.log("PASS  sterile follow-a-few-paces reply is rejected");
console.log("PASS  emotionally motivated pursuit passes");
console.log("PASS  repeated silent continue does not double-count the same emotional event");
console.log("PASS  service-bot last-resort phrases are removed");
console.log("\n5 Emotional Carryover v3.52.67 checks passed.");
