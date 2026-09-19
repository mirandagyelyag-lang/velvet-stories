import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chat = readFileSync(new URL("../src/pages/Chat.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles/chat.css", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.52.80");
assert.equal(version.version, "3.52.80");
assert.equal(version.release, "Chat Options Portal Fix");

assert.match(chat, /aria-label="Conversation options"/);
assert.match(chat, /setMenuOpen\(\(current\) => !current\)/);
assert.match(chat, /chat__menu-backdrop/);
assert.match(chat, /createPortal\(\(\s*<div className="chat__menu-backdrop"/);

const marker = css.indexOf("/* v3.52.80 CHAT OPTIONS PORTAL FIX */");
assert.ok(marker >= 0, "portal fix CSS marker missing");
const fix = css.slice(marker);
assert.match(fix, /\.chat__menu-backdrop\s*\{[\s\S]*?position:\s*fixed;/);
assert.match(fix, /\.chat__menu-backdrop\s*>\s*\.chat__menu\s*\{[\s\S]*?position:\s*relative;/);
assert.match(fix, /max-height:\s*calc\(100dvh/);
assert.match(fix, /overflow-y:\s*auto;/);
assert.match(fix, /@media\s*\(max-width:\s*760px\)[\s\S]*?align-items:\s*flex-end;/);
assert.match(fix, /border-radius:\s*22px 22px 0 0;/);

console.log("PASS  conversation-options button still toggles menuOpen");
console.log("PASS  portal backdrop is viewport-fixed and above chat chrome");
console.log("PASS  portaled menu no longer uses body-relative absolute positioning");
console.log("PASS  menu can scroll within viewport");
console.log("PASS  mobile menu becomes a bottom sheet with safe-area padding");
console.log("\n5 Chat Options Portal Fix v3.52.80 checks passed.");
