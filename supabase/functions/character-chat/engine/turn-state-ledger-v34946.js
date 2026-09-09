function flat(value) { return (Array.isArray(value) ? value : []).map((x) => String(x || "")).join(" \n "); }

export function buildTurnStateLedgerV34946({ latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], recentTurns = [], character = {} } = {}) {
  const turns = (Array.isArray(recentTurns) ? recentTurns : []).slice(-10).map((x) => String(x || "").slice(0, 650)).join("\n");
  return `TURN-STATE LEDGER 3.49.46 · KEEP THE LAST EXCHANGE LOGICALLY OWNED
- This is a continuity gate, not a style layer. Preserve Target-Aware 3.49.43 and Spoken Naturalness 3.49.44.
- Before speaking, silently reconstruct the last live exchange as a tiny ledger: OBJECT / ACTOR / ACTION / RECIPIENT / STATUS.
- A joke still has facts. If CHARACTER offered to prepare/bring a formal request, CHARACTER owns PREPARE+DELIVER. USER saying “I'll wait for it” owns WAIT/RECEIVE only.
- NEVER reverse that ownership later. “I'll hold you to it”, “until you're ready”, “I'll check your progress”, or anything implying USER must produce/complete the request is logically invalid unless USER explicitly took that task.
- Resolve short reactions against the live ledger. A sigh, eye-roll, “fine”, “sure”, “I'll wait”, or silence does NOT transfer ownership and does NOT invent a new promise.
- Do not keep extending a joke merely because it exists. After a reaction such as a sigh, either respond to the reaction naturally, let the bit die, or continue it ONLY if the roles/referents remain correct.
- COMMITMENT INVARIANT: actor stays actor; recipient stays recipient; object stays the same until an explicit turn changes them.
- If a clever continuation conflicts with the ledger, discard the clever continuation.
- Do not narrate a task, readiness, progress, deadline, draft, homework, application, request, or obligation for USER unless USER actually accepted/created it.
- Example ledger: formal request | actor=CHARACTER | action=prepare/deliver | recipient=USER | user_status=waiting. After USER sighs, BAD: “I'll hold you to it.” BAD: “I'll keep it safe until you're ready.” GOOD LOGIC: USER owes nothing; CHARACTER still owns the imaginary request. The joke may also simply end.
RECENT TURNS:\n${turns || "none"}
LATEST USER: ${String(latestUserMessage || "").slice(0,700) || "none"}
CHARACTER: ${String(character?.name || "character").slice(0,100)}`;
}

export function turnStateLedgerV34946Issues(reply = "", latestUserMessage = "", recentCharacterReplies = [], recentUserMessages = []) {
  const text = String(reply || "").trim();
  const latest = String(latestUserMessage || "").trim();
  const chars = flat(recentCharacterReplies);
  const users = flat(recentUserMessages);
  const issues = [];
  const characterOwnsPaperwork = /\bi(?:'|’)ll\b[^.\n]{0,140}\b(?:find|bring|write|draft|send|make|prepare)\b[^.\n]{0,140}\b(?:cardstock|draft|request|paperwork|application)\b/i.test(chars);
  const userWaited = /\bi(?:'|’)ll\s+wait\s+for\s+it\b/i.test(users) || /\bi(?:'|’)ll\s+wait\b/i.test(users);
  const reactionOnly = /^\s*(?:\*[^*]{1,120}\*|(?:i\s+)?(?:sigh|shrug|nod|roll\s+my\s+eyes)|\.{1,3})\s*[.!?]*\s*$/i.test(latest);
  if (characterOwnsPaperwork && userWaited) {
    if (/\bi(?:'|’)ll\s+hold\s+you\s+to\s+it\b/i.test(text)) issues.push('turn_state_commitment_reversal');
    if (/\b(?:until|when)\s+you(?:'|’)re\s+ready\b/i.test(text)) issues.push('turn_state_fake_user_readiness');
    if (/\b(?:your|you(?:'|’)re)\s+(?:progress|draft|request|paperwork|application|deadline|turn)\b/i.test(text)) issues.push('turn_state_fake_user_obligation');
    if (/\b(?:waiting\s+on\s+you|your\s+move|you\s+better\s+(?:bring|write|send|finish|prepare))\b/i.test(text)) issues.push('turn_state_actor_recipient_swap');
    if (reactionOnly && /\b(?:cardstock|formal\s+request|draft|paperwork)\b/i.test(text) && /\b(?:you(?:'|’)re|you\s+(?:are|need|have|should|will)|your)\b/i.test(text)) issues.push('turn_state_joke_extension_role_drift');
  }
  return [...new Set(issues)];
}
