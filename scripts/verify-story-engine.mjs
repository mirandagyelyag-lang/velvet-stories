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
const memoryV17Migration = read("supabase/migrations/202608130001_velvet_v17_memory_engine.sql");
const memoryBook = read("src/components/MemoryBookDrawer.jsx");
const memoriesPage = read("src/pages/Memories.jsx");
const v17Styles = read("src/styles/velvet-v17.css");
const memoryV18Migration = read("supabase/migrations/202608140001_velvet_v18_memory_sources.sql");
const diagnosticsPage = read("src/pages/Diagnostics.jsx");
const relationshipDrawer = read("src/components/RelationshipDrawer.jsx");
const storyIntelligenceMigration = read("supabase/migrations/202608170002_velvet_v230_story_intelligence.sql");
const storycraftMigration = read("supabase/migrations/202608170003_velvet_v240_story_tools.sql");
const livingStoryMigration = read("supabase/migrations/202608170004_velvet_v250_living_story_suite.sql");
const timelineDrawer = read("src/components/StoryTimelineDrawer.jsx");
const storyHubDrawer = read("src/components/StoryHubDrawer.jsx");

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
      `${edge.slice(helperStart, helperEnd)}\nreturn { normalizeText, isSilentContinueText, looksLikeQuestion, classifyTurnIntent, stripDialogue, controlsUserPOV, hasUnclosedDialogue, isLowInformationGenericReply, replySimilarity, normalizeRegenerationFeedback, feedbackDirectives, normalizeStoryPreferences, extractDialogueLines, openingNarrativeBeat, stockGestureMotifs, hasStockBodyLanguageStack, hasRecycledStockGesture, hasUnsupportedMotiveEscalation, hasDistanceBoundaryOverride, hasSocialTensionOverEscalation, extractUserStagedEvents, hasUserStagedSceneRetcon, dialogueQuestionCount, hasRhetoricalDialogueOveruse, hasSarcasticComebackLoop, hasRepeatedRecentSignature, developmentText, developmentList, normalizeCharacterDevelopment, characterDevelopmentPromptView, resolveCharacterDevelopmentBranch, canTransitionCharacterPhase, isGroundedDevelopmentEvidence, summarizeRejectedStyle, applyCharacterDevelopment, validateNarrativeReply, detectResponseLanguage };`,
    )();
  }
} catch (error) {
  console.error("Could not load pure narrative helpers:", error);
}

check("single project tree", !existsSync(resolve(root, "velvet-stories")));
check("single narrative Edge Function", !existsSync(resolve(root, "supabase/functions/swift-task")));
check("live-stream engine stays reasonably consolidated", edgeLines < 2850);
check("old fallback architecture is gone",
  !edge.includes("buildCanonNeutralEditorialFallback") &&
  !edge.includes("buildTenderEmotionalFallback") &&
  !edge.includes("repairConversationProgression") &&
  !edge.includes("repairNaturalVoice") &&
  !edge.includes("repairUserPOVViolation"));
