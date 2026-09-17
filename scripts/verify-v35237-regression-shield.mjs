import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { finalizeRegressionSafeTurnV35237 } from "../supabase/functions/character-chat/engine/regression-shield-v35237.js";
import { sceneMomentumBarrierV35236Issues } from "../supabase/functions/character-chat/engine/scene-momentum-barrier-v35236.js";
import { immediateTurnContinuityIssues } from "../supabase/functions/character-chat/engine/immediate-turn-continuity-v35213.js";
import { establishedAttractionOpportunityIssues } from "../supabase/functions/character-chat/engine/established-attraction-opportunity-v35219.js";
import { deriveRelationshipChemistryV2 } from "../supabase/functions/character-chat/engine/relationship-chemistry-v2.ts";
import { groundedRealityIssues } from "../supabase/functions/character-chat/engine/grounded-reality-lock.ts";
import { deriveCalendarLifeSimulation, calendarLifeSimulationIssues } from "../supabase/functions/character-chat/engine/calendar-life-simulation.ts";

let passed = 0;
const ok = (condition, label) => { assert.ok(condition, label); passed += 1; console.log(`PASS ${passed}: ${label}`); };
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); passed += 1; console.log(`PASS ${passed}: ${label}`); };

const alex = {
  name: "Alex",
  relationship: "You've been close friends for years. Alex already likes you and flirts openly.",
  personality: "Confident, witty, protective without being controlling.",
};

