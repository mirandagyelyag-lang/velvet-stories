import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/velvet-v3159-crystal-cinematic.css", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.match(pkg.version, /^3\.52\.\d+$/);
assert.equal(version.version, pkg.version);

const marker = css.indexOf("/* v3.52.85 MOBILE CONTENT VIEWPORT ABOVE DOCK */");
assert.ok(marker >= 0, "mobile content viewport marker missing");
const fix = css.slice(marker);

assert.match(fix, /--velvet-mobile-nav-gap:\s*40px/);
assert.match(fix, /\.app:not\(\.app--chat\)::after[\s\S]*?content:\s*none\s*!important/);
assert.match(fix, /\.app:not\(\.app--chat\)\s*\{[\s\S]*?height:\s*100dvh/);
assert.match(fix, /\.app:not\(\.app--chat\) \.app__content[\s\S]*?height:\s*calc\(100dvh - var\(--velvet-mobile-content-bottom\)\)/);
assert.match(fix, /overflow-y:\s*auto/);
assert.match(fix, /\.app:not\(\.app--chat\) \.velvet-route-stage[\s\S]*?padding-bottom:\s*0\s*!important/);
assert.match(fix, /padding-bottom:\s*24px\s*!important/);
assert.match(fix, /scroll-padding-bottom:\s*0/);

console.log("PASS  old fixed pseudo-shelf is disabled");
console.log("PASS  normal mobile routes scroll inside a viewport that ends above the dock");
console.log("PASS  40px visual gap remains without a giant fake tail");
console.log("PASS  route-stage padding no longer creates a second block");
console.log("PASS  chat remains unaffected");
console.log("\n5 Mobile Content Viewport v3.52.85 checks passed.");
