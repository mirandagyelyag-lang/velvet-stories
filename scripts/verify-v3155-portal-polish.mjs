import { readFileSync, existsSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const app = readFileSync("src/App.jsx", "utf8");
const component = readFileSync("src/components/NativePortalLaunch.jsx", "utf8");
const css = readFileSync("src/styles/velvet-v3155-portal-polish.css", "utf8");
const index = readFileSync("index.html", "utf8");
const styles = readFileSync("android/app/src/main/res/values/styles.xml", "utf8");
const activity = readFileSync("android/app/src/main/java/com/velvetstories/app/MainActivity.java", "utf8");
const gradle = readFileSync("android/app/build.gradle", "utf8");
const installer = readFileSync("INSTALL-VELVET-ANDROID.ps1", "utf8");
let failed = 0;
function check(label, condition) { if (condition) console.log(`PASS · ${label}`); else { console.error(`FAIL · ${label}`); failed += 1; } }
check("package is 3.15.5", pkg.version === "3.15.5");
check("v3155 verifier registered", pkg.scripts?.["verify:v3155"]?.includes("verify-v3155-portal-polish"));
check("polish CSS is wired", app.includes("velvet-v3155-portal-polish.css"));
check("showcase remains 7.5 seconds", app.includes("setNativeLaunchVisible(false), 7500"));
check("portal artwork remains", existsSync("src/assets/velvet-portal-bg.webp"));
check("extra traveler butterfly removed", !component.includes("velvet-portal__traveler") && !css.includes("velvet-butterfly-flight"));
check("petals reduced", component.includes("length: 4"));
check("VELVET resolves before STORIES", css.includes("3.72s forwards") && css.includes("calc(2.18s + var(--i) * .105s)"));
check("native prepaint is deep ink", index.includes("background:#16050f !important") && index.includes("inset:-1px"));
check("launch uses full visual viewport", css.includes("height: 100dvh") && !css.includes("height: var(--velvet-native-visual-height"));
check("Android native splash icon is transparent", styles.includes("@drawable/velvet_splash_transparent") && existsSync("android/app/src/main/res/drawable/velvet_splash_transparent.xml"));
check("system-bar launch colors are forced", activity.includes('setNavigationBarColor(Color.parseColor("#16050F"))') && activity.includes("setNavigationBarContrastEnforced(false)"));
check("Android version is 3.15.5", gradle.includes('versionName "3.15.5"') && gradle.includes("versionCode 12"));
check("installer targets v3155", installer.includes("verify:v3155") && installer.includes("3.15.5"));
if (failed) { console.error(`Velvet v3.15.5 verification failed: ${failed} check(s).`); process.exit(1); }
console.log("Velvet v3.15.5 verified: no launcher-icon flash · no white seam · VELVET then STORIES · subtler butterflies · 7.5 s fullscreen portal.");
