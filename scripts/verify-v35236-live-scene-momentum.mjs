import {
  buildSceneMomentumBarrierV35236,
  enforceSceneMomentumBarrierV35236,
  sceneMomentumBarrierV35236Issues,
} from '../supabase/functions/character-chat/engine/scene-momentum-barrier-v35236.js';
import fs from 'node:fs';

let passed = 0;
const assert = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  passed += 1;
  console.log(`PASS ${passed}: ${label}`);
};

const recent = [
  `"Don't fall asleep yet," he said, sparing you a quick, assessing glance as he navigated the corner. "We're stopping at my place first. I have actual soup instead of whatever questionable takeout is rotting in the back."`,
];
const latest = `*I close my eyes and nod* Okay`;

const rewind = `He didn't say anything else after that, just reached over to click your seatbelt into place before shutting the door. A minute later, the driver's side clicked open, and the car dipped slightly as he slid in, starting the engine without waking you.`;
const rewindIssues = sceneMomentumBarrierV35236Issues({ reply: rewind, latestUserMessage: latest, recentCharacterReplies: recent });
assert(rewindIssues.includes('live_scene_vehicle_rewind'), 'detects the exact seatbelt/door/driver-seat rewind from the reported Alex transcript');

const arrival = `He keeps his eyes on the road for a few more blocks before pulling up and cutting the engine. "We're here," he said, reaching across the center console to give your shoulder a light shake. "Come on, wake up. Bed's inside."`;
const arrivalIssues = sceneMomentumBarrierV35236Issues({ reply: arrival, latestUserMessage: latest, recentCharacterReplies: recent });
assert(arrivalIssues.includes('live_scene_premature_arrival'), 'blocks premature arrival after a nod/eyes-closed microbeat');

const enforced = enforceSceneMomentumBarrierV35236({ reply: arrival, latestUserMessage: latest, recentUserMessages: ['I was sick and every time I was feeling worse'], recentCharacterReplies: recent, character: { name: 'Alex' } });
assert(!sceneMomentumBarrierV35236Issues({ reply: enforced.reply, latestUserMessage: latest, recentCharacterReplies: recent }).length, 'absolute barrier produces a safe continuation with no remaining momentum issue');
assert(!/we'?re here|cut(?:ting)? the engine|bed'?s inside/i.test(enforced.reply), 'absolute barrier does not leak the premature destination beat');

const normalMicro = `Alex glanced over briefly, then back to the road. "Okay." The car stayed quiet for the next stretch.`;
assert(!sceneMomentumBarrierV35236Issues({ reply: normalMicro, latestUserMessage: latest, recentCharacterReplies: recent }).length, 'allows a small in-car continuation');

const explicitTime = `Twenty minutes later, I open my eyes.`;
const earnedArrival = `Alex pulled up outside the building and cut the engine. "We're here."`;
assert(!sceneMomentumBarrierV35236Issues({ reply: earnedArrival, latestUserMessage: explicitTime, recentCharacterReplies: recent }).includes('live_scene_premature_arrival'), 'allows arrival after the user explicitly advances time');

const destinationLatest = `I'm fine, just tired, I won't stay, I'll go to my dorm`;
const overrideReply = `"We're stopping at my place first," Alex said.`;
assert(sceneMomentumBarrierV35236Issues({ reply: overrideReply, latestUserMessage: destinationLatest, recentCharacterReplies: [] }).includes('live_scene_user_destination_overridden'), 'detects silent replacement of the user\'s stated destination');

const offeredAlternative = `"Want me to take you to my place first, or straight to your dorm?" Alex asked.`;
assert(!sceneMomentumBarrierV35236Issues({ reply: offeredAlternative, latestUserMessage: destinationLatest, recentCharacterReplies: [] }).includes('live_scene_user_destination_overridden'), 'allows the character to offer an alternative without seizing destination control');

const prompt = buildSceneMomentumBarrierV35236({ latestUserMessage: latest, recentCharacterReplies: recent, character: { name: 'Alex' } });
assert(/CURRENT TRANSIT=ACTIVE/.test(prompt) && /micro reaction/i.test(prompt), 'prompt injects live transit state and microbeat pacing rule');

const index = fs.readFileSync('supabase/functions/character-chat/index.ts', 'utf8');
assert(index.includes('${sceneMomentumBarrierV35236}') && index.includes('finalizeRegressionSafeTurnV35237'), 'character-chat wires the prompt layer and regression-safe final barrier');

console.log(`\nVelvet v3.52.36 live-scene momentum: ${passed}/10 PASS`);
