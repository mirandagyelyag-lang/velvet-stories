import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const auth = readFileSync(join(root, "src/pages/Auth.jsx"), "utf8");
const css = readFileSync(join(root, "src/styles/auth.css"), "utf8");
const unified = readFileSync(join(root, "src/styles/velvet-unified.css"), "utf8");
const index = readFileSync(join(root, "index.html"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const checks = [
  ["version is 3.52.27", pkg.version === "3.52.27"],
  ["old peach login artwork removed", !existsSync(join(root, "public/velvet-login-first-choice.webp")) && !css.includes("velvet-login-first-choice")],
  ["crystal launch artwork removed", !existsSync(join(root, "public/velvet-crystal-vs.png")) && !index.includes("velvet-crystal-vs")],
  ["approved loading art remains launch prepaint", index.includes("/velvet-loading-entry.png")],
  ["auth uses live VS brand instead of baked login image", auth.includes('auth__monogram') && auth.includes('>VS<') && auth.includes('Velvet Stories')],
  ["auth has branded story copy", auth.includes("More than characters. A place for you.") && auth.includes("Same you, different stories")],
  ["auth background is CSS-rendered", css.includes("radial-gradient") && css.includes("repeating-linear-gradient") && !css.includes("background-image: url")],
  ["login card is dark velvet, not peach", css.includes("rgba(67, 17, 29, 0.92)") && !unified.includes("rgba(250, 244, 238, .92)")],
  ["functional auth controls remain", auth.includes("handleSubmit") && auth.includes("signIn") && auth.includes("showPassword") && auth.includes("Enter Velvet")],
  ["mobile login layout remains supported", css.includes("@media (max-width: 720px)") && css.includes("env(safe-area-inset-top)")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} login refresh check(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length}/${checks.length} Velvet login refresh checks passed.`);
