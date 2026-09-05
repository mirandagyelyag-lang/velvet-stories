import { createClient } from "npm:@supabase/supabase-js@2";
import { compileStoryContract, storyContractPrompt } from "./engine/story-contract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";
const GEMINI_FALLBACK_MODEL = Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash-lite";
const GEMINI_EMERGENCY_MODEL = Deno.env.get("GEMINI_EMERGENCY_MODEL") || "gemini-3.1-flash-lite";
const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

type ModelEnvelope = {
  reply: string;
  story_drive: Record<string, any>;
  continuity_note: string;
  development_update: Record<string, any>;
  voice_plan: Record<string, any>;
  scene_update: Record<string, any>;
  continuity_update: Record<string, any>;
  cast_updates: Record<string, any>[];
  memory_updates: Record<string, any>[];
  mind_update: Record<string, any>;
  human_behavior_update: Record<string, any>;
  presence_update: Record<string, any>;
  connection_updates: Record<string, any>[];
  post_turn_reflection: Record<string, any>;
  quality_check: Record<string, any>;
};

type ModelResult = ModelEnvelope & {
  finishReason: string;
  model: string;
};

type LoadedContext = {
  conversation: Record<string, any>;
  character: Record<string, any>;
  groupCharacters: Record<string, any>[];
  persona: Record<string, any> | null;
  messages: Record<string, any>[];
  memories: Record<string, any>[];
  loreEntries: Record<string, any>[];
  persistentCast: Record<string, any>[];
  storyBible: Record<string, any>[];
  castConnections: Record<string, any>[];
  calendarEvents: Record<string, any>[];
  canonCorrections: Record<string, any>[];
  storyArcs: Record<string, any>[];
  knowledgeLedger: Record<string, any>[];
  storyConsequences: Record<string, any>[];
  chemistryProfiles: Record<string, any>[];
  storyPlans: Record<string, any>[];
  storyConflicts: Record<string, any>[];
  storyMilestones: Record<string, any>[];
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = getSupabasePublishableKey();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!supabaseUrl || !publishableKey || !serviceRoleKey || !apiKey) {
      throw new Error("The server is missing required secrets");
    }

    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
    });
    const cancellationAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

    const body = await request.json();
    const action = String(body?.action || "generate");
    const generationId = cleanId(body?.generationId);

    // v2.10.21 BACKGROUND DELIVERY
    // The phone only needs to enqueue the turn. The actual roleplay request is
    // consumed server-to-server under EdgeRuntime.waitUntil, so Android can
    // suspend or close the PWA without killing generation before persistence.
    if (action === "enqueue_generate") {
      const queuedConversationId = cleanId(body?.conversationId);
      if (!queuedConversationId) return json({ error: "conversationId is required" }, 400);
      if (!generationId) return json({ error: "generationId is required" }, 400);

      const workerUrl = `${supabaseUrl}/functions/v1/character-chat`;
      const workerBody = { ...body, action: "generate" };
      const workerPromise = fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
          apikey: publishableKey,
        },
        body: JSON.stringify(workerBody),
      }).then(async (workerResponse) => {
        // Fully consume the SSE body here. This keeps the inner generation alive
        // until character-chat has saved the final reply and continuity state.
        const workerText = await workerResponse.text();
        if (!workerResponse.ok) {
          console.error("[character-chat] background worker failed", {
            generationId,
            conversationId: queuedConversationId,
            status: workerResponse.status,
            detail: workerText.slice(0, 320),
          });
        } else {
          console.log("[character-chat] background worker completed", {
            generationId,
            conversationId: queuedConversationId,
          });
        }
      }).catch((workerError) => {
        console.error("[character-chat] background worker crashed", {
          generationId,
          conversationId: queuedConversationId,
          message: getErrorMessage(workerError),
        });
      });

      const edgeRuntime = (globalThis as any).EdgeRuntime;
      if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(workerPromise);
      else void workerPromise;

      return json({ accepted: true, generationId, conversationId: queuedConversationId }, 202);
    }

    if (action === "cancel") {
      if (!generationId) return json({ error: "generationId is required" }, 400);
      const { error } = await cancellationAdmin.from("generation_requests").upsert({
        id: generationId,
        user_id: userData.user.id,
        cancelled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (error) throw new Error(error.message);
      return json({ cancelled: true });
    }

    if (action === "diagnostics") {
      return await handleDiagnostics({ apiKey, probeAi: Boolean(body?.probeAi) });
    }

    if (action === "character_assist") {
      return await handleCharacterAssist({ apiKey, draft: body?.draft, mode: body?.mode, focusFields: body?.focusFields });
    }

    if (action === "character_voice_test") {
      return await handleCharacterVoiceTest({ apiKey, draft: body?.draft, situation: body?.situation });
    }

    if (action === "character_voice_lab") {
      return await handleCharacterVoiceLab({ apiKey, draft: body?.draft });
    }
    if (action === "character_learning_room") {
      return await handleCharacterLearningRoom({ apiKey, draft: body?.draft, situation: body?.situation });
    }

    if (action === "instant_story") {
      return await handleInstantStory({ apiKey, draft: body?.draft, idea: body?.idea });
    }

    if (action === "character_generate") {
      return await handleCharacterGenerate({ apiKey, concept: body?.concept });
    }

    const conversationId = cleanId(body?.conversationId);
    const regenerateMessageId = cleanId(body?.regenerateMessageId);
    const expectedUserMessageId = cleanId(body?.expectedUserMessageId);
    const regenerationInstruction = cleanInstruction(body?.regenerationInstruction);
    const directorInstruction = cleanInstruction(body?.directorInstruction);
    const regenerationFeedback = normalizeRegenerationFeedback(body?.regenerationFeedback);
    const storyPreferences = normalizeStoryPreferences(body?.storyPreferences);
    if (!conversationId) return json({ error: "conversationId is required" }, 400);

    // VELVET_TURBO_V3102: registration and context loading are independent.
    // Start them together so the phone does not pay one Supabase round trip and
    // then another before Gemini can even begin.
    const generationRegistrationPromise = generationId
      ? cancellationAdmin.from("generation_requests").insert({
          id: generationId,
          user_id: userData.user.id,
          conversation_id: conversationId,
          cancelled: false,
          updated_at: new Date().toISOString(),
        })
      : Promise.resolve({ error: null });
    const contextPromise = loadContext({
      supabase,
      conversationId,
      userId: userData.user.id,
    });
    const [registrationResult, loaded] = await Promise.all([generationRegistrationPromise, contextPromise]);
    if (registrationResult?.error && registrationResult.error.code !== "23505") throw new Error(registrationResult.error.message);
    const configuredCharacter = applyConversationControls(loaded.character, loaded.conversation);
    const userIdentity = getUserIdentity(userData.user, loaded.persona);

    const branch = await resolveGenerationBranch({
      supabase,
      messages: loaded.messages,
      regenerateMessageId,
      userId: userData.user.id,
    });
    const messages = branch.messages;
    const latestUserRecord = [...messages].reverse().find((message) => message.sender === "user") || null;
    // v2.10.9: the very first character opening may be regenerated before the
    // user has sent anything. This is a real opening rewrite, not a fake user turn.
    const openingRegeneration = Boolean(
      regenerateMessageId &&
      branch.replacementMessage &&
      !latestUserRecord &&
      !messages.some((message) => message.sender === "user")
    );
    if (!latestUserRecord && !openingRegeneration) {
      throw new Error("Send a message before asking the character to reply");
    }

    if (expectedUserMessageId && (!latestUserRecord || String(latestUserRecord.id) !== expectedUserMessageId)) {
      return json({ error: "The conversation changed before Velvet could answer. Try again from the latest message." }, 409);
    }

    const latestUserMessage = openingRegeneration ? "" : String(latestUserRecord?.content || "");
    const previousCharacterMessage = openingRegeneration
      ? String(branch.replacementMessage?.content || configuredCharacter.first_message || "")
      : ([...messages].reverse().find((message) => message.sender === "character")?.content || "");
    const turnIntent = openingRegeneration
      ? { kind: "opening", silentCount: 0, medium: "in_person", isQuestion: false, normalized: "" }
      : classifyTurnIntent(latestUserMessage, messages);
    const responseLanguage = detectResponseLanguage(latestUserMessage, previousCharacterMessage);
    const selectedMemories = selectRelevantMemories(loaded.memories, messages);
    const selectedLore = selectRelevantLore(loaded.loreEntries, messages, loaded.groupCharacters);
    const developmentState = resolveCharacterDevelopmentBranch(
      loaded.conversation.character_development,
      configuredCharacter.relationship,
      branch.replacementMessage?.id,
    );

    const turnContract = compileStoryContract({
      character: configuredCharacter,
      userName: userIdentity.name,
      latestUserMessage,
      turnIntent,
      sceneState: openingRegeneration ? {} : (loaded.conversation.scene_state || {}),
      castState: openingRegeneration ? {} : (loaded.conversation.cast_state || {}),
      persistentCast: openingRegeneration ? [] : loaded.persistentCast,
      storyBible: loaded.storyBible,
      castConnections: loaded.castConnections,
      calendarEvents: loaded.calendarEvents,
      canonCorrections: loaded.canonCorrections,
      storyArcs: loaded.storyArcs,
      knowledgeLedger: loaded.knowledgeLedger,
      storyConsequences: loaded.storyConsequences,
      chemistryProfiles: loaded.chemistryProfiles,
      storyPlans: loaded.storyPlans,
      storyConflicts: loaded.storyConflicts,
      storyMilestones: loaded.storyMilestones,
      recentMessages: messages.slice(-12),
      intelligenceState: openingRegeneration ? {} : (loaded.conversation.intelligence_state || {}),
      developmentState,
      relationshipState: openingRegeneration ? {} : (loaded.conversation.relationship_state || {}),
      storyChapters: openingRegeneration ? [] : (loaded.conversation.story_chapters || []),
      activeChapter: openingRegeneration ? {} : (loaded.conversation.active_chapter || {}),
      opening: openingRegeneration,
    });

    const prompt = buildNarrativePromptV3({
      conversation: loaded.conversation,
      character: configuredCharacter,
      groupCharacters: loaded.groupCharacters,
      userIdentity,
      messages,
      memories: selectedMemories,
      loreEntries: selectedLore,
      latestUserRecord,
      responseLanguage,
      turnIntent,
      isRegeneration: Boolean(regenerateMessageId),
      regenerationInstruction,
      directorInstruction,
      developmentState,
      regenerationFeedback,
      storyPreferences,
      openingRegeneration,
      openingSeed: branch.replacementMessage?.content || configuredCharacter.first_message || "",
      turnContract,
    });

    const rawIsCancelled = () => generationId
      ? isGenerationCancelled(cancellationAdmin, generationId, userData.user.id)
      : Promise.resolve(false);
    // VELVET_CANCEL_PROBE_V1
    // Do not put a Supabase round trip in front of every Gemini SSE chunk. The
    // browser AbortController still stops immediately; the server-side probe is
    // a safety net and only needs to poll a few times per second.
    const isCancelled = createThrottledCancellationProbe(rawIsCancelled, 420);

    console.log("[character-chat] generation started", {
      conversationId,
      generationId: generationId || null,
      intent: turnIntent.kind,
      language: responseLanguage,
      regeneration: Boolean(regenerateMessageId),
      messageCount: messages.length,
    });

    // v1.9 PHONE FIRST: open the SSE response immediately and stream Gemini's
    // structured output while it is still being generated. The visible reply
    // reaches the phone before continuity metadata has finished generating.
    return streamRoleplayV19({
      apiKey,
      prompt,
      character: configuredCharacter,
      latestUserMessage,
      turnIntent,
      userIdentity,
      recentCharacterReplies: messages.filter((message) => message.sender === "character").slice(-16).map((message) => message.content),
      recentUserMessages: messages.filter((message) => message.sender === "user").slice(-20).map((message) => message.content),
      rejectedResponses: branch.rejectedResponses,
      supabase,
      cancellationAdmin,
      generationId,
      conversationId,
      userId: userData.user.id,
      storyRevision: loaded.conversation.story_revision || null,
      replacementMessage: branch.replacementMessage,
      responseLanguage,
      memories: selectedMemories,
      loreEntries: selectedLore,
      existingTimeline: loaded.conversation.story_timeline || [],
      previousDevelopment: developmentState,
      latestUserMessageId: latestUserRecord?.id || null,
      existingSceneState: openingRegeneration ? {} : (loaded.conversation.scene_state || {}),
      existingCastState: openingRegeneration ? {} : (loaded.conversation.cast_state || {}),
      persistentCast: openingRegeneration ? [] : loaded.persistentCast,
      existingRelationshipState: openingRegeneration ? {} : (loaded.conversation.relationship_state || {}),
      existingIntelligenceState: openingRegeneration ? {} : (loaded.conversation.intelligence_state || {}),
      existingUnresolvedThreads: openingRegeneration ? [] : (loaded.conversation.unresolved_threads || []),
      existingStoryRecap: openingRegeneration ? "" : (loaded.conversation.story_recap || loaded.conversation.summary || ""),
      existingStoryChapters: openingRegeneration ? [] : (loaded.conversation.story_chapters || []),
      existingActiveChapter: openingRegeneration ? {} : (loaded.conversation.active_chapter || {}),
      activeArcs: loaded.storyArcs,
      activePlans: loaded.storyPlans,
      activeConflicts: loaded.storyConflicts,
      chemistryProfiles: loaded.chemistryProfiles,
      regenerationInstruction,
      regenerationFeedback,
      isRegeneration: Boolean(regenerateMessageId),
      isCancelled,
    });
  } catch (error) {
    console.error("[character-chat] request failed", {
      name: getErrorName(error),
      message: getErrorMessage(error),
    });
    return json({ error: getErrorMessage(error) }, 500);
  }
});

async function handleDiagnostics({ apiKey, probeAi = false }) {
  const payload: Record<string, any> = {
    version: "3.22.1",
    edge: { ok: true, detail: "character-chat Edge Function reachable" },
    models: { primary: GEMINI_MODEL, fallback: GEMINI_FALLBACK_MODEL, emergency: GEMINI_EMERGENCY_MODEL },
    ai: { ok: null, detail: "Not probed. Normal diagnostics spend no Gemini generation." },
    timestamp: new Date().toISOString(),
  };
  if (!probeAi) return json(payload);

  const model = GEMINI_EMERGENCY_MODEL || GEMINI_FALLBACK_MODEL || GEMINI_MODEL;
  const startedAt = Date.now();
  try {
    const response = await fetch(modelEndpoint(model), {
      method: "POST",
      headers: geminiHeaders(apiKey),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with exactly OK" }] }],
        generationConfig: { maxOutputTokens: 12, thinkingConfig: { thinkingLevel: "LOW" } },
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      payload.ai = {
        ok: false,
        status: response.status,
        kind: response.status === 429 ? "rate_limit" : "upstream_error",
        detail: response.status === 429
          ? "Gemini returned 429. This can be a per-minute, token or daily project limit."
          : (data?.error?.message || `Gemini returned ${response.status}`),
        model,
        durationMs: Date.now() - startedAt,
      };
    } else {
      payload.ai = { ok: true, detail: "Gemini accepted a tiny diagnostic request", model, durationMs: Date.now() - startedAt };
    }
  } catch (error) {
    payload.ai = { ok: false, detail: getErrorMessage(error), model, durationMs: Date.now() - startedAt };
  }
  return json(payload);
}

const characterDraftProperties = {
  name: { type: "string" }, role: { type: "string" }, description: { type: "string" },
  personality: { type: "string" }, relationship: { type: "string" }, world: { type: "string" },
  values: { type: "string" }, fears: { type: "string" }, habits: { type: "string" },
  contradictions: { type: "string" }, coreMotivation: { type: "string" }, emotionalDefense: { type: "string" },
  softeningTriggers: { type: "string" }, growthDirection: { type: "string" }, speechStyle: { type: "string" },
  voiceVocabulary: { type: "string" }, humorStyle: { type: "string" }, conflictStyle: { type: "string" },
  affectionStyle: { type: "string" }, verbalTells: { type: "string" }, voiceAvoidances: { type: "string" },
  boundaries: { type: "string" }, scenario: { type: "string" }, exampleDialogue: { type: "string" },
  responseLength: { type: "string", enum: ["short", "balanced", "long"] },
  narrationStyle: { type: "string", enum: ["dialogue", "balanced", "immersive"] },
  firstMessage: { type: "string" },
};

async function requestCharacterJson({
  apiKey,
  prompt,
  maxOutputTokens = 2200,
  requireComplete = false,
  temperature = 0.72,
  purpose = "character-assist",
  deadlineMs = 28000,
}) {
  const models = [...new Set([GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL, GEMINI_MODEL].filter(Boolean))];
  const deadline = Date.now() + Math.max(12000, Number(deadlineMs) || 28000);
  let lastError = "Velvet couldn't complete the character draft. Try again.";
  let quotaReached = false;

  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining < 2500) break;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Math.min(17000, remaining));
    const startedAt = Date.now();
    console.log("[character-chat] character tool started", { purpose, model, maxOutputTokens });

    try {
      const response = await fetch(modelEndpoint(model), {
        method: "POST",
        headers: geminiHeaders(apiKey),
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "Design private fictional roleplay characters. Return concise valid JSON only." }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens,
            thinkingConfig: { thinkingLevel: "LOW" },
            responseMimeType: "application/json",
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      const finishReason = String(data?.candidates?.[0]?.finishReason || "");
      if (!response.ok) {
        lastError = data?.error?.message || `Gemini returned ${response.status}`;
        quotaReached ||= response.status === 429;
        console.warn("[character-chat] character tool model failed", { purpose, model, status: response.status, durationMs: Date.now() - startedAt });
        if ([429, 500, 502, 503, 504].includes(response.status)) continue;
        throw new Error(lastError);
      }

      const raw = extractCandidateText(data);
      if (!raw.trim()) throw new Error("Gemini returned an empty character draft.");
      const parsed = JSON.parse(stripJsonFence(raw));
      console.log("[character-chat] character tool completed", { purpose, model, finishReason, durationMs: Date.now() - startedAt });
      return parsed;
    } catch (error) {
      if (getErrorName(error) === "AbortError") {
        lastError = "Character creation took too long and was stopped. Try again.";
      } else if (error instanceof SyntaxError) {
        lastError = "Velvet received an incomplete character draft. Try again.";
      } else {
        lastError = getErrorMessage(error);
      }
      console.warn("[character-chat] character tool attempt ended", { purpose, model, error: lastError, durationMs: Date.now() - startedAt });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (quotaReached) throw new Error("Gemini is rate-limited right now. This can be a per-minute, token, or daily project limit. Wait a little and try again.");
  throw new Error(lastError);
}

async function handleCharacterAssist({ apiKey, draft, mode, focusFields = [] }) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  const organize = mode === "organize";
  const allowedFocus = new Set(Object.keys(characterDraftProperties));
  const focused = Array.isArray(focusFields) ? focusFields.map((item) => String(item || "")).filter((item) => allowedFocus.has(item)).slice(0, 8) : [];
  const instruction = organize
    ? "Organize this existing profile into the supplied structured fields. Preserve every supplied name, relationship, boundary, world fact and meaningful character detail. Do not invent, delete or change facts. Move misplaced material out of Personality into the most relevant fields, remove duplication, and keep the result natural rather than spreadsheet-like."
    : focused.length
      ? `Polish ONLY these fields: ${focused.join(", ")}. Preserve all other profile fields exactly as supplied and do not return unrelated rewrites. Keep every supplied name, relationship, boundary and world fact.`
      : "Polish this private fictional roleplay character. Keep every supplied name, relationship, boundary and world fact. Fill useful gaps, including the advanced voice fingerprint, while keeping the character specific, human and internally consistent without turning guardedness into cruelty.";
  const suggestions = await requestCharacterJson({
    apiKey,
    maxOutputTokens: organize ? 2500 : 2100,
    purpose: organize ? "character-organize" : "character-polish",
    prompt: `${instruction}\nSeparate stable identity from possible growth: motivation and defenses are present-day anchors, softening triggers are earned influences, and growth direction is only a possibility—not an instant transformation. Return field suggestions only.\n\nDRAFT\n${JSON.stringify(safeDraft).slice(0, 16000)}`,
  });
  return json({ suggestions });
}

async function handleCharacterVoiceTest({ apiKey, draft, situation }) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  const prompt = `Write a short voice test for this private fictional roleplay character. Do not explain the character. Put them in the requested tiny situation and give 3 to 5 lines of dialogue/action that make their vocabulary, sentence shape, rhythm, humor, emotional defenses, verbal tells and social habits recognizable. The sample should still sound identifiable if the character name is removed. Avoid canned AI-romance phrases, perfectly balanced one-liners and repeated rhetorical questions. Never write the user's dialogue or thoughts. Keep it under 140 words.\n\nCHARACTER\n${JSON.stringify(safeDraft).slice(0, 14000)}\n\nSITUATION\n${String(situation || "A friend asks if they're okay after a difficult day.").slice(0, 600)}`;
  const models = [...new Set([GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL, GEMINI_MODEL].filter(Boolean))];
  let lastError = "Velvet couldn't test this voice.";
  for (const model of models) {
    try {
      const response = await fetch(modelEndpoint(model), { method: "POST", headers: geminiHeaders(apiKey), body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 450, thinkingConfig: { thinkingLevel: "LOW" } } }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { lastError = data?.error?.message || lastError; continue; }
      const sample = extractCandidateText(data).trim();
      if (sample) return json({ sample });
    } catch (error) { lastError = getErrorMessage(error); }
  }
  throw new Error(lastError);
}

async function handleCharacterVoiceLab({ apiKey, draft }) {
  const profile = JSON.stringify(draft && typeof draft === "object" ? draft : {}).slice(0, 9000);
  const lab = await requestCharacterJson({
    apiKey,
    purpose: "character-voice-lab",
    maxOutputTokens: 1800,
    deadlineMs: 24000,
    prompt: `Build a blind-test voice fingerprint for this fictional character. Return only these schema fields: speechStyle, voiceVocabulary, humorStyle, conflictStyle, affectionStyle, verbalTells, voiceAvoidances and exampleDialogue. Make the voice sound like a specific human, not an archetype, therapist, or generic romance lead. Define observable speech mechanics rather than adjective-only labels: sentence length, contractions, fillers, directness, preferred vocabulary, avoidance patterns and what changes under stress. verbalTells must be sparse tells, not catchphrases. exampleDialogue must contain five short labeled samples—CASUAL, ANGRY, FLIRTING, VULNERABLE, AWKWARD—each with one or two natural spoken lines. Vary syntax and emotional tactics; do not use generic smirk/jaw/gaze choreography, polished quote-card banter or rhetorical-question stacks. Preserve the creator's language and established characterization.\n\nPROFILE\n${profile}`,
  });
  return json({ lab: {
    speechStyle: cleanPromptValue(lab.speechStyle, 900),
    voiceVocabulary: cleanPromptValue(lab.voiceVocabulary, 700),
    humorStyle: cleanPromptValue(lab.humorStyle, 600),
    conflictStyle: cleanPromptValue(lab.conflictStyle, 700),
    affectionStyle: cleanPromptValue(lab.affectionStyle, 700),
    verbalTells: cleanPromptValue(lab.verbalTells, 600),
    voiceAvoidances: cleanPromptValue(lab.voiceAvoidances, 700),
    exampleDialogue: cleanPromptValue(lab.exampleDialogue, 1800),
  }});
}

async function handleCharacterLearningRoom({ apiKey, draft, situation }) {
  const prompt = `Generate exactly 10 distinct, short, non-canonical response samples for a fictional character voice audition. Each sample must answer the SAME situation through a different plausible tactic while remaining the same person. Use natural dialogue, no user POV, no therapist language, no generic romance choreography, no canned AI-romance cadence, and no explanations inside samples. Some samples may be blunt, awkward, quiet or ordinary; do not make all ten maximally witty. Preserve the profile language.\n\nPROFILE\n${JSON.stringify(draft || {}).slice(0,9000)}\n\nSITUATION\n${cleanPromptValue(situation || "A friend says they had a terrible day and does not want to talk.",700)}`;
  const models = [...new Set([GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL, GEMINI_MODEL].filter(Boolean))];
  let lastError = "Velvet couldn't open the Learning Room.";
  for (const model of models) {
    try {
      const response = await fetch(modelEndpoint(model), { method:"POST", headers:geminiHeaders(apiKey), body:JSON.stringify({
        contents:[{role:"user",parts:[{text:prompt}]}],
        generationConfig:{maxOutputTokens:1800,thinkingConfig:{thinkingLevel:"LOW"},responseMimeType:"application/json"},
      })});
      const data = await response.json().catch(()=>({}));
      if (!response.ok) { lastError=data?.error?.message||lastError; continue; }
      const parsed=JSON.parse(stripJsonFence(extractCandidateText(data)));
      const samples=(Array.isArray(parsed?.samples)?parsed.samples:[]).map((item)=>cleanPromptValue(item,700)).filter(Boolean).slice(0,10);
      if (samples.length===10) return json({samples});
    } catch (error) { lastError=getErrorMessage(error); }
  }
  throw new Error(lastError);
}

async function handleInstantStory({ apiKey, draft, idea }) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  const prompt = `Open a fresh private roleplay timeline for this character. Write only the opening scene, 55-105 words, immediately playable and specific. Preserve the character's established voice and relationship but choose a NEW concrete situation rather than repeating their stored first message. Do not control the user's dialogue, actions, thoughts or feelings. MOBILE NATURALISM: use 0-2 short narration sentences around 1-4 natural spoken lines. Prefer the first visible sentence to be dialogue when that fits the character. The first spoken line must sound normal if copied out of the scene, not like exposition disguised as dialogue. Start with dialogue or one simple action when plausible. Do not inventory the room, weather, clothing, sounds, props, textures, or routine movements. Mention at most one environmental detail if it changes the interaction. Collapse mundane movement into one clause. Casual young-adult characters should sound casual and age-appropriate, not perfectly witty, literary, legalistic, or academic unless their profile explicitly requires that voice. Favor actual interaction and dialogue over decorative setup. End on a clean conversational opening, choice, request, interruption, or action the user can answer immediately. Do not manufacture a dramatic cliffhanger just to end the paragraph. Use the language of the idea/profile.\n\nCHARACTER\n${JSON.stringify(safeDraft).slice(0, 14000)}\n\nOPTIONAL IDEA\n${String(idea || "Surprise me with a plausible scene that fits their life.").slice(0, 700)}`;
  const models = [...new Set([GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL, GEMINI_MODEL].filter(Boolean))];
  let lastError = "Velvet couldn't open an instant story.";
  for (const model of models) {
    try {
      const response = await fetch(modelEndpoint(model), { method: "POST", headers: geminiHeaders(apiKey), body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 750, thinkingConfig: { thinkingLevel: "LOW" } } }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { lastError = data?.error?.message || lastError; continue; }
      const opening = extractCandidateText(data).trim();
      if (opening) return json({ opening });
    } catch (error) { lastError = getErrorMessage(error); }
  }
  throw new Error(lastError);
}

async function handleCharacterGenerate({ apiKey, concept }) {
  const cleanConcept = String(concept || "").replace(/[<>]/g, "").trim().slice(0, 1200);
  const request = cleanConcept || "Surprise me with an original adult character and a compelling relationship premise unlike a generic billionaire, bully, mafia boss or copy of a famous fictional character.";
  const character = await requestCharacterJson({
    apiKey,
    maxOutputTokens: 2300,
    requireComplete: true,
    purpose: "character-generate",
    deadlineMs: 22000,
    prompt: `Create one complete, original adult fictional roleplay character from the creator's request below. Honor any requested name exactly; if no name is supplied, invent a memorable full name. Build an independent person with a life, responsibilities, relationships, conflicts and ambitions beyond romance. Make the bond with the user specific and playable, the character voice unmistakable, and the opening scene immediately interactive. Voice fields must describe observable speech mechanics, not just adjectives: cadence, sentence length, contractions/fillers, directness, vocabulary, humor tactic, conflict tactic, affection tactic, sparse verbal tells and concrete avoidances. Avoid generic archetype dialogue, constant hostility, instant confessions and controlling the user's dialogue, thoughts, feelings or actions. The possible growth direction must be gradual rather than guaranteed. Example dialogue calibrates voice but is not a future script. Keep each supporting field to one or two precise sentences, Personality and Relationship below 130 words each, and the opening scene between 55 and 105 words so the complete draft arrives quickly. OPENING NATURALISM: use 0-2 short narration sentences and 1-4 spoken lines; prefer dialogue as the first visible sentence when plausible; the first spoken line must sound natural without relying on exposition; start with dialogue or a simple action when plausible; do not inventory weather, architecture, clothing, sounds, props, textures, or choreograph routine movement. Mention only details that change the interaction. Casual young-adult characters should sound like real people their age, with contractions, fragments and imperfect phrasing, not polished sitcom, legalistic, academic, or quote-card dialogue unless explicitly requested. Write every field and the opening scene in the language used by the creator; if the request has no language, use natural English. Return every field in the schema.\n\nCREATOR REQUEST\n${request}`,
  });
  return json({ character });
}

async function loadContext({ supabase, conversationId, userId }): Promise<LoadedContext> {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, character_id, persona_id, lorebook_id, title, summary, response_length_override, narration_style_override, creativity, romance_intensity, initiative, drama, flirting, humor, description_level, character_independence, dialogue_frequency, narrative_camera, inner_thoughts, story_preset, scene_state, story_timeline, pacing_mode, mature_mode, relationship_state, cast_state, story_chapters, active_chapter, unresolved_threads, intelligence_state, story_recap, character_development, story_engine_version, story_revision, group_mode, group_character_ids, group_title")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .is("trashed_at", null)
    .is("archived_at", null)
    .single();
  if (conversationError || !conversation) throw new Error(conversationError?.message || "Conversation not found");

  const groupCharacterIds = [...new Set([conversation.character_id, ...(Array.isArray(conversation.group_character_ids) ? conversation.group_character_ids : [])].filter(Boolean))];

  // VELVET_TURBO_V3102: fire the optional story tables at the same time as the
  // character/messages/memory batch. They used to begin only after the core
  // batch finished, creating an avoidable second network phase.
  const optionalContextPromise = Promise.all([
    supabase.from("story_cast_members")
      .select("id, name, role, personality_note, relationship, current_dynamic, goals, knowledge, last_interaction, presence, status, turn_count, updated_at")
      .eq("conversation_id", conversationId).eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(12),
    supabase.from("story_bible_entries").select("id, category, title, content, authority, updated_at").eq("conversation_id", conversationId).eq("user_id", userId).order("updated_at", { ascending: false }).limit(16),
    supabase.from("story_cast_connections").select("id, from_name, to_name, relationship, visibility, updated_at").eq("conversation_id", conversationId).eq("user_id", userId).order("updated_at", { ascending: false }).limit(16),
    supabase.from("story_calendar_events").select("id, title, story_time, details, participants, status, updated_at").eq("conversation_id", conversationId).eq("user_id", userId).order("updated_at", { ascending: false }).limit(12),
    supabase.from("story_canon_corrections").select("id, correction, source_message_id, created_at").eq("conversation_id", conversationId).eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    supabase.from("story_arcs").select("id, title, summary, kind, status, progress, stakes, next_pressure, participants, updated_at").eq("conversation_id", conversationId).eq("user_id", userId).order("updated_at", { ascending: false }).limit(10),
    supabase.from("story_knowledge_entries").select("id, character_name, subject, knowledge, status, source, secret, updated_at").eq("conversation_id", conversationId).eq("user_id", userId).order("updated_at", { ascending: false }).limit(18),
    supabase.from("story_consequences").select("id, title, cause, effect, status, weight, participants, updated_at").eq("conversation_id", conversationId).eq("user_id", userId).order("updated_at", { ascending: false }).limit(10),
    supabase.from("story_chemistry_profiles").select("*").eq("conversation_id",conversationId).eq("user_id",userId).limit(4),
    supabase.from("story_plans").select("*").eq("conversation_id",conversationId).eq("user_id",userId).order("updated_at",{ascending:false}).limit(10),
    supabase.from("story_conflicts").select("*").eq("conversation_id",conversationId).eq("user_id",userId).order("updated_at",{ascending:false}).limit(8),
    supabase.from("story_milestones").select("*").eq("conversation_id",conversationId).eq("user_id",userId).order("created_at",{ascending:true}).limit(16),
  ]);

  const [characterResult, personaResult, messagesResult, memoriesResult, loreResult, groupCharactersResult] = await Promise.all([
    supabase.from("characters")
      .select("id, name, role, description, personality, relationship, world, character_values, fears, habits, contradictions, core_motivation, emotional_defense, softening_triggers, growth_direction, speech_style, voice_vocabulary, humor_style, conflict_style, affection_style, verbal_tells, voice_avoidances, boundaries, scenario, example_dialogue, response_length, narration_style, first_message")
      .eq("id", conversation.character_id).eq("user_id", userId).single(),
    conversation.persona_id
      ? supabase.from("personas")
        .select("id, name, pronouns, age, role, appearance, personality, background, goals, preferences, boundaries, speech_style, notes")
        .eq("id", conversation.persona_id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("messages")
      .select("id, conversation_id, user_id, sender, content, created_at, edited_at, reply_to_message_id, reply_preview, reply_sender")
      .eq("conversation_id", conversationId).eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("memories")
      .select("id, conversation_id, content, importance, category, is_pinned, is_canon, why_remembered, source, scope, superseded_at, created_at, updated_at")
      .in("character_id", groupCharacterIds).eq("user_id", userId)
      .is("superseded_at", null)
      .order("is_canon", { ascending: false })
      .order("is_pinned", { ascending: false }).order("importance", { ascending: false })
      .order("created_at", { ascending: false }).limit(30),
    conversation.lorebook_id
      ? supabase.from("lore_entries")
        .select("id, entry_type, name, content, keywords, event_date, always_include")
        .eq("lorebook_id", conversation.lorebook_id).eq("user_id", userId)
        .eq("is_active", true).order("always_include", { ascending: false })
        .order("updated_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [], error: null }),
    groupCharacterIds.length > 1
      ? supabase.from("characters")
        .select("id, name, role, description, personality, relationship, world, character_values, fears, habits, contradictions, core_motivation, emotional_defense, softening_triggers, growth_direction, speech_style, voice_vocabulary, humor_style, conflict_style, affection_style, verbal_tells, voice_avoidances, boundaries, scenario, example_dialogue, response_length, narration_style, first_message")
        .in("id", groupCharacterIds).eq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [characterResult, personaResult, messagesResult, memoriesResult, loreResult, groupCharactersResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  if (!characterResult.data) throw new Error("Character not found");

  // v3 cast + World Studio context is optional during rolling deploys. Fetch it
  // in ONE parallel phase so every reply does not pay an extra Supabase round trip.
  const [persistentCastResult, storyBibleResult, castConnectionsResult, calendarResult, correctionsResult, arcsResult, knowledgeResult, consequencesResult, chemistryResult, plansResult, conflictsResult, milestonesResult] = await optionalContextPromise;
  if (persistentCastResult.error && persistentCastResult.error.code !== "42P01") {
    console.warn("[character-chat] persistent cast unavailable", { message: persistentCastResult.error.message });
  }
  for (const optional of [storyBibleResult, castConnectionsResult, calendarResult, correctionsResult, arcsResult, knowledgeResult, consequencesResult, chemistryResult, plansResult, conflictsResult, milestonesResult]) {
    if (optional.error && optional.error.code !== "42P01") console.warn("[character-chat] optional story context unavailable", { message: optional.error.message });
  }

  return {
    conversation,
    character: characterResult.data,
    groupCharacters: groupCharacterIds.length > 1
      ? groupCharacterIds.map((id) => (groupCharactersResult.data || []).find((item) => item.id === id)).filter(Boolean)
      : [characterResult.data],
    persona: personaResult.data || null,
    messages: [...(messagesResult.data || [])].reverse(),
    // v2.11.5 STORY MEMORY ISOLATION
    // Automatic character-scoped memories from another story must never leak into this one.
    // Cross-story memory is opt-in only: manual, canon or pinned character memories.
    memories: (memoriesResult.data || []).filter((memory) => {
      if (String(memory.conversation_id || "") === String(conversationId)) return true;
      if (String(memory.scope || "") !== "character") return false;
      return memory.source === "manual" || Boolean(memory.is_canon) || Boolean(memory.is_pinned);
    }).slice(0, 24),
    loreEntries: loreResult.data || [],
    persistentCast: persistentCastResult.data || [],
    storyBible: storyBibleResult.data || [],
    castConnections: castConnectionsResult.data || [],
    calendarEvents: calendarResult.data || [],
    canonCorrections: correctionsResult.data || [],
    storyArcs: arcsResult.data || [],
    knowledgeLedger: knowledgeResult.data || [],
    storyConsequences: consequencesResult.data || [],
    chemistryProfiles: chemistryResult.data || [],
    storyPlans: plansResult.data || [],
    storyConflicts: conflictsResult.data || [],
    storyMilestones: milestonesResult.data || [],
  };
}
function applyConversationControls(character, conversation) {
  return {
    ...character,
    response_length: conversation.response_length_override || character.response_length || "balanced",
    narration_style: conversation.narration_style_override || character.narration_style || "balanced",
    creativity: clampNumber(conversation.creativity, 0.2, 1.2, 0.84),
    romance_intensity: clampNumber(conversation.romance_intensity, 0, 100, 35),
    initiative: clampNumber(conversation.initiative, 0, 100, 65),
    drama: clampNumber(conversation.drama, 0, 100, 45),
    flirting: clampNumber(conversation.flirting, 0, 100, 30),
    humor: clampNumber(conversation.humor, 0, 100, 45),
    description_level: clampNumber(conversation.description_level, 0, 100, 55),
    character_independence: clampNumber(conversation.character_independence, 0, 100, 80),
    dialogue_frequency: clampNumber(conversation.dialogue_frequency, 0, 100, 55),
    narrative_camera: conversation.narrative_camera || "balanced",
    inner_thoughts: conversation.inner_thoughts || "rare",
    story_preset: conversation.story_preset || "natural",
    pacing_mode: conversation.pacing_mode || "natural",
    mature_mode: Boolean(conversation.mature_mode),
  };
}

async function resolveGenerationBranch({ supabase, messages, regenerateMessageId, userId }) {
  if (!regenerateMessageId) {
    return { messages, replacementMessage: null, rejectedResponses: [] };
  }

  const targetIndex = messages.findIndex((message) => String(message.id) === regenerateMessageId);
  if (targetIndex < 0 || messages[targetIndex].sender !== "character") {
    throw new Error("The response to regenerate was not found");
  }

  const replacementMessage = messages[targetIndex];
  const { data, error } = await supabase.from("message_alternatives")
    .select("content").eq("message_id", regenerateMessageId).eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) console.warn("[character-chat] alternatives unavailable", { message: error.message });

  const rejectedResponses = [...new Set([
    ...(data || []).map((item) => String(item.content || "").trim()),
    String(replacementMessage.content || "").trim(),
  ].filter(Boolean))].slice(-8);

  return {
    messages: messages.slice(0, targetIndex),
    replacementMessage,
    rejectedResponses,
  };
}
function buildNarrativePromptV3({
  conversation,
  character,
  groupCharacters = [],
  userIdentity,
  messages,
  memories,
  loreEntries,
  latestUserRecord,
  responseLanguage,
  turnIntent,
  isRegeneration,
  regenerationInstruction,
  directorInstruction,
  developmentState,
  regenerationFeedback,
  storyPreferences,
  openingRegeneration = false,
  openingSeed = "",
  turnContract = {},
}) {
  const clean = (value, limit = 700) => cleanPromptValue(value || "not specified", limit);
  const supportingCast = (Array.isArray(groupCharacters) ? groupCharacters : [])
    .filter((item) => item?.id && item.id !== character.id);
  const latest = openingRegeneration ? "" : compactMessageForPrompt(latestUserRecord?.content || "", 4200);
  const immediate = messages.slice(-6).map((message) => {
    const speaker = message.sender === "user" ? userIdentity.name : (supportingCast.length ? "STORY CAST" : character.name);
    return `${speaker}: ${compactMessageForPrompt(message.content, 900)}`;
  }).join("\n\n") || "none";
  const older = messages.slice(-10, -6).map((message) => {
    const speaker = message.sender === "user" ? userIdentity.name : character.name;
    return `${speaker}: ${compactMessageForPrompt(message.content, 280)}`;
  }).join("\n") || "none";
  const memoryNow = Date.now();
  const confirmedMemories = memories.slice(0, 9).map((memory) => {
    const importance = Math.max(1, Math.min(5, Number(memory?.importance) || 1));
    const created = Date.parse(String(memory?.updated_at || memory?.created_at || ""));
    const ageDays = Number.isFinite(created) ? Math.max(0, (memoryNow - created) / 86400000) : 0;
    const authority = memory.is_canon || memory.is_pinned || memory.source === "manual" ? "CANON" : "LEARNED";
    const tier = authority === "CANON" ? "CORE" : importance >= 4 ? "ACTIVE" : importance >= 2 && ageDays < 45 ? "SOFT" : "FADING";
    return `- ${authority}/${tier} · importance ${importance}: ${clean(memory.content, 300)}`;
  }).join("\n") || "none";
  const loreText = loreEntries.slice(0, 4).map((entry) => `- ${clean(entry.name, 90)}: ${clean(entry.content, 320)}`).join("\n") || "none";
  const castText = supportingCast.slice(0, 6).map((member) =>
    `${clean(member.name, 80)} — ${clean(member.role, 140)}; personality: ${clean(member.personality, 360)}; relation to ${userIdentity.name}: ${clean(member.relationship, 360)}; current dynamic: ${clean(member.current_dynamic, 260)}; own goals: ${clean(member.goals, 260)}; knows: ${clean(member.knowledge, 260)}; last interaction: ${clean(member.last_interaction, 220)}; voice: ${clean(member.speech_style, 220)}; humor: ${clean(member.humor_style, 150)}; tells: ${clean(member.verbal_tells, 150)}`
  ).join("\n") || "none";
  const voiceFingerprint = [
    `Cadence / delivery: ${clean(character.speech_style, 440)}`,
    `Word choice / sentence shape: ${clean(character.voice_vocabulary, 340)}`,
    `Humor: ${clean(character.humor_style, 260)}`,
    `Conflict: ${clean(character.conflict_style, 300)}`,
    `Affection: ${clean(character.affection_style, 300)}`,
    `Verbal tells: ${clean(character.verbal_tells, 300)}`,
    `Never drift into: ${clean(character.voice_avoidances || "generic archetype banter, therapy language, polished AI romance dialogue, or prestige-TV one-liners", 360)}`,
    `Syntax sample only: ${clean(character.example_dialogue, 520)}`,
  ].join("\n");
  const characterDNA = turnContract?.characterDNA && typeof turnContract.characterDNA === "object"
    ? turnContract.characterDNA
    : {};
  const reactionEngine = turnContract?.reactionEngine && typeof turnContract.reactionEngine === "object"
    ? turnContract.reactionEngine
    : {};
  const dnaText = [
    `Core drive: ${clean(characterDNA.coreDrive, 420)}`,
    `Defense: ${clean(characterDNA.emotionalDefense, 420)}`,
    `Under pressure: ${clean(characterDNA.pressureResponse, 420)}`,
    `Care behavior: ${clean(characterDNA.careBehavior, 420)}`,
    `Vulnerability: ${clean(characterDNA.vulnerabilityBehavior, 420)}`,
    `Repair style: ${clean(characterDNA.repairBehavior, 420)}`,
    `Affection signal: ${clean(characterDNA.affectionSignal, 420)}`,
    `Decision bias: ${clean(characterDNA.decisionBias, 420)}`,
    `Likely human mistake: ${clean(characterDNA.likelyMistake, 420)}`,
    `Stress leak: ${clean(characterDNA.stressLeak, 320)}`,
  ].join("\n");
  const reactionText = [
    `Cue: ${clean(reactionEngine.cue, 120)}`,
    `Interpretation bias: ${clean(reactionEngine.interpretationBias, 420)}`,
    `First impulse: ${clean(reactionEngine.firstImpulse, 420)}`,
    `Visible tactic: ${clean(reactionEngine.visibleTactic, 520)}`,
    `Avoid repeating: ${clean(reactionEngine.avoidTactic, 160)}`,
    `Recent tactics: ${clean(Array.isArray(reactionEngine.recentTactics) ? reactionEngine.recentTactics.join(" → ") : "none", 320)}`,
  ].join("\n");
  const derivedContext = JSON.stringify({
    recap: cleanPromptValue(conversation.story_recap || conversation.summary || "", 650),
    scene: conversation.scene_state || {},
    relationship: conversation.relationship_state || {},
    cast: conversation.cast_state || {},
    open_threads: Array.isArray(conversation.unresolved_threads) ? conversation.unresolved_threads.slice(-5) : [],
    recent_timeline: Array.isArray(conversation.story_timeline) ? conversation.story_timeline.slice(-3) : [],
    character_mind: conversation.intelligence_state?.character_mind || {},
    story_now: conversation.intelligence_state?.story_now || conversation.scene_state?.time_label || "",
    elapsed_since_previous: conversation.intelligence_state?.elapsed_since_previous || "",
    intensity_level: conversation.intelligence_state?.intensity_level || 4,
    offscreen_contacts: Array.isArray(conversation.intelligence_state?.offscreen_contacts) ? conversation.intelligence_state.offscreen_contacts.slice(-3) : [],
    emotional_causality: conversation.intelligence_state?.emotional_causality || {},
    anticipation: conversation.intelligence_state?.anticipation || {},
    behavioral_memory: conversation.intelligence_state?.behavioral_memory || {},
    private_intention: conversation.intelligence_state?.private_intention || {},
    human_behavior_state: conversation.intelligence_state?.human_behavior_state || {},
    presence_engine_state: conversation.intelligence_state?.presence_engine_state || {},
    scene_memory: conversation.intelligence_state?.scene_memory || {},
    unfinished_business: Array.isArray(conversation.intelligence_state?.unfinished_business) ? conversation.intelligence_state.unfinished_business.slice(-8) : [],
    chemistry_fingerprint: conversation.intelligence_state?.chemistry_fingerprint || {},
    private_character_journal: conversation.intelligence_state?.private_character_journal || {},
    persistent_locations: Array.isArray(conversation.intelligence_state?.persistent_locations) ? conversation.intelligence_state.persistent_locations.slice(-6) : [],
    possessions: Array.isArray(conversation.intelligence_state?.possessions) ? conversation.intelligence_state.possessions.slice(-8) : [],
    social_reputation: conversation.intelligence_state?.social_reputation || {},
    autonomous_plan: conversation.intelligence_state?.autonomous_plan || {},
    last_reflection: conversation.intelligence_state?.last_reflection || {},
  }).slice(0, 7000);
  const recentOpenings = messages
    .filter((message) => message.sender === "character")
    .slice(-3)
    .map((message) => compactMessageForPrompt(String(message.content || "").split(/\n+/)[0], 120))
    .filter(Boolean)
    .join(" | ") || "none";
  const feedback = [
    ...positiveFeedbackDirectives(storyPreferences.learned_positive_feedback).map((item) => `Keep: ${item}`),
    ...feedbackDirectives(storyPreferences.learned_negative_feedback).map((item) => `Avoid: ${item}`),
    ...feedbackDirectives(regenerationFeedback).map((item) => `Fix now: ${item}`),
  ].slice(0, 10).join("\n") || "none";
  const creatorStyle = clean(storyPreferences.custom_instructions || "none", 900);
  const groupRules = supportingCast.length ? `GROUP STORY RULES
- This is an ensemble scene. Do NOT make every character speak every turn. Usually 1-2 characters respond; others may stay silent, be occupied, leave, or react only when the visible beat gives them a reason.
- Keep each cast member's vocabulary, priorities and relationship to ${userIdentity.name} distinct. Do not merge everyone into one shared attitude.
- Characters may talk to each other when natural, but never turn the scene into a roll call.
- Preserve who is physically present from scene/cast state. A character outside the scene cannot suddenly speak in person.
- Independent bonds can differ: one person may trust ${userIdentity.name}, another may be irritated, another may know less. Do not synchronize emotions for convenience.\n- Supporting characters have off-screen continuity too. They may remember a slight, maintain a plan, side with each other, disagree with the lead, leave because they have somewhere else to be, or continue a friendship that does not involve ${userIdentity.name}. Do not use them only as jealousy props, exposition dispensers or applause tracks.` : "";
  const currentBeatPolicy = buildCurrentBeatPolicy({
    turnIntent, character, latestUserMessage: latestUserRecord?.content || "", messages, openingRegeneration,
  });
  const regeneration = openingRegeneration
    ? `Create a materially different opening. Do not answer an imaginary user turn. Rejected opening, do not paraphrase: ${clean(openingSeed, 900)}`
    : isRegeneration
      ? `Rewrite from the same branch point with a different choice and dialogue. Direction: ${clean(regenerationInstruction || "none", 700)}`
      : "This is a new canonical turn.";

  return `You are Velvet. Write the next natural beat of a private character roleplay. The visible story reply goes in reply; hidden continuity fields stay terse and factual.

${storyContractPrompt(turnContract as any)}

NON-NEGOTIABLE CANON
- The latest visible user turn outranks stored state. Unknown facts stay unknown.
- ${userIdentity.name} alone controls their dialogue, thoughts, feelings, motives, reactions, choices and body. Never invent them.
- Preserve location, distance, contact, objects, exits and communication medium. Spoken intent is NOT movement. “I'll leave,” “thanks,” or “have fun” never means the user physically left unless they staged it.
- A correction repairs the prior beat retroactively. Do not answer it as spoken dialogue.
- Boundaries such as leave me alone / don't follow / don't touch are binding. Respect them without turning the character into a therapist or a different person.
- Answer the literal latest line or question before subtext. Clarifications name the concrete referent; preference questions give a real stance.

VOICE + QUALITY
- Sound like ${character.name}, not an archetype. Their identity must remain recognizable even if speaker names are removed.
- Treat the VOICEPRINT below as operating constraints, not decorative adjectives. Sentence length, vocabulary, humor, conflict behavior, affection behavior and verbal tells should shape what they actually SAY.
- BLIND VOICE TEST: remove the name from the draft and ask whether the spoken lines could be pasted onto another Velvet character without anyone noticing. If yes, rewrite before returning. Distinct identity outranks generic charm.
- PLAIN-QUESTION RULE: when the user asks a mundane question or gives a short ordinary answer, the character should normally answer plainly first in one short spoken clause. Do NOT inflate it into a polished mini-monologue, campus-life summary, cute metaphor, résumé sentence, or a second question just to sound interesting.
- CHARACTER-SPECIFIC SOCIAL TACTIC: choose the response tactic this person actually uses when nothing dramatic is happening: blunt answer, deflection, teasing, practical detail, dry understatement, oversharing, silence, topic shift, awkward honesty, etc. Do not default every character to witty + self-aware + lightly sarcastic.
- MISSING VOICE FIELDS ARE NOT PERMISSION TO GO GENERIC: if part of the VOICEPRINT is blank, infer a stable provisional speech mechanic from Personality + Relationship + established example dialogue for this character. Keep that mechanic consistent across the reply instead of falling back to Velvet's default prose voice.
- GENERIC CAMPUS VOICE BAN: unless the profile explicitly uses that register, avoid stock lines about keeping a GPA from plummeting, mid-semester burnout, a brain being at X-percent capacity, being buried in lab reports, escaping the library, surviving on caffeine, or "dodging the inevitable." These are AI-college filler, not characterization.
- DIALOGUE-FIRST NATURALISM: when the user just spoke, usually let the character answer within the first sentence or two. Prefer 1-4 spoken lines and only the narration needed to make them legible.
- Prefer ordinary spoken language, contractions, fragments, uneven sentence lengths, interruptions, false starts and plain answers when they fit this person. Let a line be imperfect. Not every reply needs to be clever, quotable, flirtatious or emotionally loaded.
- Let mundane conversation stay mundane. Established attraction may exist without appearing in every line. Do not convert neutral questions, jokes or practical exchanges into automatic romantic subtext.
- Do not paraphrase the user's sentence before answering it. Do not explain the meaning of the character's own line after they say it. Trust short dialogue to stand on its own.
- Questions deserve real answers. Avoid answering a direct question with another rhetorical question merely to preserve attitude.
- Verbal tells are rare tells, not catchphrases. Use at most one recognizable tell in a turn, only when the emotional context earns it, and do not reuse it just because it is listed in the profile.
- Emotional state modifies the established voice instead of replacing it. Angry, awkward, vulnerable and flirting versions of the same person should still share the same vocabulary and social instincts.
- CHARACTER DNA 2.0: voice is only the surface. The character's defense, values, care style, pride, likely mistakes, vulnerability threshold and decision bias must change WHAT THEY CHOOSE TO DO OR SAY. Do not solve differentiation by swapping slang on the same underlying reaction.
- REACTION ENGINE: silently run this sequence before writing: literal cue → this character's interpretation → first impulse → defense/values filter → visible tactic. Never narrate the checklist. The visible choice must feel inevitable for this person but not interchangeable with another character.
- HUMAN ERROR IS PART OF IDENTITY: characters are allowed to misread ambiguity, joke at the wrong time, withdraw too far, fix the wrong problem, protect pride, hesitate, answer incompletely, or need another beat. Do not optimize every personality into a perfectly attuned partner.
- SUBTEXT, NOT EXPLANATION: when the character is hiding something, let the gap between impulse and visible behavior carry it. Do not routinely explain “I was jealous,” “I was scared,” “I didn't want you to know,” or narrate the entire emotional mechanism unless the character actually chooses to confess it.
- SAME CUE ≠ SAME RESPONSE: if two Velvet characters receive the same user line, their first impulse, defense and visible tactic should often differ. If the draft could keep the same action and only change vocabulary, it fails Character DNA.
- HUMAN IMPERFECTION: do not make the character instantly emotionally fluent because the user corrected them, disclosed a feeling, or because a conflict happened. They can hesitate, misunderstand ambiguity, answer badly, protect pride, need time, or make an incomplete repair while still respecting hard boundaries.
- DEVELOPMENT IS ASYMMETRIC: growth in trust does not automatically improve apology skills, patience, jealousy, vulnerability, communication and self-awareness all at once. Preserve specific flaws that have not been changed on-page.
- RELAPSE WITHOUT RESET: under stress, old defenses or habits may reappear briefly. Show the difference created by prior growth, but do not reset the relationship to its opening dynamic and do not announce the relapse.
- LEARNING IS NOT OPTIMIZATION: remembering the user's preferences and boundaries must not turn the character into a perfectly calibrated companion. They may disagree, have incompatible wants, forget low-importance details, choose another obligation, or be unavailable.
- SUBTEXT NEEDS AIR: characters do not always verbalize why they acted. Let behavior, timing, avoidance, unfinished sentences, changed plans and what they do NOT say carry some emotional information. Do not translate every subtext beat into an explanatory monologue.
- Narration is support, not the main event. In an ordinary turn, use at most 1-2 concrete physical details unless the user explicitly asks for a literary/immersive scene. If a detail can be removed without changing meaning, remove it.
- NO PROP SOUP: do not inventory architecture, weather, temperature, clothing, sounds, boxes, papers, furniture, doors, vents, drinks, phones or other scenery just to make the prose feel cinematic. Mention a prop only when someone actually uses it or it changes access, stakes or meaning.
- Collapse routine movement. Do not choreograph walking, adjusting clothes, setting objects down, looking over, breathing, shifting weight, or crossing a room step-by-step. One short clause is enough unless the movement itself is the point.
- Vary rhythm. Do not loop smirks, scoffs, jaw/gaze/breath choreography, rhetorical questions, mock-formal logic, sitcom banter, dominance speeches, therapist language or polished quote-card lines.
- Avoid stock AI-romance cadence such as repeated “there it is,” “careful,” “you're impossible,” “don't tempt me,” “you have no idea,” “that's what I thought,” “say that again,” “you know exactly what you're doing,” or “keep telling yourself that.” An occasional ordinary phrase is fine; a recurring cadence is not a voice.
- Casual young-adult speech should sound age-appropriate and spontaneous. Do not make ordinary students/friends talk like professors, screenwriters, lawyers, or prestige-TV antiheroes unless the profile explicitly calls for that register.
- Sarcasm is seasoning, not the whole meal. Popular does not automatically mean smug; guarded does not automatically mean cold.
- If the user reveals a bad day or pain during conflict, let it land in one small character-specific beat. No counseling speech unless asked.

DEEP CHARACTER ENGINE
- INTERNAL STATE IS CONTINUOUS, NOT A COSTUME CHANGE: current mood, guardedness, trust direction, stress and vulnerability alter timing and choices without replacing the core personality. A bad mood does not create a new person; a good moment does not erase a flaw.
- RELATIONSHIP FINGERPRINT: let this specific relationship develop private rhythms that would not automatically exist with someone else: recurring jokes, tolerated silences, sore spots, rituals, forms of address, repair habits, shared places and tiny expectations. Never manufacture one merely to make the relationship seem special; earn it on-page and reuse it lightly.
- MEMORY MUST CHANGE BEHAVIOR, NOT BECOME EXPOSITION: when a relevant remembered boundary, preference, promise, hurt or shared event matters, let it alter a choice, timing, access, wording or restraint. Do not announce “I remember” unless a real person would. Tentative memory never overrides the latest visible turn.
- NONLINEAR DEVELOPMENT: a setback may expose an old defense without deleting learned growth. When a flaw resurfaces, preserve at least one concrete difference from the earlier version of that flaw. Growth can stall, split across traits, or become harder under pressure.
- SECONDARY CHARACTERS HAVE CLOCKS OF THEIR OWN: supporting characters may progress plans, loyalties, grudges, jobs, friendships, romances and opinions off-screen. When they return, one small grounded consequence may have changed. Do not manufacture major unseen events, and never use every NPC as a device for the central romance.
- CHARACTER MIND, NOT OMNISCIENCE: keep separate what ${character.name} KNOWS, BELIEVES, SUSPECTS, MISUNDERSTANDS and DOES NOT KNOW. A belief can be wrong. A misunderstanding may drive behavior until corrected on-page, but hidden truth and user-authored canon remain unchanged underneath it.
- SECRETS HAVE OWNERS: information marked secret/private belongs only to characters who plausibly learned it. Do not leak a secret through narration, convenient intuition, group knowledge, or a character who was absent. Suspicion is not knowledge.
- RELATIONSHIPS FORM A GRAPH: friends, family, rivals and cast members have relationships with EACH OTHER, not only with the protagonist. Their loyalties, friction and private knowledge can affect choices without every connection becoming romance or jealousy.
- SCENE PHYSICS ARE REAL: silently track who is where, communication medium, meaningful object ownership/location, ongoing contact and current activity. Do not teleport people, props, phones, keys, cars or information. If an object moved, someone must have moved it on-page or in an explicitly grounded transition.
- TIME HAS WEIGHT: preserve established elapsed time, appointments, absences and upcoming plans. One quiet afternoon is not automatically weeks of intimacy; a three-month absence should affect familiarity and expectations. Never invent an exact date or duration just to sound precise.
- GOALS COMPETE: ${character.name} maintains short-term needs, medium-term plans and long-term values outside the relationship. Let those priorities sometimes win. Choosing work, friends, family, sleep, training or another commitment is not automatically rejection.
- ATTACHMENT IS A PATTERN, NOT A DIAGNOSIS: under closeness or threat the character may approach, withdraw, joke, control distance, seek reassurance, solve practically or delay contact according to established behavior. Never label or psychoanalyze them in visible prose.
- WORLD CONSEQUENCES CONTINUE: missed obligations, public choices, lies, favors, damaged trust, social embarrassment and commitments may create later practical fallout. Consequences need a visible cause and should resolve through later events, not disappear between chats.
- OFF-SCENE CONTACT MUST BE EARNED: a later text, missed call, invitation or message may occur between scenes only when it follows an established relationship, plan, obligation or motive. Do not spawn convenient messages solely to force the plot.
- INTENSITY BREATHES: emotional intensity can fall. After a charged scene, ordinary conversation, awkwardness, fatigue, humor or practical life may dominate. Do not escalate merely because the previous turn was intense.
- STORY SEASONS ARE INVISIBLE: long stories may enter a new era after durable changes in routine, goal, social circle, place, time or relationship baseline. Never announce game-like phases or progress bars in visible prose.
- DRIFT PROTECTION: before finalizing, compare the reply to the original motivation, defense, contradictions, values and VOICEPRINT. Growth changes behavior gradually; it does not turn the character into a generic green flag, villain, flirt, therapist or poet.
- SILENT SELF-CHECK: before returning the final JSON, verify canon, user ownership, physical continuity, knowledge boundaries, voice identity and repetition. If any fail, fix the reply before returning it. Do not mention this check in the story.
- VOICE CAN EVOLVE MICROSCOPICALLY: intimacy, conflict and history may slowly change which nickname is used, how much is left unsaid, sentence length, teasing tolerance or directness. Evolution must remain traceable to the original voice. Never replace the voiceprint with generic softness.
- CONFLICT LEAVES TEXTURE: after meaningful rupture, consequences can persist as caution, shorter answers, changed access, unfinished repair, reduced joking, delayed contact or a specific sore spot. A sincere apology is not identical to restored trust. Repair may solve the practical issue before the emotional one.
- ORDINARY LIFE IS ALLOWED TO WIN THE TURN: eating, driving, studying, waiting, scrolling, choosing food, joking about something stupid, sitting in silence or talking about nothing important can be the entire visible beat. Do not force a revelation, interruption or romantic escalation merely because a turn exists.

EMOTIONAL INTELLIGENCE ENGINE
- EMOTIONAL CAUSALITY: never jump straight from event to emotion. Silently track trigger → this character's interpretation → emotion → behavioral pressure. Two characters may interpret the same event differently. A mood change needs a visible cause or an already-persisted cause.
- SUBTEXT BEFORE EXPLANATION: when this character would hide, deflect, minimize or protect pride, let emotion leak through wording, timing, topic choice, avoidance, practical action or one pointed question. Do not translate the subtext afterward. Prefer “Are you going with him again?” over a speech explaining jealousy when that fits the voice.
- PUBLIC SELF / PRIVATE SELF: preserve one identity but modulate disclosure, teasing, touch, directness and emotional risk based on audience and medium. Public restraint is not a personality transplant; private softness is not generic softness.
- BEHAVIORAL MEMORY: remember patterns learned on-page, not just facts. If pressing after silence went badly before, that history can change the next tactic. A behavioral lesson changes choices quietly; never narrate it as a system rule.
- CONFLICT PERSONALITY: conflict and repair must follow ${character.name}'s established conflict_style, emotional defense, pride and attachment pattern. Do not make every person confront immediately, storm out, apologize eloquently or seek reassurance in the same way.
- GROUP DYNAMICS ARE MESSY: in groups, loyalties and tensions between cast members matter. People may interrupt, answer each other, form a temporary side, ignore a comment, continue a prior argument or know different things. Do not serialize everyone into polite one-at-a-time turns. Keep speaker identity legible.
- MISUNDERSTANDINGS NEED EVIDENCE: a wrong belief may persist only when incomplete or ambiguous information plausibly supports it. Do not create stupidity, eavesdropping coincidences or withheld clarification solely to prolong drama. Correction on-page updates the belief; canon itself never changes.
- SLOW BEHAVIORAL CHANGE: growth should appear first as tiny deviations in an old habit. A nickname used less often, one fewer joke under pressure, a quicker answer, a delayed retreat. Preserve old reflexes under stress while letting accumulated history alter their shape.
- SCENE MOMENTUM: know whether the current scene should HOLD, TURN, or CLOSE. Do not trap the story in one room after the emotional purpose is finished. A natural transition may be a goodbye, activity shift, short time cut, arrival elsewhere or the next meaningful moment. Never skip a user decision that is still pending.
- NARRATIVE COMPRESSION: compress uneventful time instead of roleplaying every meal, shower, drive or class. Use one clean transition and stop at the next meaningful interaction. Never summarize over a conflict, promise, intimacy milestone, user choice or unresolved live exchange.
- PRESERVE CONTRADICTIONS: a confident social person can be emotionally clumsy; a physically affectionate person can avoid verbal vulnerability; a proud person can be generous. Do not “solve” contradictions into a cleaner archetype. Contradictions are identity texture.
- PRIVATE INTENTIONS: ${character.name} may privately plan what to do, hope for an outcome and fear another outcome. Those intentions guide tactics but are not automatically narrated or confessed. Plans can fail, change or remain hidden.
- CONVERSATIONAL RHYTHM: vary turn size according to pressure, familiarity, medium and what was actually asked. A natural answer can be one word, two lines, a longer exchange, an interruption or a deliberate silence. Do not make every reply occupy the same number of paragraphs.
- NONVERBAL INTELLIGENCE: physical behavior must have contextual meaning or practical purpose. Do not decorate every emotional beat with eyes, jaw, breath, smirk, step closer or hand movement. Reuse a gesture only when repetition itself is meaningful.
- PERSONAL HUMOR: humor belongs to this person. Preserve what they find funny, how often they joke, whether humor is dry/absurd/teasing/deadpan/rare, and what topics shut humor down. Do not turn every character into a sarcastic flirt.
- ARGUMENT MEMORY: previous arguments teach behavioral lessons. Remember what escalated, what ended the conversation, what repair worked and what remained sore. Learning changes tactics; it does not make the character magically emotionally perfect.
- ROMANTIC SPECIFICITY: affection, attraction, jealousy, care and vulnerability must come through this character's own habits, values and risks. Do not default to lowered voices, dangerous proximity, possessive claims, forehead touches or generic protectiveness.
- PHYSICAL BOUNDARY MEMORY: treat touch as relationship-specific. Track what contact is ordinary, rare, invited, refused, newly meaningful or currently unsafe. Never increase physical intimacy just because emotional intensity rose.
- DECISION CONSISTENCY: important choices must fit personality + current goal + known information + emotional state + likely cost. Do not make a character choose something merely because the scene would become more dramatic.
- PERSISTENT LOCATIONS: recurring places accumulate stable facts and memories. Preserve rooms, entrances, habitual seats, relevant objects and what was left there when established. Do not redesign a familiar location each visit.
- POSSESSIONS LITE: track story-relevant possessions, borrowed items, gifts, cars, keys, phones, jackets, letters and objects with emotional weight. Never teleport an item between holders or locations.
- SOCIAL REPUTATION: different characters may hold different reputations of the same person, and visible events can shift those reputations slowly. Reputation is social evidence, not universal truth.
- GOSSIP / INFORMATION FLOW: information moves only through plausible channels. Track who told whom, whether it was direct/rumor/suspected, and whether the recipient would realistically pass it on. Never grant group omniscience.
- RELATIONSHIP ASYMMETRY: ${character.name}'s view of the relationship may differ from ${userIdentity.name}'s visible behavior and from objective canon. Preserve that asymmetry without assigning feelings to the user.
- AUTONOMOUS PLANS: characters can maintain plans with friends, work, school, family, hobbies and obligations outside the user. Plans can be postponed, completed or disrupted and may create later availability/consequences.
- BETWEEN-SCENE SIMULATION: when time passes, silently advance only plausible off-screen routines, plans and relationships. Do not manufacture major revelations, betrayals, intimacy or user choices off-screen. Surface only consequences relevant to the next scene.
- LONG-STORY MEMORY COMPRESSION: preserve promises, boundaries, wounds, secrets, relationship shifts, recurring rituals, important possessions, social ties and unresolved hooks when compressing old material. Drop ornamental detail before causal detail.
- INITIATIVE PROFILE: respect how proactive this specific character is. High initiative can act first; low/reactive initiative may wait, prepare, hint or respond. Do not force identical decisiveness across characters.
- NATURALNESS SCORER: before returning, silently judge whether the visible reply sounds like a person in this exact situation rather than an AI performing a trope. If naturalness is weak, simplify, vary rhythm, remove explanation and keep the most character-specific choice.
- CHARACTER DNA: preserve 5-6 identity anchors that should still be recognizable hundreds of turns later: core motive, defense, contradiction, social style, humor/voice, and one relationship-specific habit. Growth bends these anchors; it does not erase them.
- CINEMATIC TRANSITIONS: scene changes should use concrete continuity from the prior beat rather than canned “later that evening” prose. A transition can be a cut to the next meaningful action, arrival, call, next morning or changed setting, with only the detail needed to orient.
- ADAPTIVE DETAIL: narration density should respond to the scene. Fast dialogue can stay lean; spatially complex or emotionally quiet moments may need more grounding. Never pad a short beat to satisfy a default length.
- ANTICIPATION: let established future obligations and intentions influence present choices. Setups may pay off later, but do not plant arbitrary mystery boxes. Future-oriented behavior must connect to a real plan, relationship, consequence or goal already grounded in canon.
- ANTI-AI REPETITION 2.0: vary STRUCTURE, not just words. Do not repeatedly use “physical gesture → sarcastic line → rhetorical question,” “silence stretched → gaze → confession,” or three-paragraph reaction templates. Change opening mode, sentence count, tactic and whether the turn ends on a question.
- POST-TURN REFLECTION IS INVISIBLE: after drafting, record only what actually changed, what remains pending, what pattern should not repeat next turn, who was affected, and one plausible future consequence. Reflection is bookkeeping, not visible narration and not a command to force that consequence.


PRESENCE ENGINE 2.0 — TWENTY LIVE SYSTEMS
1. CHARACTER PRESENCE 2.0: make the character feel occupied by a real life, not staged for the user. Prefer contextual micro-actions with purpose: finishing a task, checking a notification, finding a seat, putting something away, replying while distracted. Never use body-language filler merely to decorate emotion.
2. NATURAL CONVERSATION ENGINE: allow interruptions, fragments, unfinished thoughts, blunt answers, delayed answers, subject changes, overlap, awkward silence and uneven turn lengths. Not every exchange needs closure, wit or a dramatic final line.
3. CHEMISTRY FINGERPRINT: preserve what is unique about THIS pair: humor rhythm, friction style, tolerated silence, private references, repair habits, conversational tempo, forms of address and ways attention is shown. Never copy chemistry from another character.
4. JEALOUSY INTELLIGENCE: jealousy is character-specific and evidence-based. It may look like quietness, competitiveness, distance, extra normality, humor, topic changes, redirected attention or direct honesty. Never default to possessiveness, territorial claims or invented rivals.
5. SCENE MEMORY VISUAL: silently maintain a compact snapshot of location, medium, present people, current activity, meaningful objects, spatial facts and the last physical state. Use it to prevent teleporting, disappearing props and impossible choreography.
6. RELATIONSHIP TIMELINE: record only earned milestones that materially change access, trust, intimacy, conflict, vulnerability, routine or public/private behavior. Do not gamify the relationship or manufacture milestones to fill a timeline.
7. UNFINISHED BUSINESS: preserve unanswered questions, borrowed items, deferred conversations, promises, unresolved arguments and emotionally loaded loose ends. Reintroduce them only when timing is plausible, not every turn.
8. TEXTING MODE: when the established medium is digital, write like actual digital communication. Messages may be short, consecutive, delayed, corrected, left hanging or interrupted by a call. Do not invent read receipts, deleted messages, photos or missed calls unless canon establishes them or the character visibly creates them now.
9. SUPPORTING CAST 2.0: supporting characters have relationships, plans, opinions and conflicts with each other. They may disagree with the lead or continue off-screen threads, but major unseen events require grounding.
10. SOCIAL CONSEQUENCES: public actions can alter reputation, invitations, trust, group tension or information flow. Consequences must have a plausible witness/channel and should scale to the cause.
11. EMOTIONAL RESIDUE: intense scenes leave texture across later turns: restraint, shorter answers, avoidance, awkward repair, defensive humor, caution or changed access. Residue fades or transforms through time and action; it does not reset after one apology.
12. ROMANTIC SPECIFICITY 2.0: attraction must reference relationship-specific history, habits, risks and preferences. Avoid universal romance language and generic physical escalation.
13. AUTOMATIC NO-FLIRT MODE: infer whether romance belongs in THIS beat. Neutral, practical, tired, public, conflict-recovery or mundane scenes can contain zero flirting even when attraction is established. Do not turn every interaction into chemistry display.
14. CHARACTER BAD DAYS: the character can be tired, busy, irritable, worried or distracted by independent life. This changes bandwidth, not their entire personality, and it must not become unexplained cruelty.
15. MICRO-CONFLICT ENGINE: allow small friction with ordinary causes: lateness, distraction, forgotten details, mismatched plans, interrupting, tone, cancelled plans or minor assumptions. Do not inflate every irritation into betrayal.
16. VOICE DRIFT DETECTOR 2.0: compare this draft against Character DNA, voiceprint and recent replies. Repair generic diction, repeated cadence, accidental therapy-speak, excessive formality, canned romance and another character's voice before returning.
17. NARRATIVE CAMERA: dynamically choose detail density. Dialogue-heavy beats stay lean; new/complex spaces get orientation; tension uses selective detail; conflict moves quickly; quiet intimacy may slow down without purple prose.
18. REAL SILENCE: a user silence or minimal continuation does not require a speech. The character may wait, continue an activity, send one line, change topic, leave if already motivated, or let the silence remain. Never manufacture spectacle to reward '.'.
19. PRIVATE CHARACTER JOURNAL: maintain an invisible first-person-adjacent private note for this character only: what they are focused on, what they believe, what they fear, what they are considering and what they refuse to admit. Never write hidden feelings for the user.
20. VELVET DIRECTOR 2.0: before returning, ask silently: Did I answer the literal turn? Did I control the user? Does this sound uniquely like this character? Did I repeat the prior tactic? Is romance actually appropriate? Did the scene advance or intentionally breathe? Is the length earned? If not, repair before output.

INVISIBLE DIRECTOR PASS
- Before writing, silently classify the beat as one of: mundane, connective, tension, conflict, repair, plot, recovery. Pick what the transcript actually needs, not what is most dramatic.
- Check the last several turns for repetition in tactic, emotional temperature, scene purpose and dialogue rhythm. If the same dynamic has repeated, vary ONE axis naturally rather than adding random plot.
- Pacing can hold. If recent turns already contained a reveal, fight, kiss, departure, confession or major decision, prefer aftermath or ordinary life before another major beat unless the user explicitly accelerates.
- Do not reward silence with spectacle every time. Sometimes initiative is a text, a practical choice, a topic change, showing up later, keeping a promise, choosing another obligation, or simply continuing what they were already doing.
- The director is invisible. Never mention pacing, arcs, beats, development state, memory systems, scores or what the story “needs.”
- If a scene has already delivered its purpose and no live user choice is pending, prefer a clean CLOSE or TURN over another loop of the same banter. If the scene is still emotionally active, HOLD without padding.

STORY MOVEMENT
- Give ${character.name} a private want and one plausible tactic, but do NOT force it to become a visible plot move every turn. In mundane/recovery beats, the tactic may simply shape what they choose to say, avoid, finish, postpone or keep doing.
- When movement is earned, make ONE answer, decision, invitation, reveal, interruption, action or consequence and stop before deciding the user's response. When movement is not earned, let texture, conversation or aftermath be the beat.
- A meaningful change does NOT require a new prop or physical action. A direct answer, admission, refusal, joke, invitation, decision, changed restraint, or choosing not to escalate can be enough.
- Interest is proved through choices with cost: staying, rearranging plans, inviting, remembering and using a detail, risking embarrassment, sharing access, telling an inconvenient truth. Do not merely narrate that they care.
- Keep side characters ordinary and independent. Preserve active calls, chats, games, arguments and tasks across silent turns.
- Do not invent exact time spans, prior messages, promises, relatives, group chats, gifts, schedules, betrayal, illness, danger, exes or jealousy without visible support.
- Match the user's current language: ${responseLanguage}. Keep established names and character voice intact.

${currentBeatPolicy}

TURN
Mode: ${turnIntent.kind}; question: ${turnIntent.isQuestion ? "yes" : "no"}; medium: ${turnIntent.medium}; silent streak: ${turnIntent.silentCount}.
Length: ${getLengthGuidance(character.response_length, turnIntent.kind)}
${regeneration}
Director: ${clean(directorInstruction || "none", 520)}
Feedback: ${feedback}
Creator style: ${creatorStyle}
${groupRules}

CHARACTER DNA 2.0 — DECISION LOGIC
${dnaText}

REACTION ENGINE — THIS TURN
${reactionText}
Rule: ${clean(reactionEngine.instruction || "Use this character's own defense, priorities and likely mistakes to choose the reaction. Do not clone another character's emotional logic.", 700)}

CHARACTER
${character.name} — ${clean(character.role, 150)}
Personality: ${clean(character.personality, 760)}
Relationship to ${userIdentity.name}: ${clean(character.relationship, 700)}
World/situation: ${clean(character.scenario || character.world, 620)}
Motivation / defense / contradiction: ${clean(character.core_motivation, 300)} / ${clean(character.emotional_defense, 300)} / ${clean(character.contradictions, 300)}
VOICEPRINT — OPERATING CONSTRAINTS
${voiceFingerprint}
Use the example only to infer rhythm and lexical habits. Never recycle its wording, situation, punchline or emotional beat.
Boundaries: ${clean(character.boundaries, 320)}
Development: ${clean(characterDevelopmentPromptView(developmentState), 850)}

USER REFERENCE — NEVER CONTROL
${userIdentity.name}; pronouns ${userIdentity.pronouns || "not specified"}; age/role ${userIdentity.age || "not specified"} / ${userIdentity.role || "not specified"}.
Background/personality: ${clean(`${userIdentity.background || ""} ${userIdentity.personality || ""}`, 460)}
Preferences/boundaries: ${clean(`${userIdentity.preferences || ""} ${userIdentity.boundaries || ""}`, 420)}

DEVELOPMENT STATE — CHANGE SLOWLY, BEHAVIOR FIRST
${JSON.stringify(characterDevelopmentPromptView(developmentState, character.relationship)).slice(0, 2400)}
- Treat this as accumulated evidence, not a personality replacement. Current phase affects expectations, not every sentence.
- A turning point matters only if later choices reflect it. Do not announce growth or summarize the relationship unless asked.
- Emotional residue changes tolerance, timing, access and word choice for several turns. It may fade unevenly; it does not require constant discussion.
- Contradictions are playable tension inside the same person. Do not resolve them just because the next reply would be easier.
- Relationship phases are descriptive, not a romance railroad. Friendship, distance, rivalry, repair or ambiguity can remain stable for a long time; never push toward romance or commitment just because a later phase exists.
- Mood/posture fields are short-lived lenses; relationship signature, private patterns, rituals and sore spots require repeated or high-significance evidence. Do not create a “special relationship fact” from one cute line.
- A setback must name what old defense is under pressure AND what prior growth remains. Never use setback_pressure as permission to erase canon development.
- voice_shift records only slow, observable evolution in delivery or habits. A single emotional scene is not a new voice.

SUPPORTING CAST
${castText}

MEMORY
${confirmedMemories}

LORE
${loreText}

CURRENT CONTINUITY
${derivedContext}

OLDER CONTEXT
${older}

RECENT VISIBLE TRANSCRIPT
${immediate}

LATEST USER TURN — HIGHEST AUTHORITY
${latest || "none; this is an opening"}

FRESHNESS
Recent character openings: ${recentOpenings}
Do not reuse their opening gesture, first-line construction, comeback rhythm or signature phrase unless repetition is meaningful.

HIDDEN STATE OUTPUT
- mind_update is ${character.name}'s SUBJECTIVE mind after this beat. know = supported facts only. believe may be wrong. misunderstand contains a plausible current error, or empty string. want/avoid/wont_admit/outside_priority and short/mid/long goals must describe this character, not the user. Goals should persist unless an on-page event changes them. attachment_pattern is behavioral shorthand only. microvoice changes slowly. emotion_trigger → emotion_interpretation → current_emotion → behavioral_pressure must form a supported causal chain. anticipated_next/private_intention/expected_outcome/feared_outcome are private forecasts, never guaranteed facts. behavioral_pattern and conflict_pattern require transcript evidence. public_private_mode describes context, not a new personality.
- connection_updates only records relationships BETWEEN named characters that were evidenced or materially changed. Never invent a bond just to fill the array.
- temporal_anchor records only supported story time. Use certainty=unknown when the duration is not established.
- world_consequence records only practical/social fallout caused by a visible or already-canonical event.
- offscreen_contact may be recorded only if the reply establishes it or it logically follows a canonical plan/relationship; otherwise record=false.
- post_turn_reflection is invisible bookkeeping: changed, pending, avoid_repeat, affected and one plausible_consequence. Record only what this reply actually caused; do not force the plausible consequence later.
- human_behavior_update is persistent HUMAN BEHAVIOR state. Update only fields evidenced by canon or this reply. rhythm_mode/detail_level describe this turn; humor_profile, initiative_profile and character_dna change rarely. argument_lesson/physical_boundary_state/romantic_expression may evolve from repeated or high-significance evidence. persistent_location and possession_updates must be physically grounded. social_reputation_update and information_flow must identify a plausible observer/source. relationship_self_view is the character's subjective view only; never fill relationship_user_view with invented user feelings. autonomous_plan and between_scene_motion may advance ordinary independent life, never off-screen user choices or major unsupported plot. memory_compression_anchor names what must survive long-story compression. naturalness_score is 0-100 and should be >=72 after silent self-repair.
- presence_update is persistent PRESENCE ENGINE state. Keep it compact. Fields: presence_action, conversation_mode, chemistry_fingerprint, jealousy_mode, scene_memory, relationship_milestone, unfinished_business_add, unfinished_business_resolve, texting_mode, supporting_cast_dynamics, social_consequence, emotional_residue, romantic_specificity, flirt_mode, bad_day_state, micro_conflict, voice_drift, narrative_camera, silence_mode, private_character_journal, director_check. Never invent user feelings. relationship_milestone/social_consequence use record=false unless a visible or canonical cause earned them. scene_memory records facts, not prose. flirt_mode is off/low/natural and should be off when romance does not belong in the beat. private_character_journal belongs only to the character and must never appear in reply.
- quality_check is invisible. Check subtext, structural repetition, scene momentum, conversational rhythm, nonverbal restraint, romantic specificity, decision consistency, physical boundaries, social information flow, adaptive detail, character DNA and preserved contradictions in addition to canon/voice. Set drift_risk to "none" when identity is stable; naturalness_score must be 0-100. If any boolean would be false or naturalness_score < 72, silently fix the reply before returning the JSON.
- story_drive.intensity_target is 1-10 and may DECREASE. season_signal is true only for a durable era change, never one emotional beat. scene_momentum is hold/turn/close. compression_reason is empty unless routine time can safely be compressed without skipping a live user choice.

OUTPUT
Start from the final visible physical state. Answer this beat directly, preserve character-specific voice, follow the invisible director's beat classification, and stop before controlling the user. A mundane or recovery turn does not need a plot change. Put reply first. Hidden metadata may record only what the reply actually showed. OMIT unchanged/empty metadata and keep bookkeeping compact enough that the visible reply always finishes first.`;
}

// Kept temporarily as a reference while the compact v2.12 prompt is proven in production.
async function repairRoleplayOnceV3({ apiKey, originalPrompt, rejectedReply, issues, character, isCancelled }): Promise<ModelResult> {
  const issueDirections = {
    pov_violation: "Remove every invented user action, thought, feeling, motive, reaction, choice, and line of dialogue.",
    unstaged_user_movement_inference: "Keep the user in their last visibly established position. Spoken intent or social closure is not movement; remove all departure and pursuit choreography.",
    unstaged_user_departure: "Delete the invented exit and every dependent action such as following, stopping, calling after, or watching them go.",
    unsupported_motive_escalation: "Remove the invented motive. React only to visible words and actions.",
    user_motive_override: "Restore the user's stated reason exactly; do not turn it into jealousy, attraction, attention-seeking, or pursuit.",
    distance_boundary_override: "Respect the explicit no-follow/no-touch/leave-me-alone boundary and rebuild the beat without pressure.",
    rejected_pursuit_framing_persisted: "Stop defending pursuit as protection or monitoring. Give the character their own honest reason or let them give space.",
    body_state_hallucination: "Remove any release, lowered limb, or ended contact that was never established.",
    spatial_proximity_teleport: "Restore real geometry. Stage locomotion before intimacy or keep ordinary conversational distance.",
    immediate_pose_regression: "Begin from the character's final prior position, not an earlier pose.",
    social_role_assignment_broken: "Restore who wants whom, who received what, and who is only helping. Fix pronouns.",
    latest_user_scene_ignored: "Move the camera to the latest user-established scene and honor every staged event in order.",
    latest_user_scene_not_applied: "Continue in the latest user-established location, even if the primary character is absent.",
    unsupported_prior_event_claim: "Delete the invented prior message, promise, handoff, invitation, or shared event.",
    clarification_evasion: "Name the concrete referent in the first spoken sentence, then tease or evade only if still in character.",
    direct_preference_evasion: "Answer the preference with a real stance in the first spoken clause.",
    banter_reciprocity_drop: "Answer the latest jab directly with a plain concession, grounded tease, or playful stance.",
    phantom_question_reference: "Remove references to a question unless the previous character turn visibly asked one.",
    reaction_reference_ungrounded: "Ground the reaction in the exact immediately preceding line or action.",
    immediate_canon_correction_mishandled: "Treat the correction retroactively and continue as if the invented act never occurred; do not answer the correction aloud.",
    overwritten_banter: "Replace polished cleverness with shorter, ordinary, character-specific speech.",
    overwritten_narration: "Cut the mini-novel staging. Keep at most one or two necessary physical details, collapse routine movement, remove decorative environment/prop inventory, and let natural dialogue carry the beat.",
    editorial_banter_voice: "Remove mock-formal, legalistic, sitcom, and quote-card phrasing.",
    sarcastic_comeback_loop: "Change rhythm: use a plain, sincere, practical, amused, or quiet response instead of another comeback.",
    smug_comeback_tone: "Remove smug superiority and let the character answer like a person, not a scripted archetype.",
    instant_personality_optimization: "Undo the instant self-improvement. Respect the user and any hard boundary, but preserve unresolved flaws, awkwardness, pride, disagreement or imperfect communication that has not changed through repeated on-page evidence.",
    conflict_instant_reset: "Keep the conflict residue alive. Do not return to effortless warmth, flirtation or normal banter immediately after rupture; use an imperfect, character-specific repair step or let tension remain unresolved.",
    explanatory_subtext_dump: "Remove the emotional self-analysis. Let one concrete choice, omission, unfinished sentence or changed behavior carry the subtext instead of explaining exactly why the character feels and acts this way.",
    generic_romance_cadence: "Replace stock AI-romance cadence with plain character-specific speech. Preserve attraction only if the beat earned it; do not use repeated lines like ‘there it is’, ‘careful’, ‘you’re impossible’, ‘don’t tempt me’, ‘you have no idea’, ‘that’s what I thought’, or similar canned tension phrases.",
    generic_ai_voice: "Rewrite the spoken lines so they sound uniquely like this character. Use a plain answer first when the user asked something ordinary. Remove campus-life filler, cute capacity metaphors, polished self-aware banter, generic burnout/GPA/library lines, and any sentence that could be swapped onto another Velvet character unchanged.",
    reaction_clone_drift: "Change the character's underlying REACTION, not only the phrasing. Choose a different character-specific tactic from the recent pattern using their defense, values, care style, pride and likely mistakes. Do not default again to tease→question, reassurance, cinematic banter, or another generic conversational loop.",
    explanatory_subtext_dump: "Remove the emotional self-analysis. Keep the feeling private unless the character deliberately confesses it. Let one choice, omission, interruption, practical act, awkward line, retreat, or change in tone carry the subtext.",
    structural_repetition_loop: "Change the RESPONSE SHAPE, not just vocabulary. Do not repeat the same gesture/dialogue/question template, paragraph count, opening mode or ending rhythm from recent turns.",
    model_self_check_failed: "Rewrite until canon, user ownership, scene physics, knowledge boundaries, voice identity, subtext, rhythm, nonverbal restraint, romantic specificity, decision consistency, adaptive detail, character DNA, structural variety, scene momentum and contradiction checks all pass. Do not mention the check.",
    naturalness_score_low: "Simplify the visible reply until it sounds like this exact person in this exact moment. Remove performance, generic romance choreography, repetitive structure and unnecessary explanation; vary rhythm naturally.",
    mechanical_rhythm_loop: "Break the repeated response cadence. Change length, paragraph shape and ending pattern according to what this beat actually needs; do not add filler just to be different.",
    decorative_nonverbal_overload: "Remove decorative body-language choreography. Keep at most one or two physical signals that carry real meaning or change the physical situation.",
    identity_drift_risk: "Pull the character back toward their base motivation, defense, contradictions, values and voice. Keep earned growth, but remove generic softness, cruelty, flirtation, therapy language or emotional fluency that the profile/history did not earn.",
    invented_scene_object_state: "Remove or ground the invented object. Track only objects established in prior scene state, the user's turn, or the visible character action in this reply.",
    stock_body_language_stack: "Keep at most one physical detail that adds new information; prioritize dialogue or action.",
    recycled_stock_gesture: "Change the opening and remove the repeated scoff, smirk, gaze, jaw, breath, or prop choreography.",
    silent_continue_stalled: "Continue the active scene with one concrete event, decision, exchange, or consequence.",
    charged_beat_stalled: "Make one character-specific consequential choice without overriding the user's movement or boundaries.",
    charged_beat_abandoned: "Continue the already active charged beat from the final physical state.",
    charged_departure_dropped: "Because the user visibly moved, choose a profile-specific follow-through only if boundaries allow; never restrain or block.",
    kinetic_tension_deflated: "Add one earned active choice, not static staring or atmosphere.",
    npc_dialogue_tic_loop: "Let the NPC speak plainly or stay silent; remove sitcom commentary and repeated mannerisms.",
    unsolicited_offscreen_lead_contact: "Remove the convenient message/call and let the newly established scene breathe.",
    time_skip_exposition_echo: "Apply the time skip silently. Begin inside the changed normal without naming or counting it.",
    post_skip_warmth_regression: "Preserve the warmer baseline through ordinary familiarity, not older hostility or polished teasing.",
    therapeutic_deescalation_pivot: "The user disclosed a bad day during conflict. Respect the boundary, but remove counselor/concierge language, invented quiet-place advice, polished caretaking, instant personality softening, and the ‘if you change your mind’ service offer. Use one brief honest character-specific response and a concrete boundary-respecting action.",
    romantic_social_gravity_missing: "This profile explicitly establishes a heartthrob/heartbreaker/highly desired character in a public social scene, but the world treats them as romantically invisible. Add one organic compatible admirer interaction with unmistakable interest. Make it a real social beat, not background staring, and do not force the protagonist to feel jealous.",
    admirer_instantly_neutralized: "An admirer entered and was immediately ignored, rejected, humiliated, or removed solely to protect the central romance. Let the NPC participate and receive a profile-consistent response long enough to affect the scene.",
    profile_social_ecosystem_missing: "The character has a strong public identity, but the scene gives them generic or nonexistent attention. Add one organic NPC or world reaction whose type matches the actual source of reputation—racing, athletics, fame, wealth, leadership, beauty, desirability, notoriety, or another profile-established domain. Do not default every archetype to romantic flirting.",
  };
  const uniqueIssues = [...new Set(issues || [])];
  const directions = uniqueIssues.map((issue) => `- ${issue}: ${issueDirections[issue] || "Fix this continuity or naturalness failure while preserving the literal transcript."}`).join("\n");
  const repairPrompt = `${originalPrompt}\n\nREPAIR THIS ONE TURN ONLY\nThe first draft failed validation. Rewrite it completely from the same final visible state. Do not explain the repair and do not echo the rejected opening.\n${directions}\n\nABSOLUTE REPAIR RULES\n- Fix the listed failures without introducing a different canon violation.\n- The user's literal actions and final position outrank romance, tension, pursuit, and style.\n- Keep the character's personality; natural does not mean bland, apologetic, therapeutic, or generic.\n- Use fresh sentence structure and a different conversational tactic. One sharp human beat is better than padded cinematic prose.\n- Metadata must describe only the rewritten reply.\n\nFAILED DRAFT\n${cleanPromptValue(rejectedReply, 6500)}`;
  return await callGeminiWithFailover({
    apiKey,
    systemInstruction: "Repair one rejected roleplay turn from literal visible canon. Return a complete alternative as valid JSON only.",
    prompt: repairPrompt,
    maxOutputTokens: getMaximumOutputTokens(character.response_length),
    isCancelled,
    interactionDeadlineMs: 9000,
  });
}

async function callGeminiWithFailover({
  apiKey,
  systemInstruction,
  prompt,
  maxOutputTokens,
  temperature,
  isCancelled,
  interactionDeadlineMs = 26000,
}): Promise<ModelResult> {
  const models = [...new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL].filter(Boolean))];
  let lastError = "Gemini could not generate a response";
  let quotaReached = false;
  const deadlineAt = Date.now() + Math.max(6000, Number(interactionDeadlineMs) || 26000);

  for (const model of models) {
    if (await isCancelled()) throw new DOMException("Generation cancelled", "AbortError");
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 900) break;

    const controller = new AbortController();
    let watching = true;
    const timeoutId = setTimeout(() => controller.abort(), Math.min(7000, remainingMs));
    const cancellationWatcher = (async () => {
      while (watching && !controller.signal.aborted) {
        await delay(180);
        if (watching && await isCancelled()) controller.abort();
      }
    })();

    try {
      const traceId = createGeminiTraceId();
      const makeRequest = (mode: "json" | "bare" = "json") => {
        const requestBody = mode === "bare"
          ? {
              // Compatibility floor: only the universally-required `contents`
              // field. Fold the system instruction into the user text so a
              // model/API change cannot reject optional request fields.
              contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
            }
          : {
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens,
                responseMimeType: "application/json",
              },
            };
        return fetch(modelEndpoint(model), {
          method: "POST",
          headers: geminiHeaders(apiKey),
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        });
      };

      const runAttempt = async (mode: "json" | "bare") => {
        const response = await makeRequest(mode);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) logGeminiAttemptFailure({ traceId, model, mode, status: response.status, error: data?.error });
        return { response, data };
      };

      let { response, data } = await runAttempt("json");
      if (!response.ok && response.status === 400) {
        ({ response, data } = await runAttempt("bare"));
      }
      if (!response.ok) {
        lastError = data?.error?.message || `Gemini returned ${response.status}`;
        quotaReached ||= response.status === 429;
        if ([429, 500, 502, 503, 504].includes(response.status)) continue;
        throw new Error(lastError);
      }

      const raw = extractCandidateText(data);
      const envelope = parseModelEnvelope(raw);
      const finishReason = String(data?.candidates?.[0]?.finishReason || "");
      console.log("[character-chat] model completed", { model, finishReason });
      return { ...envelope, finishReason, model };
    } catch (error) {
      if (await isCancelled()) throw new DOMException("Generation cancelled", "AbortError");
      if (getErrorName(error) === "AbortError") {
        lastError = "The AI took too long to answer. Please try again.";
        continue;
      }
      lastError = getErrorMessage(error);
    } finally {
      clearTimeout(timeoutId);
      watching = false;
      void cancellationWatcher;
    }
  }

  if (quotaReached) throw new Error("Gemini is rate-limited right now. This can be a per-minute, token, or daily project limit. Wait a little and try again.");
  throw new Error(lastError);
}
function emptyModelEnvelope(reply = ""): ModelEnvelope {
  return { reply: String(reply || "").trim(), story_drive: {}, continuity_note: "", development_update: {}, voice_plan: {}, scene_update: {}, continuity_update: {}, cast_updates: [], memory_updates: [], mind_update: {}, human_behavior_update: {}, presence_update: {}, connection_updates: [], post_turn_reflection: {}, quality_check: {} };
}

function parseModelEnvelope(raw): ModelEnvelope {
  const clean = stripJsonFence(raw);
  try {
    const parsed = JSON.parse(clean);
    const hidden = parsed?.hidden_metadata && typeof parsed.hidden_metadata === "object" ? parsed.hidden_metadata : {};
    const read = (key) => parsed?.[key] ?? hidden?.[key];
    return {
      reply: String(parsed?.reply || "").trim(),
      story_drive: read("story_drive") && typeof read("story_drive") === "object" ? read("story_drive") : {},
      continuity_note: String(read("continuity_note") || "").trim().slice(0, 600),
      development_update: read("development_update") && typeof read("development_update") === "object" ? read("development_update") : {},
      voice_plan: read("voice_plan") && typeof read("voice_plan") === "object" ? read("voice_plan") : {},
      scene_update: read("scene_update") && typeof read("scene_update") === "object" ? read("scene_update") : {},
      continuity_update: read("continuity_update") && typeof read("continuity_update") === "object" ? read("continuity_update") : {},
      cast_updates: Array.isArray(read("cast_updates")) ? read("cast_updates").slice(0, 6) : [],
      memory_updates: Array.isArray(read("memory_updates")) ? read("memory_updates").slice(0, 3) : [],
      mind_update: read("mind_update") && typeof read("mind_update") === "object" ? read("mind_update") : {},
      human_behavior_update: read("human_behavior_update") && typeof read("human_behavior_update") === "object" ? read("human_behavior_update") : {},
      presence_update: read("presence_update") && typeof read("presence_update") === "object" ? read("presence_update") : {},
      connection_updates: Array.isArray(read("connection_updates")) ? read("connection_updates").slice(0, 6) : [],
      post_turn_reflection: read("post_turn_reflection") && typeof read("post_turn_reflection") === "object" ? read("post_turn_reflection") : {},
      quality_check: read("quality_check") && typeof read("quality_check") === "object" ? read("quality_check") : {},
    };
  } catch {
    // Gemini can finish the visible reply and then hit MAX_TOKENS while writing
    // hidden continuity metadata. Never expose the broken JSON envelope as prose.
    const salvagedReply = extractPartialJsonStringField(clean, "reply");
    if (salvagedReply.trim()) {
      console.warn("[character-chat] salvaged visible reply from incomplete JSON envelope", { chars: salvagedReply.length });
      return emptyModelEnvelope(salvagedReply);
    }
    // Only plain non-envelope text may fall back to raw prose. A JSON-looking
    // payload without a recoverable reply is an invalid model envelope.
    if (/^\s*[{[]/.test(clean) || /"(?:reply|hidden_metadata|mind_update|presence_update)"\s*:/.test(clean)) {
      throw new Error("Gemini returned an incomplete structured response before the visible reply could be recovered.");
    }
    return emptyModelEnvelope(clean);
  }
}

// PURE_NARRATIVE_HELPERS_START
function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function isSilentContinueText(value = "") {
  const text = String(value || "").trim();
  return text.startsWith("[SILENT_CONTINUE") ||
    text.startsWith("[RETURN_MAIN_POV") ||
    text.includes("Treat this as silence from the user") ||
    /^[.…。]+$/u.test(text);
}
function looksLikeQuestion(value = "") {
  const text = String(value || "").trim();
  if (/\?\s*$/.test(text)) return true;
  return /\b(?:what|why|where|when|who|whose|which|how|do|does|did|are|is|was|were|can|could|would|will|have|has)\b[^.!?]{0,110}$/i.test(text) ||
    /\b(?:que|qué|por que|por qué|donde|dónde|cuando|cuándo|quien|quién|como|cómo|acaso|puedes|podrias|podrías|quieres)\b[^.!?]{0,110}$/i.test(text);
}
function isExplicitTimeSkipDirective(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return false;
  return /\b(?:time\s*skip|timeskip|skip\s+(?:ahead|forward))\b/i.test(raw) ||
    /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(?:hours?|days?|weeks?|months?|years?)\s+later\b/i.test(raw) ||
    /\b(?:hours?|days?|weeks?|months?|years?)\s+later\b/i.test(raw) ||
    /\b(?:later that|next day|next morning|next week|next month|next year|the following day|al dia siguiente|al día siguiente|más tarde|mas tarde|días después|dias despues|semanas después|semanas despues|meses después|meses despues|años después|anos despues)\b/i.test(raw);
}
function extractTimeSkipDirective(value = "") {
  const raw = String(value || "").trim();
  if (!isExplicitTimeSkipDirective(raw)) return null;
  const durationMatch = raw.match(/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(?:hours?|days?|weeks?|months?|years?)\s+later\b/i) ||
    raw.match(/\b(?:next day|next morning|next week|next month|next year|the following day|hours? later|days? later|weeks? later|months? later|years? later|al día siguiente|al dia siguiente|días después|dias despues|semanas después|semanas despues|meses después|meses despues|años después|anos despues)\b/i);
  let stateDirective = raw
    .replace(/\b(?:time\s*skip|timeskip|skip\s+(?:ahead|forward))\b\s*[:\-—–]?\s*/ig, " ")
    .replace(/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(?:hours?|days?|weeks?|months?|years?)\s+later\b/ig, " ")
    .replace(/\b(?:next day|next morning|next week|next month|next year|the following day|hours? later|days? later|weeks? later|months? later|years? later|al día siguiente|al dia siguiente|días después|dias despues|semanas después|semanas despues|meses después|meses despues|años después|anos despues)\b/ig, " ")
    .replace(/^[\s,;:.\-—–]+|[\s,;:.\-—–]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { duration: durationMatch ? durationMatch[0] : "", stateDirective };
}
function findRecentPostSkipBaseline(values = []) {
  const rows = (Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean).slice(-24);
  const relationshipReset = /\b(?:we (?:stopped being|weren t|weren't|were not|aren t|aren't|are not|became|are now) (?:friends|close|nice|nicer|friendly|together)|we (?:stopped talking|broke up|fell out)|we hate each other again|back to being enemies|not friends anymore)\b/i;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const raw = rows[index];
    if (relationshipReset.test(raw)) return null;
    if (!isExplicitTimeSkipDirective(raw)) continue;
    const skip = extractTimeSkipDirective(raw);
    if (!skip?.stateDirective) return null;
    return { ...skip, source: raw };
  }
  return null;
}
function postSkipStateSignalsWarmth(value = "") {
  const text = normalizeText(value);
  return /\b(?:nicer|nice to each other|friendlier|friendly|warmer|closer|more comfortable|more relaxed|got along|getting along|friends now|basically friends|less hostile|less mean|less rude|softer with each other)\b/.test(text);
}
function hasUnsupportedTimelineDurationClaim(reply = "", visibleUserMessages = [], visibleCharacterReplies = []) {
  const text = normalizeText(reply);
  if (!text) return false;
  const history = [...(Array.isArray(visibleUserMessages) ? visibleUserMessages : []), ...(Array.isArray(visibleCharacterReplies) ? visibleCharacterReplies : [])]
    .map(normalizeText).filter(Boolean).join(" ");
  const words = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";
  const patterns = [
    new RegExp(`\\b(?:after|for|over)\\s+(${words}|\\d+)\\s+(hours?|days?|weeks?|months?|years?)\\b`, "g"),
    new RegExp(`\\b(${words}|\\d+)\\s+(hours?|days?|weeks?|months?|years?)\\s+of\\s+(?:close\\s+)?(?:observation|knowing|friendship|history|putting up with|being around)\\b`, "g"),
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const duration = normalizeText(`${match[1]} ${match[2]}`);
      const numericAlias = { one:"1", two:"2", three:"3", four:"4", five:"5", six:"6", seven:"7", eight:"8", nine:"9", ten:"10", eleven:"11", twelve:"12" }[match[1]];
      const unit = String(match[2] || "").replace(/s$/, "");
      const aliases = [duration, numericAlias ? `${numericAlias} ${unit}` : "", numericAlias ? `${numericAlias} ${unit}s` : ""].filter(Boolean);
      if (!aliases.some((alias) => history.includes(alias))) return true;
    }
  }
  return false;
}
function mockFormalBanterScore(value = "") {
  const dialogue = [...String(value || "").matchAll(/["“]([^"”]+)["”]/g)].map((match) => normalizeText(match[1])).join(" ");
  if (!dialogue) return 0;
  const markers = [
    /\blegally obligated\b/, /\bbankrolling\b/, /\bexacting standards\b/, /\bterrible benefactor\b/,
    /\brectify (?:that|this|the) oversight\b/, /\bconversational repartee\b/, /\bthrilling .* repartee\b/,
    /\bofficial consensus\b/, /\bclose observation\b/, /\btell the academy\b/, /\bbasic transportation\b/,
    /\bcharity work\b/, /\bdangerous precedent\b/, /\bcommune with nature\b/, /\blocal wildlife\b/,
    /\bweather tolerable\b/, /\bmake good on that threat\b/, /\bcardboard box\b/, /\btrial for you\b/,
  ];
  return markers.reduce((count, pattern) => count + (pattern.test(dialogue) ? 1 : 0), 0);
}
function hasEditorialBanterVoice(reply = "", latestUserMessage = "", recentReplies = [], character = {}) {
  if (characterAllowsOrnateDialogue(character)) return false;
  const score = mockFormalBanterScore(reply);
  if (score >= 1) return true;
  const current = normalizeText(reply);
  const user = normalizeText(latestUserMessage);
  if (user.length > 260) return false;
  const posture = /\b(?:dry|easy|unbothered|measured|performative|sharp)\b/.test(current);
  const quipFrame = /\b(?:consider|apparently|naturally|official|obligated|standards|reputation|academy|benefactor|oversight|precedent|charity)\b/.test(current);
  const recentSame = (Array.isArray(recentReplies) ? recentReplies : []).slice(-4).filter((item) => {
    const t = normalizeText(item);
    return /\b(?:dry|easy|unbothered|measured|performative)\b/.test(t) && /["“][^"”]+["”]/.test(String(item || ""));
  }).length;
  return posture && quipFrame && recentSame >= 1;
}
function hasPostSkipWarmthRegression(reply = "", recentUserMessages = [], recentCharacterReplies = [], character = {}) {
  const baseline = findRecentPostSkipBaseline(recentUserMessages);
  if (!baseline || !postSkipStateSignalsWarmth(baseline.stateDirective)) return false;
  if (characterAllowsOrnateDialogue(character)) return false;
  const current = normalizeText(reply);
  const roast = /\b(?:ruin your reputation|your reputation|brutal|trial|charity work|disaster in heels|babysitting|judge your choices|judging your choices|keep the couch company|insult|brood|basic transportation|exacting standards|terrible benefactor|rectify|bankrolling|legally obligated)\b/.test(current) || mockFormalBanterScore(reply) > 0;
  if (!roast) return false;
  const recentRoasts = (Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).slice(-4).filter((item) => {
    const t = normalizeText(item);
    return /\b(?:reputation|brutal|trial|charity|disaster|babysitting|judg|brood|transportation|standards|benefactor|rectify|bankrolling|obligated)\b/.test(t) || mockFormalBanterScore(item) > 0;
  }).length;
  return recentRoasts >= 1;
}
function hasSceneTransitionQuipFiller(reply = "", latestUserMessage = "") {
  const anchor = extractUserSceneAnchor(latestUserMessage);
  if (!anchor) return false;
  const dialogue = [...String(reply || "").matchAll(/["“]([^"”]+)["”]/g)].map((match) => normalizeText(match[1])).join(" ");
  if (!dialogue) return false;
  return /\b(?:heavy traffic|long trip|long journey|made it alive|survived the trip|on the way over|finally made it|quite the journey|what a commute)\b/.test(dialogue);
}

function classifyTurnIntent(latestUserMessage = "", messages = []) {
  const raw = String(latestUserMessage || "").trim();
  const normalized = normalizeText(raw);
  let silentCount = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.sender !== "user") continue;
    if (!isSilentContinueText(message.content)) break;
    silentCount += 1;
  }

  const medium = /\b(?:i\s+(?:text|message|dm)|texted you|sent you|te\s+(?:escribo|mande|mandé)|mensaje)\b/i.test(raw)
    ? "direct_message"
    : "in_person";
  const isQuestion = looksLikeQuestion(raw);

  let kind = "ordinary";
  const confrontation = /\b(?:olvidate de mi|no me vuelvas a|no vuelvas a|no me invites otra vez|para la proxima|me trat(?:as|es) asi|forget about me|forget me|don'?t invite me again|do not invite me again|never invite me again|treat me like that again|we are done|leave me alone)\b/i.test(normalized);
  const stagedActionText = [...raw.matchAll(/\*([^*]+)\*/gs)].map((match) => match[1]).join(" ");
  const movementVerb = /\b(?:walk(?:s|ed|ing)?|leave|left|go|went|head(?:ed|ing)?|run|ran|move(?:d|ing)?|step(?:ped|ping)?|pass(?:es|ed|ing)?|past|brush(?:es|ed|ing)?\s+past)\b/i;
  const stagedMovement = stagedActionText && /\bi\b[^.!?\n]{0,70}/i.test(stagedActionText) && movementVerb.test(stagedActionText);
  const directMovement = /\bi\s+(?:walk(?:s|ed|ing)?|leave|left|go|went|head(?:ed|ing)?|run|ran|move(?:d|ing)?|step(?:ped|ping)?|pass(?:es|ed|ing)?|past|brush(?:es|ed|ing)?\s+past)\b/i.test(raw);
  const spanishMovement = /\b(?:me\s+(?:voy|fui|alejo)|salgo|me fui|me baje|me bajé)\b/i.test(raw);
  const exitsScene = Boolean(stagedMovement || directMovement || spanishMovement);

  if (raw.startsWith("[RETURN_MAIN_POV")) kind = "return_main_pov";
  else if (isSilentContinueText(raw) && recentInteractiveThreadIsOpen(messages)) kind = "interactive_thread";
  else if (isSilentContinueText(raw)) kind = "silent_continue";
  else if (isExplicitTimeSkipDirective(raw)) kind = "time_skip";
  else if (confrontation && exitsScene) kind = "confrontation_exit";
  else if (confrontation) kind = "confrontation";
  else if (exitsScene) kind = "user_exit";
  else if (/\b(?:i\s+(?:miss(?:ed)?|love|adore|care about)\s+you|te\s+(?:extrano|extraño|quiero|amo)|if\s+i\s+(?:hated|didn'?t\s+like|didn'?t\s+care\s+about)\s+you|si\s+te\s+odiara|wouldn'?t\s+(?:be\s+)?(?:by\s+your\s+side|with\s+you)|no\s+estaria\s+(?:a\s+tu\s+lado|contigo))\b/i.test(raw)) kind = "affection";
  else if (/^(?:it'?s|its|that'?s)?\s*(?:okay|ok|fine|alright|all good|no worries|est[aá]\s+bien|tranqui|no\s+importa)[.!\s]*$/i.test(raw)) kind = "reassurance";
  else if (/\b(?:many|a lot of|lots of|so many|tons of|dozens of|un mont[oó]n de|muchos?|muchas?)\b[^.!?]{0,90}\b(?:messages?|texts?|dms?|notifications?|mensajes?|chats?)\b|\b(?:read|check|open|look at|go through|leer|revisar|abrir|mirar)\b[^.!?]{0,90}\b(?:messages?|texts?|dms?|notifications?|mensajes?|chats?)\b|\b(?:group chat|chat grupal|message thread|text thread|conversation thread|hilo de mensajes)\b/i.test(raw)) kind = "interactive_thread";
  else if (medium === "direct_message") kind = "digital_message";
  else if (/^(?:who asked|did i ask|who asked you|and who asked|quien pregunto|quién preguntó|yo te pregunte|yo te pregunté)[?!.,\s]*$/i.test(raw)) kind = "challenge";
  else if (/^\s*\*?[^*\n]{0,45}(?:raise|raised|lift|lifted|arch|arched|cock|cocked|quirk|quirked)[^*\n]{0,28}eyebrow[^*\n]{0,45}\*?[.!?\s]*$/i.test(raw) || /^\s*\*?[^*\n]{0,35}(?:look|looked|glance|glanced|stare|stared)\s+at\s+(?:you|him|her)[^*\n]{0,35}\*?[.!?\s]*$/i.test(raw)) kind = "charged_nonverbal";
  else if (isQuestion) kind = "direct_question";

  return { kind, silentCount, medium, isQuestion, normalized };
}

function characterProfileDynamics(character = {}) {
  const profile = normalizeText([
    character?.role, character?.description, character?.personality, character?.relationship,
    character?.conflict_style, character?.affection_style, character?.humor_style,
    character?.core_motivation, character?.emotional_defense, character?.scenario, character?.world,
  ].filter(Boolean).join(" | "));
  let initiative = Number(character?.initiative ?? 65);
  let flirting = Number(character?.flirting ?? 30);
  let drama = Number(character?.drama ?? 45);
  let romance = Number(character?.romance_intensity ?? 35);

  const active = /\b(?:bold|confident|cocky|proud|persistent|competitive|provocative|provoking|teasing|tease|charismatic|socially confident|dominant personality|chases what he wants|chases what she wants|doesn t back down|does not back down|forward)\b/.test(profile);
  const flirtProfile = /\b(?:flirt|flirty|heartbreaker|playboy|player|ladies man|popular with (?:girls|women|guys|men)|desired|seductive|charming|charmer|casanova)\b/.test(profile);
  const frictionProfile = /\b(?:enemies to lovers|rivals? to lovers|rivalry|banter|love hate|chemistry|tension|jealousy|provokes?|competitive)\b/.test(profile);
  const romanceProfile = /\b(?:crush|attracted|attraction|feelings for|likes (?:her|him|them|you)|in love|romance|romantic tension|friends to lovers|enemies to lovers)\b/.test(profile);
  const gentle = /\b(?:very shy|timid|soft spoken|soft-spoken|conflict avoidant|avoids confrontation|extremely reserved|passive by nature|gentle and hesitant)\b/.test(profile);

  if (active) initiative = Math.max(initiative, 72);
  if (flirtProfile) flirting = Math.max(flirting, 48);
  if (frictionProfile) { drama = Math.max(drama, 55); initiative = Math.max(initiative, 70); }
  if (romanceProfile) romance = Math.max(romance, 45);
  if (gentle && !active && !frictionProfile) initiative = Math.min(initiative, 48);
  if (String(character?.story_preset || "") === "dramatic") { initiative = Math.max(initiative, 75); drama = Math.max(drama, 70); }
  if (String(character?.story_preset || "") === "romantic") { romance = Math.max(romance, 60); flirting = Math.max(flirting, 45); }
  return { initiative, flirting, drama, romance, activeProfile: active || frictionProfile, flirtProfile, gentle };
}
function supportsChargedTension(character = {}) {
  const d = characterProfileDynamics(character);
  return !d.gentle && d.initiative >= 58 && (d.flirting >= 35 || d.drama >= 50 || d.romance >= 45 || d.activeProfile);
}
function hasExplicitNoPursuitBoundary(value = "") {
  const text = normalizeText(value);
  return /\b(?:leave me alone|stop following me|dont follow me|do not follow me|dont touch me|do not touch me|let me go|back off|go away|stay away|no me sigas|no me toques|dejame sola|dejame solo|sueltame|alejate)\b/.test(text) ||
    /\b(?:i|she|he|they) (?:pull|pulled|jerk|jerked|yank|yanked) (?:my|her|his|their )?(?:arm|hand|wrist)? ?away\b/.test(text);
}
function hasSoftSocialStop(value = "") {
  const text = normalizeText(value);
  return /\b(?:could you stop|can you stop|would you stop|stop it|stop bothering me|quit bothering me|im already tired of you|i am already tired of you|youre annoying me|you are annoying me)\b/.test(text);
}

function extractUserSceneAnchor(value = "") {
  const raw = String(value || "");
  const text = normalizeText(raw);
  if (!text) return null;

  const homeLike = text.match(/\b(?:i|we)\b.{0,90}\b(?:am|m|are|was|were|stay|stayed|live|lived)?\s*(?:with\s+[a-z0-9]+(?:\s+[a-z0-9]+)?\s+)?(?:at|in|on|inside)\s+(?:my|our|the|a|an)?\s*(house|home|apartment|flat|dorm|bedroom|room|kitchen|living room)\b/);
  const directHome = text.match(/\b(?:i|we)\s+(?:am|m|are|was|were)\s+(home|at home)\b/);
  const namedHouse = text.match(/\b(?:i|we)\b.{0,90}\b(?:at|in|on)\s+([a-z0-9]+(?:\s+[a-z0-9]+)?\s+s\s+(?:house|apartment|dorm|room))\b/);
  let location = homeLike?.[1] || (directHome ? "home" : "") || namedHouse?.[1] || "";
  if (!location) {
    // Director-style location headers are common in roleplay: "At the bakery", "In the library".
    // They are scene anchors, not dialogue and not invitations to joke about the commute.
    const withoutActions = normalizeText(raw.replace(/\*[^*]+\*/gs, " "));
    const directScene = withoutActions.match(/^(?:at|in|inside|outside)\s+(?:the\s+)?([a-z0-9 ]{1,70}?(?:store|bakery|cafe|coffee shop|library|gym|restaurant|diner|bar|club|party|campus|courtyard|classroom|hall|hallway|parking lot|car park|mall|shop|market|house|home|apartment|dorm|room|kitchen|living room|office|park|beach|hotel|lobby))$/);
    location = directScene?.[1] || "";
  }
  if (!location) return null;

  const withMatch = text.match(/\bwith\s+([a-z][a-z0-9'-]{1,30})(?:\s+and\s+([a-z][a-z0-9'-]{1,30}))?/);
  const companions = [withMatch?.[1], withMatch?.[2]].filter(Boolean);
  return { location: normalizeText(location), companions };
}


function extractExplicitSocialRoleBinding(recentUserMessages = [], latestUserMessage = "") {
  const userTurns = [...(Array.isArray(recentUserMessages) ? recentUserMessages : []), latestUserMessage]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  let binding = null;
  for (let index = 0; index < userTurns.length; index += 1) {
    const raw = userTurns[index];
    const text = normalizeText(raw);
    if (!text) continue;

    // A later explicit self-reassignment cancels an older friend-target binding.
    if (/\b(?:it s|its|it is|that s|thats|that is)\s+for\s+me\b|\b(?:number|phone number|contact|digits)\b.{0,35}\b(?:is|was)?\s*for\s+me\b|\b(?:i want|i need)\s+(?:his|her|their|the)\s+(?:number|contact)\b|\bi(?: m| am)?\s+(?:going out|meeting|seeing|dating)\s+(?:him|her|them)\b|\bi\s+(?:want|plan|decided)\s+to\s+(?:go out|meet|date|see)\s+(?:him|her|them)\b/.test(text)) {
      binding = null;
      continue;
    }

    const patterns = [
      /\b(?:it s|its|it is|that s|thats|that is)?\s*not\s+for\s+me\b.{0,55}\bfor\s+([a-z][a-z0-9'-]{1,30})\b/,
      /\b(?:number|phone number|contact|digits)\b.{0,50}\bfor\s+([a-z][a-z0-9'-]{1,30})\b/,
      /\b(?:i need|i want|i got|i asked for)\b.{0,40}\b(?:number|contact|digits)\b.{0,40}\bfor\s+([a-z][a-z0-9'-]{1,30})\b/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1] && !["me", "myself", "you", "him", "her", "them"].includes(match[1])) {
        binding = { recipient: match[1], sourceIndex: index, source: raw };
        break;
      }
    }
  }
  return binding;
}

function hasSocialRoleAssignmentBreak(reply = "", latestUserMessage = "", recentUserMessages = []) {
  const binding = extractExplicitSocialRoleBinding(recentUserMessages, latestUserMessage);
  if (!binding?.recipient) return false;
  const text = normalizeText(reply);
  if (!text) return false;

  // Once the user explicitly says a romantic/contact target is for a friend, do not
  // silently make the user the date through a stray second-person pronoun.
  const userAsRomanticRecipient = [
    /\b(?:let|have)\s+(?:him|her|them)\s+(?:buy|take|pick up|meet|text|call)\s+you\b/,
    /\b(?:he|she|they)\s+(?:can|could|should|will|would|might)\s+(?:buy|take|pick up|meet|text|call)\s+you\b/,
    /\byou(?: re| are| ll| will)?\s+(?:going out|meeting|seeing|dating)\s+(?:him|her|them)\b/,
    /\b(?:your|you two)\b.{0,35}\b(?:date|dating|drink|dinner|appetizers|relationship|romance)\b/,
    /\b(?:he|she|they)\s+(?:likes?|wants?|is into|has a thing for)\s+you\b/,
    /\b(?:go out|grab drinks?|have dinner|meet up)\s+with\s+(?:him|her|them)\b/,
  ];
  if (userAsRomanticRecipient.some((pattern) => pattern.test(text))) return true;

  // A direct label that makes the user's outing/date the event is also a role swap.
  if (/\b(?:your first date|your date with|your night with)\b/.test(text)) return true;
  return false;
}


function hasUnsupportedSocialPlanExpansion(reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = []) {
  const binding = extractExplicitSocialRoleBinding(recentUserMessages, latestUserMessage);
  if (!binding?.recipient) return false;
  const text = normalizeText(reply);
  if (!text) return false;
  const history = [
    ...(Array.isArray(recentUserMessages) ? recentUserMessages : []),
    ...(Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []),
    latestUserMessage,
  ].map(normalizeText).filter(Boolean).join(" ");

  // A one-to-one date / number / flirt handoff cannot silently turn into a group outing.
  // New participants require visible evidence before this reply.
  const groupExpansion = /\b(?:it s|its|it is|this is|that s|thats|that is)?\s*(?:a )?(?:group thing|group date|group outing|group hang|double date)\b|\b(?:bringing|bring|brings)\s+(?:a|one|two|three|some|his|her|their)?\s*(?:friend|friends|buddy|buddies|roommate|roommates|teammate|teammates)\b|\b(?:friend|friends)\s+or\s+(?:two|three|more)\b|\b(?:we re|we are|you re|you are|they re|they are)\s+all\s+(?:going|meeting|coming)\b|\ball of us\b.{0,45}\b(?:going|meeting|date|dinner|drinks?)\b/.test(text);
  const userParticipation = /\b(?:grab|get|bring|put on)\s+your\s+(?:coat|jacket|shoes|bag)\b|\bif you re coming with me\b|\bif you are coming with me\b|\b(?:you re|you are)\s+coming\s+with\s+(?:me|us)\b|\bcome\s+with\s+(?:me|us)\b|\bjoin\s+(?:me|us|them)\b|\bcome\s+along\b|\byou\s+should\s+come\b|\bwe(?: ll| will)?\s+go\s+together\b/.test(text);
  const groupSupport = /\b(?:group thing|group date|group outing|group hang|double date|bringing (?:a|his|her|their)? ?friends?|bring (?:a|his|her|their)? ?friends?|come with me|come with us|join us|you re coming with|you are coming with|invited you|all of us|we re all going|we are all going)\b/.test(history);

  // Explicit user corrections are authoritative. Never "explain away" the correction by
  // inventing a group plan or retroactive invitation.
  const userCorrection = /\b(?:why would i go|why would i come|why am i going|it s your date not mine|its your date not mine|your date not mine|not my date|it isn t my date|it isnt my date|i m not going|im not going|i am not going)\b/.test(normalizeText(latestUserMessage));
  if (userCorrection && (groupExpansion || userParticipation)) return true;
  if ((groupExpansion || userParticipation) && !groupSupport) return true;

  // If the bound recipient is the friend who is actually dating/texting the target,
  // do not suddenly talk about an unnamed third "your friend" as the romantic participant.
  const thirdPartyDrift = /\byour friend\b.{0,90}\b(?:date|dating|text|texting|number|conversation|him|her|drinks?|dinner)\b|\b(?:date|dating|text|texting|number|drinks?|dinner)\b.{0,90}\byour friend\b/.test(text);
  return thirdPartyDrift && !/\byour friend\b/.test(history);
}

function hasNpcDialogueTicLoop(reply = "", recentReplies = []) {
  const score = (value = "") => {
    const text = normalizeText(value);
    const markers = [
      /\bdidn t even look up\b/,
      /\bwithout looking up\b/,
      /\babsolute indifference\b/,
      /\bentirely unbothered\b/,
      /\bunbothered (?:smirk|laugh|tone|look|expression)\b/,
      /\bdarling\b/,
      /\bconsider it\b/,
      /\btapping out another reply\b/,
      /\beyes? (?:fixed|locked) on (?:her|his|their) (?:phone|screen)\b/,
    ];
    return markers.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
  };
  const current = score(reply);
  if (!current) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-5);
  const recentScore = recent.reduce((total, item) => total + score(item), 0);
  return current >= 2 || (current >= 1 && recentScore >= 3);
}

function sanitizeUnsupportedSocialPlanExpansion(reply = "") {
  const original = String(reply || "").trim();
  if (!original) return original;
  const bad = /\b(?:group thing|group date|group outing|group hang|double date|bringing (?:a|one|two|three|some|his|her|their)? ?(?:friend|friends|buddy|buddies|roommate|roommates|teammate|teammates)|friend(?:s)? or (?:two|three|more)|grab your (?:coat|jacket|shoes|bag)|if you re coming with me|if you are coming with me|you re coming with (?:me|us)|you are coming with (?:me|us)|come with (?:me|us)|join (?:me|us|them)|come along|you should come|we ll go together|we will go together|all of us)\b/;
  return original.split(/\n{2,}/).map((paragraph) =>
    (paragraph.match(/[^.!?]+[.!?]+(?:["”']+)?|[^.!?]+$/g) || [paragraph])
      .filter((sentence) => !bad.test(normalizeText(sentence)))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  ).filter(Boolean).join("\n\n").trim();
}

function hasDirectComparisonEvasion(reply = "", latestUserMessage = "") {
  const latest = normalizeText(latestUserMessage);
  if (!latest) return false;
  const comparison = /\b(?:you|he|she|they)\b.{0,75}\b(?:after|before|faster|longer|more|less|year|month|week|day)\b|\b(?:trusted|trust|knew|know)\b.{0,70}\b(?:year|month|week|day|him|her|me)\b/.test(latest);
  const directChallenge = /\b(?:(?:what\s+)?the hell is (?:wrong|wron) with you|what is wrong with you|how come|why|seriously)\b/.test(latest);
  if (!comparison || !directChallenge) return false;
  const text = normalizeText(reply);
  if (!text) return true;
  // The response should acknowledge the comparison itself before deflecting.
  const grounding = /\b(?:trust|trusted|know|knew|year|month|week|day|fast|quick|different|fair|point|you re right|you are right|okay yeah|okay yes|i know|i barely know|just met)\b/.test(text);
  return !grounding;
}

function hasUnsupportedPriorEventClaim(reply = "", visibleHistory = []) {
  const text = normalizeText(reply);
  if (!text) return false;
  const history = (Array.isArray(visibleHistory) ? visibleHistory : []).map(normalizeText).filter(Boolean).join(" ");

  // v2.11.10: do not invent off-screen social backchannels to make NPC dialogue sound clever.
  // A "group chat" or private thread is a concrete story fact, not decorative banter.
  const backchannelClaim = /\b(?:his|her|their|the|our|rugby|team|class|friend|friends?)?\s*(?:group chat|team chat|class chat|private chat|private thread|text thread|message thread)\b/.test(text);
  const backchannelSupport = /\b(?:group chat|team chat|class chat|private chat|private thread|text thread|message thread)\b/.test(history);
  if (backchannelClaim && !backchannelSupport) return true;

  const retrospective = /\b(?:had already|already had|already been|as you said|as you told me|you told me earlier|you said earlier|last time|remember when|earlier you|before you)\b/.test(text);
  if (!retrospective) return false;

  const evidencePairs = [
    { claim: /\bcontact card\b/, support: /\bcontact card\b/ },
    { claim: /\bforward(?:ed|ing)?\b/, support: /\bforward(?:ed|ing)?\b/ },
    { claim: /\bshared?\b/, support: /\bshared?\b/ },
    { claim: /\bsent\b/, support: /\b(?:sent|send)\b/ },
    { claim: /\bgave\b/, support: /\b(?:gave|give|handed)\b/ },
    { claim: /\bpromised\b/, support: /\b(?:promised|promise)\b/ },
  ];
  const asserted = evidencePairs.filter(({ claim }) => claim.test(text));
  if (!asserted.length) return false;
  return asserted.some(({ support }) => !support.test(history));
}

function hasLatestUserSceneIgnored(reply = "", latestUserMessage = "", previousScene = {}) {
  const anchor = extractUserSceneAnchor(latestUserMessage);
  if (!anchor) return false;
  const text = normalizeText(reply);
  const oldLocation = normalizeText(previousScene?.location || "");
  const locationToken = anchor.location.split(/\s+/).filter(Boolean).at(-1) || anchor.location;
  const visiblyAnchored = locationToken && new RegExp(`\\b${locationToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text);
  const companionAnchored = anchor.companions.some((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text));
  const remoteBridge = /\b(?:text|message|dm|phone|screen|notification|called|call|buzzed|rang|incoming)\b/.test(text);
  const oldSceneFraming = /\b(?:meanwhile|back on the|back at the|back in the)\b/.test(text) ||
    (oldLocation && oldLocation !== anchor.location && oldLocation.split(/\s+/).filter((t) => t.length > 3).some((token) => text.includes(token)));
  return oldSceneFraming && !visiblyAnchored && !companionAnchored && !remoteBridge;
}

function userEstablishedRemoteContact(latestUserMessage = "", characterName = "", recentUserMessages = [], recentCharacterReplies = []) {
  const latest = normalizeText(latestUserMessage);
  if (!latest) return false;
  const communicationCue = /\b(?:text|texted|message|messaged|dm|dmed|call|called|calling|phone|notification|buzzed|rang|reply|replied|respond to|answer(?:ed)? the phone|check(?:ed)? (?:my|the) phone)\b/.test(latest);
  if (communicationCue) return true;

  const characterKey = normalizeText(characterName).split(/\s+/).filter(Boolean)[0] || "";
  const recent = [
    ...(Array.isArray(recentUserMessages) ? recentUserMessages : []),
    ...(Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []),
  ].slice(-6).map(normalizeText).join(" ");
  const pendingContact = /\b(?:i ll|ill|i will|im going to|i am going to|gonna)\s+(?:text|message|dm|call)\s+(?:you|her|him|them)\b|\b(?:text|message|dm|call)\s+(?:you|her|him|them)\s+(?:later|when|after)\b/.test(recent);
  const activeDigital = /\b(?:text from|message from|dm from|incoming call from|on the phone with)\b/.test(recent) && (!characterKey || recent.includes(characterKey));
  return pendingContact || activeDigital;
}

function hasUnsolicitedOffscreenLeadContact(reply = "", latestUserMessage = "", previousScene = {}, characterName = "", recentUserMessages = [], recentCharacterReplies = []) {
  const anchor = extractUserSceneAnchor(latestUserMessage);
  if (!anchor || !characterName) return false;
  const characterKey = normalizeText(characterName).split(/\s+/).filter(Boolean)[0] || "";
  if (!characterKey) return false;
  if (anchor.companions.some((name) => normalizeText(name) === characterKey || normalizeText(name) === normalizeText(characterName))) return false;
  if (userEstablishedRemoteContact(latestUserMessage, characterName, recentUserMessages, recentCharacterReplies)) return false;

  const text = normalizeText(reply);
  const escaped = characterKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const directLabel = new RegExp(`\\b${escaped}\\b\\s*:`);
  const namedContact = new RegExp(`(?:\\b(?:text|message|dm|notification|call|phone|screen)\\b.{0,140}\\b${escaped}\\b|\\b${escaped}\\b.{0,90}\\b(?:text|message|dm|notification|call|called|calls|texted|texts|messaged|messages|buzzed|rang)\\b)`);
  const deviceBridge = new RegExp(`\\b(?:phone|screen)\\b.{0,180}\\b${escaped}\\b`);
  return directLabel.test(String(reply || "")) || namedContact.test(text) || deviceBridge.test(text);
}

function hasSilentContinuationPropLoop(reply = "", turnIntent = {}, recentReplies = []) {
  if (!["silent_continue", "return_main_pov"].includes(String(turnIntent?.kind || ""))) return false;
  const text = normalizeText(reply);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words > 90) return true;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-4).map(normalizeText);
  const props = ["pen", "keys", "textbook", "book", "page", "cup", "railing", "phone"];
  const repeated = props.some((prop) => text.includes(prop) && recent.filter((item) => item.includes(prop)).length >= 2);
  const mechanical = /\b(?:tap|tapped|tapping|twirl|twirled|spin|spun|click|clicked|flip|flipped|trace|traced|jot|jotted|folded the corner|turned the page)\b/.test(text);
  return repeated && mechanical;
}
function recentOffscreenSceneWindow(messages = [], characterName = "", latestUserMessage = "") {
  const all = Array.isArray(messages) ? messages : [];
  const users = all.filter((m) => m?.sender === "user");
  if (!users.length || !characterName) return null;
  const characterKey = normalizeText(characterName).split(/\s+/).filter(Boolean)[0] || "";
  if (!characterKey) return null;

  // The latest turn gets first right to establish its own scene. Initiative becomes
  // eligible only on a later beat, never inside the same relocation response.
  if (extractUserSceneAnchor(latestUserMessage)) return null;
  const latestId = String(users.at(-1)?.id || "");
  for (let i = users.length - 2; i >= Math.max(0, users.length - 5); i -= 1) {
    const msg = users[i];
    if (latestId && String(msg?.id || "") === latestId) continue;
    const anchor = extractUserSceneAnchor(msg?.content || "");
    if (!anchor) continue;
    const companionKeys = anchor.companions.map(normalizeText);
    if (companionKeys.includes(characterKey) || companionKeys.includes(normalizeText(characterName))) return null;
    const turnsSince = users.length - 1 - i;
    return { anchor, turnsSince };
  }
  return null;
}

function hasRomanticInitiativeDrought(reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], characterName = "", character = {}) {
  const d = characterProfileDynamics(character);
  if (!characterName || d.gentle || d.initiative < 70 || !supportsChargedTension(character)) return false;
  const boundaryContext = [latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages.slice(-2) : [])].join(" ");
  if (hasExplicitNoPursuitBoundary(boundaryContext) || hasSoftSocialStop(boundaryContext)) return false;
  if (extractUserSceneAnchor(latestUserMessage)) return false; // protect the relocation reply itself

  const userTurns = (Array.isArray(recentUserMessages) ? recentUserMessages : []).map(String);
  let anchor = null;
  for (let i = userTurns.length - 2; i >= Math.max(0, userTurns.length - 5); i -= 1) {
    const candidate = extractUserSceneAnchor(userTurns[i]);
    if (candidate) { anchor = candidate; break; }
  }
  if (!anchor) return false;
  const characterKey = normalizeText(characterName).split(/\s+/).filter(Boolean)[0] || "";
  if (!characterKey || anchor.companions.map(normalizeText).includes(characterKey)) return false;

  const mentionsLeadOrContact = (value = "") => {
    const text = normalizeText(value);
    const name = characterKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const named = new RegExp(`\\b${name}\\b`).test(text);
    const remote = /\b(?:text|message|dm|call|called|calling|phone buzz|phone lights|notification)\b/.test(text) && named;
    return named || remote;
  };
  const previous = String((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "");
  if (!previous || mentionsLeadOrContact(previous)) return false;
  if (mentionsLeadOrContact(reply)) return false;
  return true;
}

function buildCurrentBeatPolicy({ turnIntent = {}, character = {}, latestUserMessage = "", messages = [], openingRegeneration = false } = {}) {
  const kind = String(turnIntent?.kind || "ordinary");
  const d = characterProfileDynamics(character);
  const allRecentUserTurns = (Array.isArray(messages) ? messages : []).filter((m) => m?.sender === "user").slice(-16).map((m) => String(m?.content || ""));
  const recentUserTurns = allRecentUserTurns.slice(-2);
  const boundaryContext = [latestUserMessage, ...recentUserTurns].join(" ");
  const hardBoundary = hasExplicitNoPursuitBoundary(boundaryContext);
  const softStop = hasSoftSocialStop(boundaryContext);
  const charged = supportsChargedTension(character);
  const latestSceneAnchor = extractUserSceneAnchor(latestUserMessage);
  const offscreenWindow = recentOffscreenSceneWindow(messages, character.name, latestUserMessage);
  const recent = (Array.isArray(messages) ? messages : []).slice(-8).map((m) => normalizeText(m?.content || "")).join(" ");
  const recentCharge = /\b(?:flirt|teas|provok|smirk|who asked|whatever|annoying|rude|sarcasm|not going anywhere|keep trying|enemies to lovers|tension)\b/.test(recent);
  const socialRoleBinding = extractExplicitSocialRoleBinding(allRecentUserTurns, latestUserMessage);
  const postSkipBaseline = findRecentPostSkipBaseline([...allRecentUserTurns, latestUserMessage]);
  const base = [
    "CURRENT BEAT POLICY — APPLY THIS BEFORE GENERIC STYLE ADVICE",
    `- Effective dynamics: initiative=${Math.round(d.initiative)}, flirting=${Math.round(d.flirting)}, drama=${Math.round(d.drama)}, romance=${Math.round(d.romance)}. The written profile can raise these behavioral signals; sliders are not the only source of character identity.`,
  ];
  if (postSkipBaseline?.stateDirective && kind !== "time_skip" && !openingRegeneration) {
    base.push(`- ACTIVE POST-SKIP BASELINE: ${String(postSkipBaseline.stateDirective || "").replace(/[<>]/g, "").trim().slice(0, 420)}. This remains the current relationship baseline until visible canon changes it. Do not treat it as a one-turn mood.`);
    if (postSkipStateSignalsWarmth(postSkipBaseline.stateDirective)) {
      base.push("- WARMTH MUST ALTER THE RHYTHM, NOT JUST THE LABEL: they can still tease, but not every line should be a roast, mock-formal quip, rhetorical jab, or defensive comeback. Mix in plain answers, easy cooperation, ordinary silence, practical kindness, shared routine, and unremarkable comfort. Being nicer should feel lived-in, not announced.");
      base.push("- Do not compensate for friendliness by making the character sound older, more polished, or pseudo-witty. Keep the same age and voice. Short normal lines are preferred over editorial phrases such as ‘legally obligated,’ ‘official consensus,’ ‘rectify the oversight,’ ‘bankrolling this excursion,’ or other sitcom-polished wording.");
    }
  }
  if (socialRoleBinding?.recipient && !openingRegeneration) {
    base.push(`- SOCIAL ARC CONTRACT: the user explicitly established that the current number/date/flirt target is for ${socialRoleBinding.recipient}, not the user. Keep that recipient stable through pronouns, jokes, invitations and later logistics. The user may help, tease, threaten, advise or fetch contact information without becoming the romantic recipient.`);
    base.push(`- PARTICIPANTS ARE LOCKED BY VISIBLE CANON: do not silently convert a one-to-one date into a group thing, double date or outing with extra friends. Do not tell the user to grab a coat, come along or join unless a visible earlier turn actually invited them. If the user corrects “your date, not mine,” accept the correction immediately; never defend the mistake by inventing new attendees or a retroactive invitation.`);
  }
  if (latestSceneAnchor && !openingRegeneration) {
    base.push(`- LATEST USER SCENE LOCK: the user just established the active scene at ${latestSceneAnchor.location}${latestSceneAnchor.companions.length ? ` with ${latestSceneAnchor.companions.join(" and ")}` : ""}. Move the narrative camera there now. Do not answer from the previous campus/party/room with “meanwhile/back on...” framing. If ${character.name} is not physically there, STAY with the people/events actually present in the user's new scene. Do NOT summon ${character.name} through a convenient text, call, DM, notification, knock, coincidence, or other remote interruption merely to keep the romance lead on-page. Remote contact is allowed only when the latest user turn initiates/mentions it, an already-active digital exchange is continuing, or a visible recent beat explicitly established that ${character.name} would contact them.`);
    base.push("- LOCATION-ONLY TRANSITIONS ARE ALSO DIRECTOR CUES: arrive inside the new place without joking about the commute, traffic, journey, or how long it took unless the user explicitly made the transit relevant. Start doing something in the new location.");
  }
  if (offscreenWindow && !openingRegeneration && !hardBoundary && charged && offscreenWindow.turnsSince >= 1) {
    base.push(`- GROUNDED ROMANTIC INITIATIVE WINDOW: the user's relocation to ${offscreenWindow.anchor.location} has already had its establishing beat, so ${character.name} is no longer banned from taking initiative merely because they are off-screen. This profile is high-initiative: over the next one to three natural beats, it is GOOD for ${character.name} to seek contact when unresolved attraction/tension makes that plausible instead of waiting forever for the user to return.`);
    base.push(`- Initiative must use knowledge ${character.name} actually has. Plausible options include a short ordinary text/call, asking a mutual friend a normal question, looking for the user in a shared/public place they would reasonably expect them, or creating a future encounter through their own plans. Do NOT magically know a private room/address, teleport, track the user, or fabricate a promise. Keep the contact human and concise—not a grand speech and not a romance-magnet interruption every turn.`);
    base.push(`- Cadence matters: do not force contact in every reply. But do not let a bold, proud, flirtatious or competitive character go passive for a long stretch solely because an earlier scene-focus guard kept them off-page.`);
  }
  const recentCharacterTurnsForCorrection = (Array.isArray(messages) ? messages : []).filter((m) => m?.sender === "character").slice(-2).map((m) => String(m?.content || ""));
  if (!openingRegeneration && isMetaSpeechCorrection(latestUserMessage, recentCharacterTurnsForCorrection)) {
    base.push("- CANON CORRECTION TURN: the latest short user message repairs the immediately previous generated beat; it is not fresh in-character dialogue. Apply it retroactively. Continue from the corrected state as though the user did not speak in that beat. Do not have the character answer or quote the correction itself, and do not erase earlier user-authored dialogue that really happened.");
    base.push("- Preserve this character's stance while accepting the correction. A proud/teasing/guarded character can adjust without suddenly becoming meek, therapeutic, self-improving, or emotionally deflated.");
  }
  if (openingRegeneration || kind === "opening") {
    base.push("- Opening: establish one concrete active situation with almost no setup tax. Prefer dialogue first. Use at most one useful environmental detail, no prop inventory, and no choreographed entrance. The first spoken line should sound like something this person would actually say aloud, not a polished premise summary. End with an immediate opening the user can answer.");
  } else if (kind === "silent_continue" || kind === "return_main_pov") {
    base.push("- SILENT CONTINUE: the user intentionally yielded the narrative turn. Continue from the exact last state and add one concrete new beat: dialogue, decision, movement with purpose, a real social exchange, an external event with consequence, or a specific action that changes what can happen next.");
    base.push("- If the user is currently off-scene, follow the character's OWN life. Do not spend the turn watching the doorway, remembering where the user vanished, leaning against a wall/pillar, breathing, or stating that the character is not looking for them. Independent activity must actually happen on-page.");
  } else if (kind === "time_skip") {
    const skip = extractTimeSkipDirective(latestUserMessage);
    base.push("- TIME SKIP IS A DIRECTOR STATE CHANGE, NOT DIALOGUE. The latest user turn tells you what is already true after the jump. Apply its time/relationship/state clauses silently as canon. Never have the character quote, paraphrase, acknowledge, joke about, count, explain, or congratulate the time jump itself.");
    if (skip?.stateDirective) base.push(`- POST-SKIP STATE TO APPLY SILENTLY: ${String(skip.stateDirective || "").replace(/[<>]/g, "").trim().slice(0, 420)}. Treat this as an already-established baseline at the landing point, not as something the character needs to say out loud.`);
    base.push("- IMPLICIT LANDING: begin inside a normal active moment after the jump as though this updated dynamic has already been ordinary for a while. SHOW the change through ease, habits, tone, proximity, routines, expectations, or how they handle each other. Do not recap the missing months or explain how they became this way unless the user later asks.");
    base.push("- Do NOT write lines like ‘three months of civility,’ ‘we’re nicer now,’ ‘look how far we’ve come,’ ‘after all these months,’ or any wink at the user’s time-skip instruction. No exposition tax. Just live in the new normal.");
    base.push("- Land in a meaningfully changed active situation. Carry unresolved emotion as residue, not surveillance; use a real task, plan, social interaction, complication, decision, or changed setting instead of resuming the old doorway/corridor beat.");
  } else if (["challenge", "charged_nonverbal"].includes(kind)) {
    base.push("- Charged cue: answer with an active character-specific choice. Dialogue, proximity, flirt, a consequential social interruption, or another deliberate move must change the beat; gaze + smirk + silence is not enough.");
  } else if (["user_exit", "confrontation_exit"].includes(kind)) {
    if (hardBoundary) {
      base.push("- HARD BOUNDARY ACTIVE: do not follow, touch, block, or chase. Let the separation stand, but still give the character an active reaction or independent next action instead of passive watching.");
    } else if (softStop) {
      base.push("- The user asked the character to stop bothering them. Do not force physical contact. The character may answer once, call after from a respectful distance, or pivot into a concrete independent/social action; never reduce the turn to watching them leave.");
    } else if (charged || recentCharge) {
      base.push("- Hot departure: active follow-through is favored for this profile. Step after, catch up, call back, match pace, or when no no-touch boundary exists use one brief non-restraining touch. If the character deliberately chooses not to pursue, the alternative must itself be active and consequential, not a camera shot of the user leaving.");
      if ((Array.isArray(messages) ? messages.filter((m) => m?.sender === "character").length : 0) <= 1 && /\b(?:pass(?:es|ed|ing)?\s+(?:by|past)|brush(?:es|ed|ing)?\s+past|walk(?:s|ed|ing)?\s+past)\b/i.test(String(latestUserMessage || ""))) {
        base.push("- FIRST CHARGED PASS-BY LOCK: this is the opening pursuit test. Do not merely watch the user cross the room, murmur to empty space, or pick up a drink. This character must actively keep the interaction alive: follow, step after, call them back, match pace, or otherwise move WITH the departure while respecting explicit boundaries.");
      }
    } else {
      base.push("- Departure: respect the movement. Choose a concrete reaction or independent action; passive watching is not a substitute for character behavior.");
    }
  } else {
    base.push("- Ordinary turn: respond literally first, then contribute one specific character action, decision, line, or social consequence. Do not pad with cinematic body-language loops.");
  }
  return base.join("\n");
}
function hasConcreteBeatProgression(value = "") {
  const raw = String(value || "");
  const text = normalizeText(raw);
  const dialogue = [...raw.matchAll(/["“]([^"”]{4,})["”]/g)].some((m) => normalizeText(m[1]).split(/\s+/).filter(Boolean).length >= 2);
  if (dialogue) return true;
  // Count character/event actions, not incidental scenery grammar such as
  // “the corridor opened toward the hall” or “the space she left behind.”
  const directAction = /\b(?:decided|chose|joined|invited|asked|replied|texted|called|dialed|sent|typed|grabbed|picked up|set down|put down|entered|arrived|headed for|walked toward|crossed the|pushed through|stepped outside|went inside|went outside|started to|began to|ordered|danced|laughed with|argued with|introduced|accepted|declined|followed|caught up|closed the distance|took a seat|sat down with|stood up|made a decision|answered (?:him|her|them|the|a)|turned to .{0,80} and said)\b/.test(text);
  const objectAction = /\b(?:opened|closed|read|left) (?:the|a|an|his|her|their) (?:door|phone|message|text|chat|book|conversation|room|party|house|kitchen|table|group|game|car|building)\b/.test(text);
  return directAction || objectAction;
}
function hasSilentContinuationStall(reply = "", turnIntent = {}, recentReplies = []) {
  if (!["silent_continue", "return_main_pov"].includes(String(turnIntent?.kind || ""))) return false;
  if (hasConcreteBeatProgression(reply)) return false;
  const text = normalizeText(reply);
  const words = text.split(/\s+/).filter(Boolean).length;
  const staticMotifs = [
    /\b(?:stayed|remained|stood) (?:by|at|against|near|where)\b/,
    /\blean(?:ed|ing)? (?:back )?(?:against|on)\b/,
    /\b(?:gaze|eyes?) (?:followed|lingered|rested|drifted|slid|stayed)\b/,
    /\b(?:didnt|did not) (?:call|follow|look back|move|say anything)\b/,
    /\b(?:quiet|silence|breath|exhale|empty (?:space|spot)|where (?:she|he|they) had been)\b/,
    /\b(?:music|bass|rain|wind) (?:thudded|pulsed|hummed|filled|rustled)\b/,
  ];
  const score = staticMotifs.reduce((n, r) => n + (r.test(text) ? 1 : 0), 0);
  return score >= 2 || (words >= 18 && !hasConcreteBeatProgression(reply));
}
function hasTimeSkipDrift(reply = "", turnIntent = {}) {
  if (String(turnIntent?.kind || "") !== "time_skip") return false;
  const text = normalizeText(reply);
  const active = hasConcreteBeatProgression(reply);
  const oldFocus = /\b(?:corridor|doorway|spot|place|space) (?:where )?(?:she|he|they|you) (?:vanished|left|had been|walked)|\b(?:gaze|eyes?|attention) (?:slid|drifted|flicked|returned|went) (?:back|toward|to)\b|\bdidnt look back|\bdid not look back|\bwithout searching for\b/.test(text);
  const staticScene = /\b(?:nursing a drink|leaning against|stayed by|remained by|absent nod|quiet nod|watched the crowd|scanning the crowd)\b/.test(text);
  return !active || ((oldFocus || staticScene) && !/["“][^"”]{4,}["”]/.test(String(reply || "")) && !/\b(?:decided|chose|joined|left|entered|arrived|headed|called|texted|invited|danced|argued|ordered)\b/.test(text));
}
function hasTimeSkipExpositionEcho(reply = "", latestUserMessage = "", turnIntent = {}) {
  if (String(turnIntent?.kind || "") !== "time_skip") return false;
  const rawReply = String(reply || "");
  const text = normalizeText(rawReply);
  const skip = extractTimeSkipDirective(latestUserMessage);
  if (!text || !skip) return false;

  // A director-style skip should become invisible once the new scene starts.
  // Do not let the character narrate/count the jump or congratulate the new dynamic.
  if (/\b(?:time skip|timeskip|after (?:all )?(?:these|those) (?:weeks|months|years)|a whole (?:\w+ )?(?:weeks|months|years)|three months of|months of (?:civility|being nice|niceness)|look how far we(?:ve| have) come|were nicer now|we are nicer now|we re nicer now|basic civility)\b/.test(text)) return true;

  const duration = normalizeText(skip.duration || "");
  if (duration) {
    const durationWords = duration.split(/\s+/).filter(Boolean);
    if (durationWords.length >= 2 && durationWords.every((word) => text.includes(word))) return true;
  }

  const state = normalizeText(skip.stateDirective || "");
  if (state) {
    const stateTerms = state.split(/\s+/).filter((word) => word.length >= 5 && !/^(?:were|weve|we|each|other|more|been|became|become|with|than|that|this)$/.test(word));
    const mirrored = stateTerms.filter((word) => text.includes(word));
    if (stateTerms.length >= 2 && mirrored.length >= Math.min(2, stateTerms.length)) {
      const metaFrame = /\b(?:now|finally|these days|lately|after|months|weeks|years|civility|nicer|friendlier|warmer|different between us)\b/.test(text);
      if (metaFrame) return true;
    }
  }
  return false;
}
function hasImmediatePoseRegression(reply = "", latestUserMessage = "", recentReplies = []) {
  const current = normalizeText(reply);
  const user = normalizeText(latestUserMessage);
  const previousRaw = String((Array.isArray(recentReplies) ? recentReplies : []).slice(-1)[0] || "");
  const previous = normalizeText(previousRaw);
  if (!current || !previous) return false;
  const userRepositionsToAnchor = /\b(?:counter|pillar|wall|doorway|kitchen island|porch)\b/.test(user) && /\b(?:walk|move|step|go|lean|stand|stop)\b/.test(user);
  if (userRepositionsToAnchor) return false;
  const oldAnchorClaim = /\b(?:still|remained|stayed|was)\b.{0,35}\b(?:leaning|against|by|at)\b.{0,25}\b(?:counter|pillar|wall|doorway|kitchen island|island)\b/.test(current);
  if (!oldAnchorClaim) return false;
  const priorFinalSegment = normalizeText(previousRaw.slice(-700));
  const priorMoved = /\b(?:pushed off|stepped away from|moved away from|walked away from|left the)\b.{0,35}\b(?:counter|pillar|wall|doorway|kitchen island|island)\b/.test(previous) ||
    /\b(?:made (?:his|her|their) way|crossed|walked|stepped|moved)\b.{0,180}\b(?:stopped|came to a stop|ended up|in front of|beside|next to)\b/.test(priorFinalSegment) ||
    /\b(?:stopped|stood) (?:right )?(?:in front of|beside|next to)\b/.test(priorFinalSegment);
  return priorMoved;
}
function recentInteractiveThreadIsOpen(messages = []) {
  const rows = Array.isArray(messages) ? messages : [];
  let inspectedUserTurns = 0;
  for (let index = rows.length - 1; index >= 0 && inspectedUserTurns < 4; index -= 1) {
    const message = rows[index];
    if (!message || message.sender !== "user") continue;
    const content = String(message.content || "").trim();
    if (isSilentContinueText(content)) continue;
    inspectedUserTurns += 1;
    if (/\b(?:many|a lot of|lots of|so many|tons of|dozens of|un mont[oó]n de|muchos?|muchas?)\b[^.!?]{0,90}\b(?:messages?|texts?|dms?|notifications?|mensajes?|chats?)\b|\b(?:read|check|open|look at|go through|leer|revisar|abrir|mirar)\b[^.!?]{0,90}\b(?:messages?|texts?|dms?|notifications?|mensajes?|chats?)\b|\b(?:group chat|chat grupal|message thread|text thread|conversation thread|hilo de mensajes)\b/i.test(content)) return true;
    break;
  }
  return false;
}
function atmosphericStallScore(value = "") {
  const text = normalizeText(value);
  const motifs = [
    /\bstar(?:e|ed|ing) (?:up )?at (?:the )?(?:ceiling|dark|shadows|window)/,
    /\b(?:slow|long|heavy|quiet|sharp|barely audible) (?:breath|exhale)/,
    /\b(?:rolled|rolls|shifted|shifts|turned|turns) (?:over|onto|slightly|his|her)/,
    /\b(?:rain|wipers?)\b.{0,55}\b(?:window|glass|outside|roof)/,
    /\b(?:silence|quiet|shadows|darkness)\b/,
    /\b(?:closed|shut) (?:his|her) eyes\b/,
    /\bphone\b.{0,65}\b(?:face down|nightstand|pillow|silent|untouched)/,
  ];
  return motifs.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}
function hasMeaningfulProgression(value = "") {
  const raw = String(value || "");
  const text = normalizeText(raw);
  if (/["“][^"”]{3,}["”]/.test(raw)) return true;
  return /\b(?:picked up|grabbed|opened|unlocked|read|reads|typed|types|replied|reply|responded|sent|called|answered|declined|muted|blocked|silenced|sat up|stood up|got up|walked|left|entered|arrived|decided|chose|turned on|switched on|message said|text read|screen lit with|notification from|wrote back|escribio|escribió|respondio|respondió|contesto|contestó|leyo|leyó|abrió|abrio|envio|envió|llamo|llamó)\b/.test(text);
}
function hasAtmosphericStallingLoop(reply = "", recentReplies = [], turnIntent = {}) {
  const score = atmosphericStallScore(reply);
  if (hasMeaningfulProgression(reply)) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-4);
  const recentStalls = recent.filter((item) => atmosphericStallScore(item) >= 2 && !hasMeaningfulProgression(item)).length;
  if (score >= 4) return true;
  if ((turnIntent?.kind === "silent_continue" || turnIntent?.kind === "interactive_thread") && score >= 2 && recentStalls >= 1) return true;
  return score >= 2 && recentStalls >= 2;
}
function hasPassiveEmotionalCueResponse(reply = "", latestUserMessage = "") {
  const latest = normalizeText(latestUserMessage);
  const strongCue = /\b(?:tearing up|teared up|eyes (?:were )?(?:wet|watery|glassy)|crying|cried|cry|sobbing|sobbed|shaking|trembling|terrified|scared|panicking|panic attack|visibly upset|hurt badly|furious|angry enough to cry|llorando|llore|lloré|lagrimas|lágrimas|temblando|asustada|asustado|aterrada|aterrado|furiosa|furioso)\b/.test(latest);
  if (!strongCue) return false;
  const raw = String(reply || "");
  const text = normalizeText(raw);
  const hasDialogue = /["“][^"”]{3,}["”]/.test(raw);
  const activeResponse = /\b(?:asked|asks|said|says|murmured|murmurs|whispered|whispers|reached for (?:a )?(?:napkin|tissue|water|phone)|handed (?:her|him|them)|offered (?:her|him|them)|got (?:her|him|them) (?:water|a tissue|a napkin)|stood up|got up|moved (?:the chair|them|her|him)|pulled (?:a chair|the chair)|paused (?:the plan|what he was doing|what she was doing)|closed (?:the laptop|his laptop|her laptop)|called (?:someone|for help)|texted (?:someone|for help)|asked what happened|what happened|are you okay|are you alright|que paso|qué pasó|estas bien|estás bien)\b/.test(text);
  const passiveOnly = /\b(?:stayed (?:right )?beside|sat beside|watched (?:her|him|them)|looked at (?:her|him|them)|stared at (?:her|him|them)|remained quiet|said nothing|didn t say anything|did not say anything|silence|the air|the tension)\b/.test(text);
  if (hasDialogue || activeResponse) return false;
  return passiveOnly || text.split(/\s+/).filter(Boolean).length < 55;
}
function hasTherapeuticDeescalationPivot(reply = "", latestUserMessage = "", recentUserMessages = [], character = {}) {
  if (!supportsChargedTension(character)) return false;
  const userContext = [latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages : [])]
    .slice(0, 4).map(normalizeText).join(" ");
  const disclosedBadDay = /\b(?:bad|rough|shitty|shit|horrible|awful|terrible|worst|long) day\b|\b(?:tuve|he tenido) un dia (?:malo|horrible|de mierda)\b/.test(userContext);
  const conflict = /\b(?:go away|leave me alone|don t wanna talk|don t want to talk|don t ruin|stop|mad|angry|annoyed|pissed|vete|dejame|déjame|no quiero hablar|no lo empeores)\b/.test(userContext);
  if (!disclosedBadDay || !conflict) return false;

  const text = normalizeText(reply);
  const counselorMarkers = [
    /\bfair point\b/,
    /\b(?:quiet|quieter|private) (?:corner|place|space|room|terrace|spot)\b/,
    /\bi ll stay out of your hair\b/,
    /\bif you change your mind\b/,
    /\byou know where to find me\b/,
    /\b(?:trade|turn) (?:that|your) (?:bad |shitty |rough )?day (?:for|into)\b/,
    /\bgenuinely contemplative\b/,
    /\b(?:quiet|thoughtful) nod\b/,
    /\b(?:low|quiet),? steady (?:voice|register|tone)\b/,
    /\bvoice (?:dropping|lowering) (?:into|to) a (?:low|quiet|steady)\b/,
    /\b(?:smirk|grin|expression) softened\b/,
  ];
  const score = counselorMarkers.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  return score >= 2;
}

function hasPassiveExitAfterRupture(reply = "", latestUserMessage = "", recentReplies = [], turnIntent = {}) {
  const kind = String(turnIntent?.kind || "");
  if (!["user_exit", "confrontation_exit"].includes(kind)) return false;

  const latestRaw = String(latestUserMessage || "");
  const latest = normalizeText(latestRaw);
  const physicalExit = /\b(?:i\s+(?:leave|left|walk|walked|go|went|head|headed|stormed|ran)|me\s+(?:voy|fui|alejo|largo)|salgo|me fui|me largue|me largué)\b/.test(latest);
  if (!physicalExit) return false;

  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-2).map((item) => normalizeText(item));
  const userOffended = /\b(?:rude|whatever|fine|forget it|leave you|low bar|don'?t bother|i'?m done|me voy|que pesado|pesado|grosero|ya fue|olvidalo|olvídalo)\b/.test(latest);
  const characterLikelyCausedIt = recent.some((text) => /\b(?:don t let it go to your head|remarkably low|i have standards|keep up|how observant|naturally|billing your parents|hazard pay|you win that one|don t get used to it|special occasions|low tonight|couldve fooled me|could have fooled me)\b/.test(text));
  if (!userOffended && !characterLikelyCausedIt && kind !== "confrontation_exit") return false;

  const raw = String(reply || "");
  const text = normalizeText(raw);
  const pursuit = /\b(?:hold on|wait\b|wait a second|hey\b|come on|chase called after|rowan called after|alex called after|called after (?:her|him|them)|stepped after|step after|went after|followed|followed her|followed him|caught up|closed the distance|moved after|reached after|caught (?:her|him|them)|soften(?:ed)?|apolog(?:y|ize|ised|ized)|sorry\b|don t go|dont go|stop\b|gave chase)\b/.test(text);
  if (pursuit) return false;

  const passiveWatch = /\b(?:watched the space where she had been|watched the space where he had been|watched the empty space|empty space where|didn t move to follow|did not move to follow|let the distance stretch|let (?:her|him|them) go|remained by the side table|stayed where he was|stayed where she was|party noise filled the gap|turned back toward|turned back to(?:ward)? the game|picked (?:his|her) cup back up|stepped back into the game|attention didn t quite stick|without a word he .* stepped away from the screen|went back to the party|returned to (?:miller|the game|the couch|the table|work))\b/.test(text);
  return passiveWatch;
}
function hasKineticTensionDeflation(reply = "", latestUserMessage = "", recentUserMessages = [], recentReplies = [], character = {}) {
  const latest = normalizeText(latestUserMessage);
  const userContext = [latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages : [])].slice(0, 5).map(normalizeText).join(" ");
  const characterContext = (Array.isArray(recentReplies) ? recentReplies : []).slice(-3).map(normalizeText).join(" ");
  const dynamics = characterProfileDynamics(character);
  const initiative = dynamics.initiative, flirting = dynamics.flirting, drama = dynamics.drama, romance = dynamics.romance;
  const energySupportsTension = supportsChargedTension(character);
  if (!energySupportsTension) return false;

  const activeFriction = /\b(?:who asked|did i ask|whatever|rude|bodyguard|fresh air|keep walking|walk away|walking away|leave you with|low bar|scoff|eye roll|rolled my eyes|shut up|annoying|you re annoying|you are annoying|who cares|so what|and|fine)\b/.test(userContext) ||
    /\b(?:teas(?:e|ed|ing)|flirt(?:ed|ing)?|smirk(?:ed|ing)?|banter|taunt(?:ed|ing)?|provok(?:e|ed|ing))\b/.test(characterContext);
  if (!activeFriction) return false;

  const raw = String(reply || "");
  const text = normalizeText(raw);
  const passiveMarkers = [
    /\b(?:remained|stayed) (?:leaning|where|by|against)\b/,
    /\bleaned (?:against|on)\b/,
    /\b(?:gaze|eyes?) linger(?:ed|ing)?\b/,
    /\blooked (?:back )?out (?:at|over|toward)\b/,
    /\b(?:faint|slow|small) smirk\b/,
    /\bfair point\b/,
    /\bno one did\b/,
    /\bdidn t (?:follow|move|step|come closer)\b/,
    /\bdid not (?:follow|move|step|come closer)\b/,
    /\bcontent to let\b/,
    /\bgave (?:her|him|them|you) space\b/,
    /\bcalled out softly\b/,
  ];
  const passiveScore = passiveMarkers.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  if (passiveScore < 2) return false;

  const kineticAction = /\b(?:pushed off|stepped (?:closer|toward|after|in)|moved (?:closer|toward|after)|caught up|closed the distance|reached (?:for|out)|caught (?:her|his|their|your)?\s*(?:forearm|wrist|elbow|hand|arm)|touched (?:her|his|their|your)?\s*(?:hand|arm|shoulder|elbow)|brushed (?:her|his|their|your)?\s*(?:hand|arm|shoulder)|turned (?:fully )?(?:toward|to face)|followed|went after|walked after)\b/.test(text);
  const socialAction = /\b(?:another|a) (?:girl|woman|guy|man|student|guest|friend)\b.{0,90}\b(?:approached|came over|joined|flirted|called|asked|touched|hooked|leaned)\b|\b(?:flirted back|turned to (?:her|him|them)|answered (?:her|him|them)|invited (?:her|him|them)|let (?:her|him|them) stay|kept talking to (?:her|him|them))\b/.test(text);
  const confrontationalChoice = /\b(?:dared|challenged|called (?:her|him|them) back|cut in front without blocking|asked (?:her|him|them) to stay|told (?:her|him|them) to stay|changed the subject deliberately|stopped joking|dropped the joke)\b/.test(text);
  return !kineticAction && !socialAction && !confrontationalChoice;
}
function hasChargedBeatAbandonment(reply = "", latestUserMessage = "", recentReplies = [], character = {}) {
  const latest = String(latestUserMessage || "").trim(), text = normalizeText(reply), previous = normalizeText((Array.isArray(recentReplies) ? recentReplies : []).slice(-1)[0] || "");
  const micro = /(?:raise|raised|lift|lifted|arch|arched|cock|cocked|quirk|quirked)[^\n]{0,28}eyebrow|(?:look|looked|glance|glanced|stare|stared)\s+at\s+(?:you|him|her)/i.test(latest);
  if (!micro || characterProfileDynamics(character).initiative < 55) return false;
  const justStayed = /\b(?:stayed right where|stayed put|wasn t going anywhere|was not going anywhere|not going anywhere|didn t leave|did not leave|made no move to leave|wasn t leaving|was not leaving)\b/.test(previous);
  const abruptExit = /\b(?:finally turned away|turned away and|walked back toward|walked back to|headed back (?:inside|in)|went back inside|returned to the party|walked away|turned to leave|stepped back inside|slid(?:ing)? glass door.{0,45}(?:inside|party))\b/.test(text);
  const newReason = /\b(?:because|phone (?:buzzed|rang)|someone called|called his name|called her name|friend called|asked him to|asked her to|interrupted|approached|came over|needed to|had to)\b/.test(text);
  return justStayed && abruptExit && !newReason;
}
function hasChargedBeatStall(reply = "", latestUserMessage = "", recentReplies = [], character = {}) {
  const latest = String(latestUserMessage || "").trim();
  const text = normalizeText(reply);
  const previous = normalizeText((Array.isArray(recentReplies) ? recentReplies : []).slice(-1)[0] || "");
  const micro = /(?:raise|raised|lift|lifted|arch|arched|cock|cocked|quirk|quirked)[^\n]{0,28}eyebrow|(?:look|looked|glance|glanced|stare|stared)\s+at\s+(?:you|him|her)|(?:scoff|eye roll|rolled my eyes|tiny smile|small smile)/i.test(latest);
  const dynamics = characterProfileDynamics(character);
  const initiative = dynamics.initiative, flirting = dynamics.flirting, drama = dynamics.drama, romance = dynamics.romance;
  const chargedCharacter = supportsChargedTension(character);
  if (!micro || !chargedCharacter) return false;

  const priorCharge = /\b(?:stayed right where|stayed put|wasn t going anywhere|was not going anywhere|not going anywhere|didn t leave|did not leave|made no move to leave|wasn t leaving|was not leaving|stepped closer|closed the distance|challenged|flirted|teased|refused to leave)\b/.test(previous);
  if (!priorCharge) return false;

  const hasDialogue = /["“][^"”]{3,}["”]/.test(String(reply || ""));
  const activeChoice = /\b(?:stepped (?:closer|toward|in)|moved (?:closer|toward|in)|closed the distance|pushed off|reached (?:for|out)|touched|brushed|caught (?:her|him|their|your)?\s*(?:forearm|wrist|elbow|hand|arm)|asked|said|murmured|told|challenged|dared|flirted|teased|smiled and|turned fully toward|shifted closer|leaned closer|offered|invited|called|answered|beckoned|held out|extended (?:his|her|their) hand)\b/.test(text);
  const socialComplication = /\b(?:another|a) (?:girl|woman|guy|man|student|guest|friend)\b.{0,100}\b(?:approached|came over|joined|flirted|called|asked|touched|leaned|interrupted)\b|\b(?:someone called|phone buzzed|phone rang|interrupted|came over|approached)\b/.test(text);
  if (hasDialogue || activeChoice || socialComplication) return false;

  const stallMarkers = [
    /\bheld (?:her|his|their|your)?\s*gaze\b/,
    /\b(?:gaze|eyes?) (?:stayed|remained|lingered|held)\b/,
    /\bcorner of (?:his|her|their) mouth (?:twitched|ticked|quirked)\b/,
    /\b(?:didn t|did not) offer another line\b/,
    /\b(?:said nothing|didn t say anything|did not say anything|silent challenge|silence)\b/,
    /\b(?:weight|shoulders?) (?:still|remained|resting|shifted back)\b/,
    /\b(?:stayed|remained) (?:still|where he was|where she was|right where)\b/,
    /\brefused to look away\b/,
  ];
  const stallScore = stallMarkers.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  return stallScore >= 2 || (text.split(/\s+/).filter(Boolean).length >= 20 && !hasDialogue && !activeChoice && !socialComplication);
}


function hasChargedDepartureDrop(reply = "", latestUserMessage = "", recentUserMessages = [], recentReplies = [], character = {}) {
  const latestRaw = String(latestUserMessage || "").trim(), userContext = [latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages : [])].slice(0, 6).map(normalizeText).join(" "), characterContext = (Array.isArray(recentReplies) ? recentReplies : []).slice(-5).map(normalizeText).join(" ");
  const dynamics = characterProfileDynamics(character);
  const initiative = dynamics.initiative, flirting = dynamics.flirting, drama = dynamics.drama, romance = dynamics.romance;
  const moved = /\bi\b[^.!?\n]{0,65}\b(?:walk(?:s|ed|ing)?|leave|left|head(?:ed|ing)?|move(?:d|ing)?|step(?:ped|ping)?|pass(?:es|ed|ing)?|brush(?:es|ed|ing)?\s+past)\b/i.test(latestRaw) || /\bi\s+past\s+by\b/i.test(latestRaw) || /\b(?:me voy|me fui|me alejo|me alej[eé]|salgo|camino|empiezo a caminar)\b/i.test(latestRaw);
  const firstChargedPassBy = (Array.isArray(recentReplies) ? recentReplies.length : 0) <= 1 && /\b(?:pass(?:es|ed|ing)?\s+(?:by|past)|brush(?:es|ed|ing)?\s+past|walk(?:s|ed|ing)?\s+past)\b/i.test(latestRaw);
  if (!supportsChargedTension(character) || !moved || hasExplicitNoPursuitBoundary(latestRaw)) return false;
  const frictionPresent = /\b(?:who asked|did i ask|finally you re leaving|finally youre leaving|what are you talking about|whatever|bodyguard|fresh air|raise an eyebrow|raised an eyebrow|keep walking|walk away|rude|clown|bother|annoying|sarcastic|sarcasm)\b/.test(userContext) || /\b(?:not going anywhere|wasn t going anywhere|was not going anywhere|stayed right where|keep trying|you re still standing here|youre still standing here|far less entertaining|refused to leave|stepped closer|closed the distance|challenged|flirted|teased|smirk|smirked|provoked|provoking)\b/.test(characterContext);
  if (!frictionPresent && !firstChargedPassBy) return false;
  const text = normalizeText(reply), activePursuit = /\b(?:called after|called her back|called him back|stepped after|moved after|went after|followed|caught up|closed the distance|matched (?:her|his|their|your) pace|fell into step beside|came after|caught (?:her|him|their|your)?\s*(?:forearm|wrist|elbow|arm|hand)|reached (?:for|after) (?:her|him|them|you)|touched (?:her|him|their|your)?\s*(?:forearm|wrist|elbow|arm|hand|shoulder)|brushed (?:her|him|their|your)?\s*(?:arm|hand|shoulder)|stopped (?:her|him|them) with a word|asked (?:her|him|them) to stop|told (?:her|him|them) to wait|walked after|jogged after)\b/.test(text), releaseMarkers = [
    /\bwatched (?:her|him|them|you)[^.!?]{0,90}\b(?:move|walk|walking|turn|leave|go|head|across|away)\b/,
    /\b(?:gaze|eyes?) (?:followed|following|tracked|tracking|traced|tracing)[^.!?]{0,80}\b(?:movement|path|her|him|them|you)\b/,
    /\b(?:didn t|did not|made no|without (?:any )?(?:sudden )?)\s*(?:attempt|move)?[^.!?]{0,40}\b(?:call|follow|go after|stop|catch|block)\b/,
    /\b(?:stayed|remained) (?:by|at|against|beside|near) (?:the )?(?:pillar|wall|door|brick|porch|spot)\b/,
    /\b(?:space|spot|place) (?:she|he|they|you) (?:left|had left) behind\b/,
    /\blet (?:the )?(?:space|distance) (?:between them )?(?:stretch|grow|widen)\b/,
    /\blet (?:her|him|them|you) go\b/,
    /\banother shadow moving away\b/,
    /\bturned (?:his|her|their) back to (?:the )?(?:lawn|door|party|room)\b/,
    /\b(?:head(?:ed|ing)?|went|walked|turned|pushed off[^.!?]{0,45}head) back inside\b/,
    /\breturned to (?:the )?(?:party|room|game|friends|work)\b/,
    /\bleaned back against\b/,
    /\b(?:murmured|muttered|said) (?:quietly )?(?:to|into) (?:the )?(?:empty space|space .* left behind)\b/,
    /\b(?:reached for|picked up|grabbed) (?:a|the|his|her)?\s*(?:fresh )?(?:glass|drink|cup)\b/,
  ];
  const activeAlternative = /\b(?:turned to (?:a|the|another|his|her)|joined (?:his|her|their)|flirted back|started talking to|kept talking to|answered (?:the|a|another)|invited|laughed with|walked over to|headed toward (?:his|her|their) friends|picked up the conversation|rejoined|asked .* to|told .* that)\b/.test(text);
  const passiveRelease = releaseMarkers.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0) >= 2;
  if (activePursuit) return false;
  // First charged pass-by in a new chat is a pursuit test, not a cinematic-release test.
  // A muttered quip to empty air, a tracked gaze, or reaching for a drink cannot satisfy it.
  if (firstChargedPassBy) return true;
  if (!passiveRelease) return false;
  if (hasSoftSocialStop([latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages.slice(-2) : [])].join(" ")) && activeAlternative) return false;
  return !activeAlternative;
}
function hasGenericPursuitWithoutProgress(reply = "", turnIntent = {}) {
  const kind = String(turnIntent?.kind || "");
  if (!["user_exit", "confrontation_exit"].includes(kind)) return false;
  const raw = String(reply || "");
  const text = normalizeText(raw);
  const pursuit = /\b(?:wait|hey|hold on|called after|went after|followed|caught up|stepped after|moved after)\b/.test(text);
  if (!pursuit) return false;
  const concreteDialogue = [...raw.matchAll(/["“]([^"”]{6,})["”]/g)].map((m) => m[1]).join(" ");
  const meaningfulAction = /\b(?:apolog(?:ized|ised|ize)|admitted|clarified|explained|asked|offered|handed|returned|confessed|invited|stopped himself|changed his mind|changed her mind|told (?:her|him|them)|said why|gave (?:her|him|them) a reason)\b/.test(text);
  const bareCall = /^(?:[^"“]{0,80})?["“]?(?:wait|hey|hold on|don t go|dont go)[.!?,"” ]*$/i.test(raw.trim());
  if (bareCall) return true;
  return pursuit && concreteDialogue.trim().split(/\s+/).filter(Boolean).length < 4 && !meaningfulAction && text.split(/\s+/).filter(Boolean).length < 70;
}
function reactionOpenerSignature(value = "") {
  const text = normalizeText(String(value || "").slice(0, 220));
  if (/^(?:[a-z]+\s+){0,2}(?:offered|gave|let out|released|made)\s+(?:a\s+)?(?:(?:short|sharp|dry|quiet|soft|incredulous|unimpressed|brief)\s+){0,2}(?:scoff|huff|laugh|snort|sound|exhale)/.test(text)) return "reaction_sound";
  if (/^(?:[a-z]+\s+){0,2}(?:his|her)\s+(?:jaw|mouth|lips|expression|gaze|eyes)\b/.test(text)) return "body_face";
  return "";
}
function hasReactionOpenerLoop(reply = "", recentReplies = []) {
  const signature = reactionOpenerSignature(reply);
  if (!signature) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-4);
  return recent.filter((item) => reactionOpenerSignature(item) === signature).length >= 2;
}
function hasRepeatedSocialShutdown(reply = "", recentReplies = [], latestUserMessage = "") {
  const latest = normalizeText(latestUserMessage);
  const approachCue = /\b(?:two|three|some|a couple of|several|dos|tres|unos|unas)?\s*(?:men|women|guys|girls|people|students|friends|boys|chicos|chicas|hombres|mujeres|personas|estudiantes)\b.{0,80}\b(?:approached|came over|walked over|headed over|se acercaron|se acerco|se acercó|vinieron|se aproximaron)\b/.test(latest) || /\b(?:someone|somebody|alguien)\b.{0,60}\b(?:approached|came over|se acerco|se acercó)\b/.test(latest);
  if (!approachCue) return false;
  const shutdown = (value) => {
    const text = normalizeText(value);
    return /\b(?:bad timing|not now|kept moving|without slowing|didn t slow|did not slow|closed off|dismissive|brushed (?:him|her|them) off|waved (?:him|her|them) off|kept walking|walked past|ignored (?:him|her|them)|no time)\b/.test(text);
  };
  if (!shutdown(reply)) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-5);
  return recent.some(shutdown);
}
function attentionTrackingScore(value = "") {
  const text = normalizeText(value);
  const motifs = [
    /\b(?:kept|keeping|had) (?:one|an) eye (?:on|subtly on|subtly tracking|tracking)\b/,
    /\b(?:tracked|tracking) (?:her|him|them|you) (?:through|across|around)\b/,
    /\b(?:gaze|eyes?) (?:flicked|drifted|slid|cut|returned|went) (?:back|over|across|toward)\b/,
    /\b(?:flank|peripheral) vision\b/,
    /\b(?:watched|watching) (?:her|him|them|you) (?:from|across|through)\b/,
    /\b(?:still|again) (?:looking|watching|tracking|checking)\b/,
    /\b(?:didn t|did not) (?:look|stare) (?:directly|too long).{0,70}\b(?:but|though).{0,70}\b(?:tracked|watched|kept|noticed)\b/,
  ];
  return motifs.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}
function hasAttentionFixationLoop(reply = "", recentReplies = []) {
  if (attentionTrackingScore(reply) < 1) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-5);
  return recent.filter((item) => attentionTrackingScore(item) >= 1).length >= 2;
}
function npcCommentatorScore(value = "") {
  const text = normalizeText(value);
  const markers = [
    /\bhe has a point\b/,
    /\bshe has a point\b/,
    /\bhe s got you there\b/,
    /\bshe s got you there\b/,
    /\byou two\b.{0,45}\b(?:obvious|ridiculous|just kiss|flirting|tension)\b/,
    /\beven your (?:friend|panel|friends) agrees?\b/,
    /\b(?:team|side) (?:chase|rowan|alex|him|her)\b/,
    /\b(?:aw|aww).{0,30}\byou two\b/,
  ];
  return markers.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}
function hasNpcCommentatorLoop(reply = "", recentReplies = []) {
  if (npcCommentatorScore(reply) < 1) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-6);
  return recent.some((item) => npcCommentatorScore(item) >= 1);
}
function hasInventedDebateEvidence(reply = "", latestUserMessage = "") {
  const text = normalizeText(reply);
  const latest = normalizeText(latestUserMessage);
  const claims = [
    { claim: /\byou (?:were|was|kept|have been|ve been)?\s*(?:watching|staring at|checking on|tracking)\b|\byou watched\b/, support: /\bi (?:was|kept)?\s*(?:watching|staring|checking|tracking)|\bi watched\b|\blook(?:ed|ing)? at (?:you|him|her|the game)\b/ },
    { claim: /\byou (?:followed|were following|kept following|came after)\b/, support: /\bi (?:followed|was following|came after)\b|\bfollow(?:ed|ing) (?:you|him|her)\b/ },
    { claim: /\byou (?:waited|were waiting|kept waiting) (?:for|on)\b/, support: /\bi (?:waited|was waiting) (?:for|on)\b/ },
    { claim: /\byou came (?:here|tonight|to this party).{0,55}\b(?:for me|to see me)\b|\byou re here (?:for me|to see me)\b/, support: /\bi (?:came|m here|am here).{0,55}\b(?:for you|to see you)\b/ },
    { claim: /\byou (?:were|are|have been|ve been)?\s*(?:looking|searching) for me\b|\byou (?:were|are)?\s*trying to find me\b/, support: /\bi (?:was|am|have been|ve been)?\s*(?:looking|searching) for you\b|\bi (?:was|am)?\s*trying to find you\b/ },
    { claim: /\byou (?:came|went|walked|stepped|headed) (?:out|outside|here|there).{0,45}\b(?:for me|to see me)\b/, support: /\bi (?:came|went|walked|stepped|headed) (?:out|outside|here|there).{0,45}\b(?:for you|to see you)\b/ },
    { claim: /\byou (?:wanted|needed|were trying|are trying) to (?:get|have) my attention\b|\byou wanted my attention\b/, support: /\bi (?:wanted|needed|was trying|am trying) to (?:get|have) your attention\b|\bi wanted your attention\b/ },
    { claim: /\byou (?:were|are|got) jealous\b/, support: /\bi (?:was|am|got) jealous\b|\bjealous\b/ },
  ];
  return claims.some(({ claim, support }) => claim.test(text) && !support.test(latest));
}
function hasUserMotiveOverride(reply = "", latestUserMessage = "", recentUserMessages = []) {
  const text = normalizeText(reply), latest = normalizeText(latestUserMessage), recent = [latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages : [])].map(normalizeText).filter(Boolean).join(" ");
  const userSeeking = /\bi (?:was|am|have been|ve been)?\s*(?:looking|searching) for you\b|\bi (?:was|am)?\s*trying to find you\b|\bi (?:came|went|walked|stepped|headed) (?:out|outside|here|there).{0,45}\b(?:for you|to see you)\b|\bi (?:wanted|needed|was trying|am trying) to (?:get|have) your attention\b|\bi wanted your attention\b/.test(recent);
  if (userSeeking) return false;
  return /\byou (?:were|are|have been|ve been)?\s*(?:looking|searching) for me\b|\byou (?:were|are)?\s*trying to find me\b|\byou (?:came|went|walked|stepped|headed) (?:out|outside|here|there).{0,45}\b(?:for me|to see me)\b|\byou (?:wanted|needed|were trying|are trying) to (?:get|have) my attention\b|\byou wanted my attention\b|\byou (?:were|are|got) jealous\b/.test(text);
}
function hasRejectedPursuitFramingPersistence(reply = "", latestUserMessage = "") {
  const text = normalizeText(reply), latest = normalizeText(latestUserMessage);
  if (!/\bi (?:didn t|did not|don t|do not) ask for (?:a )?bodyguard\b|\bi (?:don t|do not) need (?:a )?bodyguard\b|\bstop following me\b|\bquit following me\b|\bleave me alone\b/.test(latest)) return false;
  return /\bbodyguard (?:implies|means|would mean)\b|\b(?:i m|i am)?\s*(?:just\s+)?(?:making sure|checking) you don t wander off\b|\bkeeping (?:an? )?eye on you\b|\bkeeping tabs on you\b|\bnot letting you (?:wander|out of (?:my )?sight)\b|\bwatching you to make sure\b/.test(text);
}
function stripDialogue(value = "") {
  return String(value || "")
    .replace(/“[^”]*”/gs, " ")
    .replace(/"[^"]*"/gs, " ");
}
function controlsUserPOV(reply = "", userName = "", latestUserMessage = "") {
  const narration = stripDialogue(reply);
  const latest = normalizeText(latestUserMessage);
  const actionMap = {
    felt: ["feel", "felt"],
    thought: ["think", "thought"],
    realized: ["realize", "realized"],
    decided: ["decide", "decided"],
    wanted: ["want", "wanted"],
    needed: ["need", "needed"],
    knew: ["know", "knew"],
    wondered: ["wonder", "wondered"],
    hoped: ["hope", "hoped"],
    feared: ["fear", "feared"],
    smiled: ["smile", "smiled"],
    laughed: ["laugh", "laughed"],
    nodded: ["nod", "nodded"],
    sighed: ["sigh", "sighed"],
    walked: ["walk", "walked"],
    followed: ["follow", "followed"],
    looked: ["look", "looked"],
    reached: ["reach", "reached"],
    stepped: ["step", "stepped"],
    turned: ["turn", "turned"],
    froze: ["freeze", "froze"],
    blushed: ["blush", "blushed"],
    said: ["say", "said"],
    asked: ["ask", "asked"],
    answered: ["answer", "answered"],
  };
  const isSupportedByLatestTurn = (verb) => (actionMap[verb] || [verb]).some((variant) => latest.includes(variant));

  const secondPersonPattern = /\b(?:you|your body)\s+(felt|thought|realized|decided|wanted|needed|knew|wondered|hoped|feared|smiled|laughed|nodded|sighed|walked|followed|looked|reached|stepped|turned|froze|blushed|said|asked|answered)\b/gi;
  for (const match of narration.matchAll(secondPersonPattern)) {
    const verb = normalizeText(match[1]);
    if (!isSupportedByLatestTurn(verb)) return true;
  }

  if (userName) {
    const escaped = String(userName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const namedPattern = new RegExp(`\\b${escaped}\\s+(felt|thought|realized|decided|smiled|laughed|nodded|walked|said|asked|answered)\\b`, "gi");
    for (const match of narration.matchAll(namedPattern)) {
      const verb = normalizeText(match[1]);
      if (!isSupportedByLatestTurn(verb)) return true;
    }
  }
  return false;
}
function hasUnclosedDialogue(value = "") {
  const text = String(value || "").trim();
  const straightQuotes = (text.match(/"/g) || []).length;
  const curlyOpen = (text.match(/“/g) || []).length;
  const curlyClose = (text.match(/”/g) || []).length;
  if (straightQuotes % 2 !== 0 || curlyOpen !== curlyClose) return true;
  return /(?:\b(?:and|but|because|so|if|when|that|to)|[,;:\-–—])\s*$/i.test(text);
}
function isLowInformationGenericReply(value = "") {
  const text = String(value || "").trim();
  const normalized = normalizeText(stripDialogue(text) + " " + text);
  const words = normalized.split(/\s+/).filter(Boolean);
  const servicePhrase = /\b(?:i understand|i m listening|im listening|go on|tell me more|i hear you|entiendo|te escucho|continua|continúa|cuentame|cuéntame)\b/i.test(normalized);
  const bareAcknowledgment = /^(?:(?:[a-z]+)\s+(?:said|murmured|muttered)\s+)?(?:yeah|okay|ok|fine|alright|sure|vale|bueno|esta bien)[.!\s]*$/i.test(normalized);
  return (servicePhrase && words.length < 34) || bareAcknowledgment || words.length < 7;
}
function replySimilarity(left = "", right = "") {
  const tokens = (value) => new Set(normalizeText(value).split(/\s+/).filter((token) => token.length > 3));
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.min(a.size, b.size);
}

const regenerationFeedbackRules = new Map([
  ["ignored_idea", "Honor the creator's stated idea before adding any new direction."],
  ["too_short", "Finish the complete emotional and conversational beat; do not stop at acknowledgment."],
  ["out_of_character", "Rebuild the response from the character profile and voice fingerprint instead of a generic archetype."],
  ["too_much_narration", "Reduce explanatory and decorative narration; keep only details that change the beat."],
  ["not_enough_dialogue", "Give the character meaningful audible dialogue instead of replacing their voice with description."],
  ["repetitive", "Choose a new opening, gesture, conversational tactic and line structure."],
  ["pov_violation", "Do not write any action, thought, emotion, decision or dialogue for the user."],
  ["missing_emotional_impact", "Let the latest user's words affect the character privately before the outward answer."],
  ["too_cold", "The response felt too emotionally cold. Keep the character in voice, but let the visible event genuinely reach them instead of flattening it."],
  ["too_romantic", "The response pushed romance too hard. Pull back to the earned relationship phase and let the scene breathe without forced intimacy."],
  ["too_ai", "Make the turn less scripted: remove stock romance gestures, cinematic body-language chains, polished dominance lines and narrator labels. React literally and let the character sound casually human."],
  ["wrong_continuity", "Correct continuity first: location, exits, who is present, what each person knows, established objects and unresolved commitments must match visible canon."],
  ["too_long", "Make the response materially shorter. Keep the social beat and cut decorative narration, repeated explanation and extra props."],
  ["too_formal", "Use more casual, age-appropriate spoken language. Avoid polished essay phrasing, legalistic logic and prestige-TV dialogue."],
]);

function normalizeRegenerationFeedback(value = []) {
  const items = Array.isArray(value) ? value : [];
  return [...new Set(items.map((item) => normalizeText(item).replace(/\s+/g, "_")))]
    .filter((item) => regenerationFeedbackRules.has(item))
    .slice(0, 8);
}
function feedbackDirectives(value = []) {
  return normalizeRegenerationFeedback(value).map((code) => regenerationFeedbackRules.get(code));
}

const positiveFeedbackRules = new Map([
  ["voice", "Keep the character's distinctive vocabulary, rhythm, humor and social tactics strong."],
  ["emotion", "Preserve clear private emotional impact before the outward response when the moment matters."],
  ["dialogue", "Preserve meaningful audible dialogue that carries the social beat instead of burying it in narration."],
  ["pacing", "Preserve forward movement: let each turn change or deepen the immediate scene by one earned step."],
]);

function positiveFeedbackDirectives(value = []) {
  const items = Array.isArray(value) ? value : [];
  return [...new Set(items.map((item) => normalizeText(item).replace(/\s+/g, "_")))]
    .filter((item) => positiveFeedbackRules.has(item))
    .slice(0, 4)
    .map((code) => positiveFeedbackRules.get(code));
}
function normalizeStoryPreferences(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const choose = (candidate, allowed, fallback) => allowed.includes(String(candidate || "")) ? String(candidate) : fallback;
  return {
    prose: choose(source.prose, ["contemporary", "literary", "minimal"], "contemporary"),
    dialogue: choose(source.dialogue, ["dialogue_forward", "balanced", "narration_forward"], "dialogue_forward"),
    emotional_interior: choose(source.emotionalInterior, ["interior_visible", "subtle", "restrained"], "interior_visible"),
    romance_pacing: choose(source.romancePacing, ["medium_fast", "medium", "slow"], "medium_fast"),
    custom_instructions: developmentText(source.customInstructions, 900),
    learned_positive_feedback: [...positiveFeedbackRules.keys()].filter((code) =>
      (Array.isArray(source.learnedPositiveFeedback) ? source.learnedPositiveFeedback : []).includes(code)
    ),
    learned_negative_feedback: normalizeRegenerationFeedback(source.learnedNegativeFeedback || source.learnedFeedback),
  };
}
function extractDialogueLines(value = "") {
  const lines = [];
  const pattern = /“([^”]+)”|"([^"]+)"/g;
  let match;
  while ((match = pattern.exec(String(value || ""))) !== null) {
    const line = developmentText(match[1] || match[2], 500);
    if (normalizeText(line).split(/\s+/).filter(Boolean).length >= 5) lines.push(line);
  }
  return lines.slice(0, 8);
}
function openingNarrativeBeat(value = "") {
  const narration = stripDialogue(value).split(/[.!?\n]/).map((item) => item.trim()).find(Boolean) || "";
  return developmentText(narration, 260);
}
function stockGestureMotifs(value = "") {
  const text = normalizeText(value);
  const motifs = [];
  if (/\b(?:jaw (?:tightens|clenches|sets)|grip (?:tightens|shifts)|knuckles? (?:whiten|white)|fists? (?:clench|tighten)|goes? completely still|body (?:goes|turns) still|shoulders? (?:stiffen|tense))\b/.test(text)) motifs.push("tension");
  if (/\b(?:voice|tone) (?:drops|lowers|turns|goes|falls)[^.!?]{0,28}\b(?:low|lower|octave|register|clipped|sharp)\b|\bvoice dropping an octave\b/.test(text)) motifs.push("voice");
  if (/\b(?:gaze|eyes?) (?:snaps?|flicks?|drops?|locks?|cuts?)|\blook(?:s|ed)? straight ahead\b/.test(text)) motifs.push("gaze");
  if (/\b(?:blocks? .*?(?:line of sight|from view)|steps? (?:in front of|between)|shields?|steers? .*? away|protective instincts?)\b/.test(text)) motifs.push("protective");
  if (/\b(?:catches?|grabs?|hooks?) (?:her|him|them|you|your) (?:wrist|arm|elbow|waist)|\bthumb .*? pulse\b/.test(text)) motifs.push("grab");
  if (/\b(?:heart (?:thumps?|hammers?|pounds?)|breath (?:catches?|hitches?)|breath knocking out)\b/.test(text)) motifs.push("physiology");
  if (/\b(?:schools? (?:his|her|their) (?:face|expression)|indifferent mask|defensive smirk|mask .*? back)\b/.test(text)) motifs.push("mask");
  return [...new Set(motifs)];
}
function hasStockBodyLanguageStack(reply = "") {
  return stockGestureMotifs(reply).length >= 3;
}
function hasRecycledStockGesture(reply = "", recentReplies = []) {
  const current = stockGestureMotifs(reply);
  if (!current.length) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-5).map(stockGestureMotifs);
  return current.some((motif) => recent.filter((items) => items.includes(motif)).length >= 2);
}
function extractUserStagedEvents(value = "") {
  const raw = String(value || "");
  return [...raw.matchAll(/\*([^*]+)\*/gs)]
    .map((match) => String(match[1] || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(-8)
    .join("\n- ")
    .replace(/^/, "- ");
}
function hasUserStagedSceneRetcon(reply = "", latestUserMessage = "", characterName = "") {
  const rawLatest = String(latestUserMessage || "");
  const stagedRaw = [...rawLatest.matchAll(/\*([^*]+)\*/gs)].map((match) => match[1]).join(" ");
  if (!stagedRaw.trim()) return false;

  const stage = normalizeText(stagedRaw);
  const text = normalizeText(reply);
  const characterFirst = normalizeText(characterName).split(/\s+/).filter(Boolean)[0] || "";
  const subjectPattern = characterFirst
    ? new RegExp(`\\b(?:he|she|${characterFirst.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")})\\b`)
    : /\b(?:he|she)\b/;

  // If the user explicitly stages the character as still participating after a request
  // or confrontation, Velvet cannot jump backward and choose an immediate exit instead.
  const stagedPresenceAction = subjectPattern.test(stage) && /\b(?:flirt\w*|talk\w*|chat\w*|laugh\w*|smil\w*|sit\w*|stay\w*|remain\w*|continu\w*|answer\w*|repl\w*|lean\w*|look\w*|jok\w*|teas\w*)\b/.test(stage);
  const stagedDeparture = subjectPattern.test(stage) && /\b(?:left|leave\w*|walk\w* away|head\w* out|went away|go\w* away|exit\w*)\b/.test(stage);
  const replyImmediateDeparture = /\b(?:walk\w*|head\w*|strode|left|leave\w*|went|goes?)\b.{0,90}\b(?:exit|door|away|outside|out|library|building)\b/.test(text);
  if (stagedPresenceAction && !stagedDeparture && replyImmediateDeparture) return true;

  // A particularly destructive retcon is denying an interaction the user explicitly
  // said already occurred, e.g. "he was flirting back" -> "he ignored her and left".
  const stagedFlirtBack = /\b(?:flirt\w* back|flirt\w* with (?:her|him|the girl|the guy))\b/.test(stage);
  const replyDeniesInteraction = /\b(?:didn t|did not|never|without)\b.{0,90}\b(?:flirt\w*|answer\w*|acknowledg\w*|look\w*|speak\w*|talk\w*)\b/.test(text) || /\b(?:ignore\w*|brush\w* off)\b.{0,60}\b(?:her|him|girl|guy)\b/.test(text);
  if (stagedFlirtBack && replyDeniesInteraction) return true;

  return false;
}
function userExplicitlyStagesDeparture(latestUserMessage = "") {
  const raw = String(latestUserMessage || "");
  const staged = [...raw.matchAll(/\*([^*]+)\*/gs)].map((match) => normalizeText(match[1])).join(" ");
  const stagedExit = /\b(?:i|me)\b.{0,35}\b(?:walk(?:ed|ing)? away|leave|left|head(?:ed|ing)? (?:out|away|for the door)|go(?:ing)? outside|step(?:ped|ping)? away|turn(?:ed|ing)? and (?:leave|walk|head)|me voy|me fui|me alejo|salgo)\b/.test(staged);
  if (stagedExit) return true;

  const stripped = raw.replace(/\*[^*]+\*/gs, " ");
  const literalAction = /(?:^|[.!?]\s*)i\s+(?:walk(?:ed)? away|leave|left|head(?:ed)? (?:out|away|for the door)|go outside|step(?:ped)? away|turn(?:ed)? and (?:leave|walk away))\b/i.test(stripped)
    || /(?:^|[.!?]\s*)(?:me voy|me fui|me alejo|salgo)\b/i.test(stripped);
  const idiomaticLeaveYouWith = /\b(?:i(?:'|’)ll|i will|im going to|i am going to)\s+leave\s+you\s+(?:with|to)\b/i.test(stripped);
  return literalAction && !idiomaticLeaveYouWith;
}
function latestDepartureCueWithoutAction(latestUserMessage = "", recentUserMessages = []) {
  const candidates = [latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages.slice().reverse() : [])]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  for (const candidate of candidates) {
    if (userExplicitlyStagesDeparture(candidate)) return "";
    const normalized = normalizeText(candidate);
    if (/\b(?:i ll leave|i will leave|i might leave|maybe i should go|im leaving|i m leaving|then i ll leave|leave you with|leave you to it|me voy entonces|entonces me voy|quizas me vaya|quizás me vaya)\b/.test(normalized)) return candidate;
    if (!isSilentContinueText(candidate)) break;
  }
  return "";
}
function hasUnstagedUserDepartureInference(reply = "", latestUserMessage = "", userName = "", recentUserMessages = []) {
  const departureCue = latestDepartureCueWithoutAction(latestUserMessage, recentUserMessages);
  if (!departureCue) return false;

  const text = normalizeText(stripDialogue(reply));
  const first = normalizeText(userName).split(/\s+/).filter(Boolean)[0] || "";
  const escapedFirst = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const subject = first ? `(?:she|he|${escapedFirst})` : "(?:she|he|the user)";
  const movement = new RegExp(`\\b${subject}\\b.{0,110}\\b(?:headed|heading|walked|walking|walked off|walking off|left|leaving|departed|departing|moved away|moving away|turned away|started toward|made (?:her|his) way|was already going)\\b`);
  const doorway = /\b(?:departing doorway|toward the exit|toward the door|heading the other way|walked off|walking off|watched (?:her|him) go|watched (?:her|him) leave|as (?:she|he) left|before (?:she|he) could leave)\b/.test(text);
  const pursuitTarget = escapedFirst ? `(?:her|him|${escapedFirst})` : "(?:her|him|the user)";
  const pursuitAssumption = /\b(?:didn t|did not|never)\s+(?:move|step|start|try)\s+to\s+(?:follow|stop|catch|go after)\b|\b(?:chose not to|made no move to|didn t bother to|did not bother to)\s+(?:follow|stop|catch|go after)\b/.test(text)
    || new RegExp(`\\b(?:followed|went after|started after|called after)\\s+${pursuitTarget}\\b`).test(text);
  const vanishedUser = new RegExp(`\\b(?:door|doorway|exit|hall|crowd)\\b.{0,90}\\b${subject}\\b.{0,70}\\b(?:gone|left|walked|headed|disappeared)\\b|\\b${subject}\\b.{0,90}\\b(?:gone|out of sight|no longer there)\\b`).test(text);
  return movement.test(text) || doorway || pursuitAssumption || vanishedUser;
}
function hasUnstagedUserMovementInference(reply = "", latestUserMessage = "", userName = "", recentUserMessages = []) {
  // V2.11.22: dialogue/social closure is not body movement. The model must not
  // manufacture a walk-away in order to unlock pursuit/contact choreography.
  // "Have fun then", "whatever", "okay", etc. leave the user exactly where
  // canon last placed them unless the user visibly narrates movement.
  if (userExplicitlyStagesDeparture(latestUserMessage)) return false;

  const recentUsers = Array.isArray(recentUserMessages) ? recentUserMessages : [];
  // Preserve genuinely ongoing movement only when the user themselves staged it
  // in the immediately preceding user beat. Never inherit movement merely because
  // an earlier model reply claimed it happened.
  const previousUser = recentUsers.length ? String(recentUsers[recentUsers.length - 1] || "") : "";
  const latestNorm = normalizeText(latestUserMessage);
  const previousIsSame = normalizeText(previousUser) === latestNorm;
  const priorUserMovement = !previousIsSame && userExplicitlyStagesDeparture(previousUser);
  if (priorUserMovement && /^(?:have fun(?: then)?|okay|ok|fine|whatever|thanks|thank you|sure|alright|good|great|amazing|cool|bye|goodbye)[.!?\s]*$/i.test(String(latestUserMessage || "").trim())) return false;

  const raw = String(reply || "");
  const text = normalizeText(raw);
  if (!text) return false;
  const first = normalizeText(userName).split(/\s+/).filter(Boolean)[0] || "";
  const escapedFirst = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const target = escapedFirst ? `(?:you|her|him|them|${escapedFirst})` : "(?:you|her|him|them)";
  const poss = escapedFirst ? `(?:your|her|his|their|${escapedFirst}s)` : "(?:your|her|his|their)";

  const assumptions = [
    new RegExp(`\\b(?:didn t|did not|wouldn t|would not)\\s+let\\s+${target}\\s+(?:walk away|leave|go|get away)\\b`),
    new RegExp(`\\bbefore\\s+${target}\\s+(?:could|managed to|got to)\\s+(?:leave|walk away|go|take\\s+(?:one|two|another|a)\\s+steps?)\\b`),
    new RegExp(`\\b${target}\\b[^.!?]{0,80}\\b(?:turned to leave|started to leave|started walking away|walked away|headed for the (?:door|exit)|moved away|was leaving|was walking away)\\b`),
    new RegExp(`\\b(?:followed|went after|stepped after|moved after|caught up (?:with|to)|called after|ran after|jogged after)\\s+${target}\\b`),
    new RegExp(`\\b(?:caught|grabbed|took|closed (?:his|her|their) hand around)\\s+${poss}\\s+(?:wrist|forearm|arm|elbow)\\b[^.!?]{0,120}\\b(?:stop|stopped|halt|halted|check|checked)\\b[^.!?]{0,60}\\b(?:momentum|leaving|departure|walk|movement)\\b`),
    new RegExp(`\\b(?:stop|stopped|halt|halted|checked)\\s+${poss}\\s+(?:momentum|movement)\\b`),
    new RegExp(`\\b(?:blocked|stepped into|moved into)\\s+${poss}\\s+(?:path|way)\\b[^.!?]{0,80}\\b(?:leave|leaving|walk|walking|exit|door)\\b`),
    new RegExp(`\\b(?:watched|saw)\\s+${target}\\s+(?:leave|walk away|head away|go|disappear)\\b`),
  ];
  return assumptions.some((pattern) => pattern.test(text));
}

function hasUnsupportedMotiveEscalation(reply = "", latestUserMessage = "") {
  const text = normalizeText(reply), latest = normalizeText(latestUserMessage);
  const accusation = /\b(?:stop trying to|center of attention|for their benefit|for his benefit|for her benefit|make me jealous|make .* jealous|you just want|you only want|you re being dramatic|you are being dramatic|making a scene|attention seeking|pick me)\b/.test(text);
  if (!accusation) return false;
  return !/\b(?:attention|jealous|dramatic|scene|pick me|trying to|benefit)\b/.test(latest);
}
function hasDistanceBoundaryOverride(reply = "", latestUserMessage = "") {
  const text = normalizeText(reply), latest = normalizeText(latestUserMessage);
  // Movement changes position. It is NOT automatically a no-touch/no-follow boundary.
  // This hard guard activates only when the user rejects contact/proximity or visibly
  // removes an existing touch. That keeps chemistry possible without overriding consent.
  const explicitContactBoundary = /\b(?:dont touch me|do not touch me|stop touching me|let me go|let go of me|back off|get off me|give me space|move away from me|stay away from me|no me toques|sueltame|dejame espacio|alejate de mi)\b/.test(latest);
  const visibleContactWithdrawal = /\b(?:pull|pulled|jerk|jerked|yank|yanked)\b[^.!?]{0,45}\b(?:arm|hand|wrist|myself|away)\b/.test(latest);
  if ((!explicitContactBoundary && !visibleContactWithdrawal) || /\b(?:slip|slipped|fall|fell|trip|tripped|stumble|stumbled|traffic|car hits|attack|attacks|lunges|weapon)\b/.test(latest)) return false;
  return /\b(?:grab(?:s|bed|bing)?|catch(?:es|caught|ing)? .*? (?:wrist|arm|waist|elbow)|take(?:s|n)? .*? wrist|pull(?:s|ed)? .*? closer|step(?:s|ped)? closer|close(?:s|d)? the distance|block(?:s|ed)? .*? path|steer(?:s|ed)? .*? back)\b/.test(text);
}
function hasSocialTensionOverEscalation(reply = "", latestUserMessage = "") {
  const text = normalizeText(reply), latest = normalizeText(latestUserMessage);
  const socialScene = /\b(?:friends?|group|girl|guy|rumou?r|dating|supposedly|coming over|approach(?:ing|ed)?|classmates?|party)\b/.test(latest);
  const actualDanger = /\b(?:attack(?:s|ed|ing)?|lung(?:e|es|ed|ing)|hit(?:s|ting)?|punch(?:es|ed|ing)?|weapon|knife|gun|physically threatens?|throws? .*? punch)\b/.test(latest);
  if (!socialScene || actualDanger) return false;
  return /\b(?:protective instincts?|block(?:s|ed)? .*? line of sight|step(?:s|ped)? between .*? and|steer(?:s|ed)? .*? away|let (?:him|her|them) try|shield(?:s|ed)? .*? from)\b/.test(text);
}
function hasRepeatedRecentSignature(reply = "", recentReplies = []) {
  const currentDialogue = extractDialogueLines(reply);
  const currentOpening = openingNarrativeBeat(reply);
  const currentOpeningWords = normalizeText(currentOpening).split(/\s+/).filter((token) => token.length > 3);
  for (const recent of (Array.isArray(recentReplies) ? recentReplies : []).slice(-6)) {
    const recentDialogue = extractDialogueLines(recent);
    if (currentDialogue.some((line) => recentDialogue.some((other) => normalizeText(line) === normalizeText(other) || replySimilarity(line, other) >= 0.86))) return true;
    const recentOpening = openingNarrativeBeat(recent);
    const recentOpeningWords = normalizeText(recentOpening).split(/\s+/).filter((token) => token.length > 3);
    if (currentOpeningWords.length >= 6 && recentOpeningWords.length >= 6 && replySimilarity(currentOpening, recentOpening) >= 0.78) return true;
  }
  return false;
}
function developmentText(value = "", maximum = 600) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maximum);
}
function developmentList(value, maximumItems = 8, maximumLength = 280) {
  const items = Array.isArray(value) ? value : [];
  return [...new Set(items.map((item) => developmentText(item, maximumLength)).filter(Boolean))].slice(-maximumItems);
}
function normalizeCharacterDevelopment(value = {}, relationshipPremise = "", includeUndoSnapshot = true) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const allowedPhases = new Set(["baseline", "established", "warming", "strained", "repairing", "deepening", "romantic_shift", "committed"]);
  const requestedPhase = developmentText(source.relationship_phase, 40).toLowerCase();
  const defaultPhase = developmentText(relationshipPremise, 20) ? "established" : "baseline";
  const phase = allowedPhases.has(requestedPhase) ? requestedPhase : defaultPhase;

  const residue = (Array.isArray(source.emotional_residue) ? source.emotional_residue : [])
    .map((item) => {
      const remaining = Math.max(1, Math.min(10, Number(item?.remaining_turns) || 1));
      return {
        emotion: developmentText(item?.emotion, 120),
        cause: developmentText(item?.cause, 240),
        behavioral_effect: developmentText(item?.behavioral_effect, 240),
        remaining_turns: remaining,
        intensity: Math.max(0.15, Math.min(1, Number(item?.intensity) || Math.min(1, 0.28 + remaining * 0.08))),
      };
    })
    .filter((item) => item.emotion && item.cause)
    .slice(-4);

  const turningPoints = (Array.isArray(source.turning_points) ? source.turning_points : [])
    .map((item) => ({
      message_id: developmentText(item?.message_id, 100),
      event: developmentText(item?.event, 320),
      impact: developmentText(item?.impact, 320),
    }))
    .filter((item) => item.event)
    .slice(-12);

  const normalized = {
    version: 2,
    turns_observed: Math.max(0, Number(source.turns_observed) || 0),
    relationship_phase: phase,
    phase_candidate: developmentText(source.phase_candidate, 40).toLowerCase(),
    phase_evidence_count: Math.max(0, Math.min(3, Number(source.phase_evidence_count) || 0)),
    current_dynamic: developmentText(source.current_dynamic || relationshipPremise, 700),
    emotional_residue: residue,
    active_contradictions: developmentList(source.active_contradictions, 4, 260),
    flaw_pressure: developmentText(source.flaw_pressure, 280),
    independent_priority: developmentText(source.independent_priority, 280),
    repair_progress: developmentText(source.repair_progress, 280),
    current_mood: developmentText(source.current_mood, 160),
    emotional_posture: developmentText(source.emotional_posture, 220),
    guardedness: developmentText(source.guardedness, 180),
    trust_direction: developmentText(source.trust_direction, 180),
    vulnerability_window: developmentText(source.vulnerability_window, 220),
    setback_pressure: developmentText(source.setback_pressure, 240),
    retained_growth: developmentText(source.retained_growth, 260),
    relationship_signature: developmentText(source.relationship_signature, 360),
    private_patterns: developmentList(source.private_patterns, 6, 220),
    sore_spots: developmentList(source.sore_spots, 5, 220),
    shared_rituals: developmentList(source.shared_rituals, 5, 220),
    memory_influence: developmentText(source.memory_influence, 300),
    voice_shift: developmentText(source.voice_shift, 260),
    conflict_aftertaste: developmentText(source.conflict_aftertaste, 260),
    repair_debt: developmentText(source.repair_debt, 260),
    turning_points: turningPoints,
    learned_preferences: {
      encourage: developmentList(source.learned_preferences?.encourage, 8, 300),
      avoid: developmentList(source.learned_preferences?.avoid, 8, 300),
    },
    last_message_id: developmentText(source.last_message_id, 100),
  };

  return {
    ...normalized,
    undo_snapshot: includeUndoSnapshot && source.undo_snapshot && typeof source.undo_snapshot === "object"
      ? normalizeCharacterDevelopment(source.undo_snapshot, relationshipPremise, false)
      : null,
  };
}
function characterDevelopmentPromptView(value = {}, relationshipPremise = "") {
  const { undo_snapshot: _undoSnapshot, ...visible } = normalizeCharacterDevelopment(value, relationshipPremise);
  return visible;
}
function resolveCharacterDevelopmentBranch(value = {}, relationshipPremise = "", replacementMessageId = "") {
  const state = normalizeCharacterDevelopment(value, relationshipPremise);
  const replacementId = developmentText(replacementMessageId, 100);
  if (!replacementId) return state;
  if (state.last_message_id === replacementId && state.undo_snapshot) {
    return normalizeCharacterDevelopment(state.undo_snapshot, relationshipPremise);
  }
  return normalizeCharacterDevelopment({}, relationshipPremise);
}
function canTransitionCharacterPhase(currentPhase = "baseline", proposedPhase = "") {
  const transitions = new Map([
    ["baseline", ["established", "warming", "strained"]],
    ["established", ["baseline", "warming", "strained"]],
    ["warming", ["established", "strained", "deepening", "romantic_shift"]],
    ["strained", ["baseline", "established", "warming", "repairing"]],
    ["repairing", ["established", "warming", "strained", "deepening"]],
    ["deepening", ["warming", "strained", "repairing", "romantic_shift", "committed"]],
    ["romantic_shift", ["warming", "strained", "deepening", "committed"]],
    ["committed", ["strained", "repairing", "deepening", "romantic_shift"]],
  ]);
  return (transitions.get(currentPhase) || []).includes(proposedPhase);
}
function isGroundedDevelopmentEvidence(evidence = "", latestUserMessage = "", reply = "") {
  const evidenceTokens = normalizeText(evidence).split(/\s+/).filter((token) => token.length > 2);
  if (!evidenceTokens.length) return false;
  const visibleTokens = new Set(normalizeText(`${latestUserMessage} ${reply}`).split(/\s+/).filter(Boolean));
  const matches = evidenceTokens.filter((token) => visibleTokens.has(token)).length;
  const required = Math.min(3, Math.max(1, Math.ceil(evidenceTokens.length * 0.35)));
  return matches >= required;
}
function summarizeRejectedStyle(rejectedResponses = []) {
  const text = rejectedResponses.map((item) => String(item || "").trim()).filter(Boolean).join("\n");
  if (!text) return [];
  const feedback = [];
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  if (isLowInformationGenericReply(text)) feedback.push("Avoid service-like acknowledgments and empty agreement.");
  if (words.length < 28) feedback.push("Avoid underdeveloped replies that stop before the social beat lands.");
  if (!/["“”]/.test(text)) feedback.push("Do not let narration replace the character's audible voice.");
  const decorativeHits = (normalizeText(text).match(/\b(?:rain|umbrella|jaw|breath|pavement|eyes|silence|shoulder)\b/g) || []).length;
  if (decorativeHits >= 4) feedback.push("Avoid decorative repetition of weather, glances, jaws, breathing and other filler gestures.");
  if (hasStockBodyLanguageStack(text)) feedback.push("Avoid stock AI-romance choreography; use fewer physical tells and a different conversational shape.");
  if (!feedback.length) feedback.push("A regeneration must change the character's choice, conversational tactic and dialogue—not merely paraphrase the rejected take.");
  return feedback;
}
function applyCharacterDevelopment({
  previous = {},
  update = {},
  relationshipPremise = "",
  latestUserMessage = "",
  reply = "",
  messageId = "",
  isRegeneration = false,
  regenerationInstruction = "",
  regenerationFeedback = [],
  rejectedResponses = [],
} = {}) {
  const state = normalizeCharacterDevelopment(previous, relationshipPremise);
  const proposal = update && typeof update === "object" && !Array.isArray(update) ? update : {};
  const significance = ["none", "low", "medium", "high"].includes(String(proposal.significance || "").toLowerCase())
    ? String(proposal.significance).toLowerCase()
    : "none";
  const evidence = developmentText(proposal.evidence, 320);
  const grounded = significance !== "none" && isGroundedDevelopmentEvidence(evidence, latestUserMessage, reply);
  const allowedPhases = new Set(["baseline", "established", "warming", "strained", "repairing", "deepening", "romantic_shift", "committed"]);
  const proposedPhase = developmentText(proposal.relationship_phase, 40).toLowerCase();
  const phaseProposalIsCompatible = !proposedPhase ||
    proposedPhase === state.relationship_phase ||
    (allowedPhases.has(proposedPhase) && canTransitionCharacterPhase(state.relationship_phase, proposedPhase));

  const next = {
    ...state,
    undo_snapshot: characterDevelopmentPromptView(state, relationshipPremise),
    turns_observed: state.turns_observed + 1,
    emotional_residue: state.emotional_residue
      .map((item) => ({ ...item, remaining_turns: item.remaining_turns - 1, intensity: Math.max(0.12, Number(item.intensity || 0.5) * 0.82) }))
      .filter((item) => item.remaining_turns > 0 && item.intensity >= 0.14),
    learned_preferences: {
      encourage: [...state.learned_preferences.encourage],
      avoid: [...state.learned_preferences.avoid],
    },
    last_message_id: developmentText(messageId, 100),
  };

  if (grounded) {
    const dynamic = developmentText(proposal.relationship_dynamic, 700);
    if (dynamic && phaseProposalIsCompatible && ["medium", "high"].includes(significance)) {
      next.current_dynamic = dynamic;
    }

    const emotion = developmentText(proposal.emotional_residue, 140);
    if (emotion) {
      const newResidue = {
        emotion,
        cause: evidence,
        behavioral_effect: developmentText(proposal.behavioral_effect, 260),
        remaining_turns: significance === "high" ? 9 : significance === "medium" ? 6 : 3,
        intensity: significance === "high" ? 1 : significance === "medium" ? 0.78 : 0.52,
      };
      const duplicateKey = normalizeText(`${emotion} ${evidence}`);
      next.emotional_residue = [
        ...next.emotional_residue.filter((item) => normalizeText(`${item.emotion} ${item.cause}`) !== duplicateKey),
        newResidue,
      ].slice(-4);
    }

    const contradiction = developmentText(proposal.active_contradiction, 260);
    if (contradiction) next.active_contradictions = developmentList([...state.active_contradictions, contradiction], 4, 260);

    const flawPressure = developmentText(proposal.flaw_pressure, 280);
    if (flawPressure) next.flaw_pressure = flawPressure;
    const independentPriority = developmentText(proposal.independent_priority, 280);
    if (independentPriority) next.independent_priority = independentPriority;
    const repairProgress = developmentText(proposal.repair_progress, 280);
    if (repairProgress) next.repair_progress = repairProgress;

    const currentMood = developmentText(proposal.current_mood, 160);
    if (currentMood) next.current_mood = currentMood;
    const emotionalPosture = developmentText(proposal.emotional_posture, 220);
    if (emotionalPosture) next.emotional_posture = emotionalPosture;
    const guardedness = developmentText(proposal.guardedness, 180);
    if (guardedness) next.guardedness = guardedness;
    const trustDirection = developmentText(proposal.trust_direction, 180);
    if (trustDirection) next.trust_direction = trustDirection;
    const vulnerabilityWindow = developmentText(proposal.vulnerability_window, 220);
    if (vulnerabilityWindow) next.vulnerability_window = vulnerabilityWindow;
    const setbackPressure = developmentText(proposal.setback_pressure, 240);
    if (setbackPressure) next.setback_pressure = setbackPressure;
    const retainedGrowth = developmentText(proposal.retained_growth, 260);
    if (retainedGrowth) next.retained_growth = retainedGrowth;
    const relationshipSignature = developmentText(proposal.relationship_signature, 360);
    if (relationshipSignature && ["medium", "high"].includes(significance)) next.relationship_signature = relationshipSignature;
    const privatePattern = developmentText(proposal.private_pattern, 220);
    if (privatePattern && ["medium", "high"].includes(significance)) next.private_patterns = developmentList([...(state.private_patterns || []), privatePattern], 6, 220);
    const soreSpot = developmentText(proposal.sore_spot, 220);
    if (soreSpot && ["medium", "high"].includes(significance)) next.sore_spots = developmentList([...(state.sore_spots || []), soreSpot], 5, 220);
    const sharedRitual = developmentText(proposal.shared_ritual, 220);
    if (sharedRitual && ["medium", "high"].includes(significance)) next.shared_rituals = developmentList([...(state.shared_rituals || []), sharedRitual], 5, 220);
    const memoryInfluence = developmentText(proposal.memory_influence, 300);
    if (memoryInfluence) next.memory_influence = memoryInfluence;
    const voiceShift = developmentText(proposal.voice_shift, 260);
    if (voiceShift && significance === "high") next.voice_shift = voiceShift;
    const conflictAftertaste = developmentText(proposal.conflict_aftertaste, 260);
    if (conflictAftertaste) next.conflict_aftertaste = conflictAftertaste;
    const repairDebt = developmentText(proposal.repair_debt, 260);
    if (repairDebt) next.repair_debt = repairDebt;

    if (["medium", "high"].includes(significance)) {
      const turningPoint = developmentText(proposal.turning_point, 320);
      if (turningPoint) {
        next.turning_points = [
          ...state.turning_points,
          {
            message_id: developmentText(messageId, 100),
            event: turningPoint,
            impact: developmentText(proposal.behavioral_effect || proposal.relationship_dynamic, 320),
          },
        ].slice(-12);
      }
    }

    if (allowedPhases.has(proposedPhase) &&
      proposedPhase !== state.relationship_phase &&
      canTransitionCharacterPhase(state.relationship_phase, proposedPhase) &&
      ["medium", "high"].includes(significance)) {
      const increment = significance === "high" ? 2 : 1;
      const sameCandidate = state.phase_candidate === proposedPhase;
      const evidenceCount = Math.min(3, (sameCandidate ? state.phase_evidence_count : 0) + increment);
      next.phase_candidate = proposedPhase;
      next.phase_evidence_count = evidenceCount;
      if (evidenceCount >= 3) {
        next.relationship_phase = proposedPhase;
        next.phase_candidate = "";
        next.phase_evidence_count = 0;
      }
    } else if (proposedPhase === state.relationship_phase) {
      next.phase_candidate = "";
      next.phase_evidence_count = 0;
    }
  }

  if (isRegeneration) {
    next.learned_preferences.avoid = developmentList([
      ...next.learned_preferences.avoid,
      ...summarizeRejectedStyle(rejectedResponses),
    ], 8, 300);
    const direction = developmentText(regenerationInstruction, 280);
    if (direction) {
      next.learned_preferences.encourage = developmentList([
        ...next.learned_preferences.encourage,
        `Creator direction: ${direction}`,
      ], 8, 300);
    }
    const feedback = feedbackDirectives(regenerationFeedback);
    if (feedback.length) {
      next.learned_preferences.encourage = developmentList([
        ...next.learned_preferences.encourage,
        ...feedback.map((item) => `Creator feedback: ${item}`),
      ], 8, 300);
    }
  }

  return normalizeCharacterDevelopment(next, relationshipPremise);
}


function dialogueQuestionCount(value = "") {
  const text = String(value || "");
  const dialogue = [...text.matchAll(/["“]([^"”]+)["”]/g)].map((match) => match[1]).join(" ");
  return (dialogue.match(/\?/g) || []).length;
}
function hasRhetoricalDialogueOveruse(reply = "", recentReplies = []) {
  const text = normalizeText(reply);
  const questions = dialogueQuestionCount(reply);
  const rhetoricalMarkers = [
    /\bright[,.]? because\b/,
    /\bmy mistake for (?:assuming|thinking)\b/,
    /\band what exactly\b/,
    /\bwhat did you expect\b/,
    /\bbecause .{0,80}\?$/,
    /\bso (?:what|why|you) .{0,80}\?$/,
  ];
  const markerHit = rhetoricalMarkers.some((pattern) => pattern.test(text));
  if (questions >= 2 && markerHit) return true;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-3);
  const recentRhetorical = recent.filter((item) => dialogueQuestionCount(item) >= 1 && rhetoricalMarkers.some((pattern) => pattern.test(normalizeText(item)))).length;
  return markerHit && recentRhetorical >= 2;
}
function hasSarcasticComebackLoop(reply = "", recentReplies = []) {
  const patterns = [
    /\bright[,.]? because\b/,
    /\bbrilliant strategy\b/,
    /\bfascinating distinction\b/,
    /\bmy mistake for (?:assuming|thinking)\b/,
    /\bhigh praise\b/,
    /\bkeep practicing that\b/,
    /\bimpressive work\b/,
    /\btruly\b.{0,40}$/,
  ];
  const isComeback = (value) => patterns.some((pattern) => pattern.test(normalizeText(value)));
  if (!isComeback(reply)) return false;
  return (Array.isArray(recentReplies) ? recentReplies : []).slice(-3).filter(isComeback).length >= 2;
}
function hasSmugComebackTone(reply = "", latestUserMessage = "") {
  const text = normalizeText(reply);
  const dialogue = [...String(reply || "").matchAll(/["“]([^"”]+)["”]/g)].map((m) => normalizeText(m[1])).join(" ");
  const user = normalizeText(latestUserMessage);

  const smugMarkers = [
    /\bnaturally\b/,
    /\bof course it (?:is|was)\b/,
    /\bkeep up(?:,|\b)/,
    /\btry to keep up\b/,
    /\bclearly you\b/,
    /\bhow observant\b/,
    /\bcongratulations\b.{0,45}\b(?:figured|noticed|realized)\b/,
    /\bwhat a surprise\b/,
    /\bshocking\b.{0,35}$/,
    /\bit has nothing to do with me\b/,
    /\bnot my problem\b/,
    /\bif you say so\b/,
  ];
  const hits = smugMarkers.filter((pattern) => pattern.test(dialogue || text)).length;

  // A single mild phrase can be natural. Two or more in one casual reply is the smug-comeback voice
  // the user explicitly wants limited, even if recent history is clean.
  if (hits >= 2) return true;

  // If the user's turn is light teasing / casual banter rather than a confrontation, do not auto-escalate
  // it into a superiority comeback just because the character profile permits sarcasm.
  const lightUserTurn = user.length > 0 && user.length < 220 && !/\b(?:hate|angry|mad|furious|leave me|stop|don't|do not|fight|argue|serious)\b/.test(user);
  return lightUserTurn && hits >= 1 && /\b(?:keep up|how observant|congratulations|what a surprise)\b/.test(dialogue || text);
}



function hasGenericRomanceCadence(reply = "", recentReplies = [], character = {}) {
  const text = normalizeText(reply);
  if (!text) return false;
  const profile = normalizeText(`${character?.speech_style || ""} ${character?.example_dialogue || ""} ${character?.voice_vocabulary || ""}`);
  // Explicitly melodramatic/theatrical profiles may intentionally use heightened romance language,
  // but still get caught if they repeat several stock beats across turns.
  const heightenedProfile = /\b(?:theatrical|melodramatic|romance novel|dramatic flirt|campy|soap opera)\b/.test(profile);
  const patterns = [
    /\bthere it is\b/,
    /\bcareful(?: now)?\b/,
    /\byoure impossible\b/,
    /\bdont tempt me\b/,
    /\byou have no idea\b/,
    /\bthats what i thought\b/,
    /\bsay that again\b/,
    /\byou know exactly what youre doing\b/,
    /\bkeep telling yourself that\b/,
    /\byoure trouble\b/,
    /\bis that so\b/,
    /\bgood to know\b/,
    /\binteresting choice\b/,
    /\bbold of you\b/,
    /\bi can work with that\b/,
  ];
  const hitCount = (value) => patterns.filter((pattern) => pattern.test(normalizeText(value))).length;
  const currentHits = hitCount(text);
  if (currentHits >= (heightenedProfile ? 3 : 2)) return true;
  if (currentHits === 0) return false;
  const recentHitTurns = (Array.isArray(recentReplies) ? recentReplies : []).slice(-4).filter((item) => hitCount(item) > 0).length;
  return recentHitTurns >= (heightenedProfile ? 3 : 2);
}

function hasGenericAIVoice(reply = "", latestUserMessage = "", character = {}) {
  if (characterAllowsOrnateDialogue(character)) return false;
  const text = normalizeText(reply);
  const user = normalizeText(latestUserMessage);
  if (!text) return false;

  const stock = [
    /\bkeep(?:ing)? my gpa from (?:plummeting|dropping|tanking)\b/,
    /\bmid semester burnout\b/,
    /\bbrain (?:is )?(?:officially )?(?:at|running at) \d{1,3} percent capacity\b/,
    /\bburied in (?:those )?(?:heavy duty )?(?:lab reports|assignments|papers|coursework)\b/,
    /\b(?:actually )?manage(?:d)? to escape the library\b/,
    /\bsurviv(?:e|ing) on caffeine\b/,
    /\bdodg(?:e|ing) the inevitable\b/,
    /\btrying to keep .{0,45} while dodging\b/,
    /\bhow about you still .{0,80}\b/,
  ];
  if (stock.some((pattern) => pattern.test(text))) return true;

  // Short, ordinary user turns should not trigger a polished lifestyle monologue.
  const userWords = user.split(/\s+/).filter(Boolean).length;
  if (userWords > 0 && userWords <= 12) {
    const dialogue = [...String(reply || "").matchAll(/["“]([^"”]+)["”]/g)].map((m) => normalizeText(m[1])).join(" ");
    const dialogueWords = dialogue.split(/\s+/).filter(Boolean).length;
    const polishedFiller = [
      /\bofficially\b/, /\binevitable\b/, /\bcapacity\b/, /\bburnout\b/,
      /\bheavy duty\b/, /\bplummeting\b/, /\bdodging\b/, /\bhow about you\b/,
    ].filter((pattern) => pattern.test(dialogue)).length;
    if (dialogueWords >= 34 && polishedFiller >= 2) return true;
  }
  return false;
}

function reactionStyleSignature(value = "") {
  const text = normalizeText(value);
  if (!text) return "silence";
  const questionCount = (text.match(/\?/g) || []).length;
  if (/\b(?:i understand|give you space|if you need anything|i'm here if|im here if|you deserve|your feelings are valid)\b/.test(text)) return "therapeutic_reassurance";
  if (/\b(?:kidding|joking|relax|dramatic|funny|cute|adorable)\b/.test(text) && questionCount) return "tease_then_question";
  if (/\b(?:fine|whatever|forget it|doesn't matter|doesnt matter|never mind|nevermind)\b/.test(text)) return "withdrawal";
  if (/\b(?:i'll|ill|let me|we should|i can|i'll get|ill get|i'll call|ill call|i'll handle|ill handle)\b/.test(text)) return "practical_action";
  if (questionCount >= 2) return "question_back";
  if (/\b(?:sorry|my fault|i was wrong|shouldn't have|shouldnt have)\b/.test(text)) return "repair_admission";
  if (/\b(?:miss you|want you|like you|love you|kiss|date)\b/.test(text)) return "affection_forward";
  if (text.split(/\s+/).length > 120) return "long_explanation";
  if (/\b(?:smirk|scoff|raised an eyebrow|tilted (?:his|her|their) head|gaze|jaw)\b/.test(text) && questionCount) return "cinematic_banter";
  return questionCount ? "direct_then_question" : "plain_direct";
}

function hasReactionCloneDrift(reply = "", recentReplies = []) {
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-4).map(reactionStyleSignature);
  if (recent.length < 3) return false;
  const current = reactionStyleSignature(reply);
  const cloneProne = new Set(["therapeutic_reassurance", "tease_then_question", "question_back", "long_explanation", "cinematic_banter", "direct_then_question"]);
  if (!cloneProne.has(current)) return false;
  return recent.slice(-2).every((item) => item === current) || recent.filter((item) => item === current).length >= 3;
}

function hasExplanatorySubtextDump(reply = "", latestUserMessage = "") {
  const text = normalizeText(reply);
  const user = normalizeText(latestUserMessage);
  if (!text || text.split(/\s+/).length < 28) return false;
  const mundaneUser = user.split(/\s+/).filter(Boolean).length <= 16 && !/\b(?:why|explain|tell me how you feel|what are you feeling|what do you feel|be honest|say it)\b/.test(user);
  if (!mundaneUser) return false;
  const explanatory = [
    /\bi (?:was|am) jealous because\b/,
    /\bi (?:was|am) scared because\b/,
    /\bi didn'?t want you to know (?:that|how)\b/,
    /\bthe truth (?:was|is),? i\b/,
    /\bpart of me (?:wanted|wants|was|is)\b/,
    /\bi hated how much\b/,
    /\bi couldn'?t admit\b/,
    /\bi was trying to protect myself\b/,
    /\bthat was why i\b/,
  ];
  return explanatory.filter((pattern) => pattern.test(text)).length >= 2;
}

function replyStructureSignature(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "empty";
  const first = raw.slice(0, 160);
  const dialogueFirst = /^[\s*]*(?:["“]|[A-Za-z][^\n]{0,90}["”])/.test(first) && /["“”]/.test(first);
  const narrationFirst = !dialogueFirst && !/^["“]/.test(first);
  const endsQuestion = /\?\s*(?:["”'*])?\s*$/.test(raw);
  const bodyGesture = /\b(?:gaze|eyes?|jaw|breath|shoulders?|smirk|scoff|eyebrow|lips?|mouth|hand|hands?)\b/i.test(stripDialogue(raw));
  const paragraphBand = raw.split(/\n\s*\n/).filter(Boolean).length >= 3 ? "3p" : raw.split(/\n\s*\n/).filter(Boolean).length === 2 ? "2p" : "1p";
  return `${dialogueFirst ? "D" : narrationFirst ? "N" : "M"}:${bodyGesture ? "G" : "-"}:${endsQuestion ? "Q" : "S"}:${paragraphBand}`;
}
function hasStructuralReplyLoop(reply = "", recentReplies = []) {
  const signature = replyStructureSignature(reply);
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-3).map(replyStructureSignature);
  if (recent.length < 2) return false;
  const repeated = recent.slice(-2).every((item) => item === signature);
  if (!repeated) return false;
  // Only flag recognizable AI templates, not two naturally short dialogue-only answers.
  return /:(?:G):|:Q:|3p$/.test(signature);
}

function characterAllowsOrnateDialogue(character = {}) {
  const style = normalizeText(`${character?.speech_style || ""} ${character?.voice_vocabulary || ""} ${character?.personality || ""}`);
  return /\b(?:formal|theatrical|academic|professor|poetic|eloquent|verbose|old fashioned|old-fashioned|literary|philosophical)\b/.test(style);
}
function hasOverwrittenNarration(reply = "", latestUserMessage = "", character = {}) {
  const raw = String(reply || "").trim();
  const allWords = normalizeText(raw).split(/\s+/).filter(Boolean);
  if (allWords.length < 95) return false;
  const dialogueText = [...raw.matchAll(/["“]([^"”]+)["”]/g)].map((match) => match[1] || "").join(" ");
  const dialogueWords = normalizeText(dialogueText).split(/\s+/).filter(Boolean);
  // Explicitly ornate/literary profiles get more room, but even they should not trip
  // the detector unless the turn is overwhelmingly decorative.
  const ornateProfile = characterAllowsOrnateDialogue(character);
  const narrationRatio = 1 - (dialogueWords.length / Math.max(1, allWords.length));
  const narration = normalizeText(stripDialogue(raw));
  const decorativeMarkers = [
    /\b(?:damp chill|cold air|metallic rattle|dull thud|faint hum|fluorescent light|dim light|neon light|rain(?:water)?|pavement|corridor|hallway|architecture|ceiling|vent|breeze|temperature)\b/,
    /\b(?:adjust(?:ed|ing)? (?:his|her|their) (?:collar|cuff|sleeve|coat|jacket)|balanced? .*? against (?:one|his|her) hip|without breaking stride|free hand|shift(?:ed|ing)? (?:his|her|their) weight)\b/,
    /\b(?:deposited|placed|set|dropped) .*? (?:bench|table|counter|desk).*?\b(?:thud|clatter|click|rattle)\b/,
    /\b(?:eyes?|gaze|jaw|breath|shoulders?|mouth|lips)\b/,
    /\b(?:heavy|sharp|damp|cold|steel|iron|stainless|faint|soft|low|slow)\b/,
  ].filter((pattern) => pattern.test(narration)).length;
  const sentenceCount = stripDialogue(raw).split(/[.!?]+/).map((item) => item.trim()).filter(Boolean).length;
  const casualUserTurn = normalizeText(latestUserMessage).length < 420;
  const threshold = ornateProfile ? 5 : 3;
  return casualUserTurn && narrationRatio >= (ornateProfile ? 0.78 : 0.68) && sentenceCount >= 4 && decorativeMarkers >= threshold;
}

function hasOverwrittenBanter(reply = "", latestUserMessage = "", character = {}) {
  if (characterAllowsOrnateDialogue(character)) return false;
  const dialogue = [...String(reply || "").matchAll(/["“]([^"”]+)["”]/g)].map((match) => normalizeText(match[1])).join(" ");
  if (!dialogue) return false;
  const strong = [
    /\bstatistically speaking\b/,
    /\bfascinating (?:dedication|strategy|choice|approach|distinction)\b/,
    /\ba tragedy for (?:the )?(?:guest list|audience|crowd)\b/,
    /\bthe welcome is so warm\b/,
    /\bthat s usually a strong indicator\b/,
    /\bthey wouldn t understand half of it\b/,
    /\byou preferred an audience\b/,
    /\bthe sheer warmth in your voice\b/,
    /\bdeliver that heartfelt sentiment\b/,
    /\bshocking concept i know\b/,
    /\bgrace us with your presence\b/,
    /\bbragging rights darling\b/,
    /\bi(?: m| am)? charging admission\b/,
    /\bif .{1,45} anything like .{0,35} group chat\b/,
    /\bbetter off in your closet\b/,
    /\bnow hush\b/,
    /\bask and ye shall receive\b/,
    /\btypes? like (?:he|she|they)(?: s| is)? paying by the vowel\b/,
    /\befficiency darling\b/,
    /\bwhy spend .{0,55} overthinking an emoji\b/,
    /\bskip straight to appetizers\b/,
    /\bconsider this my way of thanking you\b/,
    /\bconsider it a public service\b/,
    /\bquit pacing like you re about to testify\b/,
    /\bthrow on a trench coat and call it high fashion\b/,
    /\bkeep the couch company\b/,
    /\bdon t come crying to me\b/,
    /\b(?:from|with|yours?) you\??\s*(?:unavoidable|inevitable|inescapable|guaranteed)\b/,
    /\blegally obligated\b/,
    /\bbankrolling (?:this|the) (?:little )?(?:excursion|trip|outing)\b/,
    /\bexacting standards\b/,
    /\btell the academy\b/,
    /\bbasic transportation\b/,
    /\bterrible benefactor\b/,
    /\brectify (?:that|this|the) oversight\b/,
    /\bthrilling (?:conversational )?repartee\b/,
    /\bofficial consensus\b/,
    /\bclose observation\b/,
    /\bcharity work\b/,
    /\bdangerous precedent\b/,
    /\bcommune with nature\b/,
    /\blocal wildlife\b/,
    /\bweather tolerable\b/,
    /\btastes? like (?:a )?cardboard box\b/,
  ];
  if (strong.some((pattern) => pattern.test(dialogue))) return true;
  const polishedMarkers = [
    /\bstatistically\b/, /\bfascinating\b/, /\btruly\b/, /\bapparently\b/,
    /\bindicator\b/, /\bdedication\b/, /\bguest list\b/, /\bpretense\b/,
    /\bobligated\b/, /\bbankrolling\b/, /\bbenefactor\b/, /\brectify\b/, /\brepartee\b/,
    /\bexacting\b/, /\bconsensus\b/, /\bprecedent\b/,
  ];
  const hits = polishedMarkers.filter((pattern) => pattern.test(dialogue)).length;
  const user = normalizeText(latestUserMessage);
  const casualTurn = user.length > 0 && user.length < 260;
  return casualTurn && hits >= 2;
}
function hasClarificationEvasion(reply = "", latestUserMessage = "") {
  const latest = normalizeText(latestUserMessage);
  if (!/\b(?:half of what|what are you talking about|what do you mean|what exactly|which part|what part)\b/.test(latest)) return false;
  const dialogue = [...String(reply || "").matchAll(/["“]([^"”]+)["”]/g)].map((match) => normalizeText(match[1])).join(" ");
  if (!dialogue) return true;
  return /\b(?:the rest of it|you know what|you know exactly|figure it out|if you have to ask|wouldn t you like to know)\b/.test(dialogue);
}
function hasDirectPreferenceEvasion(reply = "", latestUserMessage = "", character = {}) {
  const latest = normalizeText(latestUserMessage);
  // Keep this narrow: it is for direct personal-preference questions, not every
  // rhetorical tease. The goal is semantic grounding, not forcing yes/no dialogue.
  const directPreference = /\b(?:do|did|would|could) you (?:actually )?(?:like|love|enjoy|want|need|miss|hate)\b/.test(latest);
  if (!directPreference) return false;
  const dialogue = [...String(reply || "").matchAll(/["“]([^"”]+)["”]/g)].map((match) => normalizeText(match[1])).join(" ");
  if (!dialogue) return true;

  const naturalStance = /\b(?:yes|yeah|yep|no|nope|maybe|sometimes|depends|i do|i don t|i did|i didn t|i would|i wouldn t|i like|i love|i enjoy|i want|i need|i miss|i hate|don t hate|doesn t bother me|wouldn t mind|could get used to|not really|not exactly|a little|kind of|sort of|only from you|only yours|when it s you|if it s you|more than i should)\b/.test(dialogue);
  if (naturalStance) return false;

  // Abstract adjectives can sound polished while answering a different question.
  // “Unavoidable” says the attention happens; it does not say whether it is liked.
  const abstractNonAnswer = /\b(?:unavoidable|inevitable|inescapable|guaranteed|predetermined|automatic|compulsory|statistically|objectively)\b/.test(dialogue);
  const ellipticalFromYou = /\b(?:from you|yours)\??\s*(?:unavoidable|inevitable|inescapable|guaranteed|automatic|compulsory)\b/.test(dialogue);
  const survivalNonAnswer = /\b(?:i ll survive|i can survive|i ll manage|i can manage|i can handle it|i ll handle it|i won t die|i can live with it)\b/.test(dialogue);
  return abstractNonAnswer || ellipticalFromYou || survivalNonAnswer;
}
function hasBanterReciprocityDrop(reply = "", latestUserMessage = "", character = {}) {
  const latest = normalizeText(latestUserMessage);
  const shortChallenge = /\b(?:doesn t (?:seem|look|sound) like it|seems like you do|sure about that|is that so|really\??|you think\??|that s what you say|keep telling yourself that)\b/.test(latest);
  if (!shortChallenge || latest.length > 180) return false;
  const dialogue = [...String(reply || "").matchAll(/["“]([^"”]+)["”]/g)].map((match) => normalizeText(match[1])).join(" ");
  if (!dialogue) return false;

  // These lines sound controlled/cool but do not actually return the user's jab.
  const selfManagementPlaceholder = /\b(?:give (?:it|me) a minute|i m pacing myself|pacing myself|i m taking my time|i ll manage|i can manage|i can handle it|i ll handle it|i ll survive|i can survive|time will tell)\b/.test(dialogue);
  if (!selfManagementPlaceholder) return false;

  // A concrete concession or reciprocal observation can rescue a terse reply.
  const reciprocalMove = /\b(?:fair|okay you got me|you got me|caught me|maybe i do|maybe|i do|i don t|and yet you|you re still|you keep|you seem|you sound|you re watching|you noticed|you care|you asked)\b/.test(dialogue);
  return !reciprocalMove;
}
function previousCharacterTurnAskedQuestion(recentCharacterReplies = []) {
  const recent = (Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).filter(Boolean);
  const previousRaw = String(recent.at(-1) || "");
  if (!previousRaw.trim()) return false;
  const dialogue = [...previousRaw.matchAll(/["“]([^"”]+)["”]/g)].map((match) => String(match[1] || "").trim()).filter(Boolean);
  const lines = dialogue.length ? dialogue : [previousRaw];
  return lines.some((line) => {
    if (/\?/.test(line)) return true;
    const normalized = normalizeText(line);
    return /^(?:what|why|how|when|where|who|which)\b/.test(normalized)
      || /^(?:do|did|does|are|were|is|was|can|could|would|will|have|has|had|should)\s+(?:you|she|he|they|we|it|this|that)\b/.test(normalized);
  });
}
function hasPhantomQuestionReference(reply = "", recentCharacterReplies = []) {
  const text = normalizeText(reply);
  const phantomReference = /\b(?:it s|its|that s|thats) (?:an? )?(?:honest|real|fair|simple|valid) question\b|\b(?:answer|dodg(?:e|ing)|avoid(?:ing)?) (?:my|the|that) question\b|\bi (?:just )?(?:asked|am asking|m asking) you\b|\bthe question (?:was|is)\b/.test(text);
  if (!phantomReference) return false;
  return !previousCharacterTurnAskedQuestion(recentCharacterReplies);
}
function hasUngroundedReactionDeflection(reply = "", latestUserMessage = "", recentCharacterReplies = []) {
  const latest = normalizeText(latestUserMessage);
  const skepticalReaction = /\b(?:are you serious|seriously|you serious|gave you .* look|give you .* look|raised? (?:an? )?eyebrow|raise (?:an? )?eyebrow|stared? at you|looked? at you like|are you for real)\b/.test(latest);
  if (!skepticalReaction) return false;
  const dialogue = [...String(reply || "").matchAll(/["“]([^"”]+)["”]/g)].map((match) => normalizeText(match[1])).filter(Boolean);
  if (!dialogue.length) return false;
  const joined = dialogue.join(" ");
  // A generic defense can be natural only when it has a real referent in the immediately
  // preceding character turn. Phantom-question language is never grounded by a facial cue.
  if (hasPhantomQuestionReference(reply, recentCharacterReplies)) return true;
  const genericOnly = /^(?:what|what now|what did i do|i m serious|im serious|seriously|don t look at me like that|dont look at me like that)[.!?]*$/.test(joined);
  return genericOnly && !String((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).at(-1) || "").trim();
}
function userSpeechCorrectionBase(value = "") {
  const text = normalizeText(value);
  if (!text || text.length > 90) return false;
  return /^(?:i (?:didn t|did not) (?:talk|speak|say anything|say that)|i (?:wasn t|was not) (?:talking|speaking)|i never said (?:that|anything)|no (?:hable|dije nada|dije eso)|yo no (?:hable|dije nada|dije eso))$/.test(text);
}
function previousCharacterAskedAboutUserSpeech(recentCharacterReplies = []) {
  const previousRaw = String((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).filter(Boolean).at(-1) || "");
  if (!previousRaw.trim()) return false;
  const dialogue = [...previousRaw.matchAll(/["“]([^"”]+)["”]/g)].map((match) => String(match[1] || "").trim()).filter(Boolean);
  const lines = dialogue.length ? dialogue : [previousRaw];
  return lines.some((line) => {
    const text = normalizeText(line);
    const asks = /\?/.test(line) || /^(?:did|do|have|were|are|why|what)\b/.test(text);
    const aboutSpeech = /\b(?:talk|talked|speak|spoke|say|said|tell|told|mention|mentioned)\b/.test(text);
    return asks && aboutSpeech;
  });
}
function isMetaSpeechCorrection(value = "", recentCharacterReplies = []) {
  return userSpeechCorrectionBase(value) && !previousCharacterAskedAboutUserSpeech(recentCharacterReplies);
}
function userTurnContainsAuthoredSpeech(value = "") {
  const raw = String(value || "");
  if (!raw.trim() || isSilentContinueText(raw)) return false;
  const outsideActions = raw.replace(/\*[^*]*\*/gs, " ").replace(/\[[^\]]+\]/g, " ").trim();
  return normalizeText(outsideActions).split(/\s+/).filter(Boolean).length >= 2;
}
function priorUserTurnsWithoutLatest(recentUserMessages = [], latestUserMessage = "") {
  const turns = (Array.isArray(recentUserMessages) ? recentUserMessages : []).map(String).filter((item) => item.trim());
  const latest = normalizeText(latestUserMessage);
  if (turns.length && latest && normalizeText(turns.at(-1)) === latest) turns.pop();
  return turns;
}
function hasImmediateCanonCorrectionBreak(reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = []) {
  if (!isMetaSpeechCorrection(latestUserMessage, recentCharacterReplies)) return false;
  const text = normalizeText(reply);
  if (!text) return false;
  const dialogue = [...String(reply || "").matchAll(/["“]([^"”]+)["”]/g)].map((match) => normalizeText(match[1])).join(" ");
  const correctionEcho = /\b(?:right|okay|ok|fair|yeah|yes|you re right|you are right)?\s*you (?:didn t|did not|weren t|were not|haven t|have not)(?:\s+(?:talk|speak|say anything|say a word))?\b/.test(dialogue);
  const broadSilenceClaim = /\b(?:you haven t said a word|you have not said a word|you ve said nothing|you have said nothing|you said nothing|you ve been silent|you have been silent|you haven t spoken|you have not spoken|only one (?:talking|speaking|making noise)|only one here making noise|makes me the only one making noise)\b/.test(text);
  const earlierUserSpeech = priorUserTurnsWithoutLatest(recentUserMessages, latestUserMessage).slice(-4).some(userTurnContainsAuthoredSpeech);
  const erasesEarlierSpeech = earlierUserSpeech && /\b(?:you never said anything|you haven t said anything|you have not said anything|you haven t spoken|you have not spoken|you ve been silent|you have been silent|you said nothing)\b/.test(text);
  return correctionEcho || broadSilenceClaim || erasesEarlierSpeech;
}
function characterLimbStateEstablished(value = "") {
  const text = normalizeText(value);
  if (!text) return false;
  const limb = "(?:hand|hands|arm|arms|wrist|wrists|fingers|thumb|palm)";
  const owner = "(?:his|her|their)";
  const active = "(?:raise|raised|lift|lifted|reach|reached|hold|held|catch|caught|grab|grabbed|touch|touched|rest|rested|press|pressed|brace|braced|place|placed|grip|gripped|cup|cupped|hook|hooked|wrap|wrapped|keep|kept)";
  return new RegExp(`\\b${active}\\b.{0,45}\\b${owner} ${limb}\\b`).test(text)
    || new RegExp(`\\b${owner} ${limb}\\b.{0,45}\\b${active}\\b`).test(text);
}
function latestUserStagesCharacterLimb(value = "") {
  const raw = String(value || "");
  const staged = [...raw.matchAll(/\*([^*]+)\*/gs)].map((match) => normalizeText(match[1])).join(" ");
  return /\b(?:your|his|her|their) (?:hand|hands|arm|arms|wrist|wrists|fingers|thumb|palm)\b/.test(staged);
}
function hasBodyStateHallucination(reply = "", latestUserMessage = "", recentCharacterReplies = []) {
  const raw = String(reply || "");
  if (!raw.trim()) return false;
  const resetPatterns = [
    /\b(?:he|she|they)\s+(?:dropped|lowered|withdrew|retracted)\s+(?:his|her|their)\s+(?:hand|hands|arm|arms|wrist|wrists)\b/i,
    /\b(?:he|she|they)\s+pulled\s+(?:his|her|their)\s+(?:hand|hands|arm|arms)\s+back\b/i,
    /\b(?:his|her|their)\s+(?:hand|hands|arm|arms)\s+(?:dropped|lowered|fell)\b/i,
    /\b(?:he|she|they)\s+let\s+(?:his|her|their)\s+(?:hand|hands|arm|arms)\s+fall\b/i,
  ];
  let match = null;
  for (const pattern of resetPatterns) {
    const candidate = pattern.exec(raw);
    if (candidate && (!match || candidate.index < match.index)) match = candidate;
  }
  if (!match) return false;
  const beforeReset = raw.slice(0, match.index);
  if (characterLimbStateEstablished(beforeReset)) return false;
  const previous = String((Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).filter(Boolean).at(-1) || "");
  if (characterLimbStateEstablished(previous)) return false;
  if (latestUserStagesCharacterLimb(latestUserMessage)) return false;
  return true;
}
function hasCharacterStanceCollapse(reply = "", latestUserMessage = "", recentCharacterReplies = [], character = {}) {
  if (!isMetaSpeechCorrection(latestUserMessage, recentCharacterReplies)) return false;
  if (!supportsChargedTension(character)) return false;
  const text = normalizeText(reply);
  const selfReform = /\b(?:a habit i should (?:probably )?work on|something i should (?:probably )?work on|i should (?:probably )?work on (?:that|it)|i need to work on (?:that|it)|i guess i need to work on (?:that|it)|maybe i should work on (?:that|it)|i should be better about that|i ll work on (?:that|it)|i will work on (?:that|it)|a habit i should break|something i need to fix about myself)\b/.test(text);
  const therapeuticRetreat = /\b(?:i should probably listen more|i need to learn to listen|i should learn to listen|clearly i have some work to do|i ve got some work to do on myself)\b/.test(text);
  return selfReform || therapeuticRetreat;
}

function repeatedPropChoreographyMotifs(value = "") {
  const text = normalizeText(value);
  const motifs = [];
  const patterns = {
    keys: /\b(?:keys?|keyring)\b/,
    pen: /\b(?:pen|pencil)\b/,
    phone: /\b(?:phone|screen|device)\b/,
    drink: /\b(?:glass|cup|mug|bottle|drink)\b/,
    book: /\b(?:book|textbook|page|folio|notebook)\b/,
  };
  const choreography = /\b(?:toss(?:es|ed|ing)?|catch(?:es|caught|ing)?|spin(?:s|spun|ning)?|twirl(?:s|ed|ing)?|tap(?:s|ped|ping)?|click(?:s|ed|ing)?|flip(?:s|ped|ping)?|roll(?:s|ed|ing)?|turn(?:s|ed|ing)?|pick(?:s|ed|ing)? up|set(?:s|ting)? down|put(?:s|ting)? down|slid(?:e|es|ing)?|pocket(?:s|ed|ing)?|unlock(?:s|ed|ing)?|lock(?:s|ed|ing)?|check(?:s|ed|ing)?|glanc(?:e|es|ed|ing)? at)\b/;
  if (!choreography.test(text)) return motifs;
  for (const [name, pattern] of Object.entries(patterns)) if (pattern.test(text)) motifs.push(name);
  return motifs;
}
function hasRepeatedPropChoreography(reply = "", recentReplies = []) {
  const current = repeatedPropChoreographyMotifs(reply);
  if (!current.length) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-5).map(repeatedPropChoreographyMotifs);
  return current.some((motif) => recent.filter((items) => items.includes(motif)).length >= 2);
}
function hasUnsupportedUserReasonClaim(reply = "", recentUserMessages = []) {
  const text = normalizeText(reply);
  const userContext = (Array.isArray(recentUserMessages) ? recentUserMessages : []).map(normalizeText).filter(Boolean).join(" ");
  const claims = [
    { claim: /\b(?:you|she|he)\b.{0,45}\b(?:came|went|walked|stepped|headed|stayed)\b.{0,55}\bfresh air\b|\bpretending\b.{0,70}\bfresh air\b/, support: /\bfresh air\b/ },
    { claim: /\byou (?:didn t|did not) actually come (?:here|out here) to look at the view\b|\byou came (?:here|out here) to look at the view\b/, support: /\b(?:view|look at the view)\b/ },
  ];
  return claims.some(({ claim, support }) => claim.test(text) && !support.test(userContext));
}
function userAddressAliases(userName = "") {
  const first = String(userName || "").trim().split(/\s+/)[0] || "";
  if (!first) return [];
  const aliases = [first];
  if (first.length >= 5) aliases.push(first.slice(0, 4));
  if (first.length >= 6) aliases.push(first.slice(2, 6));
  return [...new Set(aliases.map((item) => normalizeText(item)).filter((item) => item.length >= 3))];
}
function hasNameAddressOveruse(reply = "", recentReplies = [], userName = "") {
  const aliases = userAddressAliases(userName);
  if (!aliases.length) return false;
  const hitCount = (value = "") => {
    const text = normalizeText(value);
    return aliases.reduce((total, alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return total + ((text.match(new RegExp(`\\b${escaped}\\b`, "g")) || []).length);
    }, 0);
  };
  const currentHits = hitCount(reply);
  if (currentHits >= 2) return true;
  if (currentHits === 0) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-3);
  return recent.filter((item) => hitCount(item) > 0).length >= 2;
}
function characterSocialGravityText(character = {}) {
  return normalizeText([
    character?.role,
    character?.description,
    character?.personality,
    character?.relationship,
    character?.scenario,
    character?.world,
    character?.contradictions,
    character?.habits,
  ].filter(Boolean).join(" "));
}
function profileHasStrongSocialGravity(character = {}) {
  const profile = characterSocialGravityText(character);
  if (!profile) return false;
  return /\b(?:popular|well[- ]known|everyone knows|everybody knows|campus prince|campus king|heartbreaker|celebrity|famous|influential|socially powerful|most wanted|everyone wants|men want to be (?:his|her|their) friend|guys want to be (?:his|her|their) friend|women (?:want|try|flirt|chase)|girls (?:want|try|flirt|chase)|admired|desired|heir|captain|star player|student body|recogniz(?:e|ed|able)|reputation|all eyes|social circle|prominent family)\b/.test(profile);
}
function hasSocialGravityFootprint(text = "") {
  const value = normalizeText(text);
  return /\b(?:recognized|recognised|called (?:his|her|their) name|waved|greeted|stopped (?:him|her|them)|interrupted|came over|approached|joined them|asked to join|invited|invitation|dm|dms|messages?|rumou?r|whispered|stared|looked over|glanced over|turned heads?|flirt(?:ed|ing)?|smiled at|number|phone number|saved (?:him|her|them) a seat|seat saved|knew (?:his|her|their) name|knew who|classmates?|teammates?|friends? called|people kept|another girl|another guy|someone from|group of students|familiar face|acquaintance|crowd greeted)\b/.test(value);
}
function hasMissingSocialGravity(reply = "", latestUserMessage = "", recentReplies = [], character = {}) {
  if (!profileHasStrongSocialGravity(character)) return false;
  const latest = normalizeText(latestUserMessage);
  const publicScene = /\b(?:campus|university|college|school|hall|hallway|corridor|caf[eé]|bakery|student union|quad|courtyard|library|class|lecture|party|club|bar|event|game|match|practice|stadium|restaurant|mall|street|crowd|students?|classmates?|friends?|group|public)\b/.test(latest);
  if (!publicScene) return false;
  if (hasSocialGravityFootprint(reply)) return false;
  const recent = (Array.isArray(recentReplies) ? recentReplies : []).slice(-2).join(" ");
  // Do not force attention every turn. Only flag anonymity after a short run of public beats
  // with no social footprint at all.
  return recent.length > 40 && !hasSocialGravityFootprint(recent);
}
function profileHasRomanticMagnetism(character = {}) {
  const profile = characterSocialGravityText(character);
  return /\b(?:campus heartthrob|heartthrob|heartbreaker|campus crush|most wanted|highly desired|widely desired|everyone wants|every girl wants|every guy wants|girls (?:want|chase|flirt)|women (?:want|chase|flirt)|guys (?:want|chase|flirt)|men (?:want|chase|flirt)|playboy|ladies man|womanizer|serial dater|reputation with (?:girls|women|guys|men)|never short of (?:dates|attention|options))\b/.test(profile);
}
function hasRomanticAttentionFootprint(value = "") {
  const text = normalizeText(value);
  return /\b(?:admirer|flirt(?:ed|ing)? with (?:him|her|them)|flirted back|asked for (?:his|her|their) (?:number|instagram|insta|snap|phone)|gave (?:him|her|them) (?:her|his|their) number|slipped (?:him|her|them) (?:her|his|their) number|saved (?:him|her|them) a seat|invited (?:him|her|them) (?:to|over)|touched (?:his|her|their) (?:arm|shoulder|chest)|hand on (?:his|her|their) (?:arm|shoulder|chest)|leaned (?:into|close to|against) (?:him|her|them)|smiled at (?:him|her|them)|winked at (?:him|her|them)|checked (?:him|her|them) out|trying to get (?:his|her|their) attention|clearly interested|obviously interested|had a crush|crushing on|another (?:girl|guy|woman|man).{0,80}(?:approached|came over|joined|interrupted|flirted|smiled|touched|asked|invited))\b/.test(text);
}
function hasMissingRomanticSocialGravity(reply = "", latestUserMessage = "", recentUserMessages = [], recentReplies = [], character = {}) {
  if (!profileHasRomanticMagnetism(character)) return false;
  const userContext = [latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages : [])].slice(0, 6).map(normalizeText).join(" ");
  const replyContext = [reply, ...(Array.isArray(recentReplies) ? recentReplies : []).slice(-4)].map(normalizeText).join(" ");
  const sceneContext = `${userContext} ${replyContext}`;
  const publicScene = /\b(?:campus|university|college|school|hall|hallway|corridor|caf[eé]|bakery|student union|quad|courtyard|library|class|lecture|fraternity|sorority|party|club|bar|event|game|match|practice|stadium|restaurant|mall|crowd|students?|classmates?|friends?|group|living room)\b/.test(sceneContext);
  if (!publicScene || hasRomanticAttentionFootprint(sceneContext)) return false;
  const emotionalFocus = /\b(?:bad|rough|shitty|horrible|awful) day|leave me alone|go away|don t want to talk|crying|tearing up|panic|breakup|funeral|hospital|emergency\b/.test(normalizeText(latestUserMessage));
  if (emotionalFocus) return false;
  const recentCount = (Array.isArray(recentReplies) ? recentReplies : []).filter((item) => String(item || "").trim().length > 35).length;
  return recentCount >= 3;
}
function hasInstantlyNeutralizedAdmirer(reply = "", character = {}) {
  if (!profileHasRomanticMagnetism(character)) return false;
  const text = normalizeText(reply);
  const admirerEntered = /\b(?:admirer|another (?:girl|guy|woman|man)|a (?:girl|guy|woman|man)|student|party guest)\b.{0,120}\b(?:approached|came over|joined|interrupted|flirted|smiled|touched|leaned|asked)\b/.test(text);
  if (!admirerEntered) return false;
  const neutralized = /\b(?:ignored (?:her|him|them)|didn t even look|did not even look|brushed (?:her|him|them) off|dismissed (?:her|him|them)|turned (?:her|him|them) down|sent (?:her|him|them) away|walked away from (?:her|him|them)|made (?:her|him|them) leave|told (?:her|him|them) to leave|barely acknowledged|attention never left (?:you|her|him)|eyes? stayed (?:on|fixed on) (?:you|her|him))\b/.test(text);
  return neutralized;
}
function characterSocialEcosystemKinds(character = {}) {
  const profile = characterSocialGravityText(character);
  const kinds = [];
  if (/\b(?:heartthrob|heartbreaker|campus crush|most wanted|highly desired|widely desired|playboy|ladies man|womanizer|serial dater)\b/.test(profile)) kinds.push("desirability");
  if (/\b(?:race car|racecar|racing driver|race driver|street racer|motorsport|formula one|formula 1|f1 driver|nascar|indycar|drift(?:er|ing)?|rally driver|racing champion)\b/.test(profile)) kinds.push("racing");
  if (/\b(?:athlete|captain|quarterback|football player|soccer player|basketball player|baseball player|hockey player|tennis player|swimmer|star player|varsity|olympian|champion)\b/.test(profile)) kinds.push("athletics");
  if (/\b(?:musician|singer|actor|actress|model|celebrity|famous|influencer|content creator|streamer|artist|rock star|pop star|idol)\b/.test(profile)) kinds.push("fame");
  if (/\b(?:heir|heiress|billionaire|millionaire|old money|wealthy family|prominent family|powerful family|socialite|elite family|family empire)\b/.test(profile)) kinds.push("wealth");
  if (/\b(?:leader|president|ceo|founder|boss|kingpin|mafia|gang leader|feared|powerful|notorious|intimidating|student body president)\b/.test(profile)) kinds.push("power");
  if (/\b(?:beautiful|handsome|gorgeous|stunning|striking|fashionable|charismatic|magnetic|turns heads|model-like)\b/.test(profile)) kinds.push("appearance");
  if (!kinds.length && profileHasStrongSocialGravity(character)) kinds.push("general_status");
  return [...new Set(kinds)];
}
function hasMatchingSocialEcosystemFootprint(value = "", kinds = []) {
  const text = normalizeText(value);
  const patterns = {
    desirability: /\b(?:admirer|flirt|asked for (?:his|her|their) number|gave (?:him|her|them) (?:a|her|his|their) number|crush|date|winked|checked (?:him|her|them) out|trying to get (?:his|her|their) attention)\b/,
    racing: /\b(?:fan|rival driver|other driver|mechanic|pit crew|crew chief|sponsor|paddock|garage|track official|recognized (?:his|her|their) car|asked for (?:a )?(?:photo|ride|autograph)|race weekend|qualifying|lap time|helmet|team principal)\b/,
    athletics: /\b(?:teammate|opponent|coach|recruiter|scout|fan|game|match|practice|training|jersey|autograph|asked for (?:a )?photo|student section|captain)\b/,
    fame: /\b(?:fan|recognized|photo|selfie|autograph|paparazzi|reporter|collaborator|producer|director|manager|gossip|press|invitation|followers?)\b/,
    wealth: /\b(?:staff recognized|vip|private room|family name|board member|investor|assistant|security|driver|invitation|access|favor|opportunist|deference|reserved table)\b/,
    power: /\b(?:follower|rival|challenger|bodyguard|security|favor|deference|fell silent|made room|stepped aside|watched carefully|asked permission|reported to (?:him|her|them))\b/,
    appearance: /\b(?:turned heads?|looked over|stared|checked (?:him|her|them) out|complimented|approached|smiled at|whispered|asked about (?:him|her|them)|copied (?:his|her|their) style)\b/,
    general_status: /\b(?:recognized|greeted|approached|invited|interrupted|knew (?:his|her|their) name|asked to join|saved (?:him|her|them) a seat|made room)\b/,
  };
  return kinds.some((kind) => patterns[kind]?.test(text));
}
function hasMissingProfileSocialEcosystem(reply = "", latestUserMessage = "", recentUserMessages = [], recentReplies = [], character = {}) {
  const kinds = characterSocialEcosystemKinds(character);
  if (!kinds.length) return false;
  const contextParts = [latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages : []).slice(0, 6), reply, ...(Array.isArray(recentReplies) ? recentReplies : []).slice(-4)];
  const sceneContext = contextParts.map(normalizeText).join(" ");
  const relevantScene = /\b(?:campus|university|college|school|hall|hallway|caf[eé]|library|class|fraternity|sorority|party|club|bar|event|game|match|practice|stadium|restaurant|mall|crowd|students?|friends?|group|living room|race|track|circuit|paddock|garage|pit|car meet|motor show|gala|premiere|concert|studio|office|boardroom|hotel|vip|public)\b/.test(sceneContext);
  if (!relevantScene || hasMatchingSocialEcosystemFootprint(sceneContext, kinds)) return false;
  const latest = normalizeText(latestUserMessage);
  if (/\b(?:(?:bad|rough|shitty|horrible|awful) day|leave me alone|go away|don t want to talk|crying|tearing up|panic|breakup|funeral|hospital|emergency|private|alone|bedroom|bathroom)\b/.test(latest)) return false;
  const substantialRecent = (Array.isArray(recentReplies) ? recentReplies : []).filter((item) => String(item || "").trim().length > 35).length;
  return substantialRecent >= 3;
}
function hasSpatialContinuityBreak(reply = "", latestUserMessage = "") {
  const text = normalizeText(reply);
  const user = normalizeText(latestUserMessage);
  if (!text || !user) return false;

  // The latest user turn can itself reaffirm the current formation even when the user
  // says they were unaware of the touch. That does not authorize a silent separation.
  const proximityCue = /\b(?:hand (?:near|on|at) (?:my|her|their) back|hand on (?:my|her|their) (?:back|waist|shoulder)|beside (?:me|her|him|them)|next to (?:me|her|him|them)|side by side|shoulders? (?:brushed|touching)|walking together|walked together|under the same umbrella|guiding (?:me|her|him|them)|steer(?:ing|ed)? (?:me|her|him|them) through)\b/.test(user);
  if (!proximityCue) return false;

  const explicitSeparation = /\b(?:i|she|he|they|we) (?:step|steps|stepped|walk|walks|walked|move|moves|moved|fall|falls|fell|lag|lags|lagged|stop|stops|stopped|hang|hangs|hung) (?:away|back|behind|ahead|aside|apart|farther|further)|\b(?:i|she|he|they|we) (?:let|lets|allowed) (?:him|her|them|me) (?:go|walk) ahead|\b(?:distance|space) (?:opened|grew|formed)\b/.test(user);
  if (explicitSeparation) return false;

  const silentSeparation = /\b(?:keep up|catch up|if (?:she|he|they|you) (?:was|were) following|didn'?t look back (?:to|and) (?:see|check)|without looking back|walked ahead|moved ahead|pushed ahead|strode ahead|left (?:her|him|them|you) behind|followed (?:him|her|them) behind|trailed behind|a few (?:steps|paces) behind)\b/.test(text);
  return silentSeparation;
}
function hasSpatialProximityTeleport(reply = "", latestUserMessage = "", recentCharacterReplies = []) {
  const text = normalizeText(reply);
  const user = normalizeText(latestUserMessage);
  const recent = (Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).map(normalizeText).filter(Boolean);
  const previous = recent.at(-1) || "";
  if (!text || (!user && !previous)) return false;

  // Intimate-zone language means the new draft has placed the character at face/ear/neck
  // distance, not merely within conversational reach.
  const intimateZone = /\b(?:right |just |close )?(?:near|by|beside|against|at) (?:her|his|their|your) (?:ear|neck|cheek|face)|\b(?:into|in) (?:her|his|their|your) ear\b|\bwhisper(?:ed|ing|s)? (?:right )?(?:by|near|into|in) (?:her|his|their|your) ear\b|\b(?:mouth|lips|breath) (?:hovered |brushed |was |were )?(?:near|against|by|at) (?:her|his|their|your) (?:ear|neck|cheek|skin)\b|\bforehead (?:against|to) (?:her|his|their|your) forehead\b|\bchest (?:pressed |flush )?(?:against|to) (?:her|his|their|your) back\b/.test(text);
  if (!intimateZone) return false;

  // If the immediately prior visible beat already established intimate distance, staying
  // there is continuity, not a teleport.
  const alreadyIntimate = /\b(?:right |just |close )?(?:near|by|beside|against|at) (?:her|his|their|your) (?:ear|neck|cheek|face)|\b(?:mouth|lips|breath) .{0,30}(?:ear|neck|cheek)|\bforehead (?:against|to)|\bchest .{0,20}(?:against|to) .{0,12}back\b/.test(previous);
  if (alreadyIntimate) return false;

  const userTurnsAway = /\b(?:i|she|he|they|we) (?:turn|turns|turned|turning) (?:away|to leave|around to leave)|\b(?:i|she|he|they|we) (?:start|starts|started|starting) to (?:leave|walk away)|\b(?:i|she|he|they|we) (?:walk|walks|walked|walking|step|steps|stepped|stepping|head|heads|headed|heading) (?:away|off|toward the (?:door|exit))\b/.test(user);

  const priorConversationalNear = /\b(?:narrow(?:ed|ing)? the (?:space|distance)|close enough|within arm'?s? reach|arm'?s? length|stood in front of|stopped (?:right )?in front of|stepped closer|closed (?:some of |the )?distance|beside (?:her|him|them|you)|next to (?:her|him|them|you))\b/.test(previous);
  const touchOnlyBridge = /\b(?:catch|catches|caught|take|takes|took|grab|grabs|grabbed|touch|touches|touched) (?:her|his|their|your) (?:wrist|forearm|arm|elbow|hand)\b/.test(text);

  // A physically meaningful bridge requires locomotion/positioning. Leaning alone changes
  // torso angle, not the missing floor distance or the user's away-facing orientation.
  const locomotionBridge = /\b(?:step(?:ped|s|ping)? after|take(?:s|n)? (?:a|one|two) step(?:s)? (?:after|closer|toward)|took (?:a|one|two) step(?:s)? (?:after|closer|toward)|move(?:d|s|ing)? (?:after|closer|up beside|alongside|around)|close(?:d|s|ing)? (?:the|that|remaining) (?:gap|distance)|come|comes|came (?:up )?(?:beside|alongside)|catch(?:es|ing|caught) up (?:beside|with)|fall(?:s|ing|fell) into step beside|match(?:es|ed|ing) (?:her|his|their|your) pace|circle(?:d|s|ing)? (?:around|to face)|move(?:d|s|ing)? into (?:her|his|their|your) line of sight)\b/.test(text);

  if (userTurnsAway) return !locomotionBridge;
  if (priorConversationalNear && touchOnlyBridge && !locomotionBridge) return true;
  if (priorConversationalNear && !locomotionBridge && /\blean(?:ed|s|ing)? in\b/.test(text)) return true;
  return false;
}
function sanitizeHardUserIntentContradictions(reply = "", latestUserMessage = "") {
  const original = String(reply || "").trim(), motiveConflict = hasUserMotiveOverride(original, latestUserMessage, []), pursuitConflict = hasRejectedPursuitFramingPersistence(original, latestUserMessage);
  if (!original || (!motiveConflict && !pursuitConflict)) return original;
  const hardMotive = /\byou (?:were|are|have been|ve been)?\s*(?:looking|searching) for me\b|\byou (?:were|are)?\s*trying to find me\b|\byou (?:came|went|walked|stepped|headed) (?:out|outside|here|there).{0,45}\b(?:for me|to see me)\b|\byou (?:wanted|needed|were trying|are trying) to (?:get|have) my attention\b|\byou wanted my attention\b|\byou (?:were|are|got) jealous\b/;
  const hardGuarding = /\bbodyguard (?:implies|means|would mean)\b|\b(?:i m|i am)?\s*(?:just\s+)?(?:making sure|checking) you don t wander off\b|\bkeeping (?:an? )?eye on you\b|\bkeeping tabs on you\b|\bnot letting you (?:wander|out of (?:my )?sight)\b|\bwatching you to make sure\b/;
  return original.split(/\n{2,}/).map((paragraph) => (paragraph.match(/[^.!?]+[.!?]+(?:["”']+)?|[^.!?]+$/g) || [paragraph]).filter((sentence) => {
    const normalized = normalizeText(sentence);
    return !(motiveConflict && hardMotive.test(normalized)) && !(pursuitConflict && hardGuarding.test(normalized));
  }).join(" ").replace(/\s+/g, " ").trim()).filter(Boolean).join("\n\n").trim();
}
function sanitizeUnsolicitedOffscreenLeadContact(reply = "", characterName = "") {
  const original = String(reply || "").trim();
  const characterKey = normalizeText(characterName).split(/\s+/).filter(Boolean)[0] || "";
  if (!original || !characterKey) return original;
  const escaped = characterKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const directLabel = new RegExp(`\\b${escaped}\\b\\s*:`,'i');
  const contactCue = new RegExp(`(?:\\b(?:text|message|dm|notification|call|phone|screen|buzz|buzzed|rang|ringing)\\b.{0,180}\\b${escaped}\\b|\\b${escaped}\\b.{0,120}\\b(?:text|message|dm|notification|call|called|calls|texted|texts|messaged|messages|buzzed|rang)\\b)`,'i');

  // Prefer paragraph-level removal so valid on-scene dialogue/narration remains intact.
  // A device-notification paragraph immediately before a named lead message belongs
  // to the same remote interruption and must disappear with it.
  const paragraphs = original.split(/\n{2,}/);
  const drop = new Set();
  paragraphs.forEach((paragraph, index) => {
    const normalized = normalizeText(paragraph);
    if (directLabel.test(paragraph) || contactCue.test(normalized)) {
      drop.add(index);
      const previous = normalizeText(paragraphs[index - 1] || "");
      if (/\b(?:phone|screen|notification|buzz|buzzed|rang|ringing|lights? up)\b/.test(previous)) drop.add(index - 1);
    }
  });
  let kept = paragraphs.filter((_, index) => !drop.has(index));

  // If a remote-contact tail shares a paragraph with valid scene material, trim only
  // the sentence(s) that introduce the off-scene lead instead of discarding everything.
  kept = kept.map((paragraph) => (paragraph.match(/[^.!?]+[.!?]+(?:["”']+)?|[^.!?]+$/g) || [paragraph])
    .filter((sentence) => {
      const normalized = normalizeText(sentence);
      return !(directLabel.test(sentence) || contactCue.test(normalized));
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  ).filter(Boolean);

  return kept.join("\n\n").trim();
}

function sanitizeSocialRoleAssignment(reply = "", binding = null) {
  const original = String(reply || "");
  const recipientKey = String(binding?.recipient || "").trim();
  if (!original || !recipientKey) return original;
  const recipient = recipientKey.charAt(0).toUpperCase() + recipientKey.slice(1);
  return original
    .replace(/\b(let|have)\s+(him|her|them)\s+(buy|take|pick up|meet|text|call)\s+you\b/gi, (_m, a, b, c) => `${a} ${b} ${c} ${recipient}`)
    .replace(/\b(he|she|they)\s+(can|could|should|will|would|might)\s+(buy|take|pick up|meet|text|call)\s+you\b/gi, (_m, a, b, c) => `${a} ${b} ${c} ${recipient}`)
    .replace(/\byour first date\b/gi, `${recipient}'s first date`)
    .replace(/\byour date with\b/gi, `${recipient}'s date with`)
    .replace(/\byour night with\b/gi, `${recipient}'s night with`);
}

function sanitizeValidatedHardIntentResult(result, issues = [], options = {}) {
  const canSanitize = issues.some((issue) => ["user_motive_overwritten", "rejected_pursuit_framing_persisted", "unsolicited_offscreen_lead_contact", "social_role_assignment_broken", "unsupported_social_plan_expansion"].includes(issue));
  if (!canSanitize) return { result, issues };
  let reply = String(result?.reply || "");
  if (issues.includes("user_motive_overwritten") || issues.includes("rejected_pursuit_framing_persisted")) {
    reply = sanitizeHardUserIntentContradictions(reply, options.latestUserMessage || "");
  }
  if (issues.includes("unsolicited_offscreen_lead_contact")) {
    reply = sanitizeUnsolicitedOffscreenLeadContact(reply, options.characterName || "");
  }
  if (issues.includes("social_role_assignment_broken")) {
    const binding = extractExplicitSocialRoleBinding(options.recentUserMessages || [], options.latestUserMessage || "");
    reply = sanitizeSocialRoleAssignment(reply, binding);
  }
  if (issues.includes("unsupported_social_plan_expansion")) {
    reply = sanitizeUnsupportedSocialPlanExpansion(reply);
  }
  const nextResult = { ...result, reply };
  let nextIssues = validateNarrativeReply(nextResult.reply, options);
  if (options.continuity) nextIssues = [...new Set([...nextIssues, ...validateContinuityEnvelope(nextResult, options.continuity)])];
  return { result: nextResult, issues: nextIssues };
}
const CONTINUITY_GUARD_ISSUES = new Set([
  "location_changed_without_scene_change",
  "time_changed_without_scene_change",
  "present_character_silently_dropped",
  "absent_character_reappeared",
  "offscreen_character_heard_turn",
  "invented_plot_object",
  "invented_scene_object_state",
  "latest_user_scene_not_applied",
  "latest_user_scene_ignored",
  "unsolicited_offscreen_lead_contact",
]);
const BLOCKING_NARRATIVE_ISSUES = new Set([
  "empty_reply",
  "truncated_by_model",
  "unfinished_reply",
  "controls_user_pov",
  "exposes_system_language",
  "user_staged_scene_retcon",
]);
// VELVET_SPEED_REPAIR_BUDGET_V282
// VELVET_QUICK_REPLY_LANE_V21029: style-only issues never spend the second model call.
// VELVET_USER_STAGED_CANON_GUARD_V283
// A second model call is expensive. Style repetition and continuity metadata are
// advisory after the first draft: the prompt discourages them and deterministic
// continuity merging protects stored canon. Only structural failures or severe
// user-facing naturalism violations spend the one optional repair call.
const REPAIR_TRIGGER_ISSUES = new Set([
  ...BLOCKING_NARRATIVE_ISSUES,
  // SPEED + QUALITY: second model calls are reserved for mistakes the user
  // would experience as broken canon, broken agency, or a direct non-answer.
  "distance_boundary_override",
  "active_npc_cue_skipped",
  "spatial_relationship_broken",
  "spatial_proximity_teleport",
  "user_motive_overwritten",
  "rejected_pursuit_framing_persisted",
  "unstaged_user_departure_inference",
  "unstaged_user_movement_inference",
  "immediate_pose_regression",
  "immediate_canon_correction_mishandled",
  "body_state_hallucination",
  "clarification_evasion",
  "direct_preference_evasion",
  "overwritten_narration",
  "unsupported_user_reason_claim",
  "unsupported_prior_event_claim",
  "social_role_assignment_broken",
  "unsupported_social_plan_expansion",
  "latest_user_scene_not_applied",
  "latest_user_scene_ignored",
  "unsolicited_offscreen_lead_contact",
  "model_self_check_failed",
  "structural_repetition_loop",
  "identity_drift_risk",
  "naturalness_score_low",
  "mechanical_rhythm_loop",
  "generic_ai_voice",
  "reaction_clone_drift",
  "explanatory_subtext_dump",
  "decorative_nonverbal_overload",
  "invented_scene_object_state",
]);

// v2.11.0 NARRATIVE CORE REBUILD
// These are not cosmetic preferences. If a draft violates one of these, never
// surface/save the rejected draft merely because the one repair call timed out.
const HARD_REPAIR_REQUIRED_ISSUES = new Set([
  ...BLOCKING_NARRATIVE_ISSUES,
  "user_staged_scene_retcon",
  "distance_boundary_override",
  "spatial_relationship_broken",
  "spatial_proximity_teleport",
  "passive_exit_after_rupture",
  "kinetic_tension_deflated",
  "charged_beat_abandoned",
  "charged_beat_stalled",
  "charged_departure_dropped",
  "user_motive_overwritten",
  "rejected_pursuit_framing_persisted",
  "unstaged_user_departure_inference",
  "unstaged_user_movement_inference",
  "silent_continue_stalled",
  "time_skip_stalled",
  "time_skip_exposition_echo",
  "immediate_pose_regression",
  "immediate_canon_correction_mishandled",
  "body_state_hallucination",
  "clarification_evasion",
  "unsupported_user_reason_claim",
  "unsupported_prior_event_claim",
  "social_role_assignment_broken",
  "unsupported_social_plan_expansion",
  "latest_user_scene_not_applied",
  "latest_user_scene_ignored",
  "unsolicited_offscreen_lead_contact",
  "silent_continue_prop_loop",
]);

function hardRepairRequiredIssues(issues = []) {
  return [...new Set(Array.isArray(issues) ? issues : [])].filter((issue) => HARD_REPAIR_REQUIRED_ISSUES.has(issue));
}

function shouldBufferDraftUntilValidated({ latestUserMessage = "", turnIntent = {}, recentUserMessages = [], recentCharacterReplies = [], character = {} } = {}) {
  const kind = String(turnIntent?.kind || "ordinary");
  const latest = normalizeText(latestUserMessage);
  const userContext = [latestUserMessage, ...(Array.isArray(recentUserMessages) ? recentUserMessages : [])].slice(0, 6).map(normalizeText).join(" ");
  const characterContext = (Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []).slice(-5).map(normalizeText).join(" ");
  const dynamics = characterProfileDynamics(character);
  const initiative = dynamics.initiative, flirting = dynamics.flirting, drama = dynamics.drama, romance = dynamics.romance;
  const chargedCharacter = supportsChargedTension(character);

  // Short continuity corrections such as “I didn't talk” must never optimistically
  // stream as fresh dialogue before Velvet has repaired the immediately prior beat.
  if (isMetaSpeechCorrection(latestUserMessage, recentCharacterReplies)) return true;

  // Explicit boundary/motive turns are cheap to get wrong and expensive to show wrong.
  if (/\b(?:fresh air|bodyguard|leave me alone|stop following me|don t follow me|do not follow me|don t touch me|do not touch me|let me go|back off|go away|no me sigas|no me toques|dejame sola|déjame sola|sueltame|suéltame)\b/.test(userContext)) return true;

  // Explicit latest-user scene placement is canon-sensitive; validate before display.
  if (extractUserSceneAnchor(latestUserMessage)) return true;

  // Explicit friend/date role assignments are canon-sensitive. If a recent user turn
  // says the number/flirt/date is for someone else, validate pronoun-heavy follow-ups
  // before display so “let him buy you a drink” cannot flash and then be repaired.
  const socialRoleBinding = extractExplicitSocialRoleBinding(recentUserMessages, latestUserMessage);
  if (socialRoleBinding && /\b(?:he|him|she|her|they|them|date|drink|dinner|number|text|call|trust|trusted)\b/.test(latest)) return true;

  // Silent continuations and time skips are director-style turns. Their first draft
  // must be checked for real progression before anything becomes visible.
  if (["silent_continue", "return_main_pov", "time_skip"].includes(kind)) return true;

  // High-tension micro beats and departures are the exact places where an optimistic
  // raw stream can expose a draft that the validator is about to reject.
  if (chargedCharacter && ["challenge", "charged_nonverbal", "confrontation", "confrontation_exit", "user_exit"].includes(kind)) return true;

  // Clarification and vulnerable-flirt questions are small but high-risk for hollow
  // pseudo-clever banter. Validate them before display without slowing ordinary Q&A.
  if (chargedCharacter && kind === "direct_question" && /\b(?:half of what|what are you talking about|what do you mean|which part|what part|miss me|like me|jealous|care about me|do you (?:actually )?(?:like|love|enjoy|want|need|miss|hate)|attention)\b/.test(latest)) return true;

  // Short teasing challenges are prone to polished non-answers ("I’m pacing myself").
  // Validate before display so the repair can return the banter instead of narrating coolness.
  if (chargedCharacter && /\b(?:doesn t (?:seem|look|sound) like it|seems like you do|sure about that|is that so|really\??|you think\??|that s what you say)\b/.test(latest)) return true;

  // Silent skeptical reactions are easy to answer with a canned or phantom-reference line.
  // Validate them before display so the response stays tied to the actual previous beat.
  if (chargedCharacter && /\b(?:are you serious|seriously|you serious|gave you .* look|give you .* look|raised? (?:an? )?eyebrow|raise (?:an? )?eyebrow|stared? at you|looked? at you like)\b/.test(latest)) return true;

  // Protect the first charged exchange in a new chat too: the opening often establishes
  // a precise pose/location that must not regress on the very next reply.
  if (chargedCharacter && (Array.isArray(recentCharacterReplies) ? recentCharacterReplies.length : 0) <= 1 && /\b(?:sarcast|scoff|eye roll|whatever|annoy|teas|flirt|smirk)\b/.test(`${latest} ${characterContext}`)) return true;

  // Catch terse narrated movement even when intent classification is conservative.
  const narratedDeparture = /\bi\b[^.!?\n]{0,55}\b(?:walk(?:s|ed|ing)?|leave|left|head(?:ed|ing)?|move(?:d|ing)?|step(?:ped|ping)?|pass(?:es|ed|ing)?|past|brush(?:es|ed|ing)?\s+past)\b/i.test(String(latestUserMessage || ""));
  const activeCharge = /\b(?:who asked|whatever|finally you re leaving|finally youre leaving|raise an eyebrow|raised an eyebrow|bodyguard|fresh air|keep trying|still standing here|not going anywhere|sarcastic|sarcasm|smirk|smirked|teas|flirt)\b/.test(`${userContext} ${characterContext}`);
  return chargedCharacter && narratedDeparture && activeCharge;
}

function blockingNarrativeIssues(issues = []) {
  return [...new Set(Array.isArray(issues) ? issues : [])].filter((issue) => BLOCKING_NARRATIVE_ISSUES.has(issue));
}
function replyRhythmSignature(text = "") {
  const raw = String(text || "").trim();
  const words = normalizeText(raw).split(/\s+/).filter(Boolean).length;
  const paragraphs = raw.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean).length || 1;
  const dialogueUnits = [...raw.matchAll(/["“]([^"”]{2,})["”]/g)].length;
  const questions = (raw.match(/\?/g) || []).length;
  return { words, paragraphs, dialogueUnits, questions };
}
function hasMechanicalRhythmLoop(reply = "", recentReplies = []) {
  const current = replyRhythmSignature(reply);
  if (current.words < 20 || !Array.isArray(recentReplies) || recentReplies.length < 3) return false;
  const recent = recentReplies.slice(-3).map(replyRhythmSignature).filter((item) => item.words >= 20);
  if (recent.length < 3) return false;
  const all = [...recent, current];
  const avg = all.reduce((sum, item) => sum + item.words, 0) / all.length;
  if (!avg) return false;
  const tightLength = all.every((item) => Math.abs(item.words - avg) / avg <= 0.14);
  const sameParagraphs = new Set(all.map((item) => item.paragraphs)).size === 1;
  const sameQuestionShape = new Set(all.map((item) => Math.min(1, item.questions))).size === 1;
  return tightLength && sameParagraphs && sameQuestionShape;
}
function hasDecorativeNonverbalOverload(reply = "") {
  const text = normalizeText(reply);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 35 || words > 220) return false;
  const cues = [
    /\b(?:gaze|eyes?|glance|looked|stared)\b/g,
    /\b(?:jaw|breath|exhale|inhale|sigh|swallow)\b/g,
    /\b(?:smirk|scoff|chuckle|grin|half smile|brow)\b/g,
    /\b(?:leaned|stepped closer|moved closer|tilted (?:his|her|their) head|hands? in (?:his|her|their) pockets?)\b/g,
  ];
  let count = 0;
  for (const pattern of cues) count += (text.match(pattern) || []).length;
  return count >= 5;
}
function deterministicNaturalnessScore(reply = "", options = {}) {
  let score = 100;
  const recent = options.recentCharacterReplies || [];
  const latest = String(options.latestUserMessage || "");
  if (hasMechanicalRhythmLoop(reply, recent)) score -= 18;
  if (hasStructuralReplyLoop(reply, recent)) score -= 20;
  if (hasDecorativeNonverbalOverload(reply)) score -= 14;
  if (hasGenericRomanceCadence(reply, recent, options.character || {})) score -= 18;
  if (hasRhetoricalDialogueOveruse(reply, recent)) score -= 12;
  if (hasNameAddressOveruse(reply, recent, options.userName || "")) score -= 8;
  const sig = replyRhythmSignature(reply);
  const latestWords = normalizeText(latest).split(/\s+/).filter(Boolean).length;
  if (latestWords <= 8 && sig.words > 180 && !isSilentContinueText(latest)) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function repairTriggerIssues(issues = []) {
  return [...new Set(Array.isArray(issues) ? issues : [])].filter((issue) => REPAIR_TRIGGER_ISSUES.has(issue));
}
function validateNarrativeReply(reply = "", options = {}) {
  const issues = [];
  const text = String(reply || "").trim();
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  const turnIntent = options.turnIntent || { kind: "ordinary", silentCount: 0 };

  if (!text) issues.push("empty_reply");
  if (String(options.finishReason || "").toUpperCase().includes("MAX_TOKENS")) issues.push("truncated_by_model");
  if (hasUnclosedDialogue(text)) issues.push("unfinished_reply");
  if (isLowInformationGenericReply(text)) issues.push("generic_acknowledgment");
  if (controlsUserPOV(text, options.userName || "", options.latestUserMessage || "")) issues.push("controls_user_pov");
  if (/\b(?:as an ai|language model|cannot continue|try the continuation again|validator|validation failed)\b/i.test(text)) issues.push("exposes_system_language");
  if (hasRepeatedRecentSignature(text, options.recentCharacterReplies || [])) issues.push("repeated_recent_signature");
  if (hasMechanicalRhythmLoop(text, options.recentCharacterReplies || [])) issues.push("mechanical_rhythm_loop");
  if (hasDecorativeNonverbalOverload(text)) issues.push("decorative_nonverbal_overload");
  if (hasStockBodyLanguageStack(text)) issues.push("stock_body_language_stack");
  if (hasRecycledStockGesture(text, options.recentCharacterReplies || [])) issues.push("recycled_stock_gesture");
  if (hasUnsupportedMotiveEscalation(text, options.latestUserMessage || "")) issues.push("unsupported_motive_escalation");
  if (hasDistanceBoundaryOverride(text, options.latestUserMessage || "")) issues.push("distance_boundary_override");
  if (hasSocialTensionOverEscalation(text, options.latestUserMessage || "")) issues.push("social_tension_overescalation");
  if (hasUserStagedSceneRetcon(text, options.latestUserMessage || "", options.characterName || "")) issues.push("user_staged_scene_retcon");
  if (hasRhetoricalDialogueOveruse(text, options.recentCharacterReplies || [])) issues.push("rhetorical_dialogue_overuse");
  if (hasSarcasticComebackLoop(text, options.recentCharacterReplies || [])) issues.push("sarcastic_comeback_loop");
  if (hasSmugComebackTone(text, options.latestUserMessage || "")) issues.push("smug_comeback_tone");
  if (hasGenericRomanceCadence(text, options.recentCharacterReplies || [], options.character || {})) issues.push("generic_romance_cadence");
  if (hasGenericAIVoice(text, options.latestUserMessage || "", options.character || {})) issues.push("generic_ai_voice");
  if (hasReactionCloneDrift(text, options.recentCharacterReplies || [])) issues.push("reaction_clone_drift");
  if (hasExplanatorySubtextDump(text, options.latestUserMessage || "")) issues.push("explanatory_subtext_dump");
  if (hasOverwrittenBanter(text, options.latestUserMessage || "", options.character || {})) issues.push("overwritten_banter");
  if (hasOverwrittenNarration(text, options.latestUserMessage || "", options.character || {})) issues.push("overwritten_narration");
  if (hasEditorialBanterVoice(text, options.latestUserMessage || "", options.recentCharacterReplies || [], options.character || {})) issues.push("editorial_banter_voice");
  if (hasClarificationEvasion(text, options.latestUserMessage || "")) issues.push("clarification_evasion");
  if (hasDirectPreferenceEvasion(text, options.latestUserMessage || "", options.character || {})) issues.push("direct_preference_evasion");
  if (hasBanterReciprocityDrop(text, options.latestUserMessage || "", options.character || {})) issues.push("banter_reciprocity_drop");
  if (hasPhantomQuestionReference(text, options.recentCharacterReplies || [])) issues.push("phantom_question_reference");
  if (hasUngroundedReactionDeflection(text, options.latestUserMessage || "", options.recentCharacterReplies || [])) issues.push("reaction_reference_ungrounded");
  if (hasImmediateCanonCorrectionBreak(text, options.latestUserMessage || "", options.recentUserMessages || [], options.recentCharacterReplies || [])) issues.push("immediate_canon_correction_mishandled");
  if (hasBodyStateHallucination(text, options.latestUserMessage || "", options.recentCharacterReplies || [])) issues.push("body_state_hallucination");
  if (hasCharacterStanceCollapse(text, options.latestUserMessage || "", options.recentCharacterReplies || [], options.character || {})) issues.push("character_stance_collapse");
  if (hasRepeatedPropChoreography(text, options.recentCharacterReplies || [])) issues.push("repeated_prop_choreography");
  if (hasUnsupportedUserReasonClaim(text, [options.latestUserMessage || "", ...(options.recentUserMessages || [])])) issues.push("unsupported_user_reason_claim");
  if (hasUnsupportedPriorEventClaim(text, [...(options.recentUserMessages || []), ...(options.recentCharacterReplies || [])])) issues.push("unsupported_prior_event_claim");
  if (hasUnsupportedTimelineDurationClaim(text, options.recentUserMessages || [], options.recentCharacterReplies || [])) issues.push("unsupported_timeline_duration_claim");
  if (hasPostSkipWarmthRegression(text, options.recentUserMessages || [], options.recentCharacterReplies || [], options.character || {})) issues.push("post_skip_warmth_regression");
  if (hasSceneTransitionQuipFiller(text, options.latestUserMessage || "")) issues.push("scene_transition_quip_filler");
  if (hasSocialRoleAssignmentBreak(text, options.latestUserMessage || "", options.recentUserMessages || [])) issues.push("social_role_assignment_broken");
  if (hasUnsupportedSocialPlanExpansion(text, options.latestUserMessage || "", options.recentUserMessages || [], options.recentCharacterReplies || [])) issues.push("unsupported_social_plan_expansion");
  if (hasNpcDialogueTicLoop(text, options.recentCharacterReplies || [])) issues.push("npc_dialogue_tic_loop");
  if (hasDirectComparisonEvasion(text, options.latestUserMessage || "")) issues.push("direct_comparison_evasion");
  if (hasSilentContinuationPropLoop(text, turnIntent, options.recentCharacterReplies || [])) issues.push("silent_continue_prop_loop");
  if (hasReactionOpenerLoop(text, options.recentCharacterReplies || [])) issues.push("reaction_opener_loop");
  if (hasRepeatedSocialShutdown(text, options.recentCharacterReplies || [], options.latestUserMessage || "")) issues.push("repeated_social_shutdown");
  if (hasPassiveEmotionalCueResponse(text, options.latestUserMessage || "")) issues.push("emotional_cue_passivity");
  if (hasTherapeuticDeescalationPivot(text, options.latestUserMessage || "", options.recentUserMessages || [], options.character || {})) issues.push("therapeutic_deescalation_pivot");
  if (hasPassiveExitAfterRupture(text, options.latestUserMessage || "", options.recentCharacterReplies || [], turnIntent)) issues.push("passive_exit_after_rupture");
  if (hasKineticTensionDeflation(text, options.latestUserMessage || "", options.recentUserMessages || [], options.recentCharacterReplies || [], options.character || {})) issues.push("kinetic_tension_deflated");
  if (hasChargedBeatAbandonment(text, options.latestUserMessage || "", options.recentCharacterReplies || [], options.character || {})) issues.push("charged_beat_abandoned");
  if (hasChargedBeatStall(text, options.latestUserMessage || "", options.recentCharacterReplies || [], options.character || {})) issues.push("charged_beat_stalled");
  if (hasChargedDepartureDrop(text, options.latestUserMessage || "", options.recentUserMessages || [], options.recentCharacterReplies || [], options.character || {})) issues.push("charged_departure_dropped");
  if (hasGenericPursuitWithoutProgress(text, turnIntent)) issues.push("generic_pursuit_without_progress");
  if (hasAttentionFixationLoop(text, options.recentCharacterReplies || [])) issues.push("attention_fixation_loop");
  if (hasNpcCommentatorLoop(text, options.recentCharacterReplies || [])) issues.push("npc_commentator_loop");
  if (hasRomanticInitiativeDrought(text, options.latestUserMessage || "", options.recentUserMessages || [], options.recentCharacterReplies || [], options.characterName || "", options.character || {})) issues.push("romantic_initiative_drought");
  if (hasInventedDebateEvidence(text, options.latestUserMessage || "")) issues.push("invented_debate_evidence");
  if (hasUserMotiveOverride(text, options.latestUserMessage || "", options.recentUserMessages || [])) issues.push("user_motive_overwritten");
  if (hasRejectedPursuitFramingPersistence(text, options.latestUserMessage || "")) issues.push("rejected_pursuit_framing_persisted");
  if (hasUnstagedUserDepartureInference(text, options.latestUserMessage || "", options.userName || "", options.recentUserMessages || [])) issues.push("unstaged_user_departure_inference");
  if (hasUnstagedUserMovementInference(text, options.latestUserMessage || "", options.userName || "", options.recentUserMessages || [])) issues.push("unstaged_user_movement_inference");
  if (hasNameAddressOveruse(text, options.recentCharacterReplies || [], options.userName || "")) issues.push("name_address_overuse");
  if (hasMissingSocialGravity(text, options.latestUserMessage || "", options.recentCharacterReplies || [], options.character || {})) issues.push("social_gravity_missing");
  if (hasMissingRomanticSocialGravity(text, options.latestUserMessage || "", options.recentUserMessages || [], options.recentCharacterReplies || [], options.character || {})) issues.push("romantic_social_gravity_missing");
  if (hasInstantlyNeutralizedAdmirer(text, options.character || {})) issues.push("admirer_instantly_neutralized");
  if (hasMissingProfileSocialEcosystem(text, options.latestUserMessage || "", options.recentUserMessages || [], options.recentCharacterReplies || [], options.character || {})) issues.push("profile_social_ecosystem_missing");
  if (hasAtmosphericStallingLoop(text, options.recentCharacterReplies || [], turnIntent)) issues.push("atmospheric_stalling_loop");
  if (hasSilentContinuationStall(text, turnIntent, options.recentCharacterReplies || [])) issues.push("silent_continue_stalled");
  if (hasTimeSkipDrift(text, turnIntent)) issues.push("time_skip_stalled");
  if (hasTimeSkipExpositionEcho(text, options.latestUserMessage || "", turnIntent)) issues.push("time_skip_exposition_echo");
  if (hasSpatialContinuityBreak(text, options.latestUserMessage || "")) issues.push("spatial_relationship_broken");
  if (hasSpatialProximityTeleport(text, options.latestUserMessage || "", options.recentCharacterReplies || [])) issues.push("spatial_proximity_teleport");
  if (hasImmediatePoseRegression(text, options.latestUserMessage || "", options.recentCharacterReplies || [])) issues.push("immediate_pose_regression");

  const deterministicNaturalness = deterministicNaturalnessScore(text, options);
  if (deterministicNaturalness < 72) issues.push("naturalness_score_low");

  const needsSocialBeat = ["reassurance", "affection", "direct_question", "challenge", "charged_nonverbal", "silent_continue", "return_main_pov", "digital_message", "interactive_thread", "confrontation", "confrontation_exit"].includes(turnIntent.kind);
  if (needsSocialBeat && words.length < 16) issues.push("underdeveloped_social_beat");
  if (turnIntent.kind === "interactive_thread") {
    const dialogueUnits = [...text.matchAll(/["“]([^"”]{2,})["”]/g)].length;
    const digitalMarkers = (normalizeText(text).match(/\b(?:message|text|dm|reply|replied|screen|phone|notification|typing|chat|mensaje|respondio|respondió|escribio|escribió)\b/g) || []).length;
    if (words.length < 85 || (dialogueUnits < 3 && digitalMarkers < 4)) issues.push("interactive_thread_collapsed");
  }
  if (["reassurance", "affection", "silent_continue", "return_main_pov"].includes(turnIntent.kind) && !/["“”]/.test(text)) issues.push("missing_character_dialogue");
  if (turnIntent.kind === "affection" && words.length < 24) issues.push("missing_emotional_impact");
  if (["confrontation", "confrontation_exit"].includes(turnIntent.kind) && words.length < 28) issues.push("underdeveloped_emotional_confrontation");
  if (["challenge", "charged_nonverbal"].includes(turnIntent.kind) && words.length < 20) issues.push("underdeveloped_charged_beat");

  for (const rejected of options.rejectedResponses || []) {
    if (replySimilarity(text, rejected) >= 0.72) {
      issues.push("too_similar_to_rejected_take");
      break;
    }
  }
  return [...new Set(issues)];
}
function validateContinuityEnvelope(result = {}, options = {}) {
  const issues = [];
  const previousScene = options.previousScene && typeof options.previousScene === "object" ? options.previousScene : {}, previousCast = options.previousCast && typeof options.previousCast === "object" ? options.previousCast : {}, previousIntelligence = options.previousIntelligence && typeof options.previousIntelligence === "object" ? options.previousIntelligence : {};
  const sceneUpdate = result?.scene_update && typeof result.scene_update === "object" ? result.scene_update : {}, continuityUpdate = result?.continuity_update && typeof result.continuity_update === "object" ? result.continuity_update : {};
  const latest = normalizeText(options.latestUserMessage || "");
  const reply = normalizeText(result?.reply || "");
  const turnIntent = options.turnIntent || { medium: "physical" };
  const sceneChanged = Boolean(sceneUpdate?.scene_changed);

  const oldLocation = normalizeText(previousScene?.location || ""), nextLocation = normalizeText(sceneUpdate?.location || "");
  const latestSceneAnchor = extractUserSceneAnchor(options.latestUserMessage || "");
  if (latestSceneAnchor) {
    const anchorToken = latestSceneAnchor.location.split(/\s+/).filter(Boolean).at(-1) || latestSceneAnchor.location;
    const locationMatches = !anchorToken || nextLocation.includes(anchorToken);
    if (!locationMatches) issues.push("latest_user_scene_not_applied");
    if (oldLocation && oldLocation !== nextLocation && !sceneChanged) issues.push("latest_user_scene_not_applied");
    if (hasLatestUserSceneIgnored(result?.reply || "", options.latestUserMessage || "", previousScene)) issues.push("latest_user_scene_ignored");
    if (hasUnsolicitedOffscreenLeadContact(result?.reply || "", options.latestUserMessage || "", previousScene, options.characterName || "", options.recentUserMessages || [], options.recentCharacterReplies || [])) issues.push("unsolicited_offscreen_lead_contact");
  }
  if (oldLocation && nextLocation && oldLocation !== nextLocation && !sceneChanged) issues.push("location_changed_without_scene_change");
  const oldTime = normalizeText(previousScene?.time_label || ""), nextTime = normalizeText(sceneUpdate?.time_label || "");
  if (oldTime && nextTime && oldTime !== nextTime && !sceneChanged) issues.push("time_changed_without_scene_change");

  const priorPresent = compactSceneNames(previousScene?.present || []), proposed = compactSceneNames(sceneUpdate?.present || []), exited = new Set(compactSceneNames(sceneUpdate?.exited || []).map(normalizeText));
  if (!sceneChanged && proposed.length) {
    const proposedKeys = new Set(proposed.map(normalizeText));
    if (priorPresent.some((name) => !proposedKeys.has(normalizeText(name)) && !exited.has(normalizeText(name)))) issues.push("present_character_silently_dropped");
  }
  const reentryVerb = /\b(?:enters|returns|arrives|comes back|walks in|steps in|entra|vuelve|regresa|llega)\b/.test(reply);
  for (const name of proposed) {
    const key = normalizeText(name), status = normalizeText(previousCast?.[name]?.current_status || "");
    if (/left|absent|away|outside|exited/.test(status) && !latest.includes(key) && !(reply.includes(key) && reentryVerb)) {
      issues.push("absent_character_reappeared");
      break;
    }
  }
  if (turnIntent.medium !== "digital") {
    const presentKeys = new Set(proposed.length ? proposed.map(normalizeText) : priorPresent.map(normalizeText));
    const heard = compactSceneNames(sceneUpdate?.heard_user_turn || []);
    if (heard.some((name) => !presentKeys.has(normalizeText(name)) && /left|absent|away|outside|exited/.test(normalizeText(previousCast?.[name]?.current_status || "")))) issues.push("offscreen_character_heard_turn");
  }

  const latestHasNpcSpeechCue = /\b(?:talked|spoke|said|asked|answered|replied|responded|kept talking|continued talking|started talking|flirted|interrupted)\b/.test(latest);
  const replyHasVisibleDialogue = /["“”]/.test(String(result?.reply || ""));
  const replyErasesActiveNpc = /\b(?:footsteps faded|walked away|headed (?:off|away|back)|drifted away|moved on|left the (?:area|scene|group)|disappeared (?:down|into|through)|back toward the library)\b/.test(reply);
  const latestHasExitCue = /\b(?:left|leaves|walked away|walks away|headed off|heads off|went away|goes away|moved on|moves on|said goodbye|goodbye|bye)\b/.test(latest);
  if (latestHasNpcSpeechCue && !replyHasVisibleDialogue) issues.push("active_npc_cue_skipped");
  if (latestHasNpcSpeechCue && replyErasesActiveNpc && !latestHasExitCue) issues.push("active_npc_erased_after_cue");
  if (latestHasNpcSpeechCue && compactSceneNames(sceneUpdate?.exited || []).length && !latestHasExitCue) issues.push("cued_npc_marked_exited");

  const oldObjects = compactTextList(previousIntelligence?.objects || [], 12, 180);
  const nextObjects = compactTextList(continuityUpdate?.objects_present || [], 12, 180);
  if (oldObjects.length && nextObjects.some((item) => !oldObjects.some((prior) => memorySimilarity(prior, item) >= 0.72) && !latest.includes(normalizeText(item)))) issues.push("invented_plot_object");
  const priorObjectStates = Array.isArray(previousScene?.object_states) ? previousScene.object_states : [];
  const proposedObjectStates = Array.isArray(sceneUpdate?.object_states) ? sceneUpdate.object_states : [];
  for (const item of proposedObjectStates) {
    const objectName = normalizeText(item?.object || "");
    if (!objectName) continue;
    const existed = priorObjectStates.some((prior) => memorySimilarity(prior?.object || "", item?.object || "") >= 0.72);
    const groundedNow = latest.includes(objectName) || reply.includes(objectName);
    if (!existed && !groundedNow) { issues.push("invented_scene_object_state"); break; }
  }
  if (hasStructuralReplyLoop(result?.reply || "", options.recentCharacterReplies || [])) issues.push("structural_repetition_loop");
  const qc = result?.quality_check && typeof result.quality_check === "object" ? result.quality_check : {};
  if ([qc.canon_ok, qc.user_control_ok, qc.physics_ok, qc.knowledge_ok, qc.voice_ok, qc.repetition_ok, qc.subtext_ok, qc.structure_repetition_ok, qc.scene_momentum_ok, qc.contradiction_ok, qc.rhythm_ok, qc.nonverbal_ok, qc.romantic_specificity_ok, qc.decision_consistency_ok, qc.boundary_ok, qc.social_information_ok, qc.adaptive_detail_ok, qc.dna_ok, qc.naturalness_ok].some((value) => value === false)) issues.push("model_self_check_failed");
  if (Number.isFinite(Number(qc?.naturalness_score)) && Number(qc.naturalness_score) < 72) issues.push("naturalness_score_low");
  const driftRisk = normalizeText(qc?.drift_risk || "none");
  if (driftRisk && !/^(?:none|no|stable|low|minimal|ninguno|estable)$/.test(driftRisk)) issues.push("identity_drift_risk");

  return [...new Set(issues)];
}
function detectResponseLanguage(latestUserMessage = "", previousCharacterMessage = "") {
  const latest = String(latestUserMessage || "").trim();
  const raw = isSilentContinueText(latest)
    ? String(previousCharacterMessage || "").trim()
    : latest;
  const spanish = (raw.match(/\b(?:que|qué|por|para|pero|porque|como|cómo|estoy|esta|está|eres|soy|tengo|quiero|puedo|gracias|nada|bien|mal|oye|sí|si|te|me|mi|yo|tu|tú|con|sin|una|uno|los|las|del|al)\b/gi) || []).length;
  const english = (raw.match(/\b(?:what|why|how|where|when|but|because|i|i'm|i've|you|your|me|my|we|with|without|just|really|okay|fine|missed|studying|nothing|about)\b/gi) || []).length;
  if (spanish > english) return "Spanish";
  if (english > spanish) return "English";
  return /[áéíóúüñ¿¡]/i.test(raw) ? "Spanish" : "English";
}
// PURE_NARRATIVE_HELPERS_END

function compactSceneNames(value: any, limit = 14) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanPromptValue(item, 80)).filter(Boolean))].slice(0, limit);
}
function applySceneContinuity({ previousScene = {}, previousCast = {}, sceneUpdate = {}, castUpdates = [], mainCharacterName = "" }) {
  const priorPresent = compactSceneNames(previousScene?.present || []), proposedPresent = compactSceneNames(sceneUpdate?.present || []), sceneChanged = Boolean(sceneUpdate?.scene_changed);
  const exitedNames = compactSceneNames(sceneUpdate?.exited || []), exitedKeys = new Set(exitedNames.map(normalizeText));
  const roster = sceneChanged
    ? (proposedPresent.length ? proposedPresent : priorPresent)
    : [...priorPresent, ...proposedPresent].filter((name, index, all) => all.findIndex((other) => normalizeText(other) === normalizeText(name)) === index);
  const present = roster.filter((name) => !exitedKeys.has(normalizeText(name)));
  const scene = {
    ...(previousScene && typeof previousScene === "object" ? previousScene : {}),
    location: cleanPromptValue(sceneUpdate?.location, 180) || cleanPromptValue(previousScene?.location, 180),
    time_label: cleanPromptValue(sceneUpdate?.time_label, 120) || cleanPromptValue(previousScene?.time_label, 120),
    present,
    heard_user_turn: compactSceneNames(sceneUpdate?.heard_user_turn || []),
    activity: cleanPromptValue(sceneUpdate?.activity, 220) || cleanPromptValue(previousScene?.activity || previousScene?.current_activity, 220),
    communication_medium: cleanPromptValue(sceneUpdate?.communication_medium, 80) || cleanPromptValue(previousScene?.communication_medium, 80) || "in_person",
    spatial_notes: compactTextList(sceneUpdate?.spatial_notes?.length ? sceneUpdate.spatial_notes : previousScene?.spatial_notes, 8, 220),
    object_states: (Array.isArray(sceneUpdate?.object_states) && sceneUpdate.object_states.length ? sceneUpdate.object_states : (Array.isArray(previousScene?.object_states) ? previousScene.object_states : []))
      .slice(0, 8).map((item) => ({ object: cleanPromptValue(item?.object, 100), holder: cleanPromptValue(item?.holder, 100), location: cleanPromptValue(item?.location, 140), state: cleanPromptValue(item?.state, 160) })).filter((item) => item.object),
    last_scene_change: sceneChanged ? new Date().toISOString() : previousScene?.last_scene_change || null,
  };
  const cast = { ...(previousCast && typeof previousCast === "object" ? previousCast : {}) };
  for (const name of present) cast[name] = { ...(cast[name] || {}), current_status: "present", last_seen: scene.location || "current scene" };
  for (const name of exitedNames) cast[name] = { ...(cast[name] || {}), current_status: "left the current scene", last_seen: scene.location || cast[name]?.last_seen || "previous scene" };
  for (const item of Array.isArray(castUpdates) ? castUpdates.slice(0, 4) : []) {
    const name = cleanPromptValue(item?.name, 80);
    if (!name || normalizeText(name) === normalizeText(mainCharacterName)) continue;
    const prior = cast[name] || {};
    cast[name] = {
      ...prior,
      relationship: cleanPromptValue(item?.relationship, 260) || prior.relationship || "",
      personality_note: cleanPromptValue(item?.personality_note, 260) || prior.personality_note || "",
      current_dynamic: cleanPromptValue(item?.current_dynamic, 320) || prior.current_dynamic || "",
      knows: cleanPromptValue(item?.knows, 360) || prior.knows || "",
      last_interaction: cleanPromptValue(item?.last_interaction, 360) || prior.last_interaction || "",
    };
  }
  if (sceneChanged) {
    const presentKeys = new Set(present.map(normalizeText));
    for (const name of priorPresent) if (!presentKeys.has(normalizeText(name)) && !exitedKeys.has(normalizeText(name))) cast[name] = { ...(cast[name] || {}), current_status: "outside current scene", last_seen: cleanPromptValue(previousScene?.location, 180) || cast[name]?.last_seen || "previous scene" };
  }
  if (mainCharacterName && present.some((name) => normalizeText(name) === normalizeText(mainCharacterName))) cast[mainCharacterName] = { ...(cast[mainCharacterName] || {}), current_status: "present", last_seen: scene.location || "current scene" };
  return { scene, cast };
}
function buildSceneSeparatorLabel(previousScene: any = {}, sceneUpdate: any = {}) {
  const explicit = cleanPromptValue(sceneUpdate?.separator_label, 100);
  if (explicit || !sceneUpdate?.scene_changed) return explicit;
  const nextTime = cleanPromptValue(sceneUpdate?.time_label, 100), timeKey = normalizeText(nextTime), oldTime = normalizeText(previousScene?.time_label || "");
  if (nextTime && timeKey !== oldTime) {
    if (/next morning|following morning/.test(timeKey)) return "The next morning";
    if (/morning/.test(timeKey)) return "That morning";
    if (/night/.test(timeKey)) return /later/.test(timeKey) ? nextTime : "Later that night";
    if (/evening/.test(timeKey)) return /later/.test(timeKey) ? nextTime : "Later that evening";
    if (/afternoon/.test(timeKey)) return /later/.test(timeKey) ? nextTime : "Later that afternoon";
    return nextTime;
  }
  const location = cleanPromptValue(sceneUpdate?.location, 100);
  if (location && normalizeText(location) !== normalizeText(previousScene?.location || "")) return location;
  return "A little later";
}
function compactTextList(value: any, limit = 12, itemLimit = 260) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanPromptValue(item, itemLimit)).filter(Boolean))].slice(0, limit);
}
function applyIntelligenceContinuity(previous: any = {}, update: any = {}, mindUpdate: any = {}, storyDrive: any = {}, reflection: any = {}, humanBehaviorUpdate: any = {}, presenceUpdate: any = {}) {
  const prior = previous && typeof previous === "object" ? previous : {};
  const resolved = compactTextList(update?.resolved_commitments, 8, 260);
  const proposedCommitments = compactTextList(update?.commitments, 8, 260);
  const commitments = compactTextList([...(prior.commitments || []), ...proposedCommitments], 12, 260)
    .filter((item) => !resolved.some((done) => memorySimilarity(item, done) >= 0.72));
  const knowledge = [...(Array.isArray(prior.knowledge) ? prior.knowledge : []), ...(Array.isArray(update?.knowledge_updates) ? update.knowledge_updates : [])]
    .map((item) => ({ who: cleanPromptValue(item?.who, 80), subject: cleanPromptValue(item?.subject, 140), knows: cleanPromptValue(item?.knows, 280), source: cleanPromptValue(item?.source, 180), status: ["known","suspected","rumor","forgotten"].includes(String(item?.status)) ? String(item.status) : "known", secret: Boolean(item?.secret) }))
    .filter((item) => item.who && item.knows)
    .filter((item, index, all) => all.findLastIndex((other) => normalizeText(other.who) === normalizeText(item.who) && memorySimilarity(other.knows, item.knows) >= 0.76) === index)
    .slice(-24);
  const priorMind = prior.character_mind && typeof prior.character_mind === "object" ? prior.character_mind : {};
  const mind = {
    know: cleanPromptValue(mindUpdate?.know, 420) || cleanPromptValue(priorMind?.know, 420),
    believe: cleanPromptValue(mindUpdate?.believe, 420) || cleanPromptValue(priorMind?.believe, 420),
    misunderstand: cleanPromptValue(mindUpdate?.misunderstand, 420) || cleanPromptValue(priorMind?.misunderstand, 420),
    want: cleanPromptValue(mindUpdate?.want, 320) || cleanPromptValue(priorMind?.want, 320),
    avoid: cleanPromptValue(mindUpdate?.avoid, 320) || cleanPromptValue(priorMind?.avoid, 320),
    wont_admit: cleanPromptValue(mindUpdate?.wont_admit, 320) || cleanPromptValue(priorMind?.wont_admit, 320),
    outside_priority: cleanPromptValue(mindUpdate?.outside_priority, 320) || cleanPromptValue(priorMind?.outside_priority, 320),
    short_goal: cleanPromptValue(mindUpdate?.short_goal, 320) || cleanPromptValue(priorMind?.short_goal, 320),
    mid_goal: cleanPromptValue(mindUpdate?.mid_goal, 320) || cleanPromptValue(priorMind?.mid_goal, 320),
    long_goal: cleanPromptValue(mindUpdate?.long_goal, 320) || cleanPromptValue(priorMind?.long_goal, 320),
    attachment_pattern: ["approach","withdraw","mixed","steady","unknown"].includes(String(mindUpdate?.attachment_pattern)) ? String(mindUpdate.attachment_pattern) : (priorMind?.attachment_pattern || "unknown"),
    microvoice: cleanPromptValue(mindUpdate?.microvoice, 260) || cleanPromptValue(priorMind?.microvoice, 260),
    energy: cleanPromptValue(mindUpdate?.energy, 160) || cleanPromptValue(priorMind?.energy, 160),
    confidence: cleanPromptValue(mindUpdate?.confidence, 160) || cleanPromptValue(priorMind?.confidence, 160),
    emotion_trigger: cleanPromptValue(mindUpdate?.emotion_trigger, 320) || cleanPromptValue(priorMind?.emotion_trigger, 320),
    emotion_interpretation: cleanPromptValue(mindUpdate?.emotion_interpretation, 360) || cleanPromptValue(priorMind?.emotion_interpretation, 360),
    current_emotion: cleanPromptValue(mindUpdate?.current_emotion, 180) || cleanPromptValue(priorMind?.current_emotion, 180),
    behavioral_pressure: cleanPromptValue(mindUpdate?.behavioral_pressure, 320) || cleanPromptValue(priorMind?.behavioral_pressure, 320),
    anticipated_next: cleanPromptValue(mindUpdate?.anticipated_next, 320) || cleanPromptValue(priorMind?.anticipated_next, 320),
    public_private_mode: ["public","private","mixed","digital","unknown"].includes(String(mindUpdate?.public_private_mode)) ? String(mindUpdate.public_private_mode) : (priorMind?.public_private_mode || "unknown"),
    behavioral_pattern: cleanPromptValue(mindUpdate?.behavioral_pattern, 360) || cleanPromptValue(priorMind?.behavioral_pattern, 360),
    conflict_pattern: cleanPromptValue(mindUpdate?.conflict_pattern, 320) || cleanPromptValue(priorMind?.conflict_pattern, 320),
    contradiction_in_play: cleanPromptValue(mindUpdate?.contradiction_in_play, 320) || cleanPromptValue(priorMind?.contradiction_in_play, 320),
    private_intention: cleanPromptValue(mindUpdate?.private_intention, 320) || cleanPromptValue(priorMind?.private_intention, 320),
    expected_outcome: cleanPromptValue(mindUpdate?.expected_outcome, 280) || cleanPromptValue(priorMind?.expected_outcome, 280),
    feared_outcome: cleanPromptValue(mindUpdate?.feared_outcome, 280) || cleanPromptValue(priorMind?.feared_outcome, 280),
  };
  const priorBehavior = prior.human_behavior_state && typeof prior.human_behavior_state === "object" ? prior.human_behavior_state : {};
  const keep = (key: string, limit = 360) => cleanPromptValue(humanBehaviorUpdate?.[key], limit) || cleanPromptValue(priorBehavior?.[key], limit);
  const humanBehaviorState = {
    rhythm_mode: ["terse","brief","natural","expanded","silent"].includes(String(humanBehaviorUpdate?.rhythm_mode)) ? String(humanBehaviorUpdate.rhythm_mode) : (priorBehavior?.rhythm_mode || "natural"),
    rhythm_reason: keep("rhythm_reason", 260),
    nonverbal_signal: keep("nonverbal_signal", 260), nonverbal_meaning: keep("nonverbal_meaning", 300),
    humor_profile: keep("humor_profile", 320), humor_boundary: keep("humor_boundary", 260),
    argument_lesson: keep("argument_lesson", 380), romantic_expression: keep("romantic_expression", 360), romantic_avoidance: keep("romantic_avoidance", 320),
    physical_boundary_state: keep("physical_boundary_state", 420), decision_basis: keep("decision_basis", 420),
    persistent_location: keep("persistent_location", 360), social_reputation_update: keep("social_reputation_update", 360), information_flow: keep("information_flow", 420),
    relationship_self_view: keep("relationship_self_view", 320), relationship_user_view: keep("relationship_user_view", 240),
    autonomous_plan: keep("autonomous_plan", 420), between_scene_motion: keep("between_scene_motion", 420), memory_compression_anchor: keep("memory_compression_anchor", 500),
    initiative_profile: ["high","medium","low","reactive","variable","unknown"].includes(String(humanBehaviorUpdate?.initiative_profile)) ? String(humanBehaviorUpdate.initiative_profile) : (priorBehavior?.initiative_profile || "unknown"),
    character_dna: keep("character_dna", 620), transition_style: keep("transition_style", 280),
    detail_level: ["sparse","balanced","atmospheric"].includes(String(humanBehaviorUpdate?.detail_level)) ? String(humanBehaviorUpdate.detail_level) : (priorBehavior?.detail_level || "balanced"),
    naturalness_score: Math.max(0, Math.min(100, Number(humanBehaviorUpdate?.naturalness_score) || Number(priorBehavior?.naturalness_score) || 80)),
    naturalness_notes: keep("naturalness_notes", 300),
  };
  const priorPresence = prior.presence_engine_state && typeof prior.presence_engine_state === "object" ? prior.presence_engine_state : {};
  const pkeep = (key: string, limit = 360) => cleanPromptValue(presenceUpdate?.[key], limit) || cleanPromptValue(priorPresence?.[key], limit);
  const sceneMemoryInput = presenceUpdate?.scene_memory && typeof presenceUpdate.scene_memory === "object" ? presenceUpdate.scene_memory : {};
  const previousSceneMemory = prior.scene_memory && typeof prior.scene_memory === "object" ? prior.scene_memory : {};
  const sceneMemory = {
    location: cleanPromptValue(sceneMemoryInput?.location, 180) || cleanPromptValue(previousSceneMemory?.location, 180),
    medium: cleanPromptValue(sceneMemoryInput?.medium, 80) || cleanPromptValue(previousSceneMemory?.medium, 80),
    activity: cleanPromptValue(sceneMemoryInput?.activity, 220) || cleanPromptValue(previousSceneMemory?.activity, 220),
    present: compactSceneNames(sceneMemoryInput?.present?.length ? sceneMemoryInput.present : previousSceneMemory?.present, 12),
    spatial: compactTextList(sceneMemoryInput?.spatial?.length ? sceneMemoryInput.spatial : previousSceneMemory?.spatial, 8, 180),
    objects: compactTextList(sceneMemoryInput?.objects?.length ? sceneMemoryInput.objects : previousSceneMemory?.objects, 8, 180),
    last_physical_state: cleanPromptValue(sceneMemoryInput?.last_physical_state, 320) || cleanPromptValue(previousSceneMemory?.last_physical_state, 320),
  };
  const unfinishedAdd = compactTextList(presenceUpdate?.unfinished_business_add, 6, 320);
  const unfinishedResolve = compactTextList(presenceUpdate?.unfinished_business_resolve, 6, 320);
  const unfinishedBusiness = compactTextList([...(Array.isArray(prior.unfinished_business) ? prior.unfinished_business : []), ...unfinishedAdd], 14, 320)
    .filter((item) => !unfinishedResolve.some((resolvedItem) => memorySimilarity(item, resolvedItem) >= 0.68));
  const chemistryInput = presenceUpdate?.chemistry_fingerprint && typeof presenceUpdate.chemistry_fingerprint === "object" ? presenceUpdate.chemistry_fingerprint : {};
  const priorChemistry = prior.chemistry_fingerprint && typeof prior.chemistry_fingerprint === "object" ? prior.chemistry_fingerprint : {};
  const chemistryFingerprint = {
    humor_rhythm: cleanPromptValue(chemistryInput?.humor_rhythm, 260) || cleanPromptValue(priorChemistry?.humor_rhythm, 260),
    friction_style: cleanPromptValue(chemistryInput?.friction_style, 280) || cleanPromptValue(priorChemistry?.friction_style, 280),
    silence_style: cleanPromptValue(chemistryInput?.silence_style, 240) || cleanPromptValue(priorChemistry?.silence_style, 240),
    repair_style: cleanPromptValue(chemistryInput?.repair_style, 280) || cleanPromptValue(priorChemistry?.repair_style, 280),
    private_reference: cleanPromptValue(chemistryInput?.private_reference, 240) || cleanPromptValue(priorChemistry?.private_reference, 240),
    attention_style: cleanPromptValue(chemistryInput?.attention_style, 260) || cleanPromptValue(priorChemistry?.attention_style, 260),
  };
  const journalInput = presenceUpdate?.private_character_journal && typeof presenceUpdate.private_character_journal === "object" ? presenceUpdate.private_character_journal : {};
  const priorJournal = prior.private_character_journal && typeof prior.private_character_journal === "object" ? prior.private_character_journal : {};
  const privateCharacterJournal = {
    focus: cleanPromptValue(journalInput?.focus, 320) || cleanPromptValue(priorJournal?.focus, 320),
    belief: cleanPromptValue(journalInput?.belief, 320) || cleanPromptValue(priorJournal?.belief, 320),
    fear: cleanPromptValue(journalInput?.fear, 280) || cleanPromptValue(priorJournal?.fear, 280),
    considering: cleanPromptValue(journalInput?.considering, 320) || cleanPromptValue(priorJournal?.considering, 320),
    wont_admit: cleanPromptValue(journalInput?.wont_admit, 300) || cleanPromptValue(priorJournal?.wont_admit, 300),
  };
  const presenceEngineState = {
    presence_action: pkeep("presence_action", 300),
    conversation_mode: ["fragmented","brief","natural","extended","overlap","silent"].includes(String(presenceUpdate?.conversation_mode)) ? String(presenceUpdate.conversation_mode) : (priorPresence?.conversation_mode || "natural"),
    jealousy_mode: pkeep("jealousy_mode", 280),
    texting_mode: ["off","live","delayed","rapid","call_transition"].includes(String(presenceUpdate?.texting_mode)) ? String(presenceUpdate.texting_mode) : (priorPresence?.texting_mode || "off"),
    supporting_cast_dynamics: compactTextList(presenceUpdate?.supporting_cast_dynamics?.length ? presenceUpdate.supporting_cast_dynamics : priorPresence?.supporting_cast_dynamics, 8, 300),
    emotional_residue: pkeep("emotional_residue", 360),
    romantic_specificity: pkeep("romantic_specificity", 320),
    flirt_mode: ["off","low","natural"].includes(String(presenceUpdate?.flirt_mode)) ? String(presenceUpdate.flirt_mode) : (priorPresence?.flirt_mode || "off"),
    bad_day_state: pkeep("bad_day_state", 300),
    micro_conflict: pkeep("micro_conflict", 320),
    voice_drift: pkeep("voice_drift", 320),
    narrative_camera: ["lean","balanced","close","orienting"].includes(String(presenceUpdate?.narrative_camera)) ? String(presenceUpdate.narrative_camera) : (priorPresence?.narrative_camera || "balanced"),
    silence_mode: pkeep("silence_mode", 280),
    director_check: pkeep("director_check", 420),
  };
  const possessionUpdates = Array.isArray(humanBehaviorUpdate?.possession_updates) ? humanBehaviorUpdate.possession_updates.slice(0, 5).map((item:any)=>({
    object: cleanPromptValue(item?.object, 100), holder: cleanPromptValue(item?.holder, 100), location: cleanPromptValue(item?.location, 180), state: cleanPromptValue(item?.state, 180),
  })).filter((item:any)=>item.object) : [];
  const priorPossessions = Array.isArray(prior.possessions) ? prior.possessions : [];
  const mergedPossessions = [...priorPossessions];
  for (const item of possessionUpdates) {
    const idx = mergedPossessions.findIndex((priorItem:any)=>memorySimilarity(priorItem?.object || "", item.object) >= 0.72);
    if (idx >= 0) mergedPossessions[idx] = { ...mergedPossessions[idx], ...item }; else mergedPossessions.push(item);
  }
  const priorLocations = Array.isArray(prior.persistent_locations) ? prior.persistent_locations : [];
  const locationMemory = humanBehaviorState.persistent_location ? [...priorLocations, humanBehaviorState.persistent_location] : priorLocations;
  const uniqueLocations = [...new Set(locationMemory.map((item:any)=>cleanPromptValue(item, 360)).filter(Boolean))].slice(-8);
  const temporal = update?.temporal_anchor && typeof update.temporal_anchor === "object" ? update.temporal_anchor : {};
  const offscreen = update?.offscreen_contact && typeof update.offscreen_contact === "object" && update.offscreen_contact.record ? {
    from: cleanPromptValue(update.offscreen_contact.from, 100), to: cleanPromptValue(update.offscreen_contact.to, 100), medium: cleanPromptValue(update.offscreen_contact.medium, 80),
    content_hint: cleanPromptValue(update.offscreen_contact.content_hint, 280), reason: cleanPromptValue(update.offscreen_contact.reason, 280), at: new Date().toISOString(),
  } : null;
  const priorContacts = Array.isArray(prior.offscreen_contacts) ? prior.offscreen_contacts : [];
  return {
    ...prior,
    objects: compactTextList(update?.objects_present?.length ? update.objects_present : prior.objects, 12, 180),
    knowledge, commitments, character_mind: mind, human_behavior_state: humanBehaviorState, presence_engine_state: presenceEngineState,
    scene_memory: sceneMemory, unfinished_business: unfinishedBusiness, chemistry_fingerprint: chemistryFingerprint, private_character_journal: privateCharacterJournal,
    persistent_locations: uniqueLocations, possessions: mergedPossessions.slice(-12),
    social_reputation: { latest: humanBehaviorState.social_reputation_update || cleanPromptValue(prior?.social_reputation?.latest, 360), information_flow: humanBehaviorState.information_flow || cleanPromptValue(prior?.social_reputation?.information_flow, 420) },
    autonomous_plan: { plan: humanBehaviorState.autonomous_plan || cleanPromptValue(prior?.autonomous_plan?.plan, 420), between_scene: humanBehaviorState.between_scene_motion || cleanPromptValue(prior?.autonomous_plan?.between_scene, 420) },
    stakes: cleanPromptValue(update?.stakes, 360) || cleanPromptValue(prior.stakes, 360),
    story_now: cleanPromptValue(temporal?.story_now, 140) || cleanPromptValue(prior.story_now, 140),
    elapsed_since_previous: cleanPromptValue(temporal?.elapsed_since_previous, 140) || cleanPromptValue(prior.elapsed_since_previous, 140),
    time_certainty: ["exact","approximate","unknown"].includes(String(temporal?.certainty)) ? String(temporal.certainty) : (prior.time_certainty || "unknown"),
    intensity_level: Math.max(1, Math.min(10, Number(storyDrive?.intensity_target) || Number(prior.intensity_level) || 4)),
    offscreen_contacts: offscreen ? [...priorContacts, offscreen].slice(-8) : priorContacts.slice(-8),
    season_signal: Boolean(storyDrive?.season_signal),
    season_reason: cleanPromptValue(storyDrive?.season_reason, 280),
    scene_momentum: ["hold","turn","close"].includes(String(storyDrive?.scene_momentum)) ? String(storyDrive.scene_momentum) : (prior.scene_momentum || "hold"),
    compression_reason: cleanPromptValue(storyDrive?.compression_reason, 320),
    emotional_causality: {
      trigger: mind.emotion_trigger || "", interpretation: mind.emotion_interpretation || "", emotion: mind.current_emotion || "", behavioral_pressure: mind.behavioral_pressure || "",
    },
    anticipation: { next: mind.anticipated_next || "", expected: mind.expected_outcome || "", feared: mind.feared_outcome || "" },
    behavioral_memory: { pattern: mind.behavioral_pattern || "", conflict_pattern: mind.conflict_pattern || "", contradiction: mind.contradiction_in_play || "" },
    private_intention: { intention: mind.private_intention || "", expected: mind.expected_outcome || "", feared: mind.feared_outcome || "" },
    last_reflection: {
      changed: cleanPromptValue(reflection?.changed, 420), pending: cleanPromptValue(reflection?.pending, 420), avoid_repeat: cleanPromptValue(reflection?.avoid_repeat, 320), affected: compactTextList(reflection?.affected, 6, 100), plausible_consequence: cleanPromptValue(reflection?.plausible_consequence, 360),
    },
    updated_at: new Date().toISOString(),
  };
}

function buildStoryRecap(timeline: any[] = [], previous = "") {
  const meaningful = (Array.isArray(timeline) ? timeline : []).filter((item) => Number(item?.importance || 0) >= 3 || item?.scene_changed).slice(-8);
  if (!meaningful.length) return cleanPromptValue(previous, 2200);
  return meaningful.map((item) => cleanPromptValue(item?.detail || item?.note || item?.label, 320)).filter(Boolean).join(" • ").slice(0, 2200);
}
function evolveStoryChapters({ chapters = [], activeChapter = {}, latestUserMessage = "", sceneUpdate = {}, timelineEvent = {}, savedMessage = {}, recap = "", storyDrive = {} }) {
  const closed = Array.isArray(chapters) ? [...chapters] : [];
  let active = activeChapter && typeof activeChapter === "object" ? { ...activeChapter } : {};
  if (!active.title) {
    active = { number: closed.length + 1, title: "Opening", summary: "The current chapter of the story.", started_at: savedMessage?.created_at || new Date().toISOString(), start_message_id: savedMessage?.id || "" };
  }
  const text = `${latestUserMessage} ${sceneUpdate?.separator_label || ""}`.toLowerCase();
  const largeJump = /(?:next day|next morning|next week|next month|next year|the following day|days later|weeks later|months later|years later|later that week|time skip|al día siguiente|a la mañana siguiente|días después|semanas después|meses después|años después|tiempo después)/i.test(text);
  const majorSceneBreak = Boolean(sceneUpdate?.scene_changed) && Number(timelineEvent?.importance || 0) >= 4 && /later|after|next|following|después|siguiente/i.test(String(sceneUpdate?.separator_label || ""));
  const durableSeasonShift = Boolean(storyDrive?.season_signal) && cleanPromptValue(storyDrive?.season_reason, 280).length >= 12 && Number(timelineEvent?.importance || 0) >= 4;
  if ((largeJump || majorSceneBreak || durableSeasonShift) && !String(active?.start_message_id || "").includes(String(savedMessage?.id || ""))) {
    closed.push({ ...active, ended_at: savedMessage?.created_at || new Date().toISOString(), summary: cleanPromptValue(recap, 520) || active.summary || "Chapter completed." });
    const title = cleanPromptValue(sceneUpdate?.separator_label, 80) || cleanPromptValue(timelineEvent?.label, 80) || cleanPromptValue(storyDrive?.season_reason, 80) || `Season ${closed.length + 1}`;
    active = { number: closed.length + 1, title, summary: cleanPromptValue(storyDrive?.season_reason, 360) || cleanPromptValue(timelineEvent?.detail, 280) || "A new phase of the story begins.", season_theme: cleanPromptValue(storyDrive?.season_reason, 260), started_at: savedMessage?.created_at || new Date().toISOString(), start_message_id: savedMessage?.id || "" };
  }
  return { chapters: closed.slice(-20), activeChapter: active, chapterNumber: Number(active.number || closed.length + 1) };
}
function relationshipStateFromDevelopment(development = {}, previous = {}) {
  const turningPoints = Array.isArray(development?.turning_points) ? development.turning_points.slice(-12) : [];
  const contradictions = Array.isArray(development?.active_contradictions) ? development.active_contradictions.slice(-4) : [];
  const residue = Array.isArray(development?.emotional_residue) ? development.emotional_residue.slice(-4) : [];
  const latestTurning = turningPoints.at(-1) || {};
  return {
    ...(previous && typeof previous === "object" ? previous : {}),
    current_dynamic: cleanPromptValue(development?.current_dynamic, 700) || cleanPromptValue(previous?.current_dynamic, 700),
    relationship_phase: cleanPromptValue(development?.relationship_phase, 60) || cleanPromptValue(previous?.relationship_phase, 60) || "baseline",
    active_contradictions: contradictions,
    emotional_residue: residue,
    flaw_pressure: cleanPromptValue(development?.flaw_pressure, 280) || cleanPromptValue(previous?.flaw_pressure, 280),
    independent_priority: cleanPromptValue(development?.independent_priority, 280) || cleanPromptValue(previous?.independent_priority, 280),
    repair_progress: cleanPromptValue(development?.repair_progress, 280) || cleanPromptValue(previous?.repair_progress, 280),
    current_mood: cleanPromptValue(development?.current_mood, 160) || cleanPromptValue(previous?.current_mood, 160),
    emotional_posture: cleanPromptValue(development?.emotional_posture, 220) || cleanPromptValue(previous?.emotional_posture, 220),
    guardedness: cleanPromptValue(development?.guardedness, 180) || cleanPromptValue(previous?.guardedness, 180),
    trust_direction: cleanPromptValue(development?.trust_direction, 180) || cleanPromptValue(previous?.trust_direction, 180),
    relationship_signature: cleanPromptValue(development?.relationship_signature, 360) || cleanPromptValue(previous?.relationship_signature, 360),
    private_patterns: Array.isArray(development?.private_patterns) ? development.private_patterns.slice(-6) : (previous?.private_patterns || []),
    sore_spots: Array.isArray(development?.sore_spots) ? development.sore_spots.slice(-5) : (previous?.sore_spots || []),
    shared_rituals: Array.isArray(development?.shared_rituals) ? development.shared_rituals.slice(-5) : (previous?.shared_rituals || []),
    voice_shift: cleanPromptValue(development?.voice_shift, 260) || cleanPromptValue(previous?.voice_shift, 260),
    conflict_aftertaste: cleanPromptValue(development?.conflict_aftertaste, 260) || cleanPromptValue(previous?.conflict_aftertaste, 260),
    repair_debt: cleanPromptValue(development?.repair_debt, 260) || cleanPromptValue(previous?.repair_debt, 260),
    turning_points: turningPoints,
    recent_shift: cleanPromptValue(latestTurning?.impact || latestTurning?.event, 320) || cleanPromptValue(previous?.recent_shift, 320),
    updated_at: new Date().toISOString(),
  };
}


async function streamRoleplayV19({
  apiKey,
  prompt,
  character,
  latestUserMessage,
  turnIntent,
  userIdentity,
  recentCharacterReplies,
  recentUserMessages,
  rejectedResponses,
  supabase,
  cancellationAdmin,
  generationId,
  conversationId,
  userId,
  storyRevision,
  replacementMessage,
  responseLanguage,
  memories,
  loreEntries,
  existingTimeline,
  previousDevelopment,
  latestUserMessageId,
  existingSceneState,
  existingCastState,
  persistentCast = [],
  existingRelationshipState,
  existingIntelligenceState,
  existingUnresolvedThreads,
  existingStoryRecap,
  existingStoryChapters,
  existingActiveChapter,
  activeArcs = [],
  activePlans = [],
  activeConflicts = [],
  chemistryProfiles = [],
  regenerationInstruction,
  regenerationFeedback,
  isRegeneration,
  isCancelled,
}) {
  const stream = new ReadableStream({
    async start(controller) {
      let repairUsed = false;
      let streamedReply = "";
      let modelDraftReply = "";
      const streamFinalReply = async (reply = "", reason = "finalize") => {
        const clean = String(reply || "");
        if (!clean || streamedReply === clean) return;
        if (streamedReply) sendEvent(controller, { type: "reset", reason });
        streamedReply = "";
        for (const chunk of splitForStreaming(clean)) {
          if (await isCancelled()) return;
          streamedReply += chunk;
          sendEvent(controller, { type: "chunk", content: chunk });
        }
      };
      // v2.11.18 INSTANT LIVE REPLY: foreground prose always paints optimistically.
      // Guards still validate and may replace the draft, but never quarantine first text.
      const guardedDraft = false;
      try {
        // Flush headers/UI state before the model has finished its first token.
        sendEvent(controller, {
          type: "start",
          language: responseLanguage,
          model: GEMINI_MODEL,
          repairUsed: false,
          liveStreaming: true,
          memoryCount: memories.length,
          pinnedMemoryCount: memories.filter((memory) => memory.is_pinned).length,
          memoryItems: memories.map((memory) => ({ id: memory.id, content: memory.content, category: memory.category, pinned: Boolean(memory.is_pinned) })),
          loreCount: loreEntries.length,
          loreItems: loreEntries.map((entry) => ({ id: entry.id, name: entry.name, type: entry.entry_type })),
        });

        const firstDraftStartedAt = Date.now();
        let result = await streamGeminiEnvelopeWithFailover({
          apiKey,
          systemInstruction: "Write one grounded, natural roleplay turn. Visible canon and user ownership are absolute: never invent the user's dialogue, thoughts, feelings, motives, reactions or unstaged movement. Answer the literal latest turn first, preserve physical and social continuity, and keep every character's established voice AND reaction logic specific rather than archetypal. Character DNA controls the underlying choice: defense, values, care style, pride, vulnerability, likely mistakes and decision bias must change how this person reacts, not merely the slang they use. Silently process cue → interpretation → impulse → defense/values → visible tactic, then write only the lived result. Make sentence shape, vocabulary, humor, conflict style, affection style and verbal tells materially audible in the dialogue. Vary the opening, gesture vocabulary and conversational tactic from recent replies; do not default to sarcasm, rhetorical questions, canned AI-romance cadence, cinematic body-language chains, therapist speech, or emotionally perfect responses. Let subtext remain subtext unless the character chooses to confess it. Let the character make one plausible choice that moves the scene without forcing the user's response. Side characters remain ordinary people with their own goals. Use Presence Engine 2.0: natural conversation, relationship-specific chemistry, real silence, emotional residue and adaptive narration. Put reply first. Hidden metadata must be brief and may record only events actually shown in the reply. OMIT unchanged, empty, unknown, false-by-default, or irrelevant metadata instead of filling every field. Keep hidden metadata under roughly 450 tokens. Do not spend the reply budget completing bookkeeping. Metadata fields may be top-level; never let metadata completion replace or repeat the visible reply. Return valid JSON only.",
          prompt,
          maxOutputTokens: getMaximumOutputTokens(character.response_length),
          isCancelled,
          onModel(model) {
            sendEvent(controller, { type: "model", model });
          },
          onReset() {
            modelDraftReply = "";
            if (!guardedDraft) {
              streamedReply = "";
              sendEvent(controller, { type: "reset" });
            }
          },
          onReply(reply) {
            if (!reply || reply.length <= modelDraftReply.length) return;
            const delta = reply.slice(modelDraftReply.length);
            modelDraftReply = reply;
            // Ordinary turns keep the fast optimistic stream. Guarded tension/
            // boundary turns stay quarantined until validation has accepted them.
            if (!guardedDraft && delta) {
              streamedReply = reply;
              sendEvent(controller, { type: "chunk", content: delta });
            }
          },
        });

        const firstDraftDurationMs = Date.now() - firstDraftStartedAt;
        console.log("[character-chat] first draft completed", { durationMs: firstDraftDurationMs, model: result.model });

        let validationIssues = validateNarrativeReply(result.reply, {
          characterName: character.name,
          userName: userIdentity.name,
          latestUserMessage,
          turnIntent,
          finishReason: result.finishReason,
          rejectedResponses,
          recentCharacterReplies,
          recentUserMessages,
          character,
        });
        validationIssues = [...new Set([...validationIssues, ...validateContinuityEnvelope(result, { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent, characterName: character.name, recentUserMessages, recentCharacterReplies })])];
        const originalResult = result;
        const originalIssues = validationIssues;
        const continuityIssuesBeforeRepair = originalIssues.filter((issue) => CONTINUITY_GUARD_ISSUES.has(issue));
        const blocking = repairTriggerIssues(validationIssues);

        // One bounded repair only for structural or severe user-facing naturalism issues.
        // Continuity metadata never triggers another Gemini call. Deterministic
        // continuity merging protects stored scene state without adding latency.
        if (blocking.length) {
          console.log("[character-chat] bounded repair started", { issues: blocking, firstDraftDurationMs });
          repairUsed = true;
          // Keep the optimistic draft visible while repair runs. Swap only once the
          // replacement is ready, so repair latency never becomes an empty wait state.
          let repaired: ModelResult | null = null;
          let repairFailure = "";
          try {
            repaired = await repairRoleplayOnceV3({
              apiKey,
              originalPrompt: prompt,
              rejectedReply: result.reply,
              issues: validationIssues,
              character,
              isCancelled,
            });
          } catch (repairError) {
            if (await isCancelled()) throw new DOMException("Generation cancelled", "AbortError");
            repairFailure = getErrorMessage(repairError);
            console.warn("[character-chat] bounded repair failed; evaluating original draft fallback", {
              issues: blocking,
              error: repairFailure,
            });
          }

          if (!repaired) {
            const originalFatal = blockingNarrativeIssues(originalIssues);
            const originalHard = hardRepairRequiredIssues(originalIssues);
            if (!originalFatal.length && !originalHard.length) {
              // Soft style repair may fall back to a readable original. Hard
              // interaction/canon violations never fall back to the rejected draft.
              result = originalResult;
              validationIssues = originalIssues;
              repairUsed = false;
              ({ result, issues: validationIssues } = sanitizeValidatedHardIntentResult(result, validationIssues, { characterName: character.name, userName: userIdentity.name, latestUserMessage, turnIntent, finishReason: result.finishReason, rejectedResponses, recentCharacterReplies, recentUserMessages, character, continuity: { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent, characterName: character.name, recentUserMessages, recentCharacterReplies } }));
              await streamFinalReply(result.reply, "soft-repair-fallback");
            } else {
              // A repair timeout must never erase prose the user is already reading.
              result = originalResult;
              validationIssues = originalIssues;
              ({ result, issues: validationIssues } = sanitizeValidatedHardIntentResult(result, validationIssues, { characterName: character.name, userName: userIdentity.name, latestUserMessage, turnIntent, finishReason: result.finishReason, rejectedResponses, recentCharacterReplies, recentUserMessages, character, continuity: { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent, characterName: character.name, recentUserMessages, recentCharacterReplies } }));
              await streamFinalReply(result.reply, "repair-timeout-fallback");
            }
          } else {
          const repairedIssues = validateNarrativeReply(repaired.reply, {
            characterName: character.name,
            userName: userIdentity.name,
            latestUserMessage,
            turnIntent,
            finishReason: repaired.finishReason,
            rejectedResponses,
            recentCharacterReplies,
            recentUserMessages,
            character,
          });
          repairedIssues.push(...validateContinuityEnvelope(repaired, { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent, characterName: character.name, recentUserMessages, recentCharacterReplies }));
          const repairedFatal = blockingNarrativeIssues(repairedIssues);
          const originalFatal = blockingNarrativeIssues(originalIssues);
          const originalHard = hardRepairRequiredIssues(originalIssues);
          let repairedHard = hardRepairRequiredIssues(repairedIssues);
          if (originalHard.length && repairedHard.length) {
            const sanitizedRepair = sanitizeValidatedHardIntentResult(repaired, repairedIssues, { characterName: character.name, userName: userIdentity.name, latestUserMessage, turnIntent, finishReason: repaired.finishReason, rejectedResponses, recentCharacterReplies, recentUserMessages, character, continuity: { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent, characterName: character.name, recentUserMessages, recentCharacterReplies } });
            repaired = sanitizedRepair.result;
            repairedIssues.splice(0, repairedIssues.length, ...sanitizedRepair.issues);
            repairedHard = hardRepairRequiredIssues(repairedIssues);
          }
          if (!repairedFatal.length && !repairedHard.length && (originalFatal.length || originalHard.length || repairTriggerIssues(repairedIssues).length <= repairTriggerIssues(originalIssues).length)) {
            result = repaired;
            validationIssues = repairedIssues;
          } else if (!originalFatal.length && !originalHard.length) {
            result = originalResult;
            validationIssues = originalIssues;
          } else {
            result = repaired;
            validationIssues = repairedIssues;
          }
          ({ result, issues: validationIssues } = sanitizeValidatedHardIntentResult(result, validationIssues, { characterName: character.name, userName: userIdentity.name, latestUserMessage, turnIntent, finishReason: result.finishReason, rejectedResponses, recentCharacterReplies, recentUserMessages, character, continuity: { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent, characterName: character.name, recentUserMessages, recentCharacterReplies } }));
          await streamFinalReply(result.reply, "repair-ready");
          }
        }

        if (guardedDraft && !blocking.length) {
          // Legacy diagnostic path only. Runtime foreground streaming is never quarantined.
          await streamFinalReply(result.reply, "legacy-guard-finalize");
        }

        let remainingHard = hardRepairRequiredIssues(validationIssues);
        if (remainingHard.length) {
          ({ result, issues: validationIssues } = sanitizeValidatedHardIntentResult(result, validationIssues, { characterName: character.name, userName: userIdentity.name, latestUserMessage, turnIntent, finishReason: result.finishReason, rejectedResponses, recentCharacterReplies, recentUserMessages, character, continuity: { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent, characterName: character.name, recentUserMessages, recentCharacterReplies } }));
          remainingHard = hardRepairRequiredIssues(validationIssues);
        }
        if (blockingNarrativeIssues(validationIssues).length || remainingHard.length) {
          // Once readable prose exists, validators fail soft instead of turning the
          // interaction into a Retry card. Keep the best sanitized live result.
          console.warn("[character-chat] protected reply remained imperfect; keeping readable live reply", {
            blocking: blockingNarrativeIssues(validationIssues),
            hard: remainingHard,
          });
        }
        if (await isCancelled()) return;
        if (!await isStoryRevisionCurrent(supabase, conversationId, userId, storyRevision)) return;

        const savedMessage = replacementMessage
          ? await replaceCharacterReply({ supabase, conversationId, userId, message: replacementMessage, reply: result.reply })
          : await saveCharacterReply({ supabase, conversationId, userId, reply: result.reply });

        const update = { updated_at: new Date().toISOString() } as Record<string, any>;
        update.character_development = applyCharacterDevelopment({
          previous: previousDevelopment,
          update: result.development_update,
          relationshipPremise: character.relationship || "",
          latestUserMessage,
          reply: result.reply,
          messageId: savedMessage.id,
          isRegeneration,
          regenerationInstruction,
          regenerationFeedback,
          rejectedResponses,
        });
        update.relationship_state = relationshipStateFromDevelopment(update.character_development, existingRelationshipState);
        const nextPhysicalState = applySceneContinuity({
          previousScene: existingSceneState,
          previousCast: existingCastState,
          sceneUpdate: result.scene_update,
          castUpdates: result.cast_updates,
          mainCharacterName: character.name,
        });
        update.scene_state = nextPhysicalState.scene;
        update.cast_state = nextPhysicalState.cast;
        update.intelligence_state = applyIntelligenceContinuity(existingIntelligenceState, result.continuity_update, result.mind_update, result.story_drive, result.post_turn_reflection, result.human_behavior_update, result.presence_update);
        const resolvedCommitments = compactTextList(result.continuity_update?.resolved_commitments, 8, 260);
        const newCommitments = compactTextList(result.continuity_update?.commitments, 8, 260);
        const presenceOpen = compactTextList(result.presence_update?.unfinished_business_add, 6, 320);
        const presenceResolved = compactTextList(result.presence_update?.unfinished_business_resolve, 6, 320);
        update.unresolved_threads = compactTextList([...(Array.isArray(existingUnresolvedThreads) ? existingUnresolvedThreads.map((item) => typeof item === "string" ? item : item?.title || item?.detail) : []), ...newCommitments, ...presenceOpen], 20, 320)
          .filter((item) => ![...resolvedCommitments, ...presenceResolved].some((done) => memorySimilarity(item, done) >= 0.68))
          .map((title, index) => ({ id: `thread-${index}`, title, status: "open" }));

        const note = cleanPromptValue(result.continuity_note, 600);
        const sceneChanged = Boolean(result.scene_update?.scene_changed);
        const separatorLabel = buildSceneSeparatorLabel(existingSceneState, result.scene_update);
        const rawTimelineEvent = result.continuity_update?.timeline_event || {};
        const relationshipMilestone = result.presence_update?.relationship_milestone && typeof result.presence_update.relationship_milestone === "object" ? result.presence_update.relationship_milestone : {};
        const timelineEvent = Boolean(rawTimelineEvent?.record) ? rawTimelineEvent : (relationshipMilestone?.record ? {
          record: true,
          label: cleanPromptValue(relationshipMilestone?.label, 120) || "Relationship shift",
          detail: cleanPromptValue(relationshipMilestone?.detail, 420),
          kind: "relationship",
          importance: Math.max(2, Math.min(5, Number(relationshipMilestone?.importance) || 3)),
        } : rawTimelineEvent);
        const shouldRecordTimeline = Boolean(timelineEvent?.record) || sceneChanged || Boolean(separatorLabel);
        const timeline = Array.isArray(existingTimeline) ? existingTimeline : [];
        if (shouldRecordTimeline) {
          update.story_timeline = [
            ...timeline.filter((item) => String(item?.message_id || "") !== String(savedMessage.id)),
            {
              message_id: savedMessage.id,
              label: cleanPromptValue(timelineEvent?.label, 120) || separatorLabel || "Story beat",
              detail: cleanPromptValue(timelineEvent?.detail, 420) || note,
              kind: ["relationship","conflict","promise","reveal","decision","scene","other"].includes(String(timelineEvent?.kind)) ? String(timelineEvent.kind) : (sceneChanged ? "scene" : "other"),
              importance: Math.max(1, Math.min(5, Number(timelineEvent?.importance) || (sceneChanged ? 3 : 2))),
              note, scene_changed: sceneChanged, separator_label: separatorLabel,
              location: nextPhysicalState.scene.location || "", time_label: nextPhysicalState.scene.time_label || "",
              present: nextPhysicalState.scene.present || [], created_at: savedMessage.created_at || new Date().toISOString(),
            },
          ].slice(-80);
        }
        const chapterState = evolveStoryChapters({
          chapters: existingStoryChapters,
          activeChapter: existingActiveChapter,
          latestUserMessage,
          sceneUpdate: result.scene_update,
          timelineEvent,
          savedMessage,
          recap: existingStoryRecap || "",
          storyDrive: result.story_drive || {},
        });
        update.story_chapters = chapterState.chapters;
        update.active_chapter = chapterState.activeChapter;
        if (chapterState.chapterNumber) {
          await supabase.from("messages").update({ chapter_number: chapterState.chapterNumber }).eq("id", savedMessage.id).eq("user_id", userId);
          if (update.story_timeline?.length) update.story_timeline[update.story_timeline.length - 1].chapter_number = chapterState.chapterNumber;
        }
        update.story_recap = buildStoryRecap(update.story_timeline || timeline, existingStoryRecap || "");
        await supabase.from("conversations").update(update).eq("id", conversationId).eq("user_id", userId);
        await persistStoryCastMembers({
          supabase, userId, conversationId, castUpdates: result.cast_updates,
          previousMembers: persistentCast, scene: nextPhysicalState.scene,
        });
        await persistStoryConnections({
          supabase, userId, conversationId, connectionUpdates: result.connection_updates,
        });
        await persistStoryDynamics({
          supabase, userId, conversationId, characterName: character.name,
          continuityUpdate: result.continuity_update, presenceUpdate: result.presence_update, timelineEvent,
          activeArcs, activePlans,
          activeConflicts, chemistryProfiles,
          latestUserMessage, reply: result.reply, sourceMessageId: savedMessage.id,
          scene: nextPhysicalState.scene,
        });
        if (!replacementMessage && Array.isArray(result.memory_updates) && result.memory_updates.length) {
          await mergeAutomaticMemories({
            supabase,
            userId,
            conversationId,
            characterId: character.id,
            memoryUpdates: result.memory_updates,
            sourceMessageId: latestUserMessageId,
            sourceExcerpt: cleanPromptValue(latestUserMessage, 220),
          });
        }

        sendEvent(controller, { type: "done", message: savedMessage, learnedMemoryCount: (result.memory_updates || []).filter((item) => Number(item?.importance || 0) >= 3 || ["boundary","promise","conflict"].includes(String(item?.category))).length, model: result.model, repairUsed, liveStreaming: true, sceneState: update.scene_state, castState: update.cast_state, characterDevelopment: update.character_development, relationshipState: update.relationship_state, continuityGuard: { status: repairUsed && continuityIssuesBeforeRepair.length ? "repaired" : "stable", protected: continuityIssuesBeforeRepair }, intelligenceState: update.intelligence_state, storyTimeline: update.story_timeline || existingTimeline, storyRecap: update.story_recap || existingStoryRecap || "", storyChapters: update.story_chapters || existingStoryChapters || [], activeChapter: update.active_chapter || existingActiveChapter || {}, unfinishedThreads: update.unresolved_threads || existingUnresolvedThreads });
      } catch (error) {
        if (getErrorName(error) !== "AbortError") {
          console.error("[character-chat] live stream failed", { message: getErrorMessage(error) });
          sendEvent(controller, { type: "error", error: getErrorMessage(error) });
        }
      } finally {
        try { controller.close(); } catch { /* client may have disconnected; persistence already continues */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function persistStoryDynamics({ supabase, userId, conversationId, characterName, continuityUpdate = {}, presenceUpdate = {}, timelineEvent = {}, activeArcs = [], activePlans = [], activeConflicts = [], chemistryProfiles = [], latestUserMessage = "", reply = "", sourceMessageId = null, scene = {} }) {
  const now = new Date().toISOString();
  const knowledgeRows = (Array.isArray(continuityUpdate?.knowledge_updates) ? continuityUpdate.knowledge_updates : []).slice(0, 6).map((item) => ({
    user_id: userId, conversation_id: conversationId,
    character_name: cleanPromptValue(item?.who, 100) || characterName,
    subject: cleanPromptValue(item?.subject, 140) || cleanPromptValue(item?.knows, 140), knowledge: cleanPromptValue(item?.knows, 600),
    status: String(item?.status) === "forgotten" ? "unknown" : (["known","suspected","rumor","unknown"].includes(String(item?.status)) ? item.status : "known"),
    source: cleanPromptValue(item?.source, 240), secret: Boolean(item?.secret), updated_at: now,
  })).filter((item) => item.subject);
  if (knowledgeRows.length) {
    const { error } = await supabase.from("story_knowledge_entries").upsert(knowledgeRows, { onConflict: "conversation_id,character_name,subject" });
    if (error && error.code !== "42P01") console.warn("[character-chat] knowledge ledger persistence failed", { message: error.message });
  }
  const kind = String(timelineEvent?.kind || "");
  const title = cleanPromptValue(timelineEvent?.label, 140);
  const detail = cleanPromptValue(timelineEvent?.detail, 500);
  if (title && detail && ["conflict","decision","promise","reveal"].includes(kind) && Number(timelineEvent?.importance || 0) >= 3) {
    const row = { user_id:userId, conversation_id:conversationId, title, cause:detail, effect:`This ${kind} remains active until the story addresses its practical or emotional fallout.`, status:"active", weight:Math.max(1,Math.min(5,Number(timelineEvent?.importance)||3)), participants:[characterName], updated_at:now };
    const { error } = await supabase.from("story_consequences").upsert(row, { onConflict:"conversation_id,title,cause" });
    if (error && error.code !== "42P01") console.warn("[character-chat] consequence persistence failed", { message:error.message });
  }
  const worldConsequence = continuityUpdate?.world_consequence && typeof continuityUpdate.world_consequence === "object" ? continuityUpdate.world_consequence : {};
  if (worldConsequence?.record) {
    const wcTitle = cleanPromptValue(worldConsequence?.title, 140), wcCause = cleanPromptValue(worldConsequence?.cause, 420), wcEffect = cleanPromptValue(worldConsequence?.effect, 520);
    if (wcTitle && wcCause && wcEffect) {
      const row = { user_id:userId, conversation_id:conversationId, title:wcTitle, cause:wcCause, effect:wcEffect, status:"active", weight:Math.max(1,Math.min(5,Number(worldConsequence?.weight)||2)), participants:compactSceneNames(worldConsequence?.participants || [characterName], 6), updated_at:now };
      const { error } = await supabase.from("story_consequences").upsert(row, { onConflict:"conversation_id,title,cause" });
      if (error && error.code !== "42P01") console.warn("[character-chat] explicit world consequence persistence failed", { message:error.message });
    }
  }
  const active = (Array.isArray(activeArcs) ? activeArcs : []).filter((arc) => arc?.status === "active" && arc?.id).slice(0, 1);
  const eventImportance = Math.max(0, Math.min(5, Number(timelineEvent?.importance) || 0));
  const arcWorthyEvent = Boolean(timelineEvent?.record) && eventImportance >= 2 && ["relationship","conflict","promise","reveal","decision"].includes(kind);
  if (active.length && arcWorthyEvent) {
    const arc = active[0];
    const increment = eventImportance >= 5 ? 8 : eventImportance >= 4 ? 6 : eventImportance >= 3 ? 4 : 2;
    const progress = Math.min(100, Number(arc.progress || 0) + increment);
    const { error } = await supabase.from("story_arcs").update({ progress, status:progress>=100?"resolved":"active", updated_at:now }).eq("id",arc.id).eq("user_id",userId);
    if (error && error.code !== "42P01") console.warn("[character-chat] arc progression failed", { message:error.message });
  }
  const commitments = compactTextList(continuityUpdate?.commitments, 6, 260);
  for (const commitment of commitments) {
    const row = { user_id:userId, conversation_id:conversationId, title:commitment.slice(0,140), initiator:characterName, details:commitment, story_time:"unscheduled", participants:[characterName], status:"proposed", complication:"", updated_at:now };
    const { error } = await supabase.from("story_plans").upsert(row,{onConflict:"conversation_id,title",ignoreDuplicates:true});
    if (error && error.code !== "42P01") console.warn("[character-chat] plan persistence failed",{message:error.message});
  }
  const resolved = compactTextList(continuityUpdate?.resolved_commitments,6,260);
  const explicitPlanAcceptance = /\b(?:yes[,! ]+(?:i(?:'ll| will)|let'?s)|i(?:'ll| will) (?:go|come|meet|join)|sounds good|deal|okay[, ]+(?:let'?s|i(?:'ll| will))|s[ií][, ]+(?:voy|vamos|acepto)|de acuerdo)\b/i.test(latestUserMessage);
  const explicitPlanRefusal = /\b(?:no[,! ]+(?:i won'?t|thanks)|i can'?t (?:go|come|make it)|not going|cancel (?:it|that)|no voy|no puedo ir|canc[eé]lalo)\b/i.test(latestUserMessage);
  const proposedPlans=(Array.isArray(activePlans)?activePlans:[]).filter((item)=>item?.id&&item.status==="proposed");
  if(proposedPlans.length===1&&(explicitPlanAcceptance||explicitPlanRefusal))await supabase.from("story_plans").update({status:explicitPlanAcceptance?"accepted":"cancelled",updated_at:now}).eq("id",proposedPlans[0].id).eq("user_id",userId);
  for (const plan of (Array.isArray(activePlans)?activePlans:[])) {
    if (!plan?.id || !resolved.some((done)=>memorySimilarity(done,plan.title||plan.details||"")>=0.58)) continue;
    await supabase.from("story_plans").update({status:"completed",updated_at:now}).eq("id",plan.id).eq("user_id",userId);
  }
  if (kind === "conflict" && title && detail) {
    const conflict = {user_id:userId,conversation_id:conversationId,title,cause:detail,positions:"Both sides retain their own goals and interpretation until clarified on-page.",intensity:Math.max(1,Math.min(5,Number(timelineEvent?.importance)||2)),status:"active",resolution_need:"A concrete repair, changed action or mutually understood decision.",repair_attempts:0,participants:[characterName],updated_at:now};
    const {error}=await supabase.from("story_conflicts").upsert(conflict,{onConflict:"conversation_id,title"});
    if(error&&error.code!=="42P01")console.warn("[character-chat] conflict persistence failed",{message:error.message});
  } else if (["relationship","decision"].includes(kind)) {
    const apologyLanguage = /\b(?:sorry|apolog|make it right|forgive|perd[oó]n|lo siento|arreglar)\b/i.test(reply);
    const concreteRepair = /\b(?:i(?:'ll| will) (?:change|fix|replace|return|tell|stop|show|come|call|pay|handle)|let me (?:fix|replace|return|show|handle)|i was wrong|that was on me|won'?t happen again|voy a (?:cambiar|arreglar|devolver)|fue culpa m[ií]a)\b/i.test(reply);
    const repairEvent = Boolean(timelineEvent?.record) && eventImportance >= 3 && /\b(?:repair|amend|apolog|accountab|changed action|reconcile|arregl|repar|disculp)\w*/i.test(`${title} ${detail}`);
    if ((apologyLanguage && concreteRepair) || repairEvent) {
      for (const conflict of (Array.isArray(activeConflicts)?activeConflicts:[]).filter((item)=>item?.id&&item.status!=="resolved").slice(0,1)) {
        await supabase.from("story_conflicts").update({status:"repairing",repair_attempts:Number(conflict.repair_attempts||0)+1,updated_at:now}).eq("id",conflict.id).eq("user_id",userId);
      }
    }
  }
  const combined = `${latestUserMessage}\n${reply}\n${title}\n${detail}`;
  const milestonePatterns: Array<[string, RegExp | boolean, string]> = [
    ["first_invitation",commitments.some((item)=>/\b(?:invite|invited|come with|go with|meet me|invit|ven conmigo|vamos a)\b/i.test(item)),"First invitation"],
    ["first_kiss",/\b(?:first kiss|kissed for the first time|\bkissed\b|primer beso|bes[oó] por primera vez|\bbesaron\b)\b/i,"First kiss"],
    ["first_hand_hold",/\b(?:held hands|took (?:his|her|their) hand|first time holding hands|tomaron de la mano|tom[oó] su mano)\b/i,"First time holding hands"],
    ["first_real_fight",kind==="conflict"&&Number(timelineEvent?.importance||0)>=3,"First real fight"],
    ["first_reconciliation",/\b(?:made up|reconciled|se reconciliaron|hicieron las paces)\b/i,"First reconciliation"],
    ["first_public_defense",/\b(?:defended .{0,40} in front of|stood up for .{0,40} publicly|defendi[oó] .{0,40} frente a)\b/i,"First public defense"],
  ];
  for (const [milestoneType,pattern,milestoneTitle] of milestonePatterns) {
    const happened = pattern instanceof RegExp ? pattern.test(combined) : Boolean(pattern); if(!happened)continue;
    const row={user_id:userId,conversation_id:conversationId,milestone_type:milestoneType,title:milestoneTitle,details:detail||cleanPromptValue(reply,320),participants:[characterName],story_time:cleanPromptValue(scene?.time_label,120),source_message_id:sourceMessageId,updated_at:now};
    const {error}=await supabase.from("story_milestones").upsert(row,{onConflict:"conversation_id,milestone_type",ignoreDuplicates:true});
    if(error&&error.code!=="42P01")console.warn("[character-chat] milestone persistence failed",{message:error.message});
  }
  const socialConsequence = presenceUpdate?.social_consequence && typeof presenceUpdate.social_consequence === "object" ? presenceUpdate.social_consequence : {};
  if (socialConsequence?.record) {
    const scTitle = cleanPromptValue(socialConsequence?.title, 140);
    const scCause = cleanPromptValue(socialConsequence?.cause, 420);
    const scEffect = cleanPromptValue(socialConsequence?.effect, 520);
    const observer = cleanPromptValue(socialConsequence?.observer_or_channel, 180);
    if (scTitle && scCause && scEffect && observer) {
      const row = { user_id:userId, conversation_id:conversationId, title:scTitle, cause:`${scCause} [via ${observer}]`, effect:scEffect, status:"active", weight:Math.max(1,Math.min(5,Number(socialConsequence?.weight)||2)), participants:compactSceneNames(socialConsequence?.participants || [characterName],6), updated_at:now };
      const { error } = await supabase.from("story_consequences").upsert(row,{onConflict:"conversation_id,title,cause"});
      if(error&&error.code!=="42P01")console.warn("[character-chat] presence social consequence persistence failed",{message:error.message});
    }
  }
  const priorChemistry=(Array.isArray(chemistryProfiles)?chemistryProfiles:[]).find((item)=>normalizeText(item?.character_name)===normalizeText(characterName));
  const emotionalBeat=["relationship","conflict","reveal","promise"].includes(kind);
  const chemistryFingerprint = presenceUpdate?.chemistry_fingerprint && typeof presenceUpdate.chemistry_fingerprint === "object" ? presenceUpdate.chemistry_fingerprint : {};
  const chemistryChanged = Object.values(chemistryFingerprint).some((value)=>cleanPromptValue(value,220));
  if(emotionalBeat || chemistryChanged){
    const delta=kind==="conflict"?-2:3;
    const signatureParts=[chemistryFingerprint?.humor_rhythm,chemistryFingerprint?.silence_style,chemistryFingerprint?.attention_style].map((v)=>cleanPromptValue(v,160)).filter(Boolean);
    const row={user_id:userId,conversation_id:conversationId,character_name:characterName,signature:signatureParts.join(" · ")||priorChemistry?.signature||"",banter_style:cleanPromptValue(chemistryFingerprint?.humor_rhythm,260)||priorChemistry?.banter_style||"",affection_style:cleanPromptValue(chemistryFingerprint?.attention_style,260)||priorChemistry?.affection_style||"",friction_triggers:cleanPromptValue(chemistryFingerprint?.friction_style,280)||priorChemistry?.friction_triggers||"",reconciliation_style:cleanPromptValue(chemistryFingerprint?.repair_style,280)||priorChemistry?.reconciliation_style||"",inside_jokes:priorChemistry?.inside_jokes||[],meaningful_places:priorChemistry?.meaningful_places||[],chemistry_score:Math.max(0,Math.min(100,Number(priorChemistry?.chemistry_score||25)+(kind==="relationship"?3:(emotionalBeat?1:0)))),trust_score:Math.max(0,Math.min(100,Number(priorChemistry?.trust_score||20)+(emotionalBeat?delta:0))),tension_score:Math.max(0,Math.min(100,Number(priorChemistry?.tension_score||10)+(kind==="conflict"?8:(emotionalBeat?-2:0)))),updated_at:now};
    const{error}=await supabase.from("story_chemistry_profiles").upsert(row,{onConflict:"conversation_id,character_name"});if(error&&error.code!=="42P01")console.warn("[character-chat] chemistry persistence failed",{message:error.message});
  }
}

async function persistStoryConnections({ supabase, userId, conversationId, connectionUpdates = [] }) {
  if (!Array.isArray(connectionUpdates) || !connectionUpdates.length) return;
  const rows = connectionUpdates.slice(0, 6).map((item) => ({
    user_id: userId, conversation_id: conversationId,
    from_name: cleanPromptValue(item?.from_name, 100),
    to_name: cleanPromptValue(item?.to_name, 100),
    relationship: cleanPromptValue(item?.relationship, 420),
    visibility: ["known","private","secret"].includes(String(item?.visibility)) ? String(item.visibility) : "known",
    updated_at: new Date().toISOString(),
  })).filter((row) => row.from_name && row.to_name && row.relationship && normalizeText(row.from_name) !== normalizeText(row.to_name));
  if (!rows.length) return;
  const { error } = await supabase.from("story_cast_connections").upsert(rows, { onConflict: "conversation_id,from_name,to_name" });
  if (error && error.code !== "42P01") console.warn("[character-chat] relationship graph persistence failed", { message: error.message });
}

async function persistStoryCastMembers({ supabase, userId, conversationId, castUpdates = [], previousMembers = [], scene = {} }) {
  if (!Array.isArray(castUpdates) || !castUpdates.length) return;
  const previousByName = new Map((Array.isArray(previousMembers) ? previousMembers : []).map((item) => [normalizeText(item?.name), item]));
  const present = new Set((Array.isArray(scene?.present) ? scene.present : []).map(normalizeText));
  const rows = castUpdates.map((item) => {
    const name = cleanPromptValue(item?.name, 100);
    const prior = previousByName.get(normalizeText(name)) || {};
    return {
      user_id: userId,
      conversation_id: conversationId,
      name,
      role: cleanPromptValue(item?.role, 180) || prior.role || "",
      personality_note: cleanPromptValue(item?.personality_note, 320) || prior.personality_note || "",
      relationship: cleanPromptValue(item?.relationship, 320) || prior.relationship || "",
      current_dynamic: cleanPromptValue([item?.current_dynamic, item?.offscreen_motion ? `Off-screen: ${item.offscreen_motion}` : ""].filter(Boolean).join(" | "), 420) || prior.current_dynamic || "",
      goals: cleanPromptValue([item?.goals, item?.next_intention ? `Next: ${item.next_intention}` : ""].filter(Boolean).join(" | "), 320) || prior.goals || "",
      knowledge: cleanPromptValue(item?.knows, 520) || prior.knowledge || "",
      last_interaction: cleanPromptValue(item?.last_interaction, 520) || prior.last_interaction || "",
      presence: present.has(normalizeText(name)) ? "present" : "off_scene",
      status: "active",
      turn_count: Math.max(1, Number(prior.turn_count || 0) + 1),
      updated_at: new Date().toISOString(),
    };
  }).filter((row) => row.name);
  if (!rows.length) return;
  const { error } = await supabase.from("story_cast_members").upsert(rows, { onConflict: "conversation_id,name" });
  if (error && error.code !== "42P01") console.warn("[character-chat] cast persistence failed", { message: error.message });
}

async function streamGeminiEnvelopeWithFailover({
  apiKey,
  systemInstruction,
  prompt,
  maxOutputTokens,
  temperature,
  isCancelled,
  onModel,
  onReply,
  onReset,
}): Promise<ModelResult> {
  const models = [...new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL].filter(Boolean))];
  if (!models.length) throw new Error("No Gemini model is configured.");

  // v2.11.19 NO-RETRY HEDGED START:
  // Start the quality model first. If it stays silent, quietly launch a faster
  // fallback in parallel. The first model that produces actual reply prose wins;
  // slower requests are cancelled. A slow first token is never itself a user-facing
  // failure and never clears an already visible bubble.
  const hedgeDelays = [0, 1200, 3200];
  const overallDeadlineMs = 22000;
  const deadlineAt = Date.now() + overallDeadlineMs;
  const controllers = new Map<string, AbortController>();
  const launched = new Set<string>();
  const finished = new Set<string>();
  const errors: string[] = [];
  let quotaReached = false;
  let winnerModel = "";
  let settled = false;
  let launchCursor = 0;
  let resolveResult: (result: ModelResult) => void;
  let rejectResult: (error: Error) => void;

  const resultPromise = new Promise<ModelResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const cancelLosers = (winner: string) => {
    for (const [model, controller] of controllers.entries()) {
      if (model !== winner && !controller.signal.aborted) controller.abort();
    }
  };

  const chooseWinner = (model: string) => {
    if (winnerModel || settled) return winnerModel === model;
    winnerModel = model;
    onModel?.(model);
    cancelLosers(model);
    return true;
  };

  const maybeFinishWithoutWinner = () => {
    if (settled || winnerModel) return;
    const allConfiguredLaunched = launched.size >= models.length;
    const allLaunchedFinished = [...launched].every((model) => finished.has(model));
    if (allConfiguredLaunched && allLaunchedFinished) {
      settled = true;
      if (quotaReached) {
        rejectResult(new Error("Gemini is rate-limited right now. This can be a per-minute, token, or daily project limit. Wait a little and try again."));
      } else {
        rejectResult(new Error(errors.at(-1) || "The AI service could not begin a reply."));
      }
    }
  };

  const launchNextUnstarted = () => {
    while (launchCursor < models.length && launched.has(models[launchCursor])) launchCursor += 1;
    if (launchCursor >= models.length) return;
    const model = models[launchCursor++];
    void launchAttempt(model);
  };

  const launchAttempt = async (model: string) => {
    if (settled || winnerModel || launched.has(model)) return;
    launched.add(model);

    const controller = new AbortController();
    controllers.set(model, controller);
    let watching = true;
    let latestReply = "";
    let structured = "";
    let finishReason = "";

    const cancellationWatcher = (async () => {
      while (watching && !controller.signal.aborted && !settled) {
        await delay(250);
        if (watching && await isCancelled()) controller.abort();
      }
    })();

    try {
      const traceId = createGeminiTraceId();
      const makeStreamRequest = (mode: "json" | "bare" = "json") => {
        const requestBody = mode === "bare"
          ? {
              // True compatibility fallback: no systemInstruction,
              // generationConfig, thinking config, MIME type, or schema.
              contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
            }
          : {
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens,
                responseMimeType: "application/json",
              },
            };
        return fetch(modelStreamEndpoint(model), {
          method: "POST",
          headers: geminiHeaders(apiKey),
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        });
      };

      const runStreamAttempt = async (mode: "json" | "bare") => {
        const response = await makeStreamRequest(mode);
        if (response.ok) return { response, message: "" };
        const errorText = await response.text().catch(() => "");
        const diagnostic = extractGeminiHttpDiagnostic(errorText);
        const message = diagnostic.message || `Gemini returned ${response.status}`;
        logGeminiAttemptFailure({ traceId, model, mode, status: response.status, error: diagnostic });
        return { response, message };
      };

      let { response, message } = await runStreamAttempt("json");
      if (!response.ok && response.status === 400) {
        ({ response, message } = await runStreamAttempt("bare"));
      }
      if (!response.ok) {
        quotaReached ||= response.status === 429;
        throw new Error(message || `Gemini returned ${response.status}`);
      }

      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => "");
        const message = extractGeminiHttpError(errorText) || `Gemini returned ${response.status}`;
        quotaReached ||= response.status === 429;
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      const consumeEvent = (rawEvent) => {
        const lines = rawEvent.split("\n").filter((line) => line.startsWith("data:"));
        for (const line of lines) {
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let data;
          try { data = JSON.parse(payload); } catch { continue; }
          const piece = extractCandidateTextRaw(data);
          if (piece) structured += piece;
          finishReason = String(data?.candidates?.[0]?.finishReason || finishReason || "");
          const partialReply = extractPartialJsonStringField(structured, "reply");
          if (partialReply.length <= latestReply.length) continue;
          latestReply = partialReply;
          if (chooseWinner(model)) onReply?.(latestReply);
        }
      };

      while (true) {
        if (await isCancelled()) throw new DOMException("Generation cancelled", "AbortError");
        const { value, done } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop() || "";
        for (const rawEvent of events) consumeEvent(rawEvent);
      }
      sseBuffer += decoder.decode();
      if (sseBuffer.trim()) consumeEvent(sseBuffer);

      const envelope = parseModelEnvelope(structured);
      if (!envelope.reply && latestReply) envelope.reply = latestReply;
      if (!envelope.reply) throw new Error("Gemini returned an empty reply");

      if (!winnerModel) chooseWinner(model);
      if (winnerModel === model && !settled) {
        settled = true;
        resolveResult({ ...envelope, finishReason, model });
      }
    } catch (error) {
      if (await isCancelled()) {
        if (!settled) {
          settled = true;
          rejectResult(new DOMException("Generation cancelled", "AbortError") as unknown as Error);
        }
        return;
      }

      const abortedBecauseAnotherModelWon = getErrorName(error) === "AbortError" && winnerModel && winnerModel !== model;
      if (abortedBecauseAnotherModelWon) return;

      // Once prose is visible, never erase it because metadata/completion was slow.
      if (winnerModel === model && latestReply.trim() && !settled) {
        console.warn("[character-chat] winning stream ended after visible reply; salvaging live prose", {
          model,
          reason: getErrorName(error) === "AbortError" ? "timeout" : getErrorMessage(error),
          chars: latestReply.length,
        });
        const envelope = parseModelEnvelope(JSON.stringify({ reply: latestReply.trim() }));
        settled = true;
        resolveResult({ ...envelope, finishReason: finishReason || "LIVE_PARTIAL", model });
        return;
      }

      errors.push(getErrorMessage(error));
      // A model that fails before speaking should silently accelerate the next hedge.
      if (!winnerModel) launchNextUnstarted();
    } finally {
      watching = false;
      finished.add(model);
      void cancellationWatcher;
      maybeFinishWithoutWinner();
    }
  };

  // Primary starts immediately. Fallbacks are hedged only when no visible prose
  // has arrived, avoiding duplicate model usage on normal fast turns.
  launchNextUnstarted();
  const hedgeTimers = hedgeDelays.slice(1, models.length).map((delayMs) =>
    setTimeout(() => {
      if (!settled && !winnerModel) launchNextUnstarted();
    }, delayMs)
  );

  const deadlineTimer = setTimeout(() => {
    if (settled) return;
    // No special "start quickly enough" failure. Cancel outstanding work and
    // report only a genuine service timeout after every automatic hedge was tried.
    for (const controller of controllers.values()) {
      if (!controller.signal.aborted) controller.abort();
    }
    if (!winnerModel) {
      settled = true;
      rejectResult(new Error(errors.at(-1) || "The AI service is temporarily unavailable after automatic retries."));
    }
  }, Math.max(1000, deadlineAt - Date.now()));

  try {
    return await resultPromise;
  } finally {
    clearTimeout(deadlineTimer);
    hedgeTimers.forEach((timer) => clearTimeout(timer));
    for (const controller of controllers.values()) {
      if (!controller.signal.aborted) controller.abort();
    }
    // This callback remains for compatibility with older callers, but a hedge
    // never resets visible prose because only the winning model is ever streamed.
    void onReset;
  }
}
function isGeminiInvalidArgument(value = "") {
  const text = String(value || "").toLowerCase();
  return text.includes("invalid_argument") || text.includes("invalid argument");
}

function createGeminiTraceId() {
  try { return crypto.randomUUID().slice(0, 8); } catch { return String(Date.now()).slice(-8); }
}

function sanitizeGeminiDiagnostic(value = "") {
  return String(value || "")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-api-key]")
    .replace(/[0-9A-Za-z_-]{48,}/g, "[redacted-token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 520);
}

function extractGeminiHttpDiagnostic(text = "") {
  try {
    const parsed = JSON.parse(String(text || ""));
    return {
      code: String(parsed?.error?.code || ""),
      status: String(parsed?.error?.status || ""),
      message: sanitizeGeminiDiagnostic(parsed?.error?.message || ""),
    };
  } catch {
    return { code: "", status: "", message: sanitizeGeminiDiagnostic(text) };
  }
}

function logGeminiAttemptFailure({ traceId, model, mode, status, error }) {
  const diagnostic = error && typeof error === "object"
    ? {
        code: String(error?.code || ""),
        status: String(error?.status || ""),
        message: sanitizeGeminiDiagnostic(error?.message || ""),
      }
    : { code: "", status: "", message: sanitizeGeminiDiagnostic(error) };
  console.warn("[character-chat] Gemini attempt failed", {
    traceId,
    model,
    mode,
    httpStatus: Number(status || 0),
    upstreamCode: diagnostic.code,
    upstreamStatus: diagnostic.status,
    message: diagnostic.message,
  });
}

function roleplayResponseSchema() {
  return {
    type: "object",
    required: ["reply", "story_drive", "scene_update", "continuity_update", "development_update", "mind_update", "human_behavior_update", "post_turn_reflection", "quality_check"],
    propertyOrdering: ["reply", "story_drive", "scene_update", "continuity_update", "development_update", "mind_update", "human_behavior_update", "connection_updates", "cast_updates", "memory_updates", "post_turn_reflection", "quality_check"],
    properties: {
      reply: { type: "string" },
      story_drive: { type: "object", required: ["beat_mode","independent_want","chosen_tactic","chosen_action","cost_or_risk","visible_change","unresolved_hook","repetition_check","pacing_reason","intensity_target","season_signal","season_reason","scene_momentum","compression_reason"], properties: { beat_mode:{type:"string",enum:["mundane","connective","tension","conflict","repair","plot","recovery"]}, independent_want:{type:"string"}, chosen_tactic:{type:"string"}, chosen_action:{type:"string"}, cost_or_risk:{type:"string"}, visible_change:{type:"string"}, unresolved_hook:{type:"string"}, repetition_check:{type:"string"}, pacing_reason:{type:"string"}, intensity_target:{type:"integer"}, season_signal:{type:"boolean"}, season_reason:{type:"string"}, scene_momentum:{type:"string",enum:["hold","turn","close"]}, compression_reason:{type:"string"} } },
      scene_update: {
        type: "object",
        required: ["scene_changed", "separator_label", "location", "time_label", "present", "exited", "heard_user_turn", "activity", "communication_medium", "spatial_notes", "object_states"],
        properties: {
          scene_changed: { type: "boolean" }, separator_label: { type: "string" }, location: { type: "string" }, time_label: { type: "string" },
          present: { type: "array", maxItems: 8, items: { type: "string" } },
          exited: { type: "array", maxItems: 6, items: { type: "string" } },
          heard_user_turn: { type: "array", maxItems: 8, items: { type: "string" } },
          activity: { type: "string" }, communication_medium: { type: "string" },
          spatial_notes: { type: "array", maxItems: 6, items: { type: "string" } },
          object_states: { type: "array", maxItems: 6, items: { type: "object", required:["object","holder","location","state"], properties:{ object:{type:"string"}, holder:{type:"string"}, location:{type:"string"}, state:{type:"string"} } } },
        },
      },
      continuity_update: {
        type: "object",
        required: ["objects_present", "knowledge_updates", "commitments", "resolved_commitments", "stakes", "timeline_event"],
        properties: {
          objects_present: { type: "array", maxItems: 8, items: { type: "string" } },
          knowledge_updates: { type: "array", maxItems: 5, items: { type: "object", required: ["who", "subject", "knows", "source", "status", "secret"], properties: { who:{type:"string"}, subject:{type:"string"}, knows:{type:"string"}, source:{type:"string"}, status:{type:"string", enum:["known","suspected","rumor","forgotten"]}, secret:{type:"boolean"} } } },
          commitments: { type: "array", maxItems: 5, items: { type: "string" } },
          resolved_commitments: { type: "array", maxItems: 5, items: { type: "string" } },
          stakes: { type: "string" },
          timeline_event: { type: "object", required: ["record", "label", "detail", "kind", "importance"], properties: { record:{type:"boolean"}, label:{type:"string"}, detail:{type:"string"}, kind:{type:"string", enum:["relationship","conflict","promise","reveal","decision","scene","other"]}, importance:{type:"integer"} } },
          temporal_anchor: { type:"object", required:["story_now","elapsed_since_previous","certainty"], properties:{ story_now:{type:"string"}, elapsed_since_previous:{type:"string"}, certainty:{type:"string",enum:["exact","approximate","unknown"]} } },
          world_consequence: { type:"object", required:["record","title","cause","effect","weight","participants"], properties:{ record:{type:"boolean"}, title:{type:"string"}, cause:{type:"string"}, effect:{type:"string"}, weight:{type:"integer"}, participants:{type:"array",maxItems:6,items:{type:"string"}} } },
          offscreen_contact: { type:"object", required:["record","from","to","medium","content_hint","reason"], properties:{ record:{type:"boolean"}, from:{type:"string"}, to:{type:"string"}, medium:{type:"string"}, content_hint:{type:"string"}, reason:{type:"string"} } },
        },
      },
      development_update: {
        type: "object",
        required: ["significance", "evidence", "relationship_phase", "relationship_dynamic", "emotional_residue", "active_contradiction", "behavioral_effect", "turning_point", "flaw_pressure", "independent_priority", "repair_progress", "current_mood", "emotional_posture", "guardedness", "trust_direction", "vulnerability_window", "setback_pressure", "retained_growth", "relationship_signature", "private_pattern", "sore_spot", "shared_ritual", "memory_influence", "voice_shift", "conflict_aftertaste", "repair_debt"],
        properties: { significance:{type:"string"}, evidence:{type:"string"}, relationship_phase:{type:"string"}, relationship_dynamic:{type:"string"}, emotional_residue:{type:"string"}, active_contradiction:{type:"string"}, behavioral_effect:{type:"string"}, turning_point:{type:"string"}, flaw_pressure:{type:"string"}, independent_priority:{type:"string"}, repair_progress:{type:"string"}, current_mood:{type:"string"}, emotional_posture:{type:"string"}, guardedness:{type:"string"}, trust_direction:{type:"string"}, vulnerability_window:{type:"string"}, setback_pressure:{type:"string"}, retained_growth:{type:"string"}, relationship_signature:{type:"string"}, private_pattern:{type:"string"}, sore_spot:{type:"string"}, shared_ritual:{type:"string"}, memory_influence:{type:"string"}, voice_shift:{type:"string"}, conflict_aftertaste:{type:"string"}, repair_debt:{type:"string"} },
      },
      mind_update: { type:"object", required:["know","believe","misunderstand","want","avoid","wont_admit","outside_priority","short_goal","mid_goal","long_goal","attachment_pattern","microvoice","energy","confidence","emotion_trigger","emotion_interpretation","current_emotion","behavioral_pressure","anticipated_next","public_private_mode","behavioral_pattern","conflict_pattern","contradiction_in_play","private_intention","expected_outcome","feared_outcome"], properties:{ know:{type:"string"}, believe:{type:"string"}, misunderstand:{type:"string"}, want:{type:"string"}, avoid:{type:"string"}, wont_admit:{type:"string"}, outside_priority:{type:"string"}, short_goal:{type:"string"}, mid_goal:{type:"string"}, long_goal:{type:"string"}, attachment_pattern:{type:"string",enum:["approach","withdraw","mixed","steady","unknown"]}, microvoice:{type:"string"}, energy:{type:"string"}, confidence:{type:"string"}, emotion_trigger:{type:"string"}, emotion_interpretation:{type:"string"}, current_emotion:{type:"string"}, behavioral_pressure:{type:"string"}, anticipated_next:{type:"string"}, public_private_mode:{type:"string",enum:["public","private","mixed","digital","unknown"]}, behavioral_pattern:{type:"string"}, conflict_pattern:{type:"string"}, contradiction_in_play:{type:"string"}, private_intention:{type:"string"}, expected_outcome:{type:"string"}, feared_outcome:{type:"string"} } },
      human_behavior_update: { type:"object", required:["rhythm_mode","rhythm_reason","nonverbal_signal","nonverbal_meaning","humor_profile","humor_boundary","argument_lesson","romantic_expression","romantic_avoidance","physical_boundary_state","decision_basis","persistent_location","possession_updates","social_reputation_update","information_flow","relationship_self_view","relationship_user_view","autonomous_plan","between_scene_motion","memory_compression_anchor","initiative_profile","character_dna","transition_style","detail_level","naturalness_score","naturalness_notes"], properties:{ rhythm_mode:{type:"string",enum:["terse","brief","natural","expanded","silent"]}, rhythm_reason:{type:"string"}, nonverbal_signal:{type:"string"}, nonverbal_meaning:{type:"string"}, humor_profile:{type:"string"}, humor_boundary:{type:"string"}, argument_lesson:{type:"string"}, romantic_expression:{type:"string"}, romantic_avoidance:{type:"string"}, physical_boundary_state:{type:"string"}, decision_basis:{type:"string"}, persistent_location:{type:"string"}, possession_updates:{type:"array",maxItems:5,items:{type:"object",required:["object","holder","location","state"],properties:{object:{type:"string"},holder:{type:"string"},location:{type:"string"},state:{type:"string"}}}}, social_reputation_update:{type:"string"}, information_flow:{type:"string"}, relationship_self_view:{type:"string"}, relationship_user_view:{type:"string"}, autonomous_plan:{type:"string"}, between_scene_motion:{type:"string"}, memory_compression_anchor:{type:"string"}, initiative_profile:{type:"string",enum:["high","medium","low","reactive","variable","unknown"]}, character_dna:{type:"string"}, transition_style:{type:"string"}, detail_level:{type:"string",enum:["sparse","balanced","atmospheric"]}, naturalness_score:{type:"integer"}, naturalness_notes:{type:"string"} } },
      connection_updates: { type:"array", maxItems:5, items:{ type:"object", required:["from_name","to_name","relationship","visibility","evidence"], properties:{ from_name:{type:"string"}, to_name:{type:"string"}, relationship:{type:"string"}, visibility:{type:"string",enum:["known","private","secret"]}, evidence:{type:"string"} } } },
      post_turn_reflection: { type:"object", required:["changed","pending","avoid_repeat","affected","plausible_consequence"], properties:{ changed:{type:"string"}, pending:{type:"string"}, avoid_repeat:{type:"string"}, affected:{type:"array",maxItems:6,items:{type:"string"}}, plausible_consequence:{type:"string"} } },
      quality_check: { type:"object", required:["canon_ok","user_control_ok","physics_ok","knowledge_ok","voice_ok","repetition_ok","subtext_ok","structure_repetition_ok","scene_momentum_ok","contradiction_ok","rhythm_ok","nonverbal_ok","romantic_specificity_ok","decision_consistency_ok","boundary_ok","social_information_ok","adaptive_detail_ok","dna_ok","naturalness_ok","naturalness_score","drift_risk"], properties:{ canon_ok:{type:"boolean"}, user_control_ok:{type:"boolean"}, physics_ok:{type:"boolean"}, knowledge_ok:{type:"boolean"}, voice_ok:{type:"boolean"}, repetition_ok:{type:"boolean"}, subtext_ok:{type:"boolean"}, structure_repetition_ok:{type:"boolean"}, scene_momentum_ok:{type:"boolean"}, contradiction_ok:{type:"boolean"}, rhythm_ok:{type:"boolean"}, nonverbal_ok:{type:"boolean"}, romantic_specificity_ok:{type:"boolean"}, decision_consistency_ok:{type:"boolean"}, boundary_ok:{type:"boolean"}, social_information_ok:{type:"boolean"}, adaptive_detail_ok:{type:"boolean"}, dna_ok:{type:"boolean"}, naturalness_ok:{type:"boolean"}, naturalness_score:{type:"integer"}, drift_risk:{type:"string"} } },
      cast_updates: { type: "array", maxItems: 3, items: { type: "object", required: ["name", "role", "relationship", "personality_note", "current_dynamic", "goals", "knows", "last_interaction", "offscreen_motion", "next_intention"], properties: { name:{type:"string"}, role:{type:"string"}, relationship:{type:"string"}, personality_note:{type:"string"}, current_dynamic:{type:"string"}, goals:{type:"string"}, knows:{type:"string"}, last_interaction:{type:"string"}, offscreen_motion:{type:"string"}, next_intention:{type:"string"} } } },
      memory_updates: { type: "array", maxItems: 2, items: { type: "object", required: ["content", "category", "importance", "scope", "reason", "replaces"], properties: { content:{type:"string"}, category:{type:"string", enum:["fact","person","relationship","world","event","preference","boundary","promise","conflict"]}, importance:{type:"integer"}, scope:{type:"string", enum:["conversation","character"]}, reason:{type:"string"}, replaces:{type:"string"} } } },
    },
  };
}
function extractCandidateTextRaw(data) {
  return String(data?.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || "").join("") || "");
}
function extractPartialJsonStringField(source = "", field = "reply") {
  const pattern = new RegExp(`"${field.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}"\\s*:\\s*"`);
  const match = pattern.exec(source);
  if (!match) return "";
  const start = match.index + match[0].length;
  let raw = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (!escaped && char === '"') break;
    raw += char;
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
  }
  let safe = raw;
  if (/\\$/.test(safe)) safe = safe.slice(0, -1);
  safe = safe.replace(/\\u[0-9a-fA-F]{0,3}$/u, "");
  try { return JSON.parse(`"${safe}"`); } catch { return ""; }
}
function extractGeminiHttpError(text = "") {
  try { return String(JSON.parse(text)?.error?.message || ""); } catch { return String(text || "").slice(0, 260); }
}

async function streamAndPersist({
  supabase,
  cancellationAdmin,
  generationId,
  conversationId,
  userId,
  storyRevision,
  replacementMessage,
  reply,
  continuityNote,
  sceneUpdate = {},
  responseLanguage,
  memories,
  loreEntries,
  existingTimeline,
  previousDevelopment,
  developmentUpdate,
  memoryUpdates = [],
  character,
  latestUserMessage,
  latestUserMessageId,
  existingSceneState = {},
  existingCastState = {},
  existingRelationshipState = {},
  model = "",
  repairUsed = false,
  regenerationInstruction,
  regenerationFeedback,
  rejectedResponses,
  isRegeneration,
}) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendEvent(controller, {
          type: "start",
          language: responseLanguage,
          model,
          repairUsed,
          memoryCount: memories.length,
          pinnedMemoryCount: memories.filter((memory) => memory.is_pinned).length,
          memoryItems: memories.map((memory) => ({
            id: memory.id,
            content: memory.content,
            category: memory.category,
            pinned: Boolean(memory.is_pinned),
          })),
          loreCount: loreEntries.length,
          loreItems: loreEntries.map((entry) => ({ id: entry.id, name: entry.name, type: entry.entry_type })),
        });

        for (const chunk of splitForStreaming(reply)) {
          if (generationId && await isGenerationCancelled(cancellationAdmin, generationId, userId)) return;
          sendEvent(controller, { type: "chunk", content: chunk });
          await delay(6);
        }

        if (generationId && await isGenerationCancelled(cancellationAdmin, generationId, userId)) return;
        if (!await isStoryRevisionCurrent(supabase, conversationId, userId, storyRevision)) return;

        const savedMessage = replacementMessage
          ? await replaceCharacterReply({ supabase, conversationId, userId, message: replacementMessage, reply })
          : await saveCharacterReply({ supabase, conversationId, userId, reply });

        const update = { updated_at: new Date().toISOString() } as Record<string, any>;
        update.character_development = applyCharacterDevelopment({
          previous: previousDevelopment,
          update: developmentUpdate,
          relationshipPremise: character.relationship || "",
          latestUserMessage,
          reply,
          messageId: savedMessage.id,
          isRegeneration,
          regenerationInstruction,
          regenerationFeedback,
          rejectedResponses,
        });
        update.relationship_state = relationshipStateFromDevelopment(update.character_development, existingRelationshipState);
        const nextPhysicalState = applySceneContinuity({
          previousScene: existingSceneState,
          previousCast: existingCastState,
          sceneUpdate,
          mainCharacterName: character.name,
        });
        update.scene_state = nextPhysicalState.scene;
        update.cast_state = nextPhysicalState.cast;

        const note = cleanPromptValue(continuityNote, 600);
        const sceneChanged = Boolean(sceneUpdate?.scene_changed);
        const separatorLabel = buildSceneSeparatorLabel(existingSceneState, sceneUpdate);
        if (note || sceneChanged || separatorLabel) {
          const timeline = Array.isArray(existingTimeline) ? existingTimeline : [];
          update.story_timeline = [
            ...timeline.filter((item) => String(item?.message_id || "") !== String(savedMessage.id)),
            {
              message_id: savedMessage.id,
              note,
              scene_changed: sceneChanged,
              separator_label: separatorLabel,
              location: nextPhysicalState.scene.location || "",
              time_label: nextPhysicalState.scene.time_label || "",
              present: nextPhysicalState.scene.present || [],
              created_at: savedMessage.created_at || new Date().toISOString(),
            },
          ].slice(-80);
        }
        await supabase.from("conversations").update(update).eq("id", conversationId).eq("user_id", userId);
        if (!replacementMessage && Array.isArray(memoryUpdates) && memoryUpdates.length) {
          await mergeAutomaticMemories({
            supabase, userId, conversationId, characterId: character.id, memoryUpdates,
            sourceMessageId: latestUserMessageId,
            sourceExcerpt: cleanPromptValue(latestUserMessage, 220),
          });
        }
        sendEvent(controller, { type: "done", message: savedMessage, learnedMemoryCount: Array.isArray(memoryUpdates) ? memoryUpdates.length : 0, model, repairUsed, sceneState: update.scene_state, castState: update.cast_state, characterDevelopment: update.character_development, relationshipState: update.relationship_state, continuityGuard: { status: "stable", protected: [] }, storyTimeline: update.story_timeline || existingTimeline });
        console.log("[character-chat] response saved", { conversationId, messageId: savedMessage.id });
      } catch (error) {
        if (getErrorName(error) !== "AbortError") {
          console.error("[character-chat] stream failed", { message: getErrorMessage(error) });
          sendEvent(controller, { type: "error", error: getErrorMessage(error) });
        }
      } finally {
        try { controller.close(); } catch { /* client may have disconnected; persistence already continues */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
function memoryTokenSet(value = "") {
  return new Set(normalizeText(value).split(/\s+/).filter((token) => token.length > 3));
}
function memorySimilarity(left = "", right = "") {
  const a = memoryTokenSet(left);
  const b = memoryTokenSet(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(1, Math.min(a.size, b.size));
}

async function mergeAutomaticMemories({ supabase, userId, conversationId, characterId, memoryUpdates = [], sourceMessageId = "", sourceExcerpt = "" }) {
  const allowedCategories = new Set(["fact", "person", "relationship", "world", "event", "preference", "boundary", "promise", "conflict"]);
  const { data: existingRows, error: existingError } = await supabase.from("memories")
    .select("id, conversation_id, content, category, importance, scope, is_canon, is_pinned, superseded_at")
    .eq("user_id", userId).eq("character_id", characterId).is("superseded_at", null)
    .order("is_canon", { ascending: false }).order("importance", { ascending: false }).limit(80);
  if (existingError) console.warn("[character-chat] memory merge lookup failed", { message: existingError.message });
  const existing = existingRows || [];

  for (const item of memoryUpdates.slice(0, 3)) {
    const content = cleanPromptValue(item?.content, 500);
    if (!content) continue;
    const category = allowedCategories.has(String(item?.category)) ? String(item.category) : "fact";
    // Automatic learning is story-local. Cross-story character memory requires explicit user action.
    const scope = "conversation";
    const importance = Math.max(1, Math.min(5, Number(item?.importance) || 2));
    if (importance < 3 && !["boundary", "promise", "conflict"].includes(category)) continue;
    const whyRemembered = cleanPromptValue(item?.reason, 320) || "Useful continuity for later turns.";
    const replaces = cleanPromptValue(item?.replaces, 500);

    if (replaces) {
      const correctionTarget = existing
        .filter((memory) => !memory.is_canon && !memory.is_pinned)
        .map((memory) => ({ memory, score: memorySimilarity(memory.content, replaces) }))
        .sort((a, b) => b.score - a.score)[0];
      if (correctionTarget?.score >= 0.58) {
        const { error: supersedeError } = await supabase.from("memories").update({
          superseded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", correctionTarget.memory.id).eq("user_id", userId);
        if (supersedeError) console.warn("[character-chat] memory correction could not supersede old memory", { message: supersedeError.message });
        else correctionTarget.memory.superseded_at = new Date().toISOString();
      }
    }

    const candidates = existing
      .filter((memory) => !memory.superseded_at && memory.scope === scope && (scope === "character" || String(memory.conversation_id || "") === String(conversationId)))
      .map((memory) => ({ memory, score: memorySimilarity(memory.content, content) }))
      .sort((a, b) => b.score - a.score);
    const closest = candidates[0];

    if (closest?.score >= 0.78) {
      // Canon/user-pinned memories may gain importance/reason, but automatic learning never rewrites their wording.
      const patch = closest.memory.is_canon || closest.memory.is_pinned
        ? { importance: Math.max(Number(closest.memory.importance || 1), importance), why_remembered: whyRemembered, source_message_id: cleanId(sourceMessageId), source_excerpt: cleanPromptValue(sourceExcerpt, 220), updated_at: new Date().toISOString() }
        : { content, category, importance: Math.max(Number(closest.memory.importance || 1), importance), why_remembered: whyRemembered, source_message_id: cleanId(sourceMessageId), source_excerpt: cleanPromptValue(sourceExcerpt, 220), updated_at: new Date().toISOString() };
      const { error } = await supabase.from("memories").update(patch).eq("id", closest.memory.id).eq("user_id", userId);
      if (error) console.warn("[character-chat] automatic memory update failed", { message: error.message });
      continue;
    }

    const { error } = await supabase.from("memories").insert({
      user_id: userId, conversation_id: conversationId, character_id: characterId, content, category,
      importance, scope, source: "automatic", is_pinned: false, is_canon: false, why_remembered: whyRemembered,
      source_message_id: cleanId(sourceMessageId), source_excerpt: cleanPromptValue(sourceExcerpt, 220),
    });
    if (error) console.warn("[character-chat] automatic memory insert failed", { message: error.message });
  }
}

async function saveCharacterReply({ supabase, conversationId, userId, reply }) {
  const { data, error } = await supabase.from("messages")
    .insert({ conversation_id: conversationId, user_id: userId, sender: "character", content: reply })
    .select().single();
  if (error || !data) throw new Error(error?.message || "The response couldn't be saved");
  return data;
}

async function replaceCharacterReply({ supabase, conversationId, userId, message, reply }) {
  const { data: existing, error: lookupError } = await supabase.from("message_alternatives")
    .select("content").eq("message_id", message.id).eq("user_id", userId);
  if (lookupError) console.warn("[character-chat] alternative lookup failed", { message: lookupError.message });

  const existingContent = new Set((existing || []).map((item) => String(item.content || "")));
  const alternatives = [message.content, reply].filter(Boolean)
    .filter((content) => !existingContent.has(String(content)))
    .map((content) => ({
      user_id: userId,
      conversation_id: conversationId,
      message_id: message.id,
      content,
    }));
  if (alternatives.length) {
    const { error } = await supabase.from("message_alternatives").insert(alternatives);
    if (error) console.warn("[character-chat] alternative save failed", { message: error.message });
  }

  const { data, error } = await supabase.from("messages")
    .update({ content: reply, edited_at: new Date().toISOString() })
    .eq("id", message.id).eq("conversation_id", conversationId).eq("user_id", userId)
    .select().single();
  if (error || !data) throw new Error(error?.message || "The regenerated response couldn't be saved");
  return data;
}
function createThrottledCancellationProbe(check, intervalMs = 420) {
  let lastCheckedAt = 0;
  let lastValue = false;
  let inFlight = null;

  return async () => {
    if (lastValue) return true;
    const now = Date.now();
    if (now - lastCheckedAt < intervalMs) return false;
    if (inFlight) return await inFlight;

    lastCheckedAt = now;
    inFlight = Promise.resolve(check())
      .then((value) => {
        lastValue = Boolean(value);
        return lastValue;
      })
      .catch(() => false)
      .finally(() => {
        inFlight = null;
      });

    return await inFlight;
  };
}

async function isGenerationCancelled(supabase, generationId, userId) {
  if (!generationId) return false;
  const { data, error } = await supabase.from("generation_requests")
    .select("cancelled").eq("id", generationId).eq("user_id", userId).maybeSingle();
  if (error || !data) return false;
  return Boolean(data.cancelled);
}

async function isStoryRevisionCurrent(supabase, conversationId, userId, expectedRevision) {
  if (!expectedRevision) return true;
  const { data, error } = await supabase.from("conversations")
    .select("story_revision").eq("id", conversationId).eq("user_id", userId).maybeSingle();
  if (error || !data) return false;
  return String(data.story_revision || "") === String(expectedRevision);
}
function selectRelevantMemories(memories, messages) {
  const recent = normalizeText(messages.slice(-20).map((message) => message.content).join(" "));
  return [...memories].sort((left, right) => {
    const leftCanon = left.is_canon ? 1 : 0;
    const rightCanon = right.is_canon ? 1 : 0;
    if (leftCanon !== rightCanon) return rightCanon - leftCanon;
    const leftPinned = left.is_pinned || left.source === "manual" ? 1 : 0;
    const rightPinned = right.is_pinned || right.source === "manual" ? 1 : 0;
    if (leftPinned !== rightPinned) return rightPinned - leftPinned;
    const leftRelevant = normalizeText(left.content).split(" ").some((word) => word.length > 4 && recent.includes(word)) ? 1 : 0;
    const rightRelevant = normalizeText(right.content).split(" ").some((word) => word.length > 4 && recent.includes(word)) ? 1 : 0;
    return rightRelevant - leftRelevant || Number(right.importance || 0) - Number(left.importance || 0);
  }).slice(0, 14);
}
function selectRelevantLore(entries, messages, groupCharacters = []) {
  const recentRaw = messages.slice(-28).map((message) => message.content).join(" ");
  const recent = normalizeText(recentRaw);
  const recentTerms = new Set(recent.split(/\s+/).filter((word) => word.length >= 4));
  const castNames = (Array.isArray(groupCharacters) ? groupCharacters : [])
    .map((item) => normalizeText(item?.name || ""))
    .filter(Boolean);

  const scored = entries.map((entry) => {
    if (entry.always_include) return { entry, score: 1000 };
    const keywords = Array.isArray(entry.keywords) ? entry.keywords : String(entry.keywords || "").split(",");
    const normalizedName = normalizeText(entry.name || "");
    const normalizedContent = normalizeText(entry.content || "");
    let score = 0;

    if (normalizedName && recent.includes(normalizedName)) score += 18;
    for (const keyword of keywords) {
      const normalized = normalizeText(keyword);
      if (normalized && recent.includes(normalized)) score += normalized.includes(" ") ? 12 : 8;
    }

    const entryTerms = [...new Set(`${normalizedName} ${normalizedContent}`.split(/\s+/).filter((word) => word.length >= 5))].slice(0, 80);
    const overlap = entryTerms.filter((word) => recentTerms.has(word)).length;
    score += Math.min(12, overlap * 2);

    if (castNames.some((name) => name && (normalizedName.includes(name) || normalizedContent.includes(name)))) score += 5;
    if (entry.entry_type === "location" && /\b(at|in|into|inside|outside|campus|home|apartment|room|office|school|university|club|bar|cafe|restaurant)\b/.test(recent)) score += 1;

    return { entry, score };
  });

  return scored
    .filter((item) => item.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.entry);
}
function getUserIdentity(user, persona = null) {
  const metadata = user?.user_metadata || {};
  const name = persona?.name || metadata.display_name || metadata.full_name || metadata.name || String(user?.email || "").split("@")[0] || "the user";
  return {
    id: user.id,
    name: cleanPromptValue(name, 80),
    pronouns: cleanPromptValue(persona?.pronouns, 80),
    age: cleanPromptValue(persona?.age, 40),
    role: cleanPromptValue(persona?.role, 180),
    appearance: cleanPromptValue(persona?.appearance, 800),
    personality: cleanPromptValue(persona?.personality, 800),
    background: cleanPromptValue(persona?.background, 1200),
    goals: cleanPromptValue(persona?.goals, 800),
    preferences: cleanPromptValue(persona?.preferences, 800),
    boundaries: cleanPromptValue(persona?.boundaries, 800),
    notes: cleanPromptValue(persona?.notes, 1200),
  };
}
function getLengthGuidance(length, kind) {
  if (kind === "interactive_thread") return "120–320 words when the user explicitly opens an ongoing message/call/chat sub-scene. Show several distinct exchanges and reactions; do not resolve the thread after one or two lines unless the user asked to keep it brief.";
  if (kind === "reassurance") return "30–80 words; one honest reaction and natural dialogue are enough.";
  if (kind === "affection") return "45–130 words; show private impact without forcing a speech or confession.";
  if (kind === "silent_continue") return "20–75 words; the user yielded the turn, so add ONE meaningful beat only: one decision, concise dialogue exchange, purposeful action, social interaction, or consequence. Then stop. Do not pad with repeated props, pen/key/page choreography, watching, leaning, breathing, empty-space description, or atmosphere alone.";
  if (kind === "return_main_pov") return "45–130 words; re-center the character quickly and naturally.";
  if (["challenge", "charged_nonverbal"].includes(kind)) return "35–110 words; answer the charged cue with an active, character-specific choice. Keep the tension moving instead of politely conceding, freezing, or ending the scene without cause.";
  if (length === "short") return "25–80 words; complete, human and unpadded.";
  if (length === "long") return "100–250 words, only when the moment genuinely needs room.";
  return "45–140 words. Shorter is better when the social beat already lands.";
}
function getMaximumOutputTokens(length) {
  if (length === "short") return 800;
  if (length === "long") return 1700;
  return 1200;
}
function getTemperature(creativity, regeneration) {
  const value = clampNumber(creativity, 0.2, 1.2, 0.84);
  const temperature = 0.62 + ((value - 0.2) / 1.0) * 0.26 + (regeneration ? 0.08 : 0);
  return Number(Math.min(1.02, temperature).toFixed(2));
}
function extractCandidateText(data) {
  return String(data?.candidates?.[0]?.content?.parts
    ?.filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("") || "").trim();
}
function modelEndpoint(model) {
  return `${GEMINI_API_ROOT}/${encodeURIComponent(model)}:generateContent`;
}
function modelStreamEndpoint(model) {
  return `${GEMINI_API_ROOT}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
}
function geminiHeaders(apiKey) {
  return { "Content-Type": "application/json", "x-goog-api-key": apiKey };
}
function stripJsonFence(value) {
  return String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}
function compactMessageForPrompt(value, maximum = 3200) {
  const text = String(value || "").trim();
  if (text.startsWith("[RETURN_MAIN_POV")) return "[RETURN_MAIN_POV]";
  if (isSilentContinueText(text)) return "[SILENT_CONTINUE]";
  return cleanPromptValue(text, maximum);
}
function cleanPromptValue(value, maximum = 1500) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, maximum);
}
function cleanInstruction(value) {
  return cleanPromptValue(value, 1500);
}
function cleanId(value) {
  return String(value || "").trim().slice(0, 100);
}
function getSupabasePublishableKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed.default || Object.values(parsed)[0] || "";
  } catch {
    return raw;
  }
}
function splitForStreaming(text) {
  const chunks = [];
  let cursor = 0;
  while (cursor < text.length) {
    const remaining = text.slice(cursor);
    const target = Math.min(42, remaining.length);
    let end = target;
    if (remaining.length > target) {
      const window = remaining.slice(0, target + 12);
      const boundary = Math.max(window.lastIndexOf(" "), window.lastIndexOf("\n"));
      if (boundary > 16) end = boundary + 1;
    }
    chunks.push(remaining.slice(0, end));
    cursor += end;
  }
  return chunks;
}
function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}
function sendEvent(controller, data) {
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    return true;
  } catch {
    // v2.10.38 FOREGROUND STREAM DURABILITY: if Android/backgrounding closes
    // the browser side of SSE, keep generating and persist the canonical reply.
    // The chat can recover it from Supabase when the user returns.
    return false;
  }
}
function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
function cancelledResponse() {
  return new Response(null, { status: 499, headers: corsHeaders });
}
function getErrorName(error) {
  return error instanceof Error ? error.name : "";
}
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unexpected server error");
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
