import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const edge = read("supabase/functions/character-chat/index.ts");
const chat = read("src/pages/Chat.jsx");
const chatsContext = read("src/context/ChatsContext.jsx");
const charactersContext = read("src/context/CharactersContext.jsx");
const characterModal = read("src/components/CreateCharacterModal.jsx");
const settingsContext = read("src/context/SettingsContext.jsx");
const settingsPage = read("src/pages/Settings.jsx");
const privateCancellationMigration = read("supabase/migrations/202608100002_generation_requests_private.sql");
const developmentMigration = read("supabase/migrations/202608110001_character_development_v1.sql");
const storyDnaMigration = read("supabase/migrations/202608120001_story_dna_v12.sql");
const storyFeedbackMigration = read("supabase/migrations/202608120002_story_feedback_v13.sql");

const checks = [];
function check(label, condition) {
  checks.push({ label, condition: Boolean(condition) });
}

const edgeLines = edge.split("\n").length;
const helperStart = edge.indexOf("// PURE_NARRATIVE_HELPERS_START");
const helperEnd = edge.indexOf("// PURE_NARRATIVE_HELPERS_END");
let helpers = null;
try {
  if (helperStart >= 0 && helperEnd > helperStart) {
    helpers = new Function(
      `${edge.slice(helperStart, helperEnd)}\nreturn { normalizeText, isSilentContinueText, looksLikeQuestion, classifyTurnIntent, stripDialogue, controlsUserPOV, hasUnclosedDialogue, isLowInformationGenericReply, replySimilarity, normalizeRegenerationFeedback, feedbackDirectives, normalizeStoryPreferences, extractDialogueLines, openingNarrativeBeat, hasRepeatedRecentSignature, developmentText, developmentList, normalizeCharacterDevelopment, characterDevelopmentPromptView, resolveCharacterDevelopmentBranch, canTransitionCharacterPhase, isGroundedDevelopmentEvidence, summarizeRejectedStyle, applyCharacterDevelopment, validateNarrativeReply, detectResponseLanguage };`,
    )();
  }
} catch (error) {
  console.error("Could not load pure narrative helpers:", error);
}

check("single project tree", !existsSync(resolve(root, "velvet-stories")));
check("single narrative Edge Function", !existsSync(resolve(root, "supabase/functions/swift-task")));
check("consolidated engine stays under seventeen hundred lines", edgeLines < 1700);
check("old fallback architecture is gone",
  !edge.includes("buildCanonNeutralEditorialFallback") &&
  !edge.includes("buildTenderEmotionalFallback") &&
  !edge.includes("repairConversationProgression") &&
  !edge.includes("repairNaturalVoice") &&
  !edge.includes("repairUserPOVViolation"));
