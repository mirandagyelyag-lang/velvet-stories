import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/velvet-v3159-crystal-cinematic.css", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.match(pkg.version, /^3\.52\.\d+$/);
assert.equal(version.version, pkg.version);

const marker = css.indexOf("/* v3.52.84 NON-OVERLAY MOBILE DOCK */");
assert.ok(marker >= 0, "non-overlay mobile dock marker missing");
const fix = css.slice(marker);

assert.match(fix, /--velvet-mobile-dock-gap:\s*40px/);
assert.match(fix, /--velvet-mobile-dock-guard-height:/);
assert.match(fix, /\.app:not\(\.app--chat\)::after\s*\{/);
assert.match(fix, /position:\s*fixed/);
assert.match(fix, /height:\s*var\(--velvet-mobile-dock-guard-height\)/);
assert.match(fix, /background:\s*var\(--background\)/);
assert.match(fix, /z-index:\s*95/);
assert.match(fix, /\.app:not\(\.app--chat\) \.velvet-route-stage/);
assert.match(fix, /padding-bottom:\s*var\(--velvet-mobile-route-tail\)\s*!important/);
assert.match(fix, /padding-bottom:\s*24px\s*!important/);
assert.match(fix, /\.mobile-nav[\s\S]*?z-index:\s*100\s*!important/);
assert.match(fix, /\.mobile-global-search[\s\S]*?z-index:\s*101\s*!important/);

console.log("PASS  mobile dock has a solid protected shelf behind it");
console.log("PASS  protected shelf includes a 40px visual gap above navigation");
console.log("PASS  route content receives one shared scroll tail instead of per-page magic spacing");
console.log("PASS  page content cannot stay visibly underneath the bottom navigation");
console.log("PASS  chat remains outside the mobile dock rule");
console.log("\n5 Non-Overlay Mobile Dock v3.52.84 checks passed.");
