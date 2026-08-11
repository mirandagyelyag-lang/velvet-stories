import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const edge = read("supabase/functions/character-chat/index.ts");
const chat = read("src/pages/Chat.jsx");
const chatsContext = read("src/context/ChatsContext.jsx");
const main = read("src/main.jsx");
const mobileStyles = read("src/styles/mobile-v71.css");
const privateCancellationMigration = read("supabase/migrations/202608100002_generation_requests_private.sql");

const checks = [];
function check(label, condition) {
  checks.push({ label, condition: Boolean(condition) });
}

check("single project tree", !existsSync(resolve(root, "velvet-stories")));
check("single narrative Edge Function", !existsSync(resolve(root, "supabase/functions/swift-task")));
check(
  "no loose story-engine patches",
  [
    "character-chat-v5-emotional-follow.ts",
    "character-chat-v6-grounded-dialogue.ts",
    "character-chat-v7-name-validation.ts",
    "ChatsContext-v8-hide-on-regenerate.jsx",
  ].every((path) => !existsSync(resolve(root, path))),
);
check("compact silent sentinel in UI", chat.includes('const SILENT_CONTINUE_MESSAGE = "[SILENT_CONTINUE]"'));
check("one or more dots become silence", chat.includes('/^[.…。]+$/u.test(cleanMessage)'));
check("legacy silent messages stay hidden", chat.includes('content.includes("Treat this as silence from the user")'));
check("backend recognizes compact silence", edge.includes("function isSilentContinueText(value)"));
check("silent history is compacted", edge.includes('return "[SILENT_CONTINUE]"'));
check(
  "expanded raw history is non-overlapping",
  edge.includes("const immediateWindowSize = 12") &&
    edge.includes("const rawHistoryWindowSize = 52") &&
    edge.includes("messages.slice(-rawHistoryWindowSize, -immediateWindowSize)") &&
    edge.includes("messages.slice(-immediateWindowSize)"),
);
check("backend loads eighty recent messages", edge.includes(".limit(80)"));
check("two silent turns return to main character", edge.includes("normalizedSilentContinueStreak >= 2"));
check("post-exit reaction follows main character", edge.includes("follow_main_character_after_exit"));
check("unsupported logistics are rejected", edge.includes("inventsUnsupportedLogistics(candidate, groundingFacts)"));
check("invented third-party intimacy is rejected", edge.includes("inventsUnsupportedThirdPartyIntimacy(candidate, groundingFacts)"));
check(
  "clean regeneration prompt omits rejected prose",
  edge.includes("earlier take(s) were rejected and are intentionally omitted") &&
    edge.includes("The rejected prose is intentionally omitted so it cannot prime an echo") &&
    !edge.includes("REJECTED RESPONSE VARIANTS — NEGATIVE EXAMPLES") &&
    !edge.includes("PRIOR VARIANTS — DO NOT PARAPHRASE"),
);
check(
  "one repeated signature line rejects a regeneration",
  edge.includes("function hasRepeatedSignatureDialogue") &&
    edge.includes("hasRepeatedSignatureDialogue(candidate, rejected) ||"),
);
check(
  "regeneration compares five recent character beats",
  edge.includes("const recentCharacterBeats = messages") &&
    edge.includes(".slice(-5)") &&
    edge.includes("...recentCharacterBeats"),
);
check(
  "semantic dialogue loops are detected",
  edge.includes("function extractDialogueIntentTags") &&
    edge.includes("function sharedStagnantDialogueFrame") &&
    edge.includes("sharedStagnantDialogueFrame(candidate, rejected) ||"),
);
check(
  "failed conflict tactics receive a progression repair",
  edge.includes("function needsConversationProgressionRepair") &&
    edge.includes("repairConversationProgression({") &&
    edge.includes("RECENT EXCHANGE — immutable evidence"),
);
check(
  "visible dialogue cannot be denied or reframed",
  edge.includes("Treat the visible transcript as immutable evidence") &&
    edge.includes("Answer the user's literal grievance or direct question before reframing") &&
    edge.includes("cannot deny saying a clear equivalent already visible"),
);
check(
  "guarded characters do not default to contempt",
  edge.includes("Guarded, cold, proud or teasing is not the same as contempt") &&
    edge.includes("Cold/proud/teasing must not become generic contempt"),
);
check(
  "progression repair rejects invented off-screen argument facts",
  edge.includes("Do not invent family calls, message counts, schedules, dated incidents, errands, parties or classes"),
);

