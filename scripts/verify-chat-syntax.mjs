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
]) {
  const source = fs.readFileSync(file, "utf8");
  stripTypeScriptTypes(source, { mode: "strip", sourceUrl: file });
  console.log(`PASS TypeScript syntax · ${file}`);
}