// A. The exact reported transit regression stays impossible.
const driveHistory = [`"Don't fall asleep yet," Alex said, glancing over as he navigated the corner. "We'll figure it out. Just rest."`];
const micro = `*I close my eyes and nod* Okay`;
const rewind = `He reached over to click your seatbelt into place before shutting the door. A minute later, the driver's side opened and he slid in, starting the engine.`;
const rewindFixed = finalizeRegressionSafeTurnV35237({ reply: rewind, latestUserMessage: micro, recentUserMessages: ["I was sick and getting worse"], recentCharacterReplies: driveHistory, character: alex });
ok(rewindFixed.replaced, "vehicle rewind is repaired at the final composition layer");
eq(sceneMomentumBarrierV35236Issues({ reply: rewindFixed.reply, latestUserMessage: micro, recentCharacterReplies: driveHistory }).length, 0, "repaired transit reply has no scene-momentum issue");
ok(!/driver'?s side|starting the engine|seatbelt|shutting the door/i.test(rewindFixed.reply), "repair does not replay already-completed car choreography");
ok(!/scene|reaction land|rushing the drive/i.test(rewindFixed.reply), "fallback is in-world prose, not validator/meta language");

const arrival = `Alex kept his eyes on the road for a few more blocks before pulling up and cutting the engine. "We're here. Bed's inside."`;
const arrivalFixed = finalizeRegressionSafeTurnV35237({ reply: arrival, latestUserMessage: micro, recentUserMessages: ["I was sick and getting worse"], recentCharacterReplies: driveHistory, character: alex });
ok(!/we'?re here|cut(?:ting)? the engine|bed'?s inside/i.test(arrivalFixed.reply), "microbeat cannot silently fast-forward to arrival");

// B. User agency and destination survive a continuity repair.
const statedDestination = `I'm fine, just tired, I won't stay, I'll go to my dorm`;
const override = `"We're stopping at my place first," Alex said.`;
const destinationFixed = finalizeRegressionSafeTurnV35237({ reply: override, latestUserMessage: statedDestination, recentUserMessages: [], recentCharacterReplies: [], character: alex });
ok(/your dorm/i.test(destinationFixed.reply), "destination repair preserves the destination the user already chose");
ok(!/your call|where you want to go|my place first/i.test(destinationFixed.reply), "destination repair does not hand an already-made choice back or override it");

// C. Delegated choice + attraction remains visible and does not get flattened by scene safety.
const trustHistory = [`"The diner or the vending machine. Your call."`];
const trustBad = `"There's that diner down on Fourth. Or the vending machine. Your call."`;
const trustFixed = finalizeRegressionSafeTurnV35237({ reply: trustBad, latestUserMessage: "I'll trust you", recentUserMessages: ["Where are we going?"], recentCharacterReplies: trustHistory, character: alex });
ok(!/your call|up to you|which one|or the vending machine/i.test(trustFixed.reply), "delegated choice commits instead of returning a menu");
ok(/diner/i.test(trustFixed.reply), "delegated choice keeps a grounded option rather than inventing a new destination");
eq(establishedAttractionOpportunityIssues({ reply: trustFixed.reply, latestUserMessage: "I'll trust you", recentUserMessages: ["Where are we going?"], recentCharacterReplies: trustHistory, character: alex }).length, 0, "delegated-choice rescue still satisfies established attraction");

// D. A valid turn must pass through byte-for-byte unchanged.
const valid = `Alex glanced over once, then back to the road. "Okay. Close your eyes if you want."`;
const untouched = finalizeRegressionSafeTurnV35237({ reply: valid, latestUserMessage: micro, recentUserMessages: [], recentCharacterReplies: driveHistory, character: alex });
eq(untouched.reply, valid, "already-valid prose passes through unchanged");
eq(untouched.replaced, false, "shield does not rewrite good prose just because it exists");
const twice = finalizeRegressionSafeTurnV35237({ reply: untouched.reply, latestUserMessage: micro, recentUserMessages: [], recentCharacterReplies: driveHistory, character: alex });
eq(twice.reply, untouched.reply, "finalizer is idempotent on a valid result");

// E. Previous continuity fixes remain alive.
const opening = `They forgot yours. He had also ordered a spare of the thing you usually chose. You can take mine, or I can go back and make them fix it.`;
const firstTurnBad = `Alexander laughs and pushes the extra container closer anyway. "Relax, I ordered two on purpose. Eat."`;
const firstTurnIssues = immediateTurnContinuityIssues(firstTurnBad, `No, it's fine, I'll eat mine`, [opening]);
ok(firstTurnIssues.includes("immediate_user_choice_overridden"), "first-turn user choice protection still works");
ok(firstTurnIssues.includes("immediate_event_truth_rewritten"), "first-turn event truth protection still works");

const authoredFlirt = `*The cashier is a young woman who's wait....flirting with you?*`;
const ignoredCashier = `"Grab the water," he said over his shoulder, scooping up the bags.`;
ok(groundedRealityIssues({ reply: ignoredCashier, latestUserMessage: authoredFlirt }).includes("user_authored_scene_beat_ignored"), "user-authored scene beats still cannot be silently ignored");

const chemistry = deriveRelationshipChemistryV2({ character: { name: "Alexander", relationship: "He already likes the user but keeps it private.", personality: "Confident, self-assured, cold, feared and dangerous." } });
eq(chemistry.personalityManifestation.attractionCanonExplicit, true, "established attraction remains canon-aware");
ok(/may not become invisible/i.test(chemistry.personalityManifestation.attractionVisibility), "established attraction still has to be behaviorally perceptible");

const neutral = { name: "Alex", relationship: "You're classmates who barely know each other.", personality: "Friendly and observant." };
const neutralTrust = finalizeRegressionSafeTurnV35237({ reply: `"The diner or the vending machine. Your call."`, latestUserMessage: "I'll trust you", recentUserMessages: [], recentCharacterReplies: [], character: neutral });
ok(!/get you to myself|steal you|time with you/i.test(neutralTrust.reply), "neutral relationships do not gain invented romance during a repair");

const trip = deriveCalendarLifeSimulation({
  character: { name: "Alexander", role: "Campus King" },
  sceneState: { location: "all-night gas station", activity: "buying road-trip snacks" },
  recentMessages: [
    { sender: "user", content: "You're driving" },
    { sender: "character", content: `"Yeah, and you're riding shotgun."` },
    { sender: "character", content: `"Let's go. We need to get back to the car before we hit the highway to the cabin."` },
  ],
});
eq(trip.activeTransitThread.active, true, "dialogue-created travel plan remains active canon");
ok(calendarLifeSimulationIssues({ reply: `"You can pick where we're grabbing lunch."`, engine: trip }).includes("active_transit_plan_abandoned"), "active travel plans still cannot be replaced by an unrelated detour");

// F. Static wiring: one owner for the final semantic composition + suite is mandatory.
const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
ok(edge.includes("finalizeRegressionSafeTurnV35237"), "character-chat uses the regression-safe finalizer");
ok(!edge.includes("const finalBarrier = enforceFinalDelegatedChoiceBarrier"), "index no longer manually stacks the delegated barrier");
ok(!edge.includes("const sceneMomentumFinal = enforceSceneMomentumBarrierV35236"), "index no longer manually stacks the scene barrier");
ok(edge.indexOf("v3.52.37 REGRESSION SHIELD") > edge.indexOf("all-local-candidates-empty"), "regression shield runs after blank recovery");
ok(edge.indexOf("const savedMessage = replacementMessage") > edge.indexOf("v3.52.37 REGRESSION SHIELD"), "regression shield runs before persistence");

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
ok(String(pkg.scripts?.["verify:stability"] || "").includes("verify:regression"), "full stability verification cannot skip the regression matrix");

eq(pkg.version, "3.52.46", "package version is v3.52.46");

console.log(`\nVelvet v3.52.46 regression shield: ${passed}/${passed} PASS`);
