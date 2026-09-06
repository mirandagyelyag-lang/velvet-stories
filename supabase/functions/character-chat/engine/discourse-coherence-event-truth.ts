export type DiscourseCoherenceEventTruth = {
  clarificationDue: boolean;
  clarificationKind: "none" | "what" | "who" | "when" | "which" | "started_what" | "meaning";
  clarificationTarget: string;
  latestTopic: string;
  recentCharacterLines: string[];
  conflictEvidence: string[];
  explicitEventEvidence: string[];
  unresolvedReferenceRisk: boolean;
  socialBeatHold: boolean;
  eventTruthPolicy: string;
  referencePolicy: string;
  clarificationPolicy: string;
  repetitionPolicy: string;
  socialCadencePolicy: string;
  instruction: string;
};

type Args = {
  latestUserMessage?: string;
  recentMessages?: Array<Record<string, any>>;
  embodiedAwareness?: Record<string, any>;
  socialGravity?: Record<string, any>;
};

type IssueArgs = {
  reply?: string;
  engine?: Partial<DiscourseCoherenceEventTruth>;
  latestUserMessage?: string;
  recentCharacterReplies?: string[];
};

const norm = (value: unknown) => String(value ?? "").toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9áéíóúüñ'¿?]+/gi, " ").replace(/\s+/g, " ").trim();
const clean = (value: unknown, max = 340) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function outsideAsterisks(text = "") {
  return String(text || "").replace(/\*[^*]*\*/g, " ").replace(/\s+/g, " ").trim();
}
function words(text = "") {
  return norm(text).split(/\s+/).filter((token) => token.length > 2 && !new Set(["the","and","that","this","with","from","have","just","your","youre","you're","about","over","what","who","when","where","into","then","they","them","their","there","were","been","was","are","for","but","not","all","our","out","one","two","its","it's"]).has(token));
}
function overlap(left = "", right = "") {
  const a = new Set(words(left));
  const b = new Set(words(right));
  if (!a.size || !b.size) return 0;
  let same = 0;
  for (const token of a) if (b.has(token)) same += 1;
  return same / Math.max(1, Math.min(a.size, b.size));
}
function dialogueSentences(text = "") {
  const raw = String(text || "");
  const quoted = [...raw.matchAll(/["“]([^"”]{2,})["”]/g)].map((match) => clean(match[1], 400));
  const plain = raw.split(/(?<=[.!?])\s+/).map((piece) => clean(piece.replace(/^["“]|["”]$/g, ""), 400)).filter(Boolean);
  return [...quoted, ...plain].filter(Boolean);
}
function isClarification(text = "") {
  const t = norm(outsideAsterisks(text));
  if (!t) return { due: false, kind: "none" as const };
  if (/^(?:started what|what did (?:i|you|we|they|he|she) start|what was started)\??$/.test(t)) return { due: true, kind: "started_what" as const };
  if (/^(?:what do you mean|what did you mean|what are you talking about|meaning what|what does that mean)\??$/.test(t)) return { due: true, kind: "meaning" as const };
  if (/^(?:what|what exactly|what thing|what argument|what fight)\??$/.test(t)) return { due: true, kind: "what" as const };
  if (/^(?:who|who exactly|who is that|who's that|who was that)\??$/.test(t)) return { due: true, kind: "who" as const };
  if (/^(?:when|when exactly|when was that)\??$/.test(t)) return { due: true, kind: "when" as const };
  if (/^(?:which|which one|which part|what part)\??$/.test(t)) return { due: true, kind: "which" as const };
  return { due: false, kind: "none" as const };
}
function conflictEvidenceFrom(rows: Array<{sender:string;text:string}>) {
  const explicit = /\b(?:argument|argue|argued|arguing|fight|fighting|fought|quarrel|debate|we're fighting|we are fighting|stop being sarcastic|tired of (?:this|it)|mad at you|angry (?:at|with) you|annoyed (?:at|with) you)\b/i;
  const explicitNegation = /\b(?:not fighting|aren't fighting|are not fighting|wasn't fighting|were not fighting|not an argument|wasn't an argument|no argument|not a fight|wasn't a fight|no fight)\b/i;
  return rows.filter((row) => explicit.test(row.text) && !explicitNegation.test(row.text)).map((row) => clean(row.text, 320)).slice(-8);
}
function explicitEventsFrom(rows: Array<{sender:string;text:string}>) {
  const event = /\b(?:argument|fight|fought|kiss(?:ed)?|date(?:d)?|promis(?:e|ed)|invited?|called?|texted?|race(?:d)?|practice|meeting|party|breakup|broke up|apolog(?:y|ized)|left|walked away|ordered?|shared|bet|challenge|joke|teased?)\b/i;
  return rows.filter((row) => event.test(row.text)).map((row) => clean(row.text, 320)).slice(-10);
}
function previousCharacterLine(rows: Array<{sender:string;text:string}>) {
  return [...rows].reverse().find((row) => /character|assistant|ai/i.test(row.sender))?.text || "";
}
function latestTopicFrom(text = "") {
  const tokens = words(outsideAsterisks(text));
  return tokens.slice(0, 6).join(" ");
}

export function deriveDiscourseCoherenceEventTruth(args: Args = {}): DiscourseCoherenceEventTruth {
  const rows = (args.recentMessages || []).slice(-18).map((message) => ({
    sender: String(message?.sender || message?.role || ""),
    text: String(message?.content || message?.text || message?.message || ""),
  })).filter((row) => row.text.trim());
  const clarification = isClarification(args.latestUserMessage || "");
  const previousLine = previousCharacterLine(rows);
  const recentCharacterLines = rows.filter((row) => /character|assistant|ai/i.test(row.sender)).slice(-4).map((row) => clean(row.text, 520));
  const conflictEvidence = conflictEvidenceFrom(rows);
  const explicitEventEvidence = explicitEventsFrom(rows);
  const previousNorm = norm(previousLine);
  const unresolvedReferenceRisk = /\b(?:started it|started this|brought it up|this again|that again|the whole thing|like last time|you know what i mean)\b/.test(previousNorm);
  const embodiedPriority = Boolean(args.embodiedAwareness?.recognitionDue || Number(args.embodiedAwareness?.salienceDebt || 0) >= 2);
  const socialBeatHold = clarification.due || embodiedPriority;
  return {
    clarificationDue: clarification.due,
    clarificationKind: clarification.kind,
    clarificationTarget: clean(previousLine, 520),
    latestTopic: latestTopicFrom(args.latestUserMessage || ""),
    recentCharacterLines,
    conflictEvidence,
    explicitEventEvidence,
    unresolvedReferenceRisk,
    socialBeatHold,
    eventTruthPolicy: "Definite past-event labels are claims, not vibes. 'the argument', 'the fight', 'what you started', 'again', 'last time', promises, invitations and prior incidents require visible/canonical evidence for that specific event. Banter, a question, or one mildly annoyed line does not become an argument retroactively.",
    referencePolicy: "Resolve pronouns and shorthand before using them. 'it', 'that', 'this', 'the whole thing' and especially 'you started it' must point to an identifiable prior subject/event. Never invent an antecedent after the user asks what it meant.",
    clarificationPolicy: clarification.due ? "The latest user turn is a clarification request. Answer the requested WHAT/WHO/WHEN/WHICH immediately and plainly before any callback, banter, social-gravity beat, atmosphere, or repeated line. If the prior wording had no valid referent, admit the wording was wrong instead of manufacturing one." : "If the user asks for clarification later, preserve the exact real antecedent rather than improvising a new explanation.",
    repetitionPolicy: "Do not repeat a distinctive sentence or question from the last few character turns. A recent line may be referred to, but not reissued verbatim as if it were new dialogue.",
    socialCadencePolicy: socialBeatHold ? "Hold optional social-gravity manifestations for this beat. Clarification or current embodied salience outranks a random wave, admirer, passerby, greeting, recognition beat, or NPC cameo unless an already-active social thread directly matters." : "Social gravity may surface organically when causally relevant; it is not a periodic quota.",
    instruction: "Maintain local conversational truth. Every definite event claim needs evidence, every pronoun needs a real antecedent, clarification answers first, recent dialogue cannot echo itself, and social gravity never interrupts a higher-priority clarification or embodied-state beat just because it is due.",
  };
}

function extractConflictTopic(reply = "") {
  const raw = String(reply || "");
  const match = raw.match(/\b(?:argument|fight|debate|quarrel)\s+(?:about|over)\s+([^.!?"”]{1,90})/i);
  return match ? clean(match[1], 90) : "";
}
function hasDefiniteUnsupportedConflict(reply = "", engine: Partial<DiscourseCoherenceEventTruth> = {}) {
  const raw = String(reply || "");
  if (!/\b(?:the|that|our|whole|this)\s+(?:whole\s+)?(?:argument|fight|debate|quarrel)\b/i.test(raw) && !/\b(?:we (?:were|are) fighting|we had (?:an? )?(?:argument|fight))\b/i.test(raw)) return false;
  const evidence = Array.isArray(engine.conflictEvidence) ? engine.conflictEvidence : [];
  if (!evidence.length) return true;
  const topic = extractConflictTopic(raw);
  if (!topic) return false;
  return !evidence.some((item) => overlap(topic, item) >= 0.45 || norm(item).includes(norm(topic)));
}
function unresolvedStartedIt(reply = "", engine: Partial<DiscourseCoherenceEventTruth> = {}, latestUserMessage = "") {
  const raw = norm(reply);
  if (!/\b(?:you(?:'re| are)? the one who started it|you started it|you started this|you brought it up|this again|that again|the whole thing)\b/.test(raw)) return false;
  const latest = norm(outsideAsterisks(latestUserMessage));
  if (/\b(?:argument|fight|debate|joke|bet|challenge|conversation|topic|plan|game|race|order|started)\b/.test(latest)) return false;
  const evidence = [...(engine.explicitEventEvidence || []), ...(engine.conflictEvidence || [])].join(" ");
  return !/\b(?:argument|fight|debate|joke|bet|challenge|conversation|topic|plan|game|race|order|started)\b/i.test(evidence);
}
function clarificationStillVague(reply = "", engine: Partial<DiscourseCoherenceEventTruth> = {}) {
  if (!engine.clarificationDue) return false;
  const t = norm(reply);
  if (/\b(?:you know what i mean|you know|that|it|this|the thing|same thing|whatever i said)\b/.test(t) && !/\b(?:i meant|i was talking about|i meant when|i meant the|nothing specific|worded that|came out wrong)\b/.test(t)) return true;
  return false;
}
function sentenceEcho(reply = "", recentCharacterReplies: string[] = []) {
  const recent = recentCharacterReplies.slice(-4).flatMap(dialogueSentences).map((line) => norm(line)).filter((line) => line.length >= 10);
  if (!recent.length) return false;
  for (const current of dialogueSentences(reply)) {
    const c = norm(current);
    const count = c.split(/\s+/).filter(Boolean).length;
    if (c.length < 10 || count < 3) continue;
    if (recent.includes(c)) return true;
    if (recent.some((line) => overlap(c, line) >= 0.92 && Math.abs(c.length - line.length) <= Math.max(8, Math.round(line.length * 0.18)))) return true;
  }
  return false;
}
function clarificationEchoBeforeAnswer(reply = "", engine: Partial<DiscourseCoherenceEventTruth> = {}, recentCharacterReplies: string[] = []) {
  if (!engine.clarificationDue) return false;
  const prior = recentCharacterReplies.slice(-2).flatMap(dialogueSentences).map(norm).filter(Boolean);
  const first = dialogueSentences(reply)[0] || "";
  const firstNorm = norm(first);
  return Boolean(firstNorm && prior.some((line) => line === firstNorm || overlap(line, firstNorm) >= 0.92));
}
function optionalSocialIntrusion(reply = "", engine: Partial<DiscourseCoherenceEventTruth> = {}) {
  if (!engine.socialBeatHold) return false;
  const t = norm(reply);
  return /\b(?:someone from (?:a|the) nearby|someone at (?:a|the) nearby|someone (?:waves?|calls? out|recognizes?|approaches?)|a (?:student|girl|guy|person|stranger) (?:waves?|calls? out|recognizes?|approaches?)|nearby table .*waves?|waves? in passing|calls? his name|calls? her name)\b/.test(t);
}

export function discourseCoherenceIssues(args: IssueArgs = {}): string[] {
  const reply = String(args.reply || "");
  const engine = args.engine || {};
  const recent = Array.isArray(args.recentCharacterReplies) ? args.recentCharacterReplies : [];
  const issues: string[] = [];
  if (sentenceEcho(reply, recent)) issues.push("recent_line_echo");
  if (clarificationEchoBeforeAnswer(reply, engine, recent)) issues.push("clarification_echo_before_answer");
  if (hasDefiniteUnsupportedConflict(reply, engine)) issues.push("phantom_event_claim");
  if (unresolvedStartedIt(reply, engine, args.latestUserMessage || "")) issues.push("unresolved_reference_claim");
  if (clarificationStillVague(reply, engine)) issues.push("clarification_reference_unresolved");
  if (optionalSocialIntrusion(reply, engine)) issues.push("social_gravity_priority_intrusion");
  return [...new Set(issues)];
}

function removeRecentEchoes(reply = "", recentCharacterReplies: string[] = []) {
  const recent = recentCharacterReplies.slice(-4).flatMap(dialogueSentences).map(norm).filter((line) => line.length >= 10);
  if (!recent.length) return String(reply || "").trim();
  const raw = String(reply || "");
  return raw.split(/(?<=[.!?])\s+/).filter((piece) => {
    const p = norm(piece.replace(/^["“]|["”]$/g, ""));
    if (!p || p.split(/\s+/).length < 3) return true;
    return !recent.some((line) => line === p || overlap(line, p) >= 0.92);
  }).join(" ").replace(/\s+/g, " ").trim();
}
function stripOptionalSocialBeat(reply = "") {
  let out = String(reply || "");
  out = out.replace(/\s+as someone[^.?!]{0,180}(?:waves?|calls? out|recognizes?|approaches?)[^.?!]*[.?!]?/gi, ". ");
  out = out.replace(/\s*(?:I|He|She|They)\s+(?:give|gives|gave)\s+(?:a\s+)?quick\s+nod\s+back[^.?!]*[.?!]?/gi, " ");
  out = out.replace(/\s*(?:Someone|A student|A girl|A guy|A person|A stranger)[^.?!]{0,180}(?:waves?|calls? out|recognizes?|approaches?)[^.?!]*[.?!]?/gi, " ");
  return out.replace(/\s+/g, " ").trim();
}
function stripUnsupportedReferenceSentence(reply = "") {
  let out = String(reply || "");
  out = out.replace(/(?:["“])?[^.!?\n]{0,120}\b(?:you(?:'re| are)? the one who started it|you started it|you started this|you brought it up|the whole (?:argument|fight|debate|quarrel)|we (?:were|are) fighting)\b[^.!?\n]{0,120}[.!?](?:["”])?/gi, " ");
  out = out.replace(/\s+/g, " ").trim();
  const quoteCount = (out.match(/["“”]/g) || []).length;
  if (quoteCount % 2 === 1) {
    const straight = out.lastIndexOf('"');
    const curly = Math.max(out.lastIndexOf('“'), out.lastIndexOf('”'));
    const last = Math.max(straight, curly);
    if (last >= 0) {
      const tail = out.slice(last + 1).trim();
      if (tail.split(/\s+/).filter(Boolean).length <= 6) out = out.slice(0, last).trim();
    }
  }
  return out;
}

export function sanitizeDiscourseCoherenceReply(reply = "", issues: string[] = [], engine: Partial<DiscourseCoherenceEventTruth> = {}, recentCharacterReplies: string[] = []) {
  const active = new Set(Array.isArray(issues) ? issues : []);
  let out = String(reply || "").trim();
  if (active.has("recent_line_echo") || active.has("clarification_echo_before_answer")) out = removeRecentEchoes(out, recentCharacterReplies);
  if (active.has("social_gravity_priority_intrusion")) out = stripOptionalSocialBeat(out);
  if (active.has("phantom_event_claim") || active.has("unresolved_reference_claim") || active.has("clarification_reference_unresolved")) {
    if (engine.clarificationDue) return '"Nothing specific. I worded that badly."';
    out = stripUnsupportedReferenceSentence(out);
  }
  out = out.replace(/\s+([,.!?])/g, "$1").replace(/\s+/g, " ").trim();
  if (!out && engine.clarificationDue) return '"Nothing specific. I worded that badly."';
  return out;
}
