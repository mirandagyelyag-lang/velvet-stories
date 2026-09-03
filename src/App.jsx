import { lazy, Suspense, useEffect, useRef, useState } from "react";

import Sidebar from "./components/Sidebar";
import { useAuth } from "./context/AuthContext";
import Auth from "./pages/Auth";
import PWAStatus from "./components/PWAStatus";
import { useChats } from "./context/ChatsContext";
import { useCharacters } from "./context/CharactersContext";
import WelcomeSplash from "./components/WelcomeSplash";
import NativePortalLaunch from "./components/NativePortalLaunch";
import { isVelvetNativeRuntime } from "./native/velvetNative";
import "./App.css";
import "./styles/velvet-unified.css";
import "./styles/velvet-v17.css";
import "./styles/velvet-v3153-portal-launch.css";

const routeImports = {
  stories: () => import("./pages/Chats"),
  discover: () => import("./pages/MyCharacters"),
  chat: () => import("./pages/Chat"),
  detail: () => import("./pages/CharacterDetail"),
  pulse: () => import("./pages/Pulse"),
  memories: () => import("./pages/Memories"),
  profile: () => import("./pages/Profile"),
  personas: () => import("./pages/Personas"),
  lorebooks: () => import("./pages/Lorebooks"),
  settings: () => import("./pages/Settings"),
  diagnostics: () => import("./pages/Diagnostics"),
  search: () => import("./pages/Search"),
  studio: () => import("./components/CreateCharacterModal"),
};
const Chats = lazy(routeImports.stories);
const MyCharacters = lazy(routeImports.discover);
const Chat = lazy(routeImports.chat);
const CharacterDetail = lazy(routeImports.detail);
const Pulse = lazy(routeImports.pulse);
const Memories = lazy(routeImports.memories);
const Profile = lazy(routeImports.profile);
const Personas = lazy(routeImports.personas);
const Lorebooks = lazy(routeImports.lorebooks);
const Settings = lazy(routeImports.settings);
const Diagnostics = lazy(routeImports.diagnostics);
const SearchPage = lazy(routeImports.search);
const CreateCharacterModal = lazy(routeImports.studio);

const VELVET_PAGES = new Set([
  "characters",
  "chats",
  "pulse",
  "memories",
  "personas",
  "lorebooks",
  "profile",
  "settings",
  "diagnostics",
  "search",
]);

const VELVET_LAST_LOCATION_KEY = "velvet:last-location:v1";

function readStoredVelvetLocation() {
  try {
    const stored = JSON.parse(localStorage.getItem(VELVET_LAST_LOCATION_KEY) || "null");
    if (!stored || typeof stored !== "object") return null;
    if (stored.mode === "chat" && stored.characterId) return stored;
    if (stored.mode === "character" && stored.characterId) return stored;
    if (stored.mode === "page" && VELVET_PAGES.has(stored.page)) return stored;
  } catch {}
  return null;
}

function persistVelvetLocation(location) {
  try {
    localStorage.setItem(VELVET_LAST_LOCATION_KEY, JSON.stringify({
      mode: location.mode || "page",
      page: location.page || "chats",
      characterId: location.characterId || null,
      conversationId: location.conversationId || null,
      messageId: location.messageId || null,
    }));
  } catch {}
}

function getRouteScrollOwner() {
  if (typeof document === "undefined") return null;
  return document.scrollingElement;
}

function scrollRouteTo(top = 0, behavior = "auto") {
  const owner = getRouteScrollOwner();
  const safeTop = Number.isFinite(Number(top)) ? Number(top) : 0;
  if (owner) {
    owner.scrollTo({ top: safeTop, behavior });
    return;
  }
  window.scrollTo({ top: safeTop, behavior });
}

function savePageScroll(page) {
  if (!page || typeof sessionStorage === "undefined") return;
  const owner = getRouteScrollOwner();
  const top = owner ? owner.scrollTop : (window.scrollY || 0);
  try { sessionStorage.setItem(`velvet_page_scroll_${page}`, String(top)); } catch {}
}

function restorePageScroll(page, fallback = 0) {
  if (!page || typeof sessionStorage === "undefined") return;
  let top = fallback;
  try { top = Number(sessionStorage.getItem(`velvet_page_scroll_${page}`) || fallback); } catch {}
  requestAnimationFrame(() => requestAnimationFrame(() => scrollRouteTo(Number.isFinite(top) ? top : fallback, "auto")));
}

