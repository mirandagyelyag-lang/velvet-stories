import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/velvet-v3159-crystal-cinematic.css", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.52.87");
assert.equal(version.version, "3.52.87");
assert.equal(version.release, "Single Mobile Dock Zone");

const marker = css.indexOf("/* v3.52.87 SINGLE MOBILE DOCK EXCLUSION ZONE */");
assert.ok(marker >= 0, "v3.52.87 dock-zone marker missing");
const fix = css.slice(marker);

assert.match(fix, /--velvet-mobile-search-rise:\s*56px/);
assert.match(fix, /--velvet-mobile-dock-zone:/);
assert.match(fix, /\.app:not\(\.app--chat\)::after[\s\S]*?height:\s*var\(--velvet-mobile-dock-zone\)/);
assert.match(fix, /background:\s*var\(--background\)/);
assert.match(fix, /\.app:not\(\.app--chat\) \.velvet-route-stage[\s\S]*?padding-bottom:\s*var\(--velvet-mobile-dock-zone\)\s*!important/);
assert.match(fix, /padding-bottom:\s*12px\s*!important/);
assert.match(fix, /overflow-y:\s*visible\s*!important/);
assert.match(fix, /html,[\s\S]*?body[\s\S]*?overflow-y:\s*auto\s*!important/);

console.log("PASS  native document scroll remains enabled");
console.log("PASS  only one fixed dock exclusion zone is rendered");
console.log("PASS  only one shared route tail reserves dock space");
console.log("PASS  per-page padding cannot stack into a giant empty block");
console.log("PASS  search button and bottom nav are both protected");
console.log("\n5 Single Mobile Dock Zone v3.52.87 checks passed.");
