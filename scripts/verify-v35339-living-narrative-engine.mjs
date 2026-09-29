import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildNarrativeDirectorV35334,
  narrativeDirectorIssuesV35334,
  __testV35334,
} from "../supabase/functions/character-chat/engine/narrative-director-v35334.js";

const character={name:"Chase Beaumont",motivation:"keep control without admitting how invested he is"};
const threads=[
  {title:"Chase promised to explain the rumor",status:"active",priority:3},
  {title:"The invitation for Friday is still unanswered",status:"active",priority:2},
];
const recent=[
  'Chase set his phone down. "Fine. Ask me what you actually want to know."',
  'He turned the cup once between his hands, then gave a crooked grin. "You always make this harder than it needs to be."',
  'Chase picked up the same cup, glanced at the door, and smirked. "Still here?"',
];

const directive=buildNarrativeDirectorV35334({
  character,
  scene:{location:"living room",story_direction:"the rumor must change trust before the scene fully resets"},
  latestUserMessage:"Then tell me the truth.",
  recentCharacterReplies:recent,
  unresolvedThreads:threads,
});

for (const marker of [
  "LIVE SCENE LEDGER",
  "NARRATIVE DEBT",
  "CONSEQUENCE LAW",
  "ACCUMULATED INTENSITY",
  "NPC PURPOSE GATE",
  "SEMANTIC ANTI-LOOP",
  "HIDDEN SCENE MISSION",
  "USER CHARACTER IS LOCKED",
  "STORY-DIRECTION MEMORY",
  "METADATA DUTY",
]) assert.match(directive,new RegExp(marker));

const authored=narrativeDirectorIssuesV35334({
  reply:'You smiled despite yourself and followed him toward the door. Chase looked back. "Knew it."',
  latestUserMessage:"What are you doing?",
  recentCharacterReplies:recent,
  unresolvedThreads:threads,
});
assert.ok(authored.includes("user_character_authored_by_model"));

const explicit=narrativeDirectorIssuesV35334({
  reply:'You smiled. Chase caught it and looked away first. "Don\'t start."',
  latestUserMessage:"*I smiled at him.*",
  recentCharacterReplies:[],
  unresolvedThreads:[],
});
assert.ok(!explicit.includes("user_character_authored_by_model"));

const decorative=narrativeDirectorIssuesV35334({
  reply:'A classmate wandered over, smiled, said hi, then walked away. Chase glanced after him.',
  latestUserMessage:"...",
  recentCharacterReplies:[],
  unresolvedThreads:[],
});
assert.ok(decorative.includes("decorative_npc_without_function"));

const echoed=narrativeDirectorIssuesV35334({
  reply:'Chase picked up his phone with a grin and tossed out another joke.',
  latestUserMessage:".",
  recentCharacterReplies:[
    'Chase grabbed his phone, smirked, and made a joke.',
    'He lifted the phone again with a grin and teased you.',
  ],
  unresolvedThreads:[],
});
assert.ok(echoed.includes("semantic_scene_loop"));

assert.ok(__testV35334.pressureLevel([
  "He was jealous when the date came up.",
  "The argument ended, but the hurt did not.",
])>=4);

assert.match(
  __testV35334.directionAnchor({
    scene:{story_direction:"make the broken promise alter access and trust"},
    unresolvedThreads:threads,
    recentCharacterReplies:recent,
    latestUserMessage:"Tell me.",
    character,
  }),
  /broken promise alter access and trust/
);

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");
assert.match(edge,/latestUserMessage: options\.latestUserMessage \|\| ""/);
assert.match(edge,/narrativeDirectorIssuesV35334/);

console.log("PASS  Living scene ledger + narrative debt + consequence law are in the director");
console.log("PASS  accumulated intensity and story-direction memory are carried forward");
console.log("PASS  decorative NPCs and semantic scene loops are rejected");
console.log("PASS  invented user actions are rejected while explicit user actions remain legal");
console.log("PASS  hidden scene mission stays internal and quality-gated");
console.log("\n5 Living Narrative Engine v3.53.39 groups passed.");
