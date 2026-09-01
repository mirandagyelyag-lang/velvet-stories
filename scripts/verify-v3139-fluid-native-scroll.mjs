import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const release = JSON.parse(read("public/velvet-version.json"));
const viewport = read("src/utils/mobileViewportLock.js");
const app = read("src/App.jsx");
const index = read("src/index.css");
const experience = read("src/styles/velvet-v3110-experience.css");
const foundation = read("src/styles/velvet-mobile-foundation.css");
const burgundy = read("src/styles/velvet-burgundy-reference.css");
const header = read("src/styles/chat-header-overlay.css");
const reliability = read("src/styles/velvet-v3120-never-lose-story.css");

const checks = [
  ["release is v3.13.9 Fluid Native Scroll", pkg.version === "3.13.9" && release.version === "3.13.9" && release.name === "Fluid Native Scroll"],
  ["no global touchmove listener blocks compositor scrolling", !viewport.includes('addEventListener("touchmove"') && !viewport.includes("stopMultiTouchScale")],
  ["the document is the single route scroll owner", app.includes("return document.scrollingElement;") && !app.includes('document.querySelector(".app__content")')],
  ["mobile document overscroll remains native", index.includes("body{overscroll-behavior-y:auto}") && experience.includes("html, body { overscroll-behavior-y: auto; }")],
  ["persistent mobile navigation avoids live backdrop blur", foundation.includes("backdrop-filter:none!important;-webkit-backdrop-filter:none!important") && burgundy.includes("backdrop-filter: none !important;\n    -webkit-backdrop-filter: none !important;")],
  ["fixed chat chrome avoids live mobile blur", header.includes("body > .chat__header {\n    backdrop-filter: none !important;") && reliability.includes("backdrop-filter: none !important;\n    -webkit-backdrop-filter: none !important;")],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`\n${checks.length - failed.length}/${checks.length} Velvet v3.13.9 fluid native scroll checks passed.`);
if (failed.length) process.exit(1);
