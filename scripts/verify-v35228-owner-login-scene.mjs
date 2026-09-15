import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const auth = readFileSync(join(root, "src/pages/Auth.jsx"), "utf8");
const authContext = readFileSync(join(root, "src/context/AuthContext.jsx"), "utf8");
const css = readFileSync(join(root, "src/styles/auth.css"), "utf8");
const edge = readFileSync(join(root, "supabase/functions/character-chat/index.ts"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scenePath = join(root, "public/velvet-owner-login-scene.png");
const sceneHash = existsSync(scenePath) ? createHash("sha256").update(readFileSync(scenePath)).digest("hex") : "";

const checks = [
  ["version is 3.52.29", pkg.version === "3.52.29"],
  ["exact owner login artwork ships with the app", existsSync(scenePath) && statSync(scenePath).size > 500_000],
  ["owner artwork is the exact approved image", sceneHash === "223b3c52abc874e7e2772eb65922d91fa08af6b42ab467b7c33aace0f8719507"],
  ["auth renders the owner artwork directly", auth.includes('/velvet-owner-login-scene.png') && auth.includes('auth__owner-stage')],
  ["old synthetic card is no longer rendered", !auth.includes('auth__card--first-choice') && !auth.includes('auth__theme-toggle')],
  ["only password is editable on the private screen", auth.includes('ownerEmail') && !auth.includes('chooseDifferentAccount') && !auth.includes('type="email"')],
  ["password and submit remain functional", auth.includes('handleSubmit') && auth.includes('showPassword') && auth.includes('type="submit"')],
  ["desktop overlay is pinned to artwork coordinates", css.includes('left: 34.33%') && css.includes('top: 59.40%') && css.includes('top: 68.76%')],
  ["mobile keeps the same cinematic artwork", css.includes('aspect-ratio: 1672 / 941') && css.includes('177.683dvh')],
  ["frontend rejects restored non-owner sessions", authContext.includes('nextEmail === ownerEmail') && authContext.includes('Velvet rejected a non-owner session')],
  ["frontend sign-in is owner locked", authContext.includes('requestedEmail !== ownerEmail') && authContext.includes('Private owner account required')],
  ["edge function also rejects non-owner accounts", edge.includes('VELVET_OWNER_EMAIL') && edge.includes('Private owner account required') && edge.includes('403')],
  ["obsolete login artwork stays removed", !existsSync(join(root, 'public/velvet-login-first-choice.webp')) && !existsSync(join(root, 'public/velvet-crystal-vs.png'))],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} owner login scene check(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length}/${checks.length} owner login scene checks passed.`);
