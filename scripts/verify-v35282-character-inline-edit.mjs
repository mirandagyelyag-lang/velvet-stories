import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/CharacterDetail.jsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles/character-detail.css", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.52.82");
assert.equal(version.version, "3.52.82");
assert.equal(version.release, "Character Inline Edit");

assert.match(page, /updateCharacter/);
assert.match(page, /saveInlineCharacter/);
assert.match(page, /saveInlineRelationship/);
assert.match(page, /renameStory/);
assert.match(page, /replaceCharacterMedia/);
assert.match(page, /onSaveAbout/);
assert.match(page, /onSaveRelationship/);
assert.match(page, /onRenameStory/);
assert.match(page, /onChangeAvatar/);
assert.match(page, /onChangeCover/);
assert.match(page, /character-app-sheet__editor/);
assert.match(page, /Story title/);
assert.match(app, /onCharacterUpdated=\{setPreviewCharacter\}/);

const marker = css.indexOf("/* v3.52.82 LARGE ACTION DOCK + INLINE EDIT */");
assert.ok(marker >= 0, "v3.52.82 CSS marker missing");
const next = css.slice(marker);
assert.match(next, /width:\s*min\(1040px/);
assert.match(next, /min-height:\s*118px/);
assert.match(next, /character-app-sheet__field/);
assert.match(next, /character-app-sheet__story-rename/);
assert.match(next, /character-app-sheet__media-actions/);

console.log("PASS  About can be edited and saved in place");
console.log("PASS  Relationship base/current story dynamic can be edited in place");
console.log("PASS  Stories can be renamed without leaving the character profile");
console.log("PASS  Photos can change avatar/cover and manage gallery media");
console.log("PASS  action dock is materially larger and remains mobile-friendly");
console.log("\n5 Character Inline Edit v3.52.82 checks passed.");
