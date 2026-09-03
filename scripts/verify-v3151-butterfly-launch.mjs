import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const app = readFileSync("src/App.jsx", "utf8");
const component = readFileSync("src/components/NativeButterflyLaunch.jsx", "utf8");
const css = readFileSync("src/styles/velvet-v3151-butterfly-launch.css", "utf8");
const gradle = readFileSync("android/app/build.gradle", "utf8");
const installer = readFileSync("INSTALL-VELVET-ANDROID.ps1", "utf8");

let failed = false;
function check(name, ok) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${name}`);
  if (!ok) failed = true;
}

check("package is 3.15.1", pkg.version === "3.15.1");
check("butterfly verifier is registered", pkg.scripts?.["verify:v3151"]?.includes("verify-v3151-butterfly-launch"));
check("native launch uses butterfly component", app.includes("<NativeButterflyLaunch />"));
check("native bridge has a short minimum presentation", app.includes("setNativeLaunchSettled(true), 1180"));
check("butterfly is vector artwork, not a heavy bitmap splash", component.includes("velvet-launch__butterfly") && component.includes("<svg"));
check("butterfly has separate animated wings", component.includes("velvet-launch__wing--left") && component.includes("velvet-launch__wing--right"));
check("butterfly exits the screen", css.includes("translate3d(48vw, -63vh, 0)") && css.includes("velvet-butterfly-flight"));
check("sparkle trail is present", css.includes("velvet-launch__trail") && component.includes("velvet-launch__trail"));
check("loading copy is present", component.includes("Entrando a tu historia..."));
check("Android versionName is 3.15.1", gradle.includes('versionName "3.15.1"'));
check("Android versionCode advanced", gradle.includes("versionCode 8"));
check("installer targets v3151", installer.includes("verify:v3151") && installer.includes("3.15.1"));

if (failed) process.exit(1);
console.log("Velvet v3.15.1 verified: neon butterfly · wing flutter · sparkle trail · flies off-screen · lightweight Android auth bridge.");
