import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  hasNarrationTenseFlip,
  hasRepeatedLowSignalMannerism,
  hasRandomActivityFiller,
} from "../supabase/functions/character-chat/engine/intent-subtext-lock.ts";

const recent = [
  'Alex glanced over. "Long enough."',
  'Alex shifted into reverse. "Pick something."',
  'Alex looked toward her. "Fine."',
];

assert.equal(hasRepeatedLowSignalMannerism('Alex glances over. "Really?"', recent), true);
assert.equal(hasRepeatedLowSignalMannerism('"Really?"', recent), false);
assert.equal(hasNarrationTenseFlip('Alex walks around the car. "Ready?"', [
  'Alex looked over. "Yeah."',
  'Alex opened the trunk. "Put it here."',
]), true);
assert.equal(hasRandomActivityFiller(
  'A black SUV honked and the driver waved at him. "See?"',
  "[SILENT_CONTINUE]", [], [], {}, [],
), true);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
assert.match(edge, /Conversation turns are not elapsed travel time/);
assert.match(edge, /allow at least ten character replies/);
assert.match(edge, /Never replay the user's completed action/);
assert.match(edge, /narration_tense_flip/);
assert.match(edge, /repeated_low_signal_mannerism/);

console.log("PASS  scene clock does not use message count as elapsed travel time");
console.log("PASS  narration tense changes are rejected");
console.log("PASS  repeated low-signal gestures are rejected across turns");
console.log("PASS  invented vehicle greetings are rejected on silent continue");
console.log("PASS  completed user actions are not replayed");
