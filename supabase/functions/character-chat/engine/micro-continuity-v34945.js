export function buildMicroContinuityV34945({ latestUserMessage = "", recentTurns = [], character = {} } = {}) {
  const turns = Array.isArray(recentTurns) ? recentTurns.slice(-8).map((t) => String(t || "").slice(0, 700)).join("\n") : String(recentTurns || "").slice(-4200);
  return `MICRO-CONTINUITY 3.49.45 · WHO OWES WHAT TO WHOM
- TARGET-AWARE 3.49.43 and SPOKEN NATURALNESS 3.49.44 stay frozen. This is a local continuity check, not a new style layer.
- Before replying, resolve pronouns and conversational objects in the last few turns: it/that/this/them must point to the most plausible live referent.
- Track ROLE OWNERSHIP for tiny conversational commitments: who offered, promised, requested, owes, waits, brings, sends, checks, chooses, or performs each thing.
- Never silently swap subject and recipient. If CHARACTER said they would bring/write/send/do X and USER says “I'll wait for it,” USER is waiting for CHARACTER'S X. CHARACTER must not then check USER'S progress on X.
- JOKE CONTINUITY: a joke may stay playful, but its internal facts still count. Metaphorical paperwork is still owned by the person who agreed to bring the paperwork until the joke changes.
- ELLIPSIS RESOLUTION: short replies such as “I'll wait for it”, “deal”, “fine”, “then do it”, “you better”, “when?”, and “where?” inherit their missing object/action from the immediately active exchange. Resolve that before inventing a new topic.
- NO ROLE REVERSAL FOR A QUIP. A clever line is invalid if it requires pretending the other person promised the thing you promised.
- NO FAKE TASKS. Do not mention the user's “progress”, “homework”, “draft”, “application”, “plan”, or other obligation unless the recent exchange actually assigned it to them.
- If continuity is uncertain, answer conservatively from the last explicit ownership instead of fabricating a new obligation.
- Example: CHARACTER: “I'll bring a formal request.” USER: “I'll wait for it.” BAD: “Good. I'll check your progress then.” GOOD LOGIC: CHARACTER still owns preparing/delivering the request; USER only owns waiting/receiving. The visible line can vary naturally.
RECENT TURNS:\n${turns || "none"}
LATEST USER TURN: ${String(latestUserMessage || "").slice(0,900) || "none"}
CHARACTER: ${String(character?.name || "character").slice(0,120)}`;
}

export function microContinuityV34945Issues(reply = "", latestUserMessage = "", recentCharacterReplies = []) {
  const text = String(reply || "").trim();
  const latest = String(latestUserMessage || "").trim();
  const recent = (Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).join(" \n ");
  const issues = [];
  if (/\bi(?:'|’)ll\s+wait\s+for\s+it\b/i.test(latest) && /\b(?:your|you(?:'|’)re)\s+(?:progress|draft|application|paperwork|request)\b/i.test(text)) {
    issues.push("micro_continuity_role_reversal");
  }
  if (/\bi(?:'|’)ll\b[^.\n]{0,80}\b(?:bring|write|draft|send|make|find)\b/i.test(recent) && /\bi(?:'|’)ll\s+wait\s+for\s+it\b/i.test(latest) && /\bcheck\s+your\s+(?:progress|draft|application|paperwork|request)\b/i.test(text)) {
    issues.push("micro_continuity_commitment_owner_swap");
  }
  if (/\bi(?:'|’)ll\s+wait\s+for\s+it\b/i.test(latest) && /\byour\s+(?:homework|assignment|task)\b/i.test(text)) {
    issues.push("micro_continuity_fake_user_task");
  }
  return [...new Set(issues)];
}
