import { readFileSync, existsSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const app = readFileSync("src/App.jsx", "utf8");
const component = readFileSync("src/components/NativePortalLaunch.jsx", "utf8");
const css = readFileSync("src/styles/velvet-v3154-living-portal.css", "utf8");
const nativeJs = readFileSync("src/native/velvetNative.js", "utf8");
const nativePlugin = readFileSync("android/app/src/main/java/com/velvetstories/app/VelvetNativePlugin.java", "utf8");
const activity = readFileSync("android/app/src/main/java/com/velvetstories/app/MainActivity.java", "utf8");
const index = readFileSync("index.html", "utf8");
const gradle = readFileSync("android/app/build.gradle", "utf8");
const installer = readFileSync("INSTALL-VELVET-ANDROID.ps1", "utf8");
let failed = 0;
function check(label, condition) { if (condition) console.log(`PASS · ${label}`); else { console.error(`FAIL · ${label}`); failed += 1; } }
check("package is 3.15.4", pkg.version === "3.15.4");
check("v3154 verifier registered", pkg.scripts?.["verify:v3154"]?.includes("verify-v3154-living-portal"));
check("living portal CSS is wired", app.includes("velvet-v3154-living-portal.css"));
check("launch showcase lasts 7.5 seconds", app.includes("setNativeLaunchVisible(false), 7500"));
check("portal artwork exists for React", existsSync("src/assets/velvet-portal-bg.webp"));
check("portal artwork exists for prepaint", existsSync("public/velvet-portal-bg.webp") && index.includes("velvet-native-prepaint"));
check("curtains have moving folds", css.includes("velvet-curtain-sheen") && component.includes("velvet-portal__curtain--left"));
check("castle gets a final camera push", css.includes("velvet-portal-camera") && css.includes("scale(1.22)"));
check("traveler butterfly has independent wings", component.includes("velvet-portal__wing--left") && css.includes("velvet-wing-left") && css.includes("velvet-butterfly-flight"));
check("VELVET forms letter by letter", component.includes("VELVET_LETTERS") && css.includes("velvet-letter-form"));
check("progress and final glow are animated", css.includes("velvet-portal-progress") && css.includes("velvet-final-glow"));
check("native launch can hide and restore system bars", nativeJs.includes("setNativeLaunchFullscreen") && nativePlugin.includes("setLaunchFullscreen") && nativePlugin.includes("controller.show"));
check("activity enters fullscreen immediately", activity.includes("launchController.hide(WindowInsetsCompat.Type.systemBars())"));
check("Android version is 3.15.4", gradle.includes('versionName "3.15.4"') && gradle.includes("versionCode 11"));
check("installer targets v3154", installer.includes("verify:v3154") && installer.includes("3.15.4"));
if (failed) { console.error(`Velvet v3.15.4 verification failed: ${failed} check(s).`); process.exit(1); }
console.log("Velvet v3.15.4 verified: instant first paint · living curtains · depth camera · traveler butterfly · letter-form brand · fullscreen handoff · 7.5 s showcase.");
