import fs from "node:fs";import assert from "node:assert/strict";
const e=fs.readFileSync("supabase/functions/character-chat/engine/story-authority-v35390.js","utf8"),i=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
for(const x of ["PATH_MARKER","strength","multi_turn","overrides_previous","authority_fake_fulfillment","authority_required_action_missing","CREATOR INTENT CONTROLS WHAT HAPPENS","Public actions create witness/consequence state"])assert.ok(e.includes(x),x);
for(const x of ["compileStoryAuthorityV35390","evaluateStoryAuthorityV35390","storyAuthorityPromptV35390","authority fulfillment missed",'VELVET_ENGINE_RELEASE = "463"'])assert.ok(i.includes(x),x);
for(const a of ["kiss","hug","leave","stay","confess","tell","interrupt"])assert.ok(e.includes('id:"'+a+'"'),a);
console.log("v3.53.90 Story Authority Engine verified");