let naturalTurnApi = null;
try {
  const naturalTurnStart = edge.indexOf("function looksLikeDirectQuestion");
  const naturalTurnEnd = edge.indexOf("function resolveNaturalTurn", naturalTurnStart);
  if (naturalTurnStart >= 0 && naturalTurnEnd > naturalTurnStart) {
    naturalTurnApi = new Function(
      `${edge.slice(naturalTurnStart, naturalTurnEnd)}\nreturn { looksLikeDirectQuestion };`,
    )();
  }
} catch {
  naturalTurnApi = null;
}

check(
  "questions without punctuation are still answered",
  naturalTurnApi?.looksLikeDirectQuestion("Nothing really just studying, what about you i haven't see you in a while"),
);
check(
  "ordinary statements do not become questions",
  naturalTurnApi && !naturalTurnApi.looksLikeDirectQuestion("Nothing really, I've just been studying lately"),
);

let groundedReplyApi = null;
try {
  const groundedStart = edge.indexOf("function findUnsupportedEverydayClaimSignals");
  const groundedEnd = edge.indexOf("function likelyNeedsNaturalVoiceRepair", groundedStart);
  if (groundedStart >= 0 && groundedEnd > groundedStart) {
    groundedReplyApi = new Function(
      `${edge.slice(groundedStart, groundedEnd)}\nreturn { findUnsupportedEverydayClaimSignals, likelyNeedsGroundedReplyRepair };`,
    )();
  }
} catch {
  groundedReplyApi = null;
}

check(
  "invented everyday habits and debts trigger editorial repair",
  groundedReplyApi?.likelyNeedsGroundedReplyRepair({
    candidate: `"Your apartment is a biohazard of discarded coffee cups. You owe me dinner."`,
    recentCharacterBeats: [],
  }),
);
check(
  "invented precise relationship durations trigger editorial repair",
  groundedReplyApi?.likelyNeedsGroundedReplyRepair({
    candidate: `"Because you're my best friend of ten years."`,
    recentCharacterBeats: [],
  }),
);
check(
  "a direct present intention remains canon-safe",
  groundedReplyApi && !groundedReplyApi.likelyNeedsGroundedReplyRepair({
    candidate: `Rowan glanced at you. "Because I haven't seen you in a while, and I want to have dinner with you."`,
    recentCharacterBeats: [],
  }),
);
const rowanInventedUpdate = `"It's been four days, Toni. Coach has been on a tear about practice times, and my mum's already texting me about weekend plans. Besides, every time I stopped by your place, your door was locked. You look like you haven't seen sun in a week."`;
const rowanAuthoritativeFacts = `Rowan and Toni have been friends since secondary school. Toni said: I haven't see you in a while.`;
const rowanInventedSignals = groundedReplyApi?.findUnsupportedEverydayClaimSignals({
  candidate: rowanInventedUpdate,
  groundingFacts: rowanAuthoritativeFacts,
}) || [];
check(
  "Rowan four-days/coach/mum/visit hallucination is rejected",
  [
    "unsupported_exact_duration",
    "unsupported_mother",
    "unsupported_coach",
    "unsupported_practice",
    "unsupported_weekend_plan",
    "unsupported_visit",
    "unsupported_locked_door",
    "unsupported_recurring_habit",
    "unsupported_user_condition",
  ].every((signal) => rowanInventedSignals.includes(signal)),
);
check(
  "supported profile facts remain available to the editor",
  groundedReplyApi && !groundedReplyApi.findUnsupportedEverydayClaimSignals({
    candidate: `Rowan's coach called about practice.`,
    groundingFacts: `Rowan plays polo and his coach schedules practice.`,
  }).length,
);
check(
  "grounded editor distinguishes visible continuity from factual authority",
  edge.includes("Earlier CHARACTER banter is not proof of a new off-screen fact") &&
    edge.includes("an invitation may be \"I want to get dinner with you,\"") &&
    edge.includes("Teasing is optional, not the character's default response to every line"),
);
check(
  "editorial rewrites are revalidated before display",
  edge.includes("for (let attempt = 1; attempt <= 2; attempt += 1)") &&
    edge.includes("Editorial repair candidate rejected") &&
    edge.includes("Editorial repair exhausted factual retries; using canon-neutral fallback") &&
    edge.includes("findUnsupportedEverydayClaimSignals({") &&
    edge.includes("buildCanonNeutralEditorialFallback({"),
);
check(
  "downstream rewrites receive final factual validation",
  edge.includes("// FINAL factual validation.") &&
    edge.indexOf("// FINAL factual validation.") < edge.indexOf("// FINAL regeneration validation."),
);
check(
  "editorial repair fails over to the secondary model",
  edge.includes("const editorialEndpoints = [") &&
    edge.includes("{ url: GEMINI_FALLBACK_ENDPOINT, role: \"fallback\" }") &&
    edge.includes("modelRole: endpoint.role"),
);

