import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("src/styles/welcome-splash.css");
const jsx = read("src/components/WelcomeSplash.jsx");

const requiredCss = [
  ".velvet-splash:not(.velvet-splash--native) img",
  ".velvet-splash.velvet-splash--native .velvet-reference__image",
  "width: 100% !important",
  "height: 100% !important",
  "max-width: none !important",
  "object-fit: contain",
  "object-position: 50% 50%",
  "velvetReferenceSweep",
  "velvetReferenceFinal",
];
for (const needle of requiredCss) if (!css.includes(needle)) failures.push(`welcome-splash.css is missing ${needle}`);

if (/\.velvet-splash\s+img\s*\{\s*width:\s*min\(180px,42vw\)/.test(css)) {
  failures.push("generic .velvet-splash img rule still leaks into native splash sizing");
}

for (const needle of ["NativeDarkVelvetReveal", "velvet-cinematic-dark-reference.png", "velvet-reference__image--final"]) {
  if (!jsx.includes(needle)) failures.push(`WelcomeSplash.jsx is missing ${needle}`);
}

const artwork = path.join(root, "src/assets/velvet-cinematic-dark-reference.png");
if (!fs.existsSync(artwork) || fs.statSync(artwork).size < 500000) failures.push("approved dark reference artwork is missing");

if (failures.length) {
  console.error("\nVELVET v3.14.5 FULLSCREEN SPLASH VERIFY FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Velvet v3.14.5 verified: approved dark artwork · true fullscreen native sizing · no card-width leakage · cinematic reveal preserved.");
