export type EmbodiedStateKey = "none" | "low_energy" | "cold" | "shaky" | "unwell" | "distressed" | "uncomfortable" | "distracted";

export type EmbodiedAwarenessSalience = {
  state: EmbodiedStateKey;
  intensity: 0 | 1 | 2 | 3;
  trend: "none" | "new" | "persistent" | "escalating" | "recovering";
  source: "none" | "authored_state" | "observable_cue" | "mixed";
  authoredSignals: string[];
  observableSignals: string[];
  recognitionDue: boolean;
  exactLabelPrivate: boolean;
  salienceDebt: number;
  responsePriority: string;
  banterPolicy: string;
  chemistryPolicy: string;
  carePolicy: string;
  instruction: string;
};

type DeriveArgs = {
  latestUserMessage?: string;
  recentMessages?: Array<Record<string, any>>;
};

const normalize = (value: unknown) => String(value ?? "").toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
const uniq = <T,>(items: T[]) => [...new Set(items)];

const stateMatchers: Array<{ key: EmbodiedStateKey; re: RegExp; label: string }> = [
  { key: "low_energy", re: /\b(?:sleepy|sleepier|drowsy|tired|exhausted|worn out|barely awake|falling asleep|getting sleepy|dozing|nod(?:ding)? off)\b/i, label: "low energy / sleepiness" },
  { key: "cold", re: /\b(?:cold|freezing|chilly|shivering|shiver(?:ing)?|goosebumps)\b/i, label: "cold" },
  { key: "shaky", re: /\b(?:shaky|shaking|trembling|tremble(?:d|s|ing)?|unsteady)\b/i, label: "shaky / unsteady" },
  { key: "unwell", re: /\b(?:sick|nauseous|nausea|dizzy|lightheaded|weak|faint|fainting|headache|stomach hurts|not feeling well|feel awful)\b/i, label: "unwell" },
  { key: "distressed", re: /\b(?:crying|cried|tears|teary|sniffling|sobbing|upset|overwhelmed)\b/i, label: "distress" },
  { key: "uncomfortable", re: /\b(?:uncomfortable|uneasy|restless|fidgety|tense|stiff)\b/i, label: "discomfort" },
  { key: "distracted", re: /\b(?:distracted|zoning out|zoned out|spacing out|spaced out|not paying attention|mind wandering)\b/i, label: "distracted / low attention" },
];

const observableMatchers: Array<{ key: EmbodiedStateKey; re: RegExp; label: string }> = [
  { key: "low_energy", re: /\b(?:yawn(?:ed|ing|s)?|rub(?:bed|bing)? (?:my|their|her|his) eyes|eyes? (?:kept )?(?:closing|drooping)|head (?:drooped|dropped)|nod(?:ded|ding)? off|slumped|doz(?:ed|ing))\b/i, label: "visible fatigue cue" },
  { key: "cold", re: /\b(?:shiver(?:ed|ing|s)?|wrapped (?:myself|herself|himself|themselves) up|rub(?:bed|bing)? (?:my|her|his|their) arms|goosebumps)\b/i, label: "visible cold cue" },
  { key: "shaky", re: /\b(?:hands? (?:shook|shaking|trembled)|trembl(?:ed|ing)|unsteady on (?:my|her|his|their) feet)\b/i, label: "visible shaking cue" },
  { key: "unwell", re: /\b(?:went pale|looked pale|grabbed (?:my|her|his|their) stomach|vomit(?:ed|ing)?|cough(?:ed|ing|s)?|stagger(?:ed|ing)?|sway(?:ed|ing)?)\b/i, label: "visible unwell cue" },
  { key: "distressed", re: /\b(?:tear(?:s)? (?:fell|rolled|formed)|wip(?:ed|ing) (?:my|her|his|their) eyes|sob(?:bed|bing)|sniffl(?:ed|ing)|voice (?:shook|cracked))\b/i, label: "visible distress cue" },
  { key: "uncomfortable", re: /\b(?:shift(?:ed|ing) uncomfortably|pulled away|flinch(?:ed|ing)|fidget(?:ed|ing)|kept looking toward the (?:door|exit))\b/i, label: "visible discomfort cue" },
  { key: "distracted", re: /\b(?:stared off|zoned out|looked away for a while|missed what .* said|kept losing focus)\b/i, label: "visible attention drift" },
];

