import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildPersistentOffscreenLifeUserGravityV35276,
  persistentOffscreenLifeUserGravityV35276Issues,
  userGravityScoreV35276,
  userGravityLevelV35276,
} from "../supabase/functions/character-chat/engine/persistent-offscreen-life-user-gravity-v35276.js";

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");

const chase={
  name:"Chase Beaumont",
  personality:"Confident, proud, social, emotionally guarded.",
  relationship:"Enemies to lovers. He likes the user but they are not together.",
};
const emotion={
  attachment:58,
  attraction:66,
  longing:43,
  fear_of_loss:38,
  awareness_of_feelings:46,
  unresolved_intensity:34,
  jealousy:26,
};

const score=userGravityScoreV35276(emotion,chase,{status:"not exclusive"});
assert.ok(score>=34);
assert.ok(["medium","strong","anchored"].includes(userGravityLevelV35276(score)));

const prompt=buildPersistentOffscreenLifeUserGravityV35276({
  character:chase,
  relationship:{status:"not exclusive"},
  scene:{present:["Chase Beaumont","Marcus"],location:"party"},
  mind:{current_goal:"stay with friends and finish the night"},
  behavior:{
    offscreen_life_thread:"Chase is still at the party with Marcus.",
    offscreen_social_thread:"A girl from the rugby crowd has been talking to him.",
    user_gravity_residue:"The unresolved fight with the user still affects his choices.",
    user_gravity_last_manifestation:"",
  },
  emotionState:emotion,
  userName:"Antonia",
  latestUserMessage:"[SILENT_CONTINUE]",
  recentUserMessages:[".","[SILENT_CONTINUE]","[SILENT_CONTINUE]"],
  recentCharacterReplies:[
    "Chase went back inside and joined Marcus.",
    "He let the girl beside Marcus pull him into the conversation.",
  ],
});
assert.match(prompt,/CORE BALANCE/);
assert.match(prompt,/important user remains emotionally real while absent/);
assert.match(prompt,/USER GRAVITY IS BACKGROUND CAUSALITY, NOT CONSTANT SCREEN TIME/);
assert.match(prompt,/OTHER ROMANCE REMAINS REAL/);
assert.match(prompt,/orbit the user A LITTLE/);
assert.match(prompt,/PERSISTED OFF-SCREEN LIFE/);

const overuse=buildPersistentOffscreenLifeUserGravityV35276({
  character:chase,
  relationship:{status:"not exclusive"},
  scene:{present:["Chase Beaumont","Marcus"]},
  emotionState:emotion,
  userName:"Antonia",
  latestUserMessage:".",
  recentUserMessages:[".",".","."],
  recentCharacterReplies:[
    "He almost texted you, then locked his phone.",
    "Your name sat at the top of his chat list.",
    "He told Marcus he wasn't calling you.",
  ],
});
assert.match(overuse,/ANTI-ORBIT CORRECTION/);

const boundary=buildPersistentOffscreenLifeUserGravityV35276({
  character:chase,
  relationship:{status:"not exclusive"},
  scene:{present:["Chase Beaumont"]},
  emotionState:emotion,
  userName:"Antonia",
  latestUserMessage:"Don't text me. Leave me alone.",
  recentUserMessages:[],
  recentCharacterReplies:[],
});
assert.match(boundary,/NO-CONTACT BOUNDARY=YES/);
assert.match(boundary,/do NOT contact, follow, engineer encounters/);

const boundaryIssues=persistentOffscreenLifeUserGravityV35276Issues({
  reply:'Chase texted you anyway. "We need to talk."',
  character:chase,
  scene:{present:["Chase Beaumont"]},
  userName:"Antonia",
  latestUserMessage:"Don't text me. Leave me alone.",
  recentUserMessages:[],
  recentCharacterReplies:[],
});
assert.ok(boundaryIssues.includes("offscreen_no_contact_boundary_bypassed"));

assert.match(edge,/buildPersistentOffscreenLifeUserGravityV35276/);
assert.match(edge,/\$\{persistentOffscreenLifeUserGravityV35276\}/);
assert.match(edge,/offscreen_life_thread: keep/);
assert.match(edge,/offscreen_social_thread: keep/);
assert.match(edge,/user_gravity_residue: keep/);
assert.match(edge,/user_gravity_last_manifestation: keep/);
assert.match(edge,/user_gravity_cadence: keep/);
assert.match(edge,/FIRST_DRAFT_WINS_V35268 = true/);

console.log("PASS  established feelings create background user gravity");
console.log("PASS  independent off-screen life persists without deleting the user");
console.log("PASS  repeated user callbacks trigger anti-orbit correction");
console.log("PASS  no-contact boundaries override user gravity");
console.log("PASS  off-screen life and user-gravity fields persist in hidden state");
console.log("\n5 Persistent Off-Screen Life + User Gravity v3.52.76 checks passed.");
