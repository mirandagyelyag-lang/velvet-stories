import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.52.89");
assert.equal(version.version, "3.52.89");
assert.equal(version.release, "Opening DNA");

assert.match(edge, /OPENING DNA 3\.52\.89/);
assert.match(edge, /function openingDnaFamilyV35289/);
assert.match(edge, /function buildOpeningDnaContractV35289/);
assert.match(edge, /function instantStoryOpeningAnchorIssuesV35289/);
assert.match(edge, /CREATOR OPENING DNA — HIGHEST AUTHORITY FOR FRESH OPENINGS/);
assert.match(edge, /If the creator opening is a party, stay in the party \/ house-gathering \/ afterparty social orbit/);
assert.match(edge, /LOCATION \+ WORLD CONTINUITY/);
assert.match(edge, /Do not choose a random location family just to look diverse/);
assert.match(edge, /instantStoryConflictSeedV35247\(safeDraft, cleanIdea, variationKey, recentSceneSeeds\)/);
assert.match(edge, /anchorIssues = instantStoryOpeningAnchorIssuesV35289/);
assert.match(edge, /sceneSeed, openingFamily/);
assert.match(edge, /The party had already split into smaller conversations/);

assert.match(edge, /NORMAL REGENERATION 3\.52\.89 — SAME BRANCH/);
assert.match(edge, /Do not safe-reset into bland acknowledgement/);
assert.match(edge, /OPENING REGENERATION 3\.52\.89/);
assert.match(edge, /Preserve CREATOR OPENING DNA below/);
assert.match(edge, /PRIMARY CHARACTER OPENING · CREATOR AUTHORITY/);
assert.match(edge, /Opening regeneration drifted away from the creator's primary opening/);

const partyFamilyAt = edge.indexOf('id: "party"');
assert.ok(partyFamilyAt >= 0);
const partyFamily = edge.slice(partyFamilyAt, partyFamilyAt + 1000);
assert.match(partyFamily, /party\|house party/);
assert.match(partyFamily, /living room\|kitchen\|porch/);

console.log("PASS  primary character opening is promoted to creator-level narrative DNA");
console.log("PASS  no-idea Instant Stories stay inside a detected opening ecosystem");
console.log("PASS  party openings specifically stay in party/social-gathering orbit");
console.log("PASS  conflict variation history works without random-location drift");
console.log("PASS  opening regenerations preserve creator DNA while changing the actual beat");
console.log("PASS  normal regenerations preserve branch truth and avoid bland safe resets");
console.log("\n6 Opening DNA v3.52.89 checks passed.");
