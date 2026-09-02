import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function ok(label, value) {
  if (!value) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${label}`);
  }
}

const cap = JSON.parse(read("capacitor.config.json"));
const pkg = JSON.parse(read("package.json"));
const pwa = read("src/context/PWAContext.jsx");
const supabase = read("src/services/supabase.js");
const vite = read("vite.config.js");
const index = read("index.html");
const gradle = read("android/app/build.gradle");
const envPrep = read("scripts/prepare-android-env.mjs");

ok("fresh Android origin", cap.server?.hostname === "localhost" && cap.server?.androidScheme === "http");
ok("PWA disabled for Android build", vite.includes("disable: androidBuild") && pkg.scripts["android:sync"].includes("--mode android"));
ok("native PWA provider", pwa.includes("Capacitor.isNativePlatform()") && pwa.includes("NativePWAProvider"));
ok("both Supabase public key names supported", supabase.includes("VITE_SUPABASE_PUBLISHABLE_KEY") && supabase.includes("VITE_SUPABASE_ANON_KEY"));
ok("public Supabase URL fallback", supabase.includes("vwyudrmxatuukcbncats"));
ok("env auto-import", envPrep.includes("Desktop") && envPrep.includes("velvet-stories") && envPrep.includes(".env.local"));
ok("old repair copy removed from native", index.includes("Velvet Android could not start.") && !index.includes("Your stories are safe. Repair the app cache and reopen the newest version."));
ok("Android app upgrade version", gradle.includes("versionCode 2") && gradle.includes('versionName "3.13.13"'));

const forbidden = [".env", ".env.local", ".env.android.local", "node_modules", "dist", ".vercel"];
for (const item of forbidden) {
  ok(`ZIP source does not contain root ${item}`, !fs.existsSync(item));
}

if (process.exitCode) process.exit(process.exitCode);
