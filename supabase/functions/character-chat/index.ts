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
      if (await isGenerationCancelled(cancellationAdmin, generationId, userData.user.id)) {
        return cancelledResponse();
      }
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
    if (!latestUserRecord) throw new Error("Send a message before asking the character to reply");

    if (expectedUserMessageId && String(latestUserRecord.id) !== expectedUserMessageId) {
      return json({ error: "The conversation changed before Velvet could answer. Try again from the latest message." }, 409);
    }

    const latestUserMessage = String(latestUserRecord.content || "");
    const previousCharacterMessage = [...messages].reverse().find((message) => message.sender === "character")?.content || "";
    const turnIntent = classifyTurnIntent(latestUserMessage, messages);
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
    });

    const isCancelled = () => generationId
      ? isGenerationCancelled(cancellationAdmin, generationId, userData.user.id)
      : Promise.resolve(false);

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
      latestUserMessageId: latestUserRecord.id,
      existingSceneState: loaded.conversation.scene_state || {},
      existingCastState: loaded.conversation.cast_state || {},
      existingRelationshipState: loaded.conversation.relationship_state || {},
      existingIntelligenceState: loaded.conversation.intelligence_state || {},
      existingUnresolvedThreads: loaded.conversation.unresolved_threads || [],
      existingStoryRecap: loaded.conversation.story_recap || loaded.conversation.summary || "",
      existingStoryChapters: loaded.conversation.story_chapters || [],
      existingActiveChapter: loaded.conversation.active_chapter || {},
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
    version: "1.9.0",
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
      .order("created_at", { ascending: false }).limit(80),
    supabase.from("memories")
      .select("id, conversation_id, content, importance, category, is_pinned, is_canon, why_remembered, source, scope, superseded_at, created_at, updated_at")
      .in("character_id", groupCharacterIds).eq("user_id", userId)
      .or(`conversation_id.eq.${conversationId},scope.eq.character`)
      .is("superseded_at", null)
      .order("is_canon", { ascending: false })
      .order("is_pinned", { ascending: false }).order("importance", { ascending: false })
      .order("created_at", { ascending: false }).limit(50),
    conversation.lorebook_id
      ? supabase.from("lore_entries")
        .select("id, entry_type, name, content, keywords, event_date, always_include")
        .eq("lorebook_id", conversation.lorebook_id).eq("user_id", userId)
        .eq("is_active", true).order("always_include", { ascending: false })
        .order("updated_at", { ascending: false }).limit(60)
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
    memories: memoriesResult.data || [],
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
}) {
  const profile = [
    `Name: ${character.name}`,
    `Role: ${character.role || "not specified"}`,
    `Description: ${character.description || "not specified"}`,
    `Personality: ${character.personality || "not specified"}`,
    `Relationship to ${userIdentity.name}: ${character.relationship || "not specified"}`,
    `Values: ${character.character_values || "not specified"}`,
    `Fears: ${character.fears || "not specified"}`,
    `Habits: ${character.habits || "not specified"}`,
    `Contradictions: ${character.contradictions || "not specified"}`,
    `Core motivation: ${character.core_motivation || "not specified"}`,
    `Emotional defense: ${character.emotional_defense || "not specified"}`,
    `What reaches them: ${character.softening_triggers || "not specified"}`,
    `Possible growth direction: ${character.growth_direction || "not specified"}`,
    `Speech style: ${character.speech_style || "not specified"}`,
    `Word choice and rhythm: ${character.voice_vocabulary || "infer from the profile"}`,
    `Humor style: ${character.humor_style || "infer from the profile"}`,
    `Conflict style: ${character.conflict_style || "infer from the profile"}`,
    `Affection style: ${character.affection_style || "infer from the profile"}`,
    `Verbal tells: ${character.verbal_tells || "infer sparingly from the profile"}`,
    `Voice avoidances: ${character.voice_avoidances || "generic archetype dialogue and therapeutic language"}`,
    `Boundaries: ${character.boundaries || "not specified"}`,
    `Scenario/world: ${character.scenario || character.world || "not specified"}`,
    `Example dialogue (voice reference, never copy): ${character.example_dialogue || "none"}`,
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

  const immediate = messages.slice(-18).map((message) => {
    const speaker = message.sender === "user" ? userIdentity.name : (supportingCast.length ? "STORY CAST" : character.name);
    return `${speaker}: ${compactMessageForPrompt(message.content, 3200)}`;
  }).join("\n\n") || "none";

  const older = messages.slice(-60, -18).map((message) => {
    const speaker = message.sender === "user" ? userIdentity.name : (supportingCast.length ? "STORY CAST" : character.name);
    return `${speaker}: ${compactMessageForPrompt(message.content, 900)}`;
  }).join("\n") || "none";

  const memoryText = memories.length
    ? memories.map((memory) => {
      const authority = memory.is_canon || memory.is_pinned || memory.source === "manual" ? "confirmed" : "tentative";
      const label = memory.is_canon ? "CANON" : authority;
      return `- [${label}] ${cleanPromptValue(memory.content, 900)}`;
    }).join("\n")
    : "none";

  const loreText = loreEntries.length
    ? loreEntries.map((entry) => `- ${cleanPromptValue(entry.name, 120)}: ${cleanPromptValue(entry.content, 1000)}`).join("\n")
    : "none";

  const derivedContext = JSON.stringify({
    scene: conversation.scene_state || {},
    relationship: conversation.relationship_state || {},
    cast: conversation.cast_state || {},
    open_threads: conversation.unresolved_threads || [],
    intelligence: conversation.intelligence_state || {},
    recent_timeline: Array.isArray(conversation.story_timeline) ? conversation.story_timeline.slice(-20) : [],
  }).slice(0, 9000);

  const latest = compactMessageForPrompt(latestUserRecord.content, 5000);
  const learnedPositiveFeedback = positiveFeedbackDirectives(storyPreferences.learned_positive_feedback);
  const learnedNegativeFeedback = feedbackDirectives(storyPreferences.learned_negative_feedback);
  const currentFeedback = feedbackDirectives(regenerationFeedback);
  const regeneration = isRegeneration
    ? `This is a regeneration from the branch point. The rejected take is intentionally absent. Make a materially different choice, reaction, opening and dialogue—not a paraphrase. ${currentFeedback.length ? `Creator feedback that this rewrite MUST fix: ${currentFeedback.join(" ")}` : ""} ${regenerationInstruction ? `Mandatory direction: ${regenerationInstruction}` : ""}`
    : "This is a new canonical turn.";

  return `You are Velvet's narrative engine. Write the next turn of an immersive private roleplay as polished contemporary fiction.

NON-NEGOTIABLE PRIORITY
1. Respond to the latest user turn below, in the current scene, before anything else.
2. Preserve visible continuity and the character profile. Never invent off-screen messages, visits, habits, schedules, relatives' actions, debts, exact durations or shared history.
3. The user exclusively controls ${userIdentity.name}. Never invent ${userIdentity.name}'s dialogue, thoughts, feelings, reactions, choices or movements.
4. Write ${character.name} as a specific person. Guarded, proud, teasing or emotionally avoidant does not mean cruel, contemptuous, robotic or therapeutic.
5. Dialogue must sound like something this character would actually say. Never use customer-service phrases such as “I'm listening,” “I understand,” “go on,” “tell me more,” or a bare “okay” as the substance of the turn.
6. Distinct voice outranks archetype. Never make this character borrow the same teasing cadence, pet names, emotional speeches, body-language habits or flirt tactics used by another generic romantic lead.
7. Physical continuity is binding. Bodies obey space: track who is present, who has exited, where the active scene is, and which communication channel is being used.
8. A character can only hear, see or answer something they were physically or digitally able to receive. Leaving the room, hanging up, muting a chat or being elsewhere matters until the visible transcript changes it.
9. Never teleport a character, silently change location/time, or make an absent NPC reappear merely to create drama. If a location, time or presence detail is unknown, keep it unknown.
10. Established side characters remain real participants until the scene visibly moves them. Do not erase them just because the romantic lead speaks, and do not force every social beat back into romance.
11. CONTINUITY LOCK: before drafting, compare the proposed opening and physical action against the immediately previous character turn. Never restart the same pose, gesture, location beat, vehicle beat or exit sequence. Once a character drives away, leaves, hangs up, enters a building or otherwise changes state, that state remains true until the visible transcript explicitly changes it.
12. OBJECT CONTINUITY: do not introduce a plot-relevant prop, possession, package, clothing item, food, gift, injury, vehicle, phone event or household object unless it is established in the visible transcript, profile, lore or confirmed memory. Incidental scenery may remain generic, but never make a newly invented object drive the action.
13. EMOTIONAL PRIORITY: when the latest user turn contains rejection, confrontation, anger, fear, affection, a boundary, or a relationship-threatening statement, that emotional event is the center of the response. Show what it does to ${character.name} before decorative environment description or logistics.
14. KNOWLEDGE BOUNDARY: track who knows each reveal. A character cannot react to a secret, message, confession or event unless the visible transcript, confirmed memory or continuity state shows how they learned it.
15. COMMITMENT BOUNDARY: promises, plans, invitations, threats, deadlines and unresolved questions persist until visibly fulfilled, withdrawn or contradicted. Do not silently forget them.
16. OBJECT LEDGER: treat the continuity state's established objects as the only plot-relevant movable props currently available unless the latest visible turn explicitly introduces a new one.
17. EPISTEMIC STATUS: distinguish KNOWN from SUSPECTED and RUMOR. Suspicion is not fact. A rumor can be wrong. Never upgrade either to confirmed knowledge without visible evidence.
18. PRIVATE KNOWLEDGE: a secret learned by one character stays private to that character until a visible telling, overhearing, message, or other grounded transfer occurs.
19. OFF-SCREEN BLINDNESS: when a character leaves the room, hangs up, or is absent, they do not gain new scene knowledge. Re-entry does not magically fill the gap.
20. SOFT FORGETTING: minor low-stakes details may fade, but canon, pinned memories, promises, boundaries, major relationship shifts and important reveals do not disappear merely to simplify the scene.

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
- If Intent is confrontation or confrontation_exit, treat the user's accusation, rejection or boundary as the primary event. Do not bury it beneath weather, driving, room description or repetitive body language. If ${userIdentity.name} also exits, respect the separation; ${character.name} may react, call after them only if physically plausible, leave, stay, or choose another grounded action, but cannot reset to the pre-exit position on the next beat.
- Before introducing any concrete object into ${character.name}'s hands or plans, ask whether that object already exists in visible canon. If not, omit it. Never improvise a convenient basket, bag, gift, note, meal, parcel or similar prop to manufacture an action.
- If the latest turn is a direct text message, show its effect and normally include ${character.name}'s written reply before NPC banter.
- Do not repeat the same gesture, denial, accusation, rhetorical tactic or signature line from recent turns.
- Do not over-describe rain, breathing, jaws, umbrellas, wet pavement, silence or eye movements. Choose only details that change the emotional beat.
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
- Emotional residue should color behavior subtly; do not restate it as exposition.
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

CONFIRMED OR USER-SAVED MEMORIES
${memoryText}

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
${cleanPromptValue(conversation.story_recap || conversation.summary || "none", 6000)}

GENERATION MODE
${regeneration}
${directorInstruction ? `Director instruction: ${directorInstruction}` : ""}

OUTPUT
Return JSON with fields in this exact order so reply can stream first:
- reply: only the finished roleplay prose.
- turn_reading: one sentence stating the literal social meaning of the latest user turn and what ${character.name} must respond to now.
- canon_claims: a list of every off-screen or historical factual claim used in the reply; keep it empty unless that exact fact appears in the profile, lore, a confirmed memory or the visible transcript.
- voice_plan: a private planning object with conversational_goal, outward_tactic, private_pressure, verbal_signature and avoided_pattern. Each value is one short string. Never place this analysis inside reply.
- continuity_note: one short sentence recording only the visible event or relationship shift in this turn; no speculation and no new facts.
- scene_update: a strict physical-continuity object with scene_changed (boolean), separator_label (short string such as "Later that night" only when the visible turn truly changes scene/time, otherwise empty), location (current established location or empty), time_label (established time/daypart or empty), present (names visibly present now), exited (names who visibly left in this turn), and heard_user_turn (names who were physically/digitally able to receive the latest user turn). Do not infer attendance, proximity, overhearing or off-screen movement. Keep existing scene facts when the transcript does not change them.
- continuity_update: one compact object with objects_present (only established plot-relevant objects still available), knowledge_updates (who, knows, source, status; status is known/suspected/rumor/forgotten and only visible knowledge gained, corrected, suspected, rumored or intentionally faded this turn), commitments (still-live promises/plans/questions), resolved_commitments (items visibly resolved this turn), stakes (one short current pressure), and timeline_event. timeline_event has record (boolean), label, detail, kind (relationship/conflict/promise/reveal/decision/scene/other), importance (1-5). Record only moments worth remembering later: confessions, meaningful fights, promises, firsts, secrets/reveals, consequential decisions, relationship shifts or real scene milestones. Ordinary banter should record=false.
- development_update: an evidence-bound object for future turns with these string fields: significance (none/low/medium/high), evidence, relationship_phase, relationship_dynamic, emotional_residue, active_contradiction, behavioral_effect and turning_point. Use empty strings when nothing changed. Evidence must point to this visible exchange, not an invented event.
- memory_updates: zero to three durable facts learned directly from the visible user turn only. Each item has content, category (fact/person/relationship/world/event/preference/boundary/promise/conflict), importance (1-5), scope (conversation/character), reason (one short explanation of why this is useful later), and replaces (the exact older tentative memory this user turn corrects, otherwise an empty string). Prefer updating an existing durable idea over creating a near-duplicate. Prioritize confessions, promises, boundaries, important preferences, relationship changes, recurring places, secrets the user explicitly reveals, consequential conflicts and first-time milestones. Importance 1-2 is too trivial for automatic storage; use [] for ordinary banter, temporary gestures, scenery, clothing, food or throwaway logistics. Never store facts invented by the character reply. Never infer identity, diagnosis, secrets or off-screen facts. Use [] for ordinary turns. This is the ONLY automatic memory extraction pass, so do not require a second model call.

AUTHORITATIVE LATEST USER TURN (message_id=${latestUserRecord.id})
${userIdentity.name}: ${latest}

Write the response to that exact turn now.`;
}

async function generateRoleplay({ apiKey, prompt, character, isRegeneration, isCancelled }): Promise<ModelResult> {
  return await callGeminiWithFailover({
    apiKey,
    systemInstruction: `Produce one grounded, emotionally intelligent roleplay continuation. The prose must be natural, complete and anchored to the final latest-user-turn block. ${character.mature_mode ? "Mature mode permits adult themes and non-graphic sensual intimacy between adults, while explicit sexual detail must fade to black." : "Use standard non-explicit romance tone."} Return valid JSON only.`,
    prompt,
    maxOutputTokens: getMaximumOutputTokens(character.response_length),
    temperature: getTemperature(character.creativity, isRegeneration),
    isCancelled,
  });
}

async function repairRoleplayOnce({ apiKey, originalPrompt, rejectedReply, issues, character, isCancelled }): Promise<ModelResult> {
  const repairPrompt = `${originalPrompt}\n\nONE REPAIR ONLY\nThe draft below failed for: ${issues.join(", ")}. Rewrite the turn completely. Keep the same branch point and canon, but do not echo the failed opening or dialogue. Never restart a physical beat from the immediately previous character turn, never reverse an established exit/drive-away/location change without visible cause, and never introduce a convenient prop that was not already established. Make the character's reaction specific and socially responsive, with the latest emotional event taking priority over scenery. Do not mention validation.\n\nFAILED DRAFT\n${cleanPromptValue(rejectedReply, 7000)}`;
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
    const timeoutId = setTimeout(() => controller.abort(), 26000);
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
              required: ["reply", "turn_reading", "canon_claims", "voice_plan", "continuity_note", "scene_update", "continuity_update", "development_update", "memory_updates"],
              properties: {
                reply: { type: "string" },
                turn_reading: { type: "string" },
                canon_claims: { type: "array", items: { type: "string" } },
                voice_plan: {
                  type: "object",
                  required: ["conversational_goal", "outward_tactic", "private_pressure", "verbal_signature", "avoided_pattern"],
                  properties: {
                    conversational_goal: { type: "string" },
                    outward_tactic: { type: "string" },
                    private_pressure: { type: "string" },
                    verbal_signature: { type: "string" },
                    avoided_pattern: { type: "string" },
                  },
                },
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
      memory_updates: Array.isArray(parsed?.memory_updates) ? parsed.memory_updates.slice(0, 3) : [],
    };
  } catch {
    return { reply: String(raw || "").trim(), continuity_note: "", development_update: {}, voice_plan: {}, scene_update: {}, continuity_update: {}, memory_updates: [] };
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
  const exitsScene = /\b(?:i\s+(?:walk|leave|left|go|went|head|headed|run|ran)|me\s+(?:voy|fui|alejo)|salgo|me fui|me baje|me bajé)\b[^.!?]{0,110}\b(?:away|bathroom|home|outside|opposite|dorm|room|apartment|building|ban[oa]|casa|apartamento|edificio|afuera|lejos)?\b/i.test(raw);

  if (raw.startsWith("[RETURN_MAIN_POV")) kind = "return_main_pov";
  else if (isSilentContinueText(raw)) kind = "silent_continue";
  else if (/\[(?:time\s*skip|timeskip)|\b(?:later that|hours later|days later|next day|al dia siguiente|más tarde|mas tarde)\b/i.test(raw)) kind = "time_skip";
  else if (confrontation && exitsScene) kind = "confrontation_exit";
  else if (confrontation) kind = "confrontation";
  else if (exitsScene) kind = "user_exit";
  else if (/\b(?:i\s+(?:miss(?:ed)?|love|adore|care about)\s+you|te\s+(?:extrano|extraño|quiero|amo)|if\s+i\s+(?:hated|didn'?t\s+like|didn'?t\s+care\s+about)\s+you|si\s+te\s+odiara|wouldn'?t\s+(?:be\s+)?(?:by\s+your\s+side|with\s+you)|no\s+estaria\s+(?:a\s+tu\s+lado|contigo))\b/i.test(raw)) kind = "affection";
  else if (/^(?:it'?s|its|that'?s)?\s*(?:okay|ok|fine|alright|all good|no worries|est[aá]\s+bien|tranqui|no\s+importa)[.!\s]*$/i.test(raw)) kind = "reassurance";
  else if (medium === "direct_message") kind = "digital_message";
  else if (isQuestion) kind = "direct_question";

  return { kind, silentCount, medium, isQuestion, normalized };
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
    .map((item) => ({
      emotion: developmentText(item?.emotion, 120),
      cause: developmentText(item?.cause, 240),
      behavioral_effect: developmentText(item?.behavioral_effect, 240),
      remaining_turns: Math.max(1, Math.min(6, Number(item?.remaining_turns) || 1)),
    }))
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
      .map((item) => ({ ...item, remaining_turns: item.remaining_turns - 1 }))
      .filter((item) => item.remaining_turns > 0),
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
        remaining_turns: significance === "high" ? 6 : significance === "medium" ? 4 : 2,
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

const BLOCKING_NARRATIVE_ISSUES = new Set([
  "empty_reply",
  "truncated_by_model",
  "unfinished_reply",
  "controls_user_pov",
  "exposes_system_language",
  "repeated_recent_signature",
  "location_changed_without_scene_change",
  "absent_character_reappeared",
  "invented_plot_object",
]);

function blockingNarrativeIssues(issues = []) {
  return [...new Set(Array.isArray(issues) ? issues : [])].filter((issue) => BLOCKING_NARRATIVE_ISSUES.has(issue));
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

  const needsSocialBeat = ["reassurance", "affection", "direct_question", "silent_continue", "return_main_pov", "digital_message", "confrontation", "confrontation_exit"].includes(turnIntent.kind);
  if (needsSocialBeat && words.length < 24) issues.push("underdeveloped_social_beat");
  if (["reassurance", "affection", "silent_continue", "return_main_pov"].includes(turnIntent.kind) && !/["“”]/.test(text)) issues.push("missing_character_dialogue");
  if (turnIntent.kind === "affection" && words.length < 34) issues.push("missing_emotional_impact");
  if (["confrontation", "confrontation_exit"].includes(turnIntent.kind) && words.length < 40) issues.push("underdeveloped_emotional_confrontation");

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

  const oldLocation = normalizeText(previousScene?.location || "");
  const nextLocation = normalizeText(sceneUpdate?.location || "");
  if (oldLocation && nextLocation && oldLocation !== nextLocation && !sceneUpdate?.scene_changed) issues.push("location_changed_without_scene_change");

  if (!sceneUpdate?.scene_changed) {
    const proposed = compactSceneNames(sceneUpdate?.present || []);
    for (const name of proposed) {
      const status = normalizeText(previousCast?.[name]?.current_status || "");
      if (/left|absent|away|exited/.test(status) && !latest.includes(normalizeText(name))) {
        issues.push("absent_character_reappeared");
        break;
      }
    }
  }

  const oldObjects = compactTextList(previousIntelligence?.objects || [], 12, 180);
  const nextObjects = compactTextList(continuityUpdate?.objects_present || [], 12, 180);
  if (oldObjects.length && nextObjects.some((item) =>
    !oldObjects.some((prior) => memorySimilarity(prior, item) >= 0.72) &&
    !latest.includes(normalizeText(item))
  )) issues.push("invented_plot_object");

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

function applySceneContinuity({ previousScene = {}, previousCast = {}, sceneUpdate = {}, mainCharacterName = "" }) {
  const priorPresent = compactSceneNames(previousScene?.present || []);
  const proposedPresent = compactSceneNames(sceneUpdate?.present || []);
  const exited = new Set(compactSceneNames(sceneUpdate?.exited || []));
  const present = (proposedPresent.length ? proposedPresent : priorPresent).filter((name) => !exited.has(name));
  const scene = {
    ...(previousScene && typeof previousScene === "object" ? previousScene : {}),
    location: cleanPromptValue(sceneUpdate?.location, 180) || cleanPromptValue(previousScene?.location, 180),
    time_label: cleanPromptValue(sceneUpdate?.time_label, 120) || cleanPromptValue(previousScene?.time_label, 120),
    present,
    heard_user_turn: compactSceneNames(sceneUpdate?.heard_user_turn || []),
    last_scene_change: Boolean(sceneUpdate?.scene_changed) ? new Date().toISOString() : previousScene?.last_scene_change || null,
  };
  const cast = { ...(previousCast && typeof previousCast === "object" ? previousCast : {}) };
  for (const name of present) {
    cast[name] = { ...(cast[name] || {}), current_status: "present", last_seen: scene.location || "current scene" };
  }
  for (const name of exited) {
    cast[name] = { ...(cast[name] || {}), current_status: "left the current scene", last_seen: scene.location || cast[name]?.last_seen || "previous scene" };
  }
  if (mainCharacterName && cast[mainCharacterName] && present.includes(mainCharacterName)) {
    cast[mainCharacterName] = { ...cast[mainCharacterName], current_status: "present" };
  }
  return { scene, cast };
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

        let result = await streamGeminiEnvelopeWithFailover({
          apiKey,
          systemInstruction: "Produce one grounded, emotionally intelligent roleplay continuation. Put reply first in the JSON object, then the hidden continuity fields. Return valid JSON only.",
          prompt,
          maxOutputTokens: getMaximumOutputTokens(character.response_length),
          temperature: getTemperature(character.creativity, isRegeneration),
          isCancelled,
          onModel(model) {
            sendEvent(controller, { type: "model", model });
          },
          onReset() {
            streamedReply = "";
            sendEvent(controller, { type: "reset" });
          },
          onReply(reply) {
            if (!reply || reply.length <= streamedReply.length) return;
            const delta = reply.slice(streamedReply.length);
            streamedReply = reply;
            if (delta) sendEvent(controller, { type: "chunk", content: delta });
          },
        });

        let validationIssues = validateNarrativeReply(result.reply, {
          characterName: character.name,
          userName: userIdentity.name,
          latestUserMessage,
          turnIntent,
          finishReason: result.finishReason,
          rejectedResponses,
          recentCharacterReplies,
        });
        validationIssues = [...new Set([...validationIssues, ...validateContinuityEnvelope(result, { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage })])];
        const originalResult = result;
        const originalIssues = validationIssues;
        const blocking = blockingNarrativeIssues(validationIssues);

        // Rare safety repair. The live draft is replaced in-place instead of
        // forcing the user to manually regenerate again.
        if (blocking.length) {
          repairUsed = true;
          sendEvent(controller, { type: "reset", reason: "repair" });
          streamedReply = "";
          const repaired = await repairRoleplayOnce({
            apiKey,
            originalPrompt: prompt,
            rejectedReply: result.reply,
            issues: validationIssues,
            character,
            isCancelled,
          });
          const repairedIssues = validateNarrativeReply(repaired.reply, {
            characterName: character.name,
            userName: userIdentity.name,
            latestUserMessage,
            turnIntent,
            finishReason: repaired.finishReason,
            rejectedResponses,
            recentCharacterReplies,
          });
          repairedIssues.push(...validateContinuityEnvelope(repaired, { previousScene: existingSceneState, previousCast: existingCastState, previousIntelligence: existingIntelligenceState, latestUserMessage }));
          if (!blockingNarrativeIssues(repairedIssues).length) {
            result = repaired;
            validationIssues = repairedIssues;
          } else {
            result = originalResult;
            validationIssues = originalIssues;
          }
          for (const chunk of splitForStreaming(result.reply)) {
            if (await isCancelled()) return;
            sendEvent(controller, { type: "chunk", content: chunk });
          }
          streamedReply = result.reply;
        }

        if (blockingNarrativeIssues(validationIssues).length) {
          throw new Error("Gemini returned an incomplete or structurally invalid reply twice. Regenerate once.");
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
        const separatorLabel = cleanPromptValue(result.scene_update?.separator_label, 100);
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

        sendEvent(controller, { type: "done", message: savedMessage, learnedMemoryCount: (result.memory_updates || []).filter((item) => Number(item?.importance || 0) >= 3 || ["boundary","promise","conflict"].includes(String(item?.category))).length, model: result.model, repairUsed, liveStreaming: true, sceneState: update.scene_state, intelligenceState: update.intelligence_state, storyTimeline: update.story_timeline || existingTimeline, storyRecap: update.story_recap || existingStoryRecap || "", storyChapters: update.story_chapters || existingStoryChapters || [], activeChapter: update.active_chapter || existingActiveChapter || {}, unfinishedThreads: update.unresolved_threads || existingUnresolvedThreads });
      } catch (error) {
        if (getErrorName(error) !== "AbortError") {
          console.error("[character-chat] live stream failed", { message: getErrorMessage(error) });
          sendEvent(controller, { type: "error", error: getErrorMessage(error) });
        }
      } finally {
        controller.close();
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

  for (const model of models) {
    if (await isCancelled()) throw new DOMException("Generation cancelled", "AbortError");
    const controller = new AbortController();
    let watching = true;
    const timeoutId = setTimeout(() => controller.abort(), 26000);
    const cancellationWatcher = (async () => {
      while (watching && !controller.signal.aborted) {
        await delay(160);
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
    required: ["reply", "turn_reading", "canon_claims", "voice_plan", "continuity_note", "scene_update", "continuity_update", "development_update", "memory_updates"],
    propertyOrdering: ["reply", "turn_reading", "canon_claims", "voice_plan", "continuity_note", "scene_update", "continuity_update", "development_update", "memory_updates"],
    properties: {
      reply: { type: "string" },
      turn_reading: { type: "string" },
      canon_claims: { type: "array", items: { type: "string" } },
      voice_plan: { type: "object", required: ["conversational_goal", "outward_tactic", "private_pressure", "verbal_signature", "avoided_pattern"], properties: { conversational_goal:{type:"string"}, outward_tactic:{type:"string"}, private_pressure:{type:"string"}, verbal_signature:{type:"string"}, avoided_pattern:{type:"string"} } },
      continuity_note: { type: "string" },
      scene_update: { type: "object", required: ["scene_changed", "separator_label", "location", "time_label", "present", "exited", "heard_user_turn"], properties: { scene_changed:{type:"boolean"}, separator_label:{type:"string"}, location:{type:"string"}, time_label:{type:"string"}, present:{type:"array",items:{type:"string"}}, exited:{type:"array",items:{type:"string"}}, heard_user_turn:{type:"array",items:{type:"string"}} } },
      continuity_update: { type: "object", required: ["objects_present","knowledge_updates","commitments","resolved_commitments","stakes","timeline_event"], properties: { objects_present:{type:"array",maxItems:12,items:{type:"string"}}, knowledge_updates:{type:"array",maxItems:6,items:{type:"object",required:["who","knows","source","status"],properties:{who:{type:"string"},knows:{type:"string"},source:{type:"string"},status:{type:"string",enum:["known","suspected","rumor","forgotten"]}}}}, commitments:{type:"array",maxItems:8,items:{type:"string"}}, resolved_commitments:{type:"array",maxItems:8,items:{type:"string"}}, stakes:{type:"string"}, timeline_event:{type:"object",required:["record","label","detail","kind","importance"],properties:{record:{type:"boolean"},label:{type:"string"},detail:{type:"string"},kind:{type:"string",enum:["relationship","conflict","promise","reveal","decision","scene","other"]},importance:{type:"integer"}}} } },
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
        const separatorLabel = cleanPromptValue(sceneUpdate?.separator_label, 100);
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
        sendEvent(controller, { type: "done", message: savedMessage, learnedMemoryCount: Array.isArray(memoryUpdates) ? memoryUpdates.length : 0, model, repairUsed });
        console.log("[character-chat] response saved", { conversationId, messageId: savedMessage.id });
      } catch (error) {
        if (getErrorName(error) !== "AbortError") {
          console.error("[character-chat] stream failed", { message: getErrorMessage(error) });
          sendEvent(controller, { type: "error", error: getErrorMessage(error) });
        }
      } finally {
        controller.close();
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
    const scope = String(item?.scope) === "character" ? "character" : "conversation";
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
  }).slice(0, 24);
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
    .slice(0, 12)
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
  if (kind === "reassurance") return "45–110 words; one complete reaction and one natural line of dialogue.";
  if (kind === "affection") return "70–160 words; include private impact, outward restraint and character-specific dialogue.";
  if (kind === "silent_continue") return "55–150 words; let the scene breathe, with dialogue when natural and no invented user actions.";
  if (kind === "return_main_pov") return "65–165 words; re-center the created character quickly and include a meaningful spoken or internal beat.";
  if (length === "short") return "45–100 words, complete rather than abrupt.";
  if (length === "long") return "150–320 words, only when the moment supports it.";
  return "75–180 words. Prefer substance over decorative description.";
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
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
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
