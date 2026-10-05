import fs from "node:fs";import assert from "node:assert/strict";
const d=fs.readFileSync("supabase/functions/character-chat/engine/instant-story-director-v35389.js","utf8");
const i=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
for(const x of ["OPENING PREMISE COMPILER","RELATIONSHIP-AWARE OPENING","IMMEDIATE PLAYABLE PROBLEM","OPENING SOCIAL WORLD","SPEAKER OWNERSHIP","USER ENTRANCE LOGIC","CHARACTER-SPECIFIC OPENING DNA","NO FAKE CHOICE","OPENING MOMENTUM CONTRACT","INSTANT STORY QUALITY GATE","NO RESCUE / NO OBJECT / NO RECYCLED SETUP GATE"])assert.ok(d.includes(x),x);
for(const x of ["instant_story_rescue_template","instant_story_user_as_object","instant_story_fake_choice","instant_story_floating_dialogue","instant_story_user_choreography","instant_story_recycled_setup"])assert.ok(d.includes(x),x);
assert.ok(i.includes("buildInstantStoryDirectorV35389"));assert.ok(i.includes("instantStoryDirectorIssuesV35389"));assert.ok(i.includes("liveOpeningEvaluationV35388"));assert.ok(i.includes('VELVET_ENGINE_RELEASE = "462"'));
console.log("v3.53.89 Instant Story Director 2.0 verified");
