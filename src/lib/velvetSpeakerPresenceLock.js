/**
 * Velvet Speaker & Presence Lock.
 * Keeps explicit scene facts separate from prose. Use in the story-generation
 * pipeline: build a scene ledger from established events, inject instructions,
 * then validate the model's output. Never guess a speaker.
 */
export function createSceneLedger(previous = {}) {
  return {
    location: previous.location ?? null,
    characters: { ...(previous.characters ?? {}) },
    lastSpeaker: previous.lastSpeaker ?? null,
    addressee: previous.addressee ?? null,
  };
}
export function applySceneEvent(ledger, event) {
  const next = createSceneLedger(ledger);
  if (event.type === "location" && event.location) next.location = event.location;
  if (event.type === "enter" && event.name) {
    next.characters[event.name] = { present: true, position: event.position ?? "unknown" };
  }
  if (event.type === "exit" && event.name && next.characters[event.name]) {
    next.characters[event.name] = { ...next.characters[event.name], present: false };
  }
  if (event.type === "move" && event.name && next.characters[event.name]) {
    next.characters[event.name] = { ...next.characters[event.name], position: event.position };
  }
  if (event.type === "speech" && event.name) {
    next.lastSpeaker = event.name;
    next.addressee = event.addressee ?? null;
  }
  return next;
}
export function speakerPresenceInstructions(ledger) {
  const present = Object.entries(ledger.characters).filter(([, value]) => value.present);
  return [
    "SPEAKER & PRESENCE LOCK — mandatory scene continuity:",
    "Location: " + (ledger.location ?? "not established"),
    "Present characters and positions: " + (present.map(([name, value]) => name + " at " + value.position).join("; ") || "not established"),
    "Last established speaker: " + (ledger.lastSpeaker ?? "unknown"),
    "Last addressee: " + (ledger.addressee ?? "unknown"),
    "When two or more characters of the same pronoun are present, explicitly name the speaker on first dialogue after any entrance, interruption, or speaker switch.",
    "Track the speaker, actor, addressee and position separately. A new entrance does NOT change the speaker automatically.",
    "Use pronouns only when their referent is unambiguous. Do not repeat names unnecessarily.",
    "Do not invent names, positions, entrances, exits, movements, or speaker switches to resolve uncertainty.",
    "Honor the user's established dialogue, movements, NPC entrances and chronology.",
    "If attribution is uncertain, rewrite the sentence to establish the speaker explicitly without changing established facts.",
    "For Chase and Adrian in one scene: after Adrian enters, do not write a bare he says; identify Chase or Adrian explicitly.",
    "Keep every established character physically present until an explicit exit; do not infer exits from silence.",
    "Before sending each reply, check every quotation and action against the current speaker and scene participants."
  ].join("\n");
}
export function validateSpeakerPresence(text, ledger) {
  const present = Object.entries(ledger.characters).filter(([, c]) => c.present).map(([name]) => name);
  const issues = [];
  if (present.length >= 2) {
    const lines = String(text).split(/\n+/).filter(Boolean);
    for (const line of lines) {
      if (/["“][^"”]+["”]\s*,?\s*(?:he|she|they)\s+(?:says|said|asks|asked|replies|replied|murmurs|muttered)\b/i.test(line) &&
          !present.some(name => line.includes(name))) {
        issues.push({ code: "AMBIGUOUS_DIALOGUE_SPEAKER", line });
      }
    }
  }
  return { ok: issues.length === 0, issues };
}
