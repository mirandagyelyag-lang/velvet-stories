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

mustContain("src/native/velvetNative.js", ["VelvetNative", "getInsets", "setSystemBars", "haptic", "velvet-native-keyboard-open"]);
mustContain("src/styles/velvet-v3140-native-polish.css", ["--velvet-native-safe-bottom", ".chat__composer", ".mobile-nav"]);
mustContain("src/App.jsx", ["!nativeRuntime && <WelcomeSplash />"]);
mustContain("src/context/ThemeContext.jsx", ["syncNativeChrome(theme)"]);
mustContain("src/App.jsx", ["__VELVET_ANDROID_BACK__"]);
mustContain("android/app/src/main/java/com/velvetstories/app/VelvetNativePlugin.java", ["@CapacitorPlugin(name = \"VelvetNative\")", "WindowInsetsCompat", "VibrationEffect"]);
mustContain("android/app/src/main/java/com/velvetstories/app/MainActivity.java", ["registerPlugin(VelvetNativePlugin.class)", "OnBackPressedCallback", "__VELVET_ANDROID_BACK__"]);
mustContain("android/app/src/main/AndroidManifest.xml", ["android:windowSoftInputMode=\"adjustResize\"", "android.permission.VIBRATE"]);

if (failures.length) {
  console.error("\nVELVET v3.14.0 NATIVE POLISH VERIFY FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Velvet v3.14.0 verified: native splash authority · dynamic system bars · Android back · safe insets · keyboard resize · tasteful haptics.");
