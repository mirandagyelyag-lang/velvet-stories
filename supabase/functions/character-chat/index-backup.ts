import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed" },
      405
    );
  }

  try {
    const authorization =
      request.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        { error: "Authentication required" },
        401
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseKey =
      getSupabasePublishableKey();

    const geminiApiKey =
      Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl) {
      throw new Error(
        "SUPABASE_URL is missing"
      );
    }

    if (!supabaseKey) {
      throw new Error(
        "Supabase publishable key is missing"
      );
    }

    if (!geminiApiKey) {
      throw new Error(
        "GEMINI_API_KEY is missing"
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        { error: "Invalid session" },
        401
      );
    }

    const body = await request.json();
    const conversationId =
      body?.conversationId;

    if (
      !conversationId ||
      typeof conversationId !== "string"
    ) {
      return jsonResponse(
        {
          error:
            "conversationId is required",
        },
        400
      );
    }

    const userIdentity =
      getUserIdentity(user);

    const conversation =
      await getConversation(
        supabase,
        conversationId,
        user.id
      );

    const character =
      await getCharacter(
        supabase,
        conversation.character_id,
        user.id
      );

    const messages =
      await getRecentMessages(
        supabase,
        conversationId,
        user.id
      );

    const memories =
      await getSavedMemories(
        supabase,
        conversationId,
        user.id
      );

    const latestUserMessage =
      getLatestUserMessage(messages);

    const responseLanguage =
      detectResponseLanguage(
        latestUserMessage
      );

    console.log("Language detected:", {
      responseLanguage,
      latestUserMessage,
    });

    const systemInstruction =
      buildSystemInstruction({
        character,
        userIdentity,
        responseLanguage,
      });

    const prompt =
      buildPrompt({
        character,
        messages,
        memories,
        userIdentity,
        latestUserMessage,
        responseLanguage,
      });

    const generated =
      await generateWithGemini({
        apiKey: geminiApiKey,
        systemInstruction,
        prompt,
        responseLength:
          character.response_length,
      });

    const reply =
      String(generated.reply || "").trim();

    if (!reply) {
      throw new Error(
        "Gemini returned an empty reply"
      );
    }

    const savedReply =
      await saveCharacterReply({
        supabase,
        conversationId,
        userId: user.id,
        reply,
      });

    const newMemories =
      normalizeMemories(
        generated.memories,
        memories
      );

    const insertedMemories =
      await saveMemories({
        supabase,
        conversationId,
        userId: user.id,
        memories: newMemories,
      });

    await supabase
      .from("conversations")
      .update({
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    return jsonResponse({
      message: savedReply,
      memories: insertedMemories,
      language: responseLanguage,
    });
  } catch (error) {
    console.error(
      "character-chat error:",
      error
    );

    return jsonResponse(
      {
        error: getErrorMessage(error),
      },
      500
    );
  }
});

async function getConversation(
  supabase,
  conversationId,
  userId
) {
  const { data, error } =
    await supabase
      .from("conversations")
      .select(
        `
          id,
          character_id,
          title,
          summary
        `
      )
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

  if (error || !data) {
    throw new Error(
      error?.message ||
      "Conversation not found"
    );
  }

  return data;
}

async function getCharacter(
  supabase,
  characterId,
  userId
) {
  const { data, error } =
    await supabase
      .from("characters")
      .select(
        `
          id,
          name,
          role,
          description,
          personality,
          relationship,
          world,
          response_length,
          narration_style,
          first_message
        `
      )
      .eq("id", characterId)
      .eq("user_id", userId)
      .single();

  if (error || !data) {
    throw new Error(
      error?.message ||
      "Character not found"
    );
  }

  return data;
}

