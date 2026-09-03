import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const checks = [];
function check(label, condition) {
  checks.push([label, Boolean(condition)]);
}

const pkg = JSON.parse(read("package.json"));
const app = read("src/App.jsx");
const splash = read("src/components/WelcomeSplash.jsx");
const splashCss = read("src/styles/welcome-splash.css");
const native = read("src/native/velvetNative.js");
const main = read("src/main.jsx");
const activity = read("android/app/src/main/java/com/velvetstories/app/MainActivity.java");
const styles = read("android/app/src/main/res/values/styles.xml");
const gradle = read("android/app/build.gradle");
const installer = read("INSTALL-VELVET-ANDROID.ps1");

check("package is 3.15.0", pkg.version === "3.15.0");
check("v3150 verifier script registered", pkg.scripts?.["verify:v3150"]?.includes("verify-v3150-android-launch-reset"));
check("Android skips React welcome splash", app.includes("{!nativeRuntime && <WelcomeSplash />}"));
check("native auth bridge exists", app.includes("app-loading--native"));
check("cinematic assets removed from splash component", !/cinematic|NativeDarkVelvetReveal|isVelvetNativeRuntime/.test(splash));
check("native cinematic CSS removed", !/velvet-build__|velvet-splash--native/.test(splashCss));
check("viewport updates are RAF-throttled", native.includes("scheduleVisualViewportUpdate") && native.includes("requestAnimationFrame"));
check("visual viewport scroll does not directly refresh native insets", native.includes('addEventListener("scroll", scheduleVisualViewportUpdate') && !native.includes('addEventListener("scroll", refreshNativeInsets'));
check("native PWA cleanup is once per version", main.includes("velvet:native-pwa-clean:${__VELVET_VERSION__}"));
check("WebView overscroll is disabled", activity.includes("OVER_SCROLL_NEVER"));
check("WebView scrollbars are disabled", activity.includes("setVerticalScrollBarEnabled(false)") && activity.includes("setHorizontalScrollBarEnabled(false)"));
check("WebView zoom is disabled", activity.includes("setSupportZoom(false)") && activity.includes("setBuiltInZoomControls(false)"));
check("launch background is deep ink", (styles.match(/#0B0D14/g) || []).length >= 3);
check("Android versionName is 3.15.0", gradle.includes('versionName "3.15.0"'));
check("installer targets v3150", installer.includes("verify:v3150") && installer.includes("3.15.0"));

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} · ${label}`);
if (failed.length) process.exit(1);
console.log("Velvet v3.15.0 verified: one Android splash · lightweight auth bridge · throttled native viewport · WebView native polish.");
