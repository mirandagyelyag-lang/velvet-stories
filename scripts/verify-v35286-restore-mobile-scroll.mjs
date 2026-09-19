import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/velvet-v3159-crystal-cinematic.css", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.52.86");
assert.equal(version.version, "3.52.86");
assert.equal(version.release, "Restore Mobile Scroll");

const marker = css.indexOf("/* v3.52.86 RESTORE BODY SCROLL + SIMPLE DOCK CLEARANCE */");
assert.ok(marker >= 0, "v3.52.86 mobile scroll marker missing");
const fix = css.slice(marker);

assert.match(fix, /\.app:not\(\.app--chat\)[\s\S]*?height:\s*auto\s*!important/);
assert.match(fix, /overflow:\s*visible\s*!important/);
assert.match(fix, /\.app:not\(\.app--chat\) \.app__content[\s\S]*?overflow-y:\s*visible\s*!important/);
assert.match(fix, /\.app:not\(\.app--chat\) \.velvet-route-stage[\s\S]*?overflow:\s*visible\s*!important/);
assert.match(fix, /\.app:not\(\.app--chat\)::after[\s\S]*?content:\s*none\s*!important/);
assert.match(fix, /--velvet-mobile-page-bottom-space:/);
assert.match(fix, /padding-bottom:\s*var\(--velvet-mobile-page-bottom-space\)\s*!important/);
assert.match(fix, /html,[\s\S]*?body[\s\S]*?overflow-y:\s*auto\s*!important/);

console.log("PASS  normal mobile routes use document scrolling again");
console.log("PASS  nested app-content scroll container is disabled");
console.log("PASS  fake fixed dock shelf remains disabled");
console.log("PASS  pages keep one simple dock clearance padding");
console.log("PASS  body scrolling is explicitly restored");
console.log("\n5 Restore Mobile Scroll v3.52.86 checks passed.");
