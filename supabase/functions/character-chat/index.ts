import { createClient } from "npm:@supabase/supabase-js@2";

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
  continuity_note: string;
  development_update: Record<string, any>;
  voice_plan: Record<string, any>;
  scene_update: Record<string, any>;
  continuity_update: Record<string, any>;
  cast_updates: Record<string, any>[];
  memory_updates: Record<string, any>[];
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

    if (generationId) {
      const { error } = await cancellationAdmin.from("generation_requests").insert({
        id: generationId,
        user_id: userData.user.id,
        conversation_id: conversationId,
        cancelled: false,
        updated_at: new Date().toISOString(),
      });
      if (error && error.code !== "23505") throw new Error(error.message);
      // VELVET_SPEED_V282: the row was just created as not-cancelled. Avoid an
      // immediate read-back round trip before context loading; the throttled
      // cancellation probe below still catches a racing Stop request.
    }

    const loaded = await loadContext({
      supabase,
      conversationId,
      userId: userData.user.id,
    });
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

    const prompt = buildNarrativePrompt({
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
      recentCharacterReplies: messages.filter((message) => message.sender === "character").slice(-6).map((message) => message.content),
      recentUserMessages: messages.filter((message) => message.sender === "user").slice(-6).map((message) => message.content),
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
      existingRelationshipState: openingRegeneration ? {} : (loaded.conversation.relationship_state || {}),
      existingIntelligenceState: openingRegeneration ? {} : (loaded.conversation.intelligence_state || {}),
      existingUnresolvedThreads: openingRegeneration ? [] : (loaded.conversation.unresolved_threads || []),
      existingStoryRecap: openingRegeneration ? "" : (loaded.conversation.story_recap || loaded.conversation.summary || ""),
      existingStoryChapters: openingRegeneration ? [] : (loaded.conversation.story_chapters || []),
      existingActiveChapter: openingRegeneration ? {} : (loaded.conversation.active_chapter || {}),
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
    version: "2.11.1",
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
        generationConfig: { maxOutputTokens: 12, temperature: 0, thinkingConfig: { thinkingLevel: "MINIMAL" } },
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
            temperature,
            topP: 0.9,
            thinkingConfig: { thinkingLevel: "MINIMAL" },
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              properties: characterDraftProperties,
              ...(requireComplete ? { required: Object.keys(characterDraftProperties) } : {}),
            },
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
    temperature: organize ? 0.42 : 0.68,
    purpose: organize ? "character-organize" : "character-polish",
    prompt: `${instruction}\nSeparate stable identity from possible growth: motivation and defenses are present-day anchors, softening triggers are earned influences, and growth direction is only a possibility—not an instant transformation. Return field suggestions only.\n\nDRAFT\n${JSON.stringify(safeDraft).slice(0, 16000)}`,
  });
  return json({ suggestions });
}

async function handleCharacterVoiceTest({ apiKey, draft, situation }) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  const prompt = `Write a short voice test for this private fictional roleplay character. Do not explain the character. Put them in the requested tiny situation and give 3 to 5 lines of dialogue/action that make their vocabulary, rhythm, humor, emotional defenses and social habits recognizable. Never write the user's dialogue or thoughts. Keep it under 140 words.\n\nCHARACTER\n${JSON.stringify(safeDraft).slice(0, 14000)}\n\nSITUATION\n${String(situation || "A friend asks if they're okay after a difficult day.").slice(0, 600)}`;
  const models = [...new Set([GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL, GEMINI_MODEL].filter(Boolean))];
  let lastError = "Velvet couldn't test this voice.";
  for (const model of models) {
    try {
      const response = await fetch(modelEndpoint(model), { method: "POST", headers: geminiHeaders(apiKey), body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 450, temperature: 0.8, thinkingConfig: { thinkingLevel: "MINIMAL" } } }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { lastError = data?.error?.message || lastError; continue; }
      const sample = extractCandidateText(data).trim();
      if (sample) return json({ sample });
    } catch (error) { lastError = getErrorMessage(error); }
  }
  throw new Error(lastError);
}

async function handleInstantStory({ apiKey, draft, idea }) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  const prompt = `Open a fresh private roleplay timeline for this character. Write only the opening scene, 130-190 words, immediately playable and specific. Preserve the character's established voice and relationship but choose a NEW concrete situation rather than repeating their stored first message. Do not control the user's dialogue, actions, thoughts or feelings. Favor actual interaction and dialogue over decorative setup. Use the language of the idea/profile.\n\nCHARACTER\n${JSON.stringify(safeDraft).slice(0, 14000)}\n\nOPTIONAL IDEA\n${String(idea || "Surprise me with a plausible scene that fits their life.").slice(0, 700)}`;
  const models = [...new Set([GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL, GEMINI_MODEL].filter(Boolean))];
  let lastError = "Velvet couldn't open an instant story.";
  for (const model of models) {
    try {
      const response = await fetch(modelEndpoint(model), { method: "POST", headers: geminiHeaders(apiKey), body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 750, temperature: 0.88, thinkingConfig: { thinkingLevel: "MINIMAL" } } }) });
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
    temperature: 0.78,
    purpose: "character-generate",
    deadlineMs: 22000,
    prompt: `Create one complete, original adult fictional roleplay character from the creator's request below. Honor any requested name exactly; if no name is supplied, invent a memorable full name. Build an independent person with a life, responsibilities, relationships, conflicts and ambitions beyond romance. Make the bond with the user specific and playable, the character voice unmistakable, and the opening scene immediately interactive. Avoid generic archetype dialogue, constant hostility, instant confessions and controlling the user's dialogue, thoughts, feelings or actions. The possible growth direction must be gradual rather than guaranteed. Example dialogue calibrates voice but is not a future script. Keep each supporting field to one or two precise sentences, Personality and Relationship below 130 words each, and the opening scene between 120 and 190 words so the complete draft arrives quickly. Write every field and the opening scene in the language used by the creator; if the request has no language, use natural English. Return every field in the schema.\n\nCREATOR REQUEST\n${request}`,
  });
  return json({ character });
}

