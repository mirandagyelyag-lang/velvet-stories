import { rm } from "node:fs/promises";

for (const path of ["dist", "supabase/.temp", ".vite", ".cache"]) {
  await rm(path, { recursive: true, force: true });
  console.log(`cleaned ${path}`);
}
console.log("Source, migrations, media, local environment and deployment links were preserved.");
