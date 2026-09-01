import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const main = read("src/main.jsx");
const behavior = read("src/utils/sheetHandleScroll.js");
const styles = read("src/styles/velvet-v3137-sheet-handle-scroll.css");
const pkg = JSON.parse(read("package.json"));
const release = JSON.parse(read("public/velvet-version.json"));

const handles = [
  ".velvet-sheet-grabber",
  ".story-action-menu__sheet-handle",
  ".memory-book__grab",
  ".director-sheet__grab",
  ".v311-sheet__grab",
];

const checks = [
  ["release metadata is 3.13.7", pkg.version === "3.13.7" && release.version === "3.13.7"],
  ["handle scrolling installs before React", main.includes("installSheetHandleScroll();")],
  ["every existing visible handle is wired", handles.every((selector) => behavior.includes(selector) && styles.includes(selector))],
  ["explicit inner scroll owners are used", [".conversation-picker__scroll", ".group-story-sheet__scroll", ".memory-book__scroll"].every((selector) => behavior.includes(selector))],
  ["dragging moves the real scrollTop", behavior.includes("drag.scrollOwner.scrollTop = drag.startScrollTop + (drag.startY - event.clientY)")],
  ["the hit area is finger sized without enlarging the bar", styles.includes("padding: 11px 18px") && styles.includes("background-clip: content-box")],
  ["the final handle layer loads last", main.trim().endsWith('import "./styles/velvet-v3137-sheet-handle-scroll.css";')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failed = true;
}

if (failed) process.exit(1);