check("no deterministic narrative fallback exists",
  !/function\s+\w*Fallback\s*\(/.test(edge) &&
  !edge.includes("Final save integrity used a safe fallback"));
check("one live generation one validation one optional repair",
  edge.includes("streamGeminiEnvelopeWithFailover({") &&
  edge.includes("let validationIssues = validateNarrativeReply(") &&
  edge.includes("const repaired = await repairRoleplayOnce({") &&
  edge.includes("const blocking = repairTriggerIssues(validationIssues)") &&
  edge.includes("if (blocking.length)"));
check("advisory quality issues do not force repeated user regeneration",
  edge.includes("blockingNarrativeIssues") &&
  edge.includes("if (blocking.length)") &&
  !edge.includes("Velvet rejected a weak or incomplete response before showing it. Regenerate once more."));
check("structural failures remain fatal after one bounded repair",
  edge.includes("if (blocking.length)") &&
  edge.includes("const repairedFatal = blockingNarrativeIssues(repairedIssues)") &&
  edge.includes("Velvet could not get a complete safe reply after one repair. Retry once.") &&
  !edge.includes('`"Okay,"') &&
  !edge.includes('`"Yeah,"'));
check("continuity metadata never spends a second model call",
  edge.includes("VELVET_SPEED_REPAIR_BUDGET_V282") &&
  !edge.slice(edge.indexOf("const REPAIR_TRIGGER_ISSUES"), edge.indexOf("function blockingNarrativeIssues")).includes("...CONTINUITY_GUARD_ISSUES"));
check("style-only naturalism warnings never spend a second model call",
  !edge.slice(edge.indexOf("const REPAIR_TRIGGER_ISSUES"), edge.indexOf("function blockingNarrativeIssues")).includes('"stock_body_language_stack"') &&
  !edge.slice(edge.indexOf("const REPAIR_TRIGGER_ISSUES"), edge.indexOf("function blockingNarrativeIssues")).includes('"recycled_stock_gesture"') &&
  edge.includes('"unsupported_motive_escalation"') && edge.includes('"distance_boundary_override"'));
check("roleplay failover has one bounded interaction deadline",
  edge.includes("VELVET_ROLEPLAY_DEADLINE_V282") && edge.includes("const deadlineAt = Date.now() + 24000") && edge.includes("Math.min(16000, remainingMs)"));
check("generation skips redundant cancellation read-back",
  edge.includes("VELVET_SPEED_V282") && !edge.includes("if (await isGenerationCancelled(cancellationAdmin, generationId, userData.user.id)) {\n        return cancelledResponse();"));
check("prompt context is capped for faster first token",
  edge.includes(".limit(50)") && edge.includes("messages.slice(-12)") && edge.includes("messages.slice(-32, -12)"));
check("model streams reply scene continuity development and memories in one request",
  edge.includes('required: ["reply", "turn_reading", "canon_claims", "voice_plan", "continuity_note", "scene_update", "continuity_update", "cast_updates", "development_update", "memory_updates"]') &&
  edge.includes("responseMimeType: \"application/json\"") &&
  edge.includes("streamGenerateContent?alt=sse") &&
  edge.includes("result.scene_update") && edge.includes("result.development_update") && edge.includes("result.memory_updates"));
check("the same request plans turn meaning or opening intent and audits canon",
  edge.includes("turn_reading:") &&
  edge.includes("literal social meaning of the latest user turn") &&
  edge.includes("fresh opening") &&
  edge.includes("canon_claims: a list of every off-screen or historical factual claim") &&
  edge.includes('canon_claims: { type: "array", items: { type: "string" } }'));
check("no background story-model calls consume extra quota",
  !edge.includes("updateStoryStateInBackground") &&
  !edge.includes("updateConversationSummaryInBackground") &&
  !edge.includes("extractMemoriesInBackground"));
check("advisory style issues never spend a repair call",
  edge.includes("const blocking = repairTriggerIssues(validationIssues)") &&
  edge.includes("if (blocking.length)") &&
  !edge.includes("if (validationIssues.length) {\n      const repaired"));
check("Gemini primary and two fallbacks are configurable",
  edge.includes('Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash"') &&
  edge.includes('Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash-lite"') &&
  edge.includes('Deno.env.get("GEMINI_EMERGENCY_MODEL") || "gemini-3.1-flash-lite"'));
check("rate-limit errors do not falsely claim the daily free tier is exhausted",
  edge.includes("Gemini is rate-limited right now") &&
  !edge.includes("The free AI limit was reached. Try again later."));
check("structured runtime and live stream telemetry are present",
  edge.includes('console.log("[character-chat] generation started"') &&
  edge.includes('type: "model"') && edge.includes('liveStreaming: true') &&
  edge.includes('[character-chat] live stream failed'));

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
  chatsContext.includes("story_engine_version: 12"));
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
check("development state is returned and saved in the same live generation path",
  edge.includes("update: result.development_update") &&
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
  characterModal.includes("Complete draft created. Velvet filled the deep profile for you.") &&
  characterModal.includes("nothing is saved until you choose Create or Start chatting."));
check("complete character creation is fast bounded and has model failover",
  edge.includes("deadlineMs = 28000") &&
  edge.includes("deadlineMs: 22000") &&
  edge.includes('thinkingConfig: { thinkingLevel: "MINIMAL" }') &&
  edge.includes("GEMINI_EMERGENCY_MODEL") &&
  edge.includes('maxOutputTokens: 2300') &&
  charactersContext.includes("timeout: 32000"));
