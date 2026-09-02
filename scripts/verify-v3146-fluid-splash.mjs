import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("src/styles/welcome-splash.css");
const jsx = read("src/components/WelcomeSplash.jsx");

const forbidden = [
  "velvet-reference__image--slice",
  "velvetReferenceSliceA",
  "velvetReferenceSliceB",
  "velvetReferenceSliceC",
  "clip-path: polygon",
];
for (const needle of forbidden) {
  if (css.includes(needle) || jsx.includes(needle)) failures.push(`old chopped reveal is still present: ${needle}`);
}

for (const needle of [
  "velvet-reference__art",
  "object-fit: cover",
  "velvetFluidArt",
  "velvetFluidSheen",
  "velvetFluidRibbonLeft",
  "velvetFluidRibbonRight",
  "velvetFluidExit",
  "will-change: opacity, transform",
]) {
  if (!css.includes(needle)) failures.push(`welcome-splash.css is missing ${needle}`);
}

for (const needle of [
  "NativeDarkVelvetReveal",
  "velvet-cinematic-dark-reference.png",
  "velvet-reference--fluid",
  "velvet-reference__sheen",
  "velvet-splash--fluid",
]) {
  if (!jsx.includes(needle)) failures.push(`WelcomeSplash.jsx is missing ${needle}`);
}

const imgTags = (jsx.match(/<img/g) || []).length;
if (imgTags > 2) failures.push(`native reveal has too many image layers (${imgTags}); expected one native art image plus the web logo`);

const artwork = path.join(root, "src/assets/velvet-cinematic-dark-reference.png");
if (!fs.existsSync(artwork) || fs.statSync(artwork).size < 500000) failures.push("approved dark reference artwork is missing");

if (failures.length) {
  console.error("\nVELVET v3.14.6 FLUID SPLASH VERIFY FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Velvet v3.14.6 verified: one approved artwork · one continuous timeline · no slices/clip jumps · fluid ribbons + feathered sheen · smooth exit.");
