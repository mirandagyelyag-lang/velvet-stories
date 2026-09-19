import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRelationshipArcDirectorV35278,
  deriveRelationshipArcStateV35278,
  relationshipArcDirectorV35278Issues,
} from "../supabase/functions/character-chat/engine/relationship-arc-director-v35278.js";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

const chase={
  name:"Chase Beaumont",
  relationship:"Enemies to lovers. He likes the user but they are not together.",
  personality:"Confident, social, proud, emotionally guarded.",
};

const chemistryEarly={
  axes:{attraction:34,trust:18,comfort:20,attachment:22,commitment:4},
  paceGate:{status:"hold"},
  conflictResidue:{active:false,level:0},
};
const emotionEarly={
  attraction:34,attachment:22,trust:18,awareness_of_feelings:12,vulnerability:8,
  resentment:0,unresolved_intensity:0,
};
const early=deriveRelationshipArcStateV35278({
  character:chase,
  relationship:{status:"not exclusive"},
  behavior:{},
  emotionState:emotionEarly,
  chemistry:chemistryEarly,
  narrativeArc:{relationshipPace:{gate:"hold"}},
});
assert.equal(early.route,"enemies_to_lovers");
assert.ok(["attention","preference"].includes(early.stage));

const catchup=deriveRelationshipArcStateV35278({
  character:chase,
  relationship:{status:"not exclusive"},
  behavior:{},
  emotionState:{attraction:70,attachment:64,trust:58,awareness_of_feelings:62,vulnerability:44},
  chemistry:{axes:{attraction:70,trust:58,comfort:54,attachment:64,commitment:52},paceGate:{status:"allow_progress"},conflictResidue:{level:0}},
  narrativeArc:{relationshipPace:{gate:"allow_meaningful_shift"}},
});
assert.ok(catchup.stage_index>=5);

const capped=deriveRelationshipArcStateV35278({
  character:chase,
  relationship:{status:"not exclusive"},
  behavior:{relationship_arc_stage:"preference"},
  emotionState:{attraction:90,attachment:90,trust:80,awareness_of_feelings:90,vulnerability:80},
  chemistry:{axes:{attraction:90,trust:80,comfort:80,attachment:90,commitment:85},paceGate:{status:"progress_due"},conflictResidue:{level:0}},
  narrativeArc:{relationshipPace:{gate:"progress_due"}},
});
assert.equal(capped.stage_index,3);
assert.equal(capped.stage,"pull");

const noReset=deriveRelationshipArcStateV35278({
  character:chase,
  relationship:{status:"not exclusive"},
  behavior:{relationship_arc_stage:"awareness"},
  emotionState:{attraction:35,attachment:38,trust:20,awareness_of_feelings:40,vulnerability:12,resentment:55,unresolved_intensity:60},
  chemistry:{axes:{attraction:35,trust:20,comfort:18,attachment:38,commitment:5},paceGate:{status:"repair_first"},conflictResidue:{active:true,level:60}},
  narrativeArc:{relationshipPace:{gate:"repair_first"}},
});
assert.equal(noReset.stage,"awareness");
assert.equal(noReset.mode,"repair");
assert.match(noReset.next_allowed_shift,/repair access\/trust first/);

const prompt=buildRelationshipArcDirectorV35278({
  character:chase,
  relationship:{status:"not exclusive"},
  behavior:{relationship_arc_stage:"pull"},
  emotionState:{attraction:58,attachment:44,trust:35,awareness_of_feelings:38,vulnerability:20},
  chemistry:{axes:{attraction:58,trust:35,comfort:35,attachment:44,commitment:10},paceGate:{status:"hold"},conflictResidue:{level:0}},
  narrativeArc:{relationshipPace:{gate:"allow_micro_shift"}},
  latestUserMessage:"[SILENT_CONTINUE]",
  recentCharacterReplies:["Chase went back inside with Marcus."],
  worldConsequences:{activeChains:[{title:"Kiss with Elena",effect:"It happened and remains known to Chase and Marcus.",weight:3}]},
});
assert.match(prompt,/TROPE IS DIRECTION, NOT DESTINY OR SPEED/);
assert.match(prompt,/THE CHARACTER OWNS INITIATIVE FOR THEIR SIDE/);
assert.match(prompt,/ONE DIMENSION AT A TIME/);
assert.match(prompt,/ONE STAGE MAX PER EARNED BEAT/);
assert.match(prompt,/THIRD PARTIES ARE REAL BRANCHES/);
assert.match(prompt,/NO MUTUALITY HALLUCINATION/);
assert.match(prompt,/SETBACKS CHANGE ACCESS, NOT HISTORY/);

const leapIssues=relationshipArcDirectorV35278Issues({
  reply:'"I love you. You\'re mine now."',
  state:{stage_index:2,mode:"hold"},
  latestUserMessage:"Okay.",
});
assert.ok(leapIssues.includes("relationship_arc_major_leap"));

const reciprocityIssues=relationshipArcDirectorV35278Issues({
  reply:'"We both know you love me too."',
  state:{stage_index:4,mode:"open"},
  latestUserMessage:"Why are you acting weird?",
});
assert.ok(reciprocityIssues.includes("relationship_arc_user_reciprocity_invented"));

const repairIssues=relationshipArcDirectorV35278Issues({
  reply:'Chase pulled you into a kiss. "Let\'s just forget the fight."',
  state:{stage_index:5,mode:"repair"},
  latestUserMessage:"You really hurt me.",
});
assert.ok(repairIssues.includes("relationship_arc_repair_bypassed"));

assert.match(edge,/buildRelationshipArcDirectorV35278/);
assert.match(edge,/deriveRelationshipArcStateV35278/);
assert.match(edge,/\$\{relationshipArcDirectorV35278\}/);
assert.match(edge,/relationship_arc_stage: relationshipArcStateV35278\.stage/);
assert.match(edge,/relationship_arc_route: relationshipArcStateV35278\.route/);
assert.match(edge,/relationship_arc_mode: relationshipArcStateV35278\.mode/);
assert.match(edge,/relationship_arc_stage: keep/);
assert.match(edge,/FIRST_DRAFT_WINS_V35268 = true/);

console.log("PASS  trope maps to an earned route instead of a speed boost");
console.log("PASS  first install can catch up to existing history");
console.log("PASS  subsequent saved turns advance at most one stage");
console.log("PASS  setbacks/repair preserve earned relationship history");
console.log("PASS  user reciprocity and premature major leaps remain forbidden");
console.log("\n5 Relationship Arc Director v3.52.78 checks passed.");
