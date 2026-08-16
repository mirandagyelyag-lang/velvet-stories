import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  BookmarkPlus,
  Clock3,
  Brain,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  GitBranch,
  Globe2,
  HeartHandshake,
  ImagePlus,
  Eye,
  Moon,
  Sun,
  LoaderCircle,
  MessageSquareQuote,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Reply,
  Rewind,
  Send,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import RoleplayText from "../components/RoleplayText";
import MemoryBookDrawer from "../components/MemoryBookDrawer";
import StoryTimelineDrawer from "../components/StoryTimelineDrawer";
import StoryHubDrawer from "../components/StoryHubDrawer";
import RelationshipDrawer from "../components/RelationshipDrawer";
import { useChats } from "../context/ChatsContext";
import { usePersonas } from "../context/PersonasContext";
import { useLorebooks } from "../context/LorebooksContext";
import { useSettings } from "../context/SettingsContext";
import { useFeedback } from "../context/FeedbackContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import "../styles/chat.css";

const SILENT_CONTINUE_MESSAGE = "[SILENT_CONTINUE]";
const RETURN_MAIN_POV_MESSAGE = "[RETURN_MAIN_POV]";
const REGENERATION_FEEDBACK = [
  ["ignored_idea", "Ignored my idea"],
  ["too_short", "Too short"],
  ["out_of_character", "Out of character"],
  ["too_much_narration", "Too much narration"],
  ["not_enough_dialogue", "Not enough dialogue"],
  ["repetitive", "Repetitive"],
  ["pov_violation", "Controlled my POV"],
  ["missing_emotional_impact", "Missing emotional impact"],
];
const POSITIVE_FEEDBACK = [
  ["voice", "Character voice"],
  ["emotion", "Emotional depth"],
  ["dialogue", "Dialogue balance"],
  ["pacing", "Pacing"],
];