check("character creation exposes actionable upstream errors",
  charactersContext.includes("readCharacterFunctionError") &&
  charactersContext.includes("response.clone().text()") &&
  edge.includes('[character-chat] character tool model failed') &&
  edge.includes('[character-chat] character tool attempt ended'));
check("AI character drafts can be stopped or regenerated before save",
  characterModal.includes("stopCharacterGeneration") &&
  characterModal.includes("Regenerate") &&
  characterModal.includes("generationAbortRef.current?.abort()") &&
  characterModal.includes("handleRegenerateQuickDraft"));
check("Quick Create keeps advanced character depth while hiding field overload",
  characterModal.includes("ONE IDEA IS ENOUGH") &&
  characterModal.includes("Deep profile complete") &&
  characterModal.includes("Fine-tune manually") &&
  characterModal.includes("StudioSection step=\"depth\""));
check("Duplicate and remix requests a new identity instead of cloning prose",
  characterModal.includes("Create a NEW original character") &&
  characterModal.includes("Do not copy the name, exact backstory, exact personality, dialogue, or relationship") &&
  characterModal.includes("buildRemixSeed"));
check("Quick variations produce a new character from a compact direction",
  characterModal.includes("handleQuickVariation") &&
  characterModal.includes("Variation direction") &&
  characterModal.includes("Preserve the level of depth, not the identity"));
check("existing profiles can be organized without changing facts",
  charactersContext.includes("organizeCharacterDraft") &&
  edge.includes("Do not invent, delete or change facts") &&
  characterModal.includes("Organize profile"));
check("rewind and clean branches clear derived character development",
  (chatsContext.match(/character_development: \{\}/g) || []).length >= 3 &&
  chatsContext.includes("characterDevelopment: {}"));

check("explicit return-main POV control is hidden and reaches the narrative engine",
  chat.includes('const RETURN_MAIN_POV_MESSAGE = "[RETURN_MAIN_POV]"') &&
  chat.includes("returnToMainPov ? RETURN_MAIN_POV_MESSAGE") &&
  edge.includes('text.startsWith("[RETURN_MAIN_POV")') &&
  edge.includes('kind = "return_main_pov"'));

check("reading mode is persistent and has a dedicated calm UI",
  chat.includes('localStorage.getItem("velvet_reading_mode")') &&
  chat.includes('localStorage.setItem("velvet_reading_mode"') &&
  chat.includes("chat--reading") &&
  v17Styles.includes(".chat--reading"));

check("mobile composer is keyboard-safe and sixteen-pixel input avoids iOS zoom",
  v17Styles.includes("--velvet-keyboard-offset") &&
  v17Styles.includes("font-size: 16px") &&
  v17Styles.includes("env(safe-area-inset-bottom"));

check("memory v1.7 adds canon reasons and supersession",
  memoryV17Migration.includes("is_canon boolean not null default false") &&
  memoryV17Migration.includes("why_remembered text") &&
  memoryV17Migration.includes("superseded_at timestamptz") &&
  memoryV17Migration.includes("superseded_by uuid"));

check("automatic memories merge semantically instead of stacking exact duplicates",
  edge.includes("async function mergeAutomaticMemories") &&
  edge.includes("function memorySimilarity") &&
  edge.includes("why_remembered") &&
  edge.includes("superseded_at"));

check("automatic memory contract only learns from visible user turns",
  edge.includes("visible user turn only") &&
  edge.includes("Never store facts invented by the character reply") &&
  edge.includes("replaces"));

check("canon memories are surfaced and protected in both memory UIs",
  memoryBook.includes("is_canon") &&
  memoryBook.includes("Why Velvet remembers this") &&
  memoriesPage.includes("toggleCanon") &&
  memoriesPage.includes("ShieldCheck"));

check("Character Studio supports progressive depth and per-section AI polish",
  characterModal.includes('StudioSection step="depth"') &&
  characterModal.includes("What makes them human?") &&
  characterModal.includes("How can they change without losing themselves?") &&
  characterModal.includes("Polish section") &&
  charactersContext.includes("enhanceCharacterFields") &&
  edge.includes("focusFields"));

