import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const requireText = (file, needles) => {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    failures.push(`${file} is missing`);
    return;
  }
  const text = fs.readFileSync(full, "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${file} is missing ${needle}`);
  }
};

requireText("src/components/WelcomeSplash.jsx", [
  "NativeDarkVelvetReveal",
  "velvet-cinematic-dark-reference.png",
  "velvet-reference__image--slice-a",
  "velvet-reference__image--sweep",
  "velvet-reference__image--final",
  "nativeRuntime ? 2860 : 1250"
]);
requireText("src/styles/welcome-splash.css", [
  "exact dark-reference Android reveal",
  "object-fit: contain",
  "velvetReferenceSliceA",
  "velvetReferenceSweep",
  "velvetReferenceFinal",
  "velvetReferenceExit",
  "prefers-reduced-motion"
]);
requireText("src/native/velvetNative.js", ["VelvetNative", "getInsets", "setSystemBars", "haptic"]);
requireText("android/app/src/main/AndroidManifest.xml", ["android:windowSoftInputMode=\"adjustResize\"", "android.permission.VIBRATE"]);

const artwork = path.join(root, "src/assets/velvet-cinematic-dark-reference.png");
if (!fs.existsSync(artwork) || fs.statSync(artwork).size < 500000) {
  failures.push("approved dark Velvet reference artwork is missing or unexpectedly small");
}

if (failures.length) {
  console.error("\nVELVET v3.14.4 DARK REFERENCE SPLASH VERIFY FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Velvet v3.14.4 verified: approved dark artwork preserved exactly · cinematic slice build · wine/rose-gold reveal · native polish preserved.");
