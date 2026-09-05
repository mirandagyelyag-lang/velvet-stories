import fs from "fs";
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/styles/velvet-v3290-ui-sweep.css", import.meta.url), "utf8");
const checks = [
  ["version 3.29.0", pkg.version === "3.29.0"],
  ["UI sweep verifier wired", pkg.scripts["verify:v3290"]?.includes("verify-v3290-ui-sweep.mjs")],
  ["stability lab includes v3290", pkg.scripts["stability:lab"]?.includes("verify:v3290")],
  ["main imports UI sweep stylesheet", main.includes('"./styles/velvet-v3290-ui-sweep.css"')],
  ["App writes route-aware body page", app.includes("document.body.dataset.velvetPage")],
  ["App writes html page dataset", app.includes("document.documentElement.dataset.velvetPage")],
  ["App marks studio body class", app.includes('"velvet-page--studio"')],
  ["UI sweep defines route max width", css.includes("--velvet-route-max")],
  ["UI sweep normalizes shared page shells", css.includes(".chats-page--reference") && css.includes(".settings-page--editorial")],
  ["UI sweep improves sticky desktop headings", css.includes("position: sticky") && css.includes("--velvet-sticky-top")],
  ["UI sweep strengthens mobile stacking", css.includes("@media (max-width: 760px)") && css.includes("grid-template-columns: 1fr !important")],
  ["UI sweep protects forms and code wrapping", css.includes("overflow-wrap: anywhere") && css.includes("min-height: 46px")],
];
let pass = 0;
for (const [label, ok] of checks) {
  if (ok) pass += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}
console.log(`\n${pass}/${checks.length} UI Stability Sweep checks passed.`);
if (pass !== checks.length) process.exit(1);
