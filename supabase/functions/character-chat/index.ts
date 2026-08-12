import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";
const GEMINI_FALLBACK_MODEL = Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash-lite";
const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

type ModelEnvelope = {
  reply: string;
  continuity_note: string;
  development_update: Record<string, any>;
  voice_plan: Record<string, any>;
};

type ModelResult = ModelEnvelope & {
  finishReason: string;
  model: string;
};

type LoadedContext = {
  conversation: Record<string, any>;
  character: Record<string, any>;
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

    if (action === "character_assist") {
      return await handleCharacterAssist({ apiKey, draft: body?.draft, mode: body?.mode });
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
    const selectedLore = selectRelevantLore(loaded.loreEntries, messages);
    const developmentState = resolveCharacterDevelopmentBranch(
      loaded.conversation.character_development,
      configuredCharacter.relationship,
      branch.replacementMessage?.id,
    );

    const prompt = buildNarrativePrompt({
      conversation: loaded.conversation,
      character: configuredCharacter,
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

    let result = await generateRoleplay({
      apiKey,
      prompt,
      character: configuredCharacter,
      isRegeneration: Boolean(regenerateMessageId),
      isCancelled,
    });

    let validationIssues = validateNarrativeReply(result.reply, {
      characterName: configuredCharacter.name,
      userName: userIdentity.name,
      latestUserMessage,
      turnIntent,
      finishReason: result.finishReason,
      rejectedResponses: branch.rejectedResponses,
      recentCharacterReplies: messages.filter((message) => message.sender === "character").slice(-6).map((message) => message.content),
    });

    if (validationIssues.length) {
      console.warn("[character-chat] candidate rejected", {
        conversationId,
        issues: validationIssues,
        model: result.model,
      });

      result = await repairRoleplayOnce({
        apiKey,
        originalPrompt: prompt,
        rejectedReply: result.reply,
        issues: validationIssues,
        character: configuredCharacter,
        isCancelled,
      });

      validationIssues = validateNarrativeReply(result.reply, {
        characterName: configuredCharacter.name,
        userName: userIdentity.name,
        latestUserMessage,
        turnIntent,
        finishReason: result.finishReason,
        rejectedResponses: branch.rejectedResponses,
        recentCharacterReplies: messages.filter((message) => message.sender === "character").slice(-6).map((message) => message.content),
      });
    }

    if (validationIssues.length) {
      console.error("[character-chat] repaired candidate still invalid", {
        conversationId,
        issues: validationIssues,
      });
      throw new Error("Velvet rejected a weak or incomplete response before showing it. Regenerate once more.");
    }

    if (await isCancelled()) return cancelledResponse();

    return streamAndPersist({
      supabase,
      cancellationAdmin,
      generationId,
      conversationId,
      userId: userData.user.id,
      storyRevision: loaded.conversation.story_revision || null,
      replacementMessage: branch.replacementMessage,
      reply: result.reply,
      continuityNote: result.continuity_note,
      responseLanguage,
      memories: selectedMemories,
      loreEntries: selectedLore,
      existingTimeline: loaded.conversation.story_timeline || [],
      previousDevelopment: developmentState,
      developmentUpdate: result.development_update,
      character: configuredCharacter,
      latestUserMessage,
      regenerationInstruction,
      regenerationFeedback,
      rejectedResponses: branch.rejectedResponses,
      isRegeneration: Boolean(regenerateMessageId),
    });
  } catch (error) {
    console.error("[character-chat] request failed", {
      name: getErrorName(error),
      message: getErrorMessage(error),
    });
    return json({ error: getErrorMessage(error) }, 500);
  }
});

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
}) {
  const models = [...new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(Boolean))];
  const deadline = Date.now() + 28000;
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

  if (quotaReached) throw new Error("The free AI limit was reached. Try again later.");
  throw new Error(lastError);
}

async function handleCharacterAssist({ apiKey, draft, mode }) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  const organize = mode === "organize";
  const instruction = organize
    ? "Organize this existing profile into the supplied structured fields. Preserve every supplied name, relationship, boundary, world fact and meaningful character detail. Do not invent, delete or change facts. Move misplaced material out of Personality into the most relevant fields, remove duplication, and keep the result natural rather than spreadsheet-like."
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

