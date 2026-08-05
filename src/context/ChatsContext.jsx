import {
  createContext,
  useContext,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import { supabase } from "../services/supabase";

const ChatsContext = createContext();

export function ChatsProvider({
  children,
}) {
  const { user } = useAuth();

  const [chats, setChats] =
    useState({});

  const openingConversations =
    useRef({});

  function getCharacterMessages(
    characterId
  ) {
    return (
      chats[characterId]
        ?.messages || []
    );
  }

  function getConversation(
    characterId
  ) {
    return (
      chats[characterId] ||
      null
    );
  }

  function isConversationLoading(
    characterId
  ) {
    return (
      chats[characterId]
        ?.loading || false
    );
  }

  function isCharacterStreaming(
    characterId
  ) {
    return (
      chats[characterId]
        ?.messages || []
    ).some(
      (chatMessage) =>
        chatMessage.isStreaming
    );
  }

  async function startConversation(
    character
  ) {
    if (!user) {
      throw new Error(
        "You need to sign in before starting a conversation."
      );
    }

    if (
      chats[character.id]
        ?.conversationId
    ) {
      return chats[
        character.id
      ];
    }

    if (
      openingConversations
        .current[
        character.id
      ]
    ) {
      return openingConversations
        .current[
        character.id
      ];
    }

    const openingPromise =
      openOrCreateConversation(
        character
      );

    openingConversations
      .current[
      character.id
    ] = openingPromise;

    try {
      return await openingPromise;
    } finally {
      delete openingConversations
        .current[
        character.id
      ];
    }
  }

  async function openOrCreateConversation(
    character
  ) {
    setChats(
      (currentChats) => ({
        ...currentChats,

        [character.id]: {
          ...currentChats[
            character.id
          ],

          messages:
            currentChats[
              character.id
            ]?.messages || [],

          loading: true,
          error: "",
        },
      })
    );

    try {
      let conversation =
        await findLatestConversation(
          character.id
        );

      if (!conversation) {
        conversation =
          await createConversation(
            character
          );
      }

      let messages =
        await loadConversationMessages(
          conversation.id
        );

      if (
        messages.length === 0
      ) {
        const firstMessage =
          await createFirstMessage(
            conversation.id,
            character
          );

        messages = [
          firstMessage,
        ];
      }

      const chatData = {
        conversationId:
          conversation.id,

        characterId:
          character.id,

        title:
          conversation.title ||
          character.name,

        messages,
        loading: false,
        error: "",
      };

      setChats(
        (currentChats) => ({
          ...currentChats,

          [character.id]:
            chatData,
        })
      );

      return chatData;
    } catch (error) {
      console.error(
        "Error opening conversation:",
        error
      );

      setChats(
        (currentChats) => ({
          ...currentChats,

          [character.id]: {
            ...currentChats[
              character.id
            ],

            loading: false,

            error:
              error.message ||
              "We couldn't open this conversation.",
          },
        })
      );

      throw error;
    }
  }

  async function findLatestConversation(
    characterId
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("conversations")
      .select("*")
      .eq(
        "character_id",
        characterId
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async function createConversation(
    character
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,

        character_id:
          character.id,

        title:
          character.name,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function loadConversationMessages(
    conversationId
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("messages")
      .select("*")
      .eq(
        "conversation_id",
        conversationId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      throw error;
    }

    return (
      data || []
    ).map(
      convertDatabaseMessage
    );
  }

  async function createFirstMessage(
    conversationId,
    character
  ) {
    const content =
      character.firstMessage ||
      `*${character.name} looks at you quietly.* “So, where should our story begin?”`;

    const {
      data,
      error,
    } = await supabase
      .from("messages")
      .insert({
        conversation_id:
          conversationId,

        user_id: user.id,

        sender:
          "character",

        content,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return convertDatabaseMessage(
      data
    );
  }

  async function addMessage(
    characterId,
    sender,
    content
  ) {
    const conversation =
      chats[characterId];

    if (
      !conversation
        ?.conversationId
    ) {
      throw new Error(
        "The conversation is not ready yet."
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("messages")
      .insert({
        conversation_id:
          conversation
            .conversationId,

        user_id:
          user.id,

        sender,

        content:
          content.trim(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const newMessage =
      convertDatabaseMessage(
        data
      );

    appendMessageToState(
      characterId,
      newMessage
    );

    await supabase
      .from("conversations")
      .update({
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        conversation
          .conversationId
      );

    return newMessage;
  }

  async function generateCharacterReply(
    characterId
  ) {
    const conversation =
      chats[characterId];

    if (
      !conversation
        ?.conversationId
    ) {
      throw new Error(
        "The conversation is not ready yet."
      );
    }

    const {
      data: sessionData,
      error: sessionError,
    } = await supabase
      .auth
      .getSession();

    if (
      sessionError ||
      !sessionData
        ?.session
        ?.access_token
    ) {
      throw new Error(
        "Your session expired. Sign in again."
      );
    }

    const functionUrl =
      getCharacterChatUrl();

    const publishableKey =
      getBrowserPublishableKey();

    const response =
      await fetch(
        functionUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${sessionData.session.access_token}`,

            ...(publishableKey
              ? {
                  apikey:
                    publishableKey,
                }
              : {}),
          },

          body:
            JSON.stringify({
              conversationId:
                conversation
                  .conversationId,
            }),
        }
      );

    if (!response.ok) {
      const message =
        await readStreamingError(
          response
        );

      throw new Error(
        message
      );
    }

    if (!response.body) {
      throw new Error(
        "The AI returned an empty response."
      );
    }

    const streamMessageId =
      `stream-${crypto.randomUUID()}`;

    let streamStarted = false;
    let completeContent = "";
    let finalMessage = null;
    let streamError = "";

    const reader =
      response.body
        .getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        break;
      }

      buffer +=
        decoder.decode(
          value,
          {
            stream: true,
          }
        );

      const events =
        buffer.split("\n\n");

      buffer =
        events.pop() || "";

      for (
        const rawEvent
        of events
      ) {
        const dataLines =
          rawEvent
            .split("\n")
            .filter(
              (line) =>
                line.startsWith(
                  "data:"
                )
            )
            .map(
              (line) =>
                line
                  .slice(5)
                  .trim()
            );

        for (
          const dataLine
          of dataLines
        ) {
          if (!dataLine) {
            continue;
          }

          let eventData;

          try {
            eventData =
              JSON.parse(
                dataLine
              );
          } catch {
            continue;
          }

          if (
            eventData.type ===
            "chunk"
          ) {
            const chunk =
              String(
                eventData
                  .content || ""
              );

            if (!chunk) {
              continue;
            }

            completeContent +=
              chunk;

            if (!streamStarted) {
              streamStarted =
                true;

              appendMessageToState(
                characterId,
                {
                  id:
                    streamMessageId,

                  conversationId:
                    conversation
                      .conversationId,

                  userId:
                    user.id,

                  sender:
                    "character",

                  content:
                    completeContent,

                  createdAt:
                    new Date()
                      .toISOString(),

                  isStreaming:
                    true,
                }
              );
            } else {
              updateStreamingMessage(
                characterId,
                streamMessageId,
                completeContent
              );
            }

            continue;
          }

          if (
            eventData.type ===
            "done"
          ) {
            finalMessage =
              convertDatabaseMessage(
                eventData.message
              );

            if (streamStarted) {
              replaceStreamingMessage(
                characterId,
                streamMessageId,
                finalMessage
              );
            } else {
              appendMessageToState(
                characterId,
                finalMessage
              );
            }

            continue;
          }

          if (
            eventData.type ===
            "error"
          ) {
            streamError =
              eventData.error ||
              "The character couldn't respond.";
          }
        }
      }
    }

    buffer +=
      decoder.decode();

    if (streamError) {
      if (streamStarted) {
        removeMessageFromState(
          characterId,
          streamMessageId
        );
      }

      throw new Error(
        streamError
      );
    }

    if (!finalMessage) {
      if (streamStarted) {
        removeMessageFromState(
          characterId,
          streamMessageId
        );
      }

      throw new Error(
        "The response ended before it could be saved."
      );
    }

    return {
      message:
        finalMessage,

      memories: [],
    };
  }

  function appendMessageToState(
    characterId,
    newMessage
  ) {
    setChats(
      (currentChats) => {
        const currentMessages =
          currentChats[
            characterId
          ]?.messages || [];

        const alreadyExists =
          currentMessages.some(
            (chatMessage) =>
              chatMessage.id ===
              newMessage.id
          );

        if (alreadyExists) {
          return currentChats;
        }

        return {
          ...currentChats,

          [characterId]: {
            ...currentChats[
              characterId
            ],

            messages: [
              ...currentMessages,
              newMessage,
            ],
          },
        };
      }
    );
  }

  function updateStreamingMessage(
    characterId,
    streamMessageId,
    content
  ) {
    setChats(
      (currentChats) => ({
        ...currentChats,

        [characterId]: {
          ...currentChats[
            characterId
          ],

          messages: (
            currentChats[
              characterId
            ]?.messages || []
          ).map(
            (chatMessage) =>
              chatMessage.id ===
              streamMessageId
                ? {
                    ...chatMessage,
                    content,
                  }
                : chatMessage
          ),
        },
      })
    );
  }

  function replaceStreamingMessage(
    characterId,
    streamMessageId,
    finalMessage
  ) {
    setChats(
      (currentChats) => {
        const currentMessages =
          currentChats[
            characterId
          ]?.messages || [];

        const finalAlreadyExists =
          currentMessages.some(
            (chatMessage) =>
              chatMessage.id ===
              finalMessage.id
          );

        return {
          ...currentChats,

          [characterId]: {
            ...currentChats[
              characterId
            ],

            messages:
              finalAlreadyExists
                ? currentMessages
                    .filter(
                      (chatMessage) =>
                        chatMessage.id !==
                        streamMessageId
                    )
                : currentMessages
                    .map(
                      (chatMessage) =>
                        chatMessage.id ===
                        streamMessageId
                          ? finalMessage
                          : chatMessage
                    ),
          },
        };
      }
    );
  }

  function removeMessageFromState(
    characterId,
    messageId
  ) {
    setChats(
      (currentChats) => ({
        ...currentChats,

        [characterId]: {
          ...currentChats[
            characterId
          ],

          messages: (
            currentChats[
              characterId
            ]?.messages || []
          ).filter(
            (chatMessage) =>
              chatMessage.id !==
              messageId
          ),
        },
      })
    );
  }

  async function reloadConversationMessages(
    characterId
  ) {
    const conversation =
      chats[characterId];

    if (
      !conversation
        ?.conversationId
    ) {
      return [];
    }

    const messages =
      await loadConversationMessages(
        conversation
          .conversationId
      );

    setChats(
      (currentChats) => ({
        ...currentChats,

        [characterId]: {
          ...currentChats[
            characterId
          ],

          messages,
        },
      })
    );

    return messages;
  }

  async function deleteConversation(
    characterId
  ) {
    const conversationId =
      chats[characterId]
        ?.conversationId;

    if (!conversationId) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("conversations")
      .delete()
      .eq(
        "id",
        conversationId
      );

    if (error) {
      throw error;
    }

    setChats(
      (currentChats) => {
        const updatedChats = {
          ...currentChats,
        };

        delete updatedChats[
          characterId
        ];

        return updatedChats;
      }
    );
  }

  return (
    <ChatsContext.Provider
      value={{
        chats,
        getCharacterMessages,
        getConversation,
        isConversationLoading,
        isCharacterStreaming,
        startConversation,
        addMessage,
        generateCharacterReply,
        reloadConversationMessages,
        deleteConversation,
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
}

function convertDatabaseMessage(
  message
) {
  return {
    id: message.id,

    conversationId:
      message
        .conversation_id,

    userId:
      message.user_id,

    sender:
      message.sender,

    content:
      message.content,

    createdAt:
      message.created_at,

    isStreaming: false,
  };
}

function getCharacterChatUrl() {
  const supabaseUrl =
    import.meta.env
      .VITE_SUPABASE_URL ||
    supabase.supabaseUrl;

  if (!supabaseUrl) {
    throw new Error(
      "VITE_SUPABASE_URL is missing."
    );
  }

  return (
    `${supabaseUrl}` +
    "/functions/v1/character-chat"
  );
}

function getBrowserPublishableKey() {
  return (
    import.meta.env
      .VITE_SUPABASE_ANON_KEY ||

    import.meta.env
      .VITE_SUPABASE_PUBLISHABLE_KEY ||

    supabase.supabaseKey ||

    ""
  );
}

async function readStreamingError(
  response
) {
  try {
    const text =
      await response.text();

    if (!text) {
      return (
        `The AI request failed ` +
        `with status ${response.status}.`
      );
    }

    try {
      const parsed =
        JSON.parse(text);

      return (
        parsed?.error ||
        parsed
          ?.message ||
        text
      );
    } catch {
      return text;
    }
  } catch {
    return (
      `The AI request failed ` +
      `with status ${response.status}.`
    );
  }
}

export function useChats() {
  const context =
    useContext(
      ChatsContext
    );

  if (!context) {
    throw new Error(
      "useChats debe utilizarse dentro de ChatsProvider"
    );
  }

  return context;
}