import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildPursuitEmotionPriorityV35265,
  pursuitEmotionPriorityV35265Issues,
} from "../supabase/functions/character-chat/engine/pursuit-emotion-priority-v35265.js";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const agency = readFileSync(new URL("../supabase/functions/character-chat/engine/independent-agency-desire-v34935.ts", import.meta.url), "utf8");

const latest = `You never mean anything *i was mad and i storm off*`;

const exactBad = `He stayed where he was, watching her push past the cluster of sophomores blocking the hallway by the stairs, one of whom murmured a quick, awkward "Hey, Chase" as he barely registered them.`;
const exactBadIssues = pursuitEmotionPriorityV35265Issues({
  reply: exactBad,
  latestUserMessage: latest,
  recentUserMessages: [],
});
assert.ok(exactBadIssues.includes("required_pursuit_missing"));
assert.ok(exactBadIssues.includes("departure_passively_released"));

const npcStealsBeat = `Chase went after you, but Miller stepped in front of him asking about the tailgate. Chase stopped to answer him, explaining which car was running third.`;
const npcIssues = pursuitEmotionPriorityV35265Issues({
  reply: npcStealsBeat,
  latestUserMessage: latest,
  recentUserMessages: [],
});
assert.ok(npcIssues.includes("departure_priority_stolen_by_npc"));

const good = `Chase swore under his breath and went after you immediately. "Beaumont, Miller's looking for you about the tailgate—" "Not now." He didn't slow down, pushing through the hallway after you. "Hey. Wait."`;
assert.deepEqual(pursuitEmotionPriorityV35265Issues({
  reply: good,
  latestUserMessage: latest,
  recentUserMessages: [],
}), []);

const boundaryLatest = `Leave me alone. Don't follow me. *I storm off*`;
assert.deepEqual(pursuitEmotionPriorityV35265Issues({
  reply: `Chase stopped at the doorway instead of following. "Fine."`,
  latestUserMessage: boundaryLatest,
  recentUserMessages: [],
}), []);
assert.ok(pursuitEmotionPriorityV35265Issues({
  reply: `Chase followed you into the hall. "Wait."`,
  latestUserMessage: boundaryLatest,
  recentUserMessages: [],
}).includes("pursuit_boundary_violated"));

const brief = buildPursuitEmotionPriorityV35265({
  character: { name: "Chase Beaumont", personality: "confident and proud" },
  latestUserMessage: latest,
});
assert.match(brief, /THIS CHARACTER FOLLOWS IN THE SAME TURN/);
assert.match(brief, /THIS IS CREATOR CANON, NOT A PERSONALITY GUESS/);
assert.match(brief, /EMOTION DRIVES THE MOVEMENT/);
assert.match(brief, /NPC\/OBLIGATION PRIORITY/);

assert.match(edge, /buildPursuitEmotionPriorityV35265/);
assert.match(edge, /\$\{pursuitEmotionPriorityV35265\}/);
assert.match(edge, /"required_pursuit_missing"/);
assert.match(edge, /"departure_priority_stolen_by_npc"/);
assert.match(edge, /"pursuit_boundary_violated"/);
assert.match(edge, /CREATOR PURSUIT RULE/);
assert.doesNotMatch(edge.slice(edge.indexOf("const REPAIR_TRIGGER_ISSUES"), edge.indexOf("const HARD_REPAIR_REQUIRED_ISSUES")), /"agency_automatic_pursuit"/);

assert.match(agency, /CREATOR PURSUIT OVERRIDE/);
assert.doesNotMatch(agency, /issues\.push\('agency_automatic_pursuit'\)/);
assert.match(agency, /agency_pursuit_boundary_violation/);

console.log("PASS  exact Chase stay-behind reply is rejected");
console.log("PASS  tailgate/NPC logistics cannot steal the pursuit beat");
console.log("PASS  physical pursuit + emotional priority passes");
console.log("PASS  explicit no-pursuit boundary overrides creator pursuit");
console.log("PASS  old autonomy rule no longer punishes following");
console.log("\n5 Pursuit + Emotion v3.52.65 checks passed.");
