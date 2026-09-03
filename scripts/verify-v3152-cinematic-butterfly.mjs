import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const app = readFileSync("src/App.jsx", "utf8");
const component = readFileSync("src/components/NativeButterflyLaunch.jsx", "utf8");
const css = readFileSync("src/styles/velvet-v3152-butterfly-cinematic.css", "utf8");
const gradle = readFileSync("android/app/build.gradle", "utf8");
const installer = readFileSync("INSTALL-VELVET-ANDROID.ps1", "utf8");

let failed = 0;
function check(label, ok) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${label}`);
  if (!ok) failed += 1;
}

check("package is 3.15.2", pkg.version === "3.15.2");
check("v3152 verifier registered", pkg.scripts?.["verify:v3152"]?.includes("verify-v3152-cinematic-butterfly"));
check("cinematic butterfly artwork exists", existsSync("src/assets/velvet-launch-butterfly.png"));
check("launch uses generated butterfly artwork", component.includes("velvet-launch-butterfly.png") && component.includes("velvet-cinematic__butterfly"));
check("old vector butterfly is gone", !component.includes("<svg") && !existsSync("src/styles/velvet-v3151-butterfly-launch.css"));
check("minimum launch is 4.8 seconds", app.includes("setNativeLaunchSettled(true), 4800"));
check("butterfly gets appreciation beat before exit", css.includes("42%") && css.includes("57%") && css.includes("velvet-butterfly-journey"));
check("butterfly exits far beyond viewport", css.includes("translate3d(66vw, -78vh, 0)"));
check("cinematic progress lasts through launch", css.includes("3.45s") && css.includes("velvet-progress-grow"));
check("loading copy remains", component.includes("Entrando a tu historia..."));
check("Android version is 3.15.2", gradle.includes('versionName "3.15.2"') && gradle.includes("versionCode 9"));
check("installer targets v3152", installer.includes("verify:v3152") && installer.includes("3.15.2"));

if (failed) {
  console.error(`Velvet v3.15.2 verification failed: ${failed} check(s).`);
  process.exit(1);
}
console.log("Velvet v3.15.2 verified: cinematic crystal butterfly · 4.8 s showcase · graceful off-screen flight · progress glow · native launch preserved.");
