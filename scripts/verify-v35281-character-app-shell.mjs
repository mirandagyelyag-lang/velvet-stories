import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/CharacterDetail.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles/character-detail.css", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.match(pkg.version, /^3\.52\.\d+$/);
assert.equal(version.version, pkg.version);

assert.match(page, /character-profile__app-actions/);
assert.doesNotMatch(page, /v311-profile-deck/);
assert.doesNotMatch(page, /scrollIntoView/);
assert.match(page, /MemoryBookDrawer/);
assert.match(page, /setMemoryBookOpen\(true\)/);
assert.match(page, /CharacterInfoSheet/);
assert.match(page, /mode === "about"/);
assert.match(page, /mode === "relationship"/);
assert.match(page, /mode === "stories"/);
assert.match(page, /mode === "media"/);

const marker = css.indexOf("/* v3.52.81 APP-NATIVE CHARACTER PROFILE */");
assert.ok(marker >= 0, "character app-shell CSS marker missing");
const shellCss = css.slice(marker);
assert.match(shellCss, /character-profile__app-actions/);
assert.match(shellCss, /character-app-sheet-backdrop/);
assert.match(shellCss, /position:\s*fixed/);
assert.match(shellCss, /align-items:\s*flex-end/);
assert.match(shellCss, /border-radius:\s*28px 28px 0 0/);
assert.match(shellCss, /overflow-y:\s*auto/);

console.log("PASS  character profile no longer exposes long information sections by default");
console.log("PASS  profile actions open in-place app sheets instead of scroll-navigation");
console.log("PASS  memories open inside the character view through MemoryBookDrawer");
console.log("PASS  About, Relationship, Stories and Photos are app-native sheets");
console.log("PASS  mobile sheets are bottom anchored and internally scrollable");
console.log("\n5 Character App Shell v3.52.81 checks passed.");