check("STOP cancellation is checked on every streamed chunk",
  !edge.includes("chunkIndex % 4") &&
  edge.includes("isGenerationCancelled"));

check("v1.8 scene intelligence is returned and persisted without a second AI pass",
  edge.includes("scene_update: a strict physical-continuity object") &&
  edge.includes("function applySceneContinuity") &&
  edge.includes("update.scene_state = nextPhysicalState.scene") &&
  edge.includes("update.cast_state = nextPhysicalState.cast") &&
  edge.includes("const sceneChanged = Boolean(sceneUpdate?.scene_changed)") &&
  !edge.includes("generateSceneState"));
check("scene intelligence enforces hearing and physical presence",
  edge.includes("Physical continuity is binding. Bodies obey space") &&
  edge.includes("can only hear, see or answer something they were physically or digitally able to receive") &&
  edge.includes("Never teleport a character"));
check("voice engine preserves character-specific rhythm and avoids generic romantic voice",
  edge.includes("PASS THE BLIND-VOICE TEST") &&
  edge.includes("Sentence length, rhythm, vocabulary, humor, conflict and affection") &&
  edge.includes("Do not equalize everyone into polished banter") &&
  edge.includes("Scan the immediate history for repeated openings"));
check("memory v1.8 records the visible source user message",
  memoryV18Migration.includes("source_message_id uuid") &&
  memoryV18Migration.includes("source_excerpt text") &&
  edge.includes("source_message_id: cleanId(sourceMessageId)") &&
  edge.includes("source_excerpt: cleanPromptValue(sourceExcerpt"));
check("relationship pulse is derived from evidence-bound development state",
  edge.includes("function relationshipStateFromDevelopment") &&
  edge.includes("update.relationship_state = relationshipStateFromDevelopment") &&
  relationshipDrawer.includes("CURRENT DYNAMIC"));
check("diagnostics separates Edge health from optional Gemini probe",
  edge.includes('action === "diagnostics"') &&
  edge.includes("async function handleDiagnostics") &&
  edge.includes("probeAi") &&
  diagnosticsPage.includes("The normal check does not spend a Gemini generation"));
check("generation telemetry exposes model and repair status in the same stream",
  edge.includes("model,") &&
  edge.includes("repairUsed,") &&
  edge.includes("learnedMemoryCount") &&
  chatsContext.includes("velvet_ai_session_v18") &&
  chatsContext.includes("lastModel"));
check("Character Studio draft autosave never server-saves before explicit Save",
  characterModal.includes("velvet_character_draft_v18_") &&
  characterModal.includes("localStorage.setItem(draftStorageKey") &&
  characterModal.includes("nothing is saved until you choose Create or Start chatting."));
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

const aiRomanceStack = `Rowan's jaw tightens as his grip shifts on the umbrella. His gaze snaps toward the group, his voice dropping an octave. He steps between her and Chloe, protective instinct taking over. "Let her try."`;
check("naturalism doctor catches stacked AI-romance body language", helpers?.hasStockBodyLanguageStack(aiRomanceStack));
check("naturalism doctor catches unsupported attention-seeking accusations", helpers?.hasUnsupportedMotiveEscalation(`Rowan scoffed. "Stop trying to be the center of attention for their benefit."`, "Funny"));
check("literal user motive does not trigger the unsupported-motive guard", !helpers?.hasUnsupportedMotiveEscalation(`"So you were trying to make me jealous?"`, "I was trying to make you jealous"));
check("user-created physical distance cannot be overridden for tension", helpers?.hasDistanceBoundaryOverride(`Rowan catches her wrist and steps closer. "Don't."`, `*I nudge you, creating space between us*`));
check("a genuine slip still permits a safety catch", !helpers?.hasDistanceBoundaryOverride(`Rowan catches her by the elbow before she hits the ground.`, `*I slip in the mud and pull away by accident*`));
check("ordinary social tension cannot become bodyguard choreography", helpers?.hasSocialTensionOverEscalation(`He steps between her and the approaching group, blocking their line of sight. "Let her try."`, `Your friends are coming over with the girl you're supposedly dating.`));
check("naturalism failures trigger one bounded repair", edge.includes('"stock_body_language_stack"') && edge.includes('"recycled_stock_gesture"') && edge.includes('"unsupported_motive_escalation"') && edge.includes('"distance_boundary_override"') && edge.includes('"social_tension_overescalation"'));
check("prompt uses react-dont-invent social naturalism", edge.includes("SOCIAL NATURALISM — REACT, DON'T INVENT") && edge.includes("choose the least inflammatory reading") && edge.includes("respect that distance"));
check("ordinary social tension is not promoted into bodyguard drama", edge.includes("bodyguard choreography") && edge.includes("Hyperbole such as “she'll kill me” is not proof of literal danger"));
check("side characters are treated as people rather than jealousy props", edge.includes("Side characters who are visibly present are people, not scenery"));
check("short roleplay beats are explicitly allowed", edge.includes("Shorter is better when the social beat already lands"));
check("repeated stock gestures across turns trigger the naturalism doctor", helpers?.hasRecycledStockGesture(`Rowan's jaw tightens. "Fine."`, [`His jaw clenches before he answers. "Whatever."`, `Rowan's grip tightens and his jaw sets. "Sure."`]));
check("Too AI feedback maps to a concrete naturalism directive", chat.includes('["too_ai", "Too AI / scripted"]') && edge.includes('["too_ai", "Make the turn less scripted:'));


