// Velvet Stories v3.52.55 · Motivation Persistence Lock
// Keeps a character's immediately demonstrated social/romantic motive alive
// when the user confronts the behavior. Words may deny it; behavior cannot
// suddenly become unrelated, administrative, or motivationally blank.

const norm = (value = "") => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[’‘`]/g, "'").replace(/[^a-z0-9'\s.!?]/g, " ")
  .replace(/\s+/g, " ").trim();

const list = (v) => Array.isArray(v) ? v : [];

function contextText(latestUserMessage="", recentUserMessages=[], recentCharacterReplies=[]) {
  return norm([
    ...list(recentUserMessages).slice(-5),
    ...list(recentCharacterReplies).slice(-5),
    latestUserMessage
  ].join(" "));
}

function confrontation(latest="") {
  const t=norm(latest);
  return /\b(?:what do you want|why are you here|why did you do that|why do you care|what was that|what is your problem|were you jealous|are you jealous|jealous|really|seriously|the hell do you want)\b/.test(t);
}

function romanticInterferenceContext(ctx="") {
  const t=norm(ctx);
  const thirdParty=/\b(?:guy|girl|date|talking to|flirting|making friends|conversation|left|walked away|excused himself|excused herself|someone else)\b/.test(t);
  const interference=/\b(?:appeared at your side|came over|walked over|at your side|interrupted|scared him off|scared her off|making friends already|that was quick|looking at|glancing toward|glanced toward|empty space beside you|left pretty easily)\b/.test(t);
  return thirdParty && interference;
}

function motiveVacuum(reply="") {
  const t=norm(reply);
  return /\b(?:i'?m not sure yet|i am not sure yet|let me be honest about that|just checking in|checking in on|social calendar|scheduling conflict|wanted to see if you were actually listening|just seeing if you were listening)\b/.test(t);
}

function unrelatedExcuse(reply="") {
  const t=norm(reply);
  return /\b(?:social calendar|scheduling conflict|actually listening to (?:him|her)|checking in on the)\b/.test(t);
}

function preservesChargedMotive(reply="") {
  const t=norm(reply);
  return /\b(?:didn'?t realize i was interrupting|did not realize i was interrupting|he left pretty easily|she left pretty easily|you can do better|wanted your attention|wanted to talk to you|wanted you|i came over|i walked over|i'm still here|i am still here|not leaving|didn'?t like|did not like|bothered me|jealous|maybe i care|why do you think|couldn'?t help|could not help|caught my attention)\b/.test(t)
    || (/\bi didn'?t do anything\b/.test(t) && /\b(?:still|here|left|him|her|you)\b/.test(t));
}

export function buildMotivationPersistenceV35255({
  latestUserMessage="", recentUserMessages=[], recentCharacterReplies=[], character={}
}={}) {
  const ctx=contextText(latestUserMessage,recentUserMessages,recentCharacterReplies);
  const active=confrontation(latestUserMessage) && romanticInterferenceContext(ctx);
  return `MOTIVATION PERSISTENCE LOCK 3.52.55 · ACTIONS KEEP THEIR CAUSES
ACTIVE CHARGED CONFRONTATION=${active ? "YES" : "not detected"}.
- A character's immediately demonstrated motive survives into the next turn.
- If CHARACTER noticed USER with another person, approached, interrupted, lingered, competed, teased, displaced attention, or behaved possessively/jealously, a direct "What do you want?", "Why are you here?", "Really?", or jealousy confrontation MUST answer from that same charged motive.
- CHARACTER may deny jealousy out loud. The denial must not erase the behavioral truth. Body language, staying, territorial attention, irritation, attraction, competitiveness, or a pointed answer can preserve it.
- NEVER replace a charged motive with an unrelated neutral excuse merely to avoid vulnerability.
- Forbidden repairs include: "I'm not sure yet. Let me be honest about that", administrative/check-in language, "social calendar", "scheduling conflict", or claiming the purpose was to test whether USER was listening to the other person.
- Do not turn flirting into customer service, therapy, HR language, or a clever essay.
- Prefer short human speech. Let subtext do work.
- Do not force a confession. "Nothing" can work only if the character's behavior visibly contradicts it and they remain engaged.
- Preserve personality: confident characters do not become suddenly indecisive because USER confronts them.
- The response must leave the live tension playable instead of explaining it away.
LATEST USER: ${String(latestUserMessage||"").slice(0,700)}
RECENT CHARGED CONTEXT: ${ctx.slice(-2200)}
CHARACTER: ${String(character?.name||"character").slice(0,100)}`;
}

export function motivationPersistenceV35255Issues({
  reply="", latestUserMessage="", recentUserMessages=[], recentCharacterReplies=[]
}={}) {
  const ctx=contextText(latestUserMessage,recentUserMessages,recentCharacterReplies);
  if (!(confrontation(latestUserMessage) && romanticInterferenceContext(ctx))) return [];
  const issues=[];
  if (motiveVacuum(reply)) issues.push("charged_motive_neutralized");
  if (unrelatedExcuse(reply)) issues.push("charged_motive_unrelated_excuse");
  // A very short denial is acceptable only when it contains some live charged signal.
  const t=norm(reply);
  if (/^(?:nothing|i didn'?t do anything|i did not do anything)[.!]?$/.test(t) && !preservesChargedMotive(reply)) {
    issues.push("charged_motive_denial_without_subtext");
  }
  return [...new Set(issues)];
}
