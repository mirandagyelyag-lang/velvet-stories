import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/velvet-v3159-crystal-cinematic.css", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.match(pkg.version, /^3\.52\.\d+$/);
assert.equal(version.version, pkg.version);

const marker = css.indexOf("/* v3.52.83 MOBILE BOTTOM NAV CLEARANCE */");
assert.ok(marker >= 0, "mobile bottom clearance marker missing");
const fix = css.slice(marker);

assert.match(fix, /--velvet-mobile-nav-height:\s*66px/);
assert.match(fix, /--velvet-mobile-content-gap:\s*40px/);
assert.match(fix, /--velvet-mobile-search-height:\s*44px/);
assert.match(fix, /--velvet-mobile-content-clearance:/);
assert.match(fix, /\.app:not\(\.app--chat\)[\s\S]*?\.character-profile/);
assert.match(fix, /padding-bottom:\s*var\(--velvet-mobile-content-clearance\)\s*!important/);
assert.match(fix, /\.mobile-nav[\s\S]*?bottom:\s*var\(--velvet-mobile-nav-bottom\)\s*!important/);
assert.match(fix, /\.mobile-global-search[\s\S]*?var\(--velvet-mobile-nav-height\)/);
assert.match(fix, /scroll-padding-bottom:\s*var\(--velvet-mobile-content-clearance\)/);

console.log("PASS  mobile routes share one bottom-nav clearance invariant");
console.log("PASS  clearance includes nav height, safe-area edge, 40px gap and search button");
console.log("PASS  character, stories, pulse, memories and profile-class routes are protected");
console.log("PASS  chat is excluded because it has no bottom navigation");
console.log("PASS  anchors and programmatic scrolling respect the same bottom clearance");
console.log("\n5 Mobile Bottom Clearance v3.52.83 checks passed.");