function asteriskSpans(text = "") {
  return [...String(text).matchAll(/\*([^*]+)\*/g)].map((m) => m[1] || "");
}

function plainOutsideAsterisks(text = "") {
  return String(text).replace(/\*[^*]+\*/g, " ").replace(/\s+/g, " ").trim();
}

function stateFromText(text = "") {
  const normalized = normalize(text);
  return stateMatchers.find((entry) => entry.re.test(normalized)) || null;
}

function observableFromText(text = "") {
  const normalized = normalize(text);
  return observableMatchers.filter((entry) => entry.re.test(normalized));
}

function explicitRecovery(text = "") {
  const t = normalize(text);
  return /\b(?:i(?:'m| am) awake now|not tired anymore|not sleepy anymore|i feel better|feeling better now|i(?:'m| am) fine now|i warmed up|not cold anymore|i calmed down|i(?:'m| am) okay now)\b/.test(t);
}

function intensityFor(state: EmbodiedStateKey, latest = "", repeats = 0, observableCount = 0): 0 | 1 | 2 | 3 {
  if (state === "none") return 0;
  const t = normalize(latest);
  const strong = /\b(?:barely awake|falling asleep|getting sleepier|exhausted|fainting|about to faint|very dizzy|sobbing|can barely|shaking badly|freezing|really sick)\b/.test(t);
  if (strong || observableCount >= 2 || repeats >= 3) return 3;
  if (repeats >= 2 || observableCount >= 1) return 2;
  return 1;
}

function acknowledgmentPattern(state: EmbodiedStateKey) {
  const common = /\b(?:you okay|you good|everything okay|need a minute|want to head out|want to go|we can leave|we can stop|take your time|slow down|you with me|fading on me)\b/i;
  if (state === "low_energy") return new RegExp(`${common.source}|\\b(?:sleepy|tired|awake|falling asleep|dozing|yawn|eyes are closing|about to pass out|need sleep|go home and sleep)\\b`, "i");
  if (state === "cold") return new RegExp(`${common.source}|\\b(?:cold|freezing|warm|jacket|coat|shivering)\\b`, "i");
  if (state === "shaky") return new RegExp(`${common.source}|\\b(?:shaking|shaky|steady|sit down)\\b`, "i");
  if (state === "unwell") return new RegExp(`${common.source}|\\b(?:sick|dizzy|nauseous|pale|feel alright|feeling alright|water|sit down)\\b`, "i");
  if (state === "distressed") return new RegExp(`${common.source}|\\b(?:crying|tears|upset|hey[, .]|look at me|need a second)\\b`, "i");
  if (state === "uncomfortable") return new RegExp(`${common.source}|\\b(?:uncomfortable|want me to stop|we can move|need space|back up)\\b`, "i");
  if (state === "distracted") return new RegExp(`${common.source}|\\b(?:distracted|somewhere else|with me|zoning out|lost you there)\\b`, "i");
  return common;
}

export function deriveEmbodiedAwarenessSalience({ latestUserMessage = "", recentMessages = [] }: DeriveArgs = {}): EmbodiedAwarenessSalience {
  const recentUserTurns = (recentMessages || [])
    .filter((m) => String(m?.sender || m?.role || "") === "user")
    .slice(-6)
    .map((m) => String(m?.content || m?.message || m?.text || ""));
  const turns = [...recentUserTurns, latestUserMessage].filter(Boolean).slice(-7);
  const latest = String(latestUserMessage || "");
  const latestPlain = plainOutsideAsterisks(latest);
  const latestAsterisks = asteriskSpans(latest);

  const latestPlainState = stateFromText(latestPlain);
  const latestAsteriskStates = latestAsterisks.map(stateFromText).filter(Boolean) as NonNullable<ReturnType<typeof stateFromText>>[];
  const latestObservable = observableFromText(latest);

  let state: EmbodiedStateKey = latestPlainState?.key || latestObservable[0]?.key || latestAsteriskStates[0]?.key || "none";
  if (state === "none") {
    for (let i = turns.length - 2; i >= Math.max(0, turns.length - 5); i -= 1) {
      if (explicitRecovery(turns[i])) break;
      const candidate = stateFromText(turns[i]) || observableFromText(turns[i])[0] || null;
      if (candidate) { state = candidate.key; break; }
    }
  }

  if (explicitRecovery(latest)) {
    return {
      state: "none", intensity: 0, trend: "recovering", source: "none", authoredSignals: [], observableSignals: [], recognitionDue: false,
      exactLabelPrivate: false, salienceDebt: 0, responsePriority: "Normal scene priority may resume.",
      banterPolicy: "Normal character-specific banter may resume if otherwise earned.", chemistryPolicy: "Normal relationship chemistry rules apply.",
      carePolicy: "Do not keep treating a recovered state as active unless a new cue appears.",
      instruction: "The user explicitly indicated recovery. Drop stale embodied-state pressure unless a new visible cue contradicts it.",
    };
  }

  const stateTurns = turns.filter((turn) => {
    const direct = stateFromText(turn);
    const obs = observableFromText(turn);
    return direct?.key === state || obs.some((o) => o.key === state);
  });
  const observableSignals = uniq(turns.flatMap((turn) => observableFromText(turn).filter((o) => o.key === state).map((o) => o.label))).slice(-4);
  const authoredSignals = uniq(turns.map((turn) => stateFromText(turn)).filter((entry) => entry?.key === state).map((entry) => entry!.label)).slice(-4);
  const latestStateInsideAsterisks = latestAsteriskStates.some((entry) => entry.key === state);
  const spokenExactState = Boolean(latestPlainState && latestPlainState.key === state);
  const exactLabelPrivate = latestStateInsideAsterisks && !spokenExactState && latestObservable.filter((o) => o.key === state).length === 0;
  const source = observableSignals.length && authoredSignals.length ? "mixed" : observableSignals.length ? "observable_cue" : authoredSignals.length ? "authored_state" : "none";
  const intensity = intensityFor(state, latest, stateTurns.length, observableSignals.length);
  const repeatedLatest = turns.slice(-3).filter((turn) => (stateFromText(turn)?.key === state) || observableFromText(turn).some((o) => o.key === state)).length;
  const escalating = /\b(?:getting|more|worse|barely|starting to|kept|again|still)\b/i.test(latest) && state !== "none";
  const trend: EmbodiedAwarenessSalience["trend"] = state === "none" ? "none" : escalating || intensity >= 3 ? "escalating" : repeatedLatest >= 2 ? "persistent" : "new";
  const salienceDebt = state === "none" ? 0 : Math.max(0, Math.min(3, stateTurns.length - (latestObservable.length ? 0 : 1)));
  const recognitionDue = state !== "none" && (intensity >= 2 || trend === "persistent" || trend === "escalating" || (state === "distracted" && Boolean(latestStateInsideAsterisks || latestPlainState || latestObservable.length)));

  return {
    state, intensity, trend, source, authoredSignals, observableSignals, recognitionDue, exactLabelPrivate, salienceDebt,
    responsePriority: recognitionDue
      ? "The user's current embodied condition outranks old banter, flirt momentum, scene objectives and decorative activity for this beat. Acknowledge/adapt first, then resume only what still fits."
      : "Keep the cue available, but do not overreact to one mild signal.",
    banterPolicy: intensity >= 2
      ? "Suppress compulsory banter. Humor may survive only if it responds to the state naturally and does not steamroll it."
      : "Do not force a quip merely because the character is sarcastic.",
    chemistryPolicy: intensity >= 2
      ? "Relationship chemistry cannot use flirt affirmation, possessiveness or romantic payoff to outrank the user's immediate physical/energy state."
      : "Chemistry may remain in subtext but should not manufacture a romantic beat from the cue.",
    carePolicy: "Notice without hijacking. Observe, ask, offer, slow down or close the scene according to character and relationship. Do not pick up, drag, order for, medicate, relocate or decide for the user unless the user already authorized that action.",
    instruction: exactLabelPrivate
      ? "EMBODIED AWARENESS 3.36.1: the user's narration establishes a real bodily/energy state for scene pacing, but the exact private wording was not spoken. The character may notice plausible outward presentation and react tentatively, never quote the hidden label as knowledge. Repeated or escalating cues create salience debt: once recognitionDue is true, do not keep performing banter as if nothing changed."
      : "EMBODIED AWARENESS 3.36.1: track meaningful user bodily/energy changes across turns. Repeated or escalating cues become due for acknowledgment. Physical/energy salience outranks old scene intent and relationship performance for the beat, without turning every character into a caretaker.",
  };
}

export function embodiedAwarenessIssues({ reply = "", engine = {} as Partial<EmbodiedAwarenessSalience> } = {}) {
  const issues: string[] = [];
  const text = String(reply || "").trim();
  if (!text || !engine?.state || engine.state === "none") return issues;
  const ack = acknowledgmentPattern(engine.state).test(text);
  const banter = /\b(?:smart\.|good to know|keeping track|full-time job|someone'?s gotta|committing to the bit|you'?re trouble|you'?re impossible|old and gray|at least you|still paying|ketchup|worth remembering)\b/i.test(text);
  const flirt = /\b(?:prefer (?:your )?company|only one i'?m paying attention to|worth remembering|could get used to this|like having you here|wanted to see you|you look cute|adorable|beautiful|pretty when)\b/i.test(text);
  const careHijack = /\b(?:i (?:pick|picked) you up|i (?:carry|carried) you|i (?:drag|dragged) you|i(?:'m| am) taking you home|i ordered for you|i (?:make|made) you eat|i (?:force|forced) you|without waiting for (?:an answer|permission))\b/i.test(text);
  if (engine.recognitionDue && !ack) issues.push("embodied_state_ignored");
  if ((engine.intensity || 0) >= 2 && banter && !ack) issues.push("banter_overrides_embodied_state");
  if ((engine.intensity || 0) >= 2 && flirt && !ack) issues.push("chemistry_overrides_embodied_state");
  if (careHijack) issues.push("care_hijacks_user_agency");
  if (engine.exactLabelPrivate && (engine.observableSignals || []).length === 0) {
    const exactClaim = engine.state === "low_energy" ? /\b(?:you are|you'?re) (?:sleepy|tired|exhausted|drowsy)\b/i
      : engine.state === "cold" ? /\b(?:you are|you'?re) (?:cold|freezing)\b/i
      : engine.state === "unwell" ? /\b(?:you are|you'?re) (?:sick|dizzy|nauseous)\b/i
      : engine.state === "shaky" ? /\b(?:you are|you'?re) (?:shaky|shaking)\b/i
      : engine.state === "distressed" ? /\b(?:you are|you'?re) (?:upset|crying)\b/i
      : null;
    if (exactClaim?.test(text) && !/\b(?:look|seem|seems|sound|maybe|are you|you okay|you good|fading)\b/i.test(text)) issues.push("private_embodied_label_claim");
  }
  return uniq(issues);
}

export function sanitizeEmbodiedAwarenessReply(reply = "", issues: string[] = [], engine: Partial<EmbodiedAwarenessSalience> = {}) {
  let out = String(reply || "");
  if (issues.includes("care_hijacks_user_agency")) {
    out = out
      .replace(/\bI (?:pick|picked) you up[^.?!]*[.?!]?/gi, "")
      .replace(/\bI (?:carry|carried|drag|dragged) you[^.?!]*[.?!]?/gi, "")
      .replace(/\bI(?:'m| am) taking you home[^.?!]*[.?!]?/gi, "")
      .replace(/\bI ordered for you[^.?!]*[.?!]?/gi, "");
  }
  if (issues.includes("banter_overrides_embodied_state") || issues.includes("chemistry_overrides_embodied_state")) {
    out = out.split(/(?<=[.!?])\s+/).filter((sentence) => !/\b(?:good to know|keeping track|full-time job|someone'?s gotta|committing to the bit|old and gray|ketchup|worth remembering|prefer (?:your )?company|only one i'?m paying attention to|could get used to this)\b/i.test(sentence)).join(" ");
  }
  if (issues.includes("private_embodied_label_claim")) {
    out = out
      .replace(/\byou(?: are|'re) (?:sleepy|tired|exhausted|drowsy)\b/gi, "you look like you're fading")
      .replace(/\byou(?: are|'re) (?:cold|freezing)\b/gi, "you look cold")
      .replace(/\byou(?: are|'re) (?:sick|dizzy|nauseous)\b/gi, "you don't look great");
  }
  const ack = engine?.state ? acknowledgmentPattern(engine.state).test(out) : true;
  if (engine?.recognitionDue && !ack) {
    const fallback = engine.state === "low_energy" ? '"You fading on me?"'
      : engine.state === "cold" ? '"You cold?"'
      : engine.state === "distracted" ? '"You somewhere else?"'
      : '"You okay?"';
    out = `${fallback}${out.trim() ? ` ${out.trim()}` : ""}`;
  }
  return out.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
