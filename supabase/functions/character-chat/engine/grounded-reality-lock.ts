// Velvet v3.35.1 · Grounded Reality Hard Lock
// Pure deterministic guards. No model judgement is trusted for these boundaries.

function normalized(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s*.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function spokenUserText(value = "") {
  return String(value || "").replace(/\*[^*]*\*/gs, " ").replace(/\s+/g, " ").trim();
}

function evidenceText(recentUserMessages = [], recentCharacterReplies = [], character = {}) {
  return normalized([
    ...(Array.isArray(recentUserMessages) ? recentUserMessages : []),
    ...(Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []),
    character?.name || "",
    character?.role || "",
    character?.background || "",
    character?.notes || "",
    character?.scenario || "",
    character?.world || "",
    character?.relationship || "",
  ].join(" "));
}

export function hasActiveDeclaredStateLock(recentUserMessages = [], latestUserMessage = "") {
  const turns = [...(Array.isArray(recentUserMessages) ? recentUserMessages : []), latestUserMessage]
    .filter(Boolean)
    .slice(-8)
    .reverse();
  for (const raw of turns) {
    const value = normalized(spokenUserText(raw));
    if (!value) continue;
    if (/\b(?:actually|okay i admit|fine i am|i'm upset|i am upset|i'm angry|i am angry|i'm sad|i am sad|something is wrong|i lied|i wasn't fine|i was not fine)\b/.test(value)) return false;
    if (/\b(?:i'm|im|i am) (?:fine|okay|ok)\b|\bnothing(?: is|'s) wrong\b|\bi don'?t know what you'?re talking about\b/.test(value)) return true;
  }
  return false;
}

export function hasDeclaredStateDisbelief(reply = "", recentUserMessages = [], latestUserMessage = "") {
  if (!hasActiveDeclaredStateLock(recentUserMessages, latestUserMessage)) return false;
  const text = normalized(reply);
  const directOverride = /\b(?:you'?re not fine|you are not fine|you'?re not okay|you are not okay|pretending to be fine|acting like you'?re fine|hiding something|what'?s really going on|what'?s actually going on|deep down|secretly)\b/;
  const disbeliefCadence = /\b(?:right\.? let'?s go with that|sure\.? if you say so|if you say so|very convincing|real convincing|keep telling yourself that|whatever you say|yeah\.? sure|right\.? sure|i totally believe you|subtle\.? very convincing)\b/;
  return directOverride.test(text) || disbeliefCadence.test(text);
}

export function hasSemanticScopeOverreach(reply = "", latestUserMessage = "") {
  const latest = normalized(spokenUserText(latestUserMessage));
  const text = normalized(reply);
  if (!latest || !text) return false;
  const scopedComplaint = /\b(?:i'?m|im|i am)?\s*(?:getting\s+)?(?:tired|sick|fed up|done)\s+(?:of|with)\s+(?:it|this|that|this behavior|that behavior|the sarcasm|the teasing|this dynamic)\b/.test(latest)
    || /\b(?:this|that) is (?:getting )?(?:old|annoying|exhausting)\b/.test(latest);
  if (!scopedComplaint) return false;
  const relationshipLeap = /\b(?:need some space|need space|want some space|want space|give you space|leave you alone|want me to leave|want me gone|don'?t want me around|do not want me around|need time away|want distance|stay away from you|back off from you)\b/;
  return relationshipLeap.test(text);
}

export function hasInferenceDistanceExceeded(reply = "", latestUserMessage = "", recentUserMessages = []) {
  const raw = String(latestUserMessage || "");
  const text = normalized(reply);
  if (!raw || !text) return false;
  const onlyNonverbal = raw.replace(/\*[^*]*\*/gs, " ").trim().length === 0;
  const cue = /\*[^*]*\b(?:roll(?:ed)? (?:my|her|his|their) eyes|eye roll|shrug(?:ged)?|sigh(?:ed)?|look(?:ed)? away|cross(?:ed)? (?:my|her|his|their) arms|go(?:es|t)? quiet|went quiet|pause(?:d)?|stare(?:d)?)\b[^*]*\*/i.test(raw);
  if (!onlyNonverbal || !cue) return false;
  const inferentialBridge = /\b(?:so you'?re|so you are|that means you'?re|that means you are|which means you'?re|which means you are|clearly you'?re|clearly you are|obviously you'?re|obviously you are|must be|proves? you|very convincing|if you say so|keep telling yourself that|need some space|want space)\b/;
  const psychologicalTarget = /\b(?:fine|okay|upset|angry|mad|jealous|lying|hiding|avoiding|tired of me|want me gone|need space|want space)\b/;
  return inferentialBridge.test(text) && (psychologicalTarget.test(text) || hasActiveDeclaredStateLock(recentUserMessages, latestUserMessage));
}

function unsupportedSpecificityCategories(reply = "", evidence = "") {
  const text = normalized(reply);
  const categories = [];
  const checks = [
    ["named_academic", /\bprof(?:essor)?\.?\s+[a-z]{3,}\b/, /\bprof(?:essor)?\.?\s+[a-z]{3,}\b/],
    ["named_obligation", /\b(?:lab check[- ]?in|study group|office hours|seminar|lecture|practice|training|team meeting|captain'?s meeting|appointment|shift)\b/, /\b(?:lab check[- ]?in|study group|office hours|seminar|lecture|practice|training|team meeting|appointment|shift)\b/],
    ["schedule_specificity", /\b(?:pushed|moved|rescheduled|starts?|begins?|ends?)\s+(?:to|at)\s+(?:[0-9]{1,2}(?::[0-9]{2})?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/, /\b(?:pushed|moved|rescheduled|starts?|begins?|ends?)\s+(?:to|at)\b/],
    ["authority_role", /\b(?:the|our|my)\s+(?:captain|coach|professor|advisor|boss|ta)\b/, /\b(?:captain|coach|professor|advisor|boss|ta)\b/],
    ["retroactive_pattern", /\b(?:again|as usual|like last time|same as last time|another search party|always does this|always do this)\b/, /\b(?:again|as usual|last time|always)\b/],
  ];
  for (const [name, claim, support] of checks) {
    if (claim.test(text) && !support.test(evidence)) categories.push(name);
  }
  return categories;
}

export function hasSpecificityEscalation(reply = "", recentUserMessages = [], recentCharacterReplies = [], character = {}) {
  const evidence = evidenceText(recentUserMessages, recentCharacterReplies, character);
  const cats = unsupportedSpecificityCategories(reply, evidence);
  // One named professor is already highly concrete; otherwise require a payload of >=2 unsupported specifics.
  return cats.includes("named_academic") || cats.length >= 2;
}

export function hasInvisibleHistoryClaim(reply = "", recentUserMessages = [], recentCharacterReplies = [], character = {}) {
  const text = normalized(reply);
  if (!text) return false;
  const evidence = evidenceText(recentUserMessages, recentCharacterReplies, character);
  const hardClaims = [
    /\bi heard you the first time\b/,
    /\bi already told you\b/,
    /\byou already told me\b/,
    /\blike last time\b/,
    /\bas usual\b/,
    /\byou always do this\b/,
    /\byou always say that\b/,
    /\b(?:send|sent) out a search party again\b/,
    /\bmiss(?:ed|ing)? practice again\b/,
    /\blate again\b/,
  ];
  if (!hardClaims.some((pattern) => pattern.test(text))) return false;
  const support = /\b(?:first time|already told|last time|as usual|always|search party|missed practice|late again)\b/;
  return !support.test(evidence);
}

export function hasNarrativeNaturalismOverwrite(reply = "", latestUserMessage = "") {
  const text = normalized(reply);
  if (!text) return false;
  const visible = normalized(spokenUserText(latestUserMessage));
  const latestWords = visible.split(/\s+/).filter(Boolean).length;
  const patterns = [
    /\bthe impulse to\b.{0,45}\bwas automatic\b/,
    /\ba reflex i'?d spent\b/,
    /\bhalf a lifetime\b/,
    /\bfingers? curling\b/,
    /\bbreath (?:caught|hitched)\b/,
    /\bi shifted my weight\b/,
    /\bmy jaw (?:tightened|clenched)\b/,
    /\bthe air between us\b/,
    /\bsomething in my chest\b/,
    /\bmy gaze lingered\b/,
    /\bfor a second the world\b/,
  ];
  const hits = patterns.filter((pattern) => pattern.test(text)).length;
  return hits >= 2 || (latestWords <= 8 && hits >= 1 && text.split(/\s+/).length >= 45);
}

export function hasUserAuthoredSceneBeatIgnored(reply = "", latestUserMessage = "") {
  const latest = normalized(latestUserMessage);
  const text = normalized(reply);
  if (!latest || !text) return false;
  const introducedActor = /\b(?:cashier|clerk|waiter|waitress|server|barista|girl|woman|guy|man|student|teammate|coach|professor|stranger|cajera|cajero|mesera|mesero|chica|mujer|tipo|hombre|estudiante|entrenador|entrenadora|profesor|profesora|desconocido|desconocida)\b/.test(latest);
  const authoredAction = /\b(?:flirt|flirting|flirts|approach|approaches|walks? over|comes? over|waves?|smiles? at|asks?|says?|tells?|hands?|gives?|touches?|calls?|interrupts?|coquetea|coqueteando|se acerca|saluda|sonrie|sonríe|pregunta|dice|entrega|toca|llama|interrumpe)\b/.test(latest);
  if (!introducedActor || !authoredAction) return false;
  const femaleActor=/\b(?:girl|woman|waitress|cajera|mesera|chica|mujer|entrenadora|profesora|desconocida)\b/.test(latest);
  const acknowledgesActor = /\b(?:cashier|clerk|waiter|waitress|server|barista|girl|woman|guy|man|student|teammate|coach|professor|stranger|cajera|cajero|mesera|mesero|chica|mujer|tipo|hombre|estudiante|entrenador|entrenadora|profesor|profesora|desconocido|desconocida|they|them)\b/.test(text) || (femaleActor&&/\b(?:she|her)\b/.test(text));
  const acknowledgesAction = /\b(?:flirt|smile|answer|reply|respond|thank|decline|ignore|look(?:s|ed)? (?:at|toward)|turn(?:s|ed)? (?:to|toward)|acknowledge|coquete|sonri|sonrí|responde|contesta|agradece|rechaza|ignora|mira|se gira)\b/.test(text);
  return !acknowledgesActor && !acknowledgesAction;
}

export function groundedRealityIssues({ reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], character = {} } = {}) {
  const issues = [];
  if (hasDeclaredStateDisbelief(reply, recentUserMessages, latestUserMessage)) issues.push("declared_state_disbelief");
  if (hasSemanticScopeOverreach(reply, latestUserMessage)) issues.push("semantic_scope_overreach");
  if (hasInferenceDistanceExceeded(reply, latestUserMessage, recentUserMessages)) issues.push("inference_distance_exceeded");
  if (hasSpecificityEscalation(reply, recentUserMessages, recentCharacterReplies, character)) issues.push("specificity_escalation");
  if (hasInvisibleHistoryClaim(reply, recentUserMessages, recentCharacterReplies, character)) issues.push("invisible_history_claim");
  if (hasNarrativeNaturalismOverwrite(reply, latestUserMessage)) issues.push("narrative_naturalism_overwrite");
  if (hasUserAuthoredSceneBeatIgnored(reply, latestUserMessage)) issues.push("user_authored_scene_beat_ignored");
  return [...new Set(issues)];
}

export function sanitizeGroundedRealityReply(reply = "", issues = []) {
  const hard = new Set(Array.isArray(issues) ? issues : []);
  const mustStrip = hard.has("declared_state_disbelief") || hard.has("semantic_scope_overreach") || hard.has("inference_distance_exceeded") || hard.has("specificity_escalation") || hard.has("invisible_history_claim");
  if (!mustStrip && !hard.has("narrative_naturalism_overwrite")) return String(reply || "").trim();
  const bad = [
    /\b(?:right\.? let'?s go with that|let'?s go with that|sure\.? if you say so|if you say so|very convincing|keep telling yourself that|you'?re not fine|you'?re not okay|pretending to be fine)\b/i,
    /\b(?:need some space|need space|want some space|want space|give you space|leave you alone|want me gone|don'?t want me around)\b/i,
    /\bprof(?:essor)?\.?\s+[a-z]{3,}\b/i,
    /\b(?:lab check[- ]?in|study group|office hours|practice|training|captain|coach)\b/i,
    /\b(?:i heard you the first time|i already told you|like last time|as usual|search party again|missed practice again)\b/i,
    /\b(?:the impulse to|half a lifetime|fingers? curling|breath caught|breath hitched|the air between us|something in my chest)\b/i,
  ];
  const pieces = String(reply || "")
    .split(/(?<=[.!?]["”']?)\s+|\n{2,}/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .filter((piece) => !bad.some((pattern) => pattern.test(piece)));
  return pieces.join(" ").replace(/\s+/g, " ").trim();
}
