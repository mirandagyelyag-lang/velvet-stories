// Velvet v3.35.3 · Scene Physics + Continuity Lock
// Deterministic physical-world guards: posture, object possession, geometry, visibility,
// time claims and action repetition. The model can propose; this layer decides what is possible.

function normalized(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s*.:/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(value = "", max = 180) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function sentences(value = "") {
  return String(value || "")
    .split(/(?<=[.!?]["”']?)\s+|\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function list(value) { return Array.isArray(value) ? value : []; }

const OBJECT_GROUPS = {
  beverage: ["beverage", "coffee", "cup", "mug", "drink", "glass", "tea", "latte"],
  phone: ["phone", "cell", "mobile"],
  bag: ["bag", "backpack", "purse", "tote"],
  keys: ["keys", "key"],
  jacket: ["jacket", "coat", "hoodie"],
  book: ["book", "notebook", "textbook"],
  umbrella: ["umbrella"],
  laptop: ["laptop", "computer"],
};

function canonicalObject(value = "") {
  const text = normalized(value);
  for (const [group, aliases] of Object.entries(OBJECT_GROUPS)) {
    if (aliases.some((alias) => new RegExp(`\\b${alias}s?\\b`).test(text))) return group;
  }
  return text.split(/\s+/).filter(Boolean).slice(-2).join(" ");
}

function ownerObjectKey(actor = "", object = "") {
  return `${normalized(actor)}::${canonicalObject(object)}`;
}

function bodyEntry(scene = {}, name = "") {
  const key = normalized(name);
  return list(scene?.body_states).find((item) => normalized(item?.name) === key) || null;
}

function relationEntry(scene = {}, a = "", b = "") {
  const ak = normalized(a), bk = normalized(b);
  return list(scene?.spatial_relations).find((item) => {
    const from = normalized(item?.from), to = normalized(item?.to);
    return (from === ak && to === bk) || (from === bk && to === ak);
  }) || null;
}

function visibilityEntry(scene = {}, a = "", b = "") {
  const ak = normalized(a), bk = normalized(b);
  return list(scene?.visibility).find((item) => {
    const from = normalized(item?.from), to = normalized(item?.to);
    return (from === ak && to === bk) || (from === bk && to === ak);
  }) || null;
}

function bodyStateFromText(value = "") {
  const text = normalized(value);
  if (/\b(?:i|he|she|they)\s+(?:am\s+)?(?:driving|drove|drive)\b|\bbehind the wheel\b/.test(text)) return "driving";
  if (/\b(?:i|he|she|they)\s+(?:lie|lies|lay|laid|lying)\b|\bly(?:ing)? down\b/.test(text)) return "lying";
  if (/\b(?:i|he|she|they)\s+(?:sit|sits|sat|seated)\b|\bsit(?:ting)? down\b|\bdropped into (?:the|a) (?:chair|seat|couch)\b/.test(text)) return "seated";
  if (/\b(?:i|he|she|they)\s+(?:stand|stands|stood|standing)\b|\b(?:stand|stood) up\b|\b(?:got|get|gets) up\b|\bpushed (?:myself|himself|herself|themself) (?:up|out of the chair)\b/.test(text)) return "standing";
  if (/\b(?:i|he|she|they)\s+(?:walk|walks|walked|walking|pace|paces|paced|pacing)\b/.test(text)) return "walking";
  return "";
}

function anchorFromText(value = "") {
  const text = normalized(value);
  const anchors = ["doorway", "door", "exit", "table", "counter", "wall", "window", "couch", "sofa", "chair", "car", "parking lot", "hallway", "hall", "kitchen", "bed", "desk"];
  for (const anchor of anchors) {
    if (new RegExp(`\\b(?:at|by|beside|near|against|toward|towards|to|from|across from|next to|on) (?:the )?${anchor.replace(" ", "\\s+")}\\b`).test(text)) return anchor;
  }
  return "";
}

function hasLocomotionBridge(value = "") {
  const text = normalized(value);
  return /\b(?:walk(?:ed|s|ing)?|step(?:ped|s|ping)?|move(?:d|s|ing)?|cross(?:ed|es|ing)?|come|came|comes|approach(?:ed|es|ing)?|close(?:d|s|ing)? the (?:distance|gap)|catch(?:es|ing|caught) up|circle(?:d|s|ing)? around|head(?:ed|s|ing)? (?:over|toward|towards))\b/.test(text);
}

function userExplicitTransfer(latestUserMessage = "", objectGroup = "", characterName = "") {
  const text = normalized(latestUserMessage);
  const aliases = OBJECT_GROUPS[objectGroup] || [objectGroup];
  const objectPattern = aliases.filter(Boolean).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  if (!objectPattern) return false;
  const charFirst = normalized(characterName).split(/\s+/)[0] || "";
  return new RegExp(`\\b(?:give|gave|hand|handed|pass|passed|offer|offered)\\b.{0,45}\\b(?:${objectPattern})\\b.{0,45}\\b(?:you|him|her|${charFirst || "__none__"})\\b`).test(text)
    || new RegExp(`\\b(?:give|gave|hand|handed|pass|passed) (?:you|him|her|${charFirst || "__none__"})\\b.{0,45}\\b(?:${objectPattern})\\b`).test(text);
}

function objectActionMentions(reply = "", group = "") {
  const aliases = OBJECT_GROUPS[group] || [group];
  const objectPattern = aliases.filter(Boolean).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  if (!objectPattern) return false;
  const text = normalized(reply);
  return new RegExp(`\\b(?:i|my)\\b.{0,35}\\b(?:take|took|grab|grabbed|pick|picked|hold|held|use|used|open|opened|sip|sipped|drink|drank|slide|slid|reach|reached|lift|lifted|raise|raised)\\b.{0,45}\\b(?:${objectPattern})\\b`).test(text)
    || new RegExp(`\\b(?:take|took|grab|grabbed|pick|picked|hold|held|use|used|open|opened|sip|sipped|drink|drank|slide|slid|reach|reached|lift|lifted|raise|raised)\\b.{0,35}\\b(?:my )?(?:${objectPattern})\\b`).test(text)
    || new RegExp(`\\b(?:${objectPattern})\\b.{0,25}\\bin my hand\\b`).test(text);
}

export function extractActionFingerprints(value = "") {
  const text = normalized(value);
  const patterns = [
    ["look_away", /\b(?:look(?:ed|s|ing)?|glance(?:d|s|ing)?) away\b/],
    ["jaw_tighten", /\bjaw (?:tighten(?:ed|s|ing)?|clench(?:ed|es|ing)?)\b/],
    ["hair_hand", /\b(?:ran|run|runs|rake(?:d|s|ing)?) (?:a |my |his |her )?hand through (?:my |his |her )?hair\b/],
    ["nose_exhale", /\bexhal(?:e|ed|es|ing) through (?:my|his|her|the) nose\b/],
    ["shift_weight", /\bshift(?:ed|s|ing)? (?:my|his|her|their) weight\b/],
    ["lean_back", /\blean(?:ed|s|ing)? back\b/],
    ["glance", /\bglance(?:d|s|ing)? at\b/],
    ["finger_curl", /\bfingers? curl(?:ed|s|ing)?\b/],
    ["neck_rub", /\brub(?:bed|s|bing)? (?:the back of )?(?:my|his|her) neck\b/],
    ["shrug", /\bshrug(?:ged|s|ging)?\b/],
    ["nod", /\bnod(?:ded|s|ding)?\b/],
    ["coffee_sip", /\b(?:take|took|takes|taking) (?:another )?sip\b|\bsip(?:ped|s|ping)? (?:my|his|her|the) (?:coffee|drink|tea)\b/],
  ];
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function repeatedActionFingerprint(reply = "", recentCharacterReplies = []) {
  const current = extractActionFingerprints(reply);
  if (!current.length) return "";
  const recent = list(recentCharacterReplies).slice(-5).flatMap(extractActionFingerprints);
  for (const fingerprint of current) {
    const count = recent.filter((item) => item === fingerprint).length;
    if (count >= 2) return fingerprint;
  }
  return "";
}

function hasPreciseClock(value = "") {
  return /\b(?:[01]?\d|2[0-3]):[0-5]\d\b|\b(?:1[0-2]|[1-9])(?:\s*:\s*[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/i.test(String(value || ""));
}

function hasExplicitTimeSupport(latestUserMessage = "", scene = {}) {
  return hasPreciseClock(latestUserMessage)
    || Boolean(clean(scene?.time_label))
    || /\b(?:minutes?|hours?|seconds?|days?|weeks?) later\b|\b(?:later that|the next|next morning|next evening|that night|this morning|this afternoon|tonight|midnight|noon)\b/i.test(String(latestUserMessage || ""));
}

function farGeometry(latestUserMessage = "", previousScene = {}, userName = "", characterName = "") {
  const latest = normalized(latestUserMessage);
  if (/\b(?:other side of (?:the )?(?:parking lot|room|street)|across (?:the )?(?:parking lot|room|street)|several meters|many feet|far away|across from you|at a distance)\b/.test(latest)) return true;
  const relation = relationEntry(previousScene, userName, characterName);
  return /\b(?:far|across|several meters|many feet|different room|offscreen|outside)\b/.test(normalized(relation?.distance || relation?.state || relation?.note || ""));
}

function blockedVisibility(latestUserMessage = "", previousScene = {}, userName = "", characterName = "") {
  const latest = normalized(latestUserMessage);
  if (/\b(?:leave|left|walked out|exit(?:ed)?).{0,55}\b(?:close|closed|shut) (?:the )?door\b/.test(latest)) return true;
  const visible = visibilityEntry(previousScene, userName, characterName);
  if (visible && visible.can_see === false) return true;
  const relation = relationEntry(previousScene, userName, characterName);
  return /\b(?:different room|closed door|offscreen|out of sight|no line of sight)\b/.test(normalized(relation?.state || relation?.note || relation?.distance || ""));
}

function microPerception(reply = "") {
  const text = normalized(reply);
  return /\b(?:tiny|small|faint|brief|subtle|slight) (?:flicker|shift|change|twitch).{0,28}\b(?:eyes?|expression|face|mouth)\b|\b(?:watched|saw|noticed|caught) you (?:roll|blink|flinch|smile|frown|look|glance)\b|\byour (?:eyes?|expression|face) (?:gave|showed|flickered|shifted)\b/.test(text);
}

function userEnteredVehicleWithoutCharacter(latestUserMessage = "", previousScene = {}, characterName = "") {
  const latest = normalized(latestUserMessage);
  const userEntered = /\b(?:i)\s+(?:get|got|climb|climbed|slide|slid)\s+(?:in|into)\b.{0,35}\b(?:car|passenger|seat)\b|\b(?:i)\s+(?:get|got)\s+in\b/.test(latest);
  if (!userEntered) return false;
  const charBody = bodyEntry(previousScene, characterName);
  const prior = normalized(`${charBody?.state || ""} ${charBody?.anchor || ""}`);
  return !/driving|driver|inside car|in car/.test(prior);
}

function vehicleDriverContinuityBreak(reply = "", latestUserMessage = "", previousScene = {}, characterName = "") {
  const text = normalized(reply);
  const latest = normalized(latestUserMessage);
  const usesDriverPosition = /\b(?:hands? (?:tighten|tightens|rest|rests|grip|grips) on (?:the )?steering wheel|behind the wheel|starts? (?:the )?car|pulls? away from (?:the )?curb|merg(?:e|es|ed|ing) into (?:traffic|the road)|driv(?:e|es|ing)|drove)\b/.test(text);
  if (!usesDriverPosition) return false;
  const charBody = bodyEntry(previousScene, characterName);
  const priorState = normalized(charBody?.state || "");
  const priorAnchor = normalized(charBody?.anchor || "");
  const alreadyDriving = /driving|driver/.test(priorState) || /driver/.test(priorAnchor);
  if (alreadyDriving) return false;
  const explicitDriverEntry = /\b(?:gets?|got|slides?|slid|climbs?|climbed|settles?|settled|drops?|dropped) (?:in|into|behind)\b.{0,45}\b(?:driver|wheel|car|seat)\b|\b(?:behind the wheel|driver'?s seat)\b.{0,30}\b(?:gets?|got|slides?|slid|settles?|settled|sits?|sat)\b/.test(text);
  if (explicitDriverEntry) return false;
  const userJustEntered = /\b(?:i|we)\s+(?:get|got|climb|climbed|slide|slid)\s+(?:in|into)\b.{0,35}\b(?:car|passenger|seat)\b|\b(?:get|got|climb|climbed|slide|slid)\s+(?:in|into)\s+(?:the )?car\b/.test(latest);
  const carContext = userJustEntered || userEnteredVehicleWithoutCharacter(latestUserMessage, previousScene, characterName)
    || /\b(?:car|passenger|driver|curb|parking)\b/.test(normalized(previousScene?.location || "") + " " + normalized(previousScene?.activity || ""));
  return carContext;
}

function closeRangeAction(reply = "") {
  const text = normalized(reply);
  return /\bwhisper(?:ed|s|ing)?\b|\b(?:touch(?:ed|es|ing)?|brush(?:ed|es|ing)?|grab(?:bed|s|bing)?|take|took|hold|held|reach(?:ed|es|ing)? for) (?:your|her|his|their) (?:hand|arm|wrist|shoulder|waist|back|face|cheek)\b|\bhand (?:on|against) (?:your|her|his|their)\b/.test(text);
}

export function scenePhysicsIssues({ reply = "", latestUserMessage = "", recentCharacterReplies = [], previousScene = {}, characterName = "", userName = "" } = {}) {
  const issues = [];
  const text = normalized(reply);
  const latest = normalized(latestUserMessage);
  if (!text) return issues;

  const charBody = bodyEntry(previousScene, characterName);
  const previousBody = normalized(charBody?.state || "");
  if (/\b(?:standing|stood|on (?:my|his|her) feet)\b/.test(previousBody) && /\b(?:i|he|she) (?:stood|stand(?:s)?|got up|gets up)\b|\bpushed (?:myself|himself|herself) out of the chair\b/.test(text)) {
    if (!/\b(?:sat|sit|seated|dropped into (?:the|a) chair)\b/.test(latest)) issues.push("body_state_redundant_transition");
  }

  const previousAnchor = normalized(charBody?.anchor || "");
  const newAnchor = anchorFromText(reply);
  if (previousAnchor && newAnchor && previousAnchor !== normalized(newAnchor) && !hasLocomotionBridge(reply)) {
    issues.push("spatial_anchor_teleport");
  }

  const priorObjects = list(previousScene?.object_states);
  for (const item of priorObjects) {
    const group = canonicalObject(item?.object || "");
    if (!group) continue;
    const holder = normalized(item?.holder || "");
    const state = normalized(item?.state || "");
    const location = normalized(item?.location || "");
    const userOwns = holder && holder === normalized(userName);
    const characterOwns = holder && holder === normalized(characterName);
    if (userOwns && objectActionMentions(reply, group) && !userExplicitTransfer(latestUserMessage, group, characterName)) {
      issues.push("object_possession_break");
      break;
    }
    if (characterOwns && /\b(?:down|on table|on counter|set down|put down|away|in pocket|in bag)\b/.test(`${state} ${location}`) && objectActionMentions(reply, group)) {
      const pickup = !/\btook (?:another )?sip\b/.test(text) && new RegExp(`\\b(?:picked|pick|grabbed|grab|took|take|lifted|lift|reached for|reach for)\\b.{0,35}\\b(?:${(OBJECT_GROUPS[group] || [group]).join("|")})\\b`).test(text);
      if (!pickup) { issues.push("object_state_rewind"); break; }
    }
  }

  if (vehicleDriverContinuityBreak(reply, latestUserMessage, previousScene, characterName)) issues.push("vehicle_driver_transition_missing");
  if (userEnteredVehicleWithoutCharacter(latestUserMessage, previousScene, characterName)
      && /\b(?:steering wheel|brake|accelerator|starts? (?:the )?car|pulls? away|driv(?:e|es|ing)|drove|merg(?:e|es|ed|ing))\b/.test(text)
      && !/\b(?:gets?|got|slides?|slid|climbs?|climbed|settles?|settled)\b.{0,55}\b(?:driver|wheel|car|seat)\b/.test(text)) {
    issues.push("vehicle_character_entry_omitted");
  }

  const visibilityBlocked = blockedVisibility(latestUserMessage, previousScene, userName, characterName);
  if (visibilityBlocked && microPerception(reply)) issues.push("line_of_sight_violation");

  const far = farGeometry(latestUserMessage, previousScene, userName, characterName);
  if (far && (closeRangeAction(reply) || microPerception(reply)) && !hasLocomotionBridge(reply)) issues.push("interaction_geometry_violation");

  if (hasPreciseClock(reply) && !hasExplicitTimeSupport(latestUserMessage, previousScene)) issues.push("precise_time_invention");
  if (/\b(?:for|after) (?:several |a few |two |three |four |five )?hours\b|\bhours (?:had )?passed\b|\ball (?:morning|afternoon|evening|night)\b/.test(text) && !hasExplicitTimeSupport(latestUserMessage, previousScene) && !Number(previousScene?.elapsed_minutes || 0)) {
    issues.push("unsupported_elapsed_time_claim");
  }

  const repeated = repeatedActionFingerprint(reply, recentCharacterReplies);
  if (repeated) issues.push("repeated_action_fingerprint");

  const doorClosed = normalized(previousScene?.door_state || "") === "closed" || /\b(?:close|closed|shut) (?:the )?door\b/.test(latest);
  if (doorClosed && /\b(?:through the open doorway|the open door|door stood open|from the doorway i watched you)\b/.test(text) && !/\b(?:open|opened) (?:the )?door\b/.test(text)) issues.push("door_state_continuity_break");

  return [...new Set(issues)];
}

export function sanitizeScenePhysicsReply(reply = "", issues = []) {
  const active = new Set(list(issues));
  if (!active.size) return String(reply || "").trim();
  let parts = sentences(reply);
  const physicalHard = new Set([
    "body_state_redundant_transition", "spatial_anchor_teleport", "object_possession_break", "object_state_rewind",
    "line_of_sight_violation", "interaction_geometry_violation", "precise_time_invention", "unsupported_elapsed_time_claim",
    "door_state_continuity_break", "repeated_action_fingerprint", "vehicle_driver_transition_missing", "vehicle_character_entry_omitted",
  ]);
  if ([...active].some((item) => physicalHard.has(item))) {
    parts = parts.filter((piece) => {
      const p = normalized(piece);
      if (active.has("body_state_redundant_transition") && /\b(?:stood|stand|got up|gets up|out of the chair)\b/.test(p)) return false;
      if (active.has("spatial_anchor_teleport") && /\b(?:wall|doorway|counter|window|table|couch|car)\b/.test(p) && !hasLocomotionBridge(piece)) return false;
      if ((active.has("object_possession_break") || active.has("object_state_rewind")) && /\b(?:cup|coffee|mug|phone|bag|backpack|purse|keys?|jacket|coat|book|umbrella|laptop)\b/.test(p) && /\b(?:take|took|grab|held|hold|sip|drink|slide|slid|use|open|lift|in my hand)\b/.test(p)) return false;
      if (active.has("line_of_sight_violation") && microPerception(piece)) return false;
      if (active.has("interaction_geometry_violation") && (closeRangeAction(piece) || microPerception(piece)) && !hasLocomotionBridge(piece)) return false;
      if (active.has("precise_time_invention") && hasPreciseClock(piece)) return false;
      if (active.has("unsupported_elapsed_time_claim") && /\b(?:hours|all morning|all afternoon|all evening|all night)\b/.test(p)) return false;
      if (active.has("door_state_continuity_break") && /\b(?:open doorway|open door|door stood open)\b/.test(p)) return false;
      if ((active.has("vehicle_driver_transition_missing") || active.has("vehicle_character_entry_omitted")) && /\b(?:steering wheel|brake|accelerator|behind the wheel|starts? (?:the )?car|pulls? away from (?:the )?curb|merg(?:e|es|ed|ing) into|driv(?:e|es|ing)|drove)\b/.test(p) && !/\b(?:gets?|got|slides?|slid|climbs?|climbed|settles?|settled)\b.{0,55}\b(?:driver|wheel|car|seat)\b/.test(p)) return false;
      if (active.has("repeated_action_fingerprint") && extractActionFingerprints(piece).length) return false;
      return true;
    });
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function upsertByName(items = [], next = {}) {
  const out = list(items).map((item) => ({ ...item }));
  const key = normalized(next?.name || "");
  if (!key) return out;
  const index = out.findIndex((item) => normalized(item?.name) === key);
  if (index >= 0) out[index] = { ...out[index], ...next };
  else out.push(next);
  return out.slice(-8);
}

function inferObjectEvents(value = "", actorName = "", otherName = "") {
  const raw = String(value || "");
  const text = normalized(raw);
  const events = [];
  for (const [group, aliases] of Object.entries(OBJECT_GROUPS)) {
    const aliasPattern = aliases.join("|");
    if (!new RegExp(`\\b(?:${aliasPattern})\\b`).test(text)) continue;
    const owns = new RegExp(`\\bmy (?:${aliasPattern})\\b`).test(text);
    const label = owns ? `${actorName} ${group}` : group;
    if (new RegExp(`\\b(?:put|set|placed|place)\\b.{0,35}\\b(?:my )?(?:${aliasPattern})\\b.{0,20}\\b(?:down|on (?:the )?(?:table|counter|desk|seat))\\b`).test(text)
      || new RegExp(`\\b(?:put|set) (?:my )?(?:${aliasPattern}) down\\b`).test(text)) {
      events.push({ object: label, holder: "", location: anchorFromText(raw) || "scene surface", state: "put down" });
      continue;
    }
    if (new RegExp(`\\b(?:put|slid|tucked)\\b.{0,30}\\b(?:my )?(?:${aliasPattern})\\b.{0,20}\\b(?:away|into (?:my )?(?:bag|pocket))\\b`).test(text)) {
      events.push({ object: label, holder: actorName, location: `with ${actorName}`, state: "put away" });
      continue;
    }
    if (new RegExp(`\\b(?:give|gave|hand|handed|pass|passed)\\b.{0,40}\\b(?:my )?(?:${aliasPattern})\\b.{0,35}\\b(?:you|him|her|them|${normalized(otherName).split(/\s+/)[0] || "__none__"})\\b`).test(text)
      || new RegExp(`\\b(?:give|gave|hand|handed|pass|passed) (?:you|him|her|them)\\b.{0,35}\\b(?:my )?(?:${aliasPattern})\\b`).test(text)) {
      events.push({ object: label, holder: otherName, location: `with ${otherName}`, state: "held" });
      continue;
    }
    if (new RegExp(`\\b(?:take|took|grab|grabbed|pick|picked|lift|lifted|hold|held)\\b.{0,35}\\b(?:my )?(?:${aliasPattern})\\b`).test(text)) {
      events.push({ object: label, holder: actorName, location: `with ${actorName}`, state: "held" });
    }
  }
  return events;
}

function mergeObjectStates(previous = [], events = []) {
  const out = list(previous).map((item) => ({ ...item }));
  for (const event of events) {
    const eventGroup = canonicalObject(event.object);
    const eventOwner = normalized(event.object).split(/\s+/)[0];
    const index = out.findIndex((item) => {
      const sameGroup = canonicalObject(item?.object) === eventGroup;
      if (!sameGroup) return false;
      const existingOwner = normalized(item?.object).split(/\s+/)[0];
      return !eventOwner || !existingOwner || eventOwner === existingOwner;
    });
    if (index >= 0) out[index] = { ...out[index], ...event };
    else out.push(event);
  }
  return out.slice(-12);
}

function parseElapsedMinutes(value = "") {
  const text = normalized(value);
  const match = text.match(/\b(\d{1,3})\s*(minutes?|mins?|hours?|hrs?)\s+later\b/);
  if (match) return /hour|hr/.test(match[2]) ? Number(match[1]) * 60 : Number(match[1]);
  const words = { one:1, two:2, three:3, four:4, five:5, six:6 };
  const word = text.match(/\b(one|two|three|four|five|six)\s+(minutes?|hours?)\s+later\b/);
  if (word) return /hour/.test(word[2]) ? words[word[1]] * 60 : words[word[1]];
  return 0;
}

export function deriveScenePhysicsState({ previousScene = {}, latestUserMessage = "", reply = "", userName = "User", characterName = "Character" } = {}) {
  let bodyStates = list(previousScene?.body_states).map((item) => ({ ...item }));
  const userState = bodyStateFromText(latestUserMessage);
  const userAnchor = anchorFromText(latestUserMessage);
  if (userState || userAnchor) bodyStates = upsertByName(bodyStates, { name: userName, ...(userState ? { state:userState } : {}), ...(userAnchor ? { anchor:userAnchor } : {}) });
  const charState = bodyStateFromText(reply);
  const charAnchor = anchorFromText(reply);
  if (charState || charAnchor) bodyStates = upsertByName(bodyStates, { name: characterName, ...(charState ? { state:charState } : {}), ...(charAnchor ? { anchor:charAnchor } : {}) });

  const userEvents = inferObjectEvents(latestUserMessage, userName, characterName);
  const charEvents = inferObjectEvents(reply, characterName, userName);
  const objectStates = mergeObjectStates(previousScene?.object_states, [...userEvents, ...charEvents]);

  let spatialRelations = list(previousScene?.spatial_relations).map((item) => ({ ...item }));
  let visibility = list(previousScene?.visibility).map((item) => ({ ...item }));
  const latest = normalized(latestUserMessage);
  const far = farGeometry(latestUserMessage, previousScene, userName, characterName);
  const explicitExit = /\b(?:leave|left|walked out|exit(?:ed)?|went outside|go outside)\b/.test(latest);
  const closesDoor = /\b(?:close|closed|shut) (?:the )?door\b/.test(latest);
  if (far) {
    spatialRelations = [{ from:userName, to:characterName, distance:"far", can_touch:false, can_whisper:false, micro_expression_visible:false, note:"user-authored distance" }, ...spatialRelations.filter((item) => !relationEntry({spatial_relations:[item]}, userName, characterName))].slice(0,8);
  }
  if (explicitExit || closesDoor) {
    spatialRelations = [{ from:userName, to:characterName, distance: closesDoor ? "different room / closed door" : "offscreen", can_touch:false, can_whisper:false, micro_expression_visible:false, note: closesDoor ? "closed door blocks direct perception" : "user left current visual space" }, ...spatialRelations.filter((item) => !relationEntry({spatial_relations:[item]}, userName, characterName))].slice(0,8);
    visibility = [{ from:characterName, to:userName, can_see:false, can_hear:!closesDoor, reason:closesDoor ? "closed door" : "user exited" }, ...visibility.filter((item) => !visibilityEntry({visibility:[item]}, userName, characterName))].slice(0,8);
  }
  if (/\b(?:return|returned|come back|came back|enter|entered|walked in|step(?:ped)? in)\b/.test(latest)) {
    visibility = [{ from:characterName, to:userName, can_see:true, can_hear:true, reason:"user re-entered" }, ...visibility.filter((item) => !visibilityEntry({visibility:[item]}, userName, characterName))].slice(0,8);
  }
  const elapsedDelta = parseElapsedMinutes(latestUserMessage);
  const elapsedMinutes = Math.max(0, Number(previousScene?.elapsed_minutes || 0) + elapsedDelta);
  const doorState = closesDoor ? "closed" : (/\b(?:open|opened) (?:the )?door\b/.test(latest) ? "open" : clean(previousScene?.door_state, 40));
  const recentActions = [...list(previousScene?.recent_action_fingerprints), ...extractActionFingerprints(reply)].slice(-10);

  return { body_states:bodyStates, object_states:objectStates, spatial_relations:spatialRelations, visibility, elapsed_minutes:elapsedMinutes, door_state:doorState, recent_action_fingerprints:recentActions };
}
