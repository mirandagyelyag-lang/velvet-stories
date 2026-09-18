// Velvet Stories v3.52.54 · Immutable Canon / Event Truth Lock
const clean = (v = "", max = 900) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const norm = (v = "") => clean(v, 12000).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9áéíóúüñ' -]+/gi, " ").replace(/\s+/g, " ").trim();

export function buildImmutableEventTruthV35254({ recentMessages = [], character = {} } = {}) {
  const transcript = (Array.isArray(recentMessages) ? recentMessages : []).slice(-24).map((m) => {
    const speaker = m?.sender === "user" ? "USER" : (m?.sender === "character" ? "CHARACTER" : clean(m?.sender || "OTHER", 40).toUpperCase());
    return `${speaker}: ${clean(m?.content, 1100)}`;
  }).join("\n");
  return `IMMUTABLE EVENT TRUTH LOCK 3.52.54 · FACTS CANNOT MUTATE
This is a HARD continuity law, stronger than wit, drama, prose, momentum, or convenience.
Before writing, silently reconstruct current facts as ACTOR → ACTION → OBJECT/PERSON → RECIPIENT/TARGET → STATUS.
Track who arrived, who invited whom, who brought whom, who knows what, who is present, names, relationships, locations, causes, promises, possessions, and unresolved identities.
- Once a visible turn establishes a fact, KEEP IT TRUE until a later visible turn explicitly changes it.
- NEVER swap actors, recipients, guests, inviters, owners, causes, names, relationships, locations, or chronology.
- NEVER repair uncertainty by inventing a named person or a new role for an existing NPC.
- A known NPC name is NOT permission to assign that NPC a new role in the current event.
- If Liam is the unexpected person, do not later say Liam brought an unexpected plus-one unless that was established.
- If USER asks “Who?”, answer only from an identity licensed by the visible scene. If no identity was established, clarify naturally instead of fabricating one.
- ENTITY EXISTS is different from ENTITY HAS THIS ROLE.
- Suspicion, rumor, implication, sarcasm and guesses remain non-factual until confirmed.
- Never retroactively rewrite the opening scene to make the latest sentence convenient.
- “Who?”, “why?”, “him?”, “what happened?”, “then?” and “really?” inherit the exact live referent.
- Newest explicit USER correction wins. Otherwise preserve the established fact.
- If answering requires changing canon, say less instead of changing canon.

VISIBLE RECENT SCENE:
${transcript || "none"}
CHARACTER: ${clean(character?.name || "character", 100)}`;
}

function unsupportedRoleClaim(reply = "", evidence = "") {
  const r = String(reply || "");
  const e = norm(evidence);
  const patterns = [
    { re: /\b([A-Z][a-z]{2,})\s+(?:brought|brings|invited|invites)\s+(?:a|the|his|her|their)?\s*(?:plus[- ]?one|guest|friend|date|guy|girl|him|her|them)\b/g, rel: ["brought","brings","invited","invites"] },
    { re: /\b([A-Z][a-z]{2,})\s+(?:came|showed up|arrived)\s+with\s+([A-Z][a-z]{2,}|him|her|them|a\s+guest|a\s+friend|a\s+date)\b/g, rel: ["came with","showed up with","arrived with"] },
  ];
  for (const {re, rel} of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(r))) {
      const actor = norm(m[1]);
      if (actor && !rel.some((word) => e.includes(`${actor} ${word}`))) return true;
    }
  }
  return false;
}

export function immutableEventTruthV35254Issues({ reply = "", recentUserMessages = [], recentCharacterReplies = [], character = {} } = {}) {
  const evidence = [...recentUserMessages, ...recentCharacterReplies, character?.name || ""].join("\n");
  const issues = [];
  if (unsupportedRoleClaim(reply, evidence)) issues.push("immutable_event_role_reassignment");
  const latest = String(recentUserMessages[recentUserMessages.length - 1] || "").replace(/\*[^*]*\*/g, " ").trim();
  if (/^(?:who|who\?|who is it|who was it)\??$/i.test(latest)) {
    const bare = String(reply || "").trim().replace(/^["“]|["”]$/g, "");
    const m = bare.match(/^([A-Z][a-z]{2,})[.!?]?$/);
    if (m && !norm(evidence).includes(norm(m[1]))) issues.push("immutable_event_unlicensed_identity");
  }
  return [...new Set(issues)];
}
