import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";
import { supabase } from "../services/supabase";
import { characterStoryStyleInstruction } from "../utils/characterStoryStyle";
import { isProbablyUuid, isRetryableNetworkError, isRetryableStatus, recordGenerationMetric, wait } from "../utils/velvetResilience";

const ChatsContext = createContext();
const MESSAGE_PAGE_SIZE = 40;

export function ChatsProvider({
  children,
}) {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [chats, setChats] =
    useState({});

  // VELVET_GENERATION_MANAGER_V1
  // Generation state is independent from temporary streaming bubbles.
  // A lost/aborted stream can never leave the composer permanently locked.
  const [generationStates, setGenerationStates] =
    useState({});

  const openingConversations =
    useRef({});

  const activeRequests = useRef({});
  const offlineQueueRef = useRef([]);
  const flushingOfflineRef = useRef(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      offlineQueueRef.current = [];
      setOfflineQueueSize(0);
      return;
    }
    offlineQueueRef.current = readOfflineQueue(user.id);
    setOfflineQueueSize(offlineQueueRef.current.length);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const flush = () => { void flushOfflineQueue(); };
    window.addEventListener("online", flush);
    const timer = window.setTimeout(flush, 500);
    return () => {
      window.removeEventListener("online", flush);
      window.clearTimeout(timer);
    };
  }, [user?.id, chats]);


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

  function getGenerationState(characterId) {
    return generationStates[characterId] || "idle";
  }

  function isCharacterGenerating(characterId) {
    return getGenerationState(characterId) !== "idle";
  }

  async function startConversation(
    character,
    options = {}
  ) {
    if (!user) {
      throw new Error(
        "You need to sign in before starting a conversation."
      );
    }

    const requestedConversationId = options.conversationId || null;
    const forceNew = Boolean(options.forceNew);

    if (
      !forceNew &&
      chats[character.id]?.conversationId &&
      (!requestedConversationId || chats[character.id].conversationId === requestedConversationId)
    ) {
      return chats[
        character.id
      ];
    }

    const openingKey = forceNew
      ? `${character.id}-new-${crypto.randomUUID()}`
      : `${character.id}-${requestedConversationId || "latest"}`;

    if (
      openingConversations
        .current[openingKey]
    ) {
      return openingConversations
        .current[openingKey];
    }

    const openingPromise =
      openOrCreateConversation(
        character,
        { ...options, requestedConversationId, forceNew }
      );

    openingConversations
      .current[openingKey] = openingPromise;

    try {
      return await openingPromise;
    } finally {
      delete openingConversations
        .current[openingKey];
    }
  }

  async function openOrCreateConversation(
    character,
    options = {}
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
      let conversation = null;

      if (options.requestedConversationId) {
        conversation = await findConversationById(
          options.requestedConversationId,
          character.id
        );
      } else if (!options.forceNew) {
        conversation = await findLatestConversation(character.id);
      }

      if (!conversation) {
        conversation = await createConversation(character, {
          isAdditional: options.forceNew,
          personaId: options.personaId,
          lorebookId: options.lorebookId,
          title: options.title,
          groupCharacterIds: options.groupCharacterIds,
          groupTitle: options.groupTitle,
        });
      }

      const messagePage = await loadConversationMessages(conversation.id);
      let messages = messagePage.messages;
      let hasMoreMessages = messagePage.hasMore;

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
        hasMoreMessages = false;
      }

      const chatData = {
        conversationId:
          conversation.id,

        characterId:
          character.id,

        title:
          conversation.title ||
          character.name,

        groupMode: Boolean(conversation.group_mode),
        groupCharacterIds: Array.isArray(conversation.group_character_ids) ? conversation.group_character_ids : [],
        groupTitle: conversation.group_title || "",
        coverUrl: conversation.cover_url || "",
        coverTitle: conversation.cover_title || "",
        coverMood: conversation.cover_mood || "",
        ambientMode: conversation.ambient_mode || "none",
        ambientVolume: Number(conversation.ambient_volume ?? 18),
        previousOpenedAt: conversation.last_opened_at || "",
        catchUpAvailable: Boolean(
          conversation.last_opened_at &&
          Date.now() - new Date(conversation.last_opened_at).getTime() >= 6 * 60 * 60 * 1000 &&
          (conversation.story_recap || conversation.summary)
        ),

        summary: conversation.summary || "",
        storyRecap: conversation.story_recap || conversation.summary || "",
        intelligenceState: conversation.intelligence_state || { objects: [], knowledge: [], commitments: [], stakes: "" },

        responseLengthOverride:
          conversation.response_length_override || "",

        narrationStyleOverride:
          conversation.narration_style_override || "",

        creativity:
          Number(conversation.creativity ?? 0.84),

        romanceIntensity: Number(conversation.romance_intensity ?? 35),
        initiative: Number(conversation.initiative ?? 65),
        drama: Number(conversation.drama ?? 45),
        flirting: Number(conversation.flirting ?? 30),
        humor: Number(conversation.humor ?? 45),
        descriptionLevel: Number(conversation.description_level ?? 55),
        characterIndependence: Number(conversation.character_independence ?? 80),
        dialogueFrequency: Number(conversation.dialogue_frequency ?? 55),
        narrativeCamera: conversation.narrative_camera || "balanced",
        innerThoughts: conversation.inner_thoughts || "rare",
        storyPreset: conversation.story_preset || "natural",
        pacingMode: conversation.pacing_mode || "natural",
        matureMode: Boolean(conversation.mature_mode),
        sceneState: conversation.scene_state || {},
        storyTimeline: Array.isArray(conversation.story_timeline) ? conversation.story_timeline : [],
        relationshipState: conversation.relationship_state || {},
        castState: conversation.cast_state || {},
        continuityGuard: { status: "stable", protected: [] },
        storyChapters: Array.isArray(conversation.story_chapters) ? conversation.story_chapters : [],
        activeChapter: conversation.active_chapter || {},
        unfinishedThreads: Array.isArray(conversation.unresolved_threads) ? conversation.unresolved_threads : [],
        characterDevelopment: conversation.character_development || {},
        storyEngineVersion: Number(conversation.story_engine_version || 9),
        storyRevision: conversation.story_revision || "",
        branchParentId: conversation.branch_parent_id || "",
        branchFromMessageId: conversation.branch_from_message_id || "",
        branchLabel: conversation.branch_label || "",

        personaId:
          conversation.persona_id || "",

        lorebookId:
          conversation.lorebook_id || "",

        memoryUsage: null,

        loreUsage: null,
        lastLearnedMemoryCount: 0,

        messages,
        hasMoreMessages,
        loadingEarlierMessages: false,
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

      // Keep the previous open time in memory for Catch Me Up, then mark this
      // visit without changing the story's content timestamp.
      void supabase
        .from("conversations")
        .update({ last_opened_at: new Date().toISOString() })
        .eq("id", conversation.id)
        .eq("user_id", user.id);

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
      .eq("group_mode", false)
      .is("trashed_at", null)
      .is("archived_at", null)
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

  async function createConversation(character, options = {}) {
    const { data: defaultPersona } = await supabase
      .from("personas")
      .select("id")
      .eq("is_default", true)
      .maybeSingle();

    const groupIds = [...new Set((options.groupCharacterIds || []).filter(Boolean))];
    if (groupIds.length && !groupIds.includes(character.id)) groupIds.unshift(character.id);
    const groupMode = groupIds.length > 1;

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        character_id: character.id,
        title: options.title?.trim() || options.groupTitle?.trim() || (options.isAdditional ? createConversationTitle() : character.name),
        persona_id: options.personaId || defaultPersona?.id || null,
        lorebook_id: options.lorebookId || null,
        group_mode: groupMode,
        group_character_ids: groupMode ? groupIds : [],
        group_title: groupMode ? (options.groupTitle?.trim() || groupIds.length + " character story") : null,
        character_development: {},
        story_engine_version: 13,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function loadConversationMessages(conversationId, options = {}) {
    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE + 1);

    if (options.before) {
      query = query.lt("created_at", options.before);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = data || [];
    return {
      messages: rows
        .slice(0, MESSAGE_PAGE_SIZE)
        .reverse()
        .map(convertDatabaseMessage),
      hasMore: rows.length > MESSAGE_PAGE_SIZE,
    };
  }

  async function createFirstMessage(
    conversationId,
    character
  ) {
    const content =
      character.firstMessage ||
      `${character.name} glances over. “Hey. What’s going on?”`;

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

  async function bumpStoryRevision(characterId) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) return "";

    const storyRevision = crypto.randomUUID();
    const { error } = await supabase
      .from("conversations")
      .update({ story_revision: storyRevision, updated_at: new Date().toISOString() })
      .eq("id", conversation.conversationId)
      .eq("user_id", user.id);
    if (error) throw error;

    setChats((currentChats) => ({
      ...currentChats,
      [characterId]: {
        ...currentChats[characterId],
        storyRevision,
      },
    }));
    return storyRevision;
  }

  function persistOfflineQueue(nextQueue) {
    offlineQueueRef.current = nextQueue;
    setOfflineQueueSize(nextQueue.length);
    if (!user?.id) return;
    try { localStorage.setItem(offlineQueueKey(user.id), JSON.stringify(nextQueue)); } catch {}
  }

  function queueOptimisticMessage(characterId, conversationId, sender, content, options = {}, optimisticId = `offline-${crypto.randomUUID()}`) {
    const pendingMessage = {
      id: optimisticId,
      conversationId,
      userId: user.id,
      sender,
      content: String(content || "").trim(),
      createdAt: new Date().toISOString(),
      editedAt: null,
      isBookmarked: false,
      bookmarkLabel: "",
      chapterNumber: null,
      replyToMessageId: isProbablyUuid(options.replyToMessageId) ? options.replyToMessageId : null,
      replyPreview: options.replyPreview ? String(options.replyPreview).slice(0, 280) : "",
      replySender: options.replySender || "",
      isStreaming: false,
      isPending: true,
      isOfflinePending: true,
    };

    const alreadyVisible = (chats[characterId]?.messages || []).some((item) => item.id === optimisticId);
    if (!alreadyVisible) appendMessageToState(characterId, pendingMessage);

    const alreadyQueued = offlineQueueRef.current.some((item) => item.localId === optimisticId);
    if (!alreadyQueued) {
      const nextQueue = [...offlineQueueRef.current, {
        localId: optimisticId,
        characterId,
        conversationId,
        content: pendingMessage.content,
        replyToMessageId: pendingMessage.replyToMessageId,
        replyPreview: pendingMessage.replyPreview,
        replySender: pendingMessage.replySender,
        directorInstruction: String(options.directorInstruction || "").trim().slice(0, 500),
        createdAt: pendingMessage.createdAt,
      }];
      persistOfflineQueue(nextQueue);
    }

    try {
      window.dispatchEvent(new CustomEvent("velvet:offline-queue", { detail: { state: "queued", characterId, count: offlineQueueRef.current.length } }));
    } catch {}
    return pendingMessage;
  }

  async function flushOfflineQueue() {
    if (!user?.id || flushingOfflineRef.current || !navigator.onLine || !offlineQueueRef.current.length) return;
    flushingOfflineRef.current = true;
    try {
      let queue = [...offlineQueueRef.current];
      while (queue.length && navigator.onLine) {
        const item = queue[0];
        try {
          const { data, error } = await supabase
            .from("messages")
            .insert({
              conversation_id: item.conversationId,
              user_id: user.id,
              sender: "user",
              content: item.content,
              reply_to_message_id: isProbablyUuid(item.replyToMessageId) ? item.replyToMessageId : null,
              reply_preview: item.replyPreview || null,
              reply_sender: item.replySender || null,
            })
            .select()
            .single();
          if (error) throw error;

          const savedMessage = convertDatabaseMessage(data);
          setChats((currentChats) => {
            const currentChat = currentChats[item.characterId];
            if (!currentChat) return currentChats;
            return {
              ...currentChats,
              [item.characterId]: {
                ...currentChat,
                messages: (currentChat.messages || []).map((message) => message.id === item.localId ? savedMessage : message),
              },
            };
          });

          const storyRevision = crypto.randomUUID();
          await supabase.from("conversations")
            .update({ story_revision: storyRevision, updated_at: new Date().toISOString() })
            .eq("id", item.conversationId)
            .eq("user_id", user.id);

          queue = queue.slice(1);
          persistOfflineQueue(queue);
          try {
            window.dispatchEvent(new CustomEvent("velvet:offline-queue", { detail: { state: "sent", characterId: item.characterId, count: queue.length } }));
          } catch {}

          const loadedConversation = chats[item.characterId];
          if (loadedConversation?.conversationId === item.conversationId && !isCharacterGenerating(item.characterId)) {
            try {
              await generateCharacterReply(item.characterId, {
                expectedUserMessageId: savedMessage.id,
                directorInstruction: item.directorInstruction || "",
              });
            } catch (generationError) {
              console.warn("Queued message was sent, but its reply could not be generated yet:", generationError);
            }
          }
        } catch (error) {
          if (!navigator.onLine || isRetryableNetworkError(error)) break;
          console.warn("Could not flush queued Velvet message:", error);
          break;
        }
      }
    } finally {
      flushingOfflineRef.current = false;
    }
  }

  async function addMessage(
    characterId,
    sender,
    content,
    options = {}
  ) {
    const conversation = chats[characterId];

    if (!conversation?.conversationId) {
      throw new Error("The conversation is not ready yet.");
    }

    const trimmedContent = String(content || "").trim();
    const optimisticId = sender === "user" ? `pending-${crypto.randomUUID()}` : null;
    const safeReplyId = isProbablyUuid(options.replyToMessageId) ? options.replyToMessageId : null;

    if (sender === "user" && navigator.onLine === false) {
      return queueOptimisticMessage(characterId, conversation.conversationId, sender, trimmedContent, { ...options, replyToMessageId: safeReplyId }, optimisticId);
    }

    if (optimisticId) {
      appendMessageToState(characterId, {
        id: optimisticId,
        conversationId: conversation.conversationId,
        userId: user.id,
        sender,
        content: trimmedContent,
        createdAt: new Date().toISOString(),
        editedAt: null,
        isBookmarked: false,
        bookmarkLabel: "",
        chapterNumber: null,
        replyToMessageId: safeReplyId,
        replyPreview: options.replyPreview ? String(options.replyPreview).slice(0, 280) : "",
        replySender: options.replySender || "",
        isStreaming: false,
        isPending: true,
      });
    }

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.conversationId,
          user_id: user.id,
          sender,
          content: trimmedContent,
          reply_to_message_id: safeReplyId,
          reply_preview: options.replyPreview ? String(options.replyPreview).slice(0, 280) : null,
          reply_sender: options.replySender || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newMessage = convertDatabaseMessage(data);

      if (optimisticId) {
        setChats((currentChats) => ({
          ...currentChats,
          [characterId]: {
            ...currentChats[characterId],
            messages: (currentChats[characterId]?.messages || []).map((item) =>
              item.id === optimisticId ? newMessage : item
            ),
          },
        }));
      } else {
        appendMessageToState(characterId, newMessage);
      }

      if (sender === "user") {
        await bumpStoryRevision(characterId);
      } else {
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversation.conversationId)
          .eq("user_id", user.id);
      }

      return newMessage;
    } catch (error) {
      if (optimisticId && sender === "user" && (navigator.onLine === false || isRetryableNetworkError(error))) {
        setChats((currentChats) => ({
          ...currentChats,
          [characterId]: {
            ...currentChats[characterId],
            messages: (currentChats[characterId]?.messages || []).map((item) => item.id === optimisticId ? { ...item, isPending: true, isOfflinePending: true } : item),
          },
        }));
        return queueOptimisticMessage(characterId, conversation.conversationId, sender, trimmedContent, { ...options, replyToMessageId: safeReplyId }, optimisticId);
      }
      if (optimisticId) removeMessageFromState(characterId, optimisticId);
      throw error;
    }
  }

  async function generateCharacterReply(
    characterId,
    options = {}
  ) {
    const conversation = chats[characterId];

    if (!conversation?.conversationId) {
      throw new Error("The conversation is not ready yet.");
    }

    const regenerationMessage = options.regenerateMessageId
      ? (conversation.messages || []).find((item) => item.id === options.regenerateMessageId) || null
      : null;
    const canonicalMessages = (conversation.messages || []).filter((item) => !item.isStreaming);
    const regenerationIndex = options.regenerateMessageId
      ? canonicalMessages.findIndex((item) => item.id === options.regenerateMessageId)
      : -1;
    const anchorSearchSpace = regenerationIndex >= 0
      ? canonicalMessages.slice(0, regenerationIndex)
      : canonicalMessages;
    const expectedUserMessageId = options.expectedUserMessageId ||
      [...anchorSearchSpace].reverse().find((item) => item.sender === "user")?.id ||
      null;
    const openingRegeneration = Boolean(
      options.regenerateMessageId &&
      regenerationIndex === 0 &&
      regenerationMessage?.sender === "character" &&
      !canonicalMessages.slice(0, regenerationIndex).some((item) => item.sender === "user")
    );

    if (options.regenerateMessageId) {
      // Normal rewrites can hide the rejected take immediately. The very first
      // opening is different: removing it leaves the chat with zero messages,
      // which makes the character-introduction card flash inside the chat. Keep
      // the old opening visible until the first replacement token actually arrives.
      if (!openingRegeneration) {
        setChats((currentChats) => {
          const currentChat = currentChats[characterId];
          if (!currentChat) return currentChats;
          return {
            ...currentChats,
            [characterId]: {
              ...currentChat,
              messages: (currentChat.messages || []).filter((item) =>
                item.id !== options.regenerateMessageId
              ),
            },
          };
        });
      }

      // A regeneration changes the canonical visible response. Bump the story
      // revision so older background tasks cannot resurrect the rejected take.
      try {
        await bumpStoryRevision(characterId);
      } catch (error) {
        if (regenerationMessage) appendMessageToState(characterId, regenerationMessage);
        throw error;
      }
    }

    const requestController = new AbortController();
    const requestId = crypto.randomUUID();
    const generationId = crypto.randomUUID();
    const streamMessageId = `stream-${crypto.randomUUID()}`;
    const requestStartedAt = Date.now();
    let diagnosticModel = "";
    let diagnosticPrimaryModel = "";
    let diagnosticFirstTokenMs = 0;
    let diagnosticRepair = false;
    recordAiSession({ started: 1, lastError: "" });
    let streamStarted = false;
    let completeContent = "";
    let finalMessage = null;
    let learnedMemoryCount = 0;
    let streamError = "";
    let reader = null;
    let streamFlushTimer = null;
    let pendingStreamContent = "";
    let lastStreamFlushAt = 0;

    // A stale UI-only stream from an interrupted request must never block
    // future sends. The rejected response was already removed above, before
    // the first await, when this is a regeneration.
    setChats((currentChats) => {
      const currentChat = currentChats[characterId];
      if (!currentChat) return currentChats;
      return {
        ...currentChats,
        [characterId]: {
          ...currentChat,
          messages: (currentChat.messages || []).filter((item) =>
            !item.isStreaming && (openingRegeneration || item.id !== options.regenerateMessageId)
          ),
        },
      };
    });

    const previousRequest = activeRequests.current[characterId];
    if (previousRequest) {
      previousRequest.cancelled = true;
      void sendServerCancellation(previousRequest.generationId, characterId);
      try {
        previousRequest.controller.abort();
      } catch {
        // Already closed.
      }
    }

    activeRequests.current[characterId] = {
      controller: requestController,
      requestId,
      generationId,
      cancelled: false,
    };

    setGenerationStates((current) => ({
      ...current,
      [characterId]: "generating",
    }));

    function requestWasCancelled() {
      const active = activeRequests.current[characterId];
      return (
        requestController.signal.aborted ||
        active?.requestId !== requestId ||
        active?.cancelled === true
      );
    }

    function clearStreamFlushTimer() {
      if (streamFlushTimer) {
        clearTimeout(streamFlushTimer);
        streamFlushTimer = null;
      }
    }

    function scheduleStreamingFlush(content) {
      pendingStreamContent = content;
      if (!streamStarted || streamFlushTimer) return;

      // VELVET_STREAM_BATCH_V1
      // Gemini can emit tiny deltas. Updating the whole React chat for every
      // syllable makes mobile scroll jump and can delay subsequent chunks.
      const elapsed = Date.now() - lastStreamFlushAt;
      // VELVET_STREAM_POLISH_V2: slightly slower paint cadence on touch devices
      // keeps long replies fluid without making the stream feel delayed.
      const targetCadence = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches ? 30 : 24;
      const waitMs = Math.max(0, targetCadence - elapsed);
      streamFlushTimer = setTimeout(() => {
        streamFlushTimer = null;
        if (!streamStarted || requestWasCancelled()) return;
        updateStreamingMessage(characterId, streamMessageId, pendingStreamContent);
        lastStreamFlushAt = Date.now();
      }, waitMs);
    }

    function cleanupStreamingBubble() {
      clearStreamFlushTimer();
      pendingStreamContent = "";
      if (!streamStarted) return;
      removeMessageFromState(characterId, streamMessageId);
      streamStarted = false;
    }

    function clearRequestTracking() {
      if (activeRequests.current[characterId]?.requestId !== requestId) {
        return;
      }

      delete activeRequests.current[characterId];

      setGenerationStates((current) => ({
        ...current,
        [characterId]: "idle",
      }));
    }

    function cancellationError() {
      return new DOMException("Generation cancelled", "AbortError");
    }

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData?.session?.access_token
      ) {
        throw new Error("Your session expired. Sign in again.");
      }

      if (requestWasCancelled()) {
        throw cancellationError();
      }

      const functionUrl = getCharacterChatUrl();
      const publishableKey = getBrowserPublishableKey();

      let response;

      // v2.10.38 FAST FOREGROUND STREAM
      // When the chat is visible, prefer the real SSE route so the first model
      // tokens paint immediately. Background delivery remains the durability
      // lane only when the PWA is already hidden/suspended at send time.
      // This avoids waiting for the entire generation + validation + persistence
      // cycle before the user sees a single word.
      const shouldUseBackgroundDelivery =
        typeof document !== "undefined" && document.hidden === true;
      let backgroundAccepted = false;
      if (shouldUseBackgroundDelivery) try {
        const enqueueResponse = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
            ...(publishableKey ? { apikey: publishableKey } : {}),
          },
          body: JSON.stringify({
            action: "enqueue_generate",
            conversationId: conversation.conversationId,
            regenerateMessageId: options.regenerateMessageId || null,
            expectedUserMessageId,
            regenerationInstruction: options.instruction?.trim() || "",
            regenerationFeedback: Array.isArray(options.feedbackCodes) ? options.feedbackCodes : [],
            directorInstruction: options.directorInstruction?.trim() || "",
            storyPreferences: buildStoryPreferencesPayload(settings, characterId),
            generationId,
          }),
          signal: requestController.signal,
          keepalive: true,
        });

        if (enqueueResponse.ok) {
          backgroundAccepted = true;
          setGenerationStates((current) => ({
            ...current,
            [characterId]: "writing",
          }));

          const previousContent = String(regenerationMessage?.content || "");
          const deadline = Date.now() + 125000;

          while (true) {
            if (requestWasCancelled()) throw cancellationError();

            // Always check the database before evaluating the deadline. If the
            // PWA slept for minutes, the finished reply can be recovered the
            // instant the user returns instead of being mislabeled as a timeout.
            const refreshedMessages = await reloadConversationMessages(characterId);
            let completedMessage = null;

            if (options.regenerateMessageId) {
              completedMessage = refreshedMessages.find((item) =>
                item.id === options.regenerateMessageId &&
                String(item.content || "") !== previousContent
              ) || null;
            } else {
              // VELVET_BACKGROUND_COMPLETION_V2
              // Never decide whether the server finished by comparing the phone
              // clock with Supabase created_at. Mobile clocks can drift enough to
              // make a reply visibly arrive while the local request stays stuck
              // in WRITING/STOP forever. The user's saved message is the durable
              // ordering anchor: any canonical character message after it is the
              // completion of this turn.
              const expectedIndex = expectedUserMessageId
                ? refreshedMessages.findIndex((item) => item.id === expectedUserMessageId)
                : -1;

              if (expectedIndex >= 0) {
                completedMessage = refreshedMessages
                  .slice(expectedIndex + 1)
                  .find((item) => item.sender === "character" && !item.isStreaming) || null;
              }

              // Compatibility fallback for conversations created by an older
              // client where the expected user id is unavailable.
              if (!completedMessage) {
                completedMessage = [...refreshedMessages].reverse().find((item) =>
                  item.sender === "character" &&
                  new Date(item.createdAt || 0).getTime() >= requestStartedAt - 1500
                ) || null;
              }
            }

            if (completedMessage) {
              finalMessage = completedMessage;
              const backgroundDuration = Date.now() - requestStartedAt;
              recordAiSession({
                success: 1,
                lastSuccessAt: new Date().toISOString(),
                lastDurationMs: backgroundDuration,
                lastError: "",
              });
              recordGenerationMetric({ status: "success", model: diagnosticModel || "background", firstTokenMs: diagnosticFirstTokenMs, durationMs: backgroundDuration, fallbackUsed: false, repairUsed: diagnosticRepair });
              return {
                message: finalMessage,
                learnedMemoryCount: 0,
              };
            }

            if (Date.now() >= deadline) {
              throw new Error("Velvet is still finishing this reply in the background. Reopen this chat in a moment.");
            }

            await new Promise((resolve) =>
              setTimeout(resolve, typeof document !== "undefined" && document.hidden ? 2200 : 750)
            );
          }
        }
      } catch (error) {
        if (requestWasCancelled() || error?.name === "AbortError") {
          throw cancellationError();
        }
        // If enqueue itself failed before the server accepted the job, keep the
        // old foreground SSE route as a compatibility fallback.
        console.warn("Background delivery unavailable; falling back to live stream:", error);
      }

      if (backgroundAccepted) {
        throw new Error("Background generation ended unexpectedly.");
      }

      if (!shouldUseBackgroundDelivery) {
        setGenerationStates((current) => ({
          ...current,
          [characterId]: "writing",
        }));
      }

      const liveRequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
          ...(publishableKey ? { apikey: publishableKey } : {}),
        },
        body: JSON.stringify({
          conversationId: conversation.conversationId,
          regenerateMessageId: options.regenerateMessageId || null,
          expectedUserMessageId,
          regenerationInstruction: options.instruction?.trim() || "",
          regenerationFeedback: Array.isArray(options.feedbackCodes) ? options.feedbackCodes : [],
          directorInstruction: options.directorInstruction?.trim() || "",
          storyPreferences: buildStoryPreferencesPayload(settings, characterId),
          generationId,
        }),
        signal: requestController.signal,
      };

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await fetch(functionUrl, liveRequestInit);
        } catch (error) {
          if (requestWasCancelled() || error?.name === "AbortError") throw cancellationError();
          if (attempt === 0 && navigator.onLine && isRetryableNetworkError(error)) {
            await wait(420);
            continue;
          }
          throw error;
        }

        if (attempt === 0 && isRetryableStatus(response.status)) {
          try { await response.body?.cancel?.(); } catch {}
          await wait(response.status === 429 ? 850 : 420);
          continue;
        }
        break;
      }

      if (response.status === 499) {
        throw cancellationError();
      }

      if (!response.ok) {
        const message = await readStreamingError(response);
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("The AI returned an empty response.");
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processRawEvent = (rawEvent) => {
        const dataLines = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());

        for (const dataLine of dataLines) {
          if (!dataLine) continue;

          let eventData;
          try {
            eventData = JSON.parse(dataLine);
          } catch {
            continue;
          }

          if (eventData.type === "start") {
            diagnosticModel = String(eventData.model || diagnosticModel || "");
            diagnosticPrimaryModel = diagnosticPrimaryModel || diagnosticModel;
            diagnosticRepair = Boolean(eventData.repairUsed);
            if (diagnosticModel || diagnosticRepair) recordAiSession({ lastModel: diagnosticModel, repairs: diagnosticRepair ? 1 : 0 });
            setChats((currentChats) => ({
              ...currentChats,
              [characterId]: {
                ...currentChats[characterId],
                memoryUsage: {
                  count: Number(eventData.memoryCount || 0),
                  pinned: Number(eventData.pinnedMemoryCount || 0),
                  items: Array.isArray(eventData.memoryItems) ? eventData.memoryItems : [],
                },
                lastMemoryInfluenceAt: Date.now(),
                loreUsage: {
                  count: Number(eventData.loreCount || 0),
                  items: Array.isArray(eventData.loreItems) ? eventData.loreItems : [],
                },
              },
            }));
            try {
              const items = Array.isArray(eventData.memoryItems) ? eventData.memoryItems : [];
              if (items.length) {
                const key = `velvet_memory_influence_${characterId}`;
                const current = JSON.parse(localStorage.getItem(key) || "{}");
                const now = new Date().toISOString();
                for (const item of items) if (item?.id) current[item.id] = { at: now, conversationId: conversation.conversationId };
                localStorage.setItem(key, JSON.stringify(current));
              }
            } catch {}
            continue;
          }

          if (eventData.type === "model") {
            diagnosticModel = String(eventData.model || diagnosticModel || "");
            if (diagnosticModel) recordAiSession({ lastModel: diagnosticModel });
            continue;
          }

          if (eventData.type === "reset") {
            completeContent = "";
            pendingStreamContent = "";
            clearStreamFlushTimer();
            if (streamStarted) updateStreamingMessage(characterId, streamMessageId, "");
            lastStreamFlushAt = Date.now();
            continue;
          }

          if (eventData.type === "chunk") {
            if (requestWasCancelled()) continue;

            const chunk = String(eventData.content || "");
            if (!chunk) continue;

            completeContent += chunk;

            if (!streamStarted) {
              diagnosticFirstTokenMs = Date.now() - requestStartedAt;
              recordAiSession({ firstTokenMs: diagnosticFirstTokenMs });
              streamStarted = true;
              pendingStreamContent = completeContent;
              lastStreamFlushAt = Date.now();
              // Opening regeneration keeps the rejected opening until replacement
              // text exists. Swap only now so the chat never falls into its empty
              // introduction state while the model is thinking.
              if (openingRegeneration && options.regenerateMessageId) {
                removeMessageFromState(characterId, options.regenerateMessageId);
              }
              appendMessageToState(characterId, {
                id: streamMessageId,
                conversationId: conversation.conversationId,
                userId: user.id,
                sender: "character",
                content: completeContent,
                createdAt: new Date().toISOString(),
                isStreaming: true,
              });
            } else {
              scheduleStreamingFlush(completeContent);
            }

            continue;
          }

          if (eventData.type === "done") {
            if (requestWasCancelled()) continue;

            finalMessage = convertDatabaseMessage(eventData.message);

            if (streamStarted) {
              clearStreamFlushTimer();
              pendingStreamContent = "";
              replaceStreamingMessage(characterId, streamMessageId, finalMessage);
              streamStarted = false;
            } else {
              appendMessageToState(characterId, finalMessage);
            }

            learnedMemoryCount = Number(eventData.learnedMemoryCount || 0);
            setChats((currentChats) => ({
              ...currentChats,
              [characterId]: {
                ...currentChats[characterId],
                sceneState: eventData.sceneState || currentChats[characterId]?.sceneState || {},
                castState: eventData.castState || currentChats[characterId]?.castState || {},
                characterDevelopment: eventData.characterDevelopment || currentChats[characterId]?.characterDevelopment || {},
                relationshipState: eventData.relationshipState || currentChats[characterId]?.relationshipState || {},
                continuityGuard: eventData.continuityGuard || currentChats[characterId]?.continuityGuard || { status: "stable", protected: [] },
                intelligenceState: eventData.intelligenceState || currentChats[characterId]?.intelligenceState || {},
                storyTimeline: Array.isArray(eventData.storyTimeline) ? eventData.storyTimeline : (currentChats[characterId]?.storyTimeline || []),
                storyRecap: eventData.storyRecap || currentChats[characterId]?.storyRecap || "",
                storyChapters: Array.isArray(eventData.storyChapters) ? eventData.storyChapters : (currentChats[characterId]?.storyChapters || []),
                activeChapter: eventData.activeChapter || currentChats[characterId]?.activeChapter || {},
                unfinishedThreads: Array.isArray(eventData.unfinishedThreads) ? eventData.unfinishedThreads : (currentChats[characterId]?.unfinishedThreads || []),
                lastLearnedMemoryCount: learnedMemoryCount,
                lastLearnedMemoryAt: learnedMemoryCount ? Date.now() : currentChats[characterId]?.lastLearnedMemoryAt || 0,
              },
            }));

            continue;
          }

          if (eventData.type === "error") {
            streamError = eventData.error || "The character couldn't respond.";
          }
        }
      };

      while (true) {
        if (requestWasCancelled()) {
          throw cancellationError();
        }

        let result;
        try {
          // A broken mobile connection must not leave the composer busy forever.
          // The server normally emits the complete reply stream within seconds
          // once headers arrive, so prolonged silence means the stream stalled.
          result = await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(
              () => reject(new Error("The response stream stalled. Please try again.")),
              45000
            );

            reader.read().then(
              (value) => {
                clearTimeout(timeoutId);
                resolve(value);
              },
              (error) => {
                clearTimeout(timeoutId);
                reject(error);
              }
            );
          });
        } catch (error) {
          if (requestWasCancelled() || error?.name === "AbortError") {
            throw cancellationError();
          }
          try {
            await reader.cancel();
          } catch {
            // Reader may already be closed.
          }
          throw error;
        }

        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const rawEvent of events) {
          processRawEvent(rawEvent);
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        processRawEvent(buffer);
      }

      if (requestWasCancelled()) {
        throw cancellationError();
      }

      if (streamError) {
        throw new Error(streamError);
      }

      if (!finalMessage) {
        // Mobile networks can occasionally close the SSE connection after the
        // Edge Function has already saved the reply but before the final
        // `done` event reaches the browser. Recover from the database instead
        // of leaving the UI in a broken/busy state.
        cleanupStreamingBubble();

        const refreshedMessages = await reloadConversationMessages(characterId);
        const recoveredMessage = [...refreshedMessages]
          .reverse()
          .find(
            (item) =>
              item.sender === "character" &&
              new Date(item.createdAt || 0).getTime() >= requestStartedAt - 1500
          );

        if (recoveredMessage) {
          finalMessage = recoveredMessage;
        } else {
          throw new Error("The response ended before it could be saved.");
        }
      }

      const finalDurationMs = Date.now() - requestStartedAt;
      recordAiSession({ success: 1, lastSuccessAt: new Date().toISOString(), lastModel: diagnosticModel, lastDurationMs: finalDurationMs, lastError: "" });
      recordGenerationMetric({
        status: "success",
        model: diagnosticModel,
        firstTokenMs: diagnosticFirstTokenMs,
        durationMs: finalDurationMs,
        fallbackUsed: Boolean(diagnosticPrimaryModel && diagnosticModel && diagnosticPrimaryModel !== diagnosticModel),
        repairUsed: diagnosticRepair,
      });
      return {
        message: finalMessage,
        learnedMemoryCount,
      };
    } catch (error) {
      cleanupStreamingBubble();

      if (regenerationMessage) {
        // The old response remains canonical in the database unless the Edge
        // Function successfully replaces it. Reload first so failures and Stop
        // restore the correct version instead of leaving a visual hole.
        try {
          await reloadConversationMessages(characterId);
        } catch {
          appendMessageToState(characterId, regenerationMessage);
        }
      }

      if (requestWasCancelled() || error?.name === "AbortError") {
        throw cancellationError();
      }

      const failedDurationMs = Date.now() - requestStartedAt;
      recordAiSession({ failed: 1, lastErrorAt: new Date().toISOString(), lastModel: diagnosticModel, lastDurationMs: failedDurationMs, lastError: String(error?.message || "Generation failed").slice(0, 220) });
      recordGenerationMetric({ status: "error", model: diagnosticModel, firstTokenMs: diagnosticFirstTokenMs, durationMs: failedDurationMs, fallbackUsed: Boolean(diagnosticPrimaryModel && diagnosticModel && diagnosticPrimaryModel !== diagnosticModel), repairUsed: diagnosticRepair, error: error?.message || "Generation failed" });
      throw error;
    } finally {
      clearStreamFlushTimer();
      if (reader && requestWasCancelled()) {
        try {
          await reader.cancel();
        } catch {
          // Reader can already be closed.
        }
      }

      // This always runs, including network errors and malformed streams.
      // It is the key guarantee that a failed reply cannot lock the composer.
      clearRequestTracking();
    }
  }

  async function findConversationById(conversationId, characterId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("character_id", characterId)
      .is("trashed_at", null)
      .is("archived_at", null)
      .single();

    if (error) throw error;
    return data;
  }

  async function createNewConversation(character, options = {}) {
    return startConversation(character, { forceNew: true, ...options });
  }

  async function createGroupConversation(groupCharacters, options = {}) {
    const uniqueCharacters = [...new Map((groupCharacters || []).filter(Boolean).map((item) => [item.id, item])).values()];
    if (uniqueCharacters.length < 2) throw new Error("Choose at least two characters for a Group Story.");
    if (uniqueCharacters.length > 5) throw new Error("Group Stories currently support up to five characters.");
    const primary = uniqueCharacters[0];
    const groupTitle = options.groupTitle?.trim() || uniqueCharacters.map((item) => item.name).join(" · ");
    return startConversation(primary, {
      forceNew: true,
      personaId: options.personaId || "",
      lorebookId: options.lorebookId || "",
      title: groupTitle,
      groupTitle,
      groupCharacterIds: uniqueCharacters.map((item) => item.id),
    });
  }

  async function sendServerCancellation(generationId, characterId) {
    if (!generationId) return;

    const delays = [0, 140, 420];
    const functionUrl = getCharacterChatUrl();
    const publishableKey = getBrowserPublishableKey();

    for (const delayMs of delays) {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return;

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...(publishableKey ? { apikey: publishableKey } : {}),
          },
          body: JSON.stringify({
            action: "cancel",
            generationId,
            conversationId: chats[characterId]?.conversationId || null,
          }),
        });

        if (response.ok) return;
      } catch (error) {
        console.warn("Could not send generation cancellation:", error);
      }
    }
  }

  function stopGeneration(characterId) {
    const activeRequest = activeRequests.current[characterId];

    if (activeRequest) {
      activeRequest.cancelled = true;

      setGenerationStates((current) => ({
        ...current,
        [characterId]: "stopping",
      }));

      // Persist explicit Stop for the Edge Function, independently from the
      // browser's network connection.
      void sendServerCancellation(activeRequest.generationId, characterId);

      try {
        activeRequest.controller.abort();
      } catch {
        // Already closed.
      }

      // The active request owns final cleanup. We can unlock the composer now;
      // its late finally cannot affect a newer request because requestId is checked.
      if (activeRequests.current[characterId]?.requestId === activeRequest.requestId) {
        delete activeRequests.current[characterId];
      }
    }

    setGenerationStates((current) => ({
      ...current,
      [characterId]: "idle",
    }));

    setChats((currentChats) => {
      const currentChat = currentChats[characterId];
      if (!currentChat) return currentChats;

      return {
        ...currentChats,
        [characterId]: {
          ...currentChat,
          messages: (currentChat.messages || []).filter(
            (item) => !item.isStreaming
          ),
        },
      };
    });
  }

  async function runCanonDoctor(characterId, options = {}) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) throw new Error("The conversation is not ready yet.");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.access_token) throw new Error("Your session expired. Sign in again.");
    const response = await fetch(getCharacterChatUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
        ...(getBrowserPublishableKey() ? { apikey: getBrowserPublishableKey() } : {}),
      },
      body: JSON.stringify({
        action: "canon_doctor",
        conversationId: conversation.conversationId,
        apply: Boolean(options.apply),
        plan: options.plan || null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `Canon Doctor failed with status ${response.status}.`);
    if (payload?.applied) {
      await refreshStoryMetadata(characterId);
      setChats((current) => ({
        ...current,
        [characterId]: {
          ...current[characterId],
          sceneState: payload.updated?.scene_state || current[characterId]?.sceneState || {},
          intelligenceState: payload.updated?.intelligence_state || current[characterId]?.intelligenceState || {},
          relationshipState: payload.updated?.relationship_state || current[characterId]?.relationshipState || {},
          storyRecap: payload.updated?.story_recap || current[characterId]?.storyRecap || "",
          unfinishedThreads: Array.isArray(payload.updated?.unresolved_threads) ? payload.updated.unresolved_threads : (current[characterId]?.unfinishedThreads || []),
        },
      }));
    }
    return payload;
  }

  async function updateConversationSettings(characterId, changes) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) throw new Error("The conversation is not ready yet.");

    const databaseChanges = {};
    if (Object.hasOwn(changes, "title")) databaseChanges.title = changes.title.trim();
    if (Object.hasOwn(changes, "responseLengthOverride")) databaseChanges.response_length_override = changes.responseLengthOverride || null;
    if (Object.hasOwn(changes, "narrationStyleOverride")) databaseChanges.narration_style_override = changes.narrationStyleOverride || null;
    if (Object.hasOwn(changes, "creativity")) databaseChanges.creativity = Number(changes.creativity);
    if (Object.hasOwn(changes, "romanceIntensity")) databaseChanges.romance_intensity = clampControl(changes.romanceIntensity);
    if (Object.hasOwn(changes, "initiative")) databaseChanges.initiative = clampControl(changes.initiative);
    if (Object.hasOwn(changes, "drama")) databaseChanges.drama = clampControl(changes.drama);
    if (Object.hasOwn(changes, "flirting")) databaseChanges.flirting = clampControl(changes.flirting);
    if (Object.hasOwn(changes, "humor")) databaseChanges.humor = clampControl(changes.humor);
    if (Object.hasOwn(changes, "descriptionLevel")) databaseChanges.description_level = clampControl(changes.descriptionLevel);
    if (Object.hasOwn(changes, "characterIndependence")) databaseChanges.character_independence = clampControl(changes.characterIndependence);
    if (Object.hasOwn(changes, "dialogueFrequency")) databaseChanges.dialogue_frequency = clampControl(changes.dialogueFrequency);
    if (Object.hasOwn(changes, "narrativeCamera")) databaseChanges.narrative_camera = ["user_focused", "balanced", "cinematic"].includes(changes.narrativeCamera) ? changes.narrativeCamera : "balanced";
    if (Object.hasOwn(changes, "innerThoughts")) databaseChanges.inner_thoughts = ["none", "rare", "important", "sometimes", "literary", "frequent"].includes(changes.innerThoughts) ? changes.innerThoughts : "rare";
    if (Object.hasOwn(changes, "storyPreset")) databaseChanges.story_preset = ["natural", "romantic", "dramatic", "slow_burn"].includes(changes.storyPreset) ? changes.storyPreset : "natural";
    if (Object.hasOwn(changes, "pacingMode")) databaseChanges.pacing_mode = ["quick", "natural", "cinematic"].includes(changes.pacingMode) ? changes.pacingMode : "natural";
    if (Object.hasOwn(changes, "matureMode")) databaseChanges.mature_mode = Boolean(changes.matureMode);
    if (Object.hasOwn(changes, "personaId")) databaseChanges.persona_id = changes.personaId || null;
    if (Object.hasOwn(changes, "lorebookId")) databaseChanges.lorebook_id = changes.lorebookId || null;

    const { data, error } = await supabase.from("conversations")
      .update(databaseChanges).eq("id", conversation.conversationId).select().single();
    if (error) throw error;

    setChats((currentChats) => ({
      ...currentChats,
      [characterId]: {
        ...currentChats[characterId],
        title: data.title,
        responseLengthOverride: data.response_length_override || "",
        narrationStyleOverride: data.narration_style_override || "",
        creativity: Number(data.creativity ?? 0.84),
        romanceIntensity: Number(data.romance_intensity ?? 35),
        initiative: Number(data.initiative ?? 65),
        drama: Number(data.drama ?? 45),
        flirting: Number(data.flirting ?? 30),
        humor: Number(data.humor ?? 45),
        descriptionLevel: Number(data.description_level ?? 55),
        characterIndependence: Number(data.character_independence ?? 80),
        dialogueFrequency: Number(data.dialogue_frequency ?? 55),
        narrativeCamera: data.narrative_camera || "balanced",
        innerThoughts: data.inner_thoughts || "rare",
        storyPreset: data.story_preset || "natural",
        pacingMode: data.pacing_mode || "natural",
        matureMode: Boolean(data.mature_mode),
        sceneState: data.scene_state || currentChats[characterId]?.sceneState || {},
        relationshipState: data.relationship_state || currentChats[characterId]?.relationshipState || {},
        castState: data.cast_state || currentChats[characterId]?.castState || {},
        storyChapters: Array.isArray(data.story_chapters) ? data.story_chapters : (currentChats[characterId]?.storyChapters || []),
        activeChapter: data.active_chapter || currentChats[characterId]?.activeChapter || {},
        storyTimeline: Array.isArray(data.story_timeline) ? data.story_timeline : (currentChats[characterId]?.storyTimeline || []),
        intelligenceState: data.intelligence_state || currentChats[characterId]?.intelligenceState || {},
        storyRecap: data.story_recap || currentChats[characterId]?.storyRecap || "",
        unfinishedThreads: Array.isArray(data.unresolved_threads) ? data.unresolved_threads : (currentChats[characterId]?.unfinishedThreads || []),
        personaId: data.persona_id || "",
        lorebookId: data.lorebook_id || "",
        groupMode: Boolean(data.group_mode ?? currentChats[characterId]?.groupMode),
        groupCharacterIds: Array.isArray(data.group_character_ids) ? data.group_character_ids : (currentChats[characterId]?.groupCharacterIds || []),
        groupTitle: data.group_title || currentChats[characterId]?.groupTitle || "",
      },
    }));
    return data;
  }

  async function deleteMessage(characterId, messageId) {
    stopGeneration(characterId);
    const currentMessages = chats[characterId]?.messages || [];
    const targetMessage = currentMessages.find((message) => message.id === messageId) || null;

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("user_id", user.id);

    if (error) throw error;
    removeMessageFromState(characterId, messageId);

    // Deleting a visible event invalidates hidden summaries/state too. Without
    // this, the model can keep talking about a message that no longer exists.
    if (targetMessage) await pruneConversationAfterMessage(characterId, targetMessage, { clearAllAutomaticMemories: true });
  }

  async function updateMessage(characterId, messageId, content) {
    const cleanContent = content.trim();
    if (!cleanContent) throw new Error("A message cannot be empty.");

    const { data, error } = await supabase
      .from("messages")
      .update({ content: cleanContent, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw error;
    const updatedMessage = convertDatabaseMessage(data);

    setChats((currentChats) => ({
      ...currentChats,
      [characterId]: {
        ...currentChats[characterId],
        messages: (currentChats[characterId]?.messages || []).map((message) =>
          message.id === messageId ? updatedMessage : message
        ),
      },
    }));

    return updatedMessage;
  }

  async function pruneConversationAfterMessage(characterId, message, options = {}) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId || !message?.createdAt) return;

    // Memories extracted after a rewind/edit can describe events that no longer
    // exist. Remove those future memories and clear the stale summary.
    let memoryQuery = supabase
      .from("memories")
      .delete()
      .eq("conversation_id", conversation.conversationId)
      .eq("source", "automatic");

    if (!options.clearAllAutomaticMemories) {
      memoryQuery = memoryQuery.gt("created_at", message.createdAt);
    }
    const { error: memoryError } = await memoryQuery;

    if (memoryError) {
      console.warn("Could not prune future memories:", memoryError);
    }

    // Rewind must invalidate every derived story cache that may contain facts
    // from messages that no longer exist. Keeping these fields was causing the
    // model to resurrect deleted scenes, conflicts and unfinished topics.
    const storyRevision = crypto.randomUUID();
    const clearedDerivedState = {
      story_revision: storyRevision,
      summary: null,
      scene_state: {},
      story_timeline: [],
      intelligence_state: {},
      story_recap: null,
      relationship_state: {},
      character_development: {},
      cast_state: {},
      story_chapters: [],
      active_chapter: {},
      unresolved_threads: [],
      scene_state_updated_at: null,
      updated_at: new Date().toISOString(),
    };

    const { error: conversationError } = await supabase
      .from("conversations")
      .update(clearedDerivedState)
      .eq("id", conversation.conversationId)
      .eq("user_id", user.id);

    if (conversationError) {
      console.warn("Could not clear derived story state after rewind:", conversationError);
      throw conversationError;
    }

    // Keep the in-memory conversation consistent with Supabase immediately.
    // The next generation will rebuild fresh state only from surviving
    // messages + surviving memories instead of stale deleted-story metadata.
    setChats((currentChats) => ({
      ...currentChats,
      [characterId]: {
        ...currentChats[characterId],
        summary: "",
        sceneState: {},
        storyTimeline: [],
        relationshipState: {},
        characterDevelopment: {},
        castState: {},
        storyChapters: [],
        activeChapter: {},
        unfinishedThreads: [],
        storyRevision,
      },
    }));
  }

  async function editCharacterMessageInPlace(characterId, messageId, content) {
    stopGeneration(characterId);
    const conversation = chats[characterId];
    const currentMessage = (conversation?.messages || []).find((item) => item.id === messageId);
    if (!conversation?.conversationId || !currentMessage || currentMessage.sender !== "character") {
      throw new Error("Character response not found.");
    }

    const nextContent = content.trim();
    if (!nextContent) throw new Error("A response cannot be empty.");
    if (nextContent === currentMessage.content.trim()) return currentMessage;

    const { error: alternativeError } = await supabase.from("message_alternatives").insert({
      user_id: user.id,
      conversation_id: conversation.conversationId,
      message_id: messageId,
      content: currentMessage.content,
    });
    if (alternativeError && alternativeError.code !== "23505") {
      console.warn("Could not preserve the previous response version:", alternativeError);
    }

    const updated = await updateMessage(characterId, messageId, nextContent);
    const storyRevision = crypto.randomUUID();
    const { error: resetError } = await supabase.from("conversations").update({
      story_revision: storyRevision,
      summary: null,
      scene_state: {},
      story_timeline: [],
      intelligence_state: {},
      story_recap: null,
      relationship_state: {},
      character_development: {},
      cast_state: {},
      story_chapters: [],
      active_chapter: {},
      unresolved_threads: [],
      updated_at: new Date().toISOString(),
    }).eq("id", conversation.conversationId).eq("user_id", user.id);
    if (resetError) throw resetError;

    setChats((currentChats) => ({
      ...currentChats,
      [characterId]: {
        ...currentChats[characterId],
        summary: "", sceneState: {}, storyTimeline: [], intelligenceState: {}, storyRecap: "",
        relationshipState: {}, characterDevelopment: {}, castState: {}, storyChapters: [], activeChapter: {}, unfinishedThreads: [], storyRevision,
      },
    }));
    return updated;
  }

  async function editMessageAndRemoveFollowing(characterId, messageId, content) {
    stopGeneration(characterId);
    const currentMessages = chats[characterId]?.messages || [];
    const messageIndex = currentMessages.findIndex((message) => message.id === messageId);
    if (messageIndex === -1) throw new Error("Message not found.");

    const followingIds = currentMessages
      .slice(messageIndex + 1)
      .filter((message) => !message.isStreaming)
      .map((message) => message.id);

    const updatedMessage = await updateMessage(characterId, messageId, content);

    if (followingIds.length) {
      const { error } = await supabase.from("messages").delete().in("id", followingIds);
      if (error) throw error;
    }

    await pruneConversationAfterMessage(characterId, updatedMessage);

    setChats((currentChats) => ({
      ...currentChats,
      [characterId]: {
        ...currentChats[characterId],
        messages: [
          ...(currentChats[characterId]?.messages || []).slice(0, messageIndex),
          updatedMessage,
        ],
      },
    }));

    return updatedMessage;
  }

  async function rewindToMessage(characterId, messageId) {
    stopGeneration(characterId);
    const currentMessages = chats[characterId]?.messages || [];
    const messageIndex = currentMessages.findIndex((message) => message.id === messageId);
    if (messageIndex === -1) throw new Error("Message not found.");

    const targetMessage = currentMessages[messageIndex];
    const followingIds = currentMessages
      .slice(messageIndex + 1)
      .filter((message) => !message.isStreaming)
      .map((message) => message.id);

    if (followingIds.length) {
      const { error } = await supabase.from("messages").delete().in("id", followingIds);
      if (error) throw error;
    }

    await pruneConversationAfterMessage(characterId, targetMessage);

    setChats((currentChats) => ({
      ...currentChats,
      [characterId]: {
        ...currentChats[characterId],
        messages: (currentChats[characterId]?.messages || []).slice(0, messageIndex + 1),
      },
    }));
  }

  async function branchConversationFromMessage(characterId, messageId, label = "") {
    const conversation = chats[characterId];
    const currentMessages = conversation?.messages || [];
    const messageIndex = currentMessages.findIndex((message) => message.id === messageId);
    if (!conversation?.conversationId || messageIndex === -1) throw new Error("Message not found.");

    const sourceMessage = currentMessages[messageIndex];
    const branchTitle = label.trim() || `${conversation.title || "Story"} · branch`;

    const { data: sourceRows, error: sourceRowsError } = await supabase
      .from("messages")
      .select("sender, content, created_at, edited_at, reply_to_message_id, reply_preview, reply_sender")
      .eq("conversation_id", conversation.conversationId)
      .lte("created_at", sourceMessage.createdAt)
      .order("created_at", { ascending: true });
    if (sourceRowsError) throw sourceRowsError;
    const branchMessages = sourceRows || [];

    const { data: branchConversation, error: branchError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        character_id: characterId,
        title: branchTitle.slice(0, 80),
        persona_id: conversation.personaId || null,
        lorebook_id: conversation.lorebookId || null,
        response_length_override: conversation.responseLengthOverride || null,
        narration_style_override: conversation.narrationStyleOverride || null,
        creativity: Number(conversation.creativity ?? 0.84),
        romance_intensity: Number(conversation.romanceIntensity ?? 35),
        initiative: Number(conversation.initiative ?? 65),
        drama: Number(conversation.drama ?? 45),
        flirting: Number(conversation.flirting ?? 30),
        humor: Number(conversation.humor ?? 45),
        description_level: Number(conversation.descriptionLevel ?? 55),
        character_independence: Number(conversation.characterIndependence ?? 80),
        dialogue_frequency: Number(conversation.dialogueFrequency ?? 55),
        narrative_camera: conversation.narrativeCamera || "balanced",
        inner_thoughts: conversation.innerThoughts || "rare",
        story_preset: conversation.storyPreset || "natural",
        pacing_mode: conversation.pacingMode || "natural",
        mature_mode: Boolean(conversation.matureMode),
        // Derived story state can describe events after the branch point. Start
        // the branch clean and let the story engine rebuild it from the copied
        // messages/memories instead of leaking the source timeline's future.
        summary: null,
        scene_state: {},
        story_timeline: [],
        relationship_state: {},
        character_development: {},
        cast_state: {},
        story_chapters: [],
        active_chapter: {},
        unresolved_threads: [],
        intelligence_state: {},
        story_recap: null,
        story_engine_version: 13,
        branch_parent_id: conversation.conversationId,
        branch_from_message_id: sourceMessage.id,
        branch_label: branchTitle.slice(0, 80),
        group_mode: Boolean(conversation.groupMode),
        group_character_ids: conversation.groupCharacterIds || [],
        group_title: conversation.groupTitle || null,
        cover_url: conversation.coverUrl || null,
        cover_title: conversation.coverTitle || null,
        cover_mood: conversation.coverMood || null,
        ambient_mode: conversation.ambientMode || "none",
        ambient_volume: Number(conversation.ambientVolume ?? 18),
      })
      .select()
      .single();

    if (branchError || !branchConversation) throw branchError || new Error("Could not create branch.");

    const branchBaseTime = Date.now();
    const rows = branchMessages.map((message, index) => ({
      conversation_id: branchConversation.id,
      user_id: user.id,
      sender: message.sender,
      content: message.content,
      created_at: new Date(branchBaseTime + index).toISOString(),
      edited_at: message.edited_at || null,
      // Message ids change in the new conversation, so do not carry an old
      // cross-conversation reply pointer. The preview still preserves context.
      reply_to_message_id: null,
      reply_preview: message.reply_preview || null,
      reply_sender: message.reply_sender || null,
    }));

    if (rows.length) {
      const { error: messageError } = await supabase.from("messages").insert(rows);
      if (messageError) {
        await supabase.from("conversations").delete().eq("id", branchConversation.id);
        throw messageError;
      }
    }

    // Carry only memories that already existed at the branch point. Later
    // timeline memories must never leak into the new branch. Character-scoped
    // memories are shared automatically and are not duplicated here.
    const { data: sourceMemories, error: sourceMemoryError } = await supabase
      .from("memories")
      .select("content, importance, category, is_pinned, source, created_at")
      .eq("conversation_id", conversation.conversationId)
      .eq("scope", "conversation")
      .lte("created_at", sourceMessage.createdAt);

    if (!sourceMemoryError && sourceMemories?.length) {
      const memoryRows = sourceMemories.map((memory) => ({
        conversation_id: branchConversation.id,
        character_id: characterId,
        user_id: user.id,
        content: memory.content,
        importance: memory.importance,
        category: memory.category,
        is_pinned: memory.is_pinned,
        source: memory.source,
        scope: "conversation",
      }));
      const { error: copyMemoryError } = await supabase.from("memories").insert(memoryRows);
      if (copyMemoryError) console.warn("Could not copy branch memories:", copyMemoryError);
    }

    return branchConversation;
  }

  async function regenerateCharacterReply(characterId, messageId, instruction = "", feedbackCodes = []) {
    return generateCharacterReply(characterId, {
      regenerateMessageId: messageId,
      instruction,
      feedbackCodes,
    });
  }

  async function saveMessageAsMemory(characterId, content) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) throw new Error("The conversation is not ready yet.");

    const { data, error } = await supabase
      .from("memories")
      .insert({
        conversation_id: conversation.conversationId,
        character_id: characterId,
        user_id: user.id,
        content: content.trim(),
        importance: 5,
        category: "event",
        is_pinned: true,
        source: "manual",
        scope: "conversation",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function getMessageAlternatives(messageId) {
    const { data, error } = await supabase
      .from("message_alternatives")
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function selectMessageAlternative(characterId, messageId, content) {
    stopGeneration(characterId);
    const updated = await updateMessage(characterId, messageId, content);
    await pruneConversationAfterMessage(characterId, updated);
    return updated;
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

    const page = await loadConversationMessages(conversation.conversationId);

    setChats(
      (currentChats) => ({
        ...currentChats,

        [characterId]: {
          ...currentChats[
            characterId
          ],

          messages: page.messages,
          hasMoreMessages: page.hasMore,
          loadingEarlierMessages: false,
        },
      })
    );

    return page.messages;
  }

  async function loadEarlierMessages(characterId) {
    const conversation = chats[characterId];
    const currentMessages = conversation?.messages || [];
    const oldestMessage = currentMessages.find((message) => !message.isStreaming);

    if (
      !conversation?.conversationId ||
      !conversation.hasMoreMessages ||
      conversation.loadingEarlierMessages ||
      !oldestMessage?.createdAt
    ) {
      return [];
    }

    setChats((currentChats) => ({
      ...currentChats,
      [characterId]: {
        ...currentChats[characterId],
        loadingEarlierMessages: true,
      },
    }));

    try {
      const page = await loadConversationMessages(conversation.conversationId, {
        before: oldestMessage.createdAt,
      });

      setChats((currentChats) => {
        const existingMessages = currentChats[characterId]?.messages || [];
        const existingIds = new Set(existingMessages.map((message) => message.id));
        const earlierMessages = page.messages.filter((message) => !existingIds.has(message.id));

        return {
          ...currentChats,
          [characterId]: {
            ...currentChats[characterId],
            messages: [...earlierMessages, ...existingMessages],
            hasMoreMessages: page.hasMore,
            loadingEarlierMessages: false,
          },
        };
      });

      return page.messages;
    } catch (error) {
      setChats((currentChats) => ({
        ...currentChats,
        [characterId]: {
          ...currentChats[characterId],
          loadingEarlierMessages: false,
        },
      }));
      throw error;
    }
  }

  async function refreshStoryMetadata(characterId) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) return null;
    const { data, error } = await supabase
      .from("conversations")
      .select("scene_state, story_timeline, summary, story_recap, intelligence_state, story_preset, pacing_mode, relationship_state, cast_state, story_chapters, active_chapter, unresolved_threads, character_development, story_engine_version, story_revision, updated_at")
      .eq("id", conversation.conversationId)
      .single();
    if (error) throw error;
    setChats((current) => ({
      ...current,
      [characterId]: {
        ...current[characterId],
        sceneState: data.scene_state || {},
        storyTimeline: Array.isArray(data.story_timeline) ? data.story_timeline : [],
        summary: data.summary || current[characterId]?.summary || "",
        storyRecap: data.story_recap || data.summary || current[characterId]?.storyRecap || "",
        intelligenceState: data.intelligence_state || current[characterId]?.intelligenceState || {},
        storyPreset: data.story_preset || current[characterId]?.storyPreset || "natural",
        pacingMode: data.pacing_mode || current[characterId]?.pacingMode || "natural",
        relationshipState: data.relationship_state || current[characterId]?.relationshipState || {},
        castState: data.cast_state || current[characterId]?.castState || {},
        storyChapters: Array.isArray(data.story_chapters) ? data.story_chapters : (current[characterId]?.storyChapters || []),
        activeChapter: data.active_chapter || current[characterId]?.activeChapter || {},
        unfinishedThreads: Array.isArray(data.unresolved_threads) ? data.unresolved_threads : (current[characterId]?.unfinishedThreads || []),
        characterDevelopment: data.character_development || current[characterId]?.characterDevelopment || {},
        storyEngineVersion: Number(data.story_engine_version || 9),
      },
    }));
    return data;
  }

  async function toggleMessageBookmark(characterId, messageId, label = "") {
    const currentMessages = chats[characterId]?.messages || [];
    const target = currentMessages.find((item) => item.id === messageId);
    if (!target) throw new Error("Message not found.");
    const nextValue = !target.isBookmarked;
    const { data, error } = await supabase.from("messages")
      .update({ is_bookmarked: nextValue, bookmark_label: nextValue ? (label.trim().slice(0, 120) || null) : null })
      .eq("id", messageId)
      .select()
      .single();
    if (error) throw error;
    const updated = convertDatabaseMessage(data);
    setChats((current) => ({
      ...current,
      [characterId]: {
        ...current[characterId],
        messages: (current[characterId]?.messages || []).map((item) => item.id === messageId ? updated : item),
      },
    }));
    return updated;
  }

  async function searchConversationMessages(characterId, query) {
    const conversationId = chats[characterId]?.conversationId;
    const clean = String(query || "").trim();
    if (!conversationId || clean.length < 2) return [];
    const escaped = clean.replace(/[%_]/g, "\\$&");
    const { data, error } = await supabase.from("messages")
      .select("id, sender, content, created_at, edited_at, is_bookmarked, bookmark_label, chapter_number, reply_to_message_id, reply_preview, reply_sender")
      .eq("conversation_id", conversationId)
      .ilike("content", `%${escaped}%`)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data || []).map(convertDatabaseMessage);
  }

  async function loadMessageIntoView(characterId, messageId) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId || !messageId) return null;
    const { data: target, error: targetError } = await supabase.from("messages")
      .select("id, sender, content, created_at, edited_at, is_bookmarked, bookmark_label, chapter_number, reply_to_message_id, reply_preview, reply_sender")
      .eq("id", messageId)
      .eq("conversation_id", conversation.conversationId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return null;
    const { data: around, error } = await supabase.from("messages")
      .select("id, sender, content, created_at, edited_at, is_bookmarked, bookmark_label, chapter_number, reply_to_message_id, reply_preview, reply_sender")
      .eq("conversation_id", conversation.conversationId)
      .gte("created_at", target.created_at)
      .order("created_at", { ascending: true })
      .limit(80);
    if (error) throw error;
    const incoming = (around || []).map(convertDatabaseMessage);
    setChats((current) => {
      const existing = current[characterId]?.messages || [];
      const map = new Map(existing.filter((item) => !item.isStreaming).map((item) => [item.id, item]));
      incoming.forEach((item) => map.set(item.id, item));
      const merged = [...map.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return { ...current, [characterId]: { ...current[characterId], messages: merged } };
    });
    return convertDatabaseMessage(target);
  }

  async function getStoryHubData(characterId) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) return { bookmarks: [], branches: [], chapters: [], cast: {}, relationship: {}, unfinishedThreads: [] };
    const [bookmarksResult, branchesResult, currentResult, memoriesResult] = await Promise.all([
      supabase.from("messages")
        .select("id, sender, content, created_at, is_bookmarked, bookmark_label, chapter_number")
        .eq("conversation_id", conversation.conversationId)
        .eq("is_bookmarked", true)
        .order("created_at", { ascending: false }),
      supabase.from("conversations")
        .select("id, title, branch_parent_id, branch_from_message_id, branch_label, updated_at")
        .eq("character_id", characterId)
        .or(`id.eq.${conversation.conversationId},branch_parent_id.eq.${conversation.conversationId},id.eq.${conversation.branchParentId || conversation.conversationId}`)
        .order("updated_at", { ascending: false }),
      supabase.from("conversations")
        .select("relationship_state, cast_state, story_chapters, active_chapter, unresolved_threads, intelligence_state, story_recap, story_timeline, character_development, pacing_mode, story_engine_version, story_revision, persona_id, lorebook_id, group_mode, group_character_ids, group_title, cover_url, cover_title, cover_mood, ambient_mode, ambient_volume, last_opened_at")
        .eq("id", conversation.conversationId)
        .single(),
      supabase.from("memories")
        .select("id, content, category, importance, scope, why_remembered, is_pinned, is_canon, created_at, updated_at")
        .eq("conversation_id", conversation.conversationId)
        .is("superseded_at", null)
        .order("importance", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);
    if (bookmarksResult.error) throw bookmarksResult.error;
    if (branchesResult.error) console.warn("Could not load branches:", branchesResult.error);
    if (currentResult.error) throw currentResult.error;
    if (memoriesResult.error) console.warn("Could not load dashboard memories:", memoriesResult.error);
    return {
      bookmarks: (bookmarksResult.data || []).map(convertDatabaseMessage),
      branches: branchesResult.data || [],
      chapters: Array.isArray(currentResult.data?.story_chapters) ? currentResult.data.story_chapters : [],
      activeChapter: currentResult.data?.active_chapter || {},
      cast: currentResult.data?.cast_state || {},
      relationship: currentResult.data?.relationship_state || {},
      unfinishedThreads: Array.isArray(currentResult.data?.unresolved_threads) ? currentResult.data.unresolved_threads : [],
      intelligenceState: currentResult.data?.intelligence_state || {},
      storyRecap: currentResult.data?.story_recap || "",
      storyTimeline: Array.isArray(currentResult.data?.story_timeline) ? currentResult.data.story_timeline : [],
      characterDevelopment: currentResult.data?.character_development || {},
      pacingMode: currentResult.data?.pacing_mode || "natural",
      storyEngineVersion: Number(currentResult.data?.story_engine_version || 9),
      storyRevision: currentResult.data?.story_revision || "",
      personaId: currentResult.data?.persona_id || "",
      lorebookId: currentResult.data?.lorebook_id || "",
      groupMode: Boolean(currentResult.data?.group_mode),
      groupCharacterIds: Array.isArray(currentResult.data?.group_character_ids) ? currentResult.data.group_character_ids : [],
      groupTitle: currentResult.data?.group_title || "",
      coverUrl: currentResult.data?.cover_url || "",
      coverTitle: currentResult.data?.cover_title || "",
      coverMood: currentResult.data?.cover_mood || "",
      ambientMode: currentResult.data?.ambient_mode || "none",
      ambientVolume: Number(currentResult.data?.ambient_volume ?? 18),
      lastOpenedAt: currentResult.data?.last_opened_at || "",
      recentMemories: memoriesResult.data || [],
    };
  }


  async function updateStoryExperience(characterId, patch = {}) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) throw new Error("The conversation is not ready yet.");

    const databasePatch = {};
    if (patch.coverUrl !== undefined) databasePatch.cover_url = String(patch.coverUrl || "").trim() || null;
    if (patch.coverTitle !== undefined) databasePatch.cover_title = String(patch.coverTitle || "").trim().slice(0, 120) || null;
    if (patch.coverMood !== undefined) databasePatch.cover_mood = String(patch.coverMood || "").trim().slice(0, 160) || null;
    if (patch.ambientMode !== undefined) databasePatch.ambient_mode = ["none","rain","night_city","street_racing","cafe","campus","fireplace","home","party"].includes(patch.ambientMode) ? patch.ambientMode : "none";
    if (patch.ambientVolume !== undefined) databasePatch.ambient_volume = Math.max(0, Math.min(100, Math.round(Number(patch.ambientVolume) || 0)));

    const { data, error } = await supabase
      .from("conversations")
      .update(databasePatch)
      .eq("id", conversation.conversationId)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) throw error;

    setChats((current) => ({
      ...current,
      [characterId]: {
        ...current[characterId],
        coverUrl: data.cover_url || "",
        coverTitle: data.cover_title || "",
        coverMood: data.cover_mood || "",
        ambientMode: data.ambient_mode || "none",
        ambientVolume: Number(data.ambient_volume ?? 18),
      },
    }));
    return data;
  }

  async function uploadStoryCover(characterId, file) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId || !file) throw new Error("Choose a cover image first.");
    if (!String(file.type || "").startsWith("image/")) throw new Error("The cover must be an image.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Keep story covers under 5 MB.");

    const extension = String(file.name || "cover.jpg").split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `${user.id}/stories/${conversation.conversationId}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("character-media").upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("character-media").getPublicUrl(storagePath);
    await updateStoryExperience(characterId, { coverUrl: data.publicUrl });
    return data.publicUrl;
  }

  async function collectStorySnapshot(characterId) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) throw new Error("The conversation is not ready yet.");
    const conversationId = conversation.conversationId;

    const [conversationResult, messagesResult, memoriesResult, alternativesResult, knowledgeResult] = await Promise.all([
      supabase.from("conversations").select("*").eq("id", conversationId).eq("user_id", user.id).single(),
      supabase.from("messages").select("*").eq("conversation_id", conversationId).eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("memories").select("*").eq("conversation_id", conversationId).eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("message_alternatives").select("*").eq("conversation_id", conversationId).eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("story_knowledge_entries").select("*").eq("conversation_id", conversationId).eq("user_id", user.id).order("updated_at", { ascending: true }),
    ]);
    if (conversationResult.error) throw conversationResult.error;
    if (messagesResult.error) throw messagesResult.error;
    if (memoriesResult.error) throw memoriesResult.error;
    if (alternativesResult.error) console.warn("Could not include response alternatives in snapshot:", alternativesResult.error);
    if (knowledgeResult.error && knowledgeResult.error.code !== "42P01") console.warn("Could not include story knowledge in snapshot:", knowledgeResult.error);

    return {
      schema: 2,
      velvetVersion: "2.6.0",
      capturedAt: new Date().toISOString(),
      conversation: conversationResult.data,
      messages: messagesResult.data || [],
      memories: memoriesResult.data || [],
      alternatives: alternativesResult.data || [],
      knowledge: knowledgeResult.error ? [] : (knowledgeResult.data || []),
    };
  }

  async function createStorySnapshot(characterId, label = "Snapshot") {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) throw new Error("The conversation is not ready yet.");
    const payload = await collectStorySnapshot(characterId);
    const { data, error } = await supabase
      .from("story_snapshots")
      .insert({
        user_id: user.id,
        conversation_id: conversation.conversationId,
        label: String(label || "Snapshot").trim().slice(0, 80) || "Snapshot",
        payload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function listStorySnapshots(characterId) {
    const conversationId = chats[characterId]?.conversationId;
    if (!conversationId) return [];
    const { data, error } = await supabase
      .from("story_snapshots")
      .select("id, label, created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data || [];
  }

  async function deleteStorySnapshot(snapshotId) {
    const { error } = await supabase.from("story_snapshots").delete().eq("id", snapshotId).eq("user_id", user.id);
    if (error) throw error;
  }

  async function applyStorySnapshot(characterId, payload, { safetySnapshot = true } = {}) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) throw new Error("The conversation is not ready yet.");
    if (!payload || !Array.isArray(payload.messages) || !payload.conversation) throw new Error("This Velvet backup is incomplete.");
    if (payload.conversation.id && payload.conversation.id !== conversation.conversationId) {
      throw new Error("This backup belongs to a different story.");
    }

    if (safetySnapshot) {
      try { await createStorySnapshot(characterId, "Before restore"); } catch (error) { console.warn("Safety snapshot skipped:", error); }
    }

    stopGeneration(characterId);
    const conversationId = conversation.conversationId;
    const { error: alternativesDeleteError } = await supabase.from("message_alternatives").delete().eq("conversation_id", conversationId).eq("user_id", user.id);
    if (alternativesDeleteError) console.warn("Could not clear old alternatives:", alternativesDeleteError);
    const { error: knowledgeDeleteError } = await supabase.from("story_knowledge_entries").delete().eq("conversation_id", conversationId).eq("user_id", user.id);
    if (knowledgeDeleteError && knowledgeDeleteError.code !== "42P01") console.warn("Could not clear old story knowledge:", knowledgeDeleteError);
    const { error: memoriesDeleteError } = await supabase.from("memories").delete().eq("conversation_id", conversationId).eq("user_id", user.id);
    if (memoriesDeleteError) throw memoriesDeleteError;
    const { error: messagesDeleteError } = await supabase.from("messages").delete().eq("conversation_id", conversationId).eq("user_id", user.id);
    if (messagesDeleteError) throw messagesDeleteError;

    if (payload.messages.length) {
      const messageRows = payload.messages.map((row) => ({
        ...row,
        conversation_id: conversationId,
        user_id: user.id,
      }));
      const { error } = await supabase.from("messages").insert(messageRows);
      if (error) throw error;
    }

    if (Array.isArray(payload.memories) && payload.memories.length) {
      const memoryRows = payload.memories.map((row) => ({
        ...row,
        conversation_id: conversationId,
        user_id: user.id,
      }));
      const { error } = await supabase.from("memories").insert(memoryRows);
      if (error) throw error;
    }

    if (Array.isArray(payload.alternatives) && payload.alternatives.length) {
      const rows = payload.alternatives.map((row) => ({
        ...row,
        conversation_id: conversationId,
        user_id: user.id,
      }));
      const { error } = await supabase.from("message_alternatives").insert(rows);
      if (error) console.warn("Could not restore response alternatives:", error);
    }

    if (Array.isArray(payload.knowledge) && payload.knowledge.length) {
      const rows = payload.knowledge.map((row) => ({
        ...row,
        conversation_id: conversationId,
        user_id: user.id,
      }));
      const { error } = await supabase.from("story_knowledge_entries").insert(rows);
      if (error && error.code !== "42P01") console.warn("Could not restore story knowledge:", error);
    }

    const source = payload.conversation || {};
    const restorableKeys = [
      "title","summary","response_length_override","narration_style_override","creativity","romance_intensity","initiative","drama","flirting","humor","description_level","character_independence","dialogue_frequency","narrative_camera","inner_thoughts","story_preset","pacing_mode","mature_mode","scene_state","story_timeline","relationship_state","cast_state","story_chapters","active_chapter","unresolved_threads","character_development","intelligence_state","story_recap","story_engine_version","story_revision","persona_id","lorebook_id","group_mode","group_character_ids","group_title","cover_url","cover_title","cover_mood","ambient_mode","ambient_volume"
    ];
    const conversationPatch = Object.fromEntries(restorableKeys.filter((key) => Object.prototype.hasOwnProperty.call(source, key)).map((key) => [key, source[key]]));
    conversationPatch.updated_at = new Date().toISOString();
    const { error: conversationError } = await supabase
      .from("conversations")
      .update(conversationPatch)
      .eq("id", conversationId)
      .eq("user_id", user.id);
    if (conversationError) throw conversationError;

    await reloadConversationMessages(characterId);
    await refreshStoryMetadata(characterId);
    setChats((current) => ({
      ...current,
      [characterId]: {
        ...current[characterId],
        title: source.title || current[characterId]?.title,
        coverUrl: source.cover_url || "",
        coverTitle: source.cover_title || "",
        coverMood: source.cover_mood || "",
        ambientMode: source.ambient_mode || "none",
        ambientVolume: Number(source.ambient_volume ?? 18),
      },
    }));
    return true;
  }

  async function restoreStorySnapshot(characterId, snapshotId, { safetySnapshot = true } = {}) {
    const { data, error } = await supabase
      .from("story_snapshots")
      .select("payload")
      .eq("id", snapshotId)
      .eq("user_id", user.id)
      .single();
    if (error) throw error;
    return applyStorySnapshot(characterId, data.payload, { safetySnapshot });
  }

  async function exportStoryBackupData(characterId) {
    const snapshot = await collectStorySnapshot(characterId);
    return {
      type: "velvet-story-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      snapshot,
    };
  }

  async function importStoryBackupData(characterId, backup) {
    if (backup?.type !== "velvet-story-backup" || !backup.snapshot) throw new Error("This is not a Velvet story backup.");
    return applyStorySnapshot(characterId, backup.snapshot, { safetySnapshot: true });
  }

  async function getStoryExportData(characterId) {
    const conversation = chats[characterId];
    if (!conversation?.conversationId) throw new Error("The conversation is not ready yet.");
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender, content, created_at, edited_at, chapter_number")
      .eq("conversation_id", conversation.conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return {
      title: conversation.title || "",
      coverUrl: conversation.coverUrl || "",
      coverTitle: conversation.coverTitle || "",
      coverMood: conversation.coverMood || "",
      messages: (data || []).map(convertDatabaseMessage),
    };
  }

  function dismissCatchUp(characterId) {
    setChats((current) => ({
      ...current,
      [characterId]: {
        ...current[characterId],
        catchUpAvailable: false,
      },
    }));
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

    const { error: memoryDeleteError } = await supabase
      .from("memories")
      .delete()
      .eq("conversation_id", conversationId);

    if (memoryDeleteError) {
      throw memoryDeleteError;
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
        getGenerationState,
        isCharacterGenerating,
        offlineQueueSize,
        flushOfflineQueue,
        startConversation,
        createNewConversation,
        createGroupConversation,
        addMessage,
        generateCharacterReply,
        stopGeneration,
        runCanonDoctor,
        updateConversationSettings,
        deleteMessage,
        updateMessage,
        editCharacterMessageInPlace,
        editMessageAndRemoveFollowing,
        rewindToMessage,
        branchConversationFromMessage,
        regenerateCharacterReply,
        saveMessageAsMemory,
        getMessageAlternatives,
        selectMessageAlternative,
        loadEarlierMessages,
        reloadConversationMessages,
        refreshStoryMetadata,
        toggleMessageBookmark,
        searchConversationMessages,
        loadMessageIntoView,
        getStoryHubData,
        updateStoryExperience,
        uploadStoryCover,
        createStorySnapshot,
        listStorySnapshots,
        deleteStorySnapshot,
        restoreStorySnapshot,
        exportStoryBackupData,
        importStoryBackupData,
        getStoryExportData,
        dismissCatchUp,
        deleteConversation,
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
}

function recordAiSession(patch = {}) {
  try {
    const key = "velvet_ai_session_v19";
    const current = { started: 0, success: 0, failed: 0, repairs: 0, lastModel: "", lastError: "", lastSuccessAt: "", lastErrorAt: "", lastDurationMs: 0, firstTokenMs: 0, ...JSON.parse(sessionStorage.getItem(key) || sessionStorage.getItem("velvet_ai_session_v18") || "{}") };
    const next = {
      ...current,
      started: Number(current.started || 0) + Number(patch.started || 0),
      success: Number(current.success || 0) + Number(patch.success || 0),
      failed: Number(current.failed || 0) + Number(patch.failed || 0),
      repairs: Number(current.repairs || 0) + Number(patch.repairs || 0),
      lastModel: patch.lastModel !== undefined && patch.lastModel !== "" ? patch.lastModel : current.lastModel,
      lastError: patch.lastError !== undefined ? patch.lastError : current.lastError,
      lastSuccessAt: patch.lastSuccessAt !== undefined ? patch.lastSuccessAt : current.lastSuccessAt,
      lastErrorAt: patch.lastErrorAt !== undefined ? patch.lastErrorAt : current.lastErrorAt,
      lastDurationMs: patch.lastDurationMs !== undefined ? patch.lastDurationMs : current.lastDurationMs,
      firstTokenMs: patch.firstTokenMs !== undefined ? patch.firstTokenMs : current.firstTokenMs,
      updatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Diagnostics must never interfere with chat generation.
  }
}

function offlineQueueKey(userId) {
  return `velvet_offline_queue_v312_${userId || "anonymous"}`;
}

function readOfflineQueue(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(offlineQueueKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.localId && item?.conversationId && item?.characterId && String(item?.content || "").trim()) : [];
  } catch {
    return [];
  }
}

function createConversationTitle() {
  const now = new Date();
  const date = now.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `New story · ${date}, ${time}`;
}

function extractVisibleReplyFromStoredEnvelope(value = "") {
  const text = String(value || "");
  if (!text.trimStart().startsWith("{") || !/"reply"\s*:/.test(text)) return text;

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.reply === "string" && parsed.reply.trim()) return parsed.reply.trim();
  } catch {}

  const match = /"reply"\s*:\s*"/.exec(text);
  if (!match) return text;
  let raw = "";
  let escaped = false;
  for (let index = match.index + match[0].length; index < text.length; index += 1) {
    const char = text[index];
    if (!escaped && char === '"') break;
    raw += char;
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
  }
  if (/\\$/.test(raw)) raw = raw.slice(0, -1);
  raw = raw.replace(/\\u[0-9a-fA-F]{0,3}$/u, "");
  try {
    const recovered = JSON.parse(`"${raw}"`);
    return recovered.trim() || text;
  } catch {
    return text;
  }
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
      message.sender === "character"
        ? extractVisibleReplyFromStoredEnvelope(message.content)
        : message.content,

    createdAt:
      message.created_at,

    editedAt:
      message.edited_at || null,

    isBookmarked: Boolean(message.is_bookmarked),
    bookmarkLabel: message.bookmark_label || "",
    chapterNumber: message.chapter_number || null,
    replyToMessageId: message.reply_to_message_id || null,
    replyPreview: message.reply_preview || "",
    replySender: message.reply_sender || "",

    isStreaming: false,
  };
}

function clampControl(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
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

function buildStoryPreferencesPayload(settings = {}, characterId = "") {
  const learnedPositiveFeedback = Object.entries(settings.storyPositiveFeedbackCounts || {})
    .filter(([, count]) => Number(count) >= 2)
    .map(([code]) => code)
    .slice(0, 4);
  const learnedNegativeFeedback = Object.entries(settings.storyNegativeFeedbackCounts || {})
    .filter(([, count]) => Number(count) >= 2)
    .map(([code]) => code)
    .slice(0, 8);
  return {
    prose: settings.storyProse || "contemporary",
    dialogue: settings.storyDialogue || "dialogue_forward",
    emotionalInterior: settings.storyEmotion || "interior_visible",
    romancePacing: settings.storyPacing || "medium_fast",
    customInstructions: [String(settings.storyInstructions || "").trim(), characterStoryStyleInstruction(characterId)].filter(Boolean).join("\n").slice(0, 900),
    learnedPositiveFeedback,
    learnedNegativeFeedback,
  };
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
