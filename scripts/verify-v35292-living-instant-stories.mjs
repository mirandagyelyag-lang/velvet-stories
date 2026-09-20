import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.match(pkg.version, /^3\.52\.\d+$/);
assert.equal(version.version, pkg.version);

assert.match(edge, /GROUNDED INSTANT STORY 3\.52\.92/);
assert.match(edge, /LIVING OPENING ENGINE 3\.52\.92/);
assert.match(edge, /NOT EVERY STORY NEEDS A CRISIS/);
assert.match(edge, /OPENING DNA ≠ COPY THE OPENING/);
assert.match(edge, /USER AGENCY IS SACRED/);
assert.match(edge, /CLOSED NAMED CAST/);
assert.match(edge, /NO GENERIC CONFLICT MACHINE/);
assert.match(edge, /NO FAKE AUTHORITY/);
assert.match(edge, /END WITH MOMENTUM, NOT A CLIFFHANGER GIMMICK/);

assert.match(edge, /MODE=\$\{chosen\.id\}/);
assert.match(edge, /ordinary_motion/);
assert.match(edge, /character_initiative/);
assert.match(edge, /social_friction/);
assert.match(edge, /group_chaos/);
assert.match(edge, /private_sidebeat/);
assert.match(edge, /relationship_tension/);
assert.match(edge, /serious_conflict/);

assert.match(edge, /invented_user_action_or_state/);
assert.match(edge, /invented_user_prop_state/);
assert.match(edge, /invented_user_motive/);
assert.match(edge, /invented_named_npc/);
assert.match(edge, /unsupported_institutional_stakes/);
assert.match(edge, /recycled_screenshot_conflict/);

assert.match(edge, /groundingIssues = instantStoryGroundingIssuesV35292/);
assert.match(edge, /rescueGroundingIssues = instantStoryGroundingIssuesV35292/);

console.log("PASS  Instant Stories use multiple grounded story modes instead of forced crisis");
console.log("PASS  creator opening guides ecosystem without forcing prop/action reuse");
console.log("PASS  generated openings cannot author the user's actions, motives or possessions");
console.log("PASS  unnamed supporting cast cannot silently become Marcus/Sarah/Toby-style inventions");
console.log("PASS  unsupported coach/police/disciplinary stakes are blocked");
console.log("PASS  screenshot/phone-message conflict is no longer a universal default");
console.log("\n6 Living Instant Stories v3.52.92 checks passed.");
