import { readFileSync, existsSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const app = readFileSync("src/App.jsx", "utf8");
const component = readFileSync("src/components/NativePortalLaunch.jsx", "utf8");
const css = readFileSync("src/styles/velvet-v3153-portal-launch.css", "utf8");
const gradle = readFileSync("android/app/build.gradle", "utf8");
const installer = readFileSync("INSTALL-VELVET-ANDROID.ps1", "utf8");
let failed = 0;
function check(label, condition) {
  if (condition) console.log(`PASS · ${label}`);
  else { console.error(`FAIL · ${label}`); failed += 1; }
}
check("package is 3.15.3", pkg.version === "3.15.3");
check("v3153 verifier registered", pkg.scripts?.["verify:v3153"]?.includes("verify-v3153-portal-launch"));
check("portal component is wired into Android launch", app.includes("NativePortalLaunch") && app.includes("return <NativePortalLaunch />"));
check("old butterfly launch is no longer imported", !app.includes("NativeButterflyLaunch"));
check("portal artwork exists", existsSync("src/assets/velvet-portal-bg.webp"));
check("portal CSS is loaded", app.includes("velvet-v3153-portal-launch.css"));
check("launch lasts 6.6 seconds", app.includes("setNativeLaunchSettled(true), 6600"));
check("curtains animate open", css.includes("velvet-curtain-left") && css.includes("velvet-curtain-right"));
check("portal scene slowly zooms", css.includes("velvet-portal-enter"));
check("progress animation is present", css.includes("velvet-portal-progress") && component.includes("velvet-portal__progress"));
check("moonlit story copy is present", component.includes("Entrando a tu historia") && component.includes("Cada historia te espera"));
check("Android version is 3.15.3", gradle.includes('versionName "3.15.3"') && gradle.includes("versionCode 10"));
check("installer targets v3153", installer.includes("verify:v3153") && installer.includes("3.15.3"));
if (failed) {
  console.error(`Velvet v3.15.3 verification failed: ${failed} check(s).`);
  process.exit(1);
}
console.log("Velvet v3.15.3 verified: moonlit portal · velvet curtain reveal · 6.6 s showcase · cinematic progress · native launch preserved.");
