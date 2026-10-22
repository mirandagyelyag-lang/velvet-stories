import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const source = readFileSync(new URL("../src/lib/instantStoryClarityControl.js", import.meta.url), "utf8");
// Import as a data URL so this verifier works regardless of the package's .js module setting.
const { evaluateInstantStoryClarity, instantStoryClarityInstructions } =
  await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

const good = `You were in the campus library when a student blocked Chase by the desk.
"You told everyone I kissed you?" she demanded, loud enough for the whole table to hear.
Chase stopped and turned toward her. "I told no one," he said.
The girl opened her phone and showed him a message. He looked at it, then looked toward the crowd.
"Someone's lying," he said, handing the phone back. "And I'm going to find out who."`;

const confusing = `You are already by the floor-to-ceiling windows of the Westbridge library mezzanine.
A student blocked Chase with a tablet. "You're dodging the seating committee and treasury quorum."
Chase looked at you with unshielded focus and his usual armor falling away.
"I didn't plan on coming up here," he said, his effortless certainty gone.`;

const agency = `You were in the campus library when Chase walked to the table.
"Come here," he said. You agree and follow him toward the stairs.
A student stopped him and asked what happened, but Chase didn't answer.
He turned back to the desk and picked up a book before walking away.`;

assert.equal(evaluateInstantStoryClarity(good).passed, true, "clear playable opening should pass");
console.log("PASS clear, concrete Instant Story");
const bad = evaluateInstantStoryClarity(confusing);
assert.equal(bad.passed, false);
assert.ok(bad.problems.includes("unexplained_institutional_jargon"));
assert.ok(bad.problems.includes("abstract_emotional_filler"));
assert.ok(bad.problems.includes("repetitive_generic_hook"));
console.log("PASS confusing institutional jargon and filler rejected");
assert.ok(evaluateInstantStoryClarity(agency).problems.includes("user_agency_violation"));
console.log("PASS user agency protected");
assert.ok(evaluateInstantStoryClarity("hello").problems.includes("opening_too_short"));
assert.ok(evaluateInstantStoryClarity(good, { maxWords: 20 }).problems.includes("opening_too_long"));
console.log("PASS opening length limits");
const instructions = instantStoryClarityInstructions();
for (const phrase of ["one primary conflict", "secondary character", "Never narrate the user's", "continuity"]) {
  assert.ok(instructions.includes(phrase), "missing clarity guidance: " + phrase);
}
console.log("PASS narrative clarity guidance");
console.log("\n5 Instant Story clarity control groups passed.");
