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

let completionApi = null;
try {
  const completionStart = edge.indexOf("function extractGeminiCandidate");
  const completionEnd = edge.indexOf("function collectFamilyClaimActions", completionStart);
  if (completionStart >= 0 && completionEnd > completionStart) {
    completionApi = new Function(
      `${edge.slice(completionStart, completionEnd)}\nreturn { extractGeminiCandidate, getIncompleteReplySignals, trimIncompleteReplyTail };`,
    )();
  }
} catch {
  completionApi = null;
}

const rowanTruncatedReply = `Rowan scoffed, shifting the umbrella to keep the wind from blowing the rain onto your side.\n\n"And subject you to my mother's three-hour lecture on flower arrangements? I'm a survivor, Toni, but I wouldn't wish that on you. Besides, we both know you would've just stolen the pastries off the catering trays and left me to take the blame."\n\nHe kept his eyes on the wet pavement ahead, matching his stride to yours.\n\n"But thanks. Next time I'm being held`;
const rowanCompletionSignals = completionApi?.getIncompleteReplySignals(rowanTruncatedReply) || [];
check(
  "unfinished Rowan dialogue is rejected",
  rowanCompletionSignals.includes("unbalanced_straight_quotes"),
);
check(
  "MAX_TOKENS is rejected even after terminal punctuation",
  completionApi?.getIncompleteReplySignals(`"But thanks."`, "MAX_TOKENS").includes("finish_max_tokens"),
);
check(
  "complete dialogue is accepted",
  completionApi && !completionApi.getIncompleteReplySignals(`Rowan looked over.\n\n"But thanks. I mean it."`, "STOP").length,
);
check(
  "safe tail trimming closes the last complete spoken sentence",
  completionApi?.trimIncompleteReplyTail(rowanTruncatedReply).endsWith('"But thanks."'),
);
check(
  "initial and final generation paths enforce completion",
  edge.includes("Initial generation was incomplete") &&
    edge.includes("// FINAL save integrity gate.") &&
    edge.indexOf("// FINAL save integrity gate.") < edge.indexOf("if (!generatedReply)"),
);
check(
  "thinking budget leaves room for a complete visible reply",
  edge.includes('if (length === "short") return 900;') &&
    edge.includes('if (length === "long") return 2400;') &&
    edge.includes("return 1600;"),
);

