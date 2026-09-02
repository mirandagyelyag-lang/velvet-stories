import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("src/styles/welcome-splash.css");
const jsx = read("src/components/WelcomeSplash.jsx");
const vite = read("vite.config.js");

if (css.includes("\\n")) failures.push("welcome-splash.css contains literal \\n escape tokens");

for (const needle of [
  "velvet-reference__image--slice",
  "velvetReferenceSliceA",
  "velvetReferenceSliceB",
  "velvetReferenceSliceC",
  "clip-path: polygon",
]) {
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
  "velvet-cinematic-dark-reference.webp",
  "velvet-reference--fluid",
  "velvet-reference__sheen",
  "velvet-splash--fluid",
]) {
  if (!jsx.includes(needle)) failures.push(`WelcomeSplash.jsx is missing ${needle}`);
}

const artwork = path.join(root, "src/assets/velvet-cinematic-dark-reference.webp");
if (!fs.existsSync(artwork)) {
  failures.push("optimized dark reference artwork is missing");
} else {
  const bytes = fs.statSync(artwork).size;
  if (bytes > 2 * 1024 * 1024) failures.push(`dark reference artwork is still over 2 MiB (${bytes} bytes)`);
  if (bytes < 100000) failures.push("dark reference artwork is suspiciously tiny; expected lossless WebP quality");
}

if (fs.existsSync(path.join(root, "src/assets/velvet-cinematic-dark-reference.png"))) {
  failures.push("old 2.35 MB PNG still exists and can re-enter the PWA precache");
}
if (!vite.includes("maximumFileSizeToCacheInBytes: 4 * 1024 * 1024")) {
  failures.push("Vite PWA Workbox precache headroom is missing");
}

const imgTags = (jsx.match(/<img/g) || []).length;
if (imgTags > 2) failures.push(`native reveal has too many image layers (${imgTags})`);

if (failures.length) {
  console.error("\nVELVET v3.14.8 FLUID SPLASH/PWA VERIFY FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Velvet v3.14.8 verified: one-take splash · lossless WebP artwork under 2 MiB · Workbox precache headroom · no chopped reveal regression.");
