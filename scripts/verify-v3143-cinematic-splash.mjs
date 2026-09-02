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
  "NativeCinematicSplash",
  "velvet-cinematic__word--trace",
  "velvet-cinematic__word--fill",
  "velvet-cinematic__ribbon--a",
  "nativeRuntime ? 2380 : 1250"
]);
requireText("src/styles/welcome-splash.css", [
  "velvetWordTrace",
  "velvetRibbonSweep",
  "velvetCinematicExit",
  "velvet-cinematic__stories",
  "prefers-reduced-motion"
]);
requireText("src/native/velvetNative.js", ["VelvetNative", "getInsets", "setSystemBars", "haptic"]);
requireText("android/app/src/main/AndroidManifest.xml", ["android:windowSoftInputMode=\"adjustResize\"", "android.permission.VIBRATE"]);

if (failures.length) {
  console.error("\nVELVET v3.14.3 CINEMATIC SPLASH VERIFY FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Velvet v3.14.3 verified: cinematic Velvet word build · luminous ribbons · STORIES reveal · native polish preserved.");
