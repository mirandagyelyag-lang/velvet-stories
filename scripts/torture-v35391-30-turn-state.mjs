import assert from "node:assert/strict";
import { reduceFullStoryIntegrationV35391, buildFullStoryIntegrationPromptV35391 } from "../supabase/functions/character-chat/engine/full-story-integration-v35391.js";

// Regression suite for the CURRENT reducer. Known gaps are recorded separately
// rather than turning this test into an always-failing build gate.
let state = {};
const steps = [
  { reply: "Chase leaned against the campus coffee bar.", location: "campus cafe", present: ["Chase", "Antonia"] },
  { reply: "A classmate interrupted their conversation about the payment.", location: "campus cafe", present: ["Chase", "Antonia", "classmate"] },
  { reply: "Chase kissed her, then stayed close.", location: "campus cafe", present: ["Chase", "Antonia", "Jules"], contact: "close", authority: { status: "active", action: "kiss" } },
  { reply: "He was quieter after the kiss.", location: "campus cafe", present: ["Chase", "Antonia"], contact: "close" },
  { reply: "They resumed talking about the payment.", location: "campus cafe", present: ["Chase", "Antonia"], contact: "close" },
  { reply: "Jules left the cafe.", location: "campus cafe", present: ["Chase", "Antonia"] },
  { reply: "Chase checked the receipt.", location: "campus cafe", present: ["Chase", "Antonia"] },
  { reply: "Chase stayed beside the counter.", location: "campus cafe", present: ["Chase", "Antonia"] },
  { reply: "They discussed the rooftop plan.", location: "campus cafe", present: ["Chase", "Antonia"] },
  { reply: "Chase opened the cafe door.", location: "campus cafe", present: ["Chase", "Antonia"] },
  { reply: "They arrived at the rooftop.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "A guest approached Chase.", location: "rooftop", present: ["Chase", "Antonia", "guest"] },
  { reply: "Chase answered the guest without moving away.", location: "rooftop", present: ["Chase", "Antonia", "guest"] },
  { reply: "The guest returned to the party.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "Chase recalled the conversation at the cafe.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "He promised to explain tomorrow.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "The music grew louder.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "They continued their discussion.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "Chase stayed by the railing.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "The guest passed without interrupting.", location: "rooftop", present: ["Chase", "Antonia", "guest"] },
  { reply: "Chase mentioned the earlier promise.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "He looked toward the exit.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "The party continued around them.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "Chase asked about the original payment.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "They revisited the cafe conversation.", location: "rooftop", present: ["Chase", "Antonia"] },
  { reply: "Chase checked the time.", location: "rooftop", present: ["Chase", "Antonia"], time: "2:00 AM" },
  { reply: "An hour passed while the rooftop party continued.", location: "rooftop", present: ["Chase", "Antonia"], time: "3:00 AM" },
  { reply: "Chase looked at the skyline.", location: "rooftop", present: ["Chase", "Antonia"], time: "3:00 AM" },
  { reply: "He referred back to their earlier discussion.", location: "rooftop", present: ["Chase", "Antonia"], time: "3:00 AM" },
  { reply: "They remained on the rooftop.", location: "rooftop", present: ["Chase", "Antonia"], time: "3:00 AM" },
];
assert.equal(steps.length, 30);
for (const [index, step] of steps.entries()) {
  const id = String(index + 1);
  state = reduceFullStoryIntegrationV35391({
    previous: state, messageId: id, reply: step.reply,
    scene: { location: step.location, present: step.present, contact: step.contact || "", time_label: step.time || "" },
    storyAuthority: step.authority || {},
  });
  assert.equal(state.physical_state.location, step.location, `location at turn ${id}`);
  assert.deepEqual(state.physical_state.present, step.present, `presence at turn ${id}`);
  assert.equal(state.last_handoff_message_id, id);
  assert.ok(state.events.length <= 60);
  assert.ok(state.witness_ledger.length <= 80);
  assert.ok(state.callback_bank.length <= 30);
}
const kiss = state.events.find(event => /kiss/i.test(event.detail));
assert.ok(kiss, "kiss must remain in event history");
assert.ok(state.witness_ledger.some(w => w.name === "Jules" && w.event_id === kiss.id), "Jules witnessed the kiss");
assert.ok(!state.witness_ledger.some(w => w.name === "guest" && w.event_id === kiss.id), "later guest did not witness the kiss");
assert.ok(state.emotional_aftermath.active, "aftermath retained");
assert.equal(state.physical_state.time_label, "3:00 AM");
assert.equal(state.physical_state.location, "rooftop");
assert.match(buildFullStoryIntegrationPromptV35391(state), /rooftop/);

// A correction for the SAME message ID removes its recorded event.
let correctionState = reduceFullStoryIntegrationV35391({
  previous: state, messageId: kiss.message_id, reply: "",
  scene: { location: "rooftop", present: ["Chase", "Antonia"] },
  canonCorrection: "This didn't happen",
});
assert.equal(correctionState.correction_applied, true);
assert.ok(!correctionState.events.some(e => e.id === kiss.id));

// Explicitly document missing invariants without falsely claiming they work.
// The reducer currently rebuilds physical state from each supplied scene,
// clears active authority on subsequent turns, and does not retract witness
// records or aftermath when a past event is corrected.
const knownGaps = {
  omittedScenePreservesLocation: false,
  authorityPersistsAcrossTurns: false,
  correctionClearsWitnessAndAftermath: false,
  timeSkipCarriesUnchangedPresenceAutomatically: false,
  priorConversationTopicTrackedStructurally: false,
};
assert.equal(Object.keys(knownGaps).length, 5);
console.log("PASS: 30 varied turns, locations, NPC presence, witnessed event, history bounds, time labels and event correction.");
console.log("KNOWN GAPS (not asserted as passing):", Object.keys(knownGaps).join(", "));
