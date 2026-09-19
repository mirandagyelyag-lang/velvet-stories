import { autonomousSilentStreakV35275 } from "./autonomous-story-flow-v35275.js";

// Velvet v3.52.36 · Live Scene Momentum Barrier
// Keeps the immediately established scene state authoritative. A short user beat
// cannot rewind choreography or silently fast-forward to the next location.

const norm = (value = "") => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[’‘`]/g, "'").replace(/[^a-z0-9'\s.!?]/g, " ")
  .replace(/\s+/g, " ").trim();

const list = (value) => Array.isArray(value) ? value : [];

function sentences(value = "") {
  return String(value || "")
    .split(/(?<=[.!?][\"”']?)\s+|\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function wordCount(value = "") {
  return norm(value).split(/\s+/).filter(Boolean).length;
}

function isMicroBeat(latestUserMessage = "") {
  const raw = String(latestUserMessage || "").trim();
  const text = norm(raw);
  if (!text) return true;
  if (wordCount(raw) <= 12) return true;
  if (/^\*[^*]{1,180}\*\s*(?:okay|ok|fine|sure|yeah|yes|no)?[.!?]*$/i.test(raw)) return true;
  return /^(?:okay|ok|fine|sure|yeah|yes|no|i nod|i sigh|i close my eyes|i closed my eyes|i shrug|i smile)[.!?]*$/i.test(text);
}

function transitStarted(value = "") {
  const text = norm(value);
  return /\b(?:driv(?:e|es|ing)|drove|behind the wheel|eyes? on the road|navigat(?:e|es|ed|ing)|merged? onto|turned onto|pulled onto|as (?:he|she|they) drove|steer(?:ed|s|ing))\b/.test(text);
}

function transitExplicitlyEnded(value = "") {
  const text = norm(value);
  return /\b(?:we'?re here|were here|arriv(?:e|ed|es|ing)|pulled up|pulling up|park(?:ed|s|ing)|cut(?:ting)? the engine|turned off the engine|killed the engine|reached (?:the|his|her|their|my|your) (?:place|house|apartment|dorm|destination))\b/.test(text);
}

function activeTransit(recentCharacterReplies = []) {
  const recent = list(recentCharacterReplies).filter(Boolean).slice(-4).map(norm);
  if (!recent.length) return false;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    if (transitExplicitlyEnded(recent[i])) return false;
    if (transitStarted(recent[i])) return true;
  }
  return false;
}

function restartsVehicle(value = "") {
  const text = norm(value);
  return /\bdriver'?s side\b.{0,90}\b(?:open|opened|clicked open)\b/.test(text)
    || /\b(?:slid|got|climbed) in\b.{0,90}\b(?:start(?:ed|ing)? the engine|engine)\b/.test(text)
    || /\b(?:start(?:ed|ing)?|turn(?:ed|ing) on) the engine\b/.test(text)
    || /\b(?:shut|shutting|closed|closing) the (?:passenger )?door\b/.test(text)
    || /\b(?:click(?:ed|s|ing)?|buckl(?:e|ed|es|ing))\b.{0,60}\bseatbelt\b/.test(text);
}

function arrivalBeat(value = "") {
  const text = norm(value);
  return /\b(?:we'?re here|were here|pulled up|pulling up|park(?:ed|s|ing)|cut(?:ting)? the engine|turned off the engine|killed the engine|bed'?s inside|bed is inside|come on wake up|wake up.*(?:inside|here))\b/.test(text);
}

function destinationTeleport(value = "") {
  const text = norm(value);
  return /\b(?:inside|at) (?:my|his|her|their|the) (?:place|house|apartment|dorm|room)\b/.test(text)
    || /\b(?:reached|got to|made it to) (?:my|his|her|their|the|your) (?:place|house|apartment|dorm|room)\b/.test(text);
}

function explicitUserDestination(latestUserMessage = "") {
  const text = norm(latestUserMessage);
  const match = text.match(/\b(?:i'?ll|i will|im going to|i am going to|take me to|drop me at|drop me off at)\s+(?:go to\s+)?(?:my\s+)?(dorm|room|home|apartment|house)\b/);
  return match?.[1] || "";
}

function characterOverridesDestination(reply = "", latestUserMessage = "") {
  const destination = explicitUserDestination(latestUserMessage);
  if (!destination) return false;
  const text = norm(reply);
  const asksOrOffers = /\b(?:want me to|do you want|would you rather|can i|could i|how about|what if|unless you want)\b/.test(text);
  if (asksOrOffers) return false;
  return /\b(?:we'?re|we are|you'?re|you are)\s+(?:stopping|going|coming)\s+(?:at|to)\s+(?:my|his|her)\s+(?:place|house|apartment|room)\b/.test(text)
    || /\b(?:my|his|her)\s+(?:place|house|apartment|room)\s+(?:first|instead)\b/.test(text);
}

function groundedTimeAdvance(latestUserMessage = "") {
  const text = norm(latestUserMessage);
  return /\b(?:minutes?|hours?) later\b|\b(?:after a while|eventually|later on|by the time)\b/.test(text);
}

export function buildSceneMomentumBarrierV35236({ latestUserMessage = "", recentCharacterReplies = [], recentUserMessages = [], character = {} } = {}) {
  const transit = activeTransit(recentCharacterReplies);
  const micro = isMicroBeat(latestUserMessage);
  const silentStreak = autonomousSilentStreakV35275(latestUserMessage, recentUserMessages);
  const delegatedProgression = silentStreak >= 2;
  const recent = [...list(recentUserMessages).slice(-4), ...list(recentCharacterReplies).slice(-4)].map((x) => String(x || "").slice(0, 500)).join("\n");
  return `LIVE SCENE MOMENTUM BARRIER 3.52.75 · THE LAST PHYSICAL STATE WINS
- Treat the immediately established physical state as hard canon. Do not replay actions that already happened and do not skip ahead merely to manufacture excitement.
- CURRENT TRANSIT=${transit ? "ACTIVE" : "not confirmed"}; LATEST USER BEAT=${micro ? "MICRO REACTION" : "substantive"}; SILENT HANDOFF STREAK=${silentStreak}; DELEGATED PROGRESSION=${delegatedProgression ? "YES" : "no"}.
- If transit is ACTIVE, the character is already in the moving vehicle. Do NOT reopen doors, re-enter the driver seat, fasten the same seatbelt again, or restart the engine unless an explicit stop/exit happened after the drive began.
- ${delegatedProgression
    ? "REPEATED SILENT HANDOFF OVERRIDE: the user has intentionally kept the character in control. The character/world may now progress beyond a micro-reaction. Character-owned actions may complete, grounded time may pass, and already-committed transit may reach its established destination. Never invent a new destination or an unspoken user decision."
    : "A single nod, sigh, okay, silence, '.', or another tiny reaction advances only the immediate beat. Do not jump several causal steps from ONE microturn."}
- ${delegatedProgression
    ? "Do not freeze the story merely because the latest input is short. Preserve causality, then allow one earned transition when it belongs to the character or to motion already underway."
    : "Let one short beat breathe. One line, one practical adjustment, or continued action is enough."}
- USER AGENCY FIREWALL: character-owned progression never grants permission to write the user's voluntary movement, dialogue, consent, romantic response, plan, or decision. If the character leaves independently, do not silently relocate the user with them.
- Preserve live objects and obligations until they are naturally resolved: food, bags, phones, passengers, errands, promised stops, destinations, and unfinished tasks do not vanish because the tone changed.
- If USER names their own destination, CHARACTER may disagree or offer an alternative, but may not silently replace that destination as a settled fact.
- Never compress several unrelated causal steps into one turn. Repeated silent handoff permits earned progression, not teleportation or montage chaos.
RECENT LIVE CONTEXT:\n${recent || "none"}\nLATEST USER: ${String(latestUserMessage || "").slice(0,700) || "none"}\nCHARACTER: ${String(character?.name || "character").slice(0,100)}`;
}

export function sceneMomentumBarrierV35236Issues({ reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [] } = {}) {
  const issues = [];
  const transit = activeTransit(recentCharacterReplies);
  const micro = isMicroBeat(latestUserMessage);
  const silentStreak = autonomousSilentStreakV35275(latestUserMessage, recentUserMessages);
  const delegatedProgression = silentStreak >= 2;
  if (transit && restartsVehicle(reply)) issues.push("live_scene_vehicle_rewind");
  if (transit && micro && !delegatedProgression && !groundedTimeAdvance(latestUserMessage) && arrivalBeat(reply)) issues.push("live_scene_premature_arrival");
  if (transit && micro && !delegatedProgression && !groundedTimeAdvance(latestUserMessage) && destinationTeleport(reply)) issues.push("live_scene_location_skip");
  if (characterOverridesDestination(reply, latestUserMessage)) issues.push("live_scene_user_destination_overridden");
  return [...new Set(issues)];
}

export function sanitizeSceneMomentumBarrierV35236(reply = "", issues = [], context = {}) {
  const active = new Set(list(issues));
  let parts = sentences(reply);
  if (active.has("live_scene_vehicle_rewind")) parts = parts.filter((part) => !restartsVehicle(part));
  if (active.has("live_scene_premature_arrival")) parts = parts.filter((part) => !arrivalBeat(part));
  if (active.has("live_scene_location_skip")) parts = parts.filter((part) => !destinationTeleport(part));
  if (active.has("live_scene_user_destination_overridden")) parts = parts.filter((part) => !characterOverridesDestination(part, context.latestUserMessage || ""));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function enforceSceneMomentumBarrierV35236({ reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], character = {} } = {}) {
  const originalIssues = sceneMomentumBarrierV35236Issues({ reply, latestUserMessage, recentUserMessages, recentCharacterReplies });
  if (!originalIssues.length) return { reply: String(reply || "").trim(), replaced: false, originalIssues: [], issues: [] };

  const sanitized = sanitizeSceneMomentumBarrierV35236(reply, originalIssues, { latestUserMessage });
  const sanitizedIssues = sceneMomentumBarrierV35236Issues({ reply: sanitized, latestUserMessage, recentUserMessages, recentCharacterReplies });
  if (sanitized && !sanitizedIssues.length) {
    return { reply: sanitized, replaced: sanitized !== String(reply || "").trim(), originalIssues, issues: [] };
  }

  const transit = activeTransit(recentCharacterReplies);
  const userContext = norm([...list(recentUserMessages).slice(-3), latestUserMessage].join(" "));
  const careContext = /\b(?:sick|ill|tired|exhausted|dizzy|faint|weak|fever|nauseous|worse|close my eyes|closed my eyes|sleepy)\b/.test(userContext);
  const name = String(character?.name || "He").trim();
  let fallback = "";
  if (transit && isMicroBeat(latestUserMessage)) {
    fallback = careContext
      ? `${name} kept attention on the road and glanced over once. "Okay. Rest for a minute." The car kept moving, quiet for the next stretch.`
      : `${name} kept driving. "Okay." The car stayed quiet for the next stretch.`;
  } else if (originalIssues.includes("live_scene_user_destination_overridden")) {
    const destination = explicitUserDestination(latestUserMessage);
    const destinationLabel = destination === "dorm" ? "your dorm"
      : destination === "room" ? "your room"
      : destination === "home" ? "home"
      : destination === "apartment" ? "your apartment"
      : destination === "house" ? "your house"
      : "where you said";
    fallback = `${name} gave a short nod. "Okay. ${destinationLabel}."`;
  } else if (transit) {
    fallback = `${name} kept their attention on the road and continued from the drive already underway.`;
  } else {
    fallback = sanitized || String(reply || "").trim();
  }

  const remaining = sceneMomentumBarrierV35236Issues({ reply: fallback, latestUserMessage, recentUserMessages, recentCharacterReplies });
  return { reply: fallback.trim(), replaced: true, originalIssues, issues: remaining };
}