check("hidden feelings keeps strong inner emotion without forcing visible obsession",
  edge.includes("HIDDEN FEELINGS — FEEL MORE THAN YOU SHOW") &&
  edge.includes("Strong private emotion is welcome") &&
  edge.includes("Romantic attention is not obsession") &&
  edge.includes("Pursuit must vary"));
check("meaningful physical tells remain allowed instead of being blanket-banned",
  edge.includes("Do not erase useful physical tells such as a tightened jaw") &&
  edge.includes("Use them when they reveal NEW information"));
check("living cast persists named secondary characters",
  edge.includes("LIVING CAST — SECONDARY CHARACTERS HAVE CONTINUITY") &&
  edge.includes("keep them participating until they visibly leave") &&
  edge.includes("Flirting is a real social interaction"));
check("cast continuity has a durable structured update channel",
  edge.includes("cast_updates") && edge.includes("personality_note") && edge.includes("last_interaction") && edge.includes("castUpdates: result.cast_updates"));
check("dialogue naturalness limits sarcasm and rhetorical debate prose",
  edge.includes("Sarcasm is seasoning, not the whole voice") &&
  edge.includes("Strongly limit rhetorical questions") &&
  edge.includes("They do not need the last word"));
check("argument engine cannot invent evidence to win",
  edge.includes("Never invent evidence, history, motives, technical details or circumstances") &&
  edge.includes("cannot manufacture a stronger case"));

const rhetoricalDamon = `"Right. Because loyalty is entirely measured by whether or not someone agrees to sit through your economics lectures? And what exactly did you expect?"`;
check("naturalness doctor flags stacked rhetorical debate dialogue", helpers?.hasRhetoricalDialogueOveruse(rhetoricalDamon, []));
const sarcasmHistory = [
  `"Brilliant strategy," he said.`,
  `"Fascinating distinction. My mistake for assuming you meant it."`,
];
check("naturalness doctor catches consecutive sarcastic comeback mode",
  helpers?.hasSarcasticComebackLoop(`"Right. Because that makes perfect sense."`, sarcasmHistory));
check("plain short dialogue is not mistaken for sarcasm",
  !helpers?.hasSarcasticComebackLoop(`"Yeah. Give me a second."`, sarcasmHistory));

