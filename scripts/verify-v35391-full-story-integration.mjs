import fs from "node:fs";import assert from "node:assert/strict";
const e=fs.readFileSync("supabase/functions/character-chat/engine/full-story-integration-v35391.js","utf8"),i=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
for(const x of ["events","physical_state","emotional_aftermath","witness_ledger","callback_bank","active_authority","correction_applied","ONE causal chain"])assert.ok(e.includes(x),x);
for(const x of ["reduceFullStoryIntegrationV35391","buildFullStoryIntegrationPromptV35391","full_story_integration_v35391",'VELVET_ENGINE_RELEASE = "464"'])assert.ok(i.includes(x),x);
console.log("v3.53.91 integration wiring verified");