check("no deterministic narrative fallback exists",
  !/function\s+\w*Fallback\s*\(/.test(edge) &&
  !edge.includes("Final save integrity used a safe fallback"));
check("one generation one validation one optional repair",
  edge.includes("let result = await generateRoleplay({") &&
  edge.includes("let validationIssues = validateNarrativeReply(") &&
  edge.includes("result = await repairRoleplayOnce({") &&
  edge.includes("repaired candidate still invalid"));
check("invalid repair becomes an error rather than fake prose",
  edge.includes("Velvet rejected a weak or incomplete response before showing it. Regenerate once more.") &&
  !edge.includes('`"Okay,"') &&
  !edge.includes('`"Yeah,"'));
check("model returns reply and continuity in one request",
  edge.includes('required: ["turn_reading", "canon_claims", "voice_plan", "reply", "continuity_note", "development_update"]') &&
  edge.includes("responseMimeType: \"application/json\"") &&
  edge.includes("continuityNote: result.continuity_note"));
check("the same request plans latest-turn meaning and audits canon",
  edge.includes("turn_reading: one sentence stating the literal social meaning") &&
  edge.includes("canon_claims: a list of every off-screen or historical factual claim") &&
  edge.includes('canon_claims: { type: "array", items: { type: "string" } }'));
check("no background story-model calls consume extra quota",
  !edge.includes("updateStoryStateInBackground") &&
  !edge.includes("updateConversationSummaryInBackground") &&
  !edge.includes("extractMemoriesInBackground"));
check("Gemini primary and fallback are configurable",
  edge.includes('Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash"') &&
  edge.includes('Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash-lite"'));
check("free quota exhaustion is explicit",
  edge.includes('throw new Error("The free AI limit was reached. Try again later.")'));
check("structured runtime logging covers generation rejection and save",
  edge.includes('console.log("[character-chat] generation started"') &&
  edge.includes('console.warn("[character-chat] candidate rejected"') &&
  edge.includes('console.log("[character-chat] response saved"'));

check("persistent development migration covers existing and future characters",
  developmentMigration.includes("add column if not exists core_motivation text") &&
  developmentMigration.includes("add column if not exists emotional_defense text") &&
  developmentMigration.includes("add column if not exists softening_triggers text") &&
  developmentMigration.includes("add column if not exists growth_direction text") &&
  /character_development jsonb not null default '\{\}'::jsonb/.test(developmentMigration) &&
  developmentMigration.includes("story_engine_version set default 8"));
check("v1.2 voice migration covers every existing and future character",
  ["voice_vocabulary", "humor_style", "conflict_style", "affection_style", "verbal_tells", "voice_avoidances"]
    .every((field) => storyDnaMigration.includes(`add column if not exists ${field} text`)) &&
  storyDnaMigration.includes("story_engine_version set default 9"));
check("every newly created conversation starts an independent development state",
  chatsContext.includes("character_development: {}") &&
  chatsContext.includes("story_engine_version: 10"));
check("character creator exposes all optional development anchors",
  ["coreMotivation", "emotionalDefense", "softeningTriggers", "growthDirection"].every((field) => characterModal.includes(`name="${field}"`)));
check("character development anchors persist and reload",
  ["core_motivation", "emotional_defense", "softening_triggers", "growth_direction"].every((field) => charactersContext.includes(`${field}:`)) &&
  ["coreMotivation", "emotionalDefense", "softeningTriggers", "growthDirection"].every((field) => charactersContext.includes(`${field}: character.`)));
check("advanced voice fingerprint is optional, folded and persistent",
  characterModal.includes('<details className="studio-voice-fingerprint">') &&
  ["voiceVocabulary", "humorStyle", "conflictStyle", "affectionStyle", "verbalTells", "voiceAvoidances"]
    .every((field) => characterModal.includes(`name="${field}"`)) &&
  ["voice_vocabulary", "humor_style", "conflict_style", "affection_style", "verbal_tells", "voice_avoidances"]
    .every((field) => charactersContext.includes(`${field}:`)));
check("advanced voice fingerprint is visibly discoverable",
  characterModal.includes("Tap to expand") &&
  characterModal.includes("voiceFingerprintCount") &&
  characterModal.includes("studio-voice-fingerprint__chevron"));
check("production engine contains no Rowan-specific development rule", !/\bRowan\b/.test(edge));
check("development state is returned and saved in the same generation path",
  edge.includes("developmentUpdate: result.development_update") &&
  edge.includes("update.character_development = applyCharacterDevelopment({") &&
  !edge.includes("generateCharacterDevelopment"));
check("development profile and state are present in the roleplay prompt",
  edge.includes("Core motivation: ${character.core_motivation") &&
  edge.includes("PERSISTENT CHARACTER DEVELOPMENT — EVIDENCE-BOUND") &&
  edge.includes("characterDevelopmentPromptView(developmentState)") &&
  edge.includes("Relationship phases move gradually"));
check("character voice is planned separately from reader-facing prose",
  edge.includes("VOICE FINGERPRINT — PASS THE BLIND-VOICE TEST") &&
  edge.includes("voice_plan: a private planning object") &&
  edge.includes('required: ["conversational_goal", "outward_tactic", "private_pressure", "verbal_signature", "avoided_pattern"]'));
check("global story DNA has Antonia's preferred defaults",
  settingsContext.includes('storyProse: "contemporary"') &&
  settingsContext.includes('storyDialogue: "dialogue_forward"') &&
  settingsContext.includes('storyEmotion: "interior_visible"') &&
  settingsContext.includes('storyPacing: "medium_fast"'));
check("global story DNA reaches every generation request",
  chatsContext.includes("storyPreferences: buildStoryPreferencesPayload(settings)") &&
  edge.includes("CREATOR STORY DNA — GLOBAL PRESENTATION PREFERENCES"));
check("settings expose global prose dialogue emotion pacing and standing notes",
  settingsPage.includes("How I like stories") &&
  ["storyProse", "storyDialogue", "storyEmotion", "storyPacing", "storyInstructions"]
    .every((field) => settingsPage.includes(`settings.${field}`)));
check("regeneration feedback is sent explicitly and learned after repetition",
  chatsContext.includes("regenerationFeedback: Array.isArray(options.feedbackCodes)") &&
  settingsContext.includes("recordStoryFeedback") &&
  chatsContext.includes("Number(count) >= 2") &&
  settingsPage.includes("What Velvet has learned"));
check("thumb feedback separates preserve from avoid",
  chat.includes("ThumbsUp") && chat.includes("ThumbsDown") &&
  chat.includes('recordStoryFeedback(kind, codes)') &&
  ["voice", "emotion", "dialogue", "pacing"].every((code) => chat.includes(`["${code}"`)) &&
  chatsContext.includes("learnedPositiveFeedback") && chatsContext.includes("learnedNegativeFeedback"));
check("feedback can be undone and individual preferences forgotten",
  chat.includes("undoStoryFeedback") && chat.includes("undoLatestFeedback") &&
  settingsContext.includes("removeStoryFeedback") && settingsPage.includes("onRemove(kind, code)"));
check("story preferences sync privately across signed-in devices",
  storyFeedbackMigration.includes("create table if not exists public.user_story_preferences") &&
  storyFeedbackMigration.includes("enable row level security") &&
  storyFeedbackMigration.includes("auth.uid() = user_id") &&
  settingsContext.includes('.from("user_story_preferences")') &&
  settingsContext.includes("storySyncReady"));
check("AI can create an entire reviewable character draft",
  edge.includes('action === "character_generate"') &&
  edge.includes("Honor any requested name exactly") &&
  edge.includes("required: Object.keys(characterDraftProperties)") &&
  charactersContext.includes("generateCharacterDraft") &&
  characterModal.includes("Create with AI") && characterModal.includes("Surprise me") &&
  characterModal.includes("Nothing is saved automatically"));
check("complete character creation is fast bounded and has model failover",
  edge.includes("const deadline = Date.now() + 28000") &&
  edge.includes('thinkingConfig: { thinkingLevel: "MINIMAL" }') &&
  edge.includes("[GEMINI_MODEL, GEMINI_FALLBACK_MODEL]") &&
  edge.includes('maxOutputTokens: 2800') &&
  charactersContext.includes("timeout: 32000"));
check("character creation exposes actionable upstream errors",
  charactersContext.includes("readCharacterFunctionError") &&
  charactersContext.includes("response.clone().text()") &&
  edge.includes('[character-chat] character tool model failed') &&
  edge.includes('[character-chat] character tool attempt ended'));
check("AI character drafts can be stopped or discarded before save",
  characterModal.includes("Stop generation") &&
  characterModal.includes("Discard draft") &&
  characterModal.includes("generationAbortRef.current?.abort()") &&
  characterModal.includes("discardGeneratedDraft"));
check("existing profiles can be organized without changing facts",
  charactersContext.includes("organizeCharacterDraft") &&
  edge.includes("Do not invent, delete or change facts") &&
  characterModal.includes("Organize profile"));
check("rewind and clean branches clear derived character development",
  (chatsContext.match(/character_development: \{\}/g) || []).length >= 3 &&
  chatsContext.includes("characterDevelopment: {}"));

check("pure narrative helper API loads", helpers);
check("compact silence is recognized", helpers?.isSilentContinueText("...") && helpers?.isSilentContinueText("[SILENT_CONTINUE]"));
check("ordinary text is not silence", helpers && !helpers.isSilentContinueText("Okay."));
check("question without punctuation is recognized",
  helpers?.looksLikeQuestion("Nothing much, what about you i haven't seen you all week"));
check("ordinary statement is not a question",
  helpers && !helpers.looksLikeQuestion("Nothing much, I've just been studying all week"));

const reassuranceTurn = helpers?.classifyTurnIntent("It's okay", [
  { sender: "character", content: `"I should've checked in."` },
  { sender: "user", content: "It's okay" },
]);
check("It's okay is a reassurance turn", reassuranceTurn?.kind === "reassurance");
check("fine is a reassurance turn", helpers?.classifyTurnIntent("Fine.", []).kind === "reassurance");
check("I missed you is an affection turn",
  helpers?.classifyTurnIntent("I haven't seen you all week. I missed you", []).kind === "affection");
check("ten-year loyalty is indirect affection",
  helpers?.classifyTurnIntent("If I hated you, I wouldn't be by your side for ten years, dumbass", []).kind === "affection");
check("Spanish indirect loyalty is affection",
  helpers?.classifyTurnIntent("Si te odiara no estaría a tu lado después de diez años, idiota", []).kind === "affection");
check("direct text is recognized",
  helpers?.classifyTurnIntent("I text you: I'll return the umbrella tomorrow", []).kind === "digital_message");
check("user exit is recognized",
  helpers?.classifyTurnIntent("I'll take a shower *I walk to the bathroom*", []).kind === "user_exit");
check("time skip is recognized",
  helpers?.classifyTurnIntent("[Time skip — next day]", []).kind === "time_skip");

const twoSilentMessages = [
  { sender: "character", content: "Rowan waited." },
  { sender: "user", content: "." },
  { sender: "character", content: "Chloe looked at him." },
  { sender: "user", content: ".." },
];
check("two consecutive dots retain a silent streak of two",
  helpers?.classifyTurnIntent("..", twoSilentMessages).silentCount === 2);

check("English input selects English",
  helpers?.detectResponseLanguage("Nothing much, what about you?", "") === "English");
check("Spanish input selects Spanish",
  helpers?.detectResponseLanguage("Nada, sólo estaba estudiando, ¿y tú qué hiciste?", "") === "Spanish");
check("silence inherits the character language",
  helpers?.detectResponseLanguage(".", "No te preocupes, estoy aquí.") === "Spanish");

const normalizedFeedback = helpers?.normalizeRegenerationFeedback([
  "too_short", "TOO SHORT", "pov_violation", "invented_code", "too_short",
]);
check("regeneration feedback accepts only known deduplicated reasons",
  normalizedFeedback?.length === 2 &&
  normalizedFeedback.includes("too_short") &&
  normalizedFeedback.includes("pov_violation"));
check("every regeneration reason becomes an actionable narrative instruction",
  helpers?.feedbackDirectives([
    "ignored_idea", "too_short", "out_of_character", "too_much_narration",
    "not_enough_dialogue", "repetitive", "pov_violation", "missing_emotional_impact",
  ]).length === 8);

const safeStoryPreferences = helpers?.normalizeStoryPreferences({
  prose: "invalid",
  dialogue: "dialogue_forward",
  emotionalInterior: "interior_visible",
  romancePacing: "medium_fast",
  customInstructions: `<script>${"x".repeat(1000)}</script>`,
  learnedPositiveFeedback: ["voice", "fake_reason"],
  learnedNegativeFeedback: ["repetitive", "fake_reason"],
});
check("global story preferences are whitelisted sanitized and bounded",
  safeStoryPreferences?.prose === "contemporary" &&
  safeStoryPreferences?.dialogue === "dialogue_forward" &&
  !safeStoryPreferences?.custom_instructions.includes("<") &&
  safeStoryPreferences?.custom_instructions.length <= 900 &&
  safeStoryPreferences?.learned_positive_feedback.length === 1 &&
  safeStoryPreferences?.learned_negative_feedback.length === 1);

const repeatedDialogueReply = `Theo stopped beside the door. "I won't make that mistake again," he said, letting the promise stand without dressing it up.`;
const oldDialogueReply = `Theo looked across the table. "I won't make that mistake again," he said before gathering his books.`;
check("a repeated signature dialogue line is detected across recent turns",
  helpers?.hasRepeatedRecentSignature(repeatedDialogueReply, [oldDialogueReply]));
check("fresh character dialogue is not rejected as repetition",
  !helpers?.hasRepeatedRecentSignature(`Theo set the keys down. "Coffee at seven? I'll actually show up this time."`, [oldDialogueReply]));
check("final validation rejects a repeated recent signature",
  helpers?.validateNarrativeReply(repeatedDialogueReply, {
    latestUserMessage: "Promise?",
    turnIntent: { kind: "ordinary" },
    recentCharacterReplies: [oldDialogueReply],
  }).includes("repeated_recent_signature"));

const futureCharacterState = helpers?.normalizeCharacterDevelopment({}, "Childhood friends who trust each other but avoid naming the tension.");
const blankCharacterState = helpers?.normalizeCharacterDevelopment({}, "");
check("any future character initializes from its own relationship premise",
  futureCharacterState?.relationship_phase === "established" &&
  futureCharacterState?.current_dynamic.includes("Childhood friends"));
check("a character without prior relationship begins at baseline",
  blankCharacterState?.relationship_phase === "baseline" && blankCharacterState?.current_dynamic === "");

const inventedDevelopment = helpers?.applyCharacterDevelopment({
  previous: futureCharacterState,
  update: {
    significance: "high",
    evidence: "secret hospital visit",
    relationship_phase: "committed",
    relationship_dynamic: "They are suddenly partners.",
    emotional_residue: "devotion",
    behavioral_effect: "confesses everything",
    turning_point: "A secret visit changed everything.",
  },
  relationshipPremise: "Childhood friends who trust each other but avoid naming the tension.",
  latestUserMessage: "Nice weather today.",
  reply: `Theo smiled. "It is."`,
  messageId: "future-1",
});
check("invented development evidence cannot alter phase or dynamic",
  inventedDevelopment?.relationship_phase === "established" &&
  inventedDevelopment?.current_dynamic === futureCharacterState?.current_dynamic &&
  inventedDevelopment?.turning_points.length === 0 &&
  inventedDevelopment?.emotional_residue.length === 0);

const impossiblePhaseJump = helpers?.applyCharacterDevelopment({
  previous: futureCharacterState,
  update: {
    significance: "high",
    evidence: "trust you",
    relationship_phase: "committed",
    relationship_dynamic: "Trust matters, but their bond remains undefined.",
  },
  relationshipPremise: "Childhood friends who trust each other but avoid naming the tension.",
  latestUserMessage: "I trust you.",
  reply: `Theo goes quiet. "I trust you too."`,
  messageId: "future-impossible",
});
check("even grounded evidence cannot skip directly across relationship phases",
  impossiblePhaseJump?.relationship_phase === "established" &&
  impossiblePhaseJump?.phase_candidate === "" &&
  impossiblePhaseJump?.phase_evidence_count === 0 &&
  impossiblePhaseJump?.current_dynamic === futureCharacterState?.current_dynamic);

const firstEarnedBeat = helpers?.applyCharacterDevelopment({
  previous: futureCharacterState,
  update: {
    significance: "high",
    evidence: "trust you",
    relationship_phase: "warming",
    relationship_dynamic: "Their old trust is becoming more openly tender.",
    emotional_residue: "relief",
    active_contradiction: "Theo wants closeness but still hides behind humor.",
    behavioral_effect: "He remains nearby instead of deflecting and leaving.",
    turning_point: "The user openly says they trust Theo.",
  },
  relationshipPremise: "Childhood friends who trust each other but avoid naming the tension.",
  latestUserMessage: "I trust you.",
  reply: `The words catch Theo off guard. "I know. I don't take that lightly."`,
  messageId: "future-2",
});
check("one strong beat records impact but cannot instantly change phase",
  firstEarnedBeat?.relationship_phase === "established" &&
  firstEarnedBeat?.phase_candidate === "warming" &&
  firstEarnedBeat?.phase_evidence_count === 2 &&
  firstEarnedBeat?.emotional_residue[0]?.remaining_turns === 6 &&
  firstEarnedBeat?.turning_points.length === 1);
const restoredBeforeRegeneration = helpers?.resolveCharacterDevelopmentBranch(
  firstEarnedBeat,
  "Childhood friends who trust each other but avoid naming the tension.",
  "future-2",
);
check("regeneration restores development from before the rejected response",
  restoredBeforeRegeneration?.relationship_phase === futureCharacterState?.relationship_phase &&
  restoredBeforeRegeneration?.phase_candidate === "" &&
  restoredBeforeRegeneration?.emotional_residue.length === 0 &&
  restoredBeforeRegeneration?.turning_points.length === 0 &&
  restoredBeforeRegeneration?.last_message_id === "");
const promptDevelopmentView = helpers?.characterDevelopmentPromptView(firstEarnedBeat) || {};
check("private undo data is never exposed to the writing model",
  !("undo_snapshot" in promptDevelopmentView));

const repeatedEarnedBeat = helpers?.applyCharacterDevelopment({
  previous: firstEarnedBeat,
  update: {
    significance: "medium",
    evidence: "trust you",
    relationship_phase: "warming",
    relationship_dynamic: "Their care is becoming easier to acknowledge.",
    emotional_residue: "quiet hope",
    active_contradiction: "Theo is hopeful but afraid to misread their closeness.",
    behavioral_effect: "He answers honestly before reaching for a joke.",
    turning_point: "Trust is reaffirmed after Theo remains honest.",
  },
  relationshipPremise: "Childhood friends who trust each other but avoid naming the tension.",
  latestUserMessage: "I still trust you.",
  reply: `Theo lets the reassurance settle. "Then I'll try to deserve it."`,
  messageId: "future-3",
});
check("repeated grounded evidence can earn a gradual phase change",
  repeatedEarnedBeat?.relationship_phase === "warming" &&
  repeatedEarnedBeat?.phase_candidate === "" &&
  repeatedEarnedBeat?.phase_evidence_count === 0);

const decayedDevelopment = helpers?.applyCharacterDevelopment({
  previous: repeatedEarnedBeat,
  update: { significance: "none" },
  relationshipPremise: "Childhood friends who trust each other but avoid naming the tension.",
  latestUserMessage: "Want some coffee?",
  reply: `"Always," Theo said.`,
  messageId: "future-4",
});
check("emotional residue colors later turns and decays instead of becoming permanent",
  decayedDevelopment?.emotional_residue.length === repeatedEarnedBeat?.emotional_residue.length &&
  decayedDevelopment?.emotional_residue.every((item, index) => item.remaining_turns === repeatedEarnedBeat.emotional_residue[index].remaining_turns - 1));

const regeneratedDevelopment = helpers?.applyCharacterDevelopment({
  previous: blankCharacterState,
  update: { significance: "none" },
  latestUserMessage: "It's okay.",
  reply: `Theo's expression softens. "Still. Let me make it right."`,
  messageId: "future-5",
  isRegeneration: true,
  regenerationInstruction: "Show his private relief, then let him suggest coffee.",
  regenerationFeedback: ["not_enough_dialogue", "missing_emotional_impact"],
  rejectedResponses: [`"Okay," Theo said. "I'm listening."`],
});
check("regeneration teaches abstract preferences without preserving rejected prose",
  regeneratedDevelopment?.learned_preferences.avoid.some((item) => /service-like|underdeveloped/i.test(item)) &&
  regeneratedDevelopment?.learned_preferences.encourage.some((item) => item.includes("private relief")) &&
  regeneratedDevelopment?.learned_preferences.encourage.some((item) => item.includes("audible dialogue")) &&
  !JSON.stringify(regeneratedDevelopment).includes("I'm listening"));
check("development history remains bounded for long-running and future chats",
  helpers?.normalizeCharacterDevelopment({
    turning_points: Array.from({ length: 30 }, (_, index) => ({ event: `event ${index}` })),
    learned_preferences: {
      encourage: Array.from({ length: 20 }, (_, index) => `encourage ${index}`),
      avoid: Array.from({ length: 20 }, (_, index) => `avoid ${index}`),
    },
  }, "").turning_points.length === 12 &&
  helpers?.normalizeCharacterDevelopment({
    learned_preferences: { encourage: Array.from({ length: 20 }, (_, index) => `encourage ${index}`) },
  }, "").learned_preferences.encourage.length === 8);

const weakOkayReply = `"Yeah," Rowan said, taking the words seriously. "I understand."`;
const weakOkayIssues = helpers?.validateNarrativeReply(weakOkayReply, {
  characterName: "Rowan",
  userName: "Toni",
  latestUserMessage: "It's okay",
  turnIntent: reassuranceTurn,
  finishReason: "STOP",
  rejectedResponses: [],
}) || [];
check("the exact reported I understand reply is rejected",
  weakOkayIssues.includes("generic_acknowledgment") && weakOkayIssues.includes("underdeveloped_social_beat"));

const listeningReply = `"Okay," Rowan said. "I'm listening."`;
check("Okay I'm listening is rejected",
  helpers?.validateNarrativeReply(listeningReply, {
    userName: "Toni",
    latestUserMessage: "It's okay",
    turnIntent: reassuranceTurn,
  }).includes("generic_acknowledgment"));

const groundedReassuranceReply = `The easy forgiveness should have let Rowan off the hook. Instead, his grip shifted on the umbrella, guilt lingering where the joke usually came first.\n\n"Still," he said, quieter now. "I should've checked in." A crooked smile touched his mouth. "Let me make it up to you. Coffee after class—no disappearing this time."`;
check("a grounded complete reassurance beat is accepted",
  helpers?.validateNarrativeReply(groundedReassuranceReply, {
    characterName: "Rowan",
    userName: "Toni",
    latestUserMessage: "It's okay",
    turnIntent: reassuranceTurn,
    finishReason: "STOP",
    rejectedResponses: [],
  }).length === 0);

const affectionTurn = helpers?.classifyTurnIntent("I missed you", []);
const weakAffection = `Rowan smiled. "I missed you too."`;
check("a tiny affection answer lacks emotional impact",
  helpers?.validateNarrativeReply(weakAffection, {
    characterName: "Rowan",
    userName: "Toni",
    latestUserMessage: "I missed you",
    turnIntent: affectionTurn,
  }).includes("missing_emotional_impact"));

const groundedAffection = `The admission caught Rowan cleanly. For one unguarded second, relief warmed his face before he looked back toward the rain, pretending the umbrella needed his attention. He had missed you enough to resent how easily three words could undo him.\n\n"Yeah?" His teasing returned, softer around the edges. "Good. Would've been embarrassing if I was the only one."`;
check("private impact plus restrained dialogue satisfies affection",
  helpers?.validateNarrativeReply(groundedAffection, {
    characterName: "Rowan",
    userName: "Toni",
    latestUserMessage: "I missed you",
    turnIntent: affectionTurn,
    finishReason: "STOP",
    rejectedResponses: [],
  }).length === 0);

check("unfinished dialogue is rejected",
  helpers?.validateNarrativeReply(`Rowan glanced over. "I was going to tell you`, {
    turnIntent: { kind: "ordinary" },
  }).includes("unfinished_reply"));
check("MAX_TOKENS is rejected even with punctuation",
  helpers?.validateNarrativeReply(`Rowan looked over. "I mean it."`, {
    turnIntent: { kind: "ordinary" },
    finishReason: "MAX_TOKENS",
  }).includes("truncated_by_model"));
check("system validator language is never shown",
  helpers?.validateNarrativeReply("Velvet could not continue. Try the continuation again.", {
    turnIntent: { kind: "ordinary" },
  }).includes("exposes_system_language"));
check("invented user thoughts are rejected",
  helpers?.validateNarrativeReply(`You realized he was right. Rowan smiled. "See?"`, {
    userName: "Toni",
    latestUserMessage: "Whatever.",
    turnIntent: { kind: "ordinary" },
  }).includes("controls_user_pov"));

const rejectedTake = `Rowan shifted the umbrella over your shoulder. "I should have called." The apology sat awkwardly between you.`;
const copiedTake = `Rowan shifted the umbrella above your shoulder. "I should have called you." The apology remained awkwardly between you.`;
check("regeneration rejects a semantic near-copy",
  helpers?.validateNarrativeReply(copiedTake, {
    latestUserMessage: "It's okay",
    turnIntent: reassuranceTurn,
    rejectedResponses: [rejectedTake],
  }).includes("too_similar_to_rejected_take"));

check("latest user turn is the final authoritative prompt block",
  edge.includes("AUTHORITATIVE LATEST USER TURN") &&
  edge.lastIndexOf("AUTHORITATIVE LATEST USER TURN") > edge.lastIndexOf("IMMEDIATE CONTINUITY") &&
  edge.includes("Write the response to that exact turn now."));
check("It's okay receives an explicit social instruction",
  edge.includes("show what that does to ${character.name}") &&
  edge.includes("Do not respond as a counselor acknowledging information"));
check("affection must affect the character before outward dialogue",
  edge.includes("show the private impact appropriate to the profile before ${character.name}'s outward answer"));
check("guardedness is not cruelty",
  edge.includes("does not mean cruel, contemptuous, robotic or therapeutic"));
check("unsupported off-screen facts are prohibited at generation time",
  edge.includes("Never invent off-screen messages, visits, habits, schedules, relatives' actions, debts, exact durations or shared history"));
check("two silent turns route focus back to the character",
  edge.includes("After two consecutive silent turns, return the meaningful focus to ${character.name}"));
check("post-exit camera follows the character",
  edge.includes("Follow ${character.name}'s immediate reaction"));
check("direct text cannot be buried under NPC banter",
  edge.includes("show its effect and normally include ${character.name}'s written reply before NPC banter"));
check("rejected regeneration prose is absent from the main prompt",
  edge.includes("The rejected take is intentionally absent") &&
  !edge.includes("REJECTED RESPONSE VARIANTS"));
check("branch anchor is checked against the client",
  edge.includes("expectedUserMessageId") &&
  chatsContext.includes("expectedUserMessageId,"));
check("regeneration hides the rejected response before network work",
  chatsContext.indexOf("Hide the rejected take before any network await") < chatsContext.indexOf("const requestController = new AbortController()"));
check("compact silent sentinel remains in the UI",
  chat.includes('const SILENT_CONTINUE_MESSAGE = "[SILENT_CONTINUE]"'));
check("one or more dots become silence",
  chat.includes('/^[.…。]+$/u.test(cleanMessage)'));
check("cancellation rows remain server-private",
  privateCancellationMigration.includes("revoke all on table public.generation_requests from anon, authenticated") &&
  privateCancellationMigration.includes("grant select, insert, update, delete on table public.generation_requests to service_role"));

let failures = 0;
for (const item of checks) {
  if (!item.condition) failures += 1;
  console.log(`${item.condition ? "PASS" : "FAIL"}  ${item.label}`);
}

if (failures) {
  console.error(`\n${failures} story-engine verification check(s) failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} story-engine checks passed.`);