function readVelvetLocation() {
  const params = new URLSearchParams(window.location.search);
  const rawRequested = params.get("open");
  const requested = rawRequested === "inbox" ? "pulse" : rawRequested;

  if (requested === "chat") {
    return {
      mode: "chat",
      page: "chats",
      characterId: params.get("character"),
      conversationId: params.get("conversation"),
      messageId: params.get("message"),
    };
  }

  if (requested === "character") {
    const from = params.get("from");
    return {
      mode: "character",
      page: VELVET_PAGES.has(from) ? from : "characters",
      characterId: params.get("character"),
      conversationId: null,
      messageId: null,
    };
  }

  if (!rawRequested) {
    const stored = readStoredVelvetLocation();
    if (stored) return stored;
  }

  return {
    mode: "page",
    page: VELVET_PAGES.has(requested) ? requested : "chats",
    characterId: null,
    conversationId: null,
    messageId: null,
  };
}

function buildVelvetUrl({ mode = "page", page = "chats", characterId = null, conversationId = null, messageId = null }) {
  const params = new URLSearchParams();

  if (mode === "chat" && characterId) {
    params.set("open", "chat");
    params.set("character", characterId);
    if (conversationId) params.set("conversation", conversationId);
    if (messageId) params.set("message", messageId);
  } else if (mode === "character" && characterId) {
    params.set("open", "character");
    params.set("character", characterId);
    params.set("from", VELVET_PAGES.has(page) ? page : "characters");
  } else {
    params.set("open", VELVET_PAGES.has(page) ? page : "chats");
  }

  return `${window.location.pathname}?${params.toString()}`;
}

