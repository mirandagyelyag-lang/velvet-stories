export function buildAddresseeRoleContract(latestUserMessage = "") {
  const latest = String(latestUserMessage || "");
  const match = latest.match(/\b(?:said|say|asked|ask|told|speak|spoke|talked|speaking|talking|says|asks|tells)\s+(?:it\s+)?(?:to\s+)?(?:the|a|our)\s+(worker|barista|cashier|waiter|waitress|server|clerk|receptionist|doctor|professor|driver)\b|\b(?:le\s+)?(?:dije|digo|pregunt[eé]|habl[eé])\s+(?:a|al|con)\s+(?:el\s+|la\s+)?(empleado|empleada|cajero|cajera|mesero|mesera|barista|recepcionista|doctor|profesor|conductor)\b/i);
  return [
    "ADDRESSEE AND SCENE ROLE CONTINUITY:",
    match ? "EXPLICIT USER ADDRESSEE="+(match[1]||match[2])+". The user's utterance belongs to that exchange, not automatically to the lead." : "Resolve the user's addressee from explicit attribution and scene context before answering.",
    "Preserve established roles: customer, companion, employee and other NPCs remain distinct. Being near a counter or machine does not make the lead an employee.",
    "When the user addresses an NPC, allow that NPC to give the relevant brief response with explicit attribution. The lead may react as their companion; never steal the NPC's job, information, dialogue or equipment.",
    "For a cafe order addressed to a worker: the worker receives the order and handles the register. The companion may order their own drink, offer to pay or make a natural comment. Do not convert a staffed counter into self-service, operate an employee register, promise drinks as staff, or direct the user to pay without established support.",
    "Follow the latest explicit user staging if prior generated staging was mistaken. Preserve who speaks, who acts and who owns each object; never script the user's payment, acceptance or response."
  ].join("\n");
}

export function buildTargetAwareDialogueV34943({ latestUserMessage = "", character = {}, recentContext = "" } = {}) {
  const latest = String(latestUserMessage || "").trim();
  const approachWhy = /\bwhy\b[^?\n]{0,80}\b(?:come|came|walk|walked|go|went|approach|approached)(?:\s+up)?\s+(?:to|over to|toward|towards)\s+me\b|\bwhy did you (?:come|walk)(?: up| over)?\b|\bwhy (?:are you here|did you approach me)\b/i.test(latest);
  return buildAddresseeRoleContract(latest)+"\n"+`TARGET-AWARE DIALOGUE 3.49.43 · FINAL SPEECH GATE\n- This gate runs AFTER motive resolution and BEFORE visible wording. It overrides any instruction to be witty, terse, sarcastic, cool, evasive, cinematic, or quotable.\n- A direct social question must be answered at the SAME semantic level as the question.\n- APPROACH-TARGET GATE: ${approachWhy ? "ACTIVE. The user is asking why this character chose to approach/interact with THEM, not merely why the character was in the area. Resolve the social-selection cause: why this person, why this interaction, or what concrete reason made the character address them. A destination motive alone (drink, bar, seat, class, hallway) is insufficient unless the reply explicitly bridges it to approaching the user." : "not required this turn."}\n- Do not confuse LOCATION CAUSE with INTERACTION CAUSE. “I wanted a drink” can explain going to a bar; it does not by itself explain walking up to a person.\n- Do not use a bare abstract label as a substitute for lived speech: “Curiosity. Mostly.” / “Instinct.” / “Boredom.” are generic answer-shaped fragments unless grounded in what the character was curious about or why it selected this interaction.\n- “I didn't.” is not an answer when the visible history shows the character initiated the approach. Do not erase the premise merely to preserve pride.\n- A guarded character may understate, partially admit, or give a plausible cover, but the cover must still explain the interaction. Guarded does NOT mean semantic evasion.\n- Sarcasm may appear only AFTER a complete natural answer, and usually should not appear at all. Never replace the answer with a jab such as “witness to your charm.”\n- Prefer ordinary spoken syntax. Do not compress into fortune-cookie fragments just because the character is reserved.\n- GOOD SHAPE examples, only when supported by context: “Wanted to talk to you.” / “You looked bored.” / “I saw you over here and came to say hi.” / “I needed to ask you something.” / “I don't know. I just wanted to.”\n- Do not copy those examples if unsupported. Resolve the actual motive from canon/recent events first.\n- The answer should feel specific enough that swapping the user for a random stranger could change it. If it would work unchanged for anyone, reconsider whether it actually answers why THIS interaction happened.\nLATEST USER TURN: ${latest.slice(0,900) || "none"}\nRECENT CONTEXT HINT: ${String(recentContext || "").slice(0,700) || "use supplied conversation context"}`;
}

export function targetAwareDialogueV34943Issues(reply = "", latestUserMessage = "") {
  const text = String(reply || "").trim();
  const latest = String(latestUserMessage || "").trim();
  const issues = [];
  const approachWhy = /\bwhy\b[^?\n]{0,80}\b(?:come|came|walk|walked|go|went|approach|approached)(?:\s+up)?\s+(?:to|over to|toward|towards)\s+me\b|\bwhy did you (?:come|walk)(?: up| over)?\b|\bwhy (?:are you here|did you approach me)\b/i.test(latest);
  if (approachWhy) {
    if (/^["“']?\s*(?:curiosity|boredom|instinct|interest)\.?\s*(?:mostly\.)?\s*["”']?$/i.test(text)) issues.push("target_dialogue_abstract_fragment");
    if (/^["“']?\s*i didn['’]?t\.?\s*["”']?$/i.test(text)) issues.push("target_dialogue_premise_denial");
    if (/^["“']?\s*i wanted (?:a|the) drink\.?\s*["”']?$/i.test(text)) issues.push("target_dialogue_location_not_interaction");
    if (/witness to your charm|witness to (?:all )?that charm/i.test(text)) issues.push("target_dialogue_quip_evasion");
  }
  return [...new Set(issues)];
}