async function handleCharacterGenerate({ apiKey, concept }) {
  const cleanConcept = String(concept || "").replace(/[<>]/g, "").trim().slice(0, 1200);
  const request = cleanConcept || "Surprise me with an original adult character and a compelling relationship premise unlike a generic billionaire, bully, mafia boss or copy of a famous fictional character.";
  const character = await requestCharacterJson({
    apiKey,
    maxOutputTokens: 2800,
    requireComplete: true,
    temperature: 0.82,
    purpose: "character-generate",
    prompt: `Create one complete, original adult fictional roleplay character from the creator's request below. Honor any requested name exactly; if no name is supplied, invent a memorable full name. Build an independent person with a life, responsibilities, relationships, conflicts and ambitions beyond romance. Make the bond with the user specific and playable, the character voice unmistakable, and the opening scene immediately interactive. Avoid generic archetype dialogue, constant hostility, instant confessions and controlling the user's dialogue, thoughts, feelings or actions. The possible growth direction must be gradual rather than guaranteed. Example dialogue calibrates voice but is not a future script. Keep each supporting field to one or two precise sentences, Personality and Relationship below 130 words each, and the opening scene between 120 and 190 words so the complete draft arrives quickly. Write every field and the opening scene in the language used by the creator; if the request has no language, use natural English. Return every field in the schema.\n\nCREATOR REQUEST\n${request}`,
  });
  return json({ character });
}