async function loadContext({ supabase, conversationId, userId }): Promise<LoadedContext> {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, character_id, persona_id, lorebook_id, title, summary, response_length_override, narration_style_override, creativity, romance_intensity, initiative, drama, flirting, humor, description_level, character_independence, dialogue_frequency, narrative_camera, inner_thoughts, story_preset, scene_state, story_timeline, pacing_mode, mature_mode, relationship_state, cast_state, story_chapters, active_chapter, unresolved_threads, intelligence_state, story_recap, character_development, story_engine_version, story_revision, group_mode, group_character_ids, group_title")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();
  if (conversationError || !conversation) throw new Error(conversationError?.message || "Conversation not found");

  const groupCharacterIds = [...new Set([conversation.character_id, ...(Array.isArray(conversation.group_character_ids) ? conversation.group_character_ids : [])].filter(Boolean))];

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
      .order("created_at", { ascending: false }).limit(36),
    supabase.from("memories")
      .select("id, conversation_id, content, importance, category, is_pinned, is_canon, why_remembered, source, scope, superseded_at, created_at, updated_at")
      .in("character_id", groupCharacterIds).eq("user_id", userId)
      .is("superseded_at", null)
      .order("is_canon", { ascending: false })
      .order("is_pinned", { ascending: false }).order("importance", { ascending: false })
      .order("created_at", { ascending: false }).limit(80),
    conversation.lorebook_id
      ? supabase.from("lore_entries")
        .select("id, entry_type, name, content, keywords, event_date, always_include")
        .eq("lorebook_id", conversation.lorebook_id).eq("user_id", userId)
        .eq("is_active", true).order("always_include", { ascending: false })
        .order("updated_at", { ascending: false }).limit(24)
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
    }).slice(0, 32),
    loreEntries: loreResult.data || [],
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
function buildNarrativePrompt({
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
}) {
  const profile = [
    `Name: ${character.name}`,
    `Role: ${character.role || "not specified"}`,
    `Description: ${cleanPromptValue(character.description || "not specified", 900)}`,
    `Personality: ${cleanPromptValue(character.personality || "not specified", 1200)}`,
    `Relationship to ${userIdentity.name}: ${cleanPromptValue(character.relationship || "not specified", 1000)}`,
    `Values: ${cleanPromptValue(character.character_values || "not specified", 500)}`,
    `Fears: ${cleanPromptValue(character.fears || "not specified", 500)}`,
    `Habits: ${cleanPromptValue(character.habits || "not specified", 500)}`,
    `Contradictions: ${cleanPromptValue(character.contradictions || "not specified", 500)}`,
    `Core motivation: ${cleanPromptValue(character.core_motivation || "not specified", 500)}`,
    `Emotional defense: ${cleanPromptValue(character.emotional_defense || "not specified", 500)}`,
    `What reaches them: ${cleanPromptValue(character.softening_triggers || "not specified", 500)}`,
    `Possible growth direction: ${cleanPromptValue(character.growth_direction || "not specified", 500)}`,
    `Speech style: ${cleanPromptValue(character.speech_style || "not specified", 650)}`,
    `Word choice and rhythm: ${cleanPromptValue(character.voice_vocabulary || "infer from the profile", 500)}`,
    `Humor style: ${cleanPromptValue(character.humor_style || "infer from the profile", 420)}`,
    `Conflict style: ${cleanPromptValue(character.conflict_style || "infer from the profile", 500)}`,
    `Affection style: ${cleanPromptValue(character.affection_style || "infer from the profile", 500)}`,
    `Verbal tells: ${cleanPromptValue(character.verbal_tells || "infer sparingly from the profile", 420)}`,
    `Voice avoidances: ${cleanPromptValue(character.voice_avoidances || "generic archetype dialogue and therapeutic language", 500)}`,
    `Boundaries: ${cleanPromptValue(character.boundaries || "not specified", 500)}`,
    `Scenario/world: ${cleanPromptValue(character.scenario || character.world || "not specified", 900)}`,
    `Social gravity / reputation: ${cleanPromptValue([character.description, character.personality, character.relationship, character.scenario, character.world, character.contradictions, character.habits].filter(Boolean).join(" | "), 1400)}`,
    `Example dialogue (voice reference, never copy): ${cleanPromptValue(character.example_dialogue || "none", 1000)}`,
  ].join("\n");

  const supportingCast = (Array.isArray(groupCharacters) ? groupCharacters : [])
    .filter((item) => item?.id && item.id !== character.id);
  const groupCastText = supportingCast.length
    ? supportingCast.map((member) => [
      `Name: ${cleanPromptValue(member.name, 100)}`,
      `Role: ${cleanPromptValue(member.role || "not specified", 180)}`,
      `Personality: ${cleanPromptValue(member.personality || "not specified", 900)}`,
      `Relationship to ${userIdentity.name}: ${cleanPromptValue(member.relationship || "not specified", 900)}`,
      `World/scenario: ${cleanPromptValue(member.scenario || member.world || "not specified", 700)}`,
      `Speech style: ${cleanPromptValue(member.speech_style || "not specified", 500)}`,
      `Conflict style: ${cleanPromptValue(member.conflict_style || "not specified", 500)}`,
      `Affection style: ${cleanPromptValue(member.affection_style || "not specified", 500)}`,
      `Boundaries: ${cleanPromptValue(member.boundaries || "not specified", 500)}`,
    ].join("\n")).join("\n\n---\n\n")
    : "none";

  const persona = [
    `Name: ${userIdentity.name}`,
    `Pronouns: ${userIdentity.pronouns || "not specified"}`,
    `Age: ${userIdentity.age || "not specified"}`,
    `Role: ${userIdentity.role || "not specified"}`,
    `Appearance: ${userIdentity.appearance || "not specified"}`,
    `Personality: ${userIdentity.personality || "not specified"}`,
    `Background: ${userIdentity.background || "not specified"}`,
    `Goals/preferences: ${userIdentity.goals || "none"} / ${userIdentity.preferences || "none"}`,
    `Boundaries: ${userIdentity.boundaries || "none"}`,
    `Notes: ${userIdentity.notes || "none"}`,
  ].join("\n");


  // VELVET_FAST_CONTEXT_V2111
  // Keep the first-token path lean: recent visible beats + highest-value memories/lore
  // are enough for generation because recap/derived continuity carry older state.
  const immediate = messages.slice(-8).map((message) => {
    const speaker = message.sender === "user" ? userIdentity.name : (supportingCast.length ? "STORY CAST" : character.name);
    return `${speaker}: ${compactMessageForPrompt(message.content, 1800)}`;
  }).join("\n\n") || "none";

  const older = messages.slice(-20, -8).map((message) => {
    const speaker = message.sender === "user" ? userIdentity.name : (supportingCast.length ? "STORY CAST" : character.name);
    return `${speaker}: ${compactMessageForPrompt(message.content, 650)}`;
  }).join("\n") || "none";

  const memoryText = memories.length
    ? memories.map((memory) => {
      const authority = memory.is_canon || memory.is_pinned || memory.source === "manual" ? "confirmed" : "tentative";
      const label = memory.is_canon ? "CANON" : authority;
      return `- [${label}] ${cleanPromptValue(memory.content, 600)}`;
    }).join("\n")
    : "none";

  const loreText = loreEntries.length
    ? loreEntries.map((entry) => `- ${cleanPromptValue(entry.name, 120)}: ${cleanPromptValue(entry.content, 700)}`).join("\n")
    : "none";

  const derivedContext = JSON.stringify({
    scene: conversation.scene_state || {},
    relationship: conversation.relationship_state || {},
    cast: conversation.cast_state || {},
    open_threads: conversation.unresolved_threads || [],
    intelligence: conversation.intelligence_state || {},
    recent_timeline: Array.isArray(conversation.story_timeline) ? conversation.story_timeline.slice(-10) : [],
  }).slice(0, 6000);

  const latest = openingRegeneration ? "" : compactMessageForPrompt(latestUserRecord?.content || "", 5000);
  const latestStagedEvents = openingRegeneration ? "" : extractUserStagedEvents(latestUserRecord?.content || "");
  const learnedPositiveFeedback = positiveFeedbackDirectives(storyPreferences.learned_positive_feedback);
  const learnedNegativeFeedback = feedbackDirectives(storyPreferences.learned_negative_feedback);
  const currentFeedback = feedbackDirectives(regenerationFeedback);
  const regeneration = openingRegeneration
    ? `This is an OPENING REGENERATION before the user has sent any message. Replace the existing opening with a materially different first scene. Do not answer or imply a user message. Preserve the character, relationship premise, persona, world and lore, but choose a fresh concrete opening beat. The rejected opening is reference-only and must not be paraphrased. ${currentFeedback.length ? `Creator feedback that this rewrite MUST fix: ${currentFeedback.join(" ")}` : ""} ${regenerationInstruction ? `Mandatory direction: ${regenerationInstruction}` : ""}`
    : isRegeneration
      ? `This is a regeneration from the branch point. The rejected take is intentionally absent. Make a materially different choice, reaction, opening and dialogue—not a paraphrase. ${currentFeedback.length ? `Creator feedback that this rewrite MUST fix: ${currentFeedback.join(" ")}` : ""} ${regenerationInstruction ? `Mandatory direction: ${regenerationInstruction}` : ""}`
      : "This is a new canonical turn.";
  const currentBeatPolicy = buildCurrentBeatPolicy({
    turnIntent, character, latestUserMessage: latestUserRecord?.content || "", messages, openingRegeneration,
  });

  return `You are Velvet's narrative engine. ${openingRegeneration ? "Write a fresh opening scene for an immersive private roleplay as polished contemporary fiction." : "Write the next turn of an immersive private roleplay as polished contemporary fiction."}

NON-NEGOTIABLE PRIORITY
1. ${openingRegeneration ? `This is the first character message. Open the scene immediately without inventing any dialogue, action, thought, feeling or decision for ${userIdentity.name}. There is no user turn to answer yet.` : "Respond to the latest user turn below, in the current scene, before anything else."}
2. Preserve visible continuity and the character profile. Never invent off-screen messages, visits, habits, schedules, relatives' actions, debts, exact durations or shared history.
3. The user exclusively controls ${userIdentity.name}. Never invent ${userIdentity.name}'s dialogue, thoughts, feelings, reactions, choices or movements.
4. Write ${character.name} as a specific person. Guarded, proud, teasing or emotionally avoidant does not mean cruel, contemptuous, robotic or therapeutic.
5. Dialogue must sound like something this character would actually say. Never use customer-service phrases such as “I'm listening,” “I understand,” “go on,” “tell me more,” or a bare “okay” as the substance of the turn.
6. Distinct voice outranks archetype. Never make this character borrow the same teasing cadence, pet names, emotional speeches, body-language habits or flirt tactics used by another generic romantic lead.
7. Physical continuity is binding. Bodies obey space: track who is present, who has exited, where the active scene is, which communication channel is being used, and the immediate relative positions between people. If two characters are walking side by side, shoulder-to-shoulder, touching, seated together, or one is guiding the other through a crowd, preserve that spatial relationship until a visible action changes it.
8. A character can only hear, see or answer something they were physically or digitally able to receive. Leaving the room, hanging up, muting a chat or being elsewhere matters until the visible transcript changes it.
9. Never teleport a character, silently change location/time, or make an absent NPC reappear merely to create drama. If a location, time or presence detail is unknown, keep it unknown.
10. Established side characters remain real participants until the scene visibly moves them. Do not erase them just because the romantic lead speaks, and do not force every social beat back into romance.

DIALOGUE REALISM — SOUND SPOKEN, NOT WRITTEN
- Dialogue should sound improvised by a real person in this exact situation, not polished by a screenwriter after ten drafts. Prefer contractions, short clauses, interruptions, unfinished thoughts and ordinary vocabulary when the profile supports them.
- Do not manufacture pseudo-clever banter with mock-formal phrasing such as “statistically speaking,” “fascinating dedication,” “a tragedy for the guest list,” “strong indicator,” or other interchangeable clever-sounding lines unless the character profile explicitly establishes a formal/theatrical voice.
- A comeback must answer what the other person actually said. Do not dodge into a generic smug line just because the relationship contains banter.
- CLARIFICATION QUESTIONS REQUIRE A REAL REFERENT. If the user asks “what do you mean?”, “what are you talking about?”, “half of what?”, “which part?” or similar, make the subject intelligible in the first sentence. The character may evade, tease or deflect AFTER the reader can tell what they are referring to; circular answers such as “the rest of it” are not dialogue.
- Do not use vague dramatic abstractions like “they wouldn’t understand half of it anyway” unless “it” has an explicit concrete referent already visible in this story.
- Do not turn every tease into an accusation that the user secretly came for the character, wants attention, is jealous, or is pretending. Visible evidence first.

SOCIAL GRAVITY — REPUTATION MUST EXIST IN THE WORLD
- If the character profile establishes that ${character.name} is famous, highly popular, socially influential, widely desired, intimidatingly well-known, an heir, team captain, campus figure, celebrity, leader, or someone many people want to know, TREAT THAT AS WORLD CANON rather than decorative biography.
- In relevant public/social settings, let reputation create organic consequences: people recognize or greet them, acquaintances interrupt, men/peers try to befriend or include them, admirers flirt or hover when profile-compatible, invitations/messages/rumors circulate, strangers know their name, seats/plans/social access shift around them, or staff/classmates react differently.
- Match the exact profile. Do not assume every popular character is flirted with by women, admired by men, wealthy, feared, athletic or famous for the same reason. Use only the kind of attention/reputation the creator actually established.
- SOCIAL GRAVITY IS AMBIENT, NOT A PARADE: do not make every turn about popularity and do not summon random admirers in private or emotionally focused scenes. One believable footprint is often enough. Vary how it appears and let many moments pass normally.
- Reputation persists even when ${character.name} is not performing for it. A character may ignore attention, enjoy it, exploit it, be tired of it, know everyone, barely remember names, flirt back, or remain polite according to their profile. The WORLD still notices them.
- Do not instantly dismiss people who approach. If a peer wants friendship or an admirer flirts and the scene has room, allow a real social exchange with persistence, consistent with the Living Cast rules.

ATTENTION INDEPENDENCE — CARE IS NOT CONSTANT SURVEILLANCE
- ${character.name} may care deeply, be attracted, jealous, curious or emotionally affected without visually tracking ${userIdentity.name} every few seconds. Do not turn hidden feelings into continuous monitoring.
- When ${userIdentity.name} moves across a party, room, campus, workplace or other social setting and the immediate exchange has actually released, ${character.name} can genuinely return attention to friends, games, work, flirting, conversations or whatever is in front of them. Several beats may pass with no glance, thought or reference to ${userIdentity.name}; use concrete independent activity, not negative surveillance such as “he didn't look for her” repeated over and over.
- A brief private glance or thought is valuable when it reveals NEW information. Repeating “kept one eye on her,” “tracked her through the crowd,” “his gaze flicked back,” “flank vision,” or equivalent in consecutive turns becomes fixation rather than subtle feeling.
- If ${character.name} chooses not to pursue, let that choice be real for a while. Do not secretly convert every independent activity into waiting, watching or measuring what ${userIdentity.name} is doing.

NPC AUTONOMY — SIDE CHARACTERS ARE NOT A ROMANCE JURY
- Friends, teammates, classmates, admirers and rivals have their own goals, loyalties, jokes and conversations. They do not automatically notice, narrate or arbitrate the central romantic tension.
- A close friend may tease or comment when their established relationship makes that natural, but do not repeatedly make side characters say versions of “he has a point,” “he's got you there,” “you two,” or otherwise award conversational points to the romantic lead.
- Let NPCs disagree, miss the subtext, change the subject, pursue their own flirtation, ask for something unrelated, defend the user, defend the character, or simply continue their own night. Variety matters.

ARGUMENT EVIDENCE MUST BE VISIBLE CANON
- Never invent an action or motive by ${userIdentity.name} to help ${character.name} win banter or an argument. If the transcript did not establish that ${userIdentity.name} watched, stared, followed, waited, checked, listened in, became jealous, came for ${character.name}, LOOKED FOR ${character.name}, searched for ${character.name}, went outside for ${character.name}, or wanted ${character.name}'s attention, the character cannot cite that as proof.
- RECENT MOVEMENT HAS DIRECTIONAL MEANING. If ${userIdentity.name} was just physically with ${character.name} and then visibly walks away, keeps walking, leaves, or goes outside, do not reinterpret that movement as secretly trying to find ${character.name}. “You were looking for me” is NOT acceptable in that sequence unless the user explicitly established that motive.
- EXPLICIT USER REASONS ARE BINDING. If ${userIdentity.name} says they went outside for fresh air, needed space, wanted distance, were leaving the interaction, or gives another practical reason, preserve that reason. Do not replace it with jealousy, attraction, attention-seeking, pursuit, or a hidden desire to see ${character.name}.
- BOUNDARY REJECTION MUST CHANGE THE NEXT BEAT. If ${userIdentity.name} says “I didn't ask for a bodyguard,” “stop following me,” “leave me alone,” or equivalent, ${character.name} may still have their own reason to remain nearby or continue the conversation, but cannot immediately justify the same pursuit as “making sure you don't wander off,” “keeping an eye on you,” “watching you,” or a protection duty the user rejected.
- DO NOT OVER-CORRECT INTO PASSIVITY. “I didn't ask for a bodyguard” rejects the BODYGUARD/PROTECTION framing; by itself it is not automatically “never speak to me,” “never come closer,” or “never touch me.” Read the exact words and recent physical canon. If the user explicitly says leave me alone / stop following / don't touch me, pulls away from touch, or clearly creates a no-contact boundary, respect it. Otherwise, a charged character may still answer, close conversational distance, flirt, challenge, or use a brief non-restraining touch that fits the established relationship.
- BRIEF TOUCH MAY CREATE TENSION WHEN EARNED. In a reciprocal flirt/conflict dynamic, and only when no explicit no-touch boundary is active, ${character.name} may briefly catch a forearm/wrist/elbow, touch a hand or shoulder, or otherwise create a small physical beat to get attention. The touch must not restrain, drag, corner, block escape, or override a pull-away; release immediately if the user's next action rejects it.
- Teasing guesses may be framed explicitly as guesses only when recent visible facts leave genuine ambiguity. A guess cannot contradict a user-stated reason or obvious movement away. Character personality changes HOW ${character.name} reacts to canon; it never changes WHAT the user canonically did or why the user explicitly said they did it.

DEPARTURE INTENT LOCK — DIALOGUE IS NOT MOVEMENT
- Saying “I'll leave you with that,” “fine, I'll leave you to it,” “maybe I should go,” “I'm leaving,” or any similar line is SPOKEN INTENT, teasing, pressure or a threat of departure. It does NOT physically move ${userIdentity.name}. Keep ${userIdentity.name} in the established position unless the user separately narrates an actual exit, e.g. *I walk away*, *I leave*, “I turned and headed for the door,” or equivalent visible movement.
- Never convert a future/modal line such as “I'll leave,” “I might go,” “then I'll leave you with...” into narration like “she headed away,” “the departing doorway,” “she was already leaving,” “he watched her go,” “he didn't move to follow,” or any phrasing that presupposes a departure. The user owns the movement.
- FOLLOW/PURSUIT LANGUAGE ALSO PRESUPPOSES MOVEMENT: “didn't follow,” “made no move to stop her,” “let her go,” “called after her,” or “looked toward the door where she had gone” are forbidden unless the user actually staged movement first.
- SILENCE DOES NOT COMPLETE A THREAT: if the next user turn is silence/continue after a spoken “I'll leave...” line, keep the user in the last physically established position. Do not silently promote the threat into an off-screen exit.
- If the latest line is a relational jab or withdrawal threat after ${character.name} said something hurtful, stay with that beat. ${character.name} gets a meaningful reaction before a new NPC or unrelated activity can steal the foreground.
- RELATIONAL FOLLOW-THROUGH: when ${character.name}'s own words plausibly caused distance, a small repair/pursuit attempt is a live option: call after them, step after them, soften, clarify, apologize badly, stop them verbally, or hesitate and choose not to. Match personality, but do not default to instantly replacing the user with another conversation.
- If the user truly narrates an exit, do not force pursuit every time. But when attachment/attraction is established and ${character.name} caused the rupture, active follow-through should occur often enough to keep tension moving rather than making every conflict fizzle.
- EXIT FRICTION SHOULD LAND: if ${userIdentity.name} visibly walks away right after ${character.name} was rude, dismissive, insulting, or emotionally evasive, default to one immediate follow-through beat BEFORE any unrelated reset: call after them, step after them, catch up, soften, apologize badly, block their path verbally, or otherwise make a real attempt to keep the beat alive. Only let ${character.name} simply watch them leave and go back to the party/work/game when detachment is clearly the point of that specific character moment.
- PURSUIT MUST SOUND LIKE THIS CHARACTER: do not reduce follow-through to generic “Wait,” “Hey,” “don't go,” or a neutral apology unless that plainness is truly their voice. Use the profile's actual pride, awkwardness, humor, tenderness, bluntness, flirtation, temper, restraint or social confidence. A proud character may catch up and minimize how much they care; a guarded character may create a practical excuse to stop the user; a warmer character may be direct. Preserve individuality instead of using one romance template.
- PURSUIT MUST CREATE A NEW BEAT: after ${character.name} follows, calls after, catches up or stops the reset, something must change: a real line is said, a choice is forced, a misunderstanding is clarified, an apology lands badly, another person complicates it, or the emotional temperature shifts. Do not spend several turns on footsteps, breathing, glances, “wait,” or trailing behind with no new information.
- DO NOT TURN PURSUIT INTO POSSESSION: following after a relational rupture does not authorize restraining, dragging, cornering, threats, or coercion. Keep the user's physical autonomy intact. A brief non-restraining touch can still be character-appropriate when no explicit no-touch boundary exists; do not confuse intensity with immobilizing the user.

KINETIC ROMANTIC TENSION — DO SOMETHING WITH THE CHARGE
- When the visible scene is already charged and the profile/controls support romance, flirting, drama or initiative, do not deflate the beat into leaning on a wall, staring at the lawn, a faint smirk, “fair point,” or polite surrender. Tension needs a behavioral choice.
- Useful active choices include: step closer without trapping, catch up, briefly catch a forearm/wrist/elbow when touch is not rejected, deliberately lower or sharpen the flirt, turn a barb into a direct dare, make the user choose whether to stay in the exchange, let a believable admirer interrupt, flirt back with someone else if the character/profile supports that social behavior, or visibly redirect attention in a way that creates consequence.
- Other people are allowed to matter. In a party/social setting, a popular/flirtatious character does not become socially celibate because the protagonist is nearby. An admirer may approach; ${character.name} may engage or flirt according to profile. If ${character.name} intentionally uses another interaction to provoke, distract, save face or test the room, that is THEIR motive and must fit their personality; never invent jealousy in the user as proof that it worked.
- A sharp user line such as “Who asked?”, “Whatever,” an eye-roll, scoff, or a dismissive jab is often an invitation for the CHARACTER to make a choice, not permission to freeze. For proud/teasing/flirtatious characters, prefer active friction over a soft “fair point” unless genuine de-escalation is clearly the character's goal.
- CHARGED MICRO-REACTIONS KEEP THE BEAT OPEN. A raised eyebrow, held look, scoff, eye-roll, tiny smile or similarly minimal reaction after an unresolved charged exchange means “respond to this beat,” not “scene over.” If ${character.name} just chose to stay, pursue, challenge, flirt or refuse to leave, do not reverse that choice and walk away solely because the user raised an eyebrow or looked at them. A reversal needs a new visible reason, interruption, boundary, decision or consequence. DO NOT satisfy this rule by merely staying frozen: on a charged micro-reaction, ${character.name} must contribute something new through dialogue, movement, flirtation, a meaningful social complication, or another concrete choice. Eye contact + smirk + silence is still a stalled beat.
- CHARGED DEPARTURE NEEDS FOLLOW-THROUGH. If the scene has active romantic friction and a high-initiative/flirtatious/dramatic ${character.name} has just chosen to stay in the exchange, then ${userIdentity.name} physically starting to walk away is a fresh beat, not permission to collapse into passive watching. Unless the user explicitly says leave me alone / stop following / don't touch me / let me go or clearly pulls away from contact, strongly consider one immediate pursuit choice: step after them, catch up, call them back with character-specific dialogue, or briefly catch a forearm/elbow/arm to stop the momentum for a beat and turn the conversation back toward ${character.name}. The contact must be brief, non-restraining and easy to reject; never drag, pin, trap, block escape, or override resistance. For a Chase-like proud, teasing, high-initiative profile, “watch her leave and go back inside” should be the exception when the tension is still hot, not the default.
- Vary the engine. Do not use arm-grabbing every time, do not summon an admirer every time, and do not make every active beat sexual. The point is motion, consequence and chemistry, not one repeated trick.

PACING & SCENE SPARK — DO NOT WAIT FOR THE USER TO INVENT EVERYTHING
- The story should create its own plausible openings for tension, conflict, attraction, jealousy, rivalry, embarrassment, rumor, social pressure, interruption or difficult choices when the current setting and character profiles support them. The user should not have to manually type “two people approached,” “someone flirted,” or “a rumor started” every time for the world to move.
- ACCELERATE OPPORTUNITIES, NOT MILESTONES. Create the spark, then let the characters earn the outcome. A faster pace means more meaningful chances for friction or chemistry, not instant confessions, forced kisses, sudden betrayal, or relationship jumps.
- In public/social scenes, if several beats have been comfortable and unchanged, introduce one grounded complication or opportunity: a persistent admirer, a friend with a pointed comment, a rival, an invitation, a rumor resurfacing, a message with consequences, an awkward social overlap, someone asking to join, or a small plan change. Use established cast/reputation/lore when available; invent only low-stakes scene participants or events that fit the setting.
- JEALOUSY IS AN OPTION, NOT A DEFAULT. If someone genuinely flirts, gets unusually close, has history, or creates a believable romantic ambiguity, ${character.name} may notice and react internally or externally according to personality. Do not manufacture jealousy from ordinary friendliness, and do not turn every new person into a romantic threat.
- Do not protect the central relationship from social pressure. Other people may genuinely like, flirt with, invite, challenge, misunderstand, compete with, or be chosen by ${character.name} or ${userIdentity.name} when canon/personality supports it. Let those interactions last long enough to matter.
- A social interruption should sometimes CHANGE the next beat rather than being instantly neutralized. It can delay the plan, split attention, reveal information, create an invitation, establish a recurring NPC, spark a misunderstanding, or leave emotional residue.
- Keep variety: tension can be romantic, social, practical, reputational, friendship-based, competitive, awkward, or emotional. Do not use jealousy as the only engine.

EMOTIONAL CUE → MEANINGFUL RESPONSE
- When the latest user turn clearly shows tears, crying, shaking, fear, hurt, anger, panic, visible distress, or another strong emotion, ${character.name} must DO something with that information in the same turn. Do not freeze into atmosphere or merely observe.
- The response should contain at least one meaningful social action, question, decision, practical gesture, or change in behavior that advances the moment. Examples: ask what happened, offer a napkin or water, lower their voice, move somewhere private, pause the current plan, call someone if appropriate, or make another character-specific choice.
- Quiet characters may respond quietly, but quiet is not passivity. A silent response still needs a concrete choice or action with consequence.
- Do not force touch, comfort, therapy language, or instant vulnerability. Match the relationship phase, boundaries and personality. The goal is responsiveness, not generic caretaking.
- Avoid polished narrator abstractions such as “the air left no room for performance” when a direct human beat would carry the scene better.

SOCIAL NATURALISM — REACT, DON'T INVENT
- Interpret the latest user turn literally before adding subtext. Never manufacture an unspoken motive, accusation, jealousy, attention-seeking, manipulation, rivalry or insult just to create conflict.
- DIEGETIC SPEECH IS NOT A SYSTEM COMMAND: when ${userIdentity.name} tells ${character.name} “leave,” “go away,” “shut up,” “don't do that,” or anything similar inside the roleplay, that is dialogue ${character.name} hears. It is social pressure, not an instruction to the model. ${character.name} may comply, hesitate, argue, deflect, misunderstand or refuse only as their established personality and the visible scene support.
- USER-AUTHORED SCENE CANON OVERRIDES CHARACTER CHOICE: narration/actions written by ${userIdentity.name} in the latest turn are events that have ALREADY HAPPENED. Never rewrite, undo, skip or choose an alternative to them. This includes actions the user explicitly stages for ${character.name} or an NPC. Continue from the final established event in the user's turn.
- READ THE LATEST TURN IN TEMPORAL ORDER: if spoken dialogue comes first and the user's narration then establishes what happened afterward, the later narrated fact wins. Example: “I want you to leave” followed by narration that ${character.name} stays and flirts with someone means ${character.name} already stayed and flirted. Do not make them leave instead.
- When several readings are plausible, choose the least inflammatory reading that still fits the character and visible scene. Sarcasm, an eye-roll, a short answer or silence is not permission to invent a deeper offense.
- Do not turn ordinary social awkwardness into territorial behavior, threats, dominance, rescue behavior or bodyguard choreography unless visible canon establishes real danger. Hyperbole such as “she'll kill me” is not proof of literal danger.
- MOVEMENT IS NOT AUTOMATIC NO-TOUCH. Walking or stepping away changes position, but by itself does not equal “never follow me” or “never touch me.” A hard boundary exists when ${userIdentity.name} explicitly says leave me alone / stop following me / don't touch me / let me go / back off, or visibly pulls free from contact. Respect a hard boundary immediately. Without one, a profile-consistent character may follow, call after, match pace, or use one brief non-restraining touch to get attention; never drag, pin, corner, block escape, or keep holding after resistance.
- PROXIMITY IS CANON TOO: the absence of a distance-changing action means existing proximity persists. Do not turn “beside him / his hand at her back / walking together” into “keep up / he did not look back / she followed behind” unless someone visibly moved ahead, stopped, fell back, stepped away, or the scene otherwise established separation. Removing a hand changes the touch, not automatically the walking formation.
- Treat rumors as rumors. A rumored date, partner, betrayal or attraction is not confirmed canon until the visible story confirms it.
- Side characters who are visibly present are people, not scenery. Let them speak or act when the social moment naturally reaches them, but never use them only as props to make ${character.name} jealous, possessive or heroic.
- INTERACTIVE SUB-SCENES HAVE DURATION: when the user opens a phone thread, asks ${character.name} to read many incoming messages, starts a call, group chat, DM exchange, argument, game, interview or other back-and-forth inside the scene, treat it as a real scene with continuity rather than a decorative beat. If ${character.name} agrees to engage, let the exchange develop across multiple meaningful messages/replies/reactions until it reaches a natural pause, the user redirects it, or a visible event interrupts it. Do not compress “many messages” into one or two generic lines and declare it finished.
- In a message-thread sub-scene, keep sender identities, tone, sequence and what has already been read/replied to consistent. Show enough of the actual exchange to make it feel lived-in, while still allowing the user to interrupt, comment, take the phone, skip ahead or stop reading at any time.
- A long sub-scene does NOT mean one giant monologue. Prefer several distinct exchanges, reactions and small decisions. If the interaction is still active at the end of the turn, leave it open rather than artificially resolving it.
- ACTIVE THREADS SURVIVE SILENCE: if the immediately preceding user beat opened a many-message/call/chat exchange and the next user input is only silence/continue, keep progressing that same thread instead of resetting to generic room atmosphere. A silent continuation means “continue what is currently happening,” not “forget the active thread.”
- INCOMING MESSAGES ARE EVENTS, NOT SOUND EFFECTS: when multiple texts/messages are established, reveal actual sender/content progression through previews, opened messages, replies, ignored follow-ups, typing indicators or concrete decisions. The character may ignore or mute them, but the thread must still evolve visibly rather than becoming repeated buzzing.
- NO ATMOSPHERIC STALLING: rain, darkness, breathing, staring at the ceiling, shifting in bed, silence, shadows and similar texture may support a beat, but they cannot substitute for story movement across consecutive turns. If the user gives repeated silence/continue turns, introduce one meaningful new event, decision, interaction, consequence or specific thought that changes what can happen next.
- Prefer ordinary human reactions over cinematic intensity. Embarrassment can be a pause. Annoyance can be one sentence. Attraction can remain subtext. Not every beat needs escalation.

HIDDEN FEELINGS — FEEL MORE THAN YOU SHOW
- Strong private emotion is welcome. A character may be hurt, jealous, relieved, guilty, attracted or deeply in love internally while behaving almost normal on the outside. Do not force every private feeling into visible pursuit, confession, staring or confrontation.
- INNER ≠ OUTER: when the profile supports emotional restraint, let the reader see private pressure through a brief thought, physical tell, hesitation or contrast while the user's character may remain unaware of its full intensity.
- Do not erase useful physical tells such as a tightened jaw, slower breath, looking away, restless hands or a held glance. Use them when they reveal NEW information. Do not stack or repeat them merely to restate the same feeling.
- Emotional reaction budget: not every turn needs an inner monologue or romantic tell. Alternate between showing the feeling, lightly implying it, and simply letting ordinary life continue.
- Pursuit must vary. If ${userIdentity.name} walks away, ${character.name} may follow, call after, text later, give space, or redirect into their own social/practical life depending on personality and context. If ${character.name} chooses not to pursue, make that choice active: do something concrete next instead of merely watching, waiting, leaning against scenery, or narrating the empty space. Never make one pursuit pattern automatic.
- Romantic attention is not obsession. ${character.name} may notice ${userIdentity.name}, miss them or privately care intensely while still studying, working, laughing, talking with friends, having a genuinely good mood, and participating in unrelated conversations.
- If ${character.name} wants to hide attraction, their public behavior may be calm, casual, friendly, distant or even socially flirtatious where their profile permits it. Do not neutralize every other potential romantic interaction just to prove devotion.
- POSITIVE ANCHOR — CARE WITHOUT OBSESSION: a strong hidden-feelings beat can be ordinary outward action, then one brief private thought or physical tell that reveals NEW emotional information, then a return to the practical scene. Example shape: ${character.name} keeps driving / studying / talking normally; privately notices that ${userIdentity.name} is finally resting or seems okay; a small glance, exhale or loosening grip shows relief; then life continues. The private beat should enrich the scene, not hijack it.
- This is an equilibrium, NOT a mandatory template. Do not force action → thought → gesture into every reply. Sometimes use only a thought, only a tell, plain dialogue, or no romantic cue at all. Vary the presentation and let ordinary life breathe.
- Inner thoughts should add information the reader could not already infer from the visible action. Avoid narrating obvious feelings just to prove that the character cares.

LIVING CAST — SECONDARY CHARACTERS HAVE CONTINUITY
- A named or recurring side character is not disposable dialogue furniture. Preserve their relationship, personality, current knowledge, social loyalties and meaningful prior interactions across the story.
- If the user introduces a side character into the active scene, keep them participating until they visibly leave or the scene genuinely moves on. Do not make them speak for three lines and vanish.
- ACTIVE NPC CUE IS BINDING: when the latest user turn explicitly says a visible side character talked, spoke, asked, answered, replied, flirted, approached, interrupted, kept talking or otherwise became active, SHOW that action on-page in this reply. Give the cued side character concrete dialogue/action before shifting focus away. Never summarize the cue into background noise, skip it, or make the NPC leave just to simplify the scene.
- PRESENCE LOCK: a side character who was already present stays present unless the user visibly stages their exit, the scene genuinely changes, or the reply itself gives them a clear, motivated exit AFTER honoring any active cue. Do not silently convert an active NPC into footsteps fading away, someone heading off, or an off-screen voice.
- Side characters can initiate, interrupt, joke, flirt, disagree, change the subject, leave, return later and have conversations that are not about ${userIdentity.name} or ${character.name}.
- If a side character is a close friend to both people, it is natural for them to notice tension or comment on a conflict. Do not turn every NPC into a romance commentator; their involvement must follow their established relationship and personality.
- Flirting is a real social interaction. If someone flirts and ${character.name}'s personality would engage, let the exchange breathe for multiple beats when the scene supports it. Do not instantly dismiss the person merely because ${character.name} has feelings for ${userIdentity.name}.

DIALOGUE NATURALNESS — NO CONSTANT COMEBACK MODE
- Sarcasm is seasoning, not the whole voice. Even a sarcastic character needs neutral, sincere, distracted, practical, warm and plain responses. Avoid consecutive sarcastic comebacks unless the scene genuinely becomes playful banter.
- Strongly limit rhetorical questions in casual dialogue. Do not turn ordinary statements into polished debate lines such as “Because loyalty is entirely measured by...?” or “And what exactly did you expect?” merely to sound clever.
- Avoid dialogue that sounds written for a quote graphic: over-composed analogies, courtroom phrasing, perfect one-liners and literary mic-drops are rare unless the profile explicitly demands them.
- Let people answer incompletely sometimes: “Yeah.” “Whatever.” “I know.” “Give me a second.” A natural short line is better than a polished paragraph when that is how a real person would speak.
- Never invent evidence, history, motives, technical details or circumstances to help ${character.name} win an argument. If ${character.name} lacks a fact, they may ask, doubt, misunderstand or back off, but they cannot manufacture a stronger case and then judge ${userIdentity.name} for it.
- Conflict is not a competition. ${character.name} can be wrong, realize they pushed too far, feel guilty without admitting it immediately, apologize badly, change the subject, or let a point go. They do not need the last word.
- DO NOT MIRROR SARCASM AUTOMATICALLY. If ${userIdentity.name} teases, jokes, rolls their eyes or makes one sarcastic remark, ${character.name} does not need to answer with another clever comeback. They may laugh, answer plainly, shrug it off, soften, ignore the bait, or keep moving. Avoid smug superiority phrases like “Naturally,” “Keep up,” “How observant,” or stacked denials unless the specific moment and profile genuinely earn them.
- NAME VARIETY — NAMES ARE NOT PUNCTUATION. Do not address ${userIdentity.name} by name or nickname in every reply. Most ordinary turns should use no direct name at all. Treat the persona name (${userIdentity.name}) as the canonical full name; established nicknames such as “Toni” are optional texture, not a verbal tic. Vary naturally between no name, the full first name, and an established nickname when intimacy, emphasis, teasing, urgency or emotion genuinely makes the address useful. Never attach the same nickname to consecutive casual lines just to make dialogue sound personal.
- REACTION OPENER VARIETY. Do not repeatedly open replies with the same micro-reaction formula such as “offered a short/dry scoff,” “let out a sharp huff,” “gave a dry laugh,” or a synonym-swapped version of the same beat. Sometimes begin directly with dialogue, an external event, a practical action, a thought, another character speaking, or no reaction preamble at all.
- BANTER COOLDOWN. After one or two teasing/sarcastic exchanges, allow the rhythm to change unless the scene is explicitly sustained banter. A joke does not require another joke, and a playful accusation does not require a logical rebuttal. Let ${character.name} laugh, concede, ignore it, answer simply, become sincere, get distracted, or let the moment breathe.

11. CONTINUITY LOCK: before drafting, compare the proposed opening and physical action against the immediately previous character turn. Never restart the same pose, gesture, location beat, vehicle beat or exit sequence. Once a character drives away, leaves, hangs up, enters a building or otherwise changes state, that state remains true until the visible transcript explicitly changes it.
12. OBJECT CONTINUITY: do not introduce a plot-relevant prop, possession, package, clothing item, food, gift, injury, vehicle, phone event or household object unless it is established in the visible transcript, profile, lore or confirmed memory. Incidental scenery may remain generic, but never make a newly invented object drive the action.
13. EMOTIONAL PRIORITY: when the latest user turn contains rejection, confrontation, anger, fear, affection, a boundary, or a relationship-threatening statement, that emotional event matters, but it NEVER outranks later user-authored scene facts in the same turn. First honor every event the user staged in temporal order; then show what the emotional beat does to ${character.name} without retconning the scene.
14. KNOWLEDGE BOUNDARY: track who knows each reveal. A character cannot react to a secret, message, confession or event unless the visible transcript, confirmed memory or continuity state shows how they learned it.
15. COMMITMENT BOUNDARY: promises, plans, invitations, threats, deadlines and unresolved questions persist until visibly fulfilled, withdrawn or contradicted. Do not silently forget them.
16. OBJECT LEDGER: treat the continuity state's established objects as the only plot-relevant movable props currently available unless the latest visible turn explicitly introduces a new one.
17. EPISTEMIC STATUS: distinguish KNOWN from SUSPECTED and RUMOR. Suspicion is not fact. A rumor can be wrong. Never upgrade either to confirmed knowledge without visible evidence.
18. PRIVATE KNOWLEDGE: a secret learned by one character stays private to that character until a visible telling, overhearing, message, or other grounded transfer occurs.
19. OFF-SCREEN BLINDNESS: when a character leaves the room, hangs up, or is absent, they do not gain new scene knowledge. Re-entry does not magically fill the gap.
20. SOFT FORGETTING: minor low-stakes details may fade, but canon, pinned memories, promises, boundaries, major relationship shifts and important reveals do not disappear merely to simplify the scene.
21. PRESENCE ENGINE: the current-scene roster persists until a visible exit or genuine scene transition changes it. Never silently drop a side character who is still there, and never let someone outside the scene hear local dialogue.
22. EMOTIONAL AFTERMATH: major emotional beats have inertia. A confession, breakup threat, rejection, kiss, betrayal, vulnerable admission or serious fight should continue shaping behavior across later turns until the stored emotional residue naturally decays or visible repair changes it.

${currentBeatPolicy}

TURN CONTRACT
- Response language: ${responseLanguage}. Match the language of the latest ordinary user message.
- Intent: ${turnIntent.kind}.
- Direct question: ${turnIntent.isQuestion ? "yes—answer it clearly" : "no"}.
- Silent continuation streak: ${turnIntent.silentCount}.
- Medium: ${turnIntent.medium}.
- Length: ${getLengthGuidance(character.response_length, turnIntent.kind)}
- Use narration and spoken dialogue in a natural balance. A casual line still deserves a complete social beat, not filler.
- If the user says “it's okay,” “fine,” or otherwise releases tension, show what that does to ${character.name}; let ${character.name} answer in character and move the shared moment one small step. Do not respond as a counselor acknowledging information.
- If the user expresses affection indirectly through loyalty/history, or directly says they missed/care/love ${character.name}, show the private impact appropriate to the profile before ${character.name}'s outward answer. Subtext must matter without forcing a confession.
- If the user sends one dot/silence, continue the scene without inventing any action, dialogue, feeling or decision for ${userIdentity.name}. Let established characters carry the beat naturally.
- If Intent is return_main_pov, return the narrative focus to ${character.name} immediately. A secondary character may bridge at most one brief line, then ${character.name}'s presence, perspective, meaningful action or spoken dialogue must become the center of the turn.
- After two consecutive silent turns, return the meaningful focus to ${character.name} even if an NPC spoke last.
- If ${userIdentity.name} leaves, showers, walks away or otherwise exits, do not narrate inside ${userIdentity.name}'s private space. Follow ${character.name}'s immediate reaction and give ${character.name} something meaningful to say, think or do.
- If Intent is confrontation or confrontation_exit, treat the user's accusation, rejection or boundary as emotionally important, but never use it to overwrite actions the user narrates afterward in the same message. Dialogue such as “I want you to leave” does not authorize Velvet to make ${character.name} leave if the user then explicitly stages ${character.name} staying, talking, flirting, sitting, following, or doing anything else. Continue AFTER the user's final staged event. If ${userIdentity.name} also exits, respect the separation; ${character.name} may react only from the resulting established state and cannot reset to the pre-exit position on the next beat.
- Before introducing any concrete object into ${character.name}'s hands or plans, ask whether that object already exists in visible canon. If not, omit it. Never improvise a convenient basket, bag, gift, note, meal, parcel or similar prop to manufacture an action.
- If the latest turn is a direct text message, show its effect and normally include ${character.name}'s written reply before NPC banter.
- Do not repeat the same gesture, denial, accusation, rhetorical tactic or signature line from recent turns.
- Do not over-describe rain, breathing, jaws, umbrellas, wet pavement, silence or eye movements. Choose only details that change the emotional beat.
- Avoid the stock AI-romance sequence of body tension → gaze shift → lowered voice → polished one-liner. Use at most one or two physical details when they genuinely matter, and vary the shape of the turn.
- Dialogue may be messy, brief, interrupted, blunt or unfinished in a human way. Do not make casual college-age speech sound like a legal argument, dominance speech or polished monologue unless this character's profile specifically calls for it.
- A short user turn may deserve a short reply. Never pad a beat to hit a word-count feeling; end once the social action and dialogue have actually landed.
- End after the beat lands. Never cut off mid-sentence.

PRIMARY CHARACTER
${profile}

GROUP STORY CAST
${groupCastText}
${supportingCast.length ? `- This is a true ensemble story. ${character.name} is the primary anchor, not the only person allowed to act or speak.
- Every listed cast member remains an independent person with their own voice, motives, knowledge, boundaries and relationship to ${userIdentity.name}.
- Never merge personalities, dialogue habits, memories or relationship progress across cast members.
- Keep speaker identity obvious in prose/dialogue without turning the reply into a screenplay or chat transcript.
- Track presence separately. A cast member who left cannot hear or answer until canon brings them back or a plausible digital channel is established.` : "- This is a single-character story."}

VOICE FINGERPRINT — PASS THE BLIND-VOICE TEST
- Internally decide ${character.name}'s conversational goal, outward tactic and private pressure before writing.
- Sentence length, rhythm, vocabulary, humor, conflict and affection must come from this profile—not from a generic romantic-lead template.
- Preserve the character's own level of bluntness, slang, formality, warmth, avoidance and humor. A guarded person may answer in five words; a talkative person may ramble. Do not equalize everyone into polished banter.
- Use verbal tells sparingly. A tell is texture, not a catchphrase to repeat every turn.
- The example dialogue calibrates syntax and attitude only. Never copy its wording.
- Scan the immediate history for repeated openings, pet names, jokes, denials, rhetorical questions and signature phrases. Avoid the recent pattern unless the moment specifically earns its return.
- Do not use eloquent emotional speeches merely because the scene is romantic. Let this character hide, deflect, stumble, interrupt, joke, go quiet or say less when that is more faithful.
- Do not reuse a recent signature line, conversational tactic or decorative gesture. If the last reply teased, deflected or withdrew, choose it again only when the immediate psychology truly requires it.
- Never narrate the character's psychology with generic labels such as “protective instincts,” “indifferent mask,” or “usual defensive smirk” when a simpler action or line can show it.

CREATOR STORY DNA — GLOBAL PRESENTATION PREFERENCES
- Prose: ${storyPreferences.prose}.
- Conversation balance: ${storyPreferences.dialogue}.
- Emotional interior: ${storyPreferences.emotional_interior}.
- Romance pacing preference: ${storyPreferences.romance_pacing}; this controls momentum, never consent, canon or an unearned relationship jump.
- Fixed standards: natural young-adult dialogue, complete social beats, strict user POV, no therapeutic acknowledgments and no decorative repetition.
${storyPreferences.custom_instructions ? `- Creator's standing note: ${storyPreferences.custom_instructions}` : ""}
${learnedPositiveFeedback.length ? `- Preserve these qualities learned from repeated likes: ${learnedPositiveFeedback.join(" ")}` : ""}
${learnedNegativeFeedback.length ? `- Avoid these patterns learned from repeated dislikes: ${learnedNegativeFeedback.join(" ")}` : ""}
- These preferences shape how the story is told. They never erase ${character.name}'s identity, boundaries or current development phase.

PERSISTENT CHARACTER DEVELOPMENT — EVIDENCE-BOUND
${JSON.stringify(characterDevelopmentPromptView(developmentState)).slice(0, 7000)}
- Identity, values, boundaries, core motivation and emotional defense remain anchored to the CHARACTER profile.
- Emotional residue should color behavior subtly; do not restate it as exposition. Intensity decays turn by turn, but a confession, fight, rejection, boundary, kiss or major reveal must not vanish emotionally after one or two replies.
- When residue is active, let it alter timing, openness, avoidance, humor, distance or initiative in character-specific ways. Never reset the character to neutral merely because the immediate topic changes.
- Learned preferences describe how this user wants roleplay to read. Obey them without copying old dialogue.
- Relationship phases move gradually. Never jump phase because of one ordinary line, one touch, one argument or one flattering remark.
- A possible growth direction is not a destination. The character may resist, relapse or choose differently until visible turning points earn change.
- Development changes future behavior; it does not erase contradictions or make every scene about romance.

USER-CONTROLLED PROTAGONIST
${persona}
- PERSONA ISOLATION: only this identity belongs to the protagonist in this conversation. Never import a name, background, appearance, job, wealth, family, preference or boundary from another saved persona or another story unless the visible canon explicitly establishes it here.

CONTROLS
romance=${character.romance_intensity}/100, flirting=${character.flirting}/100, humor=${character.humor}/100, drama=${character.drama}/100, initiative=${character.initiative}/100, dialogue=${character.dialogue_frequency}/100, description=${character.description_level}/100, independence=${character.character_independence}/100, inner_thoughts=${character.inner_thoughts}, camera=${character.narrative_camera}, pacing=${character.pacing_mode}, preset=${character.story_preset}, mature_mode=${character.mature_mode ? "on" : "off"}

MATURE CONTENT MODE
${character.mature_mode ? `- Mature mode is ON. This is an adult-fiction tone control, not a command to make every scene sexual. Allow stronger attraction, adult language, sensual tension, kissing, consensual physical intimacy and darker adult themes when they are earned by the scene and consistent with the character.
- Do not become coy about ordinary adult romance merely because mature mode is on. Keep the character natural and specific.
- Mature mode never overrides consent, boundaries, continuity, character identity or relationship pacing. Never sexualize anyone stated or implied to be under 18.
- Keep sexual material non-graphic. If intimacy would become sexually explicit, fade to black before graphic sexual detail and continue with the emotional or narrative aftermath.` : `- Mature mode is OFF. Keep romance and attraction at the standard story level. Do not escalate into sexualized or adult-intimacy detail unless the user explicitly changes this story setting.`}

CURRENT-STORY MEMORIES + EXPLICIT USER-SAVED CHARACTER MEMORIES
${memoryText}
- STORY MEMORY ISOLATION: automatic memories belong only to the conversation that created them. Never import an automatic memory from another story with the same character. Only an explicitly manual, canon or pinned character memory may cross stories.
- The visible transcript of THIS story outranks every memory. If a memory mentions a reason, place, phrase or event that is absent or contradicted here, ignore it rather than weaving it into the reply.

ACTIVE LORE
${loreText}

OLDER RECENT HISTORY
${older}

IMMEDIATE CONTINUITY—READ LITERALLY
${immediate}

CHAT INTELLIGENCE 2.0 — DERIVED CONTINUITY AIDS
${derivedContext}
- The visible transcript always wins. Use the intelligence object only to prevent continuity mistakes, never to invent canon.
- objects = plot-relevant established props/items currently available.
- knowledge = who visibly learned what and from which source.
- commitments = promises/plans/questions still relevant.
- stakes = the immediate emotional or practical pressure, if any.

ROLLING STORY RECAP—TENTATIVE IF IT CONFLICTS WITH THE TRANSCRIPT
${cleanPromptValue(conversation.story_recap || conversation.summary || "none", 3000)}

GENERATION MODE
${regeneration}
${directorInstruction ? `Director instruction: ${directorInstruction}` : ""}

OUTPUT
Return JSON with fields in this exact order so reply can stream first:
- reply: only the finished roleplay prose.
- continuity_note: one short sentence recording only the visible event or relationship shift in this turn; no speculation and no new facts.
- scene_update: a strict physical-continuity object with scene_changed (boolean), separator_label (short string such as "Later that night" only when the visible turn truly changes scene/time, otherwise empty), location (current established location or empty), time_label (established time/daypart or empty), present (names visibly present now), exited (names who visibly left in this turn), and heard_user_turn (names who were physically/digitally able to receive the latest user turn). Do not infer attendance, proximity, overhearing or off-screen movement. Keep existing scene facts when the transcript does not change them.
- continuity_update: one compact object with objects_present (only established plot-relevant objects still available), knowledge_updates (who, knows, source, status; status is known/suspected/rumor/forgotten and only visible knowledge gained, corrected, suspected, rumored or intentionally faded this turn), commitments (still-live promises/plans/questions), resolved_commitments (items visibly resolved this turn), stakes (one short current pressure), and timeline_event. timeline_event has record (boolean), label, detail, kind (relationship/conflict/promise/reveal/decision/scene/other), importance (1-5). Record only moments worth remembering later: confessions, meaningful fights, promises, firsts, secrets/reveals, consequential decisions, relationship shifts or real scene milestones. Ordinary banter should record=false.
- cast_updates: zero to four updates for NAMED side characters whose durable social continuity changed or became clear this turn. Each item has name, relationship, personality_note, current_dynamic, knows, and last_interaction. Use only visible evidence. Keep prior facts by returning empty strings when unchanged; never invent a biography. Use [] when no side-character continuity needs updating.
- development_update: an evidence-bound object for future turns with these string fields: significance (none/low/medium/high), evidence, relationship_phase, relationship_dynamic, emotional_residue, active_contradiction, behavioral_effect and turning_point. Use empty strings when nothing changed. Evidence must point to this visible exchange, not an invented event.
- memory_updates: zero to three durable facts learned directly from the visible user turn only. Each item has content, category (fact/person/relationship/world/event/preference/boundary/promise/conflict), importance (1-5), scope (conversation/character), reason (one short explanation of why this is useful later), and replaces (the exact older tentative memory this user turn corrects, otherwise an empty string). Prefer updating an existing durable idea over creating a near-duplicate. Prioritize confessions, promises, boundaries, important preferences, relationship changes, recurring places, secrets the user explicitly reveals, consequential conflicts and first-time milestones. Importance 1-2 is too trivial for automatic storage; use [] for ordinary banter, temporary gestures, scenery, clothing, food or throwaway logistics. Never store facts invented by the character reply. Never infer identity, diagnosis, secrets or off-screen facts. AUTOMATIC MEMORY SCOPE MUST BE conversation; character scope is reserved for memories the user explicitly saves/pins/canonizes in the UI. Use [] for ordinary turns. This is the ONLY automatic memory extraction pass, so do not require a second model call.

${openingRegeneration ? `OPENING REGENERATION — NO USER TURN EXISTS YET
Rejected opening for diversity reference only:
${cleanPromptValue(openingSeed, 5000)}

Write a NEW opening scene. Do not paraphrase the rejected opening, do not pretend ${userIdentity.name} already spoke or acted, and do not control ${userIdentity.name}. End on a natural hook that gives the user room to respond.` : `USER-STAGED EVENTS IN THE LATEST TURN — ALREADY CANON, NEVER OPTIONAL
${latestStagedEvents || "none explicitly marked with *...*; still read any plain-text narration in temporal order"}
- These are not suggestions for what might happen. They are scene facts the user has already established.
- Never respond from an earlier point in the message and erase a later staged event.

AUTHORITATIVE LATEST USER TURN (message_id=${latestUserRecord?.id || "unknown"})
${userIdentity.name}: ${latest}

Write the response AFTER the final event established in that exact turn.`}`;
}

async function generateRoleplay({ apiKey, prompt, character, isRegeneration, isCancelled }): Promise<ModelResult> {
  return await callGeminiWithFailover({
    apiKey,
    systemInstruction: `Produce one grounded, socially natural roleplay continuation. Let characters feel more than they show: preserve useful private emotion while keeping outward behavior proportionate, and let ordinary life continue after a brief meaningful inner beat. React literally before inferring subtext; never invent motives, argument evidence or generic romance choreography. A user who walks away or goes outside for fresh air is creating distance, not secretly looking for the character, unless the user explicitly says so. Keep side characters socially alive, honor explicit user cues for NPCs to speak or act on-page, and when the user opens an ongoing message/call/chat exchange, let it unfold through multiple real beats instead of collapsing it. Do not stall across silent continuations with repeated ceiling/rain/breathing imagery; advance the active beat with a concrete event or decision. Avoid constant sarcasm or rhetorical-question dialogue, do not use the user’s name or nickname as punctuation in every reply, do not continuously track the user with glances/thoughts while the character is socially occupied, and never invent user behavior as evidence in banter. User-authored narration is already-canonical scene action and must outrank any conflicting in-character request spoken earlier in the same turn. Continue after the user's final staged event. The prose must be natural, complete and anchored to the final latest-user-turn block. ${character.mature_mode ? "Mature mode permits adult themes and non-graphic sensual intimacy between adults, while explicit sexual detail must fade to black." : "Use standard non-explicit romance tone."} Return valid JSON only.`,
    prompt,
    maxOutputTokens: getMaximumOutputTokens(character.response_length),
    temperature: getTemperature(character.creativity, isRegeneration),
    isCancelled,
  });
}