function App() {
  const nativeRuntime = isVelvetNativeRuntime();
  const { user, authLoading } = useAuth();
  const { createNewConversation } = useChats();
  const { characters, charactersLoading } = useCharacters();
  const initialNavigation = useRef(readVelvetLocation());
  const charactersRef = useRef(characters);
  const restoredLocationRef = useRef(false);
  const [activePage, setActivePage] = useState(() => initialNavigation.current.page);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [remixSource, setRemixSource] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [previewCharacter, setPreviewCharacter] = useState(null);
  const [memoryFocusCharacterId, setMemoryFocusCharacterId] = useState("");
  const [nativeLaunchSettled, setNativeLaunchSettled] = useState(!nativeRuntime);

  useEffect(() => {
    if (!nativeRuntime) return undefined;
    const timer = window.setTimeout(() => setNativeLaunchSettled(true), 6600);
    return () => window.clearTimeout(timer);
  }, [nativeRuntime]);

  useEffect(() => {
    if (!nativeRuntime) return;

    window.__VELVET_ANDROID_BACK__ = () => {
      if (creatorOpen) {
        setCreatorOpen(false);
        setEditingCharacter(null);
        setRemixSource(null);
        return true;
      }

      if (selectedCharacter || previewCharacter || activePage !== "chats") {
        const state = window.history.state;
        if (state?.velvetNavigation && window.history.length > 1) {
          window.history.back();
        } else {
          navigate("chats", { replace: true });
        }
        return true;
      }

      return false;
    };

    return () => {
      delete window.__VELVET_ANDROID_BACK__;
    };
  }, [creatorOpen, selectedCharacter, previewCharacter, activePage, nativeRuntime]);

  useEffect(() => {
    charactersRef.current = characters;
  }, [characters]);

  useEffect(() => {
    if (authLoading || !user) return;
    const preload = () => {
      const likelyRoutes = activePage === "chats"
        ? [routeImports.chat, routeImports.discover, routeImports.memories]
        : [routeImports.stories, routeImports.chat, routeImports.profile];
      likelyRoutes.forEach((load) => load().catch(() => {}));
    };
    const idleId = window.requestIdleCallback?.(preload, { timeout: 1600 });
    const timerId = idleId == null ? window.setTimeout(preload, 700) : null;
    return () => {
      if (idleId != null) window.cancelIdleCallback?.(idleId);
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [authLoading, user, activePage]);

  useEffect(() => {
    const currentState = window.history.state;
    const locationState = readVelvetLocation();

    if (!currentState?.velvetNavigation) {
      window.history.replaceState(
        {
          velvetNavigation: true,
          mode: locationState.mode,
          page: locationState.page,
          character: null,
          characterId: locationState.characterId,
          conversationId: locationState.conversationId,
          messageId: locationState.messageId || null,
        },
        "",
        buildVelvetUrl(locationState)
      );
    }

    function handleBrowserBack(event) {
      const state = event.state?.velvetNavigation ? event.state : readVelvetLocation();
      const availableCharacters = charactersRef.current || [];
      const character =
        state.character ||
        (state.characterId
          ? availableCharacters.find((item) => item.id === state.characterId) || null
          : null);

      if (state.mode === "chat" && character) {
        setActivePage("chats");
        setSelectedCharacter(character);
        setSelectedConversationId(state.conversationId || null);
        setSelectedMessageId(state.messageId || null);
        setPreviewCharacter(null);
      } else if (state.mode === "character" && character) {
        setActivePage(VELVET_PAGES.has(state.page) ? state.page : "characters");
        setSelectedCharacter(null);
        setSelectedConversationId(null);
        setSelectedMessageId(null);
        setPreviewCharacter(character);
      } else {
        setActivePage(VELVET_PAGES.has(state.page) ? state.page : "chats");
        setSelectedCharacter(null);
        setSelectedConversationId(null);
        setSelectedMessageId(null);
        setPreviewCharacter(null);
      }

      persistVelvetLocation({
        mode: state.mode || "page",
        page: state.page || "chats",
        characterId: state.characterId || character?.id || null,
        conversationId: state.conversationId || null,
        messageId: state.messageId || null,
      });
      if (state.mode === "page") restorePageScroll(state.page, 0);
      else scrollRouteTo(0, "auto");
    }

    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, []);

  useEffect(() => {
    if (authLoading || !user || charactersLoading || restoredLocationRef.current) return;

    restoredLocationRef.current = true;
    const locationState = readVelvetLocation();

    if (locationState.mode === "chat" && locationState.characterId) {
      const character = characters.find((item) => item.id === locationState.characterId);
      if (character) {
        setActivePage("chats");
        setSelectedCharacter(character);
        setSelectedConversationId(locationState.conversationId || null);
        setSelectedMessageId(locationState.messageId || null);
        setPreviewCharacter(null);
        window.history.replaceState(
          {
            velvetNavigation: true,
            ...locationState,
            character,
          },
          "",
          buildVelvetUrl(locationState)
        );
        return;
      }
    }

    if (locationState.mode === "character" && locationState.characterId) {
      const character = characters.find((item) => item.id === locationState.characterId);
      if (character) {
        setActivePage(locationState.page);
        setSelectedCharacter(null);
        setSelectedConversationId(null);
        setSelectedMessageId(null);
        setPreviewCharacter(character);
        window.history.replaceState(
          {
            velvetNavigation: true,
            ...locationState,
            character,
          },
          "",
          buildVelvetUrl(locationState)
        );
        return;
      }
    }

    setActivePage(locationState.page);
    setSelectedCharacter(null);
    setSelectedConversationId(null);
    setSelectedMessageId(null);
    setPreviewCharacter(null);
    window.history.replaceState(
      {
        velvetNavigation: true,
        mode: "page",
        page: locationState.page,
        character: null,
        characterId: null,
        conversationId: null,
      },
      "",
      buildVelvetUrl({ mode: "page", page: locationState.page })
    );
  }, [authLoading, user, charactersLoading, characters]);

  useEffect(() => {
    if (!user) return;
    function handleGlobalSearchShortcut(event) {
      const target = event.target;
      const typing = target?.matches?.("input, textarea, select, [contenteditable='true']");
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectedCharacter(null);
        setSelectedConversationId(null);
        setSelectedMessageId(null);
        setPreviewCharacter(null);
        setActivePage("search");
        const nextState = { velvetNavigation: true, mode: "page", page: "search", character: null, characterId: null, conversationId: null, messageId: null };
        window.history.pushState(nextState, "", buildVelvetUrl({ mode: "page", page: "search" }));
        scrollRouteTo(0, "smooth");
      }
    }
    window.addEventListener("keydown", handleGlobalSearchShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, [user?.id]);

  if (authLoading || (nativeRuntime && !nativeLaunchSettled)) {
    if (nativeRuntime) return <NativePortalLaunch />;

    return (
      <main className="app-loading">
        <span>✦</span>
        <p>Opening Velvet...</p>
      </main>
    );
  }

  if (!user) return <Auth />;

  function navigate(page, options = {}) {
    savePageScroll(activePage);
    setSelectedCharacter(null);
    setSelectedConversationId(null);
    setSelectedMessageId(null);
    setPreviewCharacter(null);
    setMemoryFocusCharacterId(page === "memories" ? (options.memoryCharacterId || "") : "");
    setActivePage(page);

    const nextState = {
      velvetNavigation: true,
      mode: "page",
      page,
      character: null,
      characterId: null,
      conversationId: null,
      messageId: null,
    };
    const nextLocation = { mode: "page", page, characterId: null, conversationId: null, messageId: null };
    const nextUrl = buildVelvetUrl(nextLocation);
    persistVelvetLocation(nextLocation);

    if (options.replace) {
      window.history.replaceState(nextState, "", nextUrl);
    } else {
      window.history.pushState(nextState, "", nextUrl);
    }

    restorePageScroll(page, 0);
  }

  function openCharacter(character, conversationId = null, messageId = null) {
    savePageScroll(activePage);
    setPreviewCharacter(null);
    setSelectedCharacter(character);
    setSelectedConversationId(conversationId);
    setSelectedMessageId(messageId);
    setActivePage("chats");

    const nextLocation = {
      mode: "chat",
      page: "chats",
      characterId: character.id,
      conversationId,
      messageId,
    };

    persistVelvetLocation(nextLocation);
    window.history.pushState(
      {
        velvetNavigation: true,
        ...nextLocation,
        character,
      },
      "",
      buildVelvetUrl(nextLocation)
    );
  }


  function openCharacterProfile(character) {
    savePageScroll(activePage);
    setSelectedCharacter(null);
    setSelectedConversationId(null);
    setSelectedMessageId(null);
    setPreviewCharacter(character);
    const nextLocation = {
      mode: "character",
      page: activePage,
      characterId: character.id,
      conversationId: null,
    };
    persistVelvetLocation(nextLocation);
    window.history.pushState(
      { velvetNavigation: true, ...nextLocation, character },
      "",
      buildVelvetUrl(nextLocation)
    );
    scrollRouteTo(0, "smooth");
  }

  async function startNewStoryFromProfile(character, options = {}) {
    const created = await createNewConversation(character, options);
    openCharacter(character, created.conversationId);
  }

  function goBackOr(fallback = "profile") {
    if (window.history.state?.velvetNavigation && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate(fallback, { replace: true });
  }

  function leaveCurrentChat() {
    if (window.history.state?.velvetNavigation && window.history.state?.character) {
      window.history.back();
      return;
    }

    navigate("chats", { replace: true });
  }

  function syncActiveConversation(conversationId) {
    if (!selectedCharacter?.id || !conversationId) return;
    setSelectedConversationId(conversationId);
    const nextLocation = {
      mode: "chat",
      page: "chats",
      characterId: selectedCharacter.id,
      conversationId,
      messageId: null,
    };
    persistVelvetLocation(nextLocation);
    window.history.replaceState(
      { velvetNavigation: true, ...nextLocation, character: selectedCharacter },
      "",
      buildVelvetUrl(nextLocation)
    );
  }

  function renderPage() {
    if (previewCharacter) {
      return (
        <CharacterDetail
          character={previewCharacter}
          onBack={() => { setPreviewCharacter(null); window.history.back(); }}
          onContinue={(character) => openCharacter(character)}
          onNewStory={startNewStoryFromProfile}
          onInstantStory={startNewStoryFromProfile}
          onOpenStory={openCharacter}
          onEdit={(character) => {
            setEditingCharacter(character);
            setCreatorOpen(true);
          }}
          onOpenMemories={() => navigate("memories")}
        />
      );
    }

    if (selectedCharacter) {
      return (
        <Chat
          character={selectedCharacter}
          conversationId={selectedConversationId}
          focusMessageId={selectedMessageId}
          onConversationChange={syncActiveConversation}
          onBack={leaveCurrentChat}
          onDeleted={() => navigate("chats", { replace: true })}
          onOpenMemories={() => navigate("memories")}
          onOpenDiagnostics={() => navigate("diagnostics")}
          onOpenCharacter={openCharacterProfile}
        />
      );
    }

    if (activePage === "characters") {
      return (
        <MyCharacters
          onCreateCharacter={() => {
            setEditingCharacter(null);
            setRemixSource(null);
            setCreatorOpen(true);
          }}
          onOpenCharacter={openCharacterProfile}
          onOpenStory={openCharacter}
          onEditCharacter={(character) => {
            setEditingCharacter(character);
            setRemixSource(null);
            setCreatorOpen(true);
          }}
          onRemixCharacter={(character) => {
            setEditingCharacter(null);
            setRemixSource(character);
            setCreatorOpen(true);
          }}
        />
      );
    }

    if (activePage === "chats") {
      return (
        <Chats
          onOpenCharacter={openCharacter}
          onBrowseCharacters={() => navigate("characters")}
          onOpenDiagnostics={() => navigate("diagnostics")}
        />
      );
    }

    if (activePage === "pulse") {
      return (
        <Pulse
          onOpenCharacter={openCharacter}
          onBrowseStories={() => navigate("chats")}
          onNewStory={startNewStoryFromProfile}
          onOpenMemories={(characterId) => navigate("memories", { memoryCharacterId: characterId })}
          onOpenProfile={openCharacterProfile}
        />
      );
    }

    if (activePage === "memories") {
      return (
        <Memories
          initialCharacterId={memoryFocusCharacterId}
          onBack={() => goBackOr("profile")}
          onBrowseCharacters={() => navigate("characters")}
          onOpenCharacter={openCharacter}
        />
      );
    }

    if (activePage === "personas") return <Personas onBack={() => goBackOr("profile")} />;

    if (activePage === "lorebooks") return <Lorebooks onBack={() => goBackOr("profile")} />;

    if (activePage === "settings") return <Settings onBack={() => goBackOr("profile")} onOpenDiagnostics={() => navigate("diagnostics")} />;

    if (activePage === "diagnostics") return <Diagnostics onBack={() => goBackOr("profile")} />;

    if (activePage === "search") return <SearchPage onBack={() => goBackOr("profile")} onOpenCharacter={openCharacter} onOpenMemories={() => navigate("memories")} onOpenLorebooks={() => navigate("lorebooks")} />;

    if (activePage === "profile") return <Profile onManageCharacters={() => navigate("characters")} onManagePersonas={() => navigate("personas")} onManageLorebooks={() => navigate("lorebooks")} onOpenMemories={() => navigate("memories")} onOpenDiagnostics={() => navigate("diagnostics")} onOpenSettings={() => navigate("settings")} onOpenSearch={() => navigate("search")} />;

    return (
      <Chats
        onOpenCharacter={openCharacter}
        onBrowseCharacters={() => navigate("characters")}
        onOpenDiagnostics={() => navigate("diagnostics")}
      />
    );
  }

  return (
    <>
    {!nativeRuntime && <WelcomeSplash />}
    <div className={`app ${selectedCharacter ? "app--chat" : ""}`}>
      {!selectedCharacter && !creatorOpen && (
        <Sidebar activePage={["personas", "lorebooks", "settings", "diagnostics"].includes(activePage) ? "profile" : activePage} onNavigate={navigate} />
      )}

      {!creatorOpen && <main className="app__content"><div className="velvet-route-stage" key={selectedCharacter ? `chat-${selectedCharacter.id}-${selectedConversationId || "current"}` : `page-${activePage}`}><Suspense fallback={<VelvetRouteLoading />}>{renderPage()}</Suspense></div></main>}

      {creatorOpen && (
        <Suspense fallback={<VelvetRouteLoading overlay />}>
        <CreateCharacterModal
          character={editingCharacter}
          remixSource={remixSource}
          onClose={() => {
            setCreatorOpen(false);
            setEditingCharacter(null);
            setRemixSource(null);
          }}
          onCreated={async (character, options = {}) => {
            setCreatorOpen(false);
            setEditingCharacter(null);
            setRemixSource(null);
            if (!editingCharacter && options.startChat) {
              const created = await createNewConversation(character);
              openCharacter(character, created.conversationId);
              return;
            }
            if (!editingCharacter) openCharacterProfile(character);
          }}
        />
        </Suspense>
      )}
      <PWAStatus />
    </div>
    </>
  );
}

function VelvetRouteLoading({ overlay = false }) {
  return <div className={`velvet-route-loading v311-route-skeleton${overlay ? " velvet-route-loading--overlay" : ""}`} role="status" aria-live="polite"><div className="v311-route-skeleton__top"><span>✦</span><small>Opening Velvet…</small></div><div className="v311-route-skeleton__cards"><i/><i/><i/></div></div>;
}

export default App;
