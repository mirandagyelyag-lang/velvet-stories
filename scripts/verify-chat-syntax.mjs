import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";

for (const file of [
  "supabase/functions/character-chat/index.ts",
  "supabase/functions/character-chat/engine/story-contract.ts",
  "supabase/functions/character-chat/engine/grounded-reality-lock.ts",
  "supabase/functions/character-chat/engine/agency-momentum-lock.ts",
  "supabase/functions/character-chat/engine/scene-physics-lock.ts",
  "supabase/functions/character-chat/engine/intent-subtext-lock.ts",
  "supabase/functions/character-chat/engine/social-gravity-world-identity.ts",
  "supabase/functions/character-chat/engine/relationship-chemistry-v2.ts",
  "supabase/functions/character-chat/engine/embodied-awareness-salience.ts",
  "supabase/functions/character-chat/engine/scene-intelligence-dynamic-world.ts",
  "supabase/functions/character-chat/engine/discourse-coherence-event-truth.ts",
  "supabase/functions/character-chat/engine/long-term-character-evolution.ts",
  "supabase/functions/character-chat/engine/npc-ecosystem-social-network-v3.ts",
  "supabase/functions/character-chat/engine/calendar-life-simulation.ts",
  "supabase/functions/character-chat/engine/world-consequences-causal-timeline.ts",
  "supabase/functions/character-chat/engine/scene-director-v342.ts",
  "supabase/functions/character-chat/engine/long-story-memory-v343.ts",
  "supabase/functions/character-chat/engine/narrative-arc-intelligence-v344.ts",
  "supabase/functions/character-chat/engine/prose-intelligence-v345.ts",
  "supabase/functions/character-chat/engine/generation-orchestrator-v346.ts",
  "supabase/functions/character-chat/engine/recovery-integrity-v347.ts",
  "supabase/functions/character-chat/engine/performance-mobile-v348.ts",
  "supabase/functions/character-chat/engine/instant-story-v3492.ts",
]) {
  const source = fs.readFileSync(file, "utf8");
  stripTypeScriptTypes(source, { mode: "strip", sourceUrl: file });
  console.log(`PASS TypeScript syntax · ${file}`);
}