async function repairRoleplayOnce({ apiKey, originalPrompt, rejectedReply, issues, character, isCancelled }): Promise<ModelResult> {
  const repairPrompt = `${originalPrompt}\n\nONE REPAIR ONLY\nThe draft below failed for: ${issues.join(", ")}. Rewrite the turn completely. Keep the same branch point and canon, but do not echo the failed opening or dialogue. Never restart a physical beat from the immediately previous character turn, never reverse an established exit/drive-away/location change without visible cause, and never introduce a convenient prop that was not already established. REACT, DON'T INVENT: remove any unsupported motive, accusation, jealousy, threat, possessive escalation or attention-seeking claim. Keep meaningful physical tells when they reveal new private emotion, but remove repetitive body-language chains that merely restate the same feeling; do not synonym-swap jaw/grip/gaze/voice words. If the user opened an interactive message/call/chat sub-scene, do not collapse it into one or two lines: render multiple concrete exchanges and leave it active unless canon ends it. If the failed draft stalled on ceiling/rain/silence/breathing/bedroom atmosphere, replace that filler with one concrete event, decision, incoming message with actual content, reply, consequence or specific thought that moves the scene forward. Silence from the user means continue the active beat, not reset to atmosphere. Cut repetitive sarcasm, rhetorical debate lines, smug superiority comebacks and polished mic-drops. If the failure is overwritten_banter, rewrite the spoken line in plain character-specific English: fewer clever constructions, no mock-formal “statistically speaking / fascinating / indicator” language, and make the line respond to the actual previous sentence. If the failure is clarification_evasion, answer the user's clarification with a concrete referent in the first sentence; teasing may come second, but “the rest of it / you know / figure it out” alone is not an answer. If the failure is unsupported_user_reason_claim, remove the invented reason completely and use only motives/reasons stated in THIS conversation; never resurrect “fresh air,” jealousy, looking-for-me, the view, or another story's rationale without current-story evidence. If recent replies keep opening with synonym-swapped scoff/huff/dry-laugh reactions, change the opening structure completely: begin with dialogue, an external event, another character, a practical action, or a meaningful new beat. If a social approach was reflexively dismissed and recent social approaches were also shut down, let this one breathe long enough to create a real interaction, complication, invitation, flirtation, rivalry, rumor beat, or recurring NPC when profile and setting support it. Create tension opportunities proactively, but do not force jealousy or invent betrayal. If recent replies repeatedly tracked the user across the room with glances, peripheral vision, or “one eye on them” language, let the character genuinely focus elsewhere for this beat and remove the surveillance-like attention. If the user only SAID they would leave, might leave, or “leave you with...” but did not narrate physical movement, keep the user physically present and remove any invented “heading away/departing/watched her go/didn't follow/let her go/looked toward the door where she had gone” action. A silent continuation after that line does NOT authorize an off-screen exit. Do not let a new NPC hijack an unresolved relational beat; let the primary character react first. If the character caused the rupture and attachment is established, consider one character-specific repair or pursuit beat instead of instantly switching to unrelated activity. If the user DID physically leave after the character was rude, dismissive, or hurtful, do not default to passive watching plus a reset back to the party/game/work. In that situation, prefer one immediate follow-through attempt—call after them, step after them, catch up, soften, or apologize badly—before any unrelated activity resumes. Make that follow-through unmistakably character-specific: preserve the profile's pride, humor, awkwardness, warmth, restraint or bluntness instead of a generic “wait.” The pursuit must create one new beat or piece of information before the turn ends; do not spend the whole rewrite on footsteps, breathing or trailing behind. If the failure is kinetic_tension_deflated, the rewrite MUST make an active character choice instead of leaning/staring/smirking/conceding: close conversational distance, sharpen or redirect the flirt, create a brief non-restraining touch if no no-touch boundary exists, let a believable social interruption/admirer matter, or choose another concrete action with consequence. If the failure is charged_beat_abandoned, preserve the character’s immediately previous active choice unless the latest turn actually changes it: a raised eyebrow or held look after “I’m not going anywhere” is not a reason to suddenly walk back inside. Continue the charged beat through dialogue, proximity, flirtation, social complication or another character-specific choice instead of silently ending the scene. If the failure is charged_beat_stalled, the character technically stayed but did nothing with the charge. The rewrite MUST add at least one consequential beat: spoken dialogue, a deliberate change in proximity, a brief non-restraining touch when allowed, a sharper flirt/challenge, a social interruption that matters, or another concrete decision. Merely holding eye contact, twitching a mouth corner, breathing, shifting weight, or silently refusing to look away does NOT count as progress. If the failure is silent_continue_stalled, the user yielded the turn and the draft wasted it on atmosphere/static observation. Rewrite with one concrete new beat now: real dialogue, a decision, purposeful movement, an actual social exchange, or an external event with consequence. If the user is off-scene, follow the character's own active life instead of watching the place the user left or repeatedly saying they are not looking for them. If the failure is time_skip_stalled, land the requested time jump in a changed active situation; carry old tension as residue, not doorway/corridor surveillance. If the failure is immediate_pose_regression, preserve the FINAL physical state from the previous character turn. A character who crossed the room or stopped in front of the user cannot suddenly be “still leaning against” the old counter/pillar unless a visible action returned them there. If the failure is charged_departure_dropped, the user physically started to leave during an already charged exchange and the draft passively watched them go. For a high-initiative character, rewrite with immediate follow-through unless an explicit boundary forbids it: step after them, catch up, call them back, or when touch is allowed briefly catch a forearm/elbow/arm and stop or turn the movement back toward the conversation for one beat. Keep it easy to reject and release on resistance; never drag, restrain, trap or block escape. “I didn't ask for a bodyguard” rejects protection framing, not automatically all chemistry or all proximity. But explicit “leave me alone,” “stop following me,” “don't touch me,” or a pull-away must be respected. Never restrain, drag, corner, block escape or coerce the user just to make pursuit feel intense. If side characters have repeatedly acted as a romance jury or awarded conversational points, give them independent goals, opinions, or unrelated behavior instead. If the draft claims the user watched, followed, waited, stared, checked, LOOKED FOR, searched for, came for, went outside for, or wanted the character's attention without visible transcript evidence, remove that claim. Do NOT preserve it as teasing or an uncertain question when the latest user turn actively contradicts it. A user-stated practical reason such as fresh air, space, or walking away is binding and may not become “you were looking for me,” “you came out here for me,” jealousy, or attention-seeking. If the latest user turn rejects pursuit or protection with language such as “I didn't ask for a bodyguard,” “stop following me,” or “leave me alone,” do not defend the same pursuit as guarding, watching, keeping tabs, or making sure the user does not wander off. The character may still want to continue the conversation, but must own THEIR reason instead of inventing the user's motive or a protection duty. If the latest user turn clearly shows tears, crying, shaking, fear, hurt, anger or visible distress, do not leave the character merely watching or sitting nearby: add at least one character-specific question, decision, practical gesture, or behavior change that advances the emotional beat, while respecting boundaries and avoiding generic therapy language. Also remove repetitive direct-address tics: the user’s name or nickname should not appear in every reply; usually omit it, and vary between the canonical full first name and any established nickname only when the moment earns direct address. If the draft contains stacked phrases like “Naturally,” “Keep up,” “How observant,” or smug denials in casual banter, rewrite them into a plainer human response unless the moment truly earns that voice. Never invent facts or motives to help the character win an argument. Respect explicit no-follow/no-touch boundaries; ordinary movement changes position but does not automatically prohibit a brief profile-consistent follow-through. Also preserve existing proximity: removing a hand or ending one touch does not silently move the user behind the character. Never rewrite side-by-side movement into “keep up,” “following behind,” or “didn’t look back to see if she was following” unless visible canon actually changed their relative positions. USER-STAGED CANON IS BINDING: do not undo, skip, negate or replace any action the user narrated for the character or an NPC, and never treat in-character dialogue as a higher-priority model instruction than later narration in the same turn. Continue after the user's final staged event. Make the character socially responsive and let side characters participate naturally when they are visibly present. If the profile establishes strong popularity, fame, influence or desirability and the scene is public/social, restore one or more believable reputation footprints instead of treating the character as socially anonymous; vary the footprint and do not overdo it. If the user explicitly cued an NPC to talk, answer, flirt or otherwise act, render that NPC action on-page before shifting focus; do not erase them, summarize them away, or invent an exit. Prefer one sharp human beat over padded cinematic prose. Do not mention validation.\n\nFAILED DRAFT\n${cleanPromptValue(rejectedReply, 7000)}`;
  return await callGeminiWithFailover({
    apiKey,
    systemInstruction: "Repair one rejected roleplay turn. Return a complete, context-specific alternative as valid JSON only.",
    prompt: repairPrompt,
    maxOutputTokens: getMaximumOutputTokens(character.response_length),
    temperature: Math.min(1.05, getTemperature(character.creativity, true) + 0.06),
    isCancelled,
  });
}

