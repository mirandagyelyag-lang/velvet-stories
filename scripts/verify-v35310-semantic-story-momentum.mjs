import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  semanticStoryMomentumIssues,
  buildSemanticStoryMomentumV35310,
} from "../supabase/functions/character-chat/engine/semantic-story-momentum-v35310.js";

const alexander={
  name:"Alexander Bennett",
  personality:"Confident, social, capable, charming.",
  relationship:"Close friend.",
  world:"University life with an established friend group.",
};

const opening=`Alex dropped his backpack onto the quad bench with a heavy thud, earning a groan from the rest of the group sprawled across the grass.

"Okay, change of plan," Alex announced, already pulling his phone out. "We're not sitting here for a three-hour lecture gap. Everyone pack it up."

"Since when do you skip study hours?" someone asked from the blanket.

"Since I realized it's eighty degrees outside and nobody actually brought books," Alex replied smoothly. He looked over the group, his attention instantly shifting. "We're grabbing iced coffee. And before anyone complains, I'm driving."

He turned toward you, holding up his keys with an easy grin. "You're walking with me. Come on."`;

const second=`Alex laughed, sliding his keys back into his pocket with a dry grin. "Deal. You get the mocha with way too much syrup, and I get the bill. Come on before the line gets stupid."`;

const third=`Alex glanced back with a grin, holding the heavy glass door of the student union open for you against the afternoon heat. "Keep that energy when the line is out the door and we're stuck behind freshmen who don't know what an americano is."`;

const openingIssues=semanticStoryMomentumIssues({
  reply:opening,
  character:alexander,
  opening:true,
});
assert.ok(openingIssues.includes("semantic_user_movement_assumed"));
assert.ok(openingIssues.includes("semantic_campus_coffee_study_fallback"));

const secondIssues=semanticStoryMomentumIssues({
  reply:second,
  latestUserMessage:"Only if you're paying for the iced coffee",
  recentUserMessages:["Only if you're paying for the iced coffee"],
  recentCharacterReplies:[opening],
  character:alexander,
});
assert.ok(secondIssues.includes("semantic_invented_user_preference"));

const thirdIssues=semanticStoryMomentumIssues({
  reply:third,
  latestUserMessage:"*i stand up and follow you*",
  recentUserMessages:["Only if you're paying for the iced coffee","*i stand up and follow you*"],
  recentCharacterReplies:[opening,second],
  character:alexander,
});
assert.ok(thirdIssues.includes("semantic_blocking_banter_stall"));
assert.ok(thirdIssues.includes("semantic_repeated_grin_mannerism"));

const good=`Alex's phone buzzed once. He checked the screen, then looked back at the group. "Actually, coffee can wait. Carter just got us the last two spots for tonight." He pocketed the phone. "I'm going. You can come if you want, but I'm not wasting the tickets."`;
const goodIssues=semanticStoryMomentumIssues({
  reply:good,
  latestUserMessage:"*i stand up and follow you*",
  recentCharacterReplies:[opening,second],
  character:alexander,
});
assert.ok(!goodIssues.includes("semantic_blocking_banter_stall"));
assert.ok(!goodIssues.includes("semantic_user_movement_assumed"));

const directive=buildSemanticStoryMomentumV35310({
  latestUserMessage:"*i stand up and follow you*",
  recentCharacterReplies:[opening,second],
  character:alexander,
});
assert.match(directive,/FINAL MEANING GATE/);
assert.match(directive,/BANTER IS NOT MOMENTUM/);
assert.match(directive,/Never manufacture intimacy through invented preferences/);
assert.match(directive,/LIVING SCENE ENGINE/);
assert.match(directive,/PLAYABLE, NOT DECORATIVE/);
assert.match(directive,/VARIETY FIREWALL/);
assert.match(directive,/NO SAVIOR ASSUMPTION/);
assert.match(directive,/CHARACTER HAS A LIFE/);
assert.match(directive,/Do not force a mystery hook/);

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");
assert.match(edge,/FIRST_DRAFT_WINS_V35268 = false/);
assert.match(edge,/const guardedDraft = true/);
assert.match(edge,/semanticStoryMomentumIssues/);
assert.match(edge,/semantic_campus_coffee_study_fallback/);
assert.match(edge,/semantic_blocking_banter_stall/);

console.log("PASS  Alexander campus + iced-coffee opening is rejected");
console.log("PASS  invented mocha preference is rejected");
console.log("PASS  door + grin + freshmen banter stall is rejected");
console.log("PASS  meaningful changed-plan example passes semantic stall gate");
console.log("PASS  raw prose is quarantined until validation");
console.log("\n5 Semantic Story Momentum v3.53.10 checks passed.");
