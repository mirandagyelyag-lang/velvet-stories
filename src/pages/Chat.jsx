import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  BookmarkPlus,
  Bug,
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
  Flame,
  ImagePlus,
  Eye,
  Moon,
  Sun,
  LoaderCircle,
  MessageSquareQuote,
  MapPin,
  MoreHorizontal,
  Music2,
  Pencil,
  Palette,
  RefreshCw,
  Reply,
  Rewind,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquarePen,
  Star,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  UsersRound,
  WifiOff,
  Volume2,
  WandSparkles,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import RoleplayText from "../components/RoleplayText";
import MemoryBookDrawer from "../components/MemoryBookDrawer";
import StoryTimelineDrawer from "../components/StoryTimelineDrawer";
import StorySafeStudioDrawer from "../components/StorySafeStudioDrawer";
import LivingWorldDrawer from "../components/LivingWorldDrawer";
import VelvetExperienceDrawer from "../components/VelvetExperienceDrawer";
import StoryHubDrawer from "../components/StoryHubDrawer";
import RelationshipDrawer from "../components/RelationshipDrawer";
import StoryWorldDrawer from "../components/StoryWorldDrawer";
import MessageQualitySheet from "../components/MessageQualitySheet";
import CanonDoctorSheet from "../components/CanonDoctorSheet";
import NpcCastDrawer from "../components/NpcCastDrawer";
import PanelErrorBoundary from "../components/PanelErrorBoundary";
import { useChats } from "../context/ChatsContext";
import { useCharacters } from "../context/CharactersContext";
import { usePersonas } from "../context/PersonasContext";
import { useLorebooks } from "../context/LorebooksContext";
import { useSettings } from "../context/SettingsContext";
import { useFeedback } from "../context/FeedbackContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { clearBugReportPrivateContext, formatBugReport, setBugReportPrivateContext } from "../utils/bugReporter";
import { buildLivingSceneHeader, continuityGuardLabel, continuityGuardTitle } from "../utils/livingScenes";
import { STORY_THEMES, readStoryTheme, saveStoryTheme } from "../utils/velvetResilience";
import { buildAdaptiveReplyHint, mergeDirectorHints } from "../utils/safeStoryUX";
import { buildLivingWorldDirectorHint, readLivingWorld } from "../utils/livingWorldSafe";
import { buildExperienceDirectorHint, readExperience } from "../utils/velvetExperience";
import { captureChatAnchor, mobileComposerMaxHeight, persistChatAnchor, readChatAnchor, restoreChatAnchor, shouldOpenMessageActionsOnTap } from "../utils/chatMobileV3499";
import { velvetHaptic } from "../native/velvetNative";
import "../styles/chat.css";
import "../styles/world-studio.css";
import "../styles/velvet-v33-story-dynamics.css";
import "../styles/velvet-v3230-safe-studio.css";
import "../styles/velvet-v3240-living-world.css";
import "../styles/velvet-v3241-stability.css";
import "../styles/velvet-v3250-experience.css";

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
  ["too_cold", "Too cold"],
  ["too_romantic", "Too romantic"],
  ["too_ai", "Too AI / scripted"],
  ["wrong_continuity", "Wrong continuity"],
];
const POSITIVE_FEEDBACK = [
  ["voice", "Character voice"],
  ["emotion", "Emotional depth"],
  ["dialogue", "Dialogue balance"],
  ["pacing", "Pacing"],
];

function displayStoryTitle(title) {
  const clean = String(title || "")
    .replace(/\s*[·•]\s*\d{1,2}[-/.][^·•]+$/iu, "")
    .trim();
  return clean || "Current story";
}