let groundedReplyApi = null;
try {
  const groundedStart = edge.indexOf("function collectFamilyClaimActions");
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
const rowanTechStereotypeReply = `"Just studying? Right. Because your idea of 'just studying' usually involves three energy drinks and staring at a screen until your eyes cross."\n\nHe tilted the umbrella slightly more over your side.\n\n"As for me, I've been around. You're the one who's been hiding in the lab. Honestly, I was starting to think you'd finally replaced me with a Python script."`;
const rowanTechSignals = groundedReplyApi?.findUnsupportedEverydayClaimSignals({
  candidate: rowanTechStereotypeReply,
  groundingFacts: `USER: Nothing really, just studying, what about you i haven't seen you in a while`,
}) || [];
check(
  "Rowan energy-drink/lab routine is rejected",
  [
    "unsupported_consumption_quantity",
    "unsupported_attributed_routine",
    "unsupported_lab_claim",
  ].every((signal) => rowanTechSignals.includes(signal)) &&
    groundedReplyApi?.likelyNeedsGroundedReplyRepair({
      candidate: rowanTechStereotypeReply,
      recentCharacterBeats: [],
      groundingFacts: `USER: Nothing really, just studying, what about you i haven't seen you in a while`,
      latestUserMessage: `Nothing really, just studying, what about you i haven't seen you in a while`,
    }),
);
check(
  "what-about-you cannot be answered by redirecting blame",
  groundedReplyApi?.likelyNeedsGroundedReplyRepair({
    candidate: `"I've been around. You're the one who disappeared."`,
    recentCharacterBeats: [],
    groundingFacts: `USER: Nothing really, what about you?`,
    latestUserMessage: `Nothing really, what about you?`,
  }),
);
const rowanMissedYouInput = "Not much lately just studying, what about you? I haven't see you in a while, i missed you";
const rowanMissedYouBadReply = `"I've been dealing with midterms and getting dragged into planning some family dinner my parents are hosting," Rowan said, adjusting the angle of the umbrella to keep the rain off your shoulder. He glanced down at you, a quick smile breaking through his usual guarded expression. "And don't act like it's been years. But if you missed me that much, you could've just texted."`;
const rowanMissedYouSignals = groundedReplyApi?.findUnsupportedEverydayClaimSignals({
  candidate: rowanMissedYouBadReply,
  groundingFacts: `CHARACTER PROFILE\nRowan secretly likes you but treats you like a bro.\nEXPLICIT USER TURNS\n${rowanMissedYouInput}`,
}) || [];
check(
  "Rowan midterms/family dinner/prior-text invention is rejected",
  [
    "unsupported_exam_schedule",
    "unsupported_family_hosting",
    "unsupported_family_specific_detail",
    "unsupported_unestablished_opportunity",
  ].every((signal) => rowanMissedYouSignals.includes(signal)),
);
check(
  "user-authored 10 years also supports the words ten years",
  groundedReplyApi && !groundedReplyApi.findUnsupportedEverydayClaimSignals({
    candidate: `"You've been here for ten years," Rowan said.`,
    groundingFacts: `USER: I've been by your side for 10 years.`,
  }).includes("unsupported_exact_duration"),
);
const rowanInventedMotherReply = `"My mom doesn't need to tell me anything," Rowan said. "She's too busy texting me to make sure you're actually eating."`;
const rowanMotherSignals = groundedReplyApi?.findUnsupportedEverydayClaimSignals({
  candidate: rowanInventedMotherReply,
  groundingFacts: `USER: Yeah, sure. Who told you that? Your mom`,
}) || [];
check(
  "mentioning Rowan's mom does not authorize invented texts or caretaking",
  [
    "unsupported_family_text",
    "unsupported_family_monitoring",
    "unsupported_family_caretaking_detail",
  ].every((signal) => rowanMotherSignals.includes(signal)) &&
    groundedReplyApi?.likelyNeedsGroundedReplyRepair({
      candidate: rowanInventedMotherReply,
      recentCharacterBeats: [],
      groundingFacts: `USER: Yeah, sure. Who told you that? Your mom`,
      latestUserMessage: `Yeah, sure. Who told you that? Your mom`,
    }),
);
const rowanTruncatedFactSignals = groundedReplyApi?.findUnsupportedEverydayClaimSignals({
  candidate: rowanTruncatedReply,
  groundingFacts: `USER: Thanks. I would've gone with you if you asked.`,
}) || [];
check(
  "truncated Rowan reply also rejects invented lecture and catering history",
  [
    "unsupported_exact_duration",
    "unsupported_family_lecture",
    "unsupported_family_specific_detail",
    "unsupported_attributed_counterfactual",
    "unsupported_event_detail",
  ].every((signal) => rowanTruncatedFactSignals.includes(signal)),
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
    edge.includes("Teasing is optional, not the character's default response to every line") &&
    edge.includes("Every subject-action-detail link needs its own support") &&
    edge.includes("does NOT establish that she texted, called, asked, reminded, monitored meals"),
);
check(
  "editorial rewrites are revalidated before display",
  edge.includes("const maximumEditorialAttempts = 1") &&
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
  "voice, canon and emotion share one editorial request budget",
  edge.includes("let combinedEditorialRepairUsed = false") &&
    edge.includes("combinedEditorialRepairUsed = true") &&
    edge.includes("This is the single combined editorial attempt") &&
    !edge.includes("await repairTenderEmotionalBeat({"),
);

let editorialFallbackApi = null;
try {
  const fallbackStart = edge.indexOf("function normalizeEditorialFallback");
  const fallbackEnd = edge.indexOf("async function repairNaturalVoice", fallbackStart);
  if (fallbackStart >= 0 && fallbackEnd > fallbackStart) {
    editorialFallbackApi = new Function(
      `function looksLikeDirectQuestion() { return false; }\nfunction isIndirectTenderLoyaltyDisclosure() { return false; }\nfunction buildTenderEmotionalFallback() { return ""; }\n${edge.slice(fallbackStart, fallbackEnd)}\nreturn { buildCanonNeutralEditorialFallback };`,
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
const rowanMotherFallback = editorialFallbackApi?.buildCanonNeutralEditorialFallback({
  characterName: "Rowan Hayes",
  latestUserMessage: "Yeah, sure. Who told you that? Your mom",
  language: "English",
  seedText: rowanInventedMotherReply,
}) || "";
check(
  "Rowan mother fallback denies the invented off-screen exchange",
  Boolean(rowanMotherFallback) &&
    /(?:no one|nothing to do with that|entirely me)/i.test(rowanMotherFallback) &&
    !/text(?:s|ed|ing)?|make sure (?:you(?:'re| are) )?eat/i.test(rowanMotherFallback),
);

let tenderEmotionApi = null;
try {
  const tenderStart = edge.indexOf("function isIndirectTenderLoyaltyDisclosure");
  const tenderEnd = edge.indexOf("function sharedStagnantDialogueFrame", tenderStart);
  if (tenderStart >= 0 && tenderEnd > tenderStart) {
    const tenderSource = edge
      .slice(tenderStart, tenderEnd)
      .replace(/ = \{\} as Record<string, any>/g, " = {}");
    tenderEmotionApi = new Function(
      `${tenderSource}\nreturn { isIndirectTenderLoyaltyDisclosure, isTenderEmotionalDisclosure, characterHasRomanticInvestment, hasMeaningfulTenderImpact, needsTenderEmotionalBeatRepair };`,
    )();
  }
} catch {
  tenderEmotionApi = null;
}

const rowanRomanticProfile = {
  name: "Rowan Hayes",
  relationship: "Rowan secretly likes you but treats you like a bro so you will not notice.",
};
const rowanMissedYouGoodReply = `The admission caught Rowan off guard. He had missed you too—more than he wanted to admit.\n\n"Yeah?" Rowan said, quieter than intended. "I missed having you around."`;
const rowanEmptyReactionReply = `Rowan's expression shifted slightly.\n\n"Nothing worth a dramatic update," Rowan said. "But... yeah. I know I haven't been around much."`;
const rowanLoyaltyInput = `If i hated you, i wouldn't by your side fricking 10 years, dumbass`;
const rowanGenericListeningReply = `"Okay," Rowan said, without trying to deflect. "I'm listening."`;
check(
  "I missed you is recognized as a tender disclosure",
  tenderEmotionApi?.isTenderEmotionalDisclosure(rowanMissedYouInput),
);
check(
  "tender disclosure requires a beat without profile metadata",
  edge.includes("const requiresTenderBeat = tenderDisclosure;") &&
    edge.includes("relationshipSalient || romanticInvestment || tenderDisclosure"),
);
check(
  "ten-year loyalty statement is recognized as indirect affection",
  tenderEmotionApi?.isIndirectTenderLoyaltyDisclosure(rowanLoyaltyInput) &&
    tenderEmotionApi?.isTenderEmotionalDisclosure(rowanLoyaltyInput),
);
check(
  "secret romantic investment is read from the character profile",
  tenderEmotionApi?.characterHasRomanticInvestment(rowanRomanticProfile, {}),
);
check(
  "Rowan logistics-only reply is rejected for missing emotional impact",
  tenderEmotionApi?.needsTenderEmotionalBeatRepair({
    candidate: rowanMissedYouBadReply,
    latestUserMessage: rowanMissedYouInput,
    character: rowanRomanticProfile,
  }),
);
check(
  "Rowan shifted-expression reply is rejected even without relationship metadata",
  tenderEmotionApi?.needsTenderEmotionalBeatRepair({
    candidate: rowanEmptyReactionReply,
    latestUserMessage: rowanMissedYouInput,
    character: { name: "Rowan Hayes" },
  }),
);
check(
  "Okay I'm listening is rejected after the loyalty disclosure",
  tenderEmotionApi?.needsTenderEmotionalBeatRepair({
    candidate: rowanGenericListeningReply,
    latestUserMessage: rowanLoyaltyInput,
    character: rowanRomanticProfile,
  }) &&
    !edge.includes(`"Okay," ${"${name}"} said, without trying to deflect. "I'm listening."`),
);
check(
  "Rowan private reciprocal reaction satisfies the emotional beat",
  tenderEmotionApi && !tenderEmotionApi.needsTenderEmotionalBeatRepair({
    candidate: rowanMissedYouGoodReply,
    latestUserMessage: rowanMissedYouInput,
    character: rowanRomanticProfile,
  }),
);
check(
  "tender emotional validation runs before the final save",
  edge.includes("FINAL emotional validation") &&
    edge.includes("residualTenderRisk") &&
    edge.includes("buildTenderEmotionalFallback({") &&
    edge.includes("protects quality without") &&
    edge.includes("spending another Gemini request"),
);

let tenderFallbackApi = null;
try {
  const fallbackCoreStart = edge.indexOf("function normalizeEditorialFallback");
  const fallbackCoreEnd = edge.indexOf("async function repairNaturalVoice", fallbackCoreStart);
  const tenderFallbackStart = edge.indexOf("function buildTenderEmotionalFallback");
  const tenderFallbackEnd = edge.indexOf("async function repairIncompleteReply", tenderFallbackStart);
  const indirectTenderStart = edge.indexOf("function isIndirectTenderLoyaltyDisclosure");
  const indirectTenderEnd = edge.indexOf("function isTenderEmotionalDisclosure", indirectTenderStart);
  if (
    fallbackCoreStart >= 0 && fallbackCoreEnd > fallbackCoreStart &&
    tenderFallbackStart >= 0 && tenderFallbackEnd > tenderFallbackStart &&
    indirectTenderStart >= 0 && indirectTenderEnd > indirectTenderStart
  ) {
    tenderFallbackApi = new Function(
      `function looksLikeDirectQuestion() { return false; }\n${edge.slice(indirectTenderStart, indirectTenderEnd)}\n${edge.slice(fallbackCoreStart, fallbackCoreEnd)}\n${edge.slice(tenderFallbackStart, tenderFallbackEnd)}\nreturn { buildTenderEmotionalFallback };`,
    )();
  }
} catch {
  tenderFallbackApi = null;
}

const rowanTenderFallback = tenderFallbackApi?.buildTenderEmotionalFallback({
  characterName: "Rowan Hayes",
  language: "English",
  seedText: rowanEmptyReactionReply,
}) || "";
check(
  "quota-safe Rowan fallback contains impact and a complete answer",
  Boolean(rowanTenderFallback) &&
    tenderEmotionApi?.hasMeaningfulTenderImpact(rowanTenderFallback, "Rowan Hayes") &&
    !completionApi?.getIncompleteReplySignals(rowanTenderFallback).length &&
    /nothing (?:too interesting|dramatic)|i(?:'ve| have) been busy/i.test(rowanTenderFallback),
);
const rowanLoyaltyFallback = tenderFallbackApi?.buildTenderEmotionalFallback({
  characterName: "Rowan Hayes",
  latestUserMessage: rowanLoyaltyInput,
  language: "English",
  romanticInvestment: true,
  seedText: rowanGenericListeningReply,
}) || "";
check(
  "quota-safe loyalty fallback answers the implication instead of stalling",
  Boolean(rowanLoyaltyFallback) &&
    tenderEmotionApi?.hasMeaningfulTenderImpact(rowanLoyaltyFallback, "Rowan Hayes") &&
    !completionApi?.getIncompleteReplySignals(rowanLoyaltyFallback).length &&
    /10 years|still nice|like being reminded/i.test(rowanLoyaltyFallback) &&
    !/i(?:'m| am) listening|go on/i.test(rowanLoyaltyFallback),
);
check(
  "automatic memories cannot authorize invented story facts",
  edge.includes("function isAuthoritativeMemory") &&
    edge.includes(".filter((memory) => isAuthoritativeMemory(memory))") &&
    edge.includes("TENTATIVE AUTOMATIC MEMORY — never use as sole factual authority"),
);

let dialogueGuardApi = null;
try {
  const guardStart = edge.indexOf("function normalizeForRegenerationComparison");
  const guardEnd = edge.indexOf("function buildDialogueProgressionSummary", guardStart);
  if (guardStart >= 0 && guardEnd > guardStart) {
    const guardSource = edge
      .slice(guardStart, guardEnd)
      .replace(/ = \{\} as Record<string, any>/g, " = {}");
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
  "Gemini 3.6 Flash is primary and 3.5 Flash-Lite is fallback",
  edge.includes('Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash"') &&
    edge.includes('Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash-lite"') &&
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
