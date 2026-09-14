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
assert.ok(calendarLifeSimulationIssues({ reply: "As they rounded the corner toward the quad, Marcus caught up from the dorms.", engine }).includes("active_transit_plan_abandoned"));
assert.ok(calendarLifeSimulationIssues({ reply: '"You can pick where we’re grabbing lunch. I’m starving."', engine }).includes("active_transit_plan_abandoned"));
assert.ok(!calendarLifeSimulationIssues({ reply: 'He carries the bags toward the car. "Shotgun means you’re responsible for keeping me awake."', engine }).includes("active_transit_plan_abandoned"));
assert.ok(calendarLifeSimulationIssues({ reply: '"See you guys at six," he said.', engine }).includes("invented_precise_schedule"));

console.log("PASS  dialogue-created travel plans become live canon");
console.log("PASS  the campus/quad detour is rejected while the cabin trip is active");
console.log("PASS  invented lunch cannot replace the active road trip");
console.log("PASS  continuing toward the car preserves driving and shotgun roles");
console.log("PASS  unsupported word-based appointment times are rejected");
console.log("\n5 life-plan continuity checks passed.");