function Chat({ character, conversationId, focusMessageId = null, onConversationChange, onBack, onDeleted, onOpenMemories, onOpenDiagnostics, onOpenCharacter }) {
  const { settings, recordStoryFeedback, undoStoryFeedback } = useSettings();
  const { theme, setTheme } = useTheme();
  const { confirmAction, scheduleDeletion } = useFeedback();
  const { personas } = usePersonas();
  const { characters } = useCharacters();
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
    runCanonDoctor,
    updateConversationSettings,
    deleteConversation,
    deleteMessage,
    editMessageAndRemoveFollowing,
    editCharacterMessageInPlace,
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
    createStorySnapshot,
    restoreStorySnapshot,
    deleteStorySnapshot,
    dismissCatchUp,
    offlineQueueSize,
    flushOfflineQueue,
  } = useChats();

  const conversation = getConversation(character.id);

  const [message, setMessage] = useState("");
  const [replyAssistOpen, setReplyAssistOpen] = useState(false);
  const [replyAssistMode, setReplyAssistMode] = useState("ideas");
  const [replyAssistCustom, setReplyAssistCustom] = useState("");
  const [replyAssistOptions, setReplyAssistOptions] = useState([]);
  const [replyAssistLoading, setReplyAssistLoading] = useState(false);
  const [replyAssistError, setReplyAssistError] = useState("");
  const [replyAssistUnderstanding, setReplyAssistUnderstanding] = useState(null);
  const [storyPathsOpen, setStoryPathsOpen] = useState(false);
  const [storyPaths, setStoryPaths] = useState([]);
  const [storyPathsLoading, setStoryPathsLoading] = useState(false);
  const [storyPathsError, setStoryPathsError] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [directorNote, setDirectorNote] = useState("");
  const [directorNoteOpen, setDirectorNoteOpen] = useState(false);
  const [directorMode, setDirectorMode] = useState("next");
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [failedGeneration, setFailedGeneration] = useState(null);
  const [retryingGeneration, setRetryingGeneration] = useState(false);
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
  const [qualityMessage, setQualityMessage] = useState(null);
  const [replacementUndo, setReplacementUndo] = useState(null);
  const [rewindUndo, setRewindUndo] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [aiPhaseOverride, setAiPhaseOverride] = useState("");
  const [typingIndicatorVisible, setTypingIndicatorVisible] = useState(false);
  const [memoryCaptureNotice, setMemoryCaptureNotice] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [responseVersions, setResponseVersions] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(conversationId || "");
  const [conversationList, setConversationList] = useState([]);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [controlDraft, setControlDraft] = useState({ title: "", responseLengthOverride: "", narrationStyleOverride: "", creativity: 0.84, personaId: "", lorebookId: "", romanceIntensity: 35, initiative: 65, drama: 45, flirting: 30, humor: 45, descriptionLevel: 55, characterIndependence: 80, dialogueFrequency: 55, narrativeCamera: "balanced", innerThoughts: "rare", pacingMode: "natural", matureMode: false });
  const [savingControls, setSavingControls] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [unreadWhileReading, setUnreadWhileReading] = useState(0);
  const [chatResumeRevision, setChatResumeRevision] = useState(0);
  const [characterProfileOpen, setCharacterProfileOpen] = useState(false);
  const [controlsMode, setControlsMode] = useState("simple");
  const [sceneImages, setSceneImages] = useState([]);
  const [activeSceneImageIndex, setActiveSceneImageIndex] = useState(-1);
  const [simpleVibe, setSimpleVibe] = useState("balanced");
  const [simpleResponseStyle, setSimpleResponseStyle] = useState("balanced");
  const [memoryBookOpen, setMemoryBookOpen] = useState(false);
  const [readingMode, setReadingMode] = useState(() => localStorage.getItem("velvet_reading_mode") === "1");
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [relationshipCharacter, setRelationshipCharacter] = useState(character);
  const [groupPeekCharacter, setGroupPeekCharacter] = useState(null);
  const [storyTheme, setStoryTheme] = useState("velvet");
  const [draftSavedAt, setDraftSavedAt] = useState(0);
  const [worldStudioOpen, setWorldStudioOpen] = useState(false);
  const [silentCue, setSilentCue] = useState("");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [storyHubOpen, setStoryHubOpen] = useState(false);
  const [safeStudioOpen, setSafeStudioOpen] = useState(false);
  const [livingWorldOpen, setLivingWorldOpen] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [npcCastOpen, setNpcCastOpen] = useState(false);
  const [canonDoctorOpen, setCanonDoctorOpen] = useState(false);
  const [canonDoctorReport, setCanonDoctorReport] = useState(null);
  const [canonDoctorLoading, setCanonDoctorLoading] = useState(false);
  const [canonDoctorApplying, setCanonDoctorApplying] = useState(false);
  const [canonDoctorError, setCanonDoctorError] = useState("");
  const [canonDoctorApplied, setCanonDoctorApplied] = useState(false);
  const [experienceState, setExperienceState] = useState(() => readExperience(conversationId || character.id));
  const [characterTint, setCharacterTint] = useState(() => { try { return localStorage.getItem(`velvet_character_tint_${character.id}`) || "balanced"; } catch { return "balanced"; } });
  const [refreshingTimeline, setRefreshingTimeline] = useState(false);
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [backgroundDim, setBackgroundDim] = useState(42);
  const [backgroundSlideshow, setBackgroundSlideshow] = useState(false);
  const [compactMobileChat, setCompactMobileChat] = useState(false);
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const sceneImageInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesMeasureRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const stoppedRef = useRef(false);
  const generationRunRef = useRef(0);
  const failedGenerationRef = useRef(null);
  const retryInFlightRef = useRef(false);
  const variantGenerationLockRef = useRef(false);
  const versionOperationSeqRef = useRef(0);
  const returnMainPovAfterStopRef = useRef(false);
  const chatExitGuardUntilRef = useRef(0);
  const actionNoticeTimerRef = useRef(null);
  const aiPhaseTimerRef = useRef(null);
  const rewindUndoTimerRef = useRef(null);
  const loadingHistoryRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const preserveScrollOnKeyboardRef = useRef(null);
  const keyboardOpenRef = useRef(false);
  const previousConversationRef = useRef("");
  const previousVisibleMessageCountRef = useRef(0);
  const resumeReloadAtRef = useRef(0);
  const scrollAnchorRestoreRef = useRef("");
  const messages = getCharacterMessages(character.id);
  const visibleMessages = messages.filter((item) => !isSilentContinuation(item));
  const canonicalTurnMessages = messages.filter((item) => !item.isStreaming);
  const visibleCanonicalTurnMessages = visibleMessages.filter((item) => !item.isStreaming);
  const latestVisibleUserMessageIndex = visibleCanonicalTurnMessages.map((item) => item.sender).lastIndexOf("user");
  const latestVisibleCharacterMessageIndex = visibleCanonicalTurnMessages.map((item) => item.sender).lastIndexOf("character");
  const currentTurnHasCompletedReply = latestVisibleUserMessageIndex >= 0 && latestVisibleCharacterMessageIndex > latestVisibleUserMessageIndex;
  const failedTurnHasCompletedReply = (() => {
    if (!failedGeneration || failedGeneration.mode === "regenerate" || !failedGeneration.expectedUserMessageId) return false;
    const expectedIndex = canonicalTurnMessages.findIndex((item) => item.id === failedGeneration.expectedUserMessageId);
    return expectedIndex >= 0 && canonicalTurnMessages.slice(expectedIndex + 1).some((item) => item.sender === "character");
  })();
  const resolvedGenerationError = failedGeneration?.mode === "regenerate"
    ? false
    : (failedTurnHasCompletedReply || (!failedGeneration && currentTurnHasCompletedReply));
  const visibleSendError = sendError && isReplyGenerationErrorMessage(sendError) && resolvedGenerationError ? "" : sendError;

  useEffect(() => {
    const longChat = visibleMessages.length >= 250;
    document.documentElement.classList.toggle("velvet-long-chat", longChat);
    document.body.classList.toggle("velvet-long-chat", longChat);
    return () => {
      document.documentElement.classList.remove("velvet-long-chat");
      document.body.classList.remove("velvet-long-chat");
    };
  }, [visibleMessages.length]);

  useEffect(() => {
    if (!sendError || !isReplyGenerationErrorMessage(sendError)) return;
    if (resolvedGenerationError) clearGenerationFailure();
  }, [sendError, resolvedGenerationError]);
  const chatOverlayOpen = Boolean(
    menuOpen || directorNoteOpen || selectedMessage || controlsOpen || characterProfileOpen ||
    memoryBookOpen || relationshipOpen || npcCastOpen || groupPeekCharacter || worldStudioOpen || timelineOpen || storyHubOpen || safeStudioOpen || livingWorldOpen || experienceOpen || canonDoctorOpen || catchUpOpen || qualityMessage
  );

  useEffect(() => {
    const handler = (event) => {
      if (event?.detail?.characterId === character.id) setCharacterTint(event.detail.value || "balanced");
    };
    window.addEventListener("velvet:character-tint", handler);
    return () => window.removeEventListener("velvet:character-tint", handler);
  }, [character.id]);

  useEffect(() => {
    const id = conversation?.conversationId || activeConversationId || conversationId || character.id;
    setExperienceState(readExperience(id));
    const handler = (event) => {
      if (event?.detail?.conversationId && event.detail.conversationId !== id) return;
      if (event?.detail?.value) setExperienceState(event.detail.value);
    };
    window.addEventListener("velvet:experience", handler);
    return () => window.removeEventListener("velvet:experience", handler);
  }, [conversation?.conversationId, activeConversationId, conversationId, character.id]);

  function armChatExitGuard(duration = 700) {
    chatExitGuardUntilRef.current = Date.now() + duration;
  }

  function clearGenerationFailure() {
    failedGenerationRef.current = null;
    setFailedGeneration(null);
    setSendError("");
  }

  async function copyGenerationDebugReport() {
    try {
      const text = formatBugReport({ includePrivate: false, note: "Copied from the active chat menu." });
      await navigator.clipboard.writeText(text);
      setMenuOpen(false);
      showActionNotice("Debug report copied ✓", "neutral", 1600);
    } catch (error) {
      console.warn("Could not copy Velvet debug report:", error);
      showActionNotice("Couldn’t copy debug report", "neutral", 1800);
    }
  }

  function rememberGenerationFailure(error, context = {}) {
    const next = {
      mode: context.mode === "regenerate" ? "regenerate" : "reply",
      expectedUserMessageId: context.expectedUserMessageId || "",
      regenerateMessageId: context.regenerateMessageId || "",
      instruction: context.instruction || "",
      feedbackCodes: Array.isArray(context.feedbackCodes) ? [...context.feedbackCodes] : [],
      source: context.source || "generation",
      failedAt: Date.now(),
    };
    failedGenerationRef.current = next;
    setFailedGeneration(next);
    setSendError(translateMessageError(error?.message || String(error || "Generation failed")));
  }

  function closeChatOverlaysForBack() {
    armChatExitGuard();
    setMenuOpen(false);
    setDirectorNoteOpen(false);
    setControlsOpen(false);
    setCharacterProfileOpen(false);
    setMemoryBookOpen(false);
    setRelationshipOpen(false);
    setGroupPeekCharacter(null);
    setWorldStudioOpen(false);
    setTimelineOpen(false);
    setStoryHubOpen(false);
    setSafeStudioOpen(false);
    setLivingWorldOpen(false);
    setCatchUpOpen(false);
    if (selectedMessage) closeActionsAfterAction();
  }

  function handleChatBack(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (chatOverlayOpen) {
      closeChatOverlaysForBack();
      return;
    }
    if (Date.now() < chatExitGuardUntilRef.current) return;
    onBack?.();
  }

  // VELVET_CHAT_POLISH_V280
  // Tiny, deterministic feedback replaces silent button presses. These notices
  // never navigate and never compete with the composer for focus.
  function showActionNotice(text, tone = "success", duration = 1900) {
    if (actionNoticeTimerRef.current) window.clearTimeout(actionNoticeTimerRef.current);
    setActionNotice({ text, tone, id: Date.now() });
    actionNoticeTimerRef.current = window.setTimeout(() => {
      setActionNotice(null);
      actionNoticeTimerRef.current = null;
    }, duration);
  }

  function showAiPhase(label, duration = 850) {
    if (aiPhaseTimerRef.current) window.clearTimeout(aiPhaseTimerRef.current);
    setAiPhaseOverride(label);
    aiPhaseTimerRef.current = window.setTimeout(() => {
      setAiPhaseOverride("");
      aiPhaseTimerRef.current = null;
    }, duration);
  }

  async function clearRewindUndo({ removeSnapshot = true } = {}) {
    const current = rewindUndo;
    if (rewindUndoTimerRef.current) {
      window.clearTimeout(rewindUndoTimerRef.current);
      rewindUndoTimerRef.current = null;
    }
    setRewindUndo(null);
    if (removeSnapshot && current?.snapshotId) {
      try { await deleteStorySnapshot(current.snapshotId); }
      catch (error) { console.debug("Could not remove temporary rewind snapshot:", error); }
    }
  }

  function armRewindUndo(snapshotId) {
    if (!snapshotId) return;
    if (rewindUndoTimerRef.current) window.clearTimeout(rewindUndoTimerRef.current);
    setRewindUndo({ snapshotId, label: "Rewind" });
    rewindUndoTimerRef.current = window.setTimeout(() => {
      setRewindUndo(null);
      rewindUndoTimerRef.current = null;
      deleteStorySnapshot(snapshotId).catch((error) => console.debug("Temporary rewind snapshot cleanup skipped:", error));
    }, 10000);
  }

  async function undoRewind() {
    if (!rewindUndo?.snapshotId || busy) return;
    const snapshotId = rewindUndo.snapshotId;
    try {
      showActionNotice("Restoring story…", "working", 5000);
      await restoreStorySnapshot(character.id, snapshotId, { safetySnapshot: false });
      await clearRewindUndo({ removeSnapshot: true });
      showActionNotice("Rewind undone ✓");
      if (settings.haptics) navigator.vibrate?.(6);
    } catch (error) {
      setSendError(translateMessageError(error.message));
      showActionNotice("Couldn’t undo rewind", "error", 2600);
    }
  }
  useEffect(() => {
    setBugReportPrivateContext({
      character: character.name,
      excerpt: visibleMessages.slice(-4).map((item) => ({ sender: item.sender === "user" ? "you" : character.name, text: String(item.content || "").slice(0, 500) })),
    });
    return () => clearBugReportPrivateContext();
  }, [character.name, visibleMessages.length, visibleMessages.at(-1)?.id]);
  useEffect(() => () => {
    if (actionNoticeTimerRef.current) window.clearTimeout(actionNoticeTimerRef.current);
    if (aiPhaseTimerRef.current) window.clearTimeout(aiPhaseTimerRef.current);
    if (rewindUndoTimerRef.current) window.clearTimeout(rewindUndoTimerRef.current);
  }, []);

  useEffect(() => {
    if (!replacementUndo) return undefined;
    const timer = window.setTimeout(() => setReplacementUndo(null), 10000);
    return () => window.clearTimeout(timer);
  }, [replacementUndo?.messageId, replacementUndo?.content]);

  const conversationLoading = isConversationLoading(character.id);
  const characterStreaming = isCharacterStreaming(character.id);
  const generationState = getGenerationState(character.id);
  const characterGenerating = isCharacterGenerating(character.id);
  const conversationReady = Boolean(conversation?.conversationId);
  const groupCast = useMemo(() => {
    if (!conversation?.groupMode) return [character];
    const ids = conversation.groupCharacterIds || [];
    const resolved = ids.map((id) => characters.find((item) => item.id === id)).filter(Boolean);
    return resolved.length ? resolved : [character];
  }, [conversation?.groupMode, conversation?.groupCharacterIds, characters, character]);
  const conversationDisplayName = conversation?.groupMode
    ? (conversation.groupTitle || conversation.title || groupCast.map((item) => item.name).join(" · "))
    : character.name;
  const latestMessageContent = messages[messages.length - 1]?.content || "";

  useEffect(() => {
    if (!conversation?.conversationId || !conversation.catchUpAvailable || !conversation.storyRecap) return;
    const key = `velvet_catchup_${conversation.conversationId}`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
    } catch {}
    setCatchUpOpen(true);
  }, [conversation?.conversationId, conversation?.catchUpAvailable, conversation?.storyRecap]);

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
      const headerAllowance = 76;
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
  }, [conversationReady, visibleMessages.length, latestMessageContent]);

  // VELVET_TYPING_GLIMPSE_V2
  // Give immediate mobile feedback while the first token is on its way, then
  // hand the space to the real streamed reply. No blank “is it frozen?” gap.
  useEffect(() => {
    const eligible = (isTyping || generationState === "generating" || generationState === "writing") && !characterStreaming;
    if (!eligible) {
      setTypingIndicatorVisible(false);
      return undefined;
    }

    const showTimer = window.setTimeout(() => setTypingIndicatorVisible(true), 120);
    return () => {
      window.clearTimeout(showTimer);
      setTypingIndicatorVisible(false);
    };
  }, [isTyping, generationState, characterStreaming]);

  // VELVET_GENERATION_MANAGER_V1
  // Never lock sending merely because a stale temporary bubble exists.
  // The context generation manager is the authoritative busy state.
  const busy = sending || characterGenerating;
  // v3.49.3 SINGLE GENERATION SURFACE
  // Normal send/retry already has the typing indicator + streamed bubble. Do not
  // stack a second floating "Thinking/Writing" pill on top of that. Explicit
  // one-off phases remain available for non-generation tools only.
  const aiStatusLabel = actionNotice ? "" : aiPhaseOverride;
  const activeSceneImage = sceneImages[activeSceneImageIndex] || "";
  const sceneMarkers = useMemo(() => {
    const map = new Map();
    for (const item of conversation?.storyTimeline || []) {
      if (!item?.message_id || (!item.scene_changed && !item.separator_label)) continue;
      map.set(String(item.message_id), item);
    }
    return map;
  }, [conversation?.storyTimeline]);
  const livingSceneHeader = useMemo(
    () => buildLivingSceneHeader(conversation || {}, character.name),
    [conversation?.sceneState, conversation?.ambientMode, character.name]
  );
  const continuityLabel = continuityGuardLabel(conversation?.continuityGuard || {});

  useEffect(() => {
    localStorage.setItem("velvet_reading_mode", readingMode ? "1" : "0");
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
    const resolvedConversationId = conversation?.conversationId;
    if (!resolvedConversationId) return;
    setActiveConversationId(resolvedConversationId);
    onConversationChange?.(resolvedConversationId);
  }, [conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    setStoryTheme(readStoryTheme(id));
  }, [conversation?.conversationId]);

  useEffect(() => {
    const handleQueueEvent = (event) => {
      if (event?.detail?.characterId && event.detail.characterId !== character.id) return;
      if (event?.detail?.state === "queued") showActionNotice("Saved offline · sends automatically when you reconnect", "neutral", 3200);
      if (event?.detail?.state === "sent") showActionNotice("Queued message sent ✓", "success", 1800);
    };
    window.addEventListener("velvet:offline-queue", handleQueueEvent);
    return () => window.removeEventListener("velvet:offline-queue", handleQueueEvent);
  }, [character.id]);

  function applyStoryTheme(themeId) {
    setStoryTheme(themeId);
    saveStoryTheme(conversation?.conversationId, themeId);
    if (settings.haptics) navigator.vibrate?.(4);
  }

  function openRelationshipFor(target = character) {
    setRelationshipCharacter(target || character);
    setRelationshipOpen(true);
    refreshStoryMetadata(character.id).catch(() => {});
  }

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
    localStorage.setItem(`velvet_chat_seen_v2114_${id}`, new Date().toISOString());
  }, [conversation?.conversationId, messages.length]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    try {
      if (message) {
        localStorage.setItem(`velvet_draft_${id}`, message);
        setDraftSavedAt(Date.now());
      } else {
        localStorage.removeItem(`velvet_draft_${id}`);
        setDraftSavedAt(0);
      }
    } catch (error) {
      console.debug("Velvet draft storage unavailable:", error);
    }
  }, [message, conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    try {
      if (replyTo?.id) localStorage.setItem(`velvet_reply_draft_${id}`, JSON.stringify(replyTo));
      else localStorage.removeItem(`velvet_reply_draft_${id}`);
    } catch (error) {
      console.debug("Velvet reply draft storage unavailable:", error);
    }
  }, [replyTo, conversation?.conversationId]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return;
    try {
      if (directorNote.trim()) localStorage.setItem(`velvet_director_note_${id}`, directorNote);
      else localStorage.removeItem(`velvet_director_note_${id}`);
    } catch (error) {
      console.debug("Velvet director-note storage unavailable:", error);
    }
  }, [directorNote, conversation?.conversationId]);


  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id) return undefined;
    const persistCriticalDraft = () => {
      try {
        if (message) localStorage.setItem(`velvet_draft_${id}`, message);
        if (replyTo?.id) localStorage.setItem(`velvet_reply_draft_${id}`, JSON.stringify(replyTo));
        if (directorNote.trim()) localStorage.setItem(`velvet_director_note_${id}`, directorNote);
      } catch {}
    };
    window.addEventListener("pagehide", persistCriticalDraft);
    const onVisibility = () => { if (document.visibilityState === "hidden") persistCriticalDraft(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      persistCriticalDraft();
      window.removeEventListener("pagehide", persistCriticalDraft);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [conversation?.conversationId, message, replyTo, directorNote]);

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
      matureMode: Boolean(conversation.matureMode),
    });
    const romance = Number(conversation.romanceIntensity ?? 35);
    const flirting = Number(conversation.flirting ?? 30);
    const description = Number(conversation.descriptionLevel ?? 55);
    setSimpleVibe(conversation.storyPreset === "slow_burn" ? "slowburn" : (conversation.storyPreset || (romance >= 65 ? "romantic" : (flirting <= 25 && description >= 60 ? "slowburn" : "natural"))));
    setSimpleResponseStyle(conversation.responseLengthOverride === "short" ? "short" : (conversation.responseLengthOverride === "long" ? "detailed" : "balanced"));
  }, [conversation?.conversationId, conversation?.title, conversation?.responseLengthOverride, conversation?.narrationStyleOverride, conversation?.creativity, conversation?.personaId, conversation?.lorebookId, conversation?.romanceIntensity, conversation?.initiative, conversation?.drama, conversation?.flirting, conversation?.humor, conversation?.descriptionLevel, conversation?.characterIndependence, conversation?.dialogueFrequency, conversation?.narrativeCamera, conversation?.innerThoughts, conversation?.storyPreset, conversation?.pacingMode, conversation?.matureMode]);

  async function loadConversationList() {
    const { data, error } = await supabase.from("conversations")
      .select("id, title, updated_at, is_pinned").eq("character_id", character.id).is("archived_at", null).is("trashed_at", null)
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
    const owner = scrollContainerRef.current;
    if (!owner) return undefined;

    function trackScrollPosition() {
      // The chat owns its own scroll. Keyboard movement must never redefine
      // whether the reader intentionally left the newest messages.
      if (keyboardOpenRef.current) return;
      const distanceFromBottom = Math.max(0, owner.scrollHeight - owner.scrollTop - owner.clientHeight);
      stickToBottomRef.current = distanceFromBottom < 170;
      setShowJumpToBottom(distanceFromBottom > 360);
      if (distanceFromBottom < 170) setUnreadWhileReading(0);
    }

    trackScrollPosition();
    owner.addEventListener("scroll", trackScrollPosition, { passive: true });
    window.addEventListener("resize", trackScrollPosition);
    return () => {
      owner.removeEventListener("scroll", trackScrollPosition);
      window.removeEventListener("resize", trackScrollPosition);
    };
  }, []);

  useEffect(() => {
    const id = conversation?.conversationId;
    const owner = scrollContainerRef.current;
    if (!id || conversationLoading || !owner) return undefined;
    let frame = 0;

    // v3.49.9: restore the first visible message + pixel offset, not just a raw
    // scrollTop. This survives font/image/layout changes and full app restarts.
    if (scrollAnchorRestoreRef.current !== id) {
      scrollAnchorRestoreRef.current = id;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const restored = restoreChatAnchor(id, owner);
        if (restored) {
          stickToBottomRef.current = false;
          setShowJumpToBottom(true);
        }
      }));
    }

    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => persistChatAnchor(id, owner));
    };
    owner.addEventListener("scroll", save, { passive: true });
    return () => {
      save();
      cancelAnimationFrame(frame);
      owner.removeEventListener("scroll", save);
    };
  }, [conversation?.conversationId, conversationLoading, chatResumeRevision]);

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
          scrollContainerRef.current?.scrollTo({ top: savedTop, behavior: "auto" });
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

  useEffect(() => {
    const previous = previousVisibleMessageCountRef.current;
    const current = visibleMessages.length;
    previousVisibleMessageCountRef.current = current;
    if (!previous || current <= previous || stickToBottomRef.current) return;
    const added = visibleMessages.slice(previous);
    const characterAdds = added.filter((item) => item.sender === "character" && !item.isStreaming).length;
    if (characterAdds > 0) {
      setUnreadWhileReading((value) => Math.min(99, value + characterAdds));
      setShowJumpToBottom(true);
    }
  }, [visibleMessages.length]);

  useEffect(() => {
    const id = conversation?.conversationId;
    if (!id || !conversationReady) return undefined;
    let hiddenAt = 0;
    const persistNow = () => {
      if (scrollContainerRef.current) persistChatAnchor(id, scrollContainerRef.current);
    };
    const onPause = () => {
      hiddenAt = Date.now();
      persistNow();
    };
    const onResume = async () => {
      const now = Date.now();
      if (now - resumeReloadAtRef.current < 700) return;
      resumeReloadAtRef.current = now;
      const wasReading = !stickToBottomRef.current;
      const saved = wasReading ? captureChatAnchor(scrollContainerRef.current) : null;
      if (wasReading && scrollContainerRef.current) persistChatAnchor(id, scrollContainerRef.current);
      try { await reloadConversationMessages(character.id); } catch {}
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (wasReading && saved && scrollContainerRef.current) {
          const anchor = readChatAnchor(id) || saved;
          if (anchor?.mode === "reading") restoreChatAnchor(id, scrollContainerRef.current, { force: true });
        } else if (stickToBottomRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }
        setChatResumeRevision((value) => value + 1);
      }));
      hiddenAt = 0;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onPause();
      else if (!hiddenAt || Date.now() - hiddenAt > 700) void onResume();
    };
    window.addEventListener("velvet:app-pause", onPause);
    window.addEventListener("velvet:app-resume", onResume);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      persistNow();
      window.removeEventListener("velvet:app-pause", onPause);
      window.removeEventListener("velvet:app-resume", onResume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [conversation?.conversationId, conversationReady, character.id]);

  useEffect(() => {
    if (!focusMessageId || !conversationReady || conversationLoading) return;
    let cancelled = false;
    (async () => {
      try {
        await loadMessageIntoView(character.id, focusMessageId);
        if (cancelled) return;
        window.setTimeout(() => {
          const node = document.querySelector(`[data-message-id="${focusMessageId}"]`);
          node?.scrollIntoView({ behavior: "smooth", block: "center" });
          node?.classList.add("chat-message--flash");
          if (node) window.setTimeout(() => node.classList.remove("chat-message--flash"), 1400);
        }, 120);
      } catch (error) {
        console.debug("Could not focus searched message:", error);
      }
    })();
    return () => { cancelled = true; };
  }, [focusMessageId, conversationReady, conversationLoading, conversation?.conversationId]);

  async function handleLoadEarlierMessages() {
    if (loadingHistoryRef.current || conversation?.loadingEarlierMessages) return;

    const owner = scrollContainerRef.current;
    const previousHeight = owner?.scrollHeight || 0;
    const previousTop = owner?.scrollTop || 0;
    loadingHistoryRef.current = true;

    try {
      await loadEarlierMessages(character.id);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const currentOwner = scrollContainerRef.current;
          const addedHeight = Math.max(0, (currentOwner?.scrollHeight || previousHeight) - previousHeight);
          currentOwner?.scrollTo({ top: previousTop + addedHeight, behavior: "auto" });
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
    setUnreadWhileReading(0);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleComposerPointerDown() {
    // Capture position before the browser focuses the textarea. This runs
    // before the native keyboard has a chance to move the document.
    if (!stickToBottomRef.current) {
      preserveScrollOnKeyboardRef.current = scrollContainerRef.current?.scrollTop || 0;
    } else {
      preserveScrollOnKeyboardRef.current = null;
    }
  }

  function handleComposerFocus() {
    if (preserveScrollOnKeyboardRef.current === null || stickToBottomRef.current) return;
    const savedTop = preserveScrollOnKeyboardRef.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollContainerRef.current?.scrollTo({ top: savedTop, behavior: "auto" }));
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
    const maxHeight = mobileComposerMaxHeight(experienceState?.composer?.maxHeight || 170);
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }

  async function requestReplyAssist(mode = replyAssistMode) {
    if (!conversationReady || replyAssistLoading) return;
    setReplyAssistLoading(true);
    setReplyAssistError("");
    if (mode !== "more") setReplyAssistMode(mode);
    try {
      const recentMessages = visibleMessages.slice(-10).map((item) => ({
        speaker: item.sender === "user" ? "user" : character.name,
        text: String(item.content || "").slice(0,900),
      }));
      const { data, error } = await supabase.functions.invoke("reply-assist", {
        body: {
          character: { name: character.name, personality: character.personality, speechStyle: character.speechStyle, relationship: character.relationship, description: character.description },
          recentMessages,
          userDraft: message.trim(),
          intent: mode === "more" ? (replyAssistMode === "more" ? "ideas" : replyAssistMode) : mode,
          customIntent: mode === "custom" ? replyAssistCustom.trim() : "",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const nextOptions = Array.isArray(data?.options) ? data.options : [];
      setReplyAssistOptions((current) => mode === "more" ? [...current, ...nextOptions].filter((option, index, all) => {
        const text = String(option?.text || "").trim().toLowerCase();
        return text && all.findIndex((candidate) => String(candidate?.text || "").trim().toLowerCase() === text) === index;
      }) : nextOptions);
      setReplyAssistUnderstanding(data?.understanding || null);
    } catch (error) {
      // Supabase client errors such as “Edge Function returned a non-2xx status code”
      // are implementation details. Never leak them into the story UI.
      console.warn("[Velvet Reply Assist] request failed", error);
      setReplyAssistError("Velvet couldn't load reply ideas right now. Try again in a moment.");
    } finally { setReplyAssistLoading(false); }
  }

  function clearReplyAssist() {
    setReplyAssistOptions([]);
    setReplyAssistUnderstanding(null);
    setReplyAssistError("");
    setReplyAssistCustom("");
    setReplyAssistMode("ideas");
  }

  function applyReplyAssistOption(text) {
    setMessage(String(text || ""));
    clearReplyAssist();
    setReplyAssistOpen(false);
    window.requestAnimationFrame(() => { resizeComposer(); try { textareaRef.current?.focus({ preventScroll:true }); } catch { textareaRef.current?.focus(); } });
  }

  async function requestStoryPaths() {
    if (!conversationReady || storyPathsLoading) return;
    setStoryPathsLoading(true);
    setStoryPathsError("");
    try {
      const recentMessages = visibleMessages.slice(-12).map((item) => ({
        speaker: item.sender === "user" ? "user" : character.name,
        text: String(item.content || "").slice(0, 1000),
      }));
      const { data, error } = await supabase.functions.invoke("reply-assist", {
        body: {
          task: "story_paths",
          character: { name: character.name, personality: character.personality, speechStyle: character.speechStyle, relationship: character.relationship, description: character.description },
          recentMessages,
        },
      });
      if (error) throw error;
      const paths = Array.isArray(data?.paths) ? data.paths.filter((item) => String(item?.direction || "").trim()).slice(0, 4) : [];
      if (!paths.length) throw new Error(data?.error || "Velvet couldn't find a natural next path.");
      setStoryPaths(paths);
    } catch (error) {
      console.warn("[Velvet Story Paths] request failed", error);
      setStoryPathsError("Velvet couldn't find a natural next path right now. Try again in a moment.");
    } finally {
      setStoryPathsLoading(false);
    }
  }

  function openStoryPaths() {
    setStoryPathsOpen(true);
    setStoryPaths([]);
    setStoryPathsError("");
    window.setTimeout(() => requestStoryPaths(), 0);
  }

  function chooseStoryPath(path) {
    const direction = String(path?.direction || "").trim();
    if (!direction) return;
    setDirectorNote(direction);
    setDirectorMode("next");
    setStoryPathsOpen(false);
    setStoryPaths([]);
    setStoryPathsError("");
    showActionNotice("Story path queued ✓");
    if (settings.haptics) navigator.vibrate?.(5);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // VELVET_STOP_V7_SINGLE_TAP
    // There are no delayed Stop bursts anymore. A new send can never inherit
    // a timer from an older generation and accidentally cancel itself.

    const cleanMessage = message.trim();
    if (!conversationReady) return;
    if (busy) return;

    const dotsOnly = /^[.…。]+$/u.test(cleanMessage);
    const compactDots = cleanMessage.replace(/[…。]/gu, ".");
    const returnToMainPov = dotsOnly && compactDots === "..";
    const silentContinue = dotsOnly && (compactDots === "." || compactDots.length >= 3);
    const messageToSend = cleanMessage === "" || returnToMainPov || silentContinue
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

    const replyForThisMessage = replyTo;
    const adaptiveReplyHint = buildAdaptiveReplyHint(messageToSend);
    const currentConversationId = conversation?.conversationId || activeConversationId || character.id;
    const livingWorldHint = buildLivingWorldDirectorHint(
      readLivingWorld(currentConversationId),
      { characterName: character.name, recentMessages: visibleMessages }
    );
    const experienceHint = buildExperienceDirectorHint(
      readExperience(currentConversationId),
      { characterName: character.name, groupMode: Boolean(conversation?.groupMode) }
    );
    const stopPovHint = returnMainPovAfterStopRef.current
      ? `Return narrative focus to ${character.name}'s established primary POV. Do not continue a secondary NPC POV unless the user explicitly asks.`
      : "";
    const noteForThisGeneration = mergeDirectorHints(
      mergeDirectorHints(mergeDirectorHints(mergeDirectorHints(directorNote.trim(), adaptiveReplyHint), livingWorldHint), experienceHint),
      stopPovHint
    );
    const submittedDraft = cleanMessage;
    let userMessageSaved = false;
    let savedUserMessageId = "";

    try {
      stoppedRef.current = false;
      setSending(true);
      setIsTyping(true);
      clearGenerationFailure();

      // VELVET_FAST_SEND_V1
      // The composer clears immediately. ChatsContext paints an optimistic user
      // bubble while the database save finishes, so tapping Send feels instant.
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

      const savedUserMessage = await addMessage(character.id, "user", messageToSend, {
        ...(replyForThisMessage ? {
          replyToMessageId: replyForThisMessage.id,
          replyPreview: replyForThisMessage.content,
          replySender: replyForThisMessage.sender,
        } : {}),
        directorInstruction: noteForThisGeneration,
      });
      userMessageSaved = true;
      savedUserMessageId = savedUserMessage?.id || "";
      returnMainPovAfterStopRef.current = false;

      if (savedUserMessage?.isOfflinePending) {
        setSending(false);
        setIsTyping(false);
        setSilentCue("");
        showActionNotice("Saved offline · Velvet will send it automatically", "neutral", 3200);
        return;
      }

      // Stop may have happened while the user message was being saved.
      if (generationRunRef.current !== runId || stoppedRef.current) return;

      setSending(false);
      const generationResult = await generateCharacterReply(character.id, {
        directorInstruction: noteForThisGeneration,
        expectedUserMessageId: savedUserMessage.id,
        diagnosticSource: "send",
      });
      clearGenerationFailure();
      if (generationResult?.learnedMemoryCount) {
        setMemoryCaptureNotice(generationResult.learnedMemoryCount);
        window.setTimeout(() => setMemoryCaptureNotice(0), 3200);
      }
    } catch (error) {
      if (
        generationRunRef.current !== runId ||
        stoppedRef.current ||
        error.name === "AbortError"
      ) return;

      console.error("Error generating character response:", error);
      if (!userMessageSaved && submittedDraft) {
        setMessage((current) => current.trim() ? current : submittedDraft);
        if (replyForThisMessage) setReplyTo(replyForThisMessage);
        window.requestAnimationFrame(() => resizeComposer());
      }
      if (userMessageSaved) {
        rememberGenerationFailure(error, {
          mode: "reply",
          expectedUserMessageId: savedUserMessageId,
          source: "send",
        });
      } else {
        setSendError(translateMessageError(error.message));
      }
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
    // VELVET_STOP_V7_SINGLE_TAP
    // One user action means exactly one local Stop. Older versions scheduled
    // five more Stop calls for the next second; those timers could catch a new
    // regeneration/send and kill it immediately.
    generationRunRef.current += 1;
    versionOperationSeqRef.current += 1;
    stoppedRef.current = true;
    returnMainPovAfterStopRef.current = true;
    retryInFlightRef.current = false;
    variantGenerationLockRef.current = false;
    if (settings.haptics) navigator.vibrate?.(10);

    stopGeneration(character.id);

    setRetryingGeneration(false);
    setActionLoading(false);
    setSending(false);
    setIsTyping(false);
    setSilentCue("");
    clearGenerationFailure();
    showActionNotice("Generation stopped", "neutral", 1200);
    window.requestAnimationFrame(() => {
      try { textareaRef.current?.focus({ preventScroll: true }); } catch { textareaRef.current?.focus(); }
    });
  }

  async function retryGeneration() {
    if (busy || !conversationReady || retryInFlightRef.current) return;

    retryInFlightRef.current = true;
    const runId = ++generationRunRef.current;
    const remembered = failedGenerationRef.current || failedGeneration;
    const canonical = (conversation?.messages || []).filter((item) => !item.isStreaming);
    const latestVisibleUser = [...canonical].reverse().find((item) => item.sender === "user") || null;
    const latestCharacter = [...canonical].reverse().find((item) => item.sender === "character") || null;
    const latestUserIndex = canonical.map((item) => item.sender).lastIndexOf("user");
    const latestCharacterIndex = canonical.map((item) => item.sender).lastIndexOf("character");
    const legacyLooksLikeRegeneration = Boolean(
      latestCharacter &&
      isReplyGenerationErrorMessage(sendError) &&
      latestCharacterIndex > latestUserIndex
    );
    const inferredFailure = remembered || (
      legacyLooksLikeRegeneration
        ? { mode: "regenerate", regenerateMessageId: latestCharacter.id, instruction: "", feedbackCodes: [], source: "legacy-error" }
        : { mode: "reply", expectedUserMessageId: latestVisibleUser?.id || "", source: "legacy-error" }
    );

    try {
      stoppedRef.current = false;
      setRetryingGeneration(true);
      setSending(true);
      setIsTyping(true);
      setSilentCue("");
      setSendError("");

      if (inferredFailure?.mode === "regenerate" && inferredFailure.regenerateMessageId) {
        const targetId = inferredFailure.regenerateMessageId;
        const result = await regenerateCharacterReply(
          character.id,
          targetId,
          inferredFailure.instruction || "",
          inferredFailure.feedbackCodes || [],
          inferredFailure.source || "retry-regenerate"
        );
        const regeneratedContent = result?.message?.content || "";
        const rows = await getMessageAlternatives(targetId).catch(() => []);
        if (regeneratedContent || rows.length) {
          const versions = normalizeVersionRows(rows, regeneratedContent);
          versions.index = Math.max(0, versions.items.findIndex((item) => item.content === regeneratedContent));
          setResponseVersions((current) => ({ ...current, [targetId]: versions }));
        }
      } else {
        const expectedUserMessageId = inferredFailure?.expectedUserMessageId || latestVisibleUser?.id || "";
        if (!expectedUserMessageId) throw new Error("There is no message to retry yet.");

        // First reconcile with Supabase. If the reply actually finished while
        // the phone was offline, Retry becomes an instant recovery instead of
        // sending a duplicate generation request.
        const refreshed = await reloadConversationMessages(character.id).catch(() => []);
        const expectedIndex = refreshed.findIndex((item) => item.id === expectedUserMessageId);
        const alreadyFinished = expectedIndex >= 0
          ? refreshed.slice(expectedIndex + 1).find((item) => item.sender === "character" && !item.isStreaming)
          : null;

        if (!alreadyFinished) {
          await generateCharacterReply(character.id, { expectedUserMessageId, diagnosticSource: inferredFailure?.source || "retry-reply" });
        }
      }

      clearGenerationFailure();
    } catch (error) {
      if (
        generationRunRef.current === runId &&
        !stoppedRef.current &&
        error.name !== "AbortError"
      ) {
        rememberGenerationFailure(error, inferredFailure || {});
      }
    } finally {
      retryInFlightRef.current = false;
      if (generationRunRef.current === runId) {
        setRetryingGeneration(false);
        setSending(false);
        setIsTyping(false);
      }
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

  async function toggleMatureMode(enabled) {
    const value = Boolean(enabled);
    setControlDraft((current) => ({ ...current, matureMode: value }));
    try {
      setSavingControls(true);
      await updateConversationSettings(character.id, { matureMode: value });
    } catch (error) {
      setControlDraft((current) => ({ ...current, matureMode: !value }));
      setSendError(error.message || "We couldn't save Mature mode.");
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
    if (busy && event.key === "." && !message.trim()) {
      event.preventDefault();
      handleStop();
      return;
    }
    if (event.key !== "Enter") return;

    const isMobileInput =
      window.matchMedia?.("(pointer: coarse)")?.matches ||
      window.innerWidth <= 768;

    // On phones/tablets, Enter always means a new line.
    // Sending is intentionally button-only on touch devices.
    if (isMobileInput) return;

    // Desktop can choose whether Enter sends or creates a new line.
    if (settings.enterToSend === false) {
      if (!(event.ctrlKey || event.metaKey)) return;
    } else if (event.shiftKey) return;

    event.preventDefault();
    handleSubmit(event);
  }

  function openActions(chatMessage) {
    if (chatMessage.isStreaming) return;
    setSelectedMessage(chatMessage);
    setActionMode("menu");
    setActionDraft("");
    setRegenerationFeedback([]);
    setPositiveFeedback([]);
    setFeedbackOnly(false);
    setAlternatives([]);
  }

  function openMessageFeedback(chatMessage, kind) {
    if (chatMessage.isStreaming || chatMessage.sender !== "character") return;
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

  async function runAction(action, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!selectedMessage) return;

    if (busy && ["rewind", "delete"].includes(action)) {
      showActionNotice("Let Velvet finish this reply first", "working", 1800);
      return;
    }

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
        showActionNotice("Saved to Memories ✓");
      }

      if (action === "bookmark") {
        const wasBookmarked = Boolean(selectedMessage.isBookmarked);
        await toggleMessageBookmark(character.id, selectedMessage.id);
        closeActionsAfterAction();
        showActionNotice(wasBookmarked ? "Saved moment removed" : "Moment saved ✓");
      }

      if (action === "rewind") {
        armChatExitGuard();
        const messageId = selectedMessage.id;
        // Close the message sheet before showing the confirmation. On mobile the
        // sheet is a high-z-index body portal, so keeping it open can visually
        // swallow a confirmation even though the Rewind handler did run.
        closeActionsAfterAction();
        const approved = await confirmAction({
          title: "Rewind story to this message?",
          message: "Everything after this message will be permanently removed from this conversation.",
          confirmLabel: "Rewind story",
        });
        if (!approved) return;
        showActionNotice("Rewinding…", "working", 5000);
        let safetySnapshot = null;
        try {
          safetySnapshot = await createStorySnapshot(character.id, "Temporary rewind undo");
        } catch (snapshotError) {
          console.warn("Rewind undo snapshot unavailable:", snapshotError);
        }
        await rewindToMessage(character.id, messageId);
        if (safetySnapshot?.id) armRewindUndo(safetySnapshot.id);
        showActionNotice("Rewound ✓");
        if (settings.haptics) navigator.vibrate?.(7);
        return;
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
    armChatExitGuard();
    setSelectedMessage(null);
    setActionMode("menu");
    setActionDraft("");
    setRegenerationFeedback([]);
    setPositiveFeedback([]);
    setFeedbackOnly(false);
    setAlternatives([]);
  }

  function openCharacterFromMessageActions() {
    if (conversation?.groupMode || !onOpenCharacter) return;
    closeActionsAfterAction();
    onOpenCharacter(character);
  }

  function rememberFeedback(kind, codes, messageId) {
    const accepted = recordStoryFeedback(kind, codes);
    if (!accepted.length) return;
    setMessageFeedback((current) => ({ ...current, [messageId]: kind }));
    setFeedbackNotice({ kind, codes: accepted, messageId });
  }

  async function undoReplacement() {
    if (!replacementUndo || busy) return;
    try {
      setSendError("");
      await selectMessageAlternative(character.id, replacementUndo.messageId, replacementUndo.content);
      const undoRows = await getMessageAlternatives(replacementUndo.messageId).catch(() => []);
      const undoVersions = normalizeVersionRows(undoRows, replacementUndo.content);
      undoVersions.index = Math.max(0, undoVersions.items.findIndex((item) => item.content === replacementUndo.content));
      setResponseVersions((current) => ({ ...current, [replacementUndo.messageId]: undoVersions }));
      setReplacementUndo(null);
      showActionNotice("Change undone ✓");
    } catch (error) {
      setSendError(translateMessageError(error.message));
    }
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

  function openQualityMonitor(chatMessage) {
    if (!chatMessage || chatMessage.sender !== "character" || chatMessage.isStreaming) return;
    if (settings.haptics) navigator.vibrate?.(16);
    setQualityMessage(chatMessage);
  }

  function rateQuality(option) {
    if (!qualityMessage || !option) return;
    rememberFeedback(option.kind, option.codes, qualityMessage.id);
    if (settings.haptics) navigator.vibrate?.(option.kind === "positive" ? [10, 22, 10] : 9);
    setQualityMessage(null);
  }

  function savePositiveFeedback() {
    if (!selectedMessage || !positiveFeedback.length) return;
    rememberFeedback("positive", positiveFeedback, selectedMessage.id);
    closeActionsAfterAction();
  }

  async function createBranchFromSelected() {
    if (!selectedMessage || actionLoading || busy) return;
    try {
      setActionLoading(true);
      setSendError("");
      const branch = await branchConversationFromMessage(character.id, selectedMessage.id, actionDraft);
      closeActionsAfterAction();
      setActiveConversationId(branch.id);
      await startConversation(character, { conversationId: branch.id });
      await loadConversationList();
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Branch creation failed:", error);
      setSendError(error.message || "We couldn't create that branch.");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveCanonCorrection() {
    if (!selectedMessage || !actionDraft.trim() || !conversation?.conversationId || actionLoading || busy) return;
    try {
      setActionLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("story_canon_corrections").insert({
        user_id: auth?.user?.id,
        conversation_id: conversation.conversationId,
        source_message_id: selectedMessage.id,
        correction: actionDraft.trim(),
      });
      if (error) throw error;
      await supabase.from("conversations").update({ scene_state: {}, cast_state: {}, updated_at: new Date().toISOString() }).eq("id", conversation.conversationId);
      await refreshStoryMetadata(character.id);
      setActionNotice("Canon corrected ✓");
      closeActionsAfterAction();
    } catch (error) { setSendError(error.message || "Canon correction could not be saved."); }
    finally { setActionLoading(false); }
  }

  async function saveEditedMessage() {
    if (!selectedMessage || !actionDraft.trim() || busy) return;
    let updatedUserMessageId = "";

    try {
      setActionLoading(true);
      clearGenerationFailure();
      const updatedUserMessage = await editMessageAndRemoveFollowing(character.id, selectedMessage.id, actionDraft);
      updatedUserMessageId = updatedUserMessage?.id || "";
      closeActionsAfterAction();
      setIsTyping(true);
      await generateCharacterReply(character.id, { expectedUserMessageId: updatedUserMessage.id, diagnosticSource: "edit-user" });
      clearGenerationFailure();
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Message edit failed:", error);
      if (updatedUserMessageId) rememberGenerationFailure(error, { mode: "reply", expectedUserMessageId: updatedUserMessageId, source: "edit-user" });
      else setSendError(translateMessageError(error.message));
    } finally {
      setActionLoading(false);
      setIsTyping(false);
    }
  }

  async function saveEditedAIResponse() {
    if (!selectedMessage || !actionDraft.trim() || busy) return;
    try {
      setActionLoading(true);
      const previousContent = selectedMessage.content;
      const editedId = selectedMessage.id;
      await editCharacterMessageInPlace(character.id, editedId, actionDraft);
      setReplacementUndo({ messageId: editedId, content: previousContent, label: "Rewrite" });
      closeActionsAfterAction();
      showActionNotice("Reply rewritten ✓");
    } catch (error) {
      setSendError(translateMessageError(error.message));
    } finally {
      setActionLoading(false);
    }
  }

  async function regenerate() {
    if (!selectedMessage || selectedMessage.sender !== "character" || actionLoading || busy || variantGenerationLockRef.current) return;
    const latestMessage = [...(conversation?.messages || [])].filter((item) => !item.isStreaming).at(-1);
    if (latestMessage?.id !== selectedMessage.id) {
      rememberFeedback("negative", regenerationFeedback, selectedMessage.id);
      closeActionsAfterAction();
      return;
    }

    const targetId = selectedMessage.id;
    const previousContent = selectedMessage.content;
    const instruction = actionDraft.trim();
    const feedbackCodes = [...regenerationFeedback];
    // v3.49.48 REGENERATION RECOVERY: Stop is a one-generation signal, not a
    // permanent chat state. A previous Stop used to leave stoppedRef=true, so
    // regeneration could finish on the server and then be discarded by this UI.
    stoppedRef.current = false;
    variantGenerationLockRef.current = true;
    const variantOp = ++versionOperationSeqRef.current;
    try {
      rememberFeedback("negative", feedbackCodes, targetId);
      setActionLoading(true);
      closeActionsAfterAction();
      setIsTyping(true);
      showAiPhase("Rewriting", 1100);
      showActionNotice("Generating another response…", "working", 5000);
      clearGenerationFailure();
      const regenerationResult = await regenerateCharacterReply(character.id, targetId, instruction, feedbackCodes, "regenerate");
      if (versionOperationSeqRef.current !== variantOp || stoppedRef.current) return;
      const regeneratedContent = regenerationResult?.message?.content || previousContent;
      setReplacementUndo({ messageId: regenerationResult?.message?.id || targetId, content: previousContent, label: "Regenerate" });
      const regeneratedRows = await getMessageAlternatives(targetId).catch(() => []);
      const regeneratedVersions = normalizeVersionRows(regeneratedRows, regeneratedContent);
      regeneratedVersions.index = Math.max(0, regeneratedVersions.items.findIndex((item) => item.content === regeneratedContent));
      setResponseVersions((current) => ({ ...current, [targetId]: regeneratedVersions }));
      showAiPhase("Finishing", 420);
      showActionNotice("New response ready ✓");
      if (regenerationResult?.learnedMemoryCount) {
        setMemoryCaptureNotice(regenerationResult.learnedMemoryCount);
        window.setTimeout(() => setMemoryCaptureNotice(0), 3200);
      }
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Regeneration failed:", error);
      await reloadConversationMessages(character.id).catch((reloadError) => {
        console.error("Could not restore messages:", reloadError);
      });
      rememberGenerationFailure(error, { mode: "regenerate", regenerateMessageId: targetId, instruction, feedbackCodes, source: "regenerate" });
    } finally {
      if (versionOperationSeqRef.current === variantOp) {
        variantGenerationLockRef.current = false;
        setActionLoading(false);
        setIsTyping(false);
      }
    }
  }


  function normalizeVersionRows(rows = [], currentContent = "") {
    const seen = new Set();
    const items = [];

    for (const row of rows) {
      const content = String(row?.content || "").trim();
      const key = content.replace(/\s+/g, " ").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push({ ...row, content });
    }

    const current = String(currentContent || "").trim();
    const currentKey = current.replace(/\s+/g, " ").trim();
    if (currentKey && !seen.has(currentKey)) {
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

    try {
      const rows = await getMessageAlternatives(chatMessage.id);
      const next = normalizeVersionRows(rows, chatMessage.content);
      setResponseVersions((current) => ({ ...current, [chatMessage.id]: next }));
      return next;
    } catch (error) {
      setResponseVersions((current) => ({
        ...current,
        [chatMessage.id]: { ...(current[chatMessage.id] || {}), loading: false },
      }));
      throw error;
    }
  }

  useEffect(() => {
    const latestCharacterMessage = [...visibleMessages].reverse().find((item) => item.sender === "character" && !item.isStreaming);
    if (!latestCharacterMessage || busy || !conversationReady) return;
    loadResponseVersions(latestCharacterMessage).catch((error) => {
      console.debug("Could not preload response versions:", error);
    });
  }, [conversation?.conversationId, latestMessageContent, busy, conversationReady]);

  async function navigateResponseVersion(chatMessage, direction) {
    if (!chatMessage || chatMessage.sender !== "character" || chatMessage.isStreaming || busy || variantGenerationLockRef.current) return;

    variantGenerationLockRef.current = true;
    const versionOp = ++versionOperationSeqRef.current;
    let retryContext = null;
    try {
      setSendError("");
      let state = await loadResponseVersions(chatMessage);

      if (direction < 0) {
        if (state.index <= 0) return;
        const nextIndex = state.index - 1;
        await selectMessageAlternative(character.id, chatMessage.id, state.items[nextIndex].content);
        if (versionOperationSeqRef.current === versionOp) setResponseVersions((current) => ({
          ...current,
          [chatMessage.id]: { ...state, index: nextIndex },
        }));
        showActionNotice(`Response ${nextIndex + 1} / ${Math.max(1, state.items.length)}`, "neutral", 1000);
        return;
      }

      if (state.index < state.items.length - 1) {
        const nextIndex = state.index + 1;
        await selectMessageAlternative(character.id, chatMessage.id, state.items[nextIndex].content);
        if (versionOperationSeqRef.current === versionOp) setResponseVersions((current) => ({
          ...current,
          [chatMessage.id]: { ...state, index: nextIndex },
        }));
        showActionNotice(`Response ${nextIndex + 1} / ${Math.max(1, state.items.length)}`, "neutral", 1000);
        return;
      }

      setIsTyping(true);
      showAiPhase("Rewriting", 1100);
      showActionNotice("Generating another response…", "working", 5000);
      retryContext = { mode: "regenerate", regenerateMessageId: chatMessage.id, instruction: "", feedbackCodes: [], source: "next-version" };
      clearGenerationFailure();
      const result = await regenerateCharacterReply(character.id, chatMessage.id, "", [], "next-version");
      const currentContent = result?.message?.content || chatMessage.content;
      const rows = await getMessageAlternatives(chatMessage.id);
      const refreshed = normalizeVersionRows(rows, currentContent);
      refreshed.index = Math.max(0, refreshed.items.findIndex((item) => item.content === currentContent));
      if (versionOperationSeqRef.current === versionOp) setResponseVersions((current) => ({ ...current, [chatMessage.id]: refreshed }));
      showAiPhase("Finishing", 420);
      showActionNotice(`Response ${refreshed.index + 1} / ${Math.max(1, refreshed.items.length)} ✓`);
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Response version navigation failed:", error);
      await reloadConversationMessages(character.id).catch(() => {});
      if (retryContext) rememberGenerationFailure(error, retryContext);
      else setSendError(translateMessageError(error.message));
    } finally {
      if (versionOperationSeqRef.current === versionOp) {
        variantGenerationLockRef.current = false;
        setIsTyping(false);
      }
    }
  }

  async function regenerateFromSwipe(chatMessage, direction = 1) {
    await navigateResponseVersion(chatMessage, direction);
  }

  async function quickRefineSelected(feedbackCode, instruction = "") {
    if (!selectedMessage || selectedMessage.sender !== "character" || actionLoading || busy || variantGenerationLockRef.current) return;
    const latestMessage = [...(conversation?.messages || [])].filter((item) => !item.isStreaming).at(-1);
    if (latestMessage?.id !== selectedMessage.id) {
      setSendError("Rewind to this response first before generating a new version from it.");
      closeActionsAfterAction();
      return;
    }

    const targetId = selectedMessage.id;
    const previousContent = selectedMessage.content;
    variantGenerationLockRef.current = true;
    const variantOp = ++versionOperationSeqRef.current;
    try {
      const feedbackCodes = feedbackCode ? [feedbackCode] : [];
      rememberFeedback("negative", feedbackCodes, targetId);
      setActionLoading(true);
      setSendError("");
      closeActionsAfterAction();
      setIsTyping(true);
      showAiPhase("Rewriting", 1100);
      showActionNotice("Refining response…", "working", 5000);
      clearGenerationFailure();
      const refinementResult = await regenerateCharacterReply(character.id, targetId, instruction, feedbackCodes, "refine");
      if (versionOperationSeqRef.current !== variantOp || stoppedRef.current) return;
      setReplacementUndo({ messageId: refinementResult?.message?.id || targetId, content: previousContent, label: "Refine" });
      const refinedContent = refinementResult?.message?.content || previousContent;
      const refinedRows = await getMessageAlternatives(targetId).catch(() => []);
      const refinedVersions = normalizeVersionRows(refinedRows, refinedContent);
      refinedVersions.index = Math.max(0, refinedVersions.items.findIndex((item) => item.content === refinedContent));
      setResponseVersions((current) => ({ ...current, [targetId]: refinedVersions }));
      showAiPhase("Finishing", 420);
      showActionNotice("Refined ✓");
      if (refinementResult?.learnedMemoryCount) {
        setMemoryCaptureNotice(refinementResult.learnedMemoryCount);
        window.setTimeout(() => setMemoryCaptureNotice(0), 3200);
      }
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Quick refinement failed:", error);
      await reloadConversationMessages(character.id).catch(() => {});
      rememberGenerationFailure(error, { mode: "regenerate", regenerateMessageId: targetId, instruction, feedbackCodes: feedbackCode ? [feedbackCode] : [], source: "refine" });
    } finally {
      if (versionOperationSeqRef.current === variantOp) {
        variantGenerationLockRef.current = false;
        setActionLoading(false);
        setIsTyping(false);
      }
    }
  }

  async function chooseAlternative(alternative) {
    if (busy || actionLoading) return;
    try {
      setActionLoading(true);
      await selectMessageAlternative(character.id, selectedMessage.id, alternative.content);
      closeActionsAfterAction();
      showActionNotice("Response version selected ✓");
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
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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

  function queueDirectorForNextBeat(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    armChatExitGuard();
    const instruction = directorNote.trim();
    if (!instruction || busy || actionLoading || !conversationReady) return;
    setDirectorMode("next");
    setDirectorNoteOpen(false);
    setSendError("");
    showActionNotice("Next beat queued ✓");
    if (settings.haptics) navigator.vibrate?.(5);
  }

  function clearQueuedDirector() {
    setDirectorNote("");
    if (conversation?.conversationId) {
      localStorage.removeItem(`velvet_director_note_${conversation.conversationId}`);
    }
  }


  async function applyDirectorAndRegenerate(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    armChatExitGuard();
    const instruction = directorNote.trim();
    if (!instruction || busy || actionLoading || !conversationReady) return;

    const canonicalMessages = [...(conversation?.messages || [])].filter((item) => !item.isStreaming);
    const latestMessage = canonicalMessages.at(-1);

    if (!latestMessage || latestMessage.sender !== "character") {
      setSendError("Rewrite last reply works after the character has answered.");
      return;
    }

    const targetId = latestMessage.id;
    const previousContent = latestMessage.content;
    variantGenerationLockRef.current = true;
    const variantOp = ++versionOperationSeqRef.current;
    try {
      setActionLoading(true);
      setSendError("");
      setDirectorNoteOpen(false);
      setDirectorNote("");
      if (conversation?.conversationId) {
        localStorage.removeItem(`velvet_director_note_${conversation.conversationId}`);
      }
      setIsTyping(true);
      showAiPhase("Rewriting", 1100);
      showActionNotice("Rewriting last reply…", "working", 5000);

      // Important: this is a regeneration of the same character message, not a
      // new turn. The previous response is replaced immediately in-place.
      clearGenerationFailure();
      const rewriteResult = await regenerateCharacterReply(character.id, targetId, instruction, [], "director-rewrite");
      if (versionOperationSeqRef.current !== variantOp || stoppedRef.current) return;
      const rewrittenContent = rewriteResult?.message?.content || previousContent;
      setReplacementUndo({ messageId: rewriteResult?.message?.id || targetId, content: previousContent, label: "Rewrite" });
      const rewrittenRows = await getMessageAlternatives(targetId).catch(() => []);
      const rewrittenVersions = normalizeVersionRows(rewrittenRows, rewrittenContent);
      rewrittenVersions.index = Math.max(0, rewrittenVersions.items.findIndex((item) => item.content === rewrittenContent));
      setResponseVersions((current) => ({ ...current, [targetId]: rewrittenVersions }));
      showAiPhase("Finishing", 420);
      showActionNotice("Reply rewritten ✓");
    } catch (error) {
      if (error?.name === "AbortError" || stoppedRef.current) return;
      console.error("Scene Director regeneration failed:", error);
      await reloadConversationMessages(character.id).catch(() => {});
      rememberGenerationFailure(error, { mode: "regenerate", regenerateMessageId: targetId, instruction, feedbackCodes: [], source: "director-rewrite" });
    } finally {
      if (versionOperationSeqRef.current === variantOp) {
        variantGenerationLockRef.current = false;
        setActionLoading(false);
        setIsTyping(false);
      }
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

  async function scanCanonDoctor() {
    if (!conversationReady || canonDoctorLoading || canonDoctorApplying) return;
    setCanonDoctorLoading(true);
    setCanonDoctorError("");
    setCanonDoctorApplied(false);
    try {
      const payload = await runCanonDoctor(character.id, { apply: false });
      setCanonDoctorReport(payload?.report || null);
    } catch (error) {
      setCanonDoctorError(error?.message || "Canon Doctor couldn't scan this story.");
    } finally {
      setCanonDoctorLoading(false);
    }
  }

  async function openCanonDoctor() {
    setMenuOpen(false);
    setCanonDoctorOpen(true);
    setCanonDoctorReport(null);
    setCanonDoctorError("");
    setCanonDoctorApplied(false);
    window.setTimeout(() => { void scanCanonDoctor(); }, 0);
  }

  async function repairCanonDoctor() {
    if (!canonDoctorReport?.repairPlan || canonDoctorApplying) return;
    setCanonDoctorApplying(true);
    setCanonDoctorError("");
    try {
      await createStorySnapshot(character.id, "Before Canon Doctor");
      const payload = await runCanonDoctor(character.id, { apply: true, plan: canonDoctorReport.repairPlan });
      setCanonDoctorReport(payload?.report || canonDoctorReport);
      setCanonDoctorApplied({
        ...(payload?.repaired || {}),
        storyRevision: payload?.updated?.story_revision || null,
      });
      setActionNotice("Story state repaired. Messages were left untouched.");
    } catch (error) {
      setCanonDoctorError(error?.message || "Canon Doctor couldn't repair this story.");
    } finally {
      setCanonDoctorApplying(false);
    }
  }

  const chatHeroImage = character.coverUrl || character.imageUrl;

  return (
    <section
      className={`chat chat--story-${storyTheme}${readingMode ? " chat--reading" : ""}${compactMobileChat ? " chat--compact-mobile" : ""}`}
      data-reading-width={settings.readingWidth || "comfortable"}
      data-character-tint={characterTint}
      data-reading-font={settings.readingFont || "clean"}
      style={{
        "--character-presence-color": character.color || "var(--accent)",
        ...(chatHeroImage ? { "--character-presence-image": `url(${JSON.stringify(chatHeroImage)})` } : {}),
      }}
    >
{typeof document !== "undefined" && createPortal((<header
        className={`chat__header${chatHeroImage ? " chat__header--cover" : ""}`}
        style={chatHeroImage ? { "--chat-hero-image": `url(${JSON.stringify(chatHeroImage)})` } : undefined}
      >
        <button className="chat__icon-button chat__back-button" onClick={handleChatBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <button className="chat__avatar chat__character-avatar-button" style={{ "--character-color": character.color }} onClick={() => setCharacterProfileOpen(true)} aria-label={`View ${character.name}'s profile`}>
          {character.imageUrl ? <img src={character.imageUrl} alt="" decoding="async" /> : character.initials}
        </button>
        <div className="chat__identity">
          <button className="chat__character-name-button chat__character-name-button--primary" onClick={() => setCharacterProfileOpen(true)} aria-label={`View ${character.name}'s profile`}>
            <strong>{conversationDisplayName}</strong>
          </button>
        </div>
        <button
          className="chat__icon-button chat__spotify-button"
          type="button"
          onClick={() => {
            setMenuOpen(false);
            window.dispatchEvent(new CustomEvent("velvet:spotify-toggle"));
          }}
          aria-label="Abrir Spotify"
        >
          <Music2 size={19} />
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
              <header className="chat__menu-sheet-header"><div><small>STORY OPTIONS</small><strong>{conversationDisplayName}</strong>{conversation?.groupMode && <span className="chat__group-cast-line">{groupCast.map((item) => item.name).join(" · ")}</span>}</div><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close story options"><X size={19}/></button></header>
              <button className="chat__menu-new" onClick={handleNewConversation} disabled={busy || creatingConversation}>
                {creatingConversation ? <LoaderCircle className="spin" size={17} /> : <SquarePen size={17} />}
                New conversation
              </button>
              <label className="chat__menu-story-picker">
                <span><BookOpen size={17} />Current story</span>
                <span className="chat__menu-story-select">
                  <select value={conversation?.conversationId || activeConversationId} onChange={(event) => { setMenuOpen(false); switchConversation(event.target.value); }} disabled={busy || conversationLoading} aria-label="Switch story">
                    {conversationList.map((item) => <option key={item.id} value={item.id}>{item.is_pinned ? "★ " : ""}{displayStoryTitle(item.title)}</option>)}
                  </select>
                  <ChevronDown size={14} />
                </span>
              </label>
              <div className="chat__menu-quick">
                <button type="button" onClick={() => { setMenuOpen(false); setMemoryBookOpen(true); }} disabled={!conversationReady}><Brain size={17}/><span>Memory Book<small>Current story</small></span></button>
                <button type="button" onClick={() => { setMenuOpen(false); openRelationshipFor(character); }} disabled={!conversationReady}><HeartHandshake size={17}/><span>Relationship<small>Story pulse</small></span></button>
                <button type="button" onClick={() => { setMenuOpen(false); onOpenDiagnostics?.(); }}><Activity size={17}/><span>AI Status<small>Velvet Doctor</small></span></button>
                <button type="button" onClick={() => { setMenuOpen(false); onOpenDiagnostics?.(); }}><Bug size={17}/><span>Report a problem<small>Private by default</small></span></button>
              </div>
              <div className="chat__menu-section-label">STORY</div>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); onOpenMemories?.(); }}><Brain size={17} /> Memories 2.5</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setControlsOpen(true); }} disabled={!conversationReady}><SlidersHorizontal size={17} /> Story settings</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setReadingMode((current) => !current); }}><Eye size={17} /> {readingMode ? "Exit immersive mode" : "Immersive mode"}</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); openDirector("next"); }} disabled={!conversationReady || busy}><Sparkles size={17} /> Guide the next beat</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setStoryHubOpen(true); refreshStoryMetadata(character.id).catch(() => {}); }} disabled={!conversationReady}><BookOpen size={17} /> Story Hub</button>
              <div className="chat__menu-section-label">WORLD & CONTINUITY</div>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setNpcCastOpen(true); }} disabled={!conversationReady || busy}><UsersRound size={17} /> NPC Cast</button>
              <button className="chat__menu-controls" onClick={openCanonDoctor} disabled={!conversationReady || busy}><ShieldCheck size={17} /> Canon Doctor</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setWorldStudioOpen(true); }} disabled={!conversationReady}><Globe2 size={17} /> World Studio</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setTimelineOpen(true); handleRefreshTimeline(); }} disabled={!conversationReady}><Clock3 size={17} /> Story timeline</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setSafeStudioOpen(true); }} disabled={!conversationReady}><ShieldCheck size={17} /> Safe Studio</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setLivingWorldOpen(true); }} disabled={!conversationReady}><Globe2 size={17} /> Living World</button>
              <button className="chat__menu-controls" onClick={() => { setMenuOpen(false); setExperienceOpen(true); }} disabled={!conversationReady}><Sparkles size={17} /> Velvet Experience</button>
              <div className="chat__menu-section-label">TOOLS</div>
              <button className="chat__menu-controls" onClick={copyGenerationDebugReport}><Copy size={17} /> Copy debug report</button>
              <button className="chat__menu-controls" onClick={exportCurrentStory} disabled={!conversationReady || !visibleMessages.length}><Download size={17} /> Export this story</button>
              <button className="chat__menu-danger" onClick={handleDeleteConversation} disabled={deleting}><Trash2 size={17} /> {deleting ? "Deleting..." : "Delete conversation"}</button>
            </section>
          </div>
        ), document.body)}
      </header>), document.body)}

      {conversationReady && (livingSceneHeader.items.length > 0 || livingSceneHeader.present.length > 0) && (
        <div className="chat__living-scene" aria-label="Current scene">
          <div className="chat__living-scene-meta">
            {livingSceneHeader.items.map((item, index) => (
              <span key={`${item}-${index}`}><MapPin size={11}/>{item}</span>
            ))}
          </div>
          <div className="chat__living-scene-status">
            <span className="chat__presence-status" title={livingSceneHeader.presenceTitle}><UsersRound size={12}/>{livingSceneHeader.presenceLabel}</span>
            <span className={`chat__continuity-status${conversation?.continuityGuard?.status === "repaired" ? " is-repaired" : ""}`} title={continuityGuardTitle(conversation?.continuityGuard || {})}><ShieldCheck size={12}/>{continuityLabel}</span>
          </div>
        </div>
      )}

      {conversationReady && experienceState?.composer?.showContext && (() => {
        const chips = [
          conversation?.sceneState?.location,
          conversation?.sceneState?.time_label || conversation?.sceneState?.time,
          conversation?.intelligenceState?.character_mind?.current_emotion,
          conversation?.groupMode ? "Group story" : null,
        ].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).slice(0, 4);
        return chips.length ? <div className="v325-context-chips" aria-label="Story context">{chips.map((chip)=><span key={chip}>{chip}</span>)}</div> : null;
      })()}

      {conversationReady && conversation?.groupMode && (
        <div className="v311-group-presence" aria-label="Characters in this group story">
          {groupCast.map((item) => {
            const state = conversation.castState?.[item.name] || conversation.castState?.[item.id] || {};
            const rawStatus = String(state.current_status || "").toLowerCase();
            const presentNames = Array.isArray(conversation.sceneState?.present) ? conversation.sceneState.present : [];
            const present = !rawStatus || rawStatus === "present" || presentNames.some((name)=>String(name).toLowerCase()===String(item.name).toLowerCase());
            return <button type="button" key={item.id} className={present ? "is-present" : "is-away"} onClick={()=>setGroupPeekCharacter({ ...item, __present: present })} title={present ? `${item.name} is in this scene` : `${item.name} is currently off scene`}>
              <span>{item.imageUrl ? <img src={item.imageUrl} alt=""/> : item.initials || item.name?.slice(0,1)}</span>
              <small>{item.name}</small><i>{present ? "here" : "away"}</i>
            </button>;
          })}
        </div>
      )}

      {groupPeekCharacter && typeof document !== "undefined" && createPortal((
        <div className="v312-cast-peek-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&setGroupPeekCharacter(null)}>
          <section className="v312-cast-peek" role="dialog" aria-modal="true" aria-label={`${groupPeekCharacter.name} in this group story`}>
            <button className="v312-cast-peek__close" type="button" onClick={()=>setGroupPeekCharacter(null)} aria-label="Close"><X size={18}/></button>
            <div className="v312-cast-peek__avatar">{groupPeekCharacter.imageUrl ? <img src={groupPeekCharacter.imageUrl} alt=""/> : <span>{groupPeekCharacter.initials || groupPeekCharacter.name?.slice(0,1)}</span>}</div>
            <small>{groupPeekCharacter.__present ? "IN THIS SCENE" : "CURRENTLY OFF SCENE"}</small>
            <h2>{groupPeekCharacter.name}</h2>
            <p>{groupPeekCharacter.role || groupPeekCharacter.description || "Part of this group story."}</p>
            <div className="v312-cast-peek__actions">
              <button type="button" onClick={()=>{ const target=groupPeekCharacter; setGroupPeekCharacter(null); openRelationshipFor(target); }}><HeartHandshake size={16}/>Relationship</button>
              <button type="button" onClick={()=>{ setGroupPeekCharacter(null); onOpenMemories?.(); }}><Brain size={16}/>Memories</button>
              <button type="button" onClick={()=>{ const target=groupPeekCharacter; setGroupPeekCharacter(null); onOpenCharacter?.(target); }}><UserRound size={16}/>Profile</button>
            </div>
          </section>
        </div>
      ), document.body)}

      {!chatOverlayOpen && typeof document !== "undefined" && createPortal((
        <button type="button" className="chat__mobile-exit" onClick={handleChatBack} aria-label="Leave chat"><ArrowLeft size={20}/></button>
      ), document.body)}


      <div ref={scrollContainerRef} className={`chat__content${activeSceneImage ? " chat__content--wallpaper" : ""}`} style={activeSceneImage ? { backgroundImage: `linear-gradient(rgba(15,10,13,${Math.max(0, Math.min(90, backgroundDim)) / 100}), rgba(15,10,13,${Math.max(0, Math.min(90, backgroundDim)) / 100})), url(${JSON.stringify(activeSceneImage)})`, "--chat-wallpaper-blur": `${backgroundBlur}px` } : undefined}>

        {visibleMessages.length === 0 && !busy && <div className={`chat__introduction${character.coverUrl ? " chat__introduction--covered" : ""}`} style={{ "--character-color": character.color }}>
          {character.coverUrl && <div className="chat__profile-cover"><img src={character.coverUrl} alt="" decoding="async" /></div>}
          <div className="chat__large-avatar">
            {character.imageUrl ? <img src={character.imageUrl} alt="" decoding="async" /> : <span>{character.initials}</span>}
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

            {typingIndicatorVisible && (
              <article className="chat-message chat-message--character">
                <span className="chat-message__avatar" style={{ "--character-color": character.color }}>
                  {character.imageUrl ? <img src={character.imageUrl} alt="" decoding="async" /> : character.initials}
                </span>
                <div className="typing-indicator typing-indicator--v3230"><small>{character.name} is writing…</small><span /><span /><span /></div>
              </article>
            )}

            {visibleSendError && (
              <div className="chat__send-error"><AlertCircle size={16} /><span>{visibleSendError}</span><button onClick={retryGeneration} disabled={busy || retryingGeneration}>{retryingGeneration ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />}{retryingGeneration ? "Retrying…" : "Retry"}</button></div>
            )}
            {replacementUndo && (
              <div className="chat__replacement-undo" role="status">
                <Check size={15}/><span>{replacementUndo.label} applied.</span>
                <button type="button" onClick={undoReplacement} disabled={busy}>Undo</button>
                <button type="button" onClick={()=>setReplacementUndo(null)} aria-label="Dismiss undo"><X size={13}/></button>
              </div>
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
        <button className={`chat__jump-bottom${unreadWhileReading ? " has-new" : ""}`} onClick={jumpToBottom} aria-label={unreadWhileReading ? `${unreadWhileReading} new message${unreadWhileReading === 1 ? "" : "s"}. Jump to latest.` : "Jump to latest message"} title="Jump to latest message">
          <ChevronDown size={20}/>
          {unreadWhileReading > 0 && <span>{unreadWhileReading > 9 ? "9+" : unreadWhileReading}</span>}
        </button>
      )}

      <div className="chat__polish-stack" aria-live="polite" aria-atomic="true">
        {aiStatusLabel && (
          <div className={`chat__ai-phase${aiStatusLabel === "Stopped" ? " is-stopped" : ""}`} role="status">
            {aiStatusLabel !== "Stopped" && <span className="chat__ai-phase-dot" />}<span>{aiStatusLabel}</span>
          </div>
        )}
        {actionNotice && (
          <div className={`chat__action-notice chat__action-notice--${actionNotice.tone}`} role="status">
            {actionNotice.tone === "working" ? <LoaderCircle className="spin" size={14}/> : actionNotice.tone === "error" ? <AlertCircle size={14}/> : <Check size={14}/>}
            <span>{actionNotice.text}</span>
          </div>
        )}
        {rewindUndo && (
          <div className="chat__rewind-undo" role="status">
            <Rewind size={14}/><span>Story rewound.</span><button type="button" onClick={undoRewind} disabled={busy}><RotateCcw size={13}/>Undo</button>
          </div>
        )}
      </div>

      {silentCue && <div className="chat__silent-cue" role="status"><Sparkles size={13}/><span>{silentCue}</span></div>}

      {typeof document !== "undefined" && replyAssistOpen && createPortal((
        <div className="reply-assist-backdrop" onPointerDown={(event)=>{ if(event.target===event.currentTarget) setReplyAssistOpen(false); }}>
          <section className="reply-assist-sheet" role="dialog" aria-modal="true" aria-label="Help me reply">
            <div className="reply-assist-grabber" />
            <header><div><strong>Help me reply</strong><small>Velvet reads the scene and helps you say it naturally in English.</small></div><button type="button" onClick={()=>setReplyAssistOpen(false)} aria-label="Close"><X size={18}/></button></header>
            <div className="reply-assist-modes">
              {[['understand','Explain it'],['ideas','Ideas'],['playful','Playful'],['dry','Dry'],['flirty','Flirty'],['direct','Direct']].map(([key,label])=><button type="button" key={key} className={replyAssistMode===key?'is-active':''} onClick={()=>requestReplyAssist(key)}>{label}</button>)}
            </div>
            {replyAssistUnderstanding && <div className="reply-assist-understanding"><strong>What did they mean?</strong><p>{replyAssistUnderstanding.literal_es}</p><p>{replyAssistUnderstanding.explanation_es}</p>{replyAssistUnderstanding.subtext_es && <small><b>Subtext:</b> {replyAssistUnderstanding.subtext_es}</small>}{Array.isArray(replyAssistUnderstanding.english_notes) && replyAssistUnderstanding.english_notes.length>0 && <div className="reply-assist-english-notes">{replyAssistUnderstanding.english_notes.slice(0,3).map((note,i)=><span key={i}><b>{note.phrase}</b> = {note.meaning_es}</span>)}</div>}</div>}
            <div className="reply-assist-custom">
              <input value={replyAssistCustom} onChange={(e)=>setReplyAssistCustom(e.target.value)} placeholder="Or tell Velvet in Spanish: quiero coquetear pero que no sea obvio…" />
              <button type="button" disabled={!replyAssistCustom.trim() || replyAssistLoading} onClick={()=>requestReplyAssist('custom')}><Sparkles size={15}/> Ask</button>
            </div>
            {!replyAssistOptions.length && !replyAssistLoading && !replyAssistError && <button type="button" className="reply-assist-generate" onClick={()=>requestReplyAssist('ideas')}><WandSparkles size={16}/> Give me ideas</button>}
            {replyAssistLoading && <div className="reply-assist-status"><LoaderCircle className="is-spinning" size={17}/> Thinking about this scene…</div>}
            {replyAssistError && <div className="reply-assist-error">{replyAssistError}<button type="button" onClick={()=>requestReplyAssist(replyAssistMode)}>Retry</button></div>}
            {!!replyAssistOptions.length && <>
              <div className="reply-assist-options">{replyAssistOptions.map((option,index)=><button type="button" className="reply-assist-option" key={`${option.text}-${index}`} onClick={()=>applyReplyAssistOption(option.text)}><span className="reply-assist-option-top"><b>{option.text}</b><em>{option.tone}</em></span><small>{option.meaning_es}</small></button>)}</div>
              <button type="button" className="reply-assist-more" disabled={replyAssistLoading} onClick={()=>requestReplyAssist('more')}>{replyAssistLoading ? <LoaderCircle className="is-spinning" size={15}/> : <RefreshCw size={15}/>} Generate more</button>
            </>}
            <p className="reply-assist-hint">Choose one and the suggestions disappear. Nothing is sent automatically.</p>
          </section>
        </div>
      ), document.body)}

      {typeof document !== "undefined" && createPortal((
      <form className={`chat__composer${replyTo ? " chat__composer--replying" : ""}${experienceState?.composer?.compact ? " chat__composer--experience-compact" : ""}`} onSubmit={handleSubmit}>
        {replyTo && (
          <div className="chat__reply-draft">
            <Reply size={15} />
            <div><small>Replying to {replyTo.sender === "user" ? "your message" : character.name}</small><span>{replyTo.content}</span></div>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={16} /></button>
          </div>
        )}
                <input ref={sceneImageInputRef} className="chat__scene-file-input" type="file" accept="image/*" multiple onChange={handleSceneImages} />
        {memoryCaptureNotice > 0 && (
          <div className="chat__memory-capture-notice" role="status">
            <Brain size={13}/><span>{memoryCaptureNotice} important {memoryCaptureNotice === 1 ? "memory" : "memories"} captured</span>
          </div>
        )}

        {(message.trim() || offlineQueueSize > 0) && (
          <div className="v312-composer-state" aria-live="polite">
            {offlineQueueSize > 0 ? <button type="button" onClick={()=>flushOfflineQueue?.()}><WifiOff size={11}/>{offlineQueueSize} queued</button> : null}
            {message.trim() ? <span>Draft saved{draftSavedAt ? "" : ""}</span> : null}
          </div>
        )}

        {directorNote.trim() && !directorNoteOpen && (
          <div className="chat__director-active" role="status" title={directorNote}>
            <Sparkles size={12}/><span>Next beat: {directorNote}</span>
            <button type="button" onClick={clearQueuedDirector} aria-label="Clear queued direction"><X size={12}/></button>
          </div>
        )}
        {experienceState?.composer?.quickTools && <button type="button" className="chat__experience-trigger" onClick={()=>setExperienceOpen(true)} aria-label="Open Velvet Experience" title="Velvet Experience"><WandSparkles size={15}/><span>Studio</span></button>}
        <button type="button" className={`chat__reply-assist-trigger${replyAssistOpen ? " is-active" : ""}`} onClick={()=>{ setReplyAssistOpen((value)=>!value); setReplyAssistError(""); }} aria-label="Help me reply" title="Help me reply"><WandSparkles size={16}/><span>Reply</span></button>
        <button type="button" className={`chat__director-trigger${storyPathsOpen ? " is-active" : ""}`} onClick={openStoryPaths} aria-label="What happens next?" title="What happens next?"><GitBranch size={15}/><span>Next</span></button>
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
            onClick={handleStop}
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
      ), document.body)}

      {storyPathsOpen && typeof document !== "undefined" && createPortal((
        <div className="reply-assist-backdrop" onPointerDown={(event)=>{ if(event.target===event.currentTarget) setStoryPathsOpen(false); }}>
          <section className="reply-assist-sheet" role="dialog" aria-modal="true" aria-label="What happens next?">
            <div className="reply-assist-grabber" />
            <header className="reply-assist-header"><div><span><GitBranch size={15}/> STORY PATHS</span><h2>What happens next?</h2><p>Pick a direction. Velvet uses it quietly for the next reply, without writing your character for you.</p></div><button type="button" onClick={()=>setStoryPathsOpen(false)} aria-label="Close"><X size={19}/></button></header>
            {storyPathsLoading && <div className="reply-assist-status"><LoaderCircle className="is-spinning" size={17}/> Reading the scene…</div>}
            {storyPathsError && <div className="reply-assist-error">{storyPathsError}<button type="button" onClick={requestStoryPaths}>Retry</button></div>}
            {!!storyPaths.length && <div className="reply-assist-options">{storyPaths.map((path,index)=><button type="button" className="reply-assist-option" key={`${path.title}-${index}`} onClick={()=>chooseStoryPath(path)}><span className="reply-assist-option-top"><b>{path.title}</b><em>{path.vibe}</em></span><small>{path.preview}</small></button>)}</div>}
            {!!storyPaths.length && <button type="button" className="reply-assist-more" disabled={storyPathsLoading} onClick={requestStoryPaths}>{storyPathsLoading ? <LoaderCircle className="is-spinning" size={15}/> : <RefreshCw size={15}/>} Different paths</button>}
            <p className="reply-assist-hint">Nothing happens until you choose. Your choice only guides the next character beat.</p>
          </section>
        </div>
      ), document.body)}

      <MemoryBookDrawer
        open={memoryBookOpen}
        onClose={() => setMemoryBookOpen(false)}
        character={character}
        conversationId={conversation?.conversationId}
      />

      <StorySafeStudioDrawer
        open={safeStudioOpen}
        onClose={() => setSafeStudioOpen(false)}
        character={character}
        conversation={conversation}
        messages={visibleMessages}
        sceneImages={sceneImages}
        onJumpToMessage={(id) => { setSafeStudioOpen(false); jumpToStoryMessage(id); }}
        onOpenMemoryBook={() => { setSafeStudioOpen(false); setMemoryBookOpen(true); }}
        onOpenTimeline={() => { setSafeStudioOpen(false); setTimelineOpen(true); handleRefreshTimeline(); }}
      />

      <LivingWorldDrawer
        open={livingWorldOpen}
        onClose={() => setLivingWorldOpen(false)}
        character={character}
        conversation={conversation}
        messages={visibleMessages}
        sceneImages={sceneImages}
        offlineQueueSize={offlineQueueSize}
        onOpenWorldStudio={() => { setLivingWorldOpen(false); setWorldStudioOpen(true); }}
        onOpenStoryHub={() => { setLivingWorldOpen(false); setStoryHubOpen(true); refreshStoryMetadata(character.id).catch(() => {}); }}
        onOpenTimeline={() => { setLivingWorldOpen(false); setTimelineOpen(true); handleRefreshTimeline(); }}
        onOpenDiagnostics={() => { setLivingWorldOpen(false); onOpenDiagnostics?.(); }}
      />

      <VelvetExperienceDrawer
        open={experienceOpen}
        onClose={() => setExperienceOpen(false)}
        character={character}
        conversation={conversation}
        messages={visibleMessages}
        onJumpToMessage={(id) => { setExperienceOpen(false); jumpToStoryMessage(id); }}
        onOpenMemoryBook={() => { setExperienceOpen(false); setMemoryBookOpen(true); }}
        onOpenTimeline={() => { setExperienceOpen(false); setTimelineOpen(true); handleRefreshTimeline(); }}
        onOpenLivingWorld={() => { setExperienceOpen(false); setLivingWorldOpen(true); }}
        onQueueDirector={(note) => { setExperienceOpen(false); setDirectorNote(note); setDirectorMode("next"); showActionNotice("Next beat queued ✓"); }}
        onThemeChange={applyStoryTheme}
      />

      <PanelErrorBoundary label="Timeline" onReset={() => setTimelineOpen(false)}>
        <StoryTimelineDrawer
          open={timelineOpen}
          onClose={() => setTimelineOpen(false)}
          conversation={conversation}
          onRefresh={handleRefreshTimeline}
          refreshing={refreshingTimeline}
          onJumpToMessage={jumpToStoryMessage}
        />
      </PanelErrorBoundary>

      <PanelErrorBoundary label="Story Hub" onReset={() => setStoryHubOpen(false)}>
        <StoryHubDrawer
          open={storyHubOpen}
          onClose={() => setStoryHubOpen(false)}
          character={character}
          characters={characters}
          persona={personas.find((item) => item.id === conversation?.personaId) || null}
          lorebook={lorebooks.find((item) => item.id === conversation?.lorebookId) || null}
          onJumpToMessage={jumpToStoryMessage}
          onOpenConversation={openStoryConversation}
        />
      </PanelErrorBoundary>

      {catchUpOpen && conversation?.storyRecap && typeof document !== "undefined" && createPortal((
        <div className="catchup-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCatchUpOpen(false)}>
          <section className="catchup-card" role="dialog" aria-modal="true" aria-label="Catch me up">
            <small>WELCOME BACK</small>
            <h2>Last time in this story…</h2>
            <p>{conversation.storyRecap}</p>
            {conversation.unfinishedThreads?.length > 0 && <div className="catchup-threads"><strong>Still unresolved</strong>{conversation.unfinishedThreads.slice(0,3).map((thread,index)=><span key={thread.id || index}>{thread.title || thread.label || thread}</span>)}</div>}
            <footer>
              <button onClick={() => { setCatchUpOpen(false); dismissCatchUp(character.id); setTimelineOpen(true); }}>Timeline</button>
              <button onClick={() => { setCatchUpOpen(false); dismissCatchUp(character.id); setMemoryBookOpen(true); }}>Memories</button>
              <button className="primary" onClick={() => { setCatchUpOpen(false); dismissCatchUp(character.id); try { sessionStorage.setItem(`velvet_catchup_${conversation.conversationId}`, "1"); } catch {} }}>Continue</button>
            </footer>
          </section>
        </div>
      ), document.body)}

      <PanelErrorBoundary label="Canon Doctor" onReset={() => setCanonDoctorOpen(false)}>
        <CanonDoctorSheet
          open={canonDoctorOpen}
          onClose={() => !canonDoctorApplying && setCanonDoctorOpen(false)}
          report={canonDoctorReport}
          loading={canonDoctorLoading}
          applying={canonDoctorApplying}
          error={canonDoctorError}
          applied={canonDoctorApplied}
          onRepair={repairCanonDoctor}
          onRescan={scanCanonDoctor}
        />
      </PanelErrorBoundary>

      <MessageQualitySheet open={Boolean(qualityMessage)} message={qualityMessage} character={character} onClose={()=>setQualityMessage(null)} onRate={rateQuality} />

      <PanelErrorBoundary label="Relationship" onReset={() => setRelationshipOpen(false)}>
        <RelationshipDrawer
          open={relationshipOpen}
          onClose={() => setRelationshipOpen(false)}
          character={relationshipCharacter || character}
          characters={characters}
          persona={personas.find((item) => item.id === conversation?.personaId) || null}
          conversation={conversation}
        />
      </PanelErrorBoundary>

      <PanelErrorBoundary label="NPC Cast" onReset={() => setNpcCastOpen(false)}>
        <NpcCastDrawer
          open={npcCastOpen}
          onClose={() => setNpcCastOpen(false)}
          conversationId={conversation?.conversationId}
          character={character}
          groupCharacters={groupCast}
          userName={personas.find((item) => item.id === conversation?.personaId)?.name || "You"}
          disabled={busy}
        />
      </PanelErrorBoundary>

      <PanelErrorBoundary label="World Studio" onReset={() => setWorldStudioOpen(false)}>
        <StoryWorldDrawer open={worldStudioOpen} onClose={()=>setWorldStudioOpen(false)} conversationId={conversation?.conversationId}/>
      </PanelErrorBoundary>

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
                <section className={`chat-controls__simple-section chat-controls__mature${controlDraft.matureMode ? " is-active" : ""}`}>
                  <span><Flame size={17}/><strong>NSFW / Mature mode</strong><em>18+</em></span>
                  <p>Lets adult characters use stronger chemistry, mature language and non-graphic intimacy. Explicit sexual detail still fades to black.</p>
                  <label className="chat-controls__mature-switch"><input type="checkbox" checked={Boolean(controlDraft.matureMode)} onChange={(event)=>toggleMatureMode(event.target.checked)} disabled={savingControls}/><i/><b>{controlDraft.matureMode ? "On" : "Off"}</b></label>
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
                <section className="chat-controls__simple-section v312-story-palette">
                  <span><Palette size={17}/><strong>Story palette</strong></span>
                  <p>A tiny atmosphere shift for this story only. Velvet's burgundy identity stays intact.</p>
                  <div className="v312-story-palette__options">
                    {STORY_THEMES.map((option)=><button type="button" key={option.id} className={storyTheme===option.id?"active":""} onClick={()=>applyStoryTheme(option.id)} style={{"--story-palette-accent":option.accent}}><i/><span>{option.label}<small>{option.description}</small></span></button>)}
                  </div>
                </section>
                <section className="chat-controls__simple-section">
                  <span><Eye size={17}/><strong>Reading light</strong></span>
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
                <label className={`chat-controls__advanced-mature${controlDraft.matureMode ? " is-active" : ""}`}><span><Flame size={17}/><span><strong>NSFW / Mature mode</strong><small>Adult themes, stronger chemistry and non-graphic intimacy. Explicit sexual detail fades to black.</small></span></span><input type="checkbox" checked={Boolean(controlDraft.matureMode)} onChange={(event)=>setControlDraft((current)=>({ ...current, matureMode:event.target.checked }))}/><i/></label>
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
                {character.imageUrl ? <img src={character.imageUrl} alt="" decoding="async" /> : character.initials}
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
        <div className="message-sheet-backdrop" onPointerDown={(event) => event.target === event.currentTarget && closeActions()}>
          <section className="message-sheet" data-action-mode={actionMode} role="dialog" aria-modal="true" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <small>{selectedMessage.sender === "user" ? "YOUR MESSAGE" : character.name.toUpperCase()}</small>
                <strong>{actionTitle(actionMode)}</strong>
              </div>
              <button onClick={closeActions} disabled={actionLoading}><X size={20} /></button>
            </header>

            {actionMode === "menu" && (
              <div className="message-sheet__refine-menu v34910-message-actions">
                <div className="v34910-message-actions__handle" aria-hidden="true" />
                <div className="v34910-message-actions__quick" aria-label="Quick message actions">
                  <button type="button" onClick={() => runAction("copy")}><Copy size={17}/><span>Copy</span></button>
                  {selectedMessage.sender === "user" ? (
                    <button type="button" onClick={() => { setActionDraft(selectedMessage.content); setActionMode("edit"); }}><Pencil size={17}/><span>Edit</span></button>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => { setActionDraft(""); setRegenerationFeedback([]); setFeedbackOnly(false); setActionMode("regenerate"); }}><RefreshCw size={17}/><span>Regenerate</span></button>
                  )}
                  <button type="button" onClick={() => runAction("memory")}><BookmarkPlus size={17}/><span>Memory</span></button>
                  <button type="button" onClick={() => setActionMode("more")}><MoreHorizontal size={17}/><span>More</span></button>
                </div>
                {!conversation?.groupMode && (
                  <button type="button" className="message-sheet__branch-feature message-sheet__open-character" onClick={openCharacterFromMessageActions}>
                    <UserRound size={19} />
                    <span><strong>Open character</strong><small>Cover, profile & character details</small></span>
                  </button>
                )}
                {selectedMessage.sender === "character" ? (
                  <>
                    <p className="message-sheet__refine-note">
                      What went wrong? Velvet will use the reason now and learn it globally after you choose it twice.
                    </p>

                    <div className="message-sheet__refine-grid message-sheet__refine-grid--smart">
                      <button disabled={busy} onClick={() => quickRefineSelected("wrong_continuity")}><Clock3 size={18}/><span>Wrong continuity</span></button>
                      <button disabled={busy} onClick={() => quickRefineSelected("out_of_character")}><UserRound size={18}/><span>Out of character</span></button>
                      <button disabled={busy} onClick={() => quickRefineSelected("too_cold")}><HeartHandshake size={18}/><span>Too cold</span></button>
                      <button disabled={busy} onClick={() => quickRefineSelected("too_romantic")}><Flame size={18}/><span>Too romantic</span></button>
                      <button disabled={busy} onClick={() => quickRefineSelected("not_enough_dialogue")}><MessageSquareQuote size={18}/><span>More dialogue</span></button>
                      <button disabled={busy} onClick={() => quickRefineSelected("repetitive")}><RefreshCw size={18}/><span>Repetitive</span></button>
                    </div>

                    <button
                      className="message-sheet__branch-feature"
                      onClick={(event) => runAction("rewind", event)}
                      disabled={busy}
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
                      <button onClick={() => runAction("quote")}><MessageSquareQuote size={16} /><span>Quote</span></button>
                      <button onClick={() => runAction("copy")}><Copy size={16} /><span>Copy</span></button>
                      <button onClick={() => setActionMode("more")}><MoreHorizontal size={16} /><span>More</span></button>
                    </div>
                  </>
                ) : (
                  <div className="message-sheet__user-menu">
                    <button className="message-sheet__branch-feature" onClick={(event) => runAction("rewind", event)} disabled={busy}>
                      <Rewind size={19} />
                      <span><strong>Rewind to here</strong><small>Keep this message and remove everything that came after it.</small></span>
                    </button>
                    <div className="message-sheet__refine-secondary">
                      <button onClick={() => { setActionDraft(selectedMessage.content); setActionMode("edit"); }}><Pencil size={16}/><span>Edit</span></button>
                      <button onClick={() => runAction("quote")}><MessageSquareQuote size={16}/><span>Quote</span></button>
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
                <button onClick={() => runAction("bookmark")}><Star size={17} /><span>{selectedMessage.isBookmarked ? "Remove saved moment" : "Save moment"}</span></button>
                {selectedMessage.sender === "character" && (
                  <button onClick={() => { const message = selectedMessage; closeActionsAfterAction(); openQualityMonitor(message); }}><Sparkles size={17}/><span>Quality check</span></button>
                )}
                <button onClick={() => { setActionDraft(""); setActionMode("correct-canon"); }}><ShieldCheck size={17}/><span>Correct canon</span></button>
                <button onClick={() => runAction("quote")}><MessageSquareQuote size={17} /><span>Quote</span></button>
                <button onClick={() => { setActionDraft(`${conversation?.title || character.name} · branch`); setActionMode("branch"); }}><GitBranch size={17} /><span>Branch from here</span></button>
                <button className="danger" onClick={() => runAction("delete")} disabled={busy}><Trash2 size={17} /><span>Delete</span></button>
                <button className="message-sheet__back" onClick={() => setActionMode("menu")}><ArrowLeft size={17} /><span>Back</span></button>
              </div>
            )}

            {actionMode === "branch" && (
              <div className="message-sheet__editor">
                <p>Create a new timeline that keeps this message and everything before it. The original story stays untouched.</p>
                <input value={actionDraft} maxLength={80} onChange={(event) => setActionDraft(event.target.value)} placeholder="Branch name" autoFocus />
                <button onClick={createBranchFromSelected} disabled={busy || actionLoading || !actionDraft.trim()}>
                  {actionLoading ? <LoaderCircle className="spin" size={17} /> : <GitBranch size={17} />}
                  Create branch
                </button>
              </div>
            )}

            {actionMode === "correct-canon" && (
              <div className="message-sheet__editor">
                <p>State what is actually true. This becomes higher authority than derived positions and memories, but it will never be spoken as your character's dialogue.</p>
                <textarea value={actionDraft} onChange={(event)=>setActionDraft(event.target.value)} rows="5" placeholder="Example: I never left the living room. Chase is still beside the patio doors." autoFocus/>
                <button onClick={saveCanonCorrection} disabled={busy||!actionDraft.trim()||actionLoading}>{actionLoading?<LoaderCircle className="spin" size={17}/>:<ShieldCheck size={17}/>}Save canon correction</button>
              </div>
            )}

            {actionMode === "edit" && (
              <div className="message-sheet__editor">
                <p>Everything after this message will be regenerated.</p>
                <textarea value={actionDraft} onChange={(event) => setActionDraft(event.target.value)} rows="6" autoFocus />
                <button onClick={saveEditedMessage} disabled={busy || !actionDraft.trim() || actionLoading}>
                  {actionLoading ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
                  Save and regenerate
                </button>
              </div>
            )}

            {actionMode === "edit-ai" && (
              <div className="message-sheet__editor">
                <p>Edit only what you want. Later messages stay in place, and Velvet will rebuild hidden continuity from the visible story. Your previous wording is saved as an alternative.</p>
                <textarea value={actionDraft} onChange={(event) => setActionDraft(event.target.value)} rows="7" autoFocus />
                <button onClick={saveEditedAIResponse} disabled={busy || !actionDraft.trim() || actionLoading}>
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
                {!feedbackOnly && <div className="message-sheet__style-presets" aria-label="Regeneration style presets">
                  {[
                    ["More dialogue", "Use more natural audible dialogue and less descriptive filler."],
                    ["Less description", "Cut descriptive padding. Keep only concrete details that change the beat."],
                    ["More tension", "Increase grounded interpersonal tension without melodrama, dominance speeches or forced romance."],
                    ["Softer", "Make the response warmer and gentler without becoming sentimental or out of character."],
                    ["More direct", "Answer more directly. Fewer rhetorical questions, evasive flourishes and scripted banter."],
                    ["Continue naturally", "Continue from the exact physical and conversational beat with no reset, recap or forced escalation."],
                  ].map(([label, instruction]) => <button type="button" key={label} onClick={() => setActionDraft(instruction)}>{label}</button>)}
                </div>}
                {!feedbackOnly && <textarea
                    value={actionDraft}
                    onChange={(event) => setActionDraft(event.target.value)}
                    placeholder="Optional direction, e.g. He feels the confession strongly but hides it behind a joke. Don't make him leave."
                    rows="4"
                    autoFocus
                  />}
                <button onClick={regenerate} disabled={actionLoading || (!feedbackOnly && busy) || (feedbackOnly && !regenerationFeedback.length)}>
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
                ) : <><div className="message-sheet__branch-heading"><strong>Branch Compare</strong><span>Compare the preserved versions side by side, then choose the one that becomes canon.</span></div><div className="message-sheet__branch-compare">{alternatives.map((alternative, index) => (
                  <button key={alternative.id} onClick={() => chooseAlternative(alternative)} disabled={busy || actionLoading}>
                    <small>{alternative.current ? "CURRENT" : `VERSION ${index + 1}`}</small>
                    <span>{alternative.content}</span><b>{alternative.current ? "Current canon" : "Use this version"}</b>
                  </button>
                ))}</div></>}
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
  const longPressTimerRef = useRef(0);
  const longPressStartRef = useRef(null);
  const canSwipe =
    message.sender === "character" &&
    !message.isStreaming &&
    versionNavigationEnabled &&
    !swipeDisabled;
  const canLongPress = !message.isStreaming;

  function resetSwipeGesture() {
    swipeGestureRef.current = null;
  }

  function shouldIgnoreSwipeTarget(target) {
    return Boolean(target?.closest?.(
      "button, a, input, textarea, select, [role='button'], [contenteditable='true']"
    ));
  }

  function handleTouchStart(event) {
    if ((!canSwipe && !canLongPress) || event.touches.length !== 1 || shouldIgnoreSwipeTarget(event.target)) {
      resetSwipeGesture();
      return;
    }

    const touch = event.touches[0];
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const edgeGuard = 28;

    if (canSwipe && touch.clientX > edgeGuard && (!viewportWidth || touch.clientX < viewportWidth - edgeGuard)) {
      swipeGestureRef.current = { startX: touch.clientX, startY: touch.clientY, lastX: touch.clientX, lastY: touch.clientY, axis: null };
    } else {
      resetSwipeGesture();
    }

    if (canLongPress) {
      longPressStartRef.current = { x: touch.clientX, y: touch.clientY };
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = window.setTimeout(() => {
        suppressTapRef.current = true;
        velvetHaptic("selection");
        onOpenActions(message);
        window.setTimeout(() => { suppressTapRef.current = false; }, 360);
      }, 430);
    }
  }

  function handleTouchMove(event) {
    const gesture = swipeGestureRef.current;
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    if (longPressStartRef.current && (Math.abs(touch.clientX-longPressStartRef.current.x) > 10 || Math.abs(touch.clientY-longPressStartRef.current.y) > 10)) {
      window.clearTimeout(longPressTimerRef.current);
      longPressStartRef.current = null;
    }
    if (!gesture) return;
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
    window.clearTimeout(longPressTimerRef.current);
    longPressStartRef.current = null;
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
    if (suppressTapRef.current || message.isStreaming || shouldIgnoreSwipeTarget(event.target)) return;
    if (!shouldOpenMessageActionsOnTap()) return;
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
  const hasMultipleVersions = Boolean(versionState?.loaded && versionCount > 1);

  return (
    <article
      data-message-id={message.id}
      data-hold-actions={!message.isStreaming ? "true" : "false"}
      className={`chat-message chat-message--${message.sender}${message.isStreaming ? " chat-message--streaming" : ""}${message.isBookmarked ? " chat-message--bookmarked" : ""}${message.isOfflinePending ? " chat-message--offline-pending" : message.isPending ? " chat-message--pending" : ""}${canSwipe ? " chat-message--swipeable" : ""}`}
      onTouchStart={(canSwipe || canLongPress) ? handleTouchStart : undefined}
      onTouchMove={(canSwipe || canLongPress) ? handleTouchMove : undefined}
      onTouchEnd={(canSwipe || canLongPress) ? handleTouchEnd : undefined}
      onTouchCancel={() => { window.clearTimeout(longPressTimerRef.current); longPressStartRef.current = null; resetSwipeGesture(); }}
      onClick={handleMessageTap}
      onContextMenu={(event) => { event.preventDefault(); onOpenActions(message); }}
    >
      <div className="chat-message__swipe-content">
        {message.sender === "character" && <span className="chat-message__avatar" style={{ "--character-color": character.color }}>
          {character.imageUrl ? <img src={character.imageUrl} alt="" decoding="async" /> : character.initials}
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
            <div className={`chat-message__version-nav${hasMultipleVersions ? " is-multiple" : " is-single"}`} onPointerDown={(event) => event.stopPropagation()}>
              {hasMultipleVersions ? (
                <>
                  <button
                    type="button"
                    className="chat-message__version-arrow"
                    onClick={(event) => { event.stopPropagation(); onVersionNavigate(message, -1); }}
                    aria-label="Previous response"
                    disabled={swipeDisabled || versionState?.loading || !canGoPrevious}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="chat-message__version-count">{versionIndex + 1} / {versionCount}</span>
                  <button
                    type="button"
                    className="chat-message__version-arrow"
                    onClick={(event) => { event.stopPropagation(); onVersionNavigate(message, 1); }}
                    aria-label={versionIndex < versionCount - 1 ? "Next response" : "Generate another response"}
                    disabled={swipeDisabled || versionState?.loading}
                  >
                    {versionState?.loading ? <LoaderCircle className="spin" size={14} /> : <ChevronRight size={16} />}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="chat-message__version-arrow chat-message__version-arrow--new"
                  onClick={(event) => { event.stopPropagation(); onVersionNavigate(message, 1); }}
                  aria-label="Generate another response"
                  title="Another response"
                  disabled={swipeDisabled || versionState?.loading}
                >
                  {versionState?.loading ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />}
                </button>
              )}
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
          {message.isOfflinePending && <small className="v312-message-pending"><WifiOff size={11}/>Queued until you're online</small>}
          {!message.isOfflinePending && message.isPending && <small className="v312-message-pending">Sending…</small>}
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

function isReplyGenerationErrorMessage(value = "") {
  const text = String(value || "").toLowerCase();
  return (
    text.includes("couldn't finish this reply") ||
    text.includes("couldn’t finish this reply") ||
    text.includes("lost the connection before the reply finished") ||
    text.includes("response stream stalled") ||
    text.includes("response ended before it could be saved") ||
    text.includes("character couldn't respond") ||
    text.includes("character couldn’t respond") ||
    text.includes("still finishing this reply in the background")
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
  if (error.includes("quota") || error.includes("rate limit") || error.includes("rate-limited") || error.includes("resource_exhausted")) return "Gemini's quota is exhausted right now. Retrying the same reply won't work until quota is available again.";
  if (error.includes("high demand") || error.includes("overload") || error.includes("unavailable") || error.includes("503") || error.includes("502") || error.includes("504")) return "Velvet couldn't finish this reply right now. Retry in a moment.";
  if (error.includes("network") || error.includes("failed to fetch")) return "Velvet lost the connection before the reply finished. Retry.";
  if (error.includes("protected interaction beat") || error.includes("valid protected reply") || error.includes("repair still violated")) return "Velvet couldn't finish that reply cleanly. Try again.";
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