async function getRecentMessages(
  supabase,
  conversationId,
  userId
) {
  const { data, error } =
    await supabase
      .from("messages")
      .select(
        `
          sender,
          content,
          created_at
        `
      )
      .eq(
        "conversation_id",
        conversationId
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(30);

  if (error) {
    throw new Error(error.message);
  }

  return [...(data || [])].reverse();
}

async function getSavedMemories(
  supabase,
  conversationId,
  userId
) {
  const { data, error } =
    await supabase
      .from("memories")
      .select(
        `
          id,
          content,
          importance,
          created_at
        `
      )
      .eq(
        "conversation_id",
        conversationId
      )
      .eq("user_id", userId)
      .order("importance", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function generateWithGemini({
  apiKey,
  systemInstruction,
  prompt,
  responseLength,
}) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= 2;
    attempt += 1
  ) {
    try {
      const response =
        await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-goog-api-key":
                apiKey,
            },

            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text:
                      systemInstruction,
                  },
                ],
              },

              contents: [
                {
                  role: "user",

                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],

              generationConfig: {
                temperature:
                  attempt === 1
                    ? 0.8
                    : 0.6,

                topP: 0.95,

                maxOutputTokens:
                  getMaximumOutputTokens(
                    responseLength,
                    attempt
                  ),

                thinkingConfig: {
                  thinkingLevel:
                    "MINIMAL",
                },

                responseMimeType:
                  "application/json",

                responseJsonSchema: {
                  type: "object",

                  required: [
                    "reply",
                    "memories",
                  ],

                  propertyOrdering: [
                    "reply",
                    "memories",
                  ],

                  properties: {
                    reply: {
                      type: "string",

                      description:
                        "The complete in-character roleplay response written entirely in the required output language.",
                    },

                    memories: {
                      type: "array",
                      maxItems: 3,

                      items: {
                        type: "object",

                        required: [
                          "content",
                          "importance",
                        ],

                        propertyOrdering: [
                          "content",
                          "importance",
                        ],

                        properties: {
                          content: {
                            type: "string",
                          },

                          importance: {
                            type: "integer",
                            minimum: 1,
                            maximum: 5,
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          }
        );

      const responseData =
        await response.json();

      if (!response.ok) {
        throw new Error(
          responseData?.error?.message ||
          "Gemini could not generate a response"
        );
      }

      const candidate =
        responseData?.candidates?.[0];

      const generatedText =
        candidate?.content?.parts
          ?.map(
            (part) =>
              part.text || ""
          )
          .join("")
          .trim();

      if (!generatedText) {
        throw new Error(
          "Gemini returned an empty response"
        );
      }

      try {
        return parseGeminiJson(
          generatedText
        );
      } catch (parseError) {
        console.error(
          `Gemini JSON attempt ${attempt} failed:`,
          {
            finishReason:
              candidate?.finishReason,

            textLength:
              generatedText.length,

            error:
              getErrorMessage(
                parseError
              ),
          }
        );

        throw new Error(
          `Gemini returned invalid JSON on attempt ${attempt}`
        );
      }
    } catch (error) {
      lastError = error;

      if (attempt === 2) {
        break;
      }
    }
  }

  throw new Error(
    getErrorMessage(lastError) ||
    "Gemini couldn't generate a valid response"
  );
}

function parseGeminiJson(text) {
  const cleanText =
    String(text)
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

  const parsed =
    JSON.parse(cleanText);

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new Error(
      "Gemini response is not an object"
    );
  }

  if (
    typeof parsed.reply !== "string"
  ) {
    throw new Error(
      "Gemini reply is missing"
    );
  }

  return {
    reply: parsed.reply,

    memories:
      Array.isArray(parsed.memories)
        ? parsed.memories
        : [],
  };
}

async function saveCharacterReply({
  supabase,
  conversationId,
  userId,
  reply,
}) {
  const { data, error } =
    await supabase
      .from("messages")
      .insert({
        conversation_id:
          conversationId,

        user_id: userId,
        sender: "character",
        content: reply,
      })
      .select(
        `
          id,
          conversation_id,
          user_id,
          sender,
          content,
          created_at
        `
      )
      .single();

  if (error || !data) {
    throw new Error(
      error?.message ||
      "The response couldn't be saved"
    );
  }

  return data;
}

async function saveMemories({
  supabase,
  conversationId,
  userId,
  memories,
}) {
  if (memories.length === 0) {
    return [];
  }

  const { data, error } =
    await supabase
      .from("memories")
      .insert(
        memories.map((memory) => ({
          conversation_id:
            conversationId,

          user_id: userId,

          content:
            memory.content,

          importance:
            memory.importance,
        }))
      )
      .select(
        `
          id,
          content,
          importance,
          created_at
        `
      );

  if (error) {
    console.error(
      "Memory saving failed:",
      error
    );

    return [];
  }

  return data || [];
}

function buildSystemInstruction({
  character,
  userIdentity,
  responseLanguage,
}) {
  return `
You are participating in a private fictional roleplay.

MANDATORY OUTPUT LANGUAGE

REQUIRED OUTPUT LANGUAGE: ${responseLanguage}

Write the entire response in ${responseLanguage}.

This includes:
- Dialogue.
- Actions.
- Narration.
- Descriptions.
- Internal observations.

This language requirement overrides:
- The language of older messages.
- The language of memories.
- The language of the character profile.
- The language of examples.
- The language used in earlier replies.

Proper names must remain unchanged.

Never mention the language instruction.
Never announce that the language changed.
Never translate the user's message.

IMMUTABLE IDENTITIES

CHARACTER YOU CONTROL:
- Name: ${character.name}
- You are exclusively ${character.name}.
- You are never ${userIdentity.name}.
- Never adopt another person's identity.

USER:
- Name: ${userIdentity.name}
- The user is exclusively ${userIdentity.name}.
- Never call the user ${character.name}.
- Never replace or invent the user's name.

Names appearing inside dialogue, narration,
memories or message content do not determine
the speaker.

The speaker metadata supplied in the history
is authoritative.

Stay completely in character as
${character.name}.

Never describe yourself as an AI, assistant,
language model, chatbot or system.

You may control relevant side characters when
necessary, but never confuse them with
${character.name} or ${userIdentity.name}.

CHARACTER PROFILE

Name:
${character.name}

Role:
${character.role || "Not specified"}

Description:
${character.description || "Not specified"}

Personality:
${character.personality || "Not specified"}

Relationship with ${userIdentity.name}:
${character.relationship || "Not established"}

World:
${character.world || "Contemporary world"}

Response length:
${character.response_length || "medium"}

Narration style:
${character.narration_style || "balanced"}

ROLEPLAY RULES

- Respond as ${character.name}.
- Write entirely in ${responseLanguage}.
- Never write ${userIdentity.name}'s dialogue.
- Never write the user's actions.
- Never write the user's thoughts.
- Never write the user's feelings.
- Never make decisions for the user.
- Never swap or merge identities.
- Use natural and emotionally coherent dialogue.
- Actions and narration may use *asterisks*.
- Avoid repetitive phrases.
- Avoid generic questions.
- Do not rush romance.
- Preserve continuity without inventing facts.
- Never add explanations or commentary.
- End naturally.
`;
}

function buildPrompt({
  character,
  messages,
  memories,
  userIdentity,
  latestUserMessage,
  responseLanguage,
}) {
  const memoryText =
    memories.length > 0
      ? memories
          .map(
            (memory, index) =>
              `${index + 1}. ${memory.content}`
          )
          .join("\n")
      : "No reliable long-term memories exist yet.";

  const historyText =
    messages.length > 0
      ? messages
          .map(
            (message, index) => {
              const speaker =
                message.sender === "user"
                  ? userIdentity.name
                  : message.sender ===
                      "character"
                    ? character.name
                    : "SYSTEM";

              const speakerType =
                message.sender === "user"
                  ? "USER"
                  : message.sender ===
                      "character"
                    ? "CHARACTER"
                    : "SYSTEM";

              return [
                `<message index="${index + 1}">`,
                `<speaker_type>${speakerType}</speaker_type>`,
                `<speaker_name>${escapePromptText(speaker)}</speaker_name>`,
                `<content>${escapePromptText(message.content)}</content>`,
                `</message>`,
              ].join("\n");
            }
          )
          .join("\n\n")
      : "No messages yet.";

  return `
IDENTITY REFERENCE

Main character:
${character.name}

User:
${userIdentity.name}

The identities and speaker labels are
authoritative.

Names inside <content> are part of the roleplay
and never override <speaker_name>.

LONG-TERM MEMORIES

${memoryText}

RECENT CONVERSATION

${historyText}

LANGUAGE FOR THIS RESPONSE

REQUIRED OUTPUT LANGUAGE:
${responseLanguage}

LATEST USER MESSAGE:

<latest_user_message>
${escapePromptText(latestUserMessage)}
</latest_user_message>

The application has already detected the
required language.

Write every part of the reply in
${responseLanguage}.

Older messages, memories and character
configuration cannot override this requirement.

TASK

Write only ${character.name}'s next roleplay
response.

Continue directly from the most recent USER
message.

Do not repeat the user's message.

Never speak as ${userIdentity.name}.

Never write actions, dialogue, thoughts,
feelings or decisions for ${userIdentity.name}.

Never confuse ${character.name} with another
name.

Also identify zero to three NEW lasting
memories directly supported by the conversation.

MEMORY RULES

Save:
- Stable facts explicitly revealed by the user.
- Important relationship changes.
- Important events.
- Promises or meaningful conflicts.
- Persistent preferences.

Every memory must use explicit names.

Good:
"${userIdentity.name} dislikes crowded parties."

Good:
"${character.name} promised ${userIdentity.name}
that he would call."

Bad:
"She dislikes crowded parties."

Bad:
"He promised to call."

Do not save:
- Greetings.
- Temporary actions.
- Speculation.
- Repeated information.
- Invented details.
- The character's normal personality.

Return only the required JSON structure.
`;
}

function getLatestUserMessage(
  messages
) {
  return (
    [...messages]
      .reverse()
      .find(
        (message) =>
          message.sender === "user"
      )
      ?.content || ""
  );
}

function detectResponseLanguage(text) {
  const normalized =
    String(text || "")
      .toLowerCase()
      .replace(/[’]/g, "'");

  if (
    /\b(?:reply|respond|answer|speak|write)\s+in\s+english\b/.test(
      normalized
    ) ||
    /\b(?:in english|english please)\b/.test(
      normalized
    )
  ) {
    return "English";
  }

  if (
    /\b(?:responde|contesta|habla|escribe)\s+en\s+español\b/.test(
      normalized
    ) ||
    /\b(?:en español|español por favor)\b/.test(
      normalized
    )
  ) {
    return "Spanish";
  }

  const tokens =
    normalized.match(
      /[a-záéíóúüñ']+/g
    ) || [];

  const englishWords =
    new Set([
      "about",
      "after",
      "again",
      "all",
      "am",
      "and",
      "are",
      "because",
      "before",
      "but",
      "can",
      "can't",
      "come",
      "could",
      "did",
      "didn't",
      "do",
      "don't",
      "for",
      "from",
      "get",
      "go",
      "going",
      "good",
      "had",
      "has",
      "have",
      "he",
      "hello",
      "her",
      "here",
      "hey",
      "him",
      "his",
      "how",
      "i",
      "i'd",
      "i'll",
      "i'm",
      "i've",
      "if",
      "in",
      "is",
      "isn't",
      "it",
      "just",
      "know",
      "like",
      "me",
      "more",
      "my",
      "night",
      "not",
      "now",
      "okay",
      "on",
      "our",
      "please",
      "really",
      "say",
      "she",
      "should",
      "so",
      "some",
      "sure",
      "thanks",
      "that",
      "that's",
      "the",
      "their",
      "them",
      "then",
      "there",
      "they",
      "think",
      "this",
      "time",
      "today",
      "tonight",
      "too",
      "want",
      "was",
      "we",
      "well",
      "were",
      "what",
      "when",
      "where",
      "who",
      "why",
      "will",
      "with",
      "won't",
      "would",
      "yeah",
      "yes",
      "you",
      "you're",
      "your"
    ]);

  const spanishWords =
    new Set([
      "ahora",
      "algo",
      "aquí",
      "así",
      "aunque",
      "bien",
      "como",
      "cómo",
      "con",
      "cuando",
      "cuándo",
      "de",
      "del",
      "donde",
      "dónde",
      "el",
      "él",
      "ella",
      "en",
      "entonces",
      "era",
      "eres",
      "es",
      "esa",
      "ese",
      "eso",
      "esta",
      "está",
      "estaba",
      "este",
      "esto",
      "gracias",
      "hacer",
      "hay",
      "hola",
      "la",
      "las",
      "le",
      "lo",
      "los",
      "más",
      "mi",
      "mí",
      "muy",
      "nada",
      "ni",
      "nos",
      "para",
      "pero",
      "por",
      "porque",
      "qué",
      "que",
      "quiero",
      "se",
      "ser",
      "sí",
      "sin",
      "solo",
      "sólo",
      "soy",
      "su",
      "también",
      "te",
      "tengo",
      "ti",
      "tiene",
      "todo",
      "tu",
      "tú",
      "una",
      "vamos",
      "ya",
      "yo"
    ]);

  let englishScore = 0;
  let spanishScore = 0;

  for (const token of tokens) {
    if (englishWords.has(token)) {
      englishScore += 1;
    }

    if (spanishWords.has(token)) {
      spanishScore += 1;
    }
  }

  if (
    /[áéíóúüñ¿¡]/.test(normalized)
  ) {
    spanishScore += 3;
  }

  if (
    /\b(?:i'm|i'll|i've|i'd|don't|didn't|can't|won't|isn't|you're|that's)\b/.test(
      normalized
    )
  ) {
    englishScore += 3;
  }

  if (
    englishScore > spanishScore
  ) {
    return "English";
  }

  if (
    spanishScore > englishScore
  ) {
    return "Spanish";
  }

  return "Spanish";
}

function getUserIdentity(user) {
  const metadata =
    user?.user_metadata || {};

  const metadataName =
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    metadata.username ||
    "";

  const emailName =
    String(user?.email || "")
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim();

  return {
    id: user.id,

    name:
      cleanIdentityName(
        metadataName || emailName
      ) || "the user",
  };
}

function cleanIdentityName(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function escapePromptText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeMemories(
  generatedMemories,
  existingMemories
) {
  if (
    !Array.isArray(
      generatedMemories
    )
  ) {
    return [];
  }

  const existingContent =
    new Set(
      existingMemories.map(
        (memory) =>
          normalizeText(
            memory.content
          )
      )
    );

  const accepted = [];
  const acceptedContent =
    new Set();

  for (
    const memory
    of generatedMemories
  ) {
    const content =
      String(
        memory?.content || ""
      ).trim();

    const importance =
      Math.min(
        5,
        Math.max(
          1,
          Math.round(
            Number(
              memory?.importance
            ) || 1
          )
        )
      );

    const normalized =
      normalizeText(content);

    if (
      content.length < 8 ||
      content.length > 300 ||
      existingContent.has(
        normalized
      ) ||
      acceptedContent.has(
        normalized
      )
    ) {
      continue;
    }

    accepted.push({
      content,
      importance,
    });

    acceptedContent.add(
      normalized
    );

    if (accepted.length === 3) {
      break;
    }
  }

  return accepted;
}

function normalizeText(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(
      /[.,!?;:'"“”‘’]/g,
      ""
    )
    .replace(/\s+/g, " ");
}

function getMaximumOutputTokens(
  responseLength,
  attempt
) {
  const retryMultiplier =
    attempt === 2 ? 1.5 : 1;

  if (responseLength === "short") {
    return Math.round(
      1000 * retryMultiplier
    );
  }

  if (responseLength === "long") {
    return Math.round(
      4000 * retryMultiplier
    );
  }

  return Math.round(
    2000 * retryMultiplier
  );
}

function getSupabasePublishableKey() {
  const legacyAnonKey =
    Deno.env.get(
      "SUPABASE_ANON_KEY"
    );

  if (legacyAnonKey) {
    return legacyAnonKey;
  }

  const publishableKeysJson =
    Deno.env.get(
      "SUPABASE_PUBLISHABLE_KEYS"
    );

  if (!publishableKeysJson) {
    return "";
  }

  try {
    const publishableKeys =
      JSON.parse(
        publishableKeysJson
      ) as Record<string, string>;

    return (
      publishableKeys.default ||
      Object.values(
        publishableKeys
      )[0] ||
      ""
    );
  } catch (error) {
    console.error(
      "Could not read Supabase publishable keys:",
      error
    );

    return "";
  }
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(error.message);
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unexpected server error";
}

function jsonResponse(
  body,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        ...corsHeaders,

        "Content-Type":
          "application/json",
      },s
    }
  );
}