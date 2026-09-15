import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const auth = readFileSync(join(root, "src/pages/Auth.jsx"), "utf8");
const css = readFileSync(join(root, "src/styles/auth.css"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const png = readFileSync(join(root, "public/velvet-owner-login-scene.png"));
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);

const checks = [
  ["version is 3.52.29", pkg.version === "3.52.29"],
  ["artwork dimensions are read correctly", width === 1672 && height === 941],
  ["stage uses the artwork's real aspect ratio", css.includes("aspect-ratio: 1672 / 941") && css.includes("177.683dvh")],
  ["password hitbox is calibrated to the artwork", css.includes("left: 34.33%") && css.includes("top: 59.40%") && css.includes("height: 6.91%")],
  ["enter hitbox is calibrated to the artwork", css.includes("top: 68.76%") && css.includes("height: 8.18%")],
  ["real password input is visually invisible", css.includes("opacity: 0.001") && css.includes("color: transparent") && css.includes("caret-color: transparent")],
  ["baked placeholder is not duplicated", !auth.includes('placeholder="Password"') && !auth.includes("auth__owner-password-mask")],
  ["typed password gets a single live display", auth.includes("auth__owner-password-live") && auth.includes('"•".repeat(Math.min(password.length, 18))')],
  ["owner-only sign in remains intact", auth.includes("signIn({ email: ownerEmail, password })")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} owner login alignment check(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length}/${checks.length} owner login alignment checks passed.`);
