export function buildLeanDialogueCoreV34942({ latestUserMessage = "", character = {}, relationship = {}, scene = {}, knowledgeLedger = [] } = {}) {
  const latest = String(latestUserMessage || "").trim();
  const directWhy = /\bwhy\b|\bwhat (?:made|brought) you\b|\bwhy did you\b/i.test(latest);
  const directQuestion = /\?|\b(?:why|what|where|when|who|how|did|do|does|are|is|can|could|would|will)\b/i.test(latest);
  return `LEAN DIALOGUE CORE 3.49.42 · THIS OVERRIDES ALL STYLE/HUMANIZATION DIRECTIVES\n- The job is not to sound clever, cinematic, charismatic, sarcastic, cool, romantic, or quotable. The job is to respond like one specific person in this exact situation.\n- INTERNAL ORDER: (1) identify the user's actual conversational move; (2) identify the concrete answer/fact/motive needed; (3) decide what ${String(character?.name || "the character")} would honestly disclose; (4) say that in the fewest natural words; (5) add physical action only if required by scene physics or an actual task.\n- DIRECT-ANSWER GATE: ${directQuestion ? "ACTIVE. The first spoken clause must materially answer the user's question." : "not required this turn."}\n- CAUSAL GATE: ${directWhy ? "ACTIVE. Internally resolve a concrete cause before wording. The visible answer must express that cause or a plausible cause-based lie/partial truth. A joke, correction, negation, technicality, insult, metaphor, or quip is NOT an answer." : "not required this turn."}\n- If the true motive is simple, keep it simple: “Wanted a drink.” “I wanted to talk to you.” “I was bored.” “I don't know. Felt like it.” Ordinary language is a success state.\n- Do not answer a why-question with what the character did NOT do. Do not litigate wording (“I was already here”). Do not substitute a clever premise (“survival instinct”, “checking if he survived”, “your radius”).\n- PERSONALITY THROUGH SELECTION, not decoration. Personality may change which truth is admitted, how much is admitted, or whether the answer is blunt/soft/brief. It may not replace the semantic job.\n- DEFAULT BODY STATE = STILL. No nod, gaze, breath, lean, smirk, eyebrow, jaw, shrug, step closer, posture note, silence choreography, or expression description unless the action changes the physical situation or is necessary to the beat.\n- DEFAULT NARRATION = NONE for ordinary conversational turns. Dialogue-only is preferred when nothing physically changes.\n- Never append a jab, aphorism, “take your pick,” “try it sometime,” “you know that?”, “most people…”, or generalized observation merely to give the line flavor.\n- Never manufacture a second sentence after a complete answer just to prove voice.\n- If every stylish version feels written, use the boring version.\n- Hidden relationship/scene/knowledge state may constrain facts and disclosure, but must not force prose.\nLATEST USER TURN: ${latest.slice(0, 900) || "none"}`;
}

export function leanDialogueCoreV34942Issues(reply = "", latestUserMessage = "") {
  const text = String(reply || "").trim();
  const latest = String(latestUserMessage || "").trim();
  const issues = [];
  const why = /\bwhy\b|\bwhat (?:made|brought) you\b|\bwhy did you\b/i.test(latest);
  const lower = text.toLowerCase();
  if (why) {
    if (/\bi didn['’]?t (?:come|go|walk|approach)|\bi was already here\b|\byou (?:came|walked) (?:to|into)\b/.test(lower)) issues.push("lean_core_causal_nonanswer");
    if (/\b(?:check(?:ing)? if [^\n.]{0,80}surviv\w*|survival instinct|self[- ]preservation|your radius|perimeter check)\b/.test(lower)) issues.push("lean_core_causal_quip_substitution");
  }
  if (/\b(?:take your pick|try it sometime|file it under|most people (?:would|would've|would have)|it['’]?s called .{0,60}\btry)\b/i.test(text)) issues.push("lean_core_performed_quip");
  if (/\b(?:slow|dry|indifferent|unbothered|casual|practiced|measured)\b[^\n.]{0,45}\b(?:nod|gaze|look|breath|stride|step|posture|mask|expression)\b/i.test(text)) issues.push("lean_core_performed_body_language");
  return [...new Set(issues)];
}