function Chat({ character, conversationId, onBack, onDeleted, onOpenMemories, onOpenDiagnostics }) {
  const { settings, recordStoryFeedback, undoStoryFeedback } = useSettings();
  const { theme, setTheme } = useTheme();
  const { confirmAction, scheduleDeletion } = useFeedback();
  const { personas } = usePersonas();
  const { lorebooks } = useLorebooks();
  const {
    getCharacterMessages,
    getConversation,
    isConversationLoading,
    isCharacterStreaming,
    getGenerationState,
    isCharacterGenerating,
    startConversation,
    createNewConversation,
    addMessage,
    generateCharacterReply,
    stopGeneration,
    updateConversationSettings,
    deleteConversation,
    deleteMessage,
    editMessageAndRemoveFollowing,
    rewindToMessage,
    branchConversationFromMessage,
    regenerateCharacterReply,
    reloadConversationMessages,
    saveMessageAsMemory,
    getMessageAlternatives,
    selectMessageAlternative,
    loadEarlierMessages,
    refreshStoryMetadata,
    toggleMessageBookmark,
    loadMessageIntoView,
  } = useChats();

  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [directorNote, setDirectorNote] = useState("");
  const [directorNoteOpen, setDirectorNoteOpen] = useState(false);
  const [directorMode, setDirectorMode] = useState("next");
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [actionMode, setActionMode] = useState("menu");
  const [actionDraft, setActionDraft] = useState("");
  const [regenerationFeedback, setRegenerationFeedback] = useState([]);
  const [positiveFeedback, setPositiveFeedback] = useState([]);
  const [feedbackOnly, setFeedbackOnly] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState({});
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [responseVersions, setResponseVersions] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(conversationId || "");
  const [conversationList, setConversationList] = useState([]);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [controlDraft, setControlDraft] = useState({ title: "", responseLengthOverride: "", narrationStyleOverride: "", creativity: 0.84, personaId: "", lorebookId: "", romanceIntensity: 35, initiative: 65, drama: 45, flirting: 30, humor: 45, descriptionLevel: 55, characterIndependence: 80, dialogueFrequency: 55, narrativeCamera: "balanced", innerThoughts: "rare", pacingMode: "natural" });
  const [savingControls, setSavingControls] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [characterProfileOpen, setCharacterProfileOpen] = useState(false);
  const [controlsMode, setControlsMode] = useState("simple");
  const [sceneImages, setSceneImages] = useState([]);
  const [activeSceneImageIndex, setActiveSceneImageIndex] = useState(-1);
  const [simpleVibe, setSimpleVibe] = useState("balanced");
  const [simpleResponseStyle, setSimpleResponseStyle] = useState("balanced");
  const [memoryBookOpen, setMemoryBookOpen] = useState(false);
  const [memoryBookCount, setMemoryBookCount] = useState(0);
  const [readingMode, setReadingMode] = useState(() => localStorage.getItem("velvet_reading_mode") === "1");
  const [readingChromeVisible, setReadingChromeVisible] = useState(true);
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [silentCue, setSilentCue] = useState("");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [storyHubOpen, setStoryHubOpen] = useState(false);
  const [refreshingTimeline, setRefreshingTimeline] = useState(false);
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [backgroundDim, setBackgroundDim] = useState(42);
  const [backgroundSlideshow, setBackgroundSlideshow] = useState(false);
  const [compactMobileChat, setCompactMobileChat] = useState(false);
  const sceneImageInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesMeasureRef = useRef(null);
  const textareaRef = useRef(null);
  const stoppedRef = useRef(false);
  const generationRunRef = useRef(0);
  const stopBurstTimersRef = useRef([]);
  const loadingHistoryRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const preserveScrollOnKeyboardRef = useRef(null);
  const keyboardOpenRef = useRef(false);
  const previousConversationRef = useRef("");
  const messages = getCharacterMessages(character.id);
  const visibleMessages = messages.filter((item) => !isSilentContinuation(item));
  const conversation = getConversation(character.id);
  const conversationLoading = isConversationLoading(character.id);
  const characterStreaming = isCharacterStreaming(character.id);
  const generationState = getGenerationState(character.id);
  const characterGenerating = isCharacterGenerating(character.id);
  const conversationReady = Boolean(conversation?.conversationId);
  const latestMessageContent = messages[messages.length - 1]?.content || "";

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const measure = () => {
      if (!media.matches || !conversationReady) {
        setCompactMobileChat(false);
        return;
      }

      const messagesNode = messagesMeasureRef.current;
      const composerNode = textareaRef.current?.closest(".chat__composer");
      if (!messagesNode || !composerNode) {
        setCompactMobileChat(false);
        return;
      }

      const viewportHeight = window.visualViewport?.height || window.innerHeight || 0;
      const composerHeight = Math.max(54, composerNode.getBoundingClientRect().height || 0);
      const headerAllowance = readingMode && !readingChromeVisible ? 24 : 76;
      const availableStoryHeight = Math.max(0, viewportHeight - composerHeight - headerAllowance - 28);
      const storyHeight = messagesNode.getBoundingClientRect().height;

      // Short stories should flow naturally into the composer instead of leaving
      // a giant empty slab. Once the story is taller than the usable viewport,
      // the composer returns to its fixed mobile position.
      setCompactMobileChat(storyHeight > 0 && storyHeight < availableStoryHeight);
    };

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (messagesMeasureRef.current) resizeObserver?.observe(messagesMeasureRef.current);
    if (textareaRef.current?.closest(".chat__composer")) resizeObserver?.observe(textareaRef.current.closest(".chat__composer"));

    const viewport = window.visualViewport;
    const timer = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure, { passive: true });
    viewport?.addEventListener("resize", measure, { passive: true });
    media.addEventListener?.("change", measure);

    return () => {
      window.cancelAnimationFrame(timer);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
      viewport?.removeEventListener("resize", measure);
      media.removeEventListener?.("change", measure);
    };
  }, [conversationReady, visibleMessages.length, latestMessageContent, readingMode, readingChromeVisible]);

  // VELVET_GENERATION_MANAGER_V1
  // Never lock sending merely because a stale temporary bubble exists.
  // The context generation manager is the authoritative busy state.
  const busy = sending || characterGenerating;
  const activeSceneImage = sceneImages[activeSceneImageIndex] || "";
  const sceneMarkers = useMemo(() => {
    const map = new Map();
    for (const item of conversation?.storyTimeline || []) {
      if (!item?.message_id || (!item.scene_changed && !item.separator_label)) continue;
      map.set(String(item.message_id), item);
    }
    return map;
  }, [conversation?.storyTimeline]);

  useEffect(() => {
    localStorage.setItem("velvet_reading_mode", readingMode ? "1" : "0");
    setReadingChromeVisible(false);
  }, [readingMode]);

  useEffect(() => {
    startConversation(character, { conversationId: activeConversationId || conversationId }).catch((error) => {
      console.error("Conversation initialization failed:", error);
    });
  }, [character.id, activeConversationId, conversationId]);

  useEffect(() => {
    if (conversationId) setActiveConversationId(conversationId);
  }, [conversationId]);

  useEffect(() => { loadConversationList(); }, [character.id, conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    const savedDraft = localStorage.getItem(`velvet_draft_${id}`) || "";
    setMessage(savedDraft);
    try {
      const savedReply = JSON.parse(localStorage.getItem(`velvet_reply_draft_${id}`) || "null");
      setReplyTo(savedReply && savedReply.id ? savedReply : null);
      const savedDirectorNote = localStorage.getItem(`velvet_director_note_${id}`) || "";
      setDirectorNote(savedDirectorNote);
      setDirectorNoteOpen(Boolean(savedDirectorNote));
    } catch {
      setReplyTo(null);
    }
    window.requestAnimationFrame(() => resizeComposer());
  }, [conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    if (message) localStorage.setItem(`velvet_draft_${id}`, message);
    else localStorage.removeItem(`velvet_draft_${id}`);
  }, [message, conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    if (replyTo?.id) localStorage.setItem(`velvet_reply_draft_${id}`, JSON.stringify(replyTo));
    else localStorage.removeItem(`velvet_reply_draft_${id}`);
  }, [replyTo, conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    if (directorNote.trim()) localStorage.setItem(`velvet_director_note_${id}`, directorNote);
    else localStorage.removeItem(`velvet_director_note_${id}`);
  }, [directorNote, conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`velvet_scene_images_${id}`) || "[]");
      const nextImages = Array.isArray(saved) ? saved.slice(0, 6) : [];
      const savedIndex = Number(localStorage.getItem(`velvet_scene_background_index_${id}`) ?? -1);
      setSceneImages(nextImages);
      setActiveSceneImageIndex(nextImages.length ? Math.min(Math.max(-1, savedIndex), nextImages.length - 1) : -1);
      setBackgroundBlur(Number(localStorage.getItem(`velvet_scene_blur_${id}`) || 0));
      setBackgroundDim(Number(localStorage.getItem(`velvet_scene_dim_${id}`) || 42));
      setBackgroundSlideshow(localStorage.getItem(`velvet_scene_slideshow_${id}`) === "1");
    } catch {
      setSceneImages([]);
      setActiveSceneImageIndex(-1);
    }
  }, [conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    try {
      localStorage.setItem(`velvet_scene_images_${id}`, JSON.stringify(sceneImages.slice(0, 6)));
    } catch (error) {
      console.warn("Could not persist scene images:", error);
    }
  }, [sceneImages, conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    localStorage.setItem(`velvet_scene_background_index_${id}`, String(activeSceneImageIndex));
  }, [activeSceneImageIndex, conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    localStorage.setItem(`velvet_scene_blur_${id}`, String(backgroundBlur));
    localStorage.setItem(`velvet_scene_dim_${id}`, String(backgroundDim));
    localStorage.setItem(`velvet_scene_slideshow_${id}`, backgroundSlideshow ? "1" : "0");
  }, [backgroundBlur, backgroundDim, backgroundSlideshow, conversation?.conversationId]);

  useEffect(() => {
    if (!backgroundSlideshow || sceneImages.length < 2 || !conversation?.conversationId) return;
    const timer = window.setInterval(() => {
      setActiveSceneImageIndex((current) => current < 0 ? 0 : (current + 1) % sceneImages.length);
    }, 18000);
    return () => window.clearInterval(timer);
  }, [backgroundSlideshow, sceneImages.length, conversation?.conversationId]);

  useEffect(() => {
    if (!conversation) return;
    setControlDraft({
      title: conversation.title || character.name,
      responseLengthOverride: conversation.responseLengthOverride || "",
      narrationStyleOverride: conversation.narrationStyleOverride || "",
      creativity: Number(conversation.creativity ?? 0.84),
      personaId: conversation.personaId || "",
      lorebookId: conversation.lorebookId || "",
      romanceIntensity: Number(conversation.romanceIntensity ?? 35),
      initiative: Number(conversation.initiative ?? 65),
      drama: Number(conversation.drama ?? 45),
      flirting: Number(conversation.flirting ?? 30),
      humor: Number(conversation.humor ?? 45),
      descriptionLevel: Number(conversation.descriptionLevel ?? 55),
      characterIndependence: Number(conversation.characterIndependence ?? 80),
      dialogueFrequency: Number(conversation.dialogueFrequency ?? 55),
      narrativeCamera: conversation.narrativeCamera || "balanced",
      innerThoughts: conversation.innerThoughts || "rare",
      storyPreset: conversation.storyPreset || "natural",
      pacingMode: conversation.pacingMode || "natural",
    });
    const romance = Number(conversation.romanceIntensity ?? 35);
    const flirting = Number(conversation.flirting ?? 30);
    const description = Number(conversation.descriptionLevel ?? 55);
    setSimpleVibe(conversation.storyPreset === "slow_burn" ? "slowburn" : (conversation.storyPreset || (romance >= 65 ? "romantic" : (flirting <= 25 && description >= 60 ? "slowburn" : "natural"))));
    setSimpleResponseStyle(conversation.responseLengthOverride === "short" ? "short" : (conversation.responseLengthOverride === "long" ? "detailed" : "balanced"));
  }, [conversation?.conversationId, conversation?.title, conversation?.responseLengthOverride, conversation?.narrationStyleOverride, conversation?.creativity, conversation?.personaId, conversation?.lorebookId, conversation?.romanceIntensity, conversation?.initiative, conversation?.drama, conversation?.flirting, conversation?.humor, conversation?.descriptionLevel, conversation?.characterIndependence, conversation?.dialogueFrequency, conversation?.narrativeCamera, conversation?.innerThoughts, conversation?.storyPreset, conversation?.pacingMode]);

  async function loadConversationList() {
    const { data, error } = await supabase.from("conversations")
      .select("id, title, updated_at, is_pinned").eq("character_id", character.id).is("archived_at", null)
      .order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
    if (error) return console.error("Could not load conversation list:", error);
    setConversationList(data || []);
    if (!activeConversationId && conversation?.conversationId) setActiveConversationId(conversation.conversationId);
  }

  async function switchConversation(nextId) {
    if (!nextId || nextId === conversation?.conversationId || busy) return;
    setSendError(""); setActiveConversationId(nextId);
    await startConversation(character, { conversationId: nextId });
  }

  useEffect(() => {
    function trackScrollPosition() {
      // Do not let opening/closing the mobile keyboard redefine whether the
      // reader was following the newest messages.
      if (keyboardOpenRef.current) return;
      const distanceFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      stickToBottomRef.current = distanceFromBottom < 170;
      setShowJumpToBottom(distanceFromBottom > 360);
    }

    trackScrollPosition();
    window.addEventListener("scroll", trackScrollPosition, { passive: true });
    window.addEventListener("resize", trackScrollPosition);
    return () => {
      window.removeEventListener("scroll", trackScrollPosition);
      window.removeEventListener("resize", trackScrollPosition);
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    let restoreFrame = 0;

    function syncKeyboardViewport() {
      const keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const keyboardOpen = keyboardOffset > 80;
      keyboardOpenRef.current = keyboardOpen;
      document.documentElement.style.setProperty("--velvet-keyboard-offset", `${keyboardOffset}px`);

      // If the user tapped the composer while reading older messages, mobile
      // browsers often scroll the page just to reveal the focused textarea.
      // Keep the exact reading position instead.
      if (keyboardOpen && preserveScrollOnKeyboardRef.current !== null) {
        const savedTop = preserveScrollOnKeyboardRef.current;
        cancelAnimationFrame(restoreFrame);
        restoreFrame = requestAnimationFrame(() => {
          window.scrollTo({ top: savedTop, behavior: "auto" });
        });
      }
    }

    syncKeyboardViewport();
    viewport.addEventListener("resize", syncKeyboardViewport);
    viewport.addEventListener("scroll", syncKeyboardViewport);
    return () => {
      cancelAnimationFrame(restoreFrame);
      viewport.removeEventListener("resize", syncKeyboardViewport);
      viewport.removeEventListener("scroll", syncKeyboardViewport);
      document.documentElement.style.removeProperty("--velvet-keyboard-offset");
    };
  }, []);

  useEffect(() => {
    if (loadingHistoryRef.current || conversationLoading) return;

    const currentConversationId = conversation?.conversationId || "";
    const conversationChanged = currentConversationId && previousConversationRef.current !== currentConversationId;

    if (conversationChanged) {
      previousConversationRef.current = currentConversationId;
      stickToBottomRef.current = true;
    }

    if (conversationChanged || stickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: conversationChanged || characterStreaming ? "auto" : "smooth",
      });
    }
  }, [messages.length, latestMessageContent, isTyping, conversationLoading, characterStreaming, conversation?.conversationId]);

  async function handleLoadEarlierMessages() {
    if (loadingHistoryRef.current || conversation?.loadingEarlierMessages) return;

    const previousHeight = document.documentElement.scrollHeight;
    const previousTop = window.scrollY;
    loadingHistoryRef.current = true;

    try {
      await loadEarlierMessages(character.id);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const addedHeight = document.documentElement.scrollHeight - previousHeight;
          window.scrollTo({ top: previousTop + addedHeight, behavior: "auto" });
          loadingHistoryRef.current = false;
        });
      });
    } catch (error) {
      loadingHistoryRef.current = false;
      setSendError(error.message || "We couldn't load earlier messages.");
    }
  }

  function jumpToBottom() {
    stickToBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleComposerPointerDown() {
    // Capture position before the browser focuses the textarea. This runs
    // before the native keyboard has a chance to move the document.
    if (!stickToBottomRef.current) {
      preserveScrollOnKeyboardRef.current = window.scrollY;
    } else {
      preserveScrollOnKeyboardRef.current = null;
    }
  }

  function handleComposerFocus() {
    if (preserveScrollOnKeyboardRef.current === null || stickToBottomRef.current) return;
    const savedTop = preserveScrollOnKeyboardRef.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo({ top: savedTop, behavior: "auto" }));
    });
  }

  function handleComposerBlur() {
    preserveScrollOnKeyboardRef.current = null;
    // visualViewport fires again after the keyboard closes; this fallback
    // keeps desktop and older mobile browsers tidy too.
    window.setTimeout(() => {
      if (!keyboardOpenRef.current) {
        document.documentElement.style.setProperty("--velvet-keyboard-offset", "0px");
      }
    }, 80);
  }

  function resizeComposer() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // VELVET_STOP_V6_CLEAR_LATCH
    // A deliberate new message cancels any delayed Stop attempts belonging
    // to the previous generation.
    stopBurstTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    stopBurstTimersRef.current = [];

    const cleanMessage = message.trim();
    if (busy || !conversationReady) return;

    const dotsOnly = /^[.…。]+$/u.test(cleanMessage);
    const compactDots = cleanMessage.replace(/[…。]/gu, ".");
    const returnToMainPov = dotsOnly && compactDots === "..";
    const messageToSend = cleanMessage === "" || dotsOnly
      ? (returnToMainPov ? RETURN_MAIN_POV_MESSAGE : SILENT_CONTINUE_MESSAGE)
      : cleanMessage;

    if (messageToSend === RETURN_MAIN_POV_MESSAGE) {
      setSilentCue(`Returning to ${character.name}…`);
    } else if (messageToSend === SILENT_CONTINUE_MESSAGE) {
      setSilentCue("Continuing the scene…");
    } else {
      setSilentCue("");
    }

    // Every generation owns a run id. A stopped/older generation is never
    // allowed to change the UI state of a newer generation when its async
    // catch/finally finishes later.
    const runId = ++generationRunRef.current;

    try {
      stoppedRef.current = false;
      setSending(true);
      setSendError("");
      const savedUserMessage = await addMessage(character.id, "user", messageToSend, replyTo ? {
        replyToMessageId: replyTo.id,
        replyPreview: replyTo.content,
        replySender: replyTo.sender,
      } : {});

      // Stop may have happened while the user message was being saved.
      if (generationRunRef.current !== runId || stoppedRef.current) return;

      const noteForThisGeneration = directorNote.trim();
      setMessage("");
      setReplyTo(null);
      setDirectorNote("");
      setDirectorNoteOpen(false);
      if (conversation?.conversationId) {
        localStorage.removeItem(`velvet_draft_${conversation.conversationId}`);
        localStorage.removeItem(`velvet_reply_draft_${conversation.conversationId}`);
        localStorage.removeItem(`velvet_director_note_${conversation.conversationId}`);
      }
      window.requestAnimationFrame(() => resizeComposer());
      if (settings.haptics) navigator.vibrate?.(6);
      setSending(false);
      setIsTyping(true);
      await generateCharacterReply(character.id, {
        directorInstruction: noteForThisGeneration,
        expectedUserMessageId: savedUserMessage.id,
      });
    } catch (error) {
      if (
        generationRunRef.current !== runId ||
        stoppedRef.current ||
        error.name === "AbortError"
      ) return;

      console.error("Error generating character response:", error);
      setSendError(translateMessageError(error.message));
    } finally {
      // Critical: an older stopped request must not turn off the Stop button
      // or typing state belonging to a newer request.
      if (generationRunRef.current === runId) {
        setSending(false);
        setIsTyping(false);
        setSilentCue("");
      }
    }
  }

  function handleStop() {
    // VELVET_STOP_V6_LATCH
    // One physical tap becomes a short-lived Stop latch. The first tap can
    // happen a few milliseconds before generateCharacterReply has installed
    // its AbortController. Re-checking catches that late request automatically
    // instead of making the user tap Stop repeatedly.
    generationRunRef.current += 1;
    stoppedRef.current = true;
    if (settings.haptics) navigator.vibrate?.(10);

    stopBurstTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    stopBurstTimersRef.current = [];

    const stopNow = () => {
      stopGeneration(character.id);
    };

    stopNow();

    for (const delayMs of [50, 150, 300, 600, 1000]) {
      const timerId = setTimeout(stopNow, delayMs);
      stopBurstTimersRef.current.push(timerId);
    }

    setSending(false);
    setIsTyping(false);
    setSilentCue("");
    setSendError("");
    window.requestAnimationFrame(() => {
      try { textareaRef.current?.focus({ preventScroll: true }); } catch { textareaRef.current?.focus(); }
    });
  }

  async function retryGeneration() {
    if (busy || !conversationReady) return;
    const runId = ++generationRunRef.current;
    try {
      stoppedRef.current = false;
      setSendError("");
      setSilentCue("");
      setIsTyping(true);
      await generateCharacterReply(character.id);
    } catch (error) {
      if (
        generationRunRef.current === runId &&
        !stoppedRef.current &&
        error.name !== "AbortError"
      ) {
        setSendError(translateMessageError(error.message));
      }
    } finally {
      if (generationRunRef.current === runId) setIsTyping(false);
    }
  }

  async function handleSceneImages(event) {
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, 6 - sceneImages.length));
    if (!files.length) return;
    try {
      const encoded = await Promise.all(files.map((file) => compressSceneImage(file)));
      setSceneImages((current) => {
        const next = [...current, ...encoded].slice(0, 6);
        if (current.length === 0 && next.length > 0) setActiveSceneImageIndex(0);
        return next;
      });
    } catch (error) {
      console.error("Scene image import failed:", error);
      setSendError("One of the scene images couldn't be added.");
    } finally {
      event.target.value = "";
    }
  }

  function removeSceneImage(index) {
    setSceneImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setActiveSceneImageIndex((current) => {
      if (current === index) return -1;
      if (current > index) return current - 1;
      return current;
    });
  }

  async function applyStoryVibe(vibe) {
    const vibes = {
      natural: { storyPreset: "natural", romanceIntensity: 30, initiative: 72, drama: 38, flirting: 26, humor: 48, descriptionLevel: 52, characterIndependence: 88, dialogueFrequency: 58, narrativeCamera: "balanced", innerThoughts: "rare" },
      romantic: { storyPreset: "romantic", romanceIntensity: 72, initiative: 72, drama: 46, flirting: 58, humor: 40, descriptionLevel: 58, characterIndependence: 84, dialogueFrequency: 62, narrativeCamera: "balanced", innerThoughts: "rare" },
      dramatic: { storyPreset: "dramatic", romanceIntensity: 42, initiative: 82, drama: 82, flirting: 34, humor: 24, descriptionLevel: 70, characterIndependence: 90, dialogueFrequency: 54, narrativeCamera: "balanced", innerThoughts: "sometimes" },
      slowburn: { storyPreset: "slow_burn", romanceIntensity: 36, initiative: 66, drama: 52, flirting: 17, humor: 40, descriptionLevel: 60, characterIndependence: 90, dialogueFrequency: 54, narrativeCamera: "balanced", innerThoughts: "rare" },
    };
    const values = vibes[vibe] || vibes.natural;
    setSimpleVibe(vibe);
    setControlDraft((current) => ({ ...current, ...values }));
    try {
      setSavingControls(true);
      await updateConversationSettings(character.id, values);
    } catch (error) {
      setSendError(error.message || "We couldn't save that story vibe.");
    } finally {
      setSavingControls(false);
    }
  }

  async function applyResponseStyle(style) {
    const styles = {
      short: { responseLengthOverride: "short", narrationStyleOverride: "dialogue" },
      balanced: { responseLengthOverride: "balanced", narrationStyleOverride: "balanced" },
      detailed: { responseLengthOverride: "long", narrationStyleOverride: "immersive" },
    };
    const values = styles[style] || styles.balanced;
    setSimpleResponseStyle(style);
    setControlDraft((current) => ({ ...current, ...values }));
    try {
      setSavingControls(true);
      await updateConversationSettings(character.id, values);
    } catch (error) {
      setSendError(error.message || "We couldn't save that response style.");
    } finally {
      setSavingControls(false);
    }
  }

  function applyDynamicsPreset(preset) {
    const presets = {
      grounded: { romanceIntensity: 15, initiative: 60, drama: 25, flirting: 15, humor: 40, descriptionLevel: 45, characterIndependence: 85, dialogueFrequency: 55 },
      natural: { romanceIntensity: 35, initiative: 65, drama: 45, flirting: 30, humor: 45, descriptionLevel: 55, characterIndependence: 80, dialogueFrequency: 55 },
      cinematic: { romanceIntensity: 50, initiative: 80, drama: 75, flirting: 45, humor: 35, descriptionLevel: 85, characterIndependence: 85, dialogueFrequency: 50 },
      social: { romanceIntensity: 35, initiative: 75, drama: 40, flirting: 40, humor: 70, descriptionLevel: 35, characterIndependence: 75, dialogueFrequency: 85 },
    };
    const values = presets[preset];
    if (values) setControlDraft((current) => ({ ...current, ...values }));
  }

  async function saveControls(event) {
    event.preventDefault();
    if (!controlDraft.title.trim()) return;
    try {
      setSavingControls(true); setSendError("");
      await updateConversationSettings(character.id, controlDraft);
      await loadConversationList();
      setControlsOpen(false);
    } catch (error) { setSendError(error.message || "We couldn't save these controls."); }
    finally { setSavingControls(false); }
  }

  async function handleRefreshTimeline() {
    try {
      setRefreshingTimeline(true);
      await refreshStoryMetadata(character.id);
    } catch (error) {
      setSendError(error.message || "We couldn't refresh story continuity.");
    } finally {
      setRefreshingTimeline(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter") return;

    const isMobileInput =
      window.matchMedia?.("(pointer: coarse)")?.matches ||
      window.innerWidth <= 768;

    // On phones/tablets, Enter always means a new line.
    // Sending is intentionally button-only on touch devices.
    if (isMobileInput) return;

    // Desktop: Shift + Enter creates a new line.
    if (event.shiftKey) return;

    event.preventDefault();
    handleSubmit(event);
  }

  function openActions(chatMessage) {
    if (chatMessage.isStreaming || busy) return;
    setSelectedMessage(chatMessage);
    setActionMode("menu");
    setActionDraft("");
    setRegenerationFeedback([]);
    setPositiveFeedback([]);
    setFeedbackOnly(false);
    setAlternatives([]);
  }

  function openMessageFeedback(chatMessage, kind) {
    if (chatMessage.isStreaming || busy || chatMessage.sender !== "character") return;
    const latestMessage = [...(conversation?.messages || [])].filter((item) => !item.isStreaming).at(-1);
    setSelectedMessage(chatMessage);
    setActionMode(kind === "positive" ? "positive-feedback" : "regenerate");
    setActionDraft("");
    setRegenerationFeedback([]);
    setPositiveFeedback([]);
    setFeedbackOnly(kind === "negative" && latestMessage?.id !== chatMessage.id);
    setAlternatives([]);
  }

  function closeActions() {
    if (actionLoading) return;
    setSelectedMessage(null);
    setActionMode("menu");
    setActionDraft("");
    setRegenerationFeedback([]);
    setPositiveFeedback([]);
    setFeedbackOnly(false);
    setAlternatives([]);
  }

  async function runAction(action) {
    if (!selectedMessage) return;

    try {
      setActionLoading(true);
      setSendError("");

      if (action === "copy") {
        await navigator.clipboard.writeText(selectedMessage.content);
        closeActionsAfterAction();
      }

      if (action === "reply") {
        setReplyTo({
          id: selectedMessage.id,
          sender: selectedMessage.sender,
          content: selectedMessage.content.replace(/\s+/g, " ").slice(0, 280),
        });
        closeActionsAfterAction();
        window.setTimeout(() => textareaRef.current?.focus(), 50);
      }

      if (action === "quote") {
        const excerpt = selectedMessage.content.replace(/\s+/g, " ").slice(0, 180);
        setMessage(`> “${excerpt}${selectedMessage.content.length > 180 ? "…" : ""}”\n\n`);
        closeActionsAfterAction();
        window.setTimeout(() => textareaRef.current?.focus(), 50);
      }

      if (action === "memory") {
        await saveMessageAsMemory(character.id, selectedMessage.content);
        closeActionsAfterAction();
      }

      if (action === "bookmark") {
        await toggleMessageBookmark(character.id, selectedMessage.id);
        closeActionsAfterAction();
      }

      if (action === "rewind") {
        const messageId = selectedMessage.id;
        const approved = await confirmAction({
          title: "Rewind story to this message?",
          message: "Everything after this message will be permanently removed from this conversation.",
          confirmLabel: "Rewind story",
        });
        if (!approved) return;
        await rewindToMessage(character.id, messageId);
        closeActionsAfterAction();
      }

      if (action === "delete") {
        const messageId = selectedMessage.id;
        const approved = !settings.confirmBeforeDelete || await confirmAction({ title: "Delete this message?", message: "You can undo before it is permanently removed from the story.", confirmLabel: "Delete message" });
        if (!approved) return;
        closeActionsAfterAction();
        scheduleDeletion({ message: "Deleting message", onCommit: () => deleteMessage(character.id, messageId), onError: (error) => setSendError(error.message || "We couldn't delete this message.") });
      }

      if (action === "load-alternatives") {
        const rows = await getMessageAlternatives(selectedMessage.id);
        const unique = rows.filter((item, index, all) => all.findIndex((other) => other.content === item.content) === index);
        if (!unique.some((item) => item.content === selectedMessage.content)) {
          unique.push({ id: `current-${selectedMessage.id}`, content: selectedMessage.content, current: true });
        }
        setAlternatives(unique);
        setActionMode("alternatives");
      }
    } catch (error) {
      console.error("Message action failed:", error);
      setSendError(error.message || "That action couldn't be completed.");
    } finally {
      setActionLoading(false);
    }
  }

  function closeActionsAfterAction() {
    setSelectedMessage(null);
    setActionMode("menu");
    setActionDraft("");
    setRegenerationFeedback([]);
    setPositiveFeedback([]);
    setFeedbackOnly(false);
    setAlternatives([]);
  }

  function rememberFeedback(kind, codes, messageId) {
    const accepted = recordStoryFeedback(kind, codes);
    if (!accepted.length) return;
    setMessageFeedback((current) => ({ ...current, [messageId]: kind }));
    setFeedbackNotice({ kind, codes: accepted, messageId });
  }

  function undoLatestFeedback() {
    if (!feedbackNotice) return;
    undoStoryFeedback(feedbackNotice.kind, feedbackNotice.codes);
    setMessageFeedback((current) => {
      const next = { ...current };
      delete next[feedbackNotice.messageId];
      return next;
    });
    setFeedbackNotice(null);
  }

  function savePositiveFeedback() {
    if (!selectedMessage || !positiveFeedback.length) return;
    rememberFeedback("positive", positiveFeedback, selectedMessage.id);
    closeActionsAfterAction();
  }

  async function createBranchFromSelected() {
    if (!selectedMessage || actionLoading) return;
    try {
      setActionLoading(true);
      setSendError("");
      const branch = await branchConversationFromMessage(character.id, selectedMessage.id, actionDraft);
      closeActionsAfterAction();
      setActiveConversationId(branch.id);
      await startConversation(character, { conversationId: branch.id });
      await loadConversationList();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Branch creation failed:", error);
      setSendError(error.message || "We couldn't create that branch.");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveEditedMessage() {
    if (!selectedMessage || !actionDraft.trim()) return;

    try {
      setActionLoading(true);
      const updatedUserMessage = await editMessageAndRemoveFollowing(character.id, selectedMessage.id, actionDraft);
      closeActionsAfterAction();
      setIsTyping(true);
      await generateCharacterReply(character.id, { expectedUserMessageId: updatedUserMessage.id });
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Message edit failed:", error);
      setSendError(translateMessageError(error.message));
    } finally {
      setActionLoading(false);
      setIsTyping(false);
    }
  }

  async function saveEditedAIResponse() {
    if (!selectedMessage || !actionDraft.trim()) return;
    try {
      setActionLoading(true);
      await editMessageAndRemoveFollowing(character.id, selectedMessage.id, actionDraft);
      closeActionsAfterAction();
      await refreshStoryMetadata(character.id).catch(() => {});
    } catch (error) {
      setSendError(translateMessageError(error.message));
    } finally {
      setActionLoading(false);
    }
  }

  async function regenerate() {
    if (!selectedMessage || selectedMessage.sender !== "character") return;
    const latestMessage = [...(conversation?.messages || [])].filter((item) => !item.isStreaming).at(-1);
    if (latestMessage?.id !== selectedMessage.id) {
      rememberFeedback("negative", regenerationFeedback, selectedMessage.id);
      closeActionsAfterAction();
      return;
    }

    try {
      const targetId = selectedMessage.id;
      const instruction = actionDraft.trim();
      const feedbackCodes = [...regenerationFeedback];
      rememberFeedback("negative", feedbackCodes, targetId);
      setActionLoading(true);
      closeActionsAfterAction();
      setIsTyping(true);
      await regenerateCharacterReply(character.id, targetId, instruction, feedbackCodes);
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Regeneration failed:", error);
      await reloadConversationMessages(character.id).catch((reloadError) => {
        console.error("Could not restore messages:", reloadError);
      });
      setSendError(translateMessageError(error.message));
    } finally {
      setActionLoading(false);
      setIsTyping(false);
    }
  }


  function normalizeVersionRows(rows = [], currentContent = "") {
    const seen = new Set();
    const items = [];

    for (const row of rows) {
      const content = String(row?.content || "").trim();
      if (!content || seen.has(content)) continue;
      seen.add(content);
      items.push({ ...row, content });
    }

    const current = String(currentContent || "").trim();
    if (current && !seen.has(current)) {
      items.push({ id: `current-${Date.now()}`, content: current, current: true });
    }

    const currentIndex = Math.max(0, items.findIndex((item) => item.content === current));
    return { items, index: currentIndex >= 0 ? currentIndex : Math.max(0, items.length - 1), loaded: true, loading: false };
  }

  async function loadResponseVersions(chatMessage, force = false) {
    const existing = responseVersions[chatMessage.id];
    if (existing?.loaded && !force) return existing;

    setResponseVersions((current) => ({
      ...current,
      [chatMessage.id]: { ...(current[chatMessage.id] || {}), loading: true },
    }));

    const rows = await getMessageAlternatives(chatMessage.id);
    const next = normalizeVersionRows(rows, chatMessage.content);
    setResponseVersions((current) => ({ ...current, [chatMessage.id]: next }));
    return next;
  }

  useEffect(() => {
    const latestCharacterMessage = [...visibleMessages].reverse().find((item) => item.sender === "character" && !item.isStreaming);
    if (!latestCharacterMessage || busy || !conversationReady) return;
    loadResponseVersions(latestCharacterMessage).catch((error) => {
      console.debug("Could not preload response versions:", error);
    });
  }, [conversation?.conversationId, latestMessageContent, busy, conversationReady]);

  async function navigateResponseVersion(chatMessage, direction) {
    if (!chatMessage || chatMessage.sender !== "character" || chatMessage.isStreaming || busy) return;

    try {
      setSendError("");
      let state = await loadResponseVersions(chatMessage);

      if (direction < 0) {
        if (state.index <= 0) return;
        const nextIndex = state.index - 1;
        await selectMessageAlternative(character.id, chatMessage.id, state.items[nextIndex].content);
        setResponseVersions((current) => ({
          ...current,
          [chatMessage.id]: { ...state, index: nextIndex },
        }));
        return;
      }

      if (state.index < state.items.length - 1) {
        const nextIndex = state.index + 1;
        await selectMessageAlternative(character.id, chatMessage.id, state.items[nextIndex].content);
        setResponseVersions((current) => ({
          ...current,
          [chatMessage.id]: { ...state, index: nextIndex },
        }));
        return;
      }

      setIsTyping(true);
      const result = await regenerateCharacterReply(character.id, chatMessage.id, "");
      const currentContent = result?.message?.content || chatMessage.content;
      const rows = await getMessageAlternatives(chatMessage.id);
      const refreshed = normalizeVersionRows(rows, currentContent);
      refreshed.index = Math.max(0, refreshed.items.findIndex((item) => item.content === currentContent));
      setResponseVersions((current) => ({ ...current, [chatMessage.id]: refreshed }));
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Response version navigation failed:", error);
      await reloadConversationMessages(character.id).catch(() => {});
      setSendError(translateMessageError(error.message));
    } finally {
      setIsTyping(false);
    }
  }

  async function regenerateFromSwipe(chatMessage, direction = 1) {
    await navigateResponseVersion(chatMessage, direction);
  }

  async function quickRefineSelected(feedbackCode, instruction = "") {
    if (!selectedMessage || selectedMessage.sender !== "character" || actionLoading) return;
    const latestMessage = [...(conversation?.messages || [])].filter((item) => !item.isStreaming).at(-1);
    if (latestMessage?.id !== selectedMessage.id) {
      setSendError("Rewind to this response first before generating a new version from it.");
      closeActionsAfterAction();
      return;
    }

    const targetId = selectedMessage.id;
    try {
      const feedbackCodes = feedbackCode ? [feedbackCode] : [];
      rememberFeedback("negative", feedbackCodes, targetId);
      setActionLoading(true);
      setSendError("");
      closeActionsAfterAction();
      setIsTyping(true);
      await regenerateCharacterReply(character.id, targetId, instruction, feedbackCodes);
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Quick refinement failed:", error);
      await reloadConversationMessages(character.id).catch(() => {});
      setSendError(translateMessageError(error.message));
    } finally {
      setActionLoading(false);
      setIsTyping(false);
    }
  }

  async function chooseAlternative(alternative) {
    try {
      setActionLoading(true);
      await selectMessageAlternative(character.id, selectedMessage.id, alternative.content);
      closeActionsAfterAction();
    } catch (error) {
      setSendError(error.message || "We couldn't select that response.");
    } finally {
      setActionLoading(false);
    }
  }

  async function jumpToStoryMessage(messageId) {
    setStoryHubOpen(false);
    try {
      await loadMessageIntoView(character.id, messageId);
    } catch (error) {
      console.error("Could not load searched message:", error);
    }
    window.setTimeout(() => {
      const node = document.querySelector(`[data-message-id="${messageId}"]`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (node) {
        node.classList.add("chat-message--flash");
        window.setTimeout(() => node.classList.remove("chat-message--flash"), 1200);
      }
    }, 100);
  }

  async function openStoryConversation(nextId) {
    if (!nextId || busy) return;
    setStoryHubOpen(false);
    setActiveConversationId(nextId);
    await startConversation(character, { conversationId: nextId });
    await loadConversationList();
  }

  async function handleDeleteConversation() {
    const approved = !settings.confirmBeforeDelete || await confirmAction({ title: "Delete this entire conversation?", message: "Every message and response alternative in this story will be removed.", confirmLabel: "Delete story" });
    if (!approved) return;
    setMenuOpen(false);
    scheduleDeletion({ message: "Deleting conversation", onCommit: async () => { setDeleting(true); await deleteConversation(character.id); onDeleted?.(); }, onError: (error) => { console.error(error); setSendError("We couldn't delete this conversation."); setDeleting(false); } });
  }

  async function handleNewConversation() {
    if (busy || creatingConversation) return;

    try {
      setCreatingConversation(true);
      setMenuOpen(false);
      setSendError("");
      const created = await createNewConversation(character);
      setActiveConversationId(created.conversationId);
      await loadConversationList();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error creating conversation:", error);
      setSendError("We couldn't create a new conversation.");
    } finally {
      setCreatingConversation(false);
    }
  }

  function applyDirectorPreset(value) {
    setDirectorNote(value);
    setDirectorNoteOpen(true);
  }

  function openDirector(mode = "next") {
    setDirectorMode(mode);
    setDirectorNoteOpen(true);
  }

  function queueDirectorForNextBeat() {
    const instruction = directorNote.trim();
    if (!instruction || busy || actionLoading || !conversationReady) return;
    setDirectorMode("next");
    setDirectorNoteOpen(false);
    setSendError("");
    if (settings.haptics) navigator.vibrate?.(5);
  }

  function clearQueuedDirector() {
    setDirectorNote("");
    if (conversation?.conversationId) {
      localStorage.removeItem(`velvet_director_note_${conversation.conversationId}`);
    }
  }

  function handleReadingSurfaceClick() {
    // v2.1.7: immersive mode never hides the story header. The character name,
    // navigation and three-dot menu stay available at all times.
    if (readingMode && !readingChromeVisible) setReadingChromeVisible(true);
  }

  async function applyDirectorAndRegenerate() {
    const instruction = directorNote.trim();
    if (!instruction || busy || actionLoading || !conversationReady) return;

    const canonicalMessages = [...(conversation?.messages || [])].filter((item) => !item.isStreaming);
    const latestMessage = canonicalMessages.at(-1);

    if (!latestMessage || latestMessage.sender !== "character") {
      setSendError("Rewrite last reply works after the character has answered.");
      return;
    }

    const targetId = latestMessage.id;
    try {
      setActionLoading(true);
      setSendError("");
      setDirectorNoteOpen(false);
      setDirectorNote("");
      if (conversation?.conversationId) {
        localStorage.removeItem(`velvet_director_note_${conversation.conversationId}`);
      }
      setIsTyping(true);

      // Important: this is a regeneration of the same character message, not a
      // new turn. The previous response is replaced immediately in-place.
      await regenerateCharacterReply(character.id, targetId, instruction, []);
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Scene Director regeneration failed:", error);
      await reloadConversationMessages(character.id).catch(() => {});
      setSendError(translateMessageError(error.message));
    } finally {
      setActionLoading(false);
      setIsTyping(false);
    }
  }

  function exportCurrentStory() {
    const format = settings.exportFormat || "markdown";
    const title = conversation?.title || `${character.name} story`;
    const cleanMessages = visibleMessages.filter((item) => !item.isStreaming);
    let content = "";
    let mime = "text/plain;charset=utf-8";
    let extension = "txt";
    if (format === "json") {
      content = JSON.stringify({
        velvetVersion: "2.0.0",
        title,
        character: { name: character.name, role: character.role },
        exportedAt: new Date().toISOString(),
        branch: { parentId: conversation?.branchParentId || null, fromMessageId: conversation?.branchFromMessageId || null },
        messages: cleanMessages.map((item) => ({ sender: item.sender, content: item.content, createdAt: item.createdAt, editedAt: item.editedAt || null })),
      }, null, 2);
      mime = "application/json;charset=utf-8";
      extension = "json";
    } else if (format === "markdown") {
      content = [`# ${title}`, "", `**Character:** ${character.name}${character.role ? ` · ${character.role}` : ""}`, `**Exported:** ${new Date().toLocaleString()}`, "", "---", ""]
        .concat(cleanMessages.flatMap((item) => [`### ${item.sender === "user" ? "You" : character.name}`, "", item.content, ""])).join("\n");
      mime = "text/markdown;charset=utf-8";
      extension = "md";
    } else {
      content = cleanMessages.map((item) => `${item.sender === "user" ? "You" : character.name}:\n${item.content}`).join("\n\n");
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(title)}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  }

  const chatHeroImage = character.coverUrl || character.imageUrl;

  return (
    <section
      className={`chat${readingMode ? " chat--reading" : ""}${compactMobileChat ? " chat--compact-mobile" : ""}`}
      data-reading-width={settings.readingWidth || "comfortable"}
      data-reading-font={settings.readingFont || "clean"}
    >
      <header
        className={`chat__header${chatHeroImage ? " chat__header--cover" : ""}`}
        style={chatHeroImage ? { "--chat-hero-image": `url(${JSON.stringify(chatHeroImage)})` } : undefined}
      >
        <button className="chat__icon-button chat__back-button" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <button className="chat__avatar chat__character-avatar-button" style={{ "--character-color": character.color }} onClick={() => setCharacterProfileOpen(true)} aria-label={`View ${character.name}'s profile`}>
          {character.imageUrl ? <img src={character.imageUrl} alt="" /> : character.initials}
        </button>
        <div className="chat__identity">
          <span className="chat__eyebrow">STORY WITH {character.name.toUpperCase()}</span>
          <label className="chat__conversation-picker chat__conversation-picker--title">
            <select value={conversation?.conversationId || activeConversationId} onChange={(event) => switchConversation(event.target.value)} disabled={busy || conversationLoading} aria-label="Current story">
              {conversationList.map((item) => <option key={item.id} value={item.id}>{item.is_pinned ? "★ " : ""}{item.title || character.name}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
          <button className="chat__character-name-button chat__character-name-button--subtle" onClick={() => setCharacterProfileOpen(true)} aria-label={`View ${character.name}'s profile`}>
            <span>{character.role || "Character profile"}</span>
          </button>
          {conversation?.branchParentId && <span className="chat__branch-badge"><GitBranch size={12}/>Branch</span>}
        </div>
        <button
          className={`chat__icon-button chat__reading-button${readingMode ? " is-active" : ""}`}
          onClick={() => setReadingMode((current) => !current)}
          aria-label={readingMode ? "Exit immersive mode" : "Enter immersive mode"}
          title={readingMode ? "Exit immersive mode" : "Immersive mode"}
        >
          <Eye size={18} />
        </button>
        <button
          className="chat__icon-button chat__memory-book-button"
          onClick={() => setMemoryBookOpen(true)}
          aria-label={`Open ${character.name}'s memory book`}
          disabled={!conversationReady}
        >
          <BookOpen size={19} />
          {memoryBookCount > 0 && <span>{memoryBookCount > 99 ? "99+" : memoryBookCount}</span>}
        </button>
        <button
          className="chat__icon-button chat__relationship-header"
          onClick={() => { setRelationshipOpen(true); refreshStoryMetadata(character.id).catch(() => {}); }}
          aria-label="Open relationship engine"
          title="Relationship"
        >
          <HeartHandshake size={18} />
        </button>
        <button
          className="chat__icon-button chat__more"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Conversation options"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={20} />
        </button>

        {menuOpen && typeof document !== "undefined" && createPortal((
          <div className="chat__menu-backdrop" onClick={(event) => event.target === event.currentTarget && setMenuOpen(false)}>
            <section className="chat__menu" role="dialog" aria-modal="true" aria-label="Story options" onClick={(event) => event.stopPropagation()}>
              <header className="chat__menu-sheet-header"><div><small>STORY OPTIONS</small><strong>{conversation?.title || character.name}</strong></div><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close story options"><X size={19}/></button></header>
              <button className="chat__menu-new" onClick={handleNewConversation} disabled={busy || creatingConversation}>
                {creatingConversation ? <LoaderCircle className="spin" size={17} /> : <SquarePen size={17} />}
                New conversation
              </button>
              <div className="chat__menu-quick">
                <button type="button" onClick={() => { setMenuOpen(false); setMemoryBookOpen(true); }} disabled={!conversationReady}><Brain size={17}/><span>Memory Book<small>Current story</small></span></button>
                <button type="button" onClick={() => { setMenuOpen(false); setRelationshipOpen(true); refreshStoryMetadata(character.id).catch(() => {}); }} disabled={!conversationReady}><HeartHandshake size={17}/><span>Relationship<small>Story pulse</small></span></button>
                <button type="button" onClick={() => { setMenuOpen(false); onOpenDiagnostics?.(); }}><Activity size={17}/><span>AI Status<small>Velvet Doctor</small></span></button>
              </div>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); onOpenMemories?.(); }}><Brain size={17} /> Memories 2.5</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setControlsOpen(true); }} disabled={!conversationReady}><SlidersHorizontal size={17} /> Story settings</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setReadingMode((current) => !current); }}><Eye size={17} /> {readingMode ? "Exit immersive mode" : "Immersive mode"}</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); openDirector("next"); }} disabled={!conversationReady || busy}><Sparkles size={17} /> Guide the next beat</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setStoryHubOpen(true); refreshStoryMetadata(character.id).catch(() => {}); }} disabled={!conversationReady}><BookOpen size={17} /> Story Hub</button>
              <button className="chat__menu-controls" onClick={exportCurrentStory} disabled={!conversationReady || !visibleMessages.length}><Download size={17} /> Export this story</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setTimelineOpen(true); handleRefreshTimeline(); }} disabled={!conversationReady}><Clock3 size={17} /> Story timeline</button>
              <button className="chat__menu-danger" onClick={handleDeleteConversation} disabled={deleting}><Trash2 size={17} /> {deleting ? "Deleting..." : "Delete conversation"}</button>
            </section>
          </div>
        ), document.body)}
      </header>

      {typeof document !== "undefined" && createPortal((
        <button type="button" className="chat__mobile-exit" onClick={onBack} aria-label="Leave chat"><ArrowLeft size={20}/></button>
      ), document.body)}

      <div onClick={handleReadingSurfaceClick} className={`chat__content${activeSceneImage ? " chat__content--wallpaper" : ""}`} style={activeSceneImage ? { backgroundImage: `linear-gradient(rgba(15,10,13,${Math.max(0, Math.min(90, backgroundDim)) / 100}), rgba(15,10,13,${Math.max(0, Math.min(90, backgroundDim)) / 100})), url(${JSON.stringify(activeSceneImage)})`, "--chat-wallpaper-blur": `${backgroundBlur}px` } : undefined}>

        {visibleMessages.length === 0 && <div className={`chat__introduction${character.coverUrl ? " chat__introduction--covered" : ""}`} style={{ "--character-color": character.color }}>
          {character.coverUrl && <div className="chat__profile-cover"><img src={character.coverUrl} alt="" /></div>}
          <div className="chat__large-avatar">
            {character.imageUrl ? <img src={character.imageUrl} alt="" /> : <span>{character.initials}</span>}
          </div>
          <h1>{character.name}</h1>
          <p>{character.description || character.role}</p>
          <span className="chat__relationship">
            {character.relationship || "Your story begins here"}
          </span>
          {conversation?.memoryUsage?.count > 0 && (
            <span className="chat__memory-usage"><Brain size={13} />Using {conversation.memoryUsage.count} memories{conversation.memoryUsage.pinned ? ` · ${conversation.memoryUsage.pinned} pinned` : ""}</span>
          )}
                </div>}

        {conversationLoading && (
          <div className="chat__status">
            <LoaderCircle className="chat__status-spinner" size={25} />
            <h2>Opening your story</h2>
            <p>Preparing your private conversation...</p>
          </div>
        )}

        {!conversationLoading && conversation?.error && !conversationReady && (
          <div className="chat__status chat__status--error">
            <AlertCircle size={27} />
            <h2>We couldn't open this story</h2>
            <p>{conversation.error}</p>
            <button onClick={() => startConversation(character)}>
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        )}

        {!conversationLoading && conversationReady && (
          <div ref={messagesMeasureRef} className="chat__messages" aria-live="polite">
            {conversation?.hasMoreMessages && (
              <button className="chat__load-earlier" onClick={handleLoadEarlierMessages} disabled={conversation.loadingEarlierMessages}>
                {conversation.loadingEarlierMessages ? <LoaderCircle className="spin" size={16}/> : <ChevronDown size={16}/>} 
                {conversation.loadingEarlierMessages ? "Loading earlier messages..." : "Load earlier messages"}
              </button>
            )}

            {visibleMessages.map((chatMessage, index) => (
              <Fragment key={chatMessage.id}>
                {sceneMarkers.get(String(chatMessage.id)) && (
                  <div className="chat__scene-divider"><span>{sceneMarkers.get(String(chatMessage.id)).separator_label || sceneMarkers.get(String(chatMessage.id)).time_label || sceneMarkers.get(String(chatMessage.id)).location || "Scene change"}</span></div>
                )}
                {shouldShowDateDivider(visibleMessages, index) && (
                  <div className="chat__date-divider"><span>{formatMessageDate(chatMessage.createdAt)}</span></div>
                )}
                <MessageBubble
                  message={chatMessage}
                  character={character}
                  onOpenActions={openActions}
                  onOpenFeedback={openMessageFeedback}
                  onVersionNavigate={navigateResponseVersion}
                  versionState={responseVersions[chatMessage.id]}
                  versionNavigationEnabled={index === visibleMessages.length - 1 && chatMessage.sender === "character"}
                  swipeDisabled={busy}
                  showTimestamp={settings.showMessageTimestamps}
                  feedbackValue={messageFeedback[chatMessage.id] || ""}
                />
              </Fragment>
            ))}

            {(isTyping || generationState === "generating") && !characterStreaming && (
              <article className="chat-message chat-message--character">
                <span className="chat-message__avatar" style={{ "--character-color": character.color }}>
                  {character.imageUrl ? <img src={character.imageUrl} alt="" /> : character.initials}
                </span>
                <div className="typing-indicator"><small>{character.name} is writing</small><span /><span /><span /></div>
              </article>
            )}

            {sendError && (
              <div className="chat__send-error"><AlertCircle size={16} /><span>{sendError}</span><button onClick={retryGeneration} disabled={busy}><RefreshCw size={14} />Retry</button></div>
            )}
            {feedbackNotice && (
              <div className="chat__feedback-notice" role="status">
                <Check size={15}/>
                <span>{feedbackNotice.kind === "positive" ? "Saved what worked. Velvet learns it after the second matching choice." : "Saved what to avoid. Velvet learns it after the second matching choice."}</span>
                <button type="button" onClick={undoLatestFeedback}>Undo</button>
                <button type="button" onClick={()=>setFeedbackNotice(null)} aria-label="Dismiss feedback notice"><X size={13}/></button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showJumpToBottom && (
        <button className="chat__jump-bottom" onClick={jumpToBottom} aria-label="Jump to latest message" title="Jump to latest message">
          <ChevronDown size={20}/>
        </button>
      )}

      {silentCue && <div className="chat__silent-cue" role="status"><Sparkles size={13}/><span>{silentCue}</span></div>}

      <form className={`chat__composer${replyTo ? " chat__composer--replying" : ""}`} onSubmit={handleSubmit}>
        {replyTo && (
          <div className="chat__reply-draft">
            <Reply size={15} />
            <div><small>Replying to {replyTo.sender === "user" ? "your message" : character.name}</small><span>{replyTo.content}</span></div>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={16} /></button>
          </div>
        )}
                <input ref={sceneImageInputRef} className="chat__scene-file-input" type="file" accept="image/*" multiple onChange={handleSceneImages} />
        {directorNote.trim() && !directorNoteOpen && (
          <div className="chat__director-active" role="status" title={directorNote}>
            <Sparkles size={12}/><span>Next beat: {directorNote}</span>
            <button type="button" onClick={clearQueuedDirector} aria-label="Clear queued direction"><X size={12}/></button>
          </div>
        )}
        <button type="button" className={`chat__director-trigger${directorNoteOpen ? " is-active" : ""}`} onClick={()=>directorNoteOpen ? setDirectorNoteOpen(false) : openDirector("next")} aria-label="Guide next reply" title="Guide next reply"><Sparkles size={16}/></button>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => { setMessage(event.target.value); setSendError(""); }}
          onPointerDown={handleComposerPointerDown}
          onFocus={handleComposerFocus}
          onBlur={handleComposerBlur}
          onInput={resizeComposer}
          onKeyDown={handleKeyDown}
          placeholder={conversationReady ? "Write a message..." : "Opening..."}
          rows="1"
          disabled={!conversationReady}
        />
        {busy ? (
          <button
            type="button"
            className="chat__send-button chat__stop-button"
            onPointerDown={(event) => {
              event.preventDefault();
              handleStop();
            }}
            aria-label="Stop generating"
            title="Stop generating"
          >
            <Square size={15} />
          </button>
        ) : (
          <button
            type="submit"
            className="chat__send-button"
            disabled={!conversationReady}
            aria-label={message.trim() ? "Send message" : "Continue scene"}
            title={message.trim() ? "Send message" : "Continue scene silently"}
          >
            {message.trim() ? <Send size={18} /> : <Sparkles size={18} />}
          </button>
        )}
      </form>

      {directorNoteOpen && typeof document !== "undefined" && createPortal((
        <div className="director-sheet-backdrop" onClick={(event) => event.target === event.currentTarget && setDirectorNoteOpen(false)}>
          <section className="director-sheet" role="dialog" aria-modal="true" aria-label="Scene Director">
            <div className="director-sheet__grab" />
            <header><div><span><Sparkles size={15}/> SCENE DIRECTOR</span><h2>Guide the story</h2><p>Write one direction, then choose whether it belongs to the next beat or should replace the latest reply.</p></div><button type="button" onClick={()=>setDirectorNoteOpen(false)} aria-label="Close Scene Director"><X size={19}/></button></header>
            <div className="director-sheet__presets">
              <button type="button" onClick={()=>applyDirectorPreset("Use more natural audible dialogue and less descriptive filler in the next beat.")}><MessageSquareQuote size={17}/><span>More dialogue<small>Less filler</small></span></button>
              <button type="button" onClick={()=>applyDirectorPreset("Increase believable tension through choices and subtext, without forcing a confession or melodrama.")}><Sparkles size={17}/><span>More tension<small>Keep it believable</small></span></button>
              <button type="button" onClick={()=>applyDirectorPreset("Move the scene forward naturally to the next meaningful beat or location. Preserve continuity.")}><ChevronRight size={17}/><span>Move scene<small>Advance naturally</small></span></button>
              <button type="button" onClick={()=>applyDirectorPreset("Bring in one plausible established side character if it fits the current situation. Do not derail the main scene.")}><UserRound size={17}/><span>Bring someone in<small>Established NPC</small></span></button>
              <button type="button" onClick={()=>applyDirectorPreset(`Follow ${character.name}'s point of view/presence for the next beat without controlling my character.`)}><Eye size={17}/><span>Follow {character.name}<small>Shift the camera</small></span></button>
              <button type="button" onClick={()=>applyDirectorPreset("Surprise me with a plausible next beat that fits canon and this character's independent life.")}><GitBranch size={17}/><span>Surprise me<small>Canon-safe twist</small></span></button>
            </div>
            <label className="director-sheet__custom"><span>What should Velvet do?</span><textarea value={directorNote} onChange={(event)=>setDirectorNote(event.target.value)} maxLength={500} rows={3} placeholder="e.g. Two hours later he texts me… or: Make him stay instead of leaving…"/><small>{directorNote.length}/500</small></label>
            <footer className="director-sheet__dual-footer">
              <button type="button" className="secondary director-sheet__clear" onClick={()=>{clearQueuedDirector();setDirectorNoteOpen(false);}}>Clear</button>
              <div className="director-sheet__dual-actions">
                <button type="button" className="director-sheet__next-action" onClick={queueDirectorForNextBeat} disabled={!directorNote.trim() || busy || actionLoading}><Check size={17}/><span>Next beat<small>Save for the next reply</small></span></button>
                <button type="button" className="director-sheet__rewrite-action" onClick={applyDirectorAndRegenerate} disabled={!directorNote.trim() || busy || actionLoading}>{actionLoading ? <LoaderCircle className="spin" size={17}/> : <RefreshCw size={17}/>}<span>Rewrite last reply<small>Replace the current answer</small></span></button>
              </div>
            </footer>
          </section>
        </div>
      ), document.body)}

      <MemoryBookDrawer
        open={memoryBookOpen}
        onClose={() => setMemoryBookOpen(false)}
        character={character}
        conversationId={conversation?.conversationId}
        onCountChange={setMemoryBookCount}
      />

      <StoryTimelineDrawer
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        conversation={conversation}
        onRefresh={handleRefreshTimeline}
        refreshing={refreshingTimeline}
      />

      <StoryHubDrawer
        open={storyHubOpen}
        onClose={() => setStoryHubOpen(false)}
        character={character}
        onJumpToMessage={jumpToStoryMessage}
        onOpenConversation={openStoryConversation}
      />

      <RelationshipDrawer
        open={relationshipOpen}
        onClose={() => setRelationshipOpen(false)}
        character={character}
        conversation={conversation}
      />

      {controlsOpen && (
        <div className="chat-controls-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !savingControls && setControlsOpen(false)}>
          <form className="chat-controls" onSubmit={saveControls}>
            <header><div><small>STORY SETTINGS</small><h2>Your story, your way</h2></div><button type="button" onClick={() => setControlsOpen(false)} disabled={savingControls}><X size={20} /></button></header>
            <div className="chat-controls__mode-tabs">
              <button type="button" className={controlsMode === "simple" ? "active" : ""} onClick={() => setControlsMode("simple")}>Simple</button>
              <button type="button" className={controlsMode === "advanced" ? "active" : ""} onClick={() => setControlsMode("advanced")}>Advanced</button>
            </div>

            {controlsMode === "simple" ? (
              <div className="chat-controls__simple">
                <section className="chat-controls__simple-section">
                  <span><Sparkles size={17}/><strong>Story vibe</strong></span>
                  <p>Pick a feeling. Velvet handles the sliders underneath.</p>
                  <div className="chat-controls__simple-chips">
                    <button type="button" className={simpleVibe === "natural" ? "active" : ""} onClick={() => applyStoryVibe("natural")} disabled={savingControls}>Natural</button>
                    <button type="button" className={simpleVibe === "romantic" ? "active" : ""} onClick={() => applyStoryVibe("romantic")} disabled={savingControls}>Romantic</button>
                    <button type="button" className={simpleVibe === "dramatic" ? "active" : ""} onClick={() => applyStoryVibe("dramatic")} disabled={savingControls}>Dramatic</button>
                    <button type="button" className={simpleVibe === "slowburn" ? "active" : ""} onClick={() => applyStoryVibe("slowburn")} disabled={savingControls}>Slow Burn</button>
                  </div>
                </section>
                <section className="chat-controls__simple-section">
                  <span><MessageSquareQuote size={17}/><strong>Response style</strong></span>
                  <div className="chat-controls__simple-chips">
                    <button type="button" className={simpleResponseStyle === "short" ? "active" : ""} onClick={() => applyResponseStyle("short")} disabled={savingControls}>Short</button>
                    <button type="button" className={simpleResponseStyle === "balanced" ? "active" : ""} onClick={() => applyResponseStyle("balanced")} disabled={savingControls}>Balanced</button>
                    <button type="button" className={simpleResponseStyle === "detailed" ? "active" : ""} onClick={() => applyResponseStyle("detailed")} disabled={savingControls}>Detailed</button>
                  </div>
                </section>
                <section className="chat-controls__simple-section">
                  <span><Clock3 size={17}/><strong>Story pace</strong></span>
                  <p>Controls rhythm, not how many words Velvet is forced to write.</p>
                  <div className="chat-controls__simple-chips">
                    {["quick", "natural", "cinematic"].map((pace) => <button key={pace} type="button" className={(controlDraft.pacingMode || "natural") === pace ? "active" : ""} onClick={async () => { setControlDraft((current) => ({ ...current, pacingMode: pace })); try { setSavingControls(true); await updateConversationSettings(character.id, { pacingMode: pace }); } catch (error) { setSendError(error.message); } finally { setSavingControls(false); } }}>{pace === "quick" ? "Quick" : pace === "cinematic" ? "Cinematic" : "Natural"}</button>)}
                  </div>
                </section>
                <button type="button" className="chat-controls__simple-section chat-controls__simple-action" onClick={() => { setControlsOpen(false); setMemoryBookOpen(true); }}>
                  <span><Brain size={17}/><strong>Memory</strong><BookOpen size={16}/></span>
                  <p>{conversation?.memoryUsage?.count ? `Using ${conversation.memoryUsage.count} relevant memories. Tap to review or add one.` : "Velvet remembers key moments automatically. Tap to review or add one."}</p>
                </button>
                <section className="chat-controls__simple-section">
                  <span><ImagePlus size={17}/><strong>Chat background</strong></span>
                  <p>These photos are only the wallpaper for this chat. They are never sent to the character.</p>
                  <div className="chat-controls__backgrounds">
                    <button type="button" className={!activeSceneImage ? "active" : ""} onClick={() => setActiveSceneImageIndex(-1)}>None</button>
                    {sceneImages.map((src, index) => (
                      <button key={index} type="button" className={activeSceneImageIndex === index ? "active" : ""} onClick={() => setActiveSceneImageIndex(index)} aria-label={`Use background ${index + 1}`}>
                        <img src={src} alt="" />
                      </button>
                    ))}
                    {sceneImages.length < 6 && <button type="button" className="chat-controls__background-add" onClick={() => sceneImageInputRef.current?.click()}><ImagePlus size={18}/><span>Add</span></button>}
                  </div>
                  {activeSceneImage && <button type="button" className="chat-controls__background-remove" onClick={() => removeSceneImage(activeSceneImageIndex)}>Remove selected background</button>}
                  {activeSceneImage && <div className="chat-controls__background-tuning">
                    <label><span>Dim</span><input type="range" min="0" max="85" value={backgroundDim} onChange={(event) => setBackgroundDim(Number(event.target.value))} /></label>
                    <label><span>Blur</span><input type="range" min="0" max="12" value={backgroundBlur} onChange={(event) => setBackgroundBlur(Number(event.target.value))} /></label>
                    {sceneImages.length > 1 && <label className="chat-controls__background-toggle"><input type="checkbox" checked={backgroundSlideshow} onChange={(event) => setBackgroundSlideshow(event.target.checked)} /><span>Slow slideshow</span></label>}
                  </div>}
                </section>
                <section className="chat-controls__simple-section">
                  <span><Eye size={17}/><strong>Theme</strong></span>
                  <div className="chat-controls__theme-options">
                    <button type="button" className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><Sun size={17}/>Light</button>
                    <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}><Moon size={17}/>Dark</button>
                    <button type="button" className={theme === "comfort" ? "active" : ""} onClick={() => setTheme("comfort")}><Eye size={17}/>Comfort</button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="chat-controls__advanced-panel">
                <label>Conversation name<input value={controlDraft.title} maxLength={80} onChange={(event) => setControlDraft((current) => ({ ...current, title: event.target.value }))} /></label>
                <label>Your identity in this story<select value={controlDraft.personaId} onChange={(event) => setControlDraft((current) => ({ ...current, personaId: event.target.value }))}><option value="">Account identity</option>{personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.isDefault ? "★ " : ""}{persona.name}{persona.role ? ` · ${persona.role}` : ""}</option>)}</select></label>
                <label>World & lorebook<select value={controlDraft.lorebookId} onChange={(event) => setControlDraft((current) => ({ ...current, lorebookId: event.target.value }))}><option value="">No linked world</option>{lorebooks.map((book) => <option key={book.id} value={book.id}>{book.name}{book.genre ? ` · ${book.genre}` : ""}</option>)}</select></label>
                <div className="chat-controls__row">
                  <label>Response length<select value={controlDraft.responseLengthOverride} onChange={(event) => setControlDraft((current) => ({ ...current, responseLengthOverride: event.target.value }))}><option value="">Character default</option><option value="short">Short</option><option value="balanced">Balanced</option><option value="long">Long and detailed</option></select></label>
                  <label>Narration style<select value={controlDraft.narrationStyleOverride} onChange={(event) => setControlDraft((current) => ({ ...current, narrationStyleOverride: event.target.value }))}><option value="">Character default</option><option value="dialogue">Mostly dialogue</option><option value="balanced">Balanced</option><option value="immersive">Immersive</option></select></label>
                </div>
                <label className="chat-controls__creativity"><span><strong>Creativity</strong><small>{creativityLabel(controlDraft.creativity)} · {Number(controlDraft.creativity).toFixed(2)}</small></span><input type="range" min="0.2" max="1.2" step="0.05" value={controlDraft.creativity} onChange={(event) => setControlDraft((current) => ({ ...current, creativity: Number(event.target.value) }))} /></label>
                <div className="chat-controls__presets"><button type="button" onClick={() => applyDynamicsPreset("grounded")}>Grounded</button><button type="button" onClick={() => applyDynamicsPreset("natural")}>Natural</button><button type="button" onClick={() => applyDynamicsPreset("cinematic")}>Cinematic</button><button type="button" onClick={() => applyDynamicsPreset("social")}>Social</button></div>
                <ControlSlider label="Romance" value={controlDraft.romanceIntensity} onChange={(value) => setControlDraft((current) => ({ ...current, romanceIntensity: value }))} low="Platonic" high="Romantic" />
                <ControlSlider label="Initiative" value={controlDraft.initiative} onChange={(value) => setControlDraft((current) => ({ ...current, initiative: value }))} low="Reactive" high="Proactive" />
                <ControlSlider label="Drama" value={controlDraft.drama} onChange={(value) => setControlDraft((current) => ({ ...current, drama: value }))} low="Grounded" high="Intense" />
                <ControlSlider label="Flirting" value={controlDraft.flirting} onChange={(value) => setControlDraft((current) => ({ ...current, flirting: value }))} low="None" high="Frequent" />
                <ControlSlider label="Humor" value={controlDraft.humor} onChange={(value) => setControlDraft((current) => ({ ...current, humor: value }))} low="Serious" high="Playful" />
                <ControlSlider label="Description" value={controlDraft.descriptionLevel} onChange={(value) => setControlDraft((current) => ({ ...current, descriptionLevel: value }))} low="Sparse" high="Rich" />
                <ControlSlider label="Independence" value={controlDraft.characterIndependence} onChange={(value) => setControlDraft((current) => ({ ...current, characterIndependence: value }))} low="User-led" high="Independent" />
                <ControlSlider label="Dialogue frequency" value={controlDraft.dialogueFrequency} onChange={(value) => setControlDraft((current) => ({ ...current, dialogueFrequency: value }))} low="Quiet" high="Talkative" />
                <div className="chat-controls__row chat-controls__camera-row">
                  <label>Narrative camera<select value={controlDraft.narrativeCamera} onChange={(event) => setControlDraft((current) => ({ ...current, narrativeCamera: event.target.value }))}><option value="user_focused">User-focused</option><option value="balanced">Balanced</option><option value="cinematic">Cinematic</option></select></label>
                  <label>Story pace<select value={controlDraft.pacingMode || "natural"} onChange={(event) => setControlDraft((current) => ({ ...current, pacingMode: event.target.value }))}><option value="quick">Quick</option><option value="natural">Natural</option><option value="cinematic">Cinematic</option></select></label>
                </div>
                <label>Private thoughts<select value={controlDraft.innerThoughts} onChange={(event) => setControlDraft((current) => ({ ...current, innerThoughts: event.target.value }))}><option value="none">None</option><option value="rare">Only when important</option><option value="literary">Literary</option><option value="frequent">Frequent</option></select></label>
                {conversation?.summary && <details className="chat-controls__advanced chat-controls__summary"><summary><BookOpen size={17}/>Story continuity summary</summary><p>{conversation.summary}</p></details>}
              </div>
            )}
            <footer>
              {controlsMode === "simple" ? (
                <button type="button" className="chat-controls__done" onClick={() => setControlsOpen(false)} disabled={savingControls}>{savingControls ? "Saving..." : "Done"}</button>
              ) : (
                <>
                  <button type="button" onClick={() => setControlsOpen(false)} disabled={savingControls}>Cancel</button>
                  <button type="submit" disabled={savingControls || !controlDraft.title.trim()}>{savingControls ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{savingControls ? "Saving..." : "Save & continue"}</button>
                </>
              )}
            </footer>
          </form>
        </div>
      )}

      {characterProfileOpen && (
        <div className="character-profile-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCharacterProfileOpen(false)}>
          <section className="character-profile-sheet" role="dialog" aria-modal="true" aria-labelledby="character-profile-title">
            <header className="character-profile-sheet__hero" style={{ "--character-color": character.color }}>
              {character.coverUrl && <img className="character-profile-sheet__cover" src={character.coverUrl} alt="" />}
              <div className="character-profile-sheet__shade" />
              <button className="character-profile-sheet__close" onClick={() => setCharacterProfileOpen(false)} aria-label="Close character profile"><X size={20}/></button>
              <span className="character-profile-sheet__avatar">
                {character.imageUrl ? <img src={character.imageUrl} alt="" /> : character.initials}
              </span>
              <div className="character-profile-sheet__title">
                <small>CHARACTER PROFILE</small>
                <h2 id="character-profile-title">{character.name}</h2>
                <p>{character.role || "Your character"}</p>
              </div>
            </header>

            <div className="character-profile-sheet__content">
              <ProfileSection icon={<BookOpen size={17}/>} title="About" content={character.description} fallback="No introduction has been added yet." />
              <ProfileSection icon={<UserRound size={17}/>} title="Personality" content={character.personality} />
              <ProfileSection icon={<Sparkles size={17}/>} title="Relationship" content={character.relationship} />
              <ProfileSection icon={<Globe2 size={17}/>} title="World & context" content={character.world} />
              <ProfileSection icon={<Sparkles size={17}/>} title="Values" content={character.values} />
              <ProfileSection icon={<AlertCircle size={17}/>} title="Fears" content={character.fears} />
              <ProfileSection icon={<RefreshCw size={17}/>} title="Habits & contradictions" content={[character.habits, character.contradictions].filter(Boolean).join("\n\n")} />
              <ProfileSection icon={<MessageSquareQuote size={17}/>} title="Voice" content={character.speechStyle} />
              {character.exampleDialogue && <ProfileSection icon={<MessageSquareQuote size={17}/>} title="Voice example" content={character.exampleDialogue} />}
              <ProfileSection icon={<BookOpen size={17}/>} title="Scenario" content={character.scenario} />
              <ProfileSection icon={<Square size={17}/>} title="Boundaries" content={character.boundaries} />

              <div className="character-profile-sheet__details">
                <span>{formatProfileValue(character.responseLength, "Balanced length")}</span>
                <span>{formatProfileValue(character.narrationStyle, "Balanced narration")}</span>
                {character.tags?.map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedMessage && typeof document !== "undefined" && createPortal((
        <div className="message-sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeActions()}>
          <section className="message-sheet" role="dialog" aria-modal="true">
            <header>
              <div>
                <small>{selectedMessage.sender === "user" ? "YOUR MESSAGE" : character.name.toUpperCase()}</small>
                <strong>{actionTitle(actionMode)}</strong>
              </div>
              <button onClick={closeActions} disabled={actionLoading}><X size={20} /></button>
            </header>

            {actionMode === "menu" && (
              <div className="message-sheet__refine-menu">
                {selectedMessage.sender === "character" ? (
                  <>
                    <p className="message-sheet__refine-note">
                      What went wrong? Velvet will use the reason now and learn it globally after you choose it twice.
                    </p>

                    <div className="message-sheet__refine-grid">
                      <button onClick={() => quickRefineSelected("ignored_idea")}>
                        <Sparkles size={18} />
                        <span>Ignored my idea</span>
                      </button>
                      <button onClick={() => quickRefineSelected("out_of_character")}>
                        <UserRound size={18} />
                        <span>Out of character</span>
                      </button>
                      <button onClick={() => quickRefineSelected("too_short")}>
                        <MessageSquareQuote size={18} />
                        <span>Too short</span>
                      </button>
                      <button onClick={() => quickRefineSelected("repetitive")}>
                        <RefreshCw size={18} />
                        <span>Repetitive</span>
                      </button>
                    </div>

                    <button
                      className="message-sheet__branch-feature"
                      onClick={() => runAction("rewind")}
                    >
                      <Rewind size={19} />
                      <span><strong>Rewind to here</strong><small>Keep this message and remove everything that came after it.</small></span>
                    </button>

                    <div className="message-sheet__refine-secondary">
                      <button onClick={() => {
                        const latest = [...(conversation?.messages || [])].filter((item) => !item.isStreaming).at(-1);
                        setActionDraft("");
                        setRegenerationFeedback([]);
                        setFeedbackOnly(latest?.id !== selectedMessage.id);
                        setActionMode("regenerate");
                      }}>
                        <Pencil size={16} />
                        <span>Different direction…</span>
                      </button>
                      <button onClick={() => runAction("reply")}><Reply size={16} /><span>Reply</span></button>
                      <button onClick={() => runAction("copy")}><Copy size={16} /><span>Copy</span></button>
                      <button onClick={() => setActionMode("more")}><MoreHorizontal size={16} /><span>More</span></button>
                    </div>
                  </>
                ) : (
                  <div className="message-sheet__user-menu">
                    <button className="message-sheet__branch-feature" onClick={() => runAction("rewind")}>
                      <Rewind size={19} />
                      <span><strong>Rewind to here</strong><small>Keep this message and remove everything that came after it.</small></span>
                    </button>
                    <div className="message-sheet__refine-secondary">
                      <button onClick={() => { setActionDraft(selectedMessage.content); setActionMode("edit"); }}><Pencil size={16}/><span>Edit</span></button>
                      <button onClick={() => runAction("reply")}><Reply size={16}/><span>Reply</span></button>
                      <button onClick={() => runAction("copy")}><Copy size={16}/><span>Copy</span></button>
                      <button onClick={() => setActionMode("more")}><MoreHorizontal size={16}/><span>More</span></button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {actionMode === "more" && (
              <div className="message-sheet__more">
                {selectedMessage.sender === "character" && (
                  <>
                    <button onClick={() => { setActionDraft(selectedMessage.content); setActionMode("edit-ai"); }}><Pencil size={17} /><span>Edit response</span></button>
                  </>
                )}
                <button onClick={() => runAction("memory")}><BookmarkPlus size={17} /><span>Save to memory</span></button>
                <button onClick={() => runAction("bookmark")}><BookmarkPlus size={17} /><span>{selectedMessage.isBookmarked ? "Remove bookmark" : "Bookmark"}</span></button>
                <button onClick={() => runAction("quote")}><MessageSquareQuote size={17} /><span>Quote</span></button>
                <button onClick={() => { setActionDraft(`${conversation?.title || character.name} · branch`); setActionMode("branch"); }}><GitBranch size={17} /><span>Branch from here</span></button>
                <button className="danger" onClick={() => runAction("delete")}><Trash2 size={17} /><span>Delete</span></button>
                <button className="message-sheet__back" onClick={() => setActionMode("menu")}><ArrowLeft size={17} /><span>Back</span></button>
              </div>
            )}

            {actionMode === "branch" && (
              <div className="message-sheet__editor">
                <p>Create a new timeline that keeps this message and everything before it. The original story stays untouched.</p>
                <input value={actionDraft} maxLength={80} onChange={(event) => setActionDraft(event.target.value)} placeholder="Branch name" autoFocus />
                <button onClick={createBranchFromSelected} disabled={actionLoading || !actionDraft.trim()}>
                  {actionLoading ? <LoaderCircle className="spin" size={17} /> : <GitBranch size={17} />}
                  Create branch
                </button>
              </div>
            )}

            {actionMode === "edit" && (
              <div className="message-sheet__editor">
                <p>Everything after this message will be regenerated.</p>
                <textarea value={actionDraft} onChange={(event) => setActionDraft(event.target.value)} rows="6" autoFocus />
                <button onClick={saveEditedMessage} disabled={!actionDraft.trim() || actionLoading}>
                  {actionLoading ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
                  Save and regenerate
                </button>
              </div>
            )}

            {actionMode === "edit-ai" && (
              <div className="message-sheet__editor">
                <p>Edit only what you want. Everything after this response will be removed so the story continues from your version.</p>
                <textarea value={actionDraft} onChange={(event) => setActionDraft(event.target.value)} rows="7" autoFocus />
                <button onClick={saveEditedAIResponse} disabled={!actionDraft.trim() || actionLoading}>
                  {actionLoading ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
                  Use this version
                </button>
              </div>
            )}

            {actionMode === "regenerate" && (
              <div className="message-sheet__editor">
                <p>{feedbackOnly ? "Tell Velvet what felt wrong. This older reply will stay in the story, but the preference can still be learned globally." : "Select everything that felt wrong, then add what should happen instead. The rejected response will not become canon."}</p>
                <div className="message-sheet__feedback-reasons" aria-label="Regeneration reasons">
                  {REGENERATION_FEEDBACK.map(([code, label]) => {
                    const selected = regenerationFeedback.includes(code);
                    return <button type="button" key={code} className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => setRegenerationFeedback((current) => selected ? current.filter((item) => item !== code) : [...current, code])}>
                      {selected && <Check size={13}/>} {label}
                    </button>;
                  })}
                </div>
                {!feedbackOnly && <textarea
                    value={actionDraft}
                    onChange={(event) => setActionDraft(event.target.value)}
                    placeholder="Optional direction, e.g. He feels the confession strongly but hides it behind a joke. Don't make him leave."
                    rows="4"
                    autoFocus
                  />}
                <button onClick={regenerate} disabled={actionLoading || (feedbackOnly && !regenerationFeedback.length)}>
                  {actionLoading ? <LoaderCircle className="spin" size={17} /> : feedbackOnly ? <Check size={17}/> : <RefreshCw size={17} />}
                  {feedbackOnly ? "Save feedback" : "Generate another response"}
                </button>
              </div>
            )}

            {actionMode === "positive-feedback" && (
              <div className="message-sheet__editor message-sheet__positive-feedback">
                <p>What should Velvet preserve in future replies? It learns the abstract quality—not this exact wording or scene.</p>
                <div className="message-sheet__feedback-reasons" aria-label="Positive feedback qualities">
                  {POSITIVE_FEEDBACK.map(([code, label]) => {
                    const selected = positiveFeedback.includes(code);
                    return <button type="button" key={code} className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => setPositiveFeedback((current) => selected ? current.filter((item) => item !== code) : [...current, code])}>
                      {selected && <Check size={13}/>} {label}
                    </button>;
                  })}
                  <button type="button" className={positiveFeedback.length === POSITIVE_FEEDBACK.length ? "selected" : ""} aria-pressed={positiveFeedback.length === POSITIVE_FEEDBACK.length} onClick={()=>setPositiveFeedback(positiveFeedback.length === POSITIVE_FEEDBACK.length ? [] : POSITIVE_FEEDBACK.map(([code])=>code))}>
                    {positiveFeedback.length === POSITIVE_FEEDBACK.length && <Check size={13}/>} Everything
                  </button>
                </div>
                <button onClick={savePositiveFeedback} disabled={!positiveFeedback.length}>
                  <ThumbsUp size={17}/>Save what worked
                </button>
              </div>
            )}

            {actionMode === "alternatives" && (
              <div className="message-sheet__alternatives">
                {alternatives.length === 0 ? (
                  <p>No previous alternatives yet. Regenerate this response to create one.</p>
                ) : alternatives.map((alternative, index) => (
                  <button key={alternative.id} onClick={() => chooseAlternative(alternative)}>
                    <small>{alternative.current ? "CURRENT" : `VERSION ${index + 1}`}</small>
                    <span>{alternative.content}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      ), document.body)}
    </section>
  );
}

function MessageBubble({
  message,
  character,
  onOpenActions,
  onOpenFeedback,
  onVersionNavigate,
  versionState,
  versionNavigationEnabled = false,
  swipeDisabled,
  showTimestamp,
  feedbackValue,
}) {
  // v1.8.1: guarded touch swipe. Vertical movement always wins and is never
  // prevented, so native one-finger scrolling remains owned by Android/iOS.
  // Only a deliberate, clearly-horizontal single-finger gesture changes versions.
  const SWIPE_TRIGGER_PX = 72;
  const SWIPE_DIRECTION_RATIO = 1.8;
  const SWIPE_MAX_VERTICAL_PX = 48;
  const swipeGestureRef = useRef(null);
  const suppressTapRef = useRef(false);
  const canSwipe =
    message.sender === "character" &&
    !message.isStreaming &&
    versionNavigationEnabled &&
    !swipeDisabled;

  function resetSwipeGesture() {
    swipeGestureRef.current = null;
  }

  function shouldIgnoreSwipeTarget(target) {
    return Boolean(target?.closest?.(
      "button, a, input, textarea, select, [role='button'], [contenteditable='true']"
    ));
  }

  function handleTouchStart(event) {
    if (!canSwipe || event.touches.length !== 1 || shouldIgnoreSwipeTarget(event.target)) {
      resetSwipeGesture();
      return;
    }

    const touch = event.touches[0];
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const edgeGuard = 28;

    // Leave the OS/browser back gesture alone at the extreme left/right edges.
    if (touch.clientX <= edgeGuard || (viewportWidth && touch.clientX >= viewportWidth - edgeGuard)) {
      resetSwipeGesture();
      return;
    }

    swipeGestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      axis: null,
    };
  }

  function handleTouchMove(event) {
    const gesture = swipeGestureRef.current;
    if (!gesture || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    gesture.lastX = touch.clientX;
    gesture.lastY = touch.clientY;

    if (!gesture.axis) {
      if (absX < 12 && absY < 12) return;

      // Vertical wins early. We intentionally never call preventDefault here.
      if (absY >= absX * 1.12) {
        gesture.axis = "vertical";
        return;
      }

      if (absX >= 18 && absX >= absY * 1.45) {
        gesture.axis = "horizontal";
      }
    }
  }

  function handleTouchEnd(event) {
    const gesture = swipeGestureRef.current;
    const finalTouch = event.changedTouches?.[0];
    if (gesture && finalTouch) {
      gesture.lastX = finalTouch.clientX;
      gesture.lastY = finalTouch.clientY;
    }
    resetSwipeGesture();

    if (!gesture || gesture.axis !== "horizontal" || !canSwipe) return;

    const dx = gesture.lastX - gesture.startX;
    const dy = gesture.lastY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const deliberateHorizontalSwipe =
      absX >= SWIPE_TRIGGER_PX &&
      absY <= SWIPE_MAX_VERTICAL_PX &&
      absX >= absY * SWIPE_DIRECTION_RATIO;

    if (!deliberateHorizontalSwipe) return;

    suppressTapRef.current = true;
    window.setTimeout(() => { suppressTapRef.current = false; }, 240);

    // Left = next/new response. Right = previous response.
    onVersionNavigate(message, dx < 0 ? 1 : -1);
  }

  function handleMessageTap(event) {
    if (suppressTapRef.current || message.isStreaming || swipeDisabled || shouldIgnoreSwipeTarget(event.target)) return;
    event.stopPropagation();
    onOpenActions(message);
  }

  if (isSilentContinuation(message)) {
    return null;
  }

  const versionItems = versionState?.items || [];
  const versionIndex = Number.isInteger(versionState?.index) ? versionState.index : 0;
  const versionCount = Math.max(1, versionItems.length || 1);
  const canGoPrevious = versionState?.loaded ? versionIndex > 0 : true;

  return (
    <article
      data-message-id={message.id}
      className={`chat-message chat-message--${message.sender}${message.isStreaming ? " chat-message--streaming" : ""}${message.isBookmarked ? " chat-message--bookmarked" : ""}${canSwipe ? " chat-message--swipeable" : ""}`}
      onTouchStart={canSwipe ? handleTouchStart : undefined}
      onTouchMove={canSwipe ? handleTouchMove : undefined}
      onTouchEnd={canSwipe ? handleTouchEnd : undefined}
      onTouchCancel={resetSwipeGesture}
      onClick={handleMessageTap}
      onContextMenu={(event) => { event.preventDefault(); onOpenActions(message); }}
    >
      <div className="chat-message__swipe-content">
        {message.sender === "character" && <span className="chat-message__avatar" style={{ "--character-color": character.color }}>
          {character.imageUrl ? <img src={character.imageUrl} alt="" /> : character.initials}
        </span>}
        <div className="chat-message__body">
          {message.replyPreview && (
            <div className="chat-message__reply">
              <small>{message.replySender === "user" ? "YOU" : character.name.toUpperCase()}</small>
              <span>{message.replyPreview}</span>
            </div>
          )}
          <p>
            <RoleplayText content={message.content} />
            {message.isStreaming && <span className="chat-message__cursor">▍</span>}
          </p>
          {!message.isStreaming && message.sender === "character" && (
            <div className="chat-message__feedback" onPointerDown={(event)=>event.stopPropagation()}>
              <button type="button" className={feedbackValue === "positive" ? "selected" : ""} aria-label="Like this response" aria-pressed={feedbackValue === "positive"} onClick={(event)=>{ event.stopPropagation(); onOpenFeedback(message, "positive"); }}><ThumbsUp size={14}/></button>
              <button type="button" className={feedbackValue === "negative" ? "selected" : ""} aria-label="Dislike this response" aria-pressed={feedbackValue === "negative"} onClick={(event)=>{ event.stopPropagation(); onOpenFeedback(message, "negative"); }}><ThumbsDown size={14}/></button>
            </div>
          )}
          {!message.isStreaming && message.sender === "character" && versionNavigationEnabled && (
            <div className="chat-message__version-nav" onPointerDown={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="chat-message__version-arrow"
                onClick={(event) => { event.stopPropagation(); onVersionNavigate(message, -1); }}
                aria-label="Previous response"
                disabled={swipeDisabled || versionState?.loading || (versionState?.loaded && !canGoPrevious)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="chat-message__version-count">{versionIndex + 1} / {versionCount}</span>
              <button
                type="button"
                className="chat-message__version-arrow"
                onClick={(event) => { event.stopPropagation(); onVersionNavigate(message, 1); }}
                aria-label={versionState?.loaded && versionIndex < versionCount - 1 ? "Next response" : "Generate another response"}
                disabled={swipeDisabled || versionState?.loading}
              >
                {versionState?.loading ? <LoaderCircle className="spin" size={14} /> : <ChevronRight size={16} />}
              </button>
              <button className="chat-message__actions chat-message__actions--inline" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpenActions(message); }} aria-label="Message options">
                <MoreHorizontal size={16} />
              </button>
            </div>
          )}
          {!message.isStreaming && (message.sender !== "character" || !versionNavigationEnabled) && (
            <button className="chat-message__actions" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpenActions(message); }} aria-label="Message options">
              <MoreHorizontal size={16} />
            </button>
          )}
          {message.editedAt && <small className="chat-message__edited">edited</small>}
          {showTimestamp && message.createdAt && <time className="chat-message__time">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}
        </div>
      </div>
    </article>
  );
}

function ProfileSection({ icon, title, content, fallback = "Not specified yet." }) {
  return (
    <section className="character-profile-section">
      <header>{icon}<h3>{title}</h3></header>
      <p>{content || fallback}</p>
    </section>
  );
}

function formatProfileValue(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isSilentContinuation(message) {
  const content = String(message?.content || "").trim();
  return message?.sender === "user" && (
    content === SILENT_CONTINUE_MESSAGE ||
    content === RETURN_MAIN_POV_MESSAGE ||
    content.startsWith("[SILENT_CONTINUE") ||
    content.startsWith("[RETURN_MAIN_POV") ||
    content.includes("Treat this as silence from the user")
  );
}

function shouldShowDateDivider(messages, index) {
  if (index === 0) return true;
  const currentDate = new Date(messages[index].createdAt);
  const previousDate = new Date(messages[index - 1].createdAt);
  return currentDate.toDateString() !== previousDate.toDateString();
}

function formatMessageDate(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "long", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function ControlSlider({ label, value, onChange, low, high }) {
  return (
    <label className="chat-controls__dynamics-slider">
      <span><strong>{label}</strong><small>{low} · {value}% · {high}</small></span>
      <input type="range" min="0" max="100" step="5" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}


async function compressSceneImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Not an image");
  const bitmap = await createImageBitmap(file);
  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.78);
}

function actionTitle(mode) {
  if (mode === "branch") return "Create timeline branch";
  if (mode === "edit") return "Edit message";
  if (mode === "edit-ai") return "Edit response";
  if (mode === "regenerate") return "Regenerate response";
  if (mode === "positive-feedback") return "What worked?";
  if (mode === "alternatives") return "Response alternatives";
  if (mode === "more") return "More actions";
  return "Message actions";
}

function translateMessageError(message = "") {
  const error = message.toLowerCase();
  if (error.includes("row-level security") || error.includes("permission")) return "Your account doesn't have permission for this action.";
  if (error.includes("authentication") || error.includes("invalid session") || error.includes("jwt")) return "Your session expired. Sign in again.";
  if (error.includes("quota") || error.includes("rate limit") || error.includes("rate-limited") || error.includes("resource_exhausted")) return "Gemini is rate-limited right now. It may be a per-minute, token, or daily project limit. Wait a little and try again.";
  if (error.includes("network") || error.includes("failed to fetch")) return "We couldn't connect to the AI service.";
  return message || "The character couldn't respond.";
}

function sanitizeFileName(value = "story") {
  return String(value || "story").trim().replace(/[\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").slice(0, 80) || "velvet-story";
}

function creativityLabel(value) {
  const number = Number(value);
  if (number < 0.55) return "Consistent";
  if (number < 0.9) return "Natural";
  return "Imaginative";
}

export default Chat;
