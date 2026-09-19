import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chat=readFileSync(new URL("../src/pages/Chat.jsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/styles/chat.css",import.meta.url),"utf8");

assert.match(chat,/className="chat__icon-button chat__more"[\s\S]*?type="button"[\s\S]*?setMenuOpen/);
assert.match(chat,/createPortal\(\(\s*<div className="chat__menu-backdrop"/);

assert.match(css,/\.chat__menu-backdrop\s*\{[\s\S]*?position:\s*fixed;/);
assert.match(css,/\.chat__menu-backdrop\s*\{[\s\S]*?z-index:\s*2200;/);
assert.match(css,/\.chat__menu-backdrop\s*>\s*\.chat__menu\s*\{[\s\S]*?position:\s*relative\s*!important;/);
assert.match(css,/\.chat__menu-backdrop\s*>\s*\.chat__menu\s*\{[\s\S]*?max-height:/);
assert.match(css,/@media \(max-width: 760px\)[\s\S]*?\.chat__menu-backdrop\s*\{[\s\S]*?align-items:\s*flex-end;/);
assert.match(css,/border-radius:\s*24px 24px 0 0;/);

console.log("PASS  three-dot button explicitly opens a dialog");
console.log("PASS  portal backdrop owns fixed viewport positioning");
console.log("PASS  portaled menu no longer uses header-relative coordinates");
console.log("PASS  menu is scrollable within the viewport");
console.log("PASS  mobile menu renders as a bottom sheet");
console.log("\n5 Chat Three-Dot Menu v3.52.79 checks passed.");
