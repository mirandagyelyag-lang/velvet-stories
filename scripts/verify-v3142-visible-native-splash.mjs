import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const mustContain = (file, needles) => {
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
const mustNotContain = (file, needles) => {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  const text = fs.readFileSync(full, "utf8");
  for (const needle of needles) {
    if (text.includes(needle)) failures.push(`${file} must not contain ${needle}`);
  }
};

mustContain("src/native/velvetNative.js", ["VelvetNative", "getInsets", "setSystemBars", "haptic", "velvet-native-keyboard-open"]);
mustContain("src/styles/velvet-v3140-native-polish.css", ["--velvet-native-safe-bottom", ".chat__composer", ".mobile-nav"]);
mustContain("src/components/WelcomeSplash.jsx", [
  "isVelvetNativeRuntime",
  "if (nativeRuntime) return true",
  "nativeRuntime ? 1050 : 1250",
  "velvet-splash--native"
]);
mustNotContain("src/components/WelcomeSplash.jsx", ["if (nativeRuntime) return false"]);
mustContain("src/styles/welcome-splash.css", [
  ".velvet-splash--native",
  "velvetNativeSplashOut",
  "velvetNativeLogoIn"
]);
mustContain("src/context/ThemeContext.jsx", ["syncNativeChrome(theme)"]);
mustContain("src/App.jsx", ["__VELVET_ANDROID_BACK__"]);
mustContain("android/app/src/main/java/com/velvetstories/app/VelvetNativePlugin.java", ["@CapacitorPlugin(name = \"VelvetNative\")", "WindowInsetsCompat", "VibrationEffect"]);
mustContain("android/app/src/main/java/com/velvetstories/app/MainActivity.java", ["registerPlugin(VelvetNativePlugin.class)", "OnBackPressedCallback", "__VELVET_ANDROID_BACK__"]);
mustContain("android/app/src/main/AndroidManifest.xml", ["android:windowSoftInputMode=\"adjustResize\"", "android.permission.VIBRATE"]);

if (failures.length) {
  console.error("\nVELVET v3.14.2 VISIBLE SPLASH VERIFY FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Velvet v3.14.2 verified: visible Android splash · native chrome · Android back · safe insets · keyboard resize · haptics.");
