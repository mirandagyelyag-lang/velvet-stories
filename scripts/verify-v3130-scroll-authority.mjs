import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const css = read("src/styles/velvet-v3130-scroll-authority.css");
const main = read("src/main.jsx");
const app = read("src/App.jsx");
const chat = read("src/pages/Chat.jsx");
const checks = [
  ["scroll authority loads last", main.trim().endsWith('import "./styles/velvet-v3130-scroll-authority.css";')],
  ["app route owns vertical scroll", css.includes(".app__content") && css.includes("overflow-y: auto !important")],
  ["chat has its own scroll owner", chat.includes("scrollContainerRef") && chat.includes("ref={scrollContainerRef}")],
  ["chat no longer measures window scroll", !chat.includes("window.scrollY") && !chat.includes("document.documentElement.scrollHeight")],
  ["route restoration targets app content", app.includes('document.querySelector(".app__content")')],
  ["chat route disables outer scroll", css.includes(".app--chat .app__content") && css.includes("overflow: hidden !important")],
  ["sheet inner bodies have single-owner scroll", css.includes(".memory-book__scroll") && css.includes(".story-hub__body") && css.includes(".relationship-drawer__body")],
  ["story launchers keep explicit inner scrollers", css.includes(".conversation-picker__scroll") && css.includes(".group-story-sheet__scroll")],
  ["horizontal rails preserve vertical gesture", css.includes("touch-action: pan-x pan-y !important")],
  ["mobile scrollbars are non-obstructive", css.includes("scrollbar-width: none !important")],
  ["overscroll is contained", css.includes("overscroll-behavior-y: contain !important")],
  ["keyboard offset is included in chat scroll padding", css.includes("var(--velvet-keyboard-offset, 0px)")],
];
let fail=0;
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} · ${name}`); if(!ok) fail++; }
console.log(`\nVelvet v3.13 scroll authority: ${checks.length-fail}/${checks.length} checks passed.`);
if (fail) process.exit(1);
