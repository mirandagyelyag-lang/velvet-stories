import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const main = read("src/main.jsx");
const pkg = JSON.parse(read("package.json"));
const release = JSON.parse(read("public/velvet-version.json"));
const mobile = read("src/styles/velvet-mobile-foundation.css");
const pulse = read("src/pages/Pulse.jsx");

const removedImports = [
  "velvet-v3130-scroll-authority.css",
  "velvet-v3131-native-edges.css",
  "velvet-v3132-pull-to-refresh.css",
  "velvet-v3133-fixed-bottom-dock.css",
  "velvet-v3134-compact-page-ends.css",
  "velvet-v3137-sheet-handle-scroll.css",
  "pullToRefresh",
  "sheetHandleScroll",
];

const removedFiles = [
  "src/utils/pullToRefresh.js",
  "src/utils/sheetHandleScroll.js",
  "src/styles/velvet-v3130-scroll-authority.css",
  "src/styles/velvet-v3131-native-edges.css",
  "src/styles/velvet-v3132-pull-to-refresh.css",
  "src/styles/velvet-v3133-fixed-bottom-dock.css",
  "src/styles/velvet-v3134-compact-page-ends.css",
  "src/styles/velvet-v3137-sheet-handle-scroll.css",
];

const checks = [
  ["release retains the v3.13.8 reset or a later compatible build", /^3\.13\.(?:[89]|[1-9]\d)$/.test(pkg.version) && release.version === pkg.version],
  ["custom scroll imports and installers are absent", removedImports.every((token) => !main.includes(token)) && !main.includes("installVelvetPullToRefresh") && !main.includes("installSheetHandleScroll")],
  ["custom scroll implementation files are deleted", removedFiles.every((path) => !existsSync(new URL(`../${path}`, import.meta.url)))],
  ["normal one-finger native page scrolling remains available", mobile.includes("overflow-y:auto!important") && mobile.includes("touch-action:pan-y!important")],
  ["Pulse shelf and null fixes remain available", pulse.includes("PulseCharacterLibrary") && pulse.includes("pulse-character-card") && existsSync(new URL("../scripts/verify-v3135-pulse-shelves.mjs", import.meta.url)) && existsSync(new URL("../scripts/verify-v3136-pulse-null-guard.mjs", import.meta.url))],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`\n${checks.length - failed.length}/${checks.length} Velvet v3.13.8 native scroll reset checks passed.`);
if (failed.length) process.exit(1);
