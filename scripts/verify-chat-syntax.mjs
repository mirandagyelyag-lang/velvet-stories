import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";

for (const file of [
  "supabase/functions/character-chat/index.ts",
  "supabase/functions/character-chat/engine/story-contract.ts",
  "supabase/functions/character-chat/engine/grounded-reality-lock.ts",
  "supabase/functions/character-chat/engine/agency-momentum-lock.ts",
]) {
  const source = fs.readFileSync(file, "utf8");
  stripTypeScriptTypes(source, { mode: "strip", sourceUrl: file });
  console.log(`PASS TypeScript syntax · ${file}`);
}
