import { behavioralTurnIntegrityIssues, sanitizeBehavioralTurnIntegrity } from "../supabase/functions/character-chat/engine/behavioral-turn-integrity-v35224.js";

const recentUserMessages = [
  "I'm dying *I was sick and every time i was feeling worse*",
  "I'm fine, just tired, I won't stay, I'll go to my dorm",
  "You have the food.on your car, I'll help you",
  "Alexander",
  "*I sigh but i get in*",
  "*I close my eyes and nod* Okay",
];
const recentCharacterReplies = [
  '"You okay?" He stepped forward. "Hey—whoa, okay, stop moving."',
  '"Yeah, absolutely not. You look like you\'re about to pass out. Car\'s right there, and you\'re getting in it. Come on."',
  '"The food can sit in the backseat until it rots for all I care. Get in."',
  '"Don\'t Alexander me. Get in, lock the door, and put your head back. I’ll deal with the bags."',
  '"Don\'t fall asleep yet," he said, sparing you a quick glance as he navigated the corner. "We\'re stopping at my place first."',
];

const brokenTransit = `He didn't say anything else after that, just reached over to click your seatbelt into place before shutting the door. A minute later, the driver's side clicked open, and the car dipped slightly as he slid in, starting the engine without waking you.`;
const transitIssues = behavioralTurnIntegrityIssues({ reply: brokenTransit, latestUserMessage: "*I close my eyes and nod* Okay", recentUserMessages, recentCharacterReplies });
if (!transitIssues.includes("transit_state_rewind_after_departure")) throw new Error(`expected transit rewind, got ${transitIssues}`);
const cleanedTransit = sanitizeBehavioralTurnIntegrity(brokenTransit, transitIssues, { recentCharacterReplies });
if (/driver'?s side|starting the engine|shutting the door/i.test(cleanedTransit)) throw new Error(`transit rewind survived sanitizer: ${cleanedTransit}`);

const commandReply = `"Come on, wake up. Get in. Put your head back. Don't argue with me."`;
const commandIssues = behavioralTurnIntegrityIssues({ reply: commandReply, latestUserMessage: "I'm tired", recentUserMessages, recentCharacterReplies });
if (!commandIssues.includes("care_command_loop")) throw new Error(`expected care command loop, got ${commandIssues}`);
if (!commandIssues.includes("care_command_density")) throw new Error(`expected care command density, got ${commandIssues}`);
const cleanedCommands = sanitizeBehavioralTurnIntegrity(commandReply, commandIssues, { recentCharacterReplies });
const leftovers = (cleanedCommands.match(/\b(?:come on|wake up|get in|put your head back|don't argue)\b/gi) || []).length;
if (leftovers > 1) throw new Error(`too many directives survived: ${cleanedCommands}`);

const healthy = `Alex kept his eyes on the road. "Close your eyes if you want. I'll wake you when we're there."`;
const healthyIssues = behavioralTurnIntegrityIssues({ reply: healthy, latestUserMessage: "*I close my eyes and nod* Okay", recentUserMessages, recentCharacterReplies });
if (healthyIssues.length) throw new Error(`healthy care turn incorrectly blocked: ${healthyIssues}`);

console.log("v3.52.24 behavioral turn integrity: PASS");
console.log("- exact driving-state rewind caught");
console.log("- repetitive care-command loop caught");
console.log("- directive density caught");
console.log("- coherent gentle care preserved");