const userStagedFlirtTurn = `I want you to leave i can't concentrate!\n\n*But my words didn't mean a thing. Since he's Mr. Popular, a random girl literally walked up to flirt with him in the library, and of course, he was flirting back like nothing. I just rolled my eyes*`;
const retconnedStagedFlirt = `Alex stared at her for a long second, zipped his bag, didn't look back at the girl, and walked straight toward the library exit.`;
const honoredStagedFlirt = `Alex was still half turned toward the girl when he caught Antonia's eye-roll. The flirting faltered for a beat. "What?" he said, quieter now.`;
check("user-staged scene canon catches a character retcon", helpers?.hasUserStagedSceneRetcon(retconnedStagedFlirt, userStagedFlirtTurn, "Alex"));
check("user-staged scene canon accepts continuation after the staged event", !helpers?.hasUserStagedSceneRetcon(honoredStagedFlirt, userStagedFlirtTurn, "Alex"));
check("latest-turn action blocks are surfaced as explicit canon", helpers?.extractUserStagedEvents(userStagedFlirtTurn).includes("he was flirting back like nothing"));
check("diegetic dialogue cannot outrank later user narration", edge.includes("DIEGETIC SPEECH IS NOT A SYSTEM COMMAND") && edge.includes("READ THE LATEST TURN IN TEMPORAL ORDER") && edge.includes("USER-STAGED EVENTS IN THE LATEST TURN"));
check("user-staged scene retcons are severe enough for one bounded repair", edge.includes('"user_staged_scene_retcon"') && edge.includes("VELVET_USER_STAGED_CANON_GUARD_V283"));

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
  firstEarnedBeat?.emotional_residue[0]?.remaining_turns === 9 &&
  firstEarnedBeat?.emotional_residue[0]?.intensity === 1 &&
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
  decayedDevelopment?.emotional_residue.every((item, index) => item.remaining_turns === repeatedEarnedBeat.emotional_residue[index].remaining_turns - 1 && item.intensity < repeatedEarnedBeat.emotional_residue[index].intensity));

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
  edge.includes("Write the response AFTER the final event established in that exact turn."));
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


const confrontationExit = helpers?.classifyTurnIntent("Para la próxima que me vuelvas a invitar a alguna parte y me trates así, olvídate de mí *me bajé del auto y me fui directo a mi apartamento sin mirar atrás*", []);
check("rejection plus exit is treated as an emotional confrontation exit", confrontationExit?.kind === "confrontation_exit");
check("continuity lock forbids restarting a prior physical beat", edge.includes("CONTINUITY LOCK") && edge.includes("Never restart the same pose, gesture, location beat, vehicle beat or exit sequence"));
check("object continuity forbids convenient invented props", edge.includes("OBJECT CONTINUITY") && edge.includes("Never improvise a convenient basket, bag, gift, note, meal, parcel or similar prop"));
check("emotional priority never outranks later user-staged canon", edge.includes("EMOTIONAL PRIORITY") && edge.includes("it NEVER outranks later user-authored scene facts"));
check("repeated recent openings are detected without forcing a second model call", edge.includes('issues.push("repeated_recent_signature")') && !edge.slice(edge.indexOf("const REPAIR_TRIGGER_ISSUES"), edge.indexOf("function blockingNarrativeIssues")).includes('"repeated_recent_signature"'));
check("mature mode reaches the narrative engine", edge.includes("mature_mode=${character.mature_mode ? \"on\" : \"off\"}") && edge.includes("MATURE CONTENT MODE") && edge.includes("mature_mode"));
check("mature mode preserves consent age and non-graphic boundaries", edge.includes("never overrides consent") && edge.includes("under 18") && edge.includes("fade to black"));
check("v2.3 story intelligence migration persists recap and continuity ledger",
  storyIntelligenceMigration.includes("intelligence_state jsonb") &&
  storyIntelligenceMigration.includes("story_recap text") &&
  storyIntelligenceMigration.includes("conversations_story_intelligence_idx") &&
  storyIntelligenceMigration.includes("story_engine_version set default 11"));
check("Chat Intelligence 2.0 tracks objects knowledge commitments and stakes in the same generation",
  edge.includes("CHAT INTELLIGENCE 2.0") &&
  edge.includes("OBJECT LEDGER") &&
  edge.includes("KNOWLEDGE BOUNDARY") &&
  edge.includes("COMMITMENT BOUNDARY") &&
  edge.includes("result.continuity_update") &&
  edge.includes("applyIntelligenceContinuity"));
check("continuity ledger is saved and returned without a second AI call",
  edge.includes("update.intelligence_state = applyIntelligenceContinuity") &&
  edge.includes("intelligenceState: update.intelligence_state") &&
  chatsContext.includes("intelligenceState") &&
  !edge.includes("extractContinuityInBackground"));