async function loadContext({ supabase, conversationId, userId }): Promise<LoadedContext> {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, character_id, persona_id, lorebook_id, title, summary, response_length_override, narration_style_override, creativity, romance_intensity, initiative, drama, flirting, humor, description_level, character_independence, dialogue_frequency, narrative_camera, inner_thoughts, story_preset, scene_state, story_timeline, pacing_mode, relationship_state, cast_state, story_chapters, active_chapter, unresolved_threads, character_development, story_engine_version, story_revision")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();
  if (conversationError || !conversation) throw new Error(conversationError?.message || "Conversation not found");

  const [characterResult, personaResult, messagesResult, memoriesResult, loreResult] = await Promise.all([
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
      .select("id, conversation_id, content, importance, category, is_pinned, source, scope, created_at")
      .eq("character_id", conversation.character_id).eq("user_id", userId)
      .or(`conversation_id.eq.${conversationId},scope.eq.character`)
      .order("is_pinned", { ascending: false }).order("importance", { ascending: false })
      .order("created_at", { ascending: false }).limit(50),
    conversation.lorebook_id
      ? supabase.from("lore_entries")
        .select("id, entry_type, name, content, keywords, event_date, always_include")
        .eq("lorebook_id", conversation.lorebook_id).eq("user_id", userId)
        .eq("is_active", true).order("always_include", { ascending: false })
        .order("updated_at", { ascending: false }).limit(60)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [characterResult, personaResult, messagesResult, memoriesResult, loreResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  if (!characterResult.data) throw new Error("Character not found");

  return {
    conversation,
    character: characterResult.data,
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
    const speaker = message.sender === "user" ? userIdentity.name : character.name;
    return `${speaker}: ${compactMessageForPrompt(message.content, 3200)}`;
  }).join("\n\n") || "none";

  const older = messages.slice(-60, -18).map((message) => {
    const speaker = message.sender === "user" ? userIdentity.name : character.name;
    return `${speaker}: ${compactMessageForPrompt(message.content, 900)}`;
  }).join("\n") || "none";

  const memoryText = memories.length
    ? memories.map((memory) => {
      const authority = memory.is_pinned || memory.source === "user" ? "confirmed" : "tentative";
      return `- [${authority}] ${cleanPromptValue(memory.content, 900)}`;
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
- If the user sends only dots/silence, continue through ${character.name}'s action, thought and audible dialogue. After two consecutive silent turns, return the meaningful focus to ${character.name} even if an NPC spoke last.
- If ${userIdentity.name} leaves, showers, walks away or otherwise exits, do not narrate inside ${userIdentity.name}'s private space. Follow ${character.name}'s immediate reaction and give ${character.name} something meaningful to say, think or do.
- If the latest turn is a direct text message, show its effect and normally include ${character.name}'s written reply before NPC banter.
- Do not repeat the same gesture, denial, accusation, rhetorical tactic or signature line from recent turns.
- Do not over-describe rain, breathing, jaws, umbrellas, wet pavement, silence or eye movements. Choose only details that change the emotional beat.
- End after the beat lands. Never cut off mid-sentence.

CHARACTER
${profile}

VOICE FINGERPRINT — PASS THE BLIND-VOICE TEST
- Internally decide ${character.name}'s conversational goal, outward tactic and private pressure before writing.
- Sentence rhythm, vocabulary, humor, conflict and affection must come from this profile—not from a generic romantic lead archetype.
- Use verbal tells sparingly. A tell is texture, not something to repeat every turn.
- The example dialogue calibrates syntax and attitude only. Never copy its wording.
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

CONTROLS
romance=${character.romance_intensity}/100, flirting=${character.flirting}/100, humor=${character.humor}/100, drama=${character.drama}/100, initiative=${character.initiative}/100, dialogue=${character.dialogue_frequency}/100, description=${character.description_level}/100, independence=${character.character_independence}/100, inner_thoughts=${character.inner_thoughts}, camera=${character.narrative_camera}, pacing=${character.pacing_mode}, preset=${character.story_preset}

CONFIRMED OR USER-SAVED MEMORIES
${memoryText}

ACTIVE LORE
${loreText}

OLDER RECENT HISTORY
${older}

IMMEDIATE CONTINUITY—READ LITERALLY
${immediate}

DERIVED CONTINUITY AIDS—TENTATIVE IF THEY CONFLICT WITH THE TRANSCRIPT
${derivedContext}

ROLLING SUMMARY—TENTATIVE IF IT CONFLICTS WITH THE TRANSCRIPT
${cleanPromptValue(conversation.summary || "none", 6000)}

GENERATION MODE
${regeneration}
${directorInstruction ? `Director instruction: ${directorInstruction}` : ""}

OUTPUT
Return JSON with:
- turn_reading: one sentence stating the literal social meaning of the latest user turn and what ${character.name} must respond to now.
- canon_claims: a list of every off-screen or historical factual claim used in the reply; keep it empty unless that exact fact appears in the profile, lore, a confirmed memory or the visible transcript.
- voice_plan: a private planning object with conversational_goal, outward_tactic, private_pressure, verbal_signature and avoided_pattern. Each value is one short string. Never place this analysis inside reply.
- reply: only the finished roleplay prose.
- continuity_note: one short sentence recording only the visible event or relationship shift in this turn; no speculation and no new facts.
- development_update: an evidence-bound object for future turns with these string fields: significance (none/low/medium/high), evidence, relationship_phase, relationship_dynamic, emotional_residue, active_contradiction, behavioral_effect and turning_point. Use empty strings when nothing changed. Evidence must point to this visible exchange, not an invented event.

AUTHORITATIVE LATEST USER TURN (message_id=${latestUserRecord.id})
${userIdentity.name}: ${latest}

Write the response to that exact turn now.`;
}

async function generateRoleplay({ apiKey, prompt, character, isRegeneration, isCancelled }): Promise<ModelResult> {
  return await callGeminiWithFailover({
    apiKey,
    systemInstruction: "Produce one grounded, emotionally intelligent roleplay continuation. The prose must be natural, complete and anchored to the final latest-user-turn block. Return valid JSON only.",
    prompt,
    maxOutputTokens: getMaximumOutputTokens(character.response_length),
    temperature: getTemperature(character.creativity, isRegeneration),
    isCancelled,
  });
}

async function repairRoleplayOnce({ apiKey, originalPrompt, rejectedReply, issues, character, isCancelled }): Promise<ModelResult> {
  const repairPrompt = `${originalPrompt}\n\nONE REPAIR ONLY\nThe draft below failed for: ${issues.join(", ")}. Rewrite the turn completely. Keep the same branch point and canon, but do not echo the failed opening or dialogue. Make the character's reaction specific and socially responsive. Do not mention validation.\n\nFAILED DRAFT\n${cleanPromptValue(rejectedReply, 7000)}`;
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
  const models = [...new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(Boolean))];
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
            thinkingConfig: { thinkingLevel: "LOW" },
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              required: ["turn_reading", "canon_claims", "voice_plan", "reply", "continuity_note", "development_update"],
              properties: {
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
                reply: { type: "string" },
                continuity_note: { type: "string" },
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

  if (quotaReached) throw new Error("The free AI limit was reached. Try again later.");
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
    };
  } catch {
    return { reply: String(raw || "").trim(), continuity_note: "", development_update: {}, voice_plan: {} };
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
  if (isSilentContinueText(raw)) kind = "silent_continue";
  else if (/\[(?:time\s*skip|timeskip)|\b(?:later that|hours later|days later|next day|al dia siguiente|más tarde|mas tarde)\b/i.test(raw)) kind = "time_skip";
  else if (/\b(?:i\s+(?:walk|leave|left|go|went|head|headed|run|ran)|me\s+(?:voy|fui|alejo)|salgo|me fui)\b[^.!?]{0,90}\b(?:away|bathroom|home|outside|opposite|dorm|room|ban[oa]|casa|afuera|lejos)?\b/i.test(raw)) kind = "user_exit";
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
  const actionPattern = /\b(?:you|your body)\s+(?:felt|thought|realized|decided|wanted|needed|knew|wondered|hoped|feared|smiled|laughed|nodded|sighed|walked|followed|looked|reached|stepped|turned|froze|blushed|said|asked|answered)\b/gi;
  const matches = narration.match(actionPattern) || [];
  if (!matches.length) return false;

  const latest = normalizeText(latestUserMessage);
  const unsupported = matches.some((match) => {
    const verb = normalizeText(match).split(" ").at(-1) || "";
    return verb && !latest.includes(verb.replace(/ed$/, ""));
  });
  if (unsupported) return true;

  if (userName) {
    const escaped = String(userName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const namedAction = new RegExp(`\\b${escaped}\\s+(?:felt|thought|realized|decided|smiled|laughed|nodded|walked|said|asked)\\b`, "i");
    if (namedAction.test(narration) && !normalizeText(latestUserMessage).includes(normalizeText(userName))) return true;
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

  const needsSocialBeat = ["reassurance", "affection", "direct_question", "silent_continue", "digital_message"].includes(turnIntent.kind);
  if (needsSocialBeat && words.length < 24) issues.push("underdeveloped_social_beat");
  if (["reassurance", "affection", "silent_continue"].includes(turnIntent.kind) && !/["“”]/.test(text)) issues.push("missing_character_dialogue");
  if (turnIntent.kind === "affection" && words.length < 34) issues.push("missing_emotional_impact");

  for (const rejected of options.rejectedResponses || []) {
    if (replySimilarity(text, rejected) >= 0.72) {
      issues.push("too_similar_to_rejected_take");
      break;
    }
  }
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
  responseLanguage,
  memories,
  loreEntries,
  existingTimeline,
  previousDevelopment,
  developmentUpdate,
  character,
  latestUserMessage,
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

        let chunkIndex = 0;
        for (const chunk of splitForStreaming(reply)) {
          if (generationId && chunkIndex % 4 === 0 && await isGenerationCancelled(cancellationAdmin, generationId, userId)) return;
          sendEvent(controller, { type: "chunk", content: chunk });
          chunkIndex += 1;
          await delay(7);
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
        const note = cleanPromptValue(continuityNote, 600);
        if (note) {
          const timeline = Array.isArray(existingTimeline) ? existingTimeline : [];
          update.story_timeline = [
            ...timeline.filter((item) => String(item?.message_id || "") !== String(savedMessage.id)),
            { message_id: savedMessage.id, note, created_at: savedMessage.created_at || new Date().toISOString() },
          ].slice(-80);
        }
        await supabase.from("conversations").update(update).eq("id", conversationId).eq("user_id", userId);
        sendEvent(controller, { type: "done", message: savedMessage });
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
    const leftPinned = left.is_pinned || left.source === "user" ? 1 : 0;
    const rightPinned = right.is_pinned || right.source === "user" ? 1 : 0;
    if (leftPinned !== rightPinned) return rightPinned - leftPinned;
    const leftRelevant = normalizeText(left.content).split(" ").some((word) => word.length > 4 && recent.includes(word)) ? 1 : 0;
    const rightRelevant = normalizeText(right.content).split(" ").some((word) => word.length > 4 && recent.includes(word)) ? 1 : 0;
    return rightRelevant - leftRelevant || Number(right.importance || 0) - Number(left.importance || 0);
  }).slice(0, 24);
}

function selectRelevantLore(entries, messages) {
  const recent = normalizeText(messages.slice(-24).map((message) => message.content).join(" "));
  const scored = entries.map((entry) => {
    const keywords = Array.isArray(entry.keywords) ? entry.keywords : String(entry.keywords || "").split(",");
    const matches = keywords.filter((keyword) => {
      const normalized = normalizeText(keyword);
      return normalized && recent.includes(normalized);
    }).length;
    return { entry, score: entry.always_include ? 100 : matches };
  });
  return scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 18).map((item) => item.entry);
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
  if (kind === "silent_continue") return "70–170 words; advance the scene through the main character and include audible dialogue.";
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

function geminiHeaders(apiKey) {
  return { "Content-Type": "application/json", "x-goog-api-key": apiKey };
}

function stripJsonFence(value) {
  return String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}

function compactMessageForPrompt(value, maximum = 3200) {
  const text = String(value || "").trim();
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
