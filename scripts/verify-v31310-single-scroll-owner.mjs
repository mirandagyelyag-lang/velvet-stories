import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const release = JSON.parse(read("public/velvet-version.json"));
const foundation = read("src/styles/velvet-mobile-foundation.css");
const stability = read("src/styles/velvet-v265-stability.css");
const appCss = read("src/App.css");
const legacy = read("src/styles/velvet-v17.css");
const app = read("src/App.jsx");

const checks = [
  ["release is v3.13.10 Single Native Scroll", pkg.version === "3.13.10" && release.version === "3.13.10" && release.name === "Single Native Scroll"],
  ["only html owns mobile vertical page scrolling", foundation.includes("html{width:100%!important") && foundation.includes("overflow-y:auto!important") && foundation.includes("body,#root{") && foundation.includes("overflow-y:visible!important")],
  ["app shell horizontal protection cannot create a nested vertical scroller", stability.includes("html,body,#root,.app,.app__content{max-width:100%!important;overflow-x:clip!important") && !stability.includes("overflow-x:hidden!important")],
  ["route pages clip overflow without capturing the vertical gesture", foundation.includes(".chats-page,.discover-index") && foundation.includes("overflow-x:clip!important") && !foundation.includes("html,body,#root{")],
  ["older shell layers also use non-scrolling clip", appCss.includes("overflow-x:clip") && legacy.includes("overflow-x: clip;")],
  ["scroll restoration targets the native document", app.includes("return document.scrollingElement;")],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`\n${checks.length - failed.length}/${checks.length} Velvet v3.13.10 single-scroll checks passed.`);
if (failed.length) process.exit(1);