let editorialFallbackApi = null;
try {
  const fallbackStart = edge.indexOf("function normalizeEditorialFallback");
  const fallbackEnd = edge.indexOf("async function repairNaturalVoice", fallbackStart);
  if (fallbackStart >= 0 && fallbackEnd > fallbackStart) {
    editorialFallbackApi = new Function(
      `function looksLikeDirectQuestion() { return false; }\n${edge.slice(fallbackStart, fallbackEnd)}\nreturn { buildCanonNeutralEditorialFallback };`,
    )();
  }
} catch {
  editorialFallbackApi = null;
}

const rowanFallbackInput = "Nothing really, just studying, what about you i haven't seen you in a while";
const rowanSafeFallback = editorialFallbackApi?.buildCanonNeutralEditorialFallback({
  characterName: "Rowan Hayes",
  latestUserMessage: rowanFallbackInput,
  language: "English",
  seedText: rowanInventedUpdate,
}) || "";
const rowanRegeneratedFallback = editorialFallbackApi?.buildCanonNeutralEditorialFallback({
  characterName: "Rowan Hayes",
  latestUserMessage: rowanFallbackInput,
  language: "English",
  seedText: rowanInventedUpdate,
  rejectedResponses: [rowanSafeFallback],
}) || "";
check(
  "Rowan emergency reply stays conversational",
  rowanSafeFallback.includes("Rowan") &&
    !rowanSafeFallback.includes("Rowan Hayes") &&
    !/\n\n"Okay," Rowan said\.?$/i.test(rowanSafeFallback) &&
    rowanSafeFallback.split('"').length >= 3,
);
check(
  "Rowan regeneration receives a different safe fallback",
  Boolean(rowanSafeFallback) &&
    Boolean(rowanRegeneratedFallback) &&
    rowanSafeFallback !== rowanRegeneratedFallback &&
    !/^Rowan (?:Hayes )?looked at you\.\s+"Okay,"/i.test(rowanRegeneratedFallback),
);

let dialogueGuardApi = null;
try {
  const guardStart = edge.indexOf("function normalizeForRegenerationComparison");
  const guardEnd = edge.indexOf("function buildDialogueProgressionSummary", guardStart);
  if (guardStart >= 0 && guardEnd > guardStart) {
    const guardSource = edge.slice(guardStart, guardEnd);
    dialogueGuardApi = new Function(
      `${guardSource}\nreturn { needsConversationProgressionRepair, extractDialogueIntentTags, likelyReopensEarlierUserTurn };`,
    )();
  }
} catch {
  dialogueGuardApi = null;
}

