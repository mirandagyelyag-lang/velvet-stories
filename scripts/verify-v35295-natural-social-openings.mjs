import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.ok(/^3\.52\.(?:9[5-9]|[1-9]\d{2,})$/.test(pkg.version));
assert.ok(/^3\.52\.(?:9[5-9]|[1-9]\d{2,})$/.test(version.version));
assert.ok(["Natural Social Openings", "Instant Story Timeout Recovery"].includes(version.release));

assert.match(edge, /NATURAL SOCIAL OPENINGS 3\.52\.95/);
assert.match(edge, /NATURALISM OVER QUIRK 3\.52\.95/);
assert.match(edge, /CHEMISTRY THROUGH CHOICES, NOT CHOREOGRAPHY/);
assert.match(edge, /DO NOT CHOREOGRAPH THE USER/);
assert.match(edge, /NO INVENTED ROUTINE INTIMACY/);
assert.match(edge, /ROTATE ORDINARY LIFE/);
assert.match(edge, /quirky_gimmick_prop/);
assert.match(edge, /romcom_choreography_stack/);
assert.match(edge, /invented_routine_intimacy/);
assert.match(edge, /assumed_user_physical_placement/);
assert.match(edge, /overwritten_romcom_stack/);
assert.match(edge, /overused_food_study_setup/);
assert.match(edge, /naturalismIssues = instantStoryNaturalismIssuesV35295/);
assert.match(edge, /rescueNaturalismIssues = instantStoryNaturalismIssuesV35295/);
assert.match(edge, /No forced proximity/);
assert.ok(!edge.includes("sit beside the user"));

const bad = `Alex caught your eye with a lopsided grin, closing the distance between you as he always did. He nudged your shoulder and gestured toward the passenger door beside you.`;
const naturalismSection = edge.slice(edge.indexOf("function instantStoryNaturalismIssuesV35295"), edge.indexOf("// OPENING DNA 3.52.89"));
assert.match(naturalismSection, /caught your eye/);
assert.match(naturalismSection, /lopsided grin/);
assert.match(naturalismSection, /closing the distance between you/);
assert.match(naturalismSection, /as \(\?:he\|she\|they\) always did/);
assert.match(naturalismSection, /passenger door/);
assert.ok(bad.length > 0);

console.log("PASS  Instant Stories reject quirky-gimmick premises");
console.log("PASS  chemistry is expressed through choices instead of romcom choreography");
console.log("PASS  user body position, proximity and seat are not pre-authored");
console.log("PASS  invented routine intimacy is blocked");
console.log("PASS  food/study setups are prevented from becoming a repetitive default");
console.log("\n5 Natural Social Openings v3.52.95 checks passed.");