check("smart regeneration has immediate emotional and continuity corrections",
  edge.includes('["too_cold",') && edge.includes('["too_romantic",') && edge.includes('["wrong_continuity",') &&
  chat.includes("Too cold") && chat.includes("Too romantic") && chat.includes("Wrong continuity"));
check("automatic memories prioritize durable milestones and allow up to three in the same request",
  edge.includes("confessions, promises, boundaries") &&
  edge.includes("memory_updates.slice(0, 3)") &&
  edge.includes("maxItems: 3") &&
  edge.includes("learnedMemoryCount"));
check("story timeline records only meaningful beats and can build a compact recap",
  edge.includes("timeline_event") && edge.includes("Record only moments worth remembering later") &&
  edge.includes("buildStoryRecap") && edge.includes("update.story_recap") &&
  timelineDrawer.includes("20-second recap") && timelineDrawer.includes("Major story beats"));
check("timeline exposes current scene objects commitments and knowledge",
  timelineDrawer.includes("Established objects") && timelineDrawer.includes("Still unresolved") &&
  timelineDrawer.includes("Who knows what") && storyHubDrawer.includes("Continuity ledger"));

check("v2.4 Group Stories persist a backwards-compatible ensemble cast", storycraftMigration.includes("group_character_ids uuid[]") && storycraftMigration.includes("group_mode boolean") && chatsContext.includes("createGroupConversation") && edge.includes("GROUP STORY CAST"));
check("Group Story branches preserve the full cast", chatsContext.includes("group_character_ids: conversation.groupCharacterIds") && chatsContext.includes("group_title: conversation.groupTitle"));
check("group characters are loaded as independent profiles for generation", edge.includes("groupCharactersResult") && edge.includes("Every listed cast member remains an independent person") && edge.includes("Never merge personalities"));
check("Personas are explicitly isolated per conversation", edge.includes("PERSONA ISOLATION") && edge.includes("Never import a name, background, appearance, job, wealth, family, preference or boundary from another saved persona"));
check("smart lore retrieval ranks names keywords content overlap and cast relevance", edge.includes("function selectRelevantLore(entries, messages, groupCharacters = [])") && edge.includes("normalizedName") && edge.includes("overlap * 2") && edge.includes("slice(0, 12)"));
check("AI message edits preserve the rejected wording as an alternative", chatsContext.includes("async function editCharacterMessageInPlace") && chatsContext.includes('from("message_alternatives").insert') && chatsContext.includes("const updated = await updateMessage"));


check("v2.5 engine version marks Living Story Suite", livingStoryMigration.includes("story_engine_version set default 13") && livingStoryMigration.includes("epistemic ledger"));
check("Character Awareness 3.0 separates knowledge suspicion rumor and forgetting", edge.includes("EPISTEMIC STATUS") && edge.includes("PRIVATE KNOWLEDGE") && edge.includes("OFF-SCREEN BLINDNESS") && edge.includes("SOFT FORGETTING") && edge.includes('enum: ["known", "suspected", "rumor", "forgotten"]'));
check("epistemic status persists in the continuity ledger", edge.includes('status: ["known","suspected","rumor","forgotten"]') && timelineDrawer.includes("knowledgeStatus"));
check("story chapters close only on grounded large transitions", edge.includes("function evolveStoryChapters") && edge.includes("largeJump") && edge.includes("majorSceneBreak") && edge.includes("chapter_number"));
check("chapter state returns through the live generation path", edge.includes("storyChapters: update.story_chapters") && chatsContext.includes("eventData.storyChapters") && chatsContext.includes("eventData.activeChapter"));
check("story dashboard loads recent story memories without another model call", chatsContext.includes('from("memories")') && chatsContext.includes("recentMemories: memoriesResult.data") && storyHubDrawer.includes("Recent memories"));

