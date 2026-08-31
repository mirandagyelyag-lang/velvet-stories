import fs from "node:fs";

const css = fs.readFileSync("src/styles/velvet-v3133-fixed-bottom-dock.css", "utf8");
const main = fs.readFileSync("src/main.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");

const checks = [
  ["dock stylesheet is imported", main.includes('velvet-v3133-fixed-bottom-dock.css')],
  ["dock import comes after pull-to-refresh", main.lastIndexOf('velvet-v3133-fixed-bottom-dock.css') > main.lastIndexOf('velvet-v3132-pull-to-refresh.css')],
  ["mobile dock is fixed", /\.mobile-nav\.velvet-reference-nav[\s\S]*?position:\s*fixed\s*!important/.test(css)],
  ["mobile dock is pinned to physical bottom", /bottom:\s*0\s*!important/.test(css)],
  ["mobile dock spans full width", /width:\s*100%\s*!important/.test(css)],
  ["dock has no floating rounded shell", /border-radius:\s*0\s*!important/.test(css)],
  ["safe-area bottom is part of dock height", css.includes("env(safe-area-inset-bottom") && css.includes("--velvet-bottom-dock-total")],
  ["five destinations keep equal columns", css.includes("repeat(5, minmax(0, 1fr))")],
  ["normal route reserves dock footprint", css.includes(".app:not(.app--chat) .app__content") && css.includes("padding-bottom: calc(var(--velvet-bottom-dock-total) + 10px)")],
  ["search floats above dock", css.includes("bottom: calc(var(--velvet-bottom-dock-total) + 12px)")],
  ["dock is excluded from chat route", app.includes("!selectedCharacter && !creatorOpen")],
  ["dock is immune to route animation transforms", css.includes("transform: translate3d(0, 0, 0) !important") && css.includes("animation: none !important")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} fixed-dock checks passed.`);
if (failed) process.exit(1);
