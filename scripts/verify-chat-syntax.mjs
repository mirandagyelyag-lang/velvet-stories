import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";

for (const file of [
  "supabase/functions/character-chat/index.ts",
  "supabase/functions/character-chat/engine/story-contract.ts",
]) {
  const source = fs.readFileSync(file, "utf8");
  stripTypeScriptTypes(source, { mode: "strip", sourceUrl: file });
  console.log(`PASS TypeScript syntax · ${file}`);
}
