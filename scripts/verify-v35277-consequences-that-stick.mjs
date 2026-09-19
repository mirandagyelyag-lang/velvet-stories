import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildConsequencesThatStickV35277,
  consequencesThatStickV35277Issues,
  inferStickyVisibleConsequenceV35277,
} from "../supabase/functions/character-chat/engine/consequences-that-stick-v35277.js";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

const world={
  activeChains:[
    {
      title:"Fight with Antonia",
      cause:"Chase pushed too hard at the party.",
      effect:"The conflict remains unresolved.",
      weight:4,
      status:"active",
      participants:["Chase Beaumont","Antonia"],
      permanence:"medium",
      decay:"needs visible repair",
    },
    {
      title:"Marcus knows about the kiss",
      cause:"Marcus witnessed Chase kiss Elena.",
      effect:"Marcus knows; nobody else has been told.",
      weight:2,
      status:"active",
      participants:["Chase Beaumont","Marcus","Elena"],
      permanence:"temporary",
      decay:"can fade but remains factual",
    },
  ],
  rumorBeliefs:[],
  institutionalMemory:[],
};

const prompt=buildConsequencesThatStickV35277({
  character:{name:"Chase Beaumont"},
  userName:"Antonia",
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:[".","."],
  recentCharacterReplies:[
    "Chase went back inside.",
    "Marcus saw him talking to Elena by the kitchen.",
  ],
  scene:{location:"party",present:["Chase Beaumont","Marcus","Elena"]},
  behavior:{},
  worldConsequences:world,
  longStoryMemory:{
    perspectiveMemory:{
      objective:["Chase kissed Elena."],
      characterKnown:["Chase knows he kissed Elena."],
      publicKnown:[],
    },
  },
});
assert.match(prompt,/DORMANCY ≠ RESOLUTION/);
assert.match(prompt,/DELAYED CONSEQUENCES ARE PREFERRED OVER INSTANT MORALIZATION/);
assert.match(prompt,/NO ROMANCE SAFETY NET/);
assert.match(prompt,/INFORMATION IS UNEVEN/);
assert.match(prompt,/DISCOVERY CAN BE DELAYED/);
assert.match(prompt,/REPAIR REQUIRES EVIDENCE/);
assert.match(prompt,/RECORD DURABLE EVENTS/);

const badRomance=`Chase kissed Elena back. The second it happened, he immediately regretted it. She wasn't you. It meant nothing.`;
const badIssues=consequencesThatStickV35277Issues({
  reply:badRomance,
  latestUserMessage:"[SILENT_CONTINUE]",
  recentCharacterReplies:["Chase went back to the party."],
  worldConsequences:world,
});
assert.ok(badIssues.includes("instant_regret_romance_safety_net"));

const allowedRegret=`Chase kissed Elena, then pulled back. He'd already known this was a mistake before he leaned in, and the guilt landed anyway.`;
const allowedIssues=consequencesThatStickV35277Issues({
  reply:allowedRegret,
  latestUserMessage:"Do you regret what happened?",
  recentCharacterReplies:["Chase admitted he'd been feeling guilty all morning."],
  worldConsequences:world,
});
assert.ok(!allowedIssues.includes("instant_regret_romance_safety_net"));

const omniscient=`By morning, everyone knew what Chase had done.`;
const infoIssues=consequencesThatStickV35277Issues({
  reply:omniscient,
  latestUserMessage:".",
  recentCharacterReplies:[],
  worldConsequences:{activeChains:[],rumorBeliefs:[],institutionalMemory:[]},
});
assert.ok(infoIssues.includes("knowledge_propagated_without_route"));

const inferredKiss=inferStickyVisibleConsequenceV35277({
  reply:`Chase kissed Elena before either of them could turn it into a joke.`,
  characterName:"Chase Beaumont",
  scene:{present:["Chase Beaumont","Elena","Marcus"]},
});
assert.equal(inferredKiss?.record,true);
assert.equal(inferredKiss?.title,"Visible romantic choice");
assert.equal(inferredKiss?.status,"active");
assert.deepEqual(inferredKiss?.participants,["Chase Beaumont"]);

const inferredPromise=inferStickyVisibleConsequenceV35277({
  reply:`"I'll be there tomorrow," Chase promised.`,
  characterName:"Chase Beaumont",
  scene:{},
});
assert.equal(inferredPromise?.title,"Promise made");

const nothing=inferStickyVisibleConsequenceV35277({
  reply:`Chase took a sip of water and checked the score.`,
  characterName:"Chase Beaumont",
  scene:{},
});
assert.equal(nothing,null);

assert.match(edge,/buildConsequencesThatStickV35277/);
assert.match(edge,/\$\{consequencesThatStickV35277\}/);
assert.match(edge,/inferStickyVisibleConsequenceV35277/);
assert.match(edge,/effectiveWorldConsequence/);
assert.match(edge,/order\("status", \{ ascending: true \}\)\.order\("updated_at", \{ ascending: false \}\)\.limit\(18\)/);
assert.match(edge,/consequence_foreground_thread: keep/);
assert.match(edge,/consequence_dormant_threads: keep/);
assert.match(edge,/information_asymmetry_note: keep/);
assert.match(edge,/FIRST_DRAFT_WINS_V35268 = true/);

console.log("PASS  outside romance is not auto-erased by instant regret");
console.log("PASS  knowledge does not teleport across the cast");
console.log("PASS  durable visible events have deterministic persistence fallback");
console.log("PASS  active old consequences are loaded ahead of resolved/cancelled rows");
console.log("PASS  dormant/foreground/info-asymmetry consequence state persists");
console.log("\n5 Consequences That Stick v3.52.77 checks passed.");