const rowanRecentBeats = [
  `"I said you spam my phone with useless garbage and then act like I committed a federal crime."`,
  `"I didn't say your texts are shit. Whatever. You're impossible when you twist everything."`,
  `"Don't do that. You walk off like a brat."`,
];
const rowanLatestUser = "What the fuck is wrong with you? Am I a brat? Seriously?";
const rowanRejectedTake = `"I didn't say that. You make a federal case out of nothing. You want an apology? For what?"`;
const rowanProgressedTake = `Rowan goes quiet. "No. You're not a brat. That was a cheap shot." He lowers the umbrella instead of stepping closer. "I saw your messages. I chose not to answer, and then I made you sound unreasonable for caring. I don't have a good excuse for that."`;
check(
  "Rowan denial/federal-case loop is rejected",
  dialogueGuardApi?.needsConversationProgressionRepair({
    candidate: rowanRejectedTake,
    recentCharacterBeats: rowanRecentBeats,
    latestUserMessage: rowanLatestUser,
  }),
);
check(
  "Rowan honest progression is accepted",
  dialogueGuardApi && !dialogueGuardApi.needsConversationProgressionRepair({
    candidate: rowanProgressedTake,
    recentCharacterBeats: rowanRecentBeats,
    latestUserMessage: rowanLatestUser,
  }),
);
check(
  "stale reply to Rowan's older question is rejected",
  dialogueGuardApi?.likelyReopensEarlierUserTurn({
    candidate: `"What do I want?" Rowan says. "I want you to stop treating every word like an attack."`,
    latestUserMessage: "I'm getting fucking drained!",
    earlierUserMessages: [
      { content: "Then what you want? *i ask*" },
      { content: "Where did I say that?" },
      { content: "I'll leave anyway" },
    ],
  }),
);
check(
  "direct texts cannot be buried under NPC banter",
  edge.includes("repairMissingDigitalReply({") &&
    edge.includes("!hasWrittenDigitalReply(generatedReply)"),
);
check(
  "physical text cutaways preserve narration and spoken dialogue",
  edge.includes("const messageCutaway = Boolean(") &&
    edge.includes("!turnResolution.messageCutaway"),
);
check(
  "regeneration marks derived metadata as tentative",
  edge.includes("REGENERATION BRANCH-POINT NOTICE") &&
    edge.includes("details learned from that rejected take"),
);
check("safe repair fallback avoids brittle false errors", edge.includes("if (safeFallback) return safeFallback"));
check("directed continuation never exposes a validator error", edge.includes("buildDirectedContinuationFallback({") && !edge.includes("Velvet could not continue from"));
check(
  "Gemini 3.6 Flash is primary and 3.5 Flash is fallback",
  edge.includes('Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash"') &&
    edge.includes('Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash"') &&
    edge.includes("useFallbackModel ? GEMINI_FALLBACK_ENDPOINT : GEMINI_ENDPOINT"),
);
check(
  "latest user turn is an authoritative end-of-prompt anchor",
  edge.includes("AUTHORITATIVE LATEST-TURN ANCHOR — read this last") &&
    edge.includes("The passage must respond to this exact turn now"),
);
check(
  "client and backend agree on the user-message anchor",
  chatsContext.includes("expectedUserMessageId") &&
    edge.includes("Generation anchor mismatch") &&
    edge.includes("latestUserRecord?.id !== expectedUserMessageId"),
);
check(
  "summaries refresh every five user turns and on regeneration",
  edge.includes("replacementMessage || userMessageCount % 5 === 0") &&
    edge.includes("messages.slice(-60)"),
);
check(
  "cancellation rows are private to the Edge Function",
  privateCancellationMigration.includes("revoke all on table public.generation_requests from anon, authenticated") &&
    privateCancellationMigration.includes("to service_role"),
);
check("mobile UI stylesheet is loaded", main.includes('mobile-v71.css'));
check("mobile navigation keeps three columns", mobileStyles.includes("grid-template-columns: repeat(3"));

const diversityPosition = edge.indexOf("// Regeneration diversity guard");
const voiceRepairPosition = edge.indexOf("// The natural-voice repair must never reintroduce user control.");
const finalRoutePosition = edge.indexOf("// Route enforcement is deliberately LAST.");
const finalDiversityPosition = edge.indexOf("// FINAL regeneration validation.");
const emptyReplyPosition = edge.indexOf("if (!generatedReply)", finalRoutePosition);
check(
  "camera/voice repair is followed by final output validation",
  diversityPosition >= 0 &&
    voiceRepairPosition > diversityPosition &&
    finalRoutePosition > voiceRepairPosition &&
    finalDiversityPosition > finalRoutePosition &&
    emptyReplyPosition > finalDiversityPosition,
);

const immediateHidePosition = chatsContext.indexOf("// Hide the rejected take before any network await.");
const revisionPosition = chatsContext.indexOf("await bumpStoryRevision(characterId);", immediateHidePosition);
const filterPosition = chatsContext.indexOf("item.id !== options.regenerateMessageId", immediateHidePosition);
check(
  "regeneration hides the rejected response before network work",
  immediateHidePosition >= 0 && filterPosition > immediateHidePosition && revisionPosition > filterPosition,
);

const failed = checks.filter((item) => !item.condition);
for (const item of checks) {
  console.log(`${item.condition ? "PASS" : "FAIL"}  ${item.label}`);
}

if (failed.length) {
  console.error(`\n${failed.length} story-engine verification check(s) failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} story-engine checks passed.`);
