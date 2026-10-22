import assert from "node:assert/strict";
import { deriveCalendarLifeSimulation, calendarLifeSimulationIssues } from "../supabase/functions/character-chat/engine/calendar-life-simulation.ts";

const engine = deriveCalendarLifeSimulation({
  character: { name: "Alexander", role: "Campus King" },
  sceneState: { location: "all-night gas station", activity: "buying road-trip snacks" },
  recentMessages: [
    { sender: "user", content: "You're driving" },
    { sender: "character", content: '"Yeah, and you’re riding shotgun so I don’t fall asleep at the wheel."' },
    { sender: "character", content: '"Let’s go. We need to beat the others back to the car before we hit the highway to the cabin."' },
  ],
});

assert.equal(engine.activeTransitThread.active, true);
assert.match(engine.activeTransitThread.anchor, /car|highway|cabin/i);
assert.ok(calendarLifeSimulationIssues({ reply: "As they rounded the corner toward the quad, someone caught up from the dorms.", engine }).includes("active_transit_plan_abandoned"));
assert.ok(calendarLifeSimulationIssues({ reply: '"You can pick where we’re grabbing lunch. I’m starving."', engine }).includes("active_transit_plan_abandoned"));
assert.ok(!calendarLifeSimulationIssues({ reply: 'He carries the bags toward the car. "Shotgun means you’re responsible for keeping me awake."', engine }).includes("active_transit_plan_abandoned"));
assert.ok(calendarLifeSimulationIssues({ reply: '"See you guys at six," he said.', engine }).includes("invented_precise_schedule"));


const issues = (reply, extra = {}) => calendarLifeSimulationIssues({ reply, engine, ...extra });
assert.ok(!issues('He checks the bags before they leave for the cabin.').includes("active_transit_plan_abandoned"));
assert.ok(!issues('He reaches for the car keys, still planning to drive to the cabin.').includes("active_transit_plan_abandoned"));
assert.ok(issues('He walks into a campus lecture and opens his notebook.').includes("active_transit_plan_abandoned"));
assert.ok(issues('He decides to stop at the cafeteria instead of taking the highway.').includes("active_transit_plan_abandoned"));

const arrived = deriveCalendarLifeSimulation({
  character: { name: "Alexander" },
  sceneState: { location: "cabin", activity: "unpacking" },
  recentMessages: [
    { sender: "character", content: "We were driving to the cabin." },
    { sender: "user", content: "*We arrived at the cabin.*" },
  ],
});
assert.equal(arrived.activeTransitThread.active, false, "explicit arrival must close the travel thread");

const cancelled = deriveCalendarLifeSimulation({
  character: { name: "Alexander" },
  recentMessages: [
    { sender: "character", content: "Let's hit the highway to the cabin." },
    { sender: "user", content: "We're not going anymore. Cancel the trip." },
  ],
});
assert.equal(cancelled.activeTransitThread.active, false, "explicit cancellation must close the travel thread");

const clock = deriveCalendarLifeSimulation({
  character: { name: "Alexander" },
  sceneState: { location: "gas station", time_label: "2:30 AM", activity: "buying snacks" },
  recentMessages: [{ sender: "user", content: "You're driving to the cabin." }],
});
assert.equal(clock.storyClock.raw, "2:30 AM");
assert.ok(clock.travelConstraints.some((item) => item.includes("gas station")));
assert.match(clock.elapsedContinuity.policy, /Turn count is not elapsed time/);

console.log("PASS  dialogue-created travel plans become live canon");
console.log("PASS  the campus/quad detour is rejected while the cabin trip is active");
console.log("PASS  invented lunch cannot replace the active road trip");
console.log("PASS  continuing toward the car preserves driving and shotgun roles");
console.log("PASS  unsupported word-based appointment times are rejected");
console.log("PASS  continued travel remains on the active route");
console.log("PASS  unrelated campus and cafeteria detours are rejected");
console.log("PASS  arrival and cancellation end the transit thread");
console.log("PASS  established clock and scene location remain anchored");
console.log("\nLife-plan continuity assertions passed.");