check("regression shield: impossible location resets remain blocked", edge.includes("CONTINUITY LOCK") && edge.includes("Never restart the same pose, gesture, location beat, vehicle beat or exit sequence"));
check("regression shield: exited characters cannot silently re-enter a scene", edge.includes("exit sequence") && edge.includes("CONTINUITY LOCK") && edge.includes("OFF-SCREEN BLINDNESS"));
check("regression shield: repeated semantic openings remain blocking", edge.includes("repeated_recent_signature") && edge.includes("Never restart a physical beat from the immediately previous character turn"));
check("regression shield: convenient invented props remain forbidden", edge.includes("OBJECT CONTINUITY") && edge.includes("Never improvise a convenient basket, bag, gift, note, meal, parcel or similar prop"));
check("regression shield: off-screen characters stay epistemically blind", edge.includes("OFF-SCREEN BLINDNESS") && edge.includes("EPISTEMIC STATUS"));
check("regression shield: user POV control is still rejected", edge.includes("controlsUserPOV") && edge.includes("controls_user_pov") && chat.includes("pov_violation"));
check("regression shield: Next Beat queues without generating immediately", chat.includes("function queueDirectorForNextBeat(event)") && !chat.slice(chat.indexOf("function queueDirectorForNextBeat(event)"), chat.indexOf("function clearQueuedDirector()")).includes("regenerateCharacterReply"));
check("regression shield: Rewrite targets the latest character reply in place", chat.includes("const latestMessage = canonicalMessages.at(-1)") && chat.includes("const targetId = latestMessage.id") && chat.includes("await regenerateCharacterReply(character.id, targetId, instruction, [])"));
check("regression shield: Mature Mode survives reload mapping", chatsContext.includes("matureMode: Boolean(conversation.mature_mode)") && chatsContext.includes("mature_mode: Boolean(conversation.matureMode)"));
check("regression shield: Group Stories keep independent cast identities", edge.includes("Every listed cast member remains an independent person") && edge.includes("Never merge personalities") && chatsContext.includes("group_character_ids"));
check("regression shield: rejected regeneration restores the prior canonical response on failure", chatsContext.includes("The old response remains canonical in the database") && chatsContext.includes("reloadConversationMessages(characterId)"));

check("v2.6.8 continuity doctor blocks silent location teleports", edge.includes("validateContinuityEnvelope") && edge.includes('"location_changed_without_scene_change"') && edge.includes("scene_changed"));
check("v2.6.8 continuity doctor blocks unexplained re-entry", edge.includes('"absent_character_reappeared"') && edge.includes('left|absent|away|outside|exited'));
check("v2.6.8 continuity doctor blocks convenient new plot objects", edge.includes('"invented_plot_object"') && edge.includes("previousIntelligence") && edge.includes("memorySimilarity"));
check("continuity doctor also validates repaired model replies", edge.includes("repairedIssues.push(...validateContinuityEnvelope(repaired"));
check("single dot can stop an active generation instead of being ignored", chat.includes('if (cleanMessage === ".")') && chat.includes("handleStop()"));
check("regenerate rewrite and refine all keep an undo target", chat.includes('label: "Regenerate"') && chat.includes('label: "Rewrite"') && chat.includes('label: "Refine"') && chat.includes("undoReplacement"));

check("v2.6.11 Group Story cast survives the startConversation boundary", chatsContext.includes("{ ...options, requestedConversationId, forceNew }") && chatsContext.includes("groupCharacterIds: uniqueCharacters.map((item) => item.id)") && chatsContext.includes("group_character_ids: groupMode ? groupIds : []"));

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

check("opening reply can regenerate before any user message",
  edge.includes("const openingRegeneration = Boolean(") &&
  edge.includes("!latestUserRecord &&") &&
  edge.includes("if (!latestUserRecord && !openingRegeneration)") &&
  edge.includes("OPENING REGENERATION — NO USER TURN EXISTS YET"));
check("opening regeneration never fabricates a user turn",
  edge.includes("This is a real opening rewrite, not a fake user turn") &&
  edge.includes("There is no user turn to answer yet") &&
  edge.includes("do not pretend ${userIdentity.name} already spoke or acted"));
check("opening regeneration replaces the first character message in place",
  edge.includes("branch.replacementMessage") &&
  edge.includes("replaceCharacterReply({ supabase, conversationId, userId, message: replacementMessage, reply: result.reply })"));
check("opening regeneration resets stale derived scene continuity",
  edge.includes("existingSceneState: openingRegeneration ? {}") &&
  edge.includes("existingCastState: openingRegeneration ? {}") &&
  edge.includes('existingStoryRecap: openingRegeneration ? ""'));