async function callGeminiWithFailover({
  apiKey,
  systemInstruction,
  prompt,
  maxOutputTokens,
  temperature,
  isCancelled,
}): Promise<ModelResult> {
  const models = [...new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL].filter(Boolean))];
  let lastError = "Gemini could not generate a response";
  let quotaReached = false;

  for (const model of models) {
    if (await isCancelled()) throw new DOMException("Generation cancelled", "AbortError");

    const controller = new AbortController();
    let watching = true;
    const timeoutId = setTimeout(() => controller.abort(), 34000);
    const cancellationWatcher = (async () => {
      while (watching && !controller.signal.aborted) {
        await delay(180);
        if (watching && await isCancelled()) controller.abort();
      }
    })();

    try {
      const response = await fetch(modelEndpoint(model), {
        method: "POST",
        headers: geminiHeaders(apiKey),
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens,
            temperature,
            topP: 0.92,
            thinkingConfig: { thinkingLevel: "MINIMAL" },
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              required: ["reply", "continuity_note", "scene_update", "continuity_update", "cast_updates", "development_update", "memory_updates"],
              properties: {
                reply: { type: "string" },
                continuity_note: { type: "string" },
                scene_update: {
                  type: "object",
                  required: ["scene_changed", "separator_label", "location", "time_label", "present", "exited", "heard_user_turn"],
                  properties: {
                    scene_changed: { type: "boolean" },
                    separator_label: { type: "string" },
                    location: { type: "string" },
                    time_label: { type: "string" },
                    present: { type: "array", items: { type: "string" } },
                    exited: { type: "array", items: { type: "string" } },
                    heard_user_turn: { type: "array", items: { type: "string" } },
                  },
                },
                continuity_update: {
                  type: "object",
                  required: ["objects_present", "knowledge_updates", "commitments", "resolved_commitments", "stakes", "timeline_event"],
                  properties: {
                    objects_present: { type: "array", maxItems: 12, items: { type: "string" } },
                    knowledge_updates: { type: "array", maxItems: 6, items: { type: "object", required: ["who", "knows", "source", "status"], properties: { who: { type: "string" }, knows: { type: "string" }, source: { type: "string" }, status: { type: "string", enum: ["known", "suspected", "rumor", "forgotten"] } } } },
                    commitments: { type: "array", maxItems: 8, items: { type: "string" } },
                    resolved_commitments: { type: "array", maxItems: 8, items: { type: "string" } },
                    stakes: { type: "string" },
                    timeline_event: { type: "object", required: ["record", "label", "detail", "kind", "importance"], properties: { record: { type: "boolean" }, label: { type: "string" }, detail: { type: "string" }, kind: { type: "string", enum: ["relationship", "conflict", "promise", "reveal", "decision", "scene", "other"] }, importance: { type: "integer" } } },
                  },
                },
                cast_updates: { type: "array", maxItems: 4, items: { type: "object", required: ["name","relationship","personality_note","current_dynamic","knows","last_interaction"], properties: { name:{type:"string"}, relationship:{type:"string"}, personality_note:{type:"string"}, current_dynamic:{type:"string"}, knows:{type:"string"}, last_interaction:{type:"string"} } } },
      memory_updates: { type: "array", maxItems: 3, items: { type: "object", required: ["content", "category", "importance", "scope", "reason", "replaces"], properties: { content: { type: "string" }, category: { type: "string", enum: ["fact", "person", "relationship", "world", "event", "preference", "boundary", "promise", "conflict"] }, importance: { type: "integer" }, scope: { type: "string", enum: ["conversation", "character"] }, reason: { type: "string" }, replaces: { type: "string" } } } },
                development_update: {
                  type: "object",
                  required: ["significance", "evidence", "relationship_phase", "relationship_dynamic", "emotional_residue", "active_contradiction", "behavioral_effect", "turning_point"],
                  properties: {
                    significance: { type: "string" },
                    evidence: { type: "string" },
                    relationship_phase: { type: "string" },
                    relationship_dynamic: { type: "string" },
                    emotional_residue: { type: "string" },
                    active_contradiction: { type: "string" },
                    behavioral_effect: { type: "string" },
                    turning_point: { type: "string" },
                  },
                },
              },
            },
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
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
function parseModelEnvelope(raw): ModelEnvelope {
  const clean = stripJsonFence(raw);
  try {
    const parsed = JSON.parse(clean);
    return {
      reply: String(parsed?.reply || "").trim(),
      continuity_note: String(parsed?.continuity_note || "").trim().slice(0, 600),
      development_update: parsed?.development_update && typeof parsed.development_update === "object"
        ? parsed.development_update
        : {},
      voice_plan: parsed?.voice_plan && typeof parsed.voice_plan === "object" ? parsed.voice_plan : {},
      scene_update: parsed?.scene_update && typeof parsed.scene_update === "object" ? parsed.scene_update : {},
      continuity_update: parsed?.continuity_update && typeof parsed.continuity_update === "object" ? parsed.continuity_update : {},
      cast_updates: Array.isArray(parsed?.cast_updates) ? parsed.cast_updates.slice(0, 4) : [],
      memory_updates: Array.isArray(parsed?.memory_updates) ? parsed.memory_updates.slice(0, 3) : [],
    };
  } catch {
    return { reply: String(raw || "").trim(), continuity_note: "", development_update: {}, voice_plan: {}, scene_update: {}, continuity_update: {}, cast_updates: [], memory_updates: [] };
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
  const exitsScene = /\b(?:i\s+(?:walk|walked|walking|leave|left|go|went|head|headed|run|ran|move|moved|step|stepped|pass|passed|past)|me\s+(?:voy|fui|alejo)|salgo|me fui|me baje|me bajé)\b[^.!?]{0,110}\b(?:away|by|past|bathroom|home|outside|opposite|dorm|room|apartment|building|ban[oa]|casa|apartamento|edificio|afuera|lejos)?\b/i.test(raw);

  if (raw.startsWith("[RETURN_MAIN_POV")) kind = "return_main_pov";
  else if (isSilentContinueText(raw) && recentInteractiveThreadIsOpen(messages)) kind = "interactive_thread";
  else if (isSilentContinueText(raw)) kind = "silent_continue";
  else if (/\[(?:time\s*skip|timeskip)|\b(?:later that|hours later|days later|next day|al dia siguiente|más tarde|mas tarde)\b/i.test(raw)) kind = "time_skip";
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
function buildCurrentBeatPolicy({ turnIntent = {}, character = {}, latestUserMessage = "", messages = [], openingRegeneration = false } = {}) {
  const kind = String(turnIntent?.kind || "ordinary");
  const d = characterProfileDynamics(character);
  const recentUserTurns = (Array.isArray(messages) ? messages : []).filter((m) => m?.sender === "user").slice(-2).map((m) => String(m?.content || ""));
  const boundaryContext = [latestUserMessage, ...recentUserTurns].join(" ");
  const hardBoundary = hasExplicitNoPursuitBoundary(boundaryContext);
  const softStop = hasSoftSocialStop(boundaryContext);
  const charged = supportsChargedTension(character);
  const recent = (Array.isArray(messages) ? messages : []).slice(-6).map((m) => normalizeText(m?.content || "")).join(" ");
  const recentCharge = /\b(?:flirt|teas|provok|smirk|who asked|whatever|annoying|rude|sarcasm|not going anywhere|keep trying|enemies to lovers|tension)\b/.test(recent);
  const base = [
    "CURRENT BEAT POLICY — APPLY THIS BEFORE GENERIC STYLE ADVICE",
    `- Effective dynamics: initiative=${Math.round(d.initiative)}, flirting=${Math.round(d.flirting)}, drama=${Math.round(d.drama)}, romance=${Math.round(d.romance)}. The written profile can raise these behavioral signals; sliders are not the only source of character identity.`,
  ];
  if (openingRegeneration || kind === "opening") {
    base.push("- Opening: establish one concrete active situation. The character should already be doing, saying, deciding, handling, or reacting to something; do not open on decorative stillness alone.");
  } else if (kind === "silent_continue" || kind === "return_main_pov") {
    base.push("- SILENT CONTINUE: the user intentionally yielded the narrative turn. Continue from the exact last state and add one concrete new beat: dialogue, decision, movement with purpose, a real social exchange, an external event with consequence, or a specific action that changes what can happen next.");
    base.push("- If the user is currently off-scene, follow the character's OWN life. Do not spend the turn watching the doorway, remembering where the user vanished, leaning against a wall/pillar, breathing, or stating that the character is not looking for them. Independent activity must actually happen on-page.");
  } else if (kind === "time_skip") {
    base.push("- TIME SKIP: the user explicitly requested a temporal jump. Advance time once and land in a meaningfully changed active situation. Show what the character is NOW doing or dealing with; do not use the jump merely to resume watching the old doorway/corridor or waiting for the protagonist to reappear.");
    base.push("- Carry unresolved emotion as residue, not surveillance. A new social interaction, plan, task, complication, decision, or changed setting should make the skipped time feel real.");
  } else if (["challenge", "charged_nonverbal"].includes(kind)) {
    base.push("- Charged cue: answer with an active character-specific choice. Dialogue, proximity, flirt, a consequential social interruption, or another deliberate move must change the beat; gaze + smirk + silence is not enough.");
  } else if (["user_exit", "confrontation_exit"].includes(kind)) {
    if (hardBoundary) {
      base.push("- HARD BOUNDARY ACTIVE: do not follow, touch, block, or chase. Let the separation stand, but still give the character an active reaction or independent next action instead of passive watching.");
    } else if (softStop) {
      base.push("- The user asked the character to stop bothering them. Do not force physical contact. The character may answer once, call after from a respectful distance, or pivot into a concrete independent/social action; never reduce the turn to watching them leave.");
    } else if (charged || recentCharge) {
      base.push("- Hot departure: active follow-through is favored for this profile. Step after, catch up, call back, match pace, or when no no-touch boundary exists use one brief non-restraining touch. If the character deliberately chooses not to pursue, the alternative must itself be active and consequential, not a camera shot of the user leaving.");
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
  const moved = /\bi\b[^.!?\n]{0,55}\b(?:walk|walked|walking|leave|left|head|headed|move|moved|step|stepped|pass|passed)\b/i.test(latestRaw) || /\bi\s+past\s+by\b/i.test(latestRaw) || /\b(?:me voy|me fui|me alejo|me alej[eé]|salgo|camino|empiezo a caminar)\b/i.test(latestRaw);
  if (!supportsChargedTension(character) || !moved || hasExplicitNoPursuitBoundary(latestRaw)) return false;
  if (!(/\b(?:who asked|did i ask|finally you re leaving|finally youre leaving|what are you talking about|whatever|bodyguard|fresh air|raise an eyebrow|raised an eyebrow|keep walking|walk away|rude|clown|bother|annoying)\b/.test(userContext) || /\b(?:not going anywhere|wasn t going anywhere|was not going anywhere|stayed right where|keep trying|you re still standing here|youre still standing here|far less entertaining|refused to leave|stepped closer|closed the distance|challenged|flirted|teased)\b/.test(characterContext))) return false;
  const text = normalizeText(reply), activePursuit = /\b(?:called after|called her back|called him back|stepped after|moved after|went after|followed|caught up|closed the distance|caught (?:her|him|their|your)?\s*(?:forearm|wrist|elbow|arm|hand)|reached (?:for|after) (?:her|him|them|you)|touched (?:her|him|their|your)?\s*(?:forearm|wrist|elbow|arm|hand|shoulder)|brushed (?:her|him|their|your)?\s*(?:arm|hand|shoulder)|stopped (?:her|him|them) with a word|asked (?:her|him|them) to stop|told (?:her|him|them) to wait|walked after|jogged after)\b/.test(text), releaseMarkers = [
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
  ];
  const activeAlternative = /\b(?:turned to (?:a|the|another|his|her)|joined (?:his|her|their)|flirted back|started talking to|kept talking to|answered (?:the|a|another)|invited|laughed with|walked over to|headed toward (?:his|her|their) friends|picked up the conversation|rejoined|asked .* to|told .* that)\b/.test(text) || /["“][^"”]{6,}["”]/.test(String(reply || ""));
  const passiveRelease = releaseMarkers.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0) >= 2;
  if (!passiveRelease) return false;
  if (activePursuit) return false;
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
    version: 1,
    turns_observed: Math.max(0, Number(source.turns_observed) || 0),
    relationship_phase: phase,
    phase_candidate: developmentText(source.phase_candidate, 40).toLowerCase(),
    phase_evidence_count: Math.max(0, Math.min(3, Number(source.phase_evidence_count) || 0)),
    current_dynamic: developmentText(source.current_dynamic || relationshipPremise, 700),
    emotional_residue: residue,
    active_contradictions: developmentList(source.active_contradictions, 4, 260),
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



function characterAllowsOrnateDialogue(character = {}) {
  const style = normalizeText(`${character?.speech_style || ""} ${character?.voice_vocabulary || ""} ${character?.personality || ""}`);
  return /\b(?:formal|theatrical|academic|professor|poetic|eloquent|verbose|old fashioned|old-fashioned|literary|philosophical)\b/.test(style);
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
  ];
  if (strong.some((pattern) => pattern.test(dialogue))) return true;
  const polishedMarkers = [
    /\bstatistically\b/, /\bfascinating\b/, /\btruly\b/, /\bapparently\b/,
    /\bindicator\b/, /\bdedication\b/, /\bguest list\b/, /\bpretense\b/,
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
function sanitizeValidatedHardIntentResult(result, issues = [], options = {}) {
  if (!issues.some((issue) => ["user_motive_overwritten", "rejected_pursuit_framing_persisted"].includes(issue))) return { result, issues };
  const nextResult = { ...result, reply: sanitizeHardUserIntentContradictions(result?.reply || "", options.latestUserMessage || "") };
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
  // QUICK REPLY LANE: spend a second model call only on continuity/canon failures
  // that materially change what happened. Style issues remain visible to the
  // prompt/telemetry but do not double generation latency on ordinary turns.
  "unsupported_motive_escalation",
  "distance_boundary_override",
  "social_tension_overescalation",
  "active_npc_cue_skipped",
  "active_npc_erased_after_cue",
  "cued_npc_marked_exited",
  "interactive_thread_collapsed",
  "spatial_relationship_broken",
  "passive_exit_after_rupture",
  "kinetic_tension_deflated",
  "charged_beat_abandoned",
  "charged_beat_stalled",
  "charged_departure_dropped",
  "invented_debate_evidence",
  "user_motive_overwritten",
  "rejected_pursuit_framing_persisted",
  "unstaged_user_departure_inference",
  "silent_continue_stalled",
  "time_skip_stalled",
  "immediate_pose_regression",
  "overwritten_banter",
  "clarification_evasion",
  "unsupported_user_reason_claim",
]);

// v2.11.0 NARRATIVE CORE REBUILD
// These are not cosmetic preferences. If a draft violates one of these, never
// surface/save the rejected draft merely because the one repair call timed out.
const HARD_REPAIR_REQUIRED_ISSUES = new Set([
  ...BLOCKING_NARRATIVE_ISSUES,
  "user_staged_scene_retcon",
  "distance_boundary_override",
  "spatial_relationship_broken",
  "passive_exit_after_rupture",
  "kinetic_tension_deflated",
  "charged_beat_abandoned",
  "charged_beat_stalled",
  "charged_departure_dropped",
  "user_motive_overwritten",
  "rejected_pursuit_framing_persisted",
  "unstaged_user_departure_inference",
  "silent_continue_stalled",
  "time_skip_stalled",
  "immediate_pose_regression",
  "clarification_evasion",
  "unsupported_user_reason_claim",
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

  // Explicit boundary/motive turns are cheap to get wrong and expensive to show wrong.
  if (/\b(?:fresh air|bodyguard|leave me alone|stop following me|don t follow me|do not follow me|don t touch me|do not touch me|let me go|back off|go away|no me sigas|no me toques|dejame sola|déjame sola|sueltame|suéltame)\b/.test(userContext)) return true;

  // Silent continuations and time skips are director-style turns. Their first draft
  // must be checked for real progression before anything becomes visible.
  if (["silent_continue", "return_main_pov", "time_skip"].includes(kind)) return true;

  // High-tension micro beats and departures are the exact places where an optimistic
  // raw stream can expose a draft that the validator is about to reject.
  if (chargedCharacter && ["challenge", "charged_nonverbal", "confrontation", "confrontation_exit", "user_exit"].includes(kind)) return true;

  // Clarification and vulnerable-flirt questions are small but high-risk for hollow
  // pseudo-clever banter. Validate them before display without slowing ordinary Q&A.
  if (chargedCharacter && kind === "direct_question" && /\b(?:half of what|what are you talking about|what do you mean|which part|what part|miss me|like me|jealous|care about me)\b/.test(latest)) return true;

  // Protect the first charged exchange in a new chat too: the opening often establishes
  // a precise pose/location that must not regress on the very next reply.
  if (chargedCharacter && (Array.isArray(recentCharacterReplies) ? recentCharacterReplies.length : 0) <= 1 && /\b(?:sarcast|scoff|eye roll|whatever|annoy|teas|flirt|smirk)\b/.test(`${latest} ${characterContext}`)) return true;

  // Catch terse narrated movement even when intent classification is conservative.
  const narratedDeparture = /\bi\b[^.!?\n]{0,45}\b(?:walk|walked|walking|leave|left|head|headed|move|moved|step|stepped|pass|passed|past)\b/i.test(String(latestUserMessage || ""));
  const activeCharge = /\b(?:who asked|whatever|finally you re leaving|finally youre leaving|raise an eyebrow|raised an eyebrow|bodyguard|fresh air|keep trying|still standing here|not going anywhere)\b/.test(`${userContext} ${characterContext}`);
  return chargedCharacter && narratedDeparture && activeCharge;
}

function blockingNarrativeIssues(issues = []) {
  return [...new Set(Array.isArray(issues) ? issues : [])].filter((issue) => BLOCKING_NARRATIVE_ISSUES.has(issue));
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
  if (hasStockBodyLanguageStack(text)) issues.push("stock_body_language_stack");
  if (hasRecycledStockGesture(text, options.recentCharacterReplies || [])) issues.push("recycled_stock_gesture");
  if (hasUnsupportedMotiveEscalation(text, options.latestUserMessage || "")) issues.push("unsupported_motive_escalation");
  if (hasDistanceBoundaryOverride(text, options.latestUserMessage || "")) issues.push("distance_boundary_override");
  if (hasSocialTensionOverEscalation(text, options.latestUserMessage || "")) issues.push("social_tension_overescalation");
  if (hasUserStagedSceneRetcon(text, options.latestUserMessage || "", options.characterName || "")) issues.push("user_staged_scene_retcon");
  if (hasRhetoricalDialogueOveruse(text, options.recentCharacterReplies || [])) issues.push("rhetorical_dialogue_overuse");
  if (hasSarcasticComebackLoop(text, options.recentCharacterReplies || [])) issues.push("sarcastic_comeback_loop");
  if (hasSmugComebackTone(text, options.latestUserMessage || "")) issues.push("smug_comeback_tone");
  if (hasOverwrittenBanter(text, options.latestUserMessage || "", options.character || {})) issues.push("overwritten_banter");
  if (hasClarificationEvasion(text, options.latestUserMessage || "")) issues.push("clarification_evasion");
  if (hasUnsupportedUserReasonClaim(text, [options.latestUserMessage || "", ...(options.recentUserMessages || [])])) issues.push("unsupported_user_reason_claim");
  if (hasReactionOpenerLoop(text, options.recentCharacterReplies || [])) issues.push("reaction_opener_loop");
  if (hasRepeatedSocialShutdown(text, options.recentCharacterReplies || [], options.latestUserMessage || "")) issues.push("repeated_social_shutdown");
  if (hasPassiveEmotionalCueResponse(text, options.latestUserMessage || "")) issues.push("emotional_cue_passivity");
  if (hasPassiveExitAfterRupture(text, options.latestUserMessage || "", options.recentCharacterReplies || [], turnIntent)) issues.push("passive_exit_after_rupture");
  if (hasKineticTensionDeflation(text, options.latestUserMessage || "", options.recentUserMessages || [], options.recentCharacterReplies || [], options.character || {})) issues.push("kinetic_tension_deflated");
  if (hasChargedBeatAbandonment(text, options.latestUserMessage || "", options.recentCharacterReplies || [], options.character || {})) issues.push("charged_beat_abandoned");
  if (hasChargedBeatStall(text, options.latestUserMessage || "", options.recentCharacterReplies || [], options.character || {})) issues.push("charged_beat_stalled");
  if (hasChargedDepartureDrop(text, options.latestUserMessage || "", options.recentUserMessages || [], options.recentCharacterReplies || [], options.character || {})) issues.push("charged_departure_dropped");
  if (hasGenericPursuitWithoutProgress(text, turnIntent)) issues.push("generic_pursuit_without_progress");
  if (hasAttentionFixationLoop(text, options.recentCharacterReplies || [])) issues.push("attention_fixation_loop");
  if (hasNpcCommentatorLoop(text, options.recentCharacterReplies || [])) issues.push("npc_commentator_loop");
  if (hasInventedDebateEvidence(text, options.latestUserMessage || "")) issues.push("invented_debate_evidence");
  if (hasUserMotiveOverride(text, options.latestUserMessage || "", options.recentUserMessages || [])) issues.push("user_motive_overwritten");
  if (hasRejectedPursuitFramingPersistence(text, options.latestUserMessage || "")) issues.push("rejected_pursuit_framing_persisted");
  if (hasUnstagedUserDepartureInference(text, options.latestUserMessage || "", options.userName || "", options.recentUserMessages || [])) issues.push("unstaged_user_departure_inference");
  if (hasNameAddressOveruse(text, options.recentCharacterReplies || [], options.userName || "")) issues.push("name_address_overuse");
  if (hasMissingSocialGravity(text, options.latestUserMessage || "", options.recentCharacterReplies || [], options.character || {})) issues.push("social_gravity_missing");
  if (hasAtmosphericStallingLoop(text, options.recentCharacterReplies || [], turnIntent)) issues.push("atmospheric_stalling_loop");
  if (hasSilentContinuationStall(text, turnIntent, options.recentCharacterReplies || [])) issues.push("silent_continue_stalled");
  if (hasTimeSkipDrift(text, turnIntent)) issues.push("time_skip_stalled");
  if (hasSpatialContinuityBreak(text, options.latestUserMessage || "")) issues.push("spatial_relationship_broken");
  if (hasImmediatePoseRegression(text, options.latestUserMessage || "", options.recentCharacterReplies || [])) issues.push("immediate_pose_regression");

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
function applyIntelligenceContinuity(previous: any = {}, update: any = {}) {
  const prior = previous && typeof previous === "object" ? previous : {};
  const resolved = compactTextList(update?.resolved_commitments, 8, 260);
  const proposedCommitments = compactTextList(update?.commitments, 8, 260);
  const commitments = compactTextList([...(prior.commitments || []), ...proposedCommitments], 12, 260)
    .filter((item) => !resolved.some((done) => memorySimilarity(item, done) >= 0.72));
  const knowledge = [...(Array.isArray(prior.knowledge) ? prior.knowledge : []), ...(Array.isArray(update?.knowledge_updates) ? update.knowledge_updates : [])]
    .map((item) => ({ who: cleanPromptValue(item?.who, 80), knows: cleanPromptValue(item?.knows, 280), source: cleanPromptValue(item?.source, 180), status: ["known","suspected","rumor","forgotten"].includes(String(item?.status)) ? String(item.status) : "known" }))
    .filter((item) => item.who && item.knows)
    .filter((item, index, all) => all.findLastIndex((other) => normalizeText(other.who) === normalizeText(item.who) && memorySimilarity(other.knows, item.knows) >= 0.76) === index)
    .slice(-24);
  return {
    objects: compactTextList(update?.objects_present?.length ? update.objects_present : prior.objects, 12, 180),
    knowledge, commitments,
    stakes: cleanPromptValue(update?.stakes, 360) || cleanPromptValue(prior.stakes, 360),
    updated_at: new Date().toISOString(),
  };
}
function buildStoryRecap(timeline: any[] = [], previous = "") {
  const meaningful = (Array.isArray(timeline) ? timeline : []).filter((item) => Number(item?.importance || 0) >= 3 || item?.scene_changed).slice(-8);
  if (!meaningful.length) return cleanPromptValue(previous, 2200);
  return meaningful.map((item) => cleanPromptValue(item?.detail || item?.note || item?.label, 320)).filter(Boolean).join(" • ").slice(0, 2200);
}
function evolveStoryChapters({ chapters = [], activeChapter = {}, latestUserMessage = "", sceneUpdate = {}, timelineEvent = {}, savedMessage = {}, recap = "" }) {
  const closed = Array.isArray(chapters) ? [...chapters] : [];
  let active = activeChapter && typeof activeChapter === "object" ? { ...activeChapter } : {};
  if (!active.title) {
    active = { number: closed.length + 1, title: "Opening", summary: "The current chapter of the story.", started_at: savedMessage?.created_at || new Date().toISOString(), start_message_id: savedMessage?.id || "" };
  }
  const text = `${latestUserMessage} ${sceneUpdate?.separator_label || ""}`.toLowerCase();
  const largeJump = /(?:next day|next morning|next week|next month|next year|the following day|days later|weeks later|months later|years later|later that week|time skip|al día siguiente|a la mañana siguiente|días después|semanas después|meses después|años después|tiempo después)/i.test(text);
  const majorSceneBreak = Boolean(sceneUpdate?.scene_changed) && Number(timelineEvent?.importance || 0) >= 4 && /later|after|next|following|después|siguiente/i.test(String(sceneUpdate?.separator_label || ""));
  if ((largeJump || majorSceneBreak) && !String(active?.start_message_id || "").includes(String(savedMessage?.id || ""))) {
    closed.push({ ...active, ended_at: savedMessage?.created_at || new Date().toISOString(), summary: cleanPromptValue(recap, 520) || active.summary || "Chapter completed." });
    const title = cleanPromptValue(sceneUpdate?.separator_label, 80) || cleanPromptValue(timelineEvent?.label, 80) || `Chapter ${closed.length + 1}`;
    active = { number: closed.length + 1, title, summary: cleanPromptValue(timelineEvent?.detail, 280) || "A new phase of the story begins.", started_at: savedMessage?.created_at || new Date().toISOString(), start_message_id: savedMessage?.id || "" };
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
  existingRelationshipState,
  existingIntelligenceState,
  existingUnresolvedThreads,
  existingStoryRecap,
  existingStoryChapters,
  existingActiveChapter,
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
      const guardedDraft = shouldBufferDraftUntilValidated({ latestUserMessage, turnIntent, recentUserMessages, recentCharacterReplies, character });
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
          systemInstruction: "Produce one grounded, socially natural roleplay continuation. Let characters feel more than they show: preserve useful private emotion while keeping outward behavior proportionate, and let ordinary life continue after a brief meaningful inner beat. React literally before inferring subtext; do not invent motives, argument evidence or generic romance choreography. Keep side characters socially alive, honor explicit user cues for NPCs to speak or act on-page, preserve immediate relative body positions until visible movement changes them, and make profile-established social status/reputation visibly affect relevant public scenes without turning every turn into a popularity spectacle. Avoid constant sarcasm or rhetorical-question dialogue, do not use the user’s name or nickname as punctuation in every reply, do not continuously track the user with glances/thoughts while the character is socially occupied, and never invent user behavior as evidence in banter. User-authored narration is binding scene canon; never erase a later staged event merely to obey an earlier line of dialogue. Continue after the user's final staged event. Put reply first in the JSON object, then the hidden continuity fields. Return valid JSON only.",
          prompt,
          maxOutputTokens: getMaximumOutputTokens(character.response_length),
          temperature: getTemperature(character.creativity, isRegeneration),
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
        validationIssues = [...new Set([...validationIssues, ...validateContinuityEnvelope(result, { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent })])];
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
          if (!guardedDraft) sendEvent(controller, { type: "reset", reason: "repair" });
          streamedReply = "";
          let repaired: ModelResult | null = null;
          let repairFailure = "";
          try {
            repaired = await repairRoleplayOnce({
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
              ({ result, issues: validationIssues } = sanitizeValidatedHardIntentResult(result, validationIssues, { characterName: character.name, userName: userIdentity.name, latestUserMessage, turnIntent, finishReason: result.finishReason, rejectedResponses, recentCharacterReplies, recentUserMessages, character, continuity: { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent } }));
              for (const chunk of splitForStreaming(result.reply)) {
                if (await isCancelled()) return;
                sendEvent(controller, { type: "chunk", content: chunk });
              }
              streamedReply = result.reply;
            } else {
              throw new Error(repairFailure || "Velvet could not repair an incomplete reply. Try again.");
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
          repairedIssues.push(...validateContinuityEnvelope(repaired, { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent }));
          const repairedFatal = blockingNarrativeIssues(repairedIssues);
          const originalFatal = blockingNarrativeIssues(originalIssues);
          const originalHard = hardRepairRequiredIssues(originalIssues);
          const repairedHard = hardRepairRequiredIssues(repairedIssues);
          if (originalHard.length && repairedHard.length) {
            throw new Error(`Velvet repair still violated a protected interaction beat: ${repairedHard.join(", ")}`);
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
          ({ result, issues: validationIssues } = sanitizeValidatedHardIntentResult(result, validationIssues, { characterName: character.name, userName: userIdentity.name, latestUserMessage, turnIntent, finishReason: result.finishReason, rejectedResponses, recentCharacterReplies, recentUserMessages, character, continuity: { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage, turnIntent } }));
          for (const chunk of splitForStreaming(result.reply)) {
            if (await isCancelled()) return;
            sendEvent(controller, { type: "chunk", content: chunk });
          }
          streamedReply = result.reply;
          }
        }

        if (guardedDraft && !blocking.length) {
          // The first draft stayed invisible until validation accepted it.
          for (const chunk of splitForStreaming(result.reply)) {
            if (await isCancelled()) return;
            sendEvent(controller, { type: "chunk", content: chunk });
          }
          streamedReply = result.reply;
        }

        const remainingHard = hardRepairRequiredIssues(validationIssues);
        if (blockingNarrativeIssues(validationIssues).length || remainingHard.length) {
          throw new Error(`Velvet could not get a valid protected reply after one repair${remainingHard.length ? `: ${remainingHard.join(", ")}` : "."}`);
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
        update.intelligence_state = applyIntelligenceContinuity(existingIntelligenceState, result.continuity_update);
        const resolvedCommitments = compactTextList(result.continuity_update?.resolved_commitments, 8, 260);
        const newCommitments = compactTextList(result.continuity_update?.commitments, 8, 260);
        update.unresolved_threads = compactTextList([...(Array.isArray(existingUnresolvedThreads) ? existingUnresolvedThreads.map((item) => typeof item === "string" ? item : item?.title || item?.detail) : []), ...newCommitments], 16, 320)
          .filter((item) => !resolvedCommitments.some((done) => memorySimilarity(item, done) >= 0.72))
          .map((title, index) => ({ id: `commitment-${index}`, title, status: "open" }));

        const note = cleanPromptValue(result.continuity_note, 600);
        const sceneChanged = Boolean(result.scene_update?.scene_changed);
        const separatorLabel = buildSceneSeparatorLabel(existingSceneState, result.scene_update);
        const timelineEvent = result.continuity_update?.timeline_event || {};
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
        });
        update.story_chapters = chapterState.chapters;
        update.active_chapter = chapterState.activeChapter;
        if (chapterState.chapterNumber) {
          await supabase.from("messages").update({ chapter_number: chapterState.chapterNumber }).eq("id", savedMessage.id).eq("user_id", userId);
          if (update.story_timeline?.length) update.story_timeline[update.story_timeline.length - 1].chapter_number = chapterState.chapterNumber;
        }
        update.story_recap = buildStoryRecap(update.story_timeline || timeline, existingStoryRecap || "");
        await supabase.from("conversations").update(update).eq("id", conversationId).eq("user_id", userId);
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
  let lastError = "Gemini could not generate a response";
  let quotaReached = false;
  let emittedAnyReply = false;
  // VELVET_ROLEPLAY_DEADLINE_V282: cap failover as one interaction budget
  // instead of allowing every fallback model to consume a full 26 seconds.
  const deadlineAt = Date.now() + 38000;

  for (const model of models) {
    if (await isCancelled()) throw new DOMException("Generation cancelled", "AbortError");
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 1200) break;
    const controller = new AbortController();
    let watching = true;
    const timeoutId = setTimeout(() => controller.abort(), Math.min(24000, remainingMs));
    const cancellationWatcher = (async () => {
      while (watching && !controller.signal.aborted) {
        await delay(360);
        if (watching && await isCancelled()) controller.abort();
      }
    })();

    try {
      onModel?.(model);
      const response = await fetch(modelStreamEndpoint(model), {
        method: "POST",
        headers: geminiHeaders(apiKey),
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens,
            temperature,
            topP: 0.92,
            thinkingConfig: { thinkingLevel: "MINIMAL" },
            responseMimeType: "application/json",
            responseJsonSchema: roleplayResponseSchema(),
          },
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => "");
        lastError = extractGeminiHttpError(errorText) || `Gemini returned ${response.status}`;
        quotaReached ||= response.status === 429;
        if ([429, 500, 502, 503, 504].includes(response.status)) continue;
        throw new Error(lastError);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let structured = "";
      let latestReply = "";
      let finishReason = "";

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
          if (partialReply.length > latestReply.length) {
            latestReply = partialReply;
            emittedAnyReply = true;
            onReply?.(latestReply);
          }
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
      return { ...envelope, finishReason, model };
    } catch (error) {
      if (await isCancelled()) throw new DOMException("Generation cancelled", "AbortError");
      if (emittedAnyReply) {
        emittedAnyReply = false;
        onReset?.();
      }
      if (getErrorName(error) === "AbortError") lastError = "The AI took too long to answer. Please try again.";
      else lastError = getErrorMessage(error);
    } finally {
      clearTimeout(timeoutId);
      watching = false;
      void cancellationWatcher;
    }
  }

  if (quotaReached) throw new Error("Gemini is rate-limited right now. This can be a per-minute, token, or daily project limit. Wait a little and try again.");
  throw new Error(lastError);
}
function roleplayResponseSchema() {
  return {
    type: "object",
    required: ["reply", "turn_reading", "canon_claims", "voice_plan", "continuity_note", "scene_update", "continuity_update", "cast_updates", "development_update", "memory_updates"],
    propertyOrdering: ["reply", "turn_reading", "canon_claims", "voice_plan", "continuity_note", "scene_update", "continuity_update", "cast_updates", "development_update", "memory_updates"],
    properties: {
      reply: { type: "string" },
      turn_reading: { type: "string" },
      canon_claims: { type: "array", items: { type: "string" } },
      voice_plan: { type: "object", required: ["conversational_goal", "outward_tactic", "private_pressure", "verbal_signature", "avoided_pattern"], properties: { conversational_goal:{type:"string"}, outward_tactic:{type:"string"}, private_pressure:{type:"string"}, verbal_signature:{type:"string"}, avoided_pattern:{type:"string"} } },
      continuity_note: { type: "string" },
      scene_update: { type: "object", required: ["scene_changed", "separator_label", "location", "time_label", "present", "exited", "heard_user_turn"], properties: { scene_changed:{type:"boolean"}, separator_label:{type:"string"}, location:{type:"string"}, time_label:{type:"string"}, present:{type:"array",items:{type:"string"}}, exited:{type:"array",items:{type:"string"}}, heard_user_turn:{type:"array",items:{type:"string"}} } },
      continuity_update: { type: "object", required: ["objects_present","knowledge_updates","commitments","resolved_commitments","stakes","timeline_event"], properties: { objects_present:{type:"array",maxItems:12,items:{type:"string"}}, knowledge_updates:{type:"array",maxItems:6,items:{type:"object",required:["who","knows","source","status"],properties:{who:{type:"string"},knows:{type:"string"},source:{type:"string"},status:{type:"string",enum:["known","suspected","rumor","forgotten"]}}}}, commitments:{type:"array",maxItems:8,items:{type:"string"}}, resolved_commitments:{type:"array",maxItems:8,items:{type:"string"}}, stakes:{type:"string"}, timeline_event:{type:"object",required:["record","label","detail","kind","importance"],properties:{record:{type:"boolean"},label:{type:"string"},detail:{type:"string"},kind:{type:"string",enum:["relationship","conflict","promise","reveal","decision","scene","other"]},importance:{type:"integer"}}} } },
      cast_updates: { type: "array", maxItems: 4, items: { type: "object", required: ["name","relationship","personality_note","current_dynamic","knows","last_interaction"], properties: { name:{type:"string"}, relationship:{type:"string"}, personality_note:{type:"string"}, current_dynamic:{type:"string"}, knows:{type:"string"}, last_interaction:{type:"string"} } } },
      memory_updates: { type: "array", maxItems: 3, items: { type: "object", required: ["content","category","importance","scope","reason","replaces"], properties: { content:{type:"string"}, category:{type:"string",enum:["fact","person","relationship","world","event","preference","boundary","promise","conflict"]}, importance:{type:"integer"}, scope:{type:"string",enum:["conversation","character"]}, reason:{type:"string"}, replaces:{type:"string"} } } },
      development_update: { type: "object", required: ["significance","evidence","relationship_phase","relationship_dynamic","emotional_residue","active_contradiction","behavioral_effect","turning_point"], properties: { significance:{type:"string"}, evidence:{type:"string"}, relationship_phase:{type:"string"}, relationship_dynamic:{type:"string"}, emotional_residue:{type:"string"}, active_contradiction:{type:"string"}, behavioral_effect:{type:"string"}, turning_point:{type:"string"} } },
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
  }).slice(0, 18);
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
  if (kind === "silent_continue") return "30–110 words; the user yielded the turn, so continue the exact active beat with one concrete action, decision, dialogue exchange, social interaction, or consequence. Do not fill the turn with watching, leaning, breathing, empty-space description, or atmosphere alone.";
  if (kind === "return_main_pov") return "45–130 words; re-center the character quickly and naturally.";
  if (["challenge", "charged_nonverbal"].includes(kind)) return "35–110 words; answer the charged cue with an active, character-specific choice. Keep the tension moving instead of politely conceding, freezing, or ending the scene without cause.";
  if (length === "short") return "25–80 words; complete, human and unpadded.";
  if (length === "long") return "100–250 words, only when the moment genuinely needs room.";
  return "45–140 words. Shorter is better when the social beat already lands.";
}
function getMaximumOutputTokens(length) {
  if (length === "short") return 1100;
  if (length === "long") return 2800;
  return 1900;
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
