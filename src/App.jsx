import { lazy, Suspense, useEffect, useRef, useState } from "react";

import Sidebar from "./components/Sidebar";
import { useAuth } from "./context/AuthContext";
import Auth from "./pages/Auth";
import Chats from "./pages/Chats";
import MyCharacters from "./pages/MyCharacters";
import PWAStatus from "./components/PWAStatus";
import { useChats } from "./context/ChatsContext";
import { useCharacters } from "./context/CharactersContext";
import WelcomeSplash from "./components/WelcomeSplash";
import "./App.css";
import "./styles/velvet-unified.css";
import "./styles/velvet-v17.css";

const Chat = lazy(() => import("./pages/Chat"));
const CharacterDetail = lazy(() => import("./pages/CharacterDetail"));
const ChatInbox = lazy(() => import("./pages/ChatInbox"));
const Memories = lazy(() => import("./pages/Memories"));
const Profile = lazy(() => import("./pages/Profile"));
const Personas = lazy(() => import("./pages/Personas"));
const Lorebooks = lazy(() => import("./pages/Lorebooks"));
const Settings = lazy(() => import("./pages/Settings"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const CreateCharacterModal = lazy(() => import("./components/CreateCharacterModal"));

const VELVET_PAGES = new Set([
  "characters",
  "chats",
  "inbox",
  "memories",
  "personas",
  "lorebooks",
  "profile",
  "settings",
  "diagnostics",
]);

function readVelvetLocation() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("open");

  if (requested === "chat") {
    return {
      mode: "chat",
      page: "chats",
      characterId: params.get("character"),
      conversationId: params.get("conversation"),
    };
  }

  if (requested === "character") {
    const from = params.get("from");
    return {
      mode: "character",
      page: VELVET_PAGES.has(from) ? from : "characters",
      characterId: params.get("character"),
      conversationId: null,
    };
  }

  return {
    mode: "page",
    page: VELVET_PAGES.has(requested) ? requested : "chats",
    characterId: null,
    conversationId: null,
  };
}

function buildVelvetUrl({ mode = "page", page = "chats", characterId = null, conversationId = null }) {
  const params = new URLSearchParams();

  if (mode === "chat" && characterId) {
    params.set("open", "chat");
    params.set("character", characterId);
    if (conversationId) params.set("conversation", conversationId);
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
  const { user, authLoading } = useAuth();
  const { createNewConversation } = useChats();
  const { characters, charactersLoading } = useCharacters();
  const initialNavigation = useRef(readVelvetLocation());
  const charactersRef = useRef(characters);
  const restoredLocationRef = useRef(false);
  const [activePage, setActivePage] = useState(() => initialNavigation.current.page);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [previewCharacter, setPreviewCharacter] = useState(null);

  useEffect(() => {
    charactersRef.current = characters;
  }, [characters]);

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
        setPreviewCharacter(null);
      } else if (state.mode === "character" && character) {
        setActivePage(VELVET_PAGES.has(state.page) ? state.page : "characters");
        setSelectedCharacter(null);
        setSelectedConversationId(null);
        setPreviewCharacter(character);
      } else {
        setActivePage(VELVET_PAGES.has(state.page) ? state.page : "chats");
        setSelectedCharacter(null);
        setSelectedConversationId(null);
        setPreviewCharacter(null);
      }

      window.scrollTo({ top: 0, behavior: "auto" });
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

  if (authLoading) {
    return (
      <main className="app-loading">
        <span>✦</span>
        <p>Opening Velvet...</p>
      </main>
    );
  }

  if (!user) return <Auth />;

  function navigate(page, options = {}) {
    setSelectedCharacter(null);
    setSelectedConversationId(null);
    setPreviewCharacter(null);
    setActivePage(page);

    const nextState = {
      velvetNavigation: true,
      mode: "page",
      page,
      character: null,
      characterId: null,
      conversationId: null,
    };
    const nextUrl = buildVelvetUrl({ mode: "page", page });

    if (options.replace) {
      window.history.replaceState(nextState, "", nextUrl);
    } else {
      window.history.pushState(nextState, "", nextUrl);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCharacter(character, conversationId = null) {
    setPreviewCharacter(null);
    setSelectedCharacter(character);
    setSelectedConversationId(conversationId);
    setActivePage("chats");

    const nextLocation = {
      mode: "chat",
      page: "chats",
      characterId: character.id,
      conversationId,
    };

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
    setSelectedCharacter(null);
    setSelectedConversationId(null);
    setPreviewCharacter(character);
    const nextLocation = {
      mode: "character",
      page: activePage,
      characterId: character.id,
      conversationId: null,
    };
    window.history.pushState(
      { velvetNavigation: true, ...nextLocation, character },
      "",
      buildVelvetUrl(nextLocation)
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function startNewStoryFromProfile(character) {
    const created = await createNewConversation(character);
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
        />
      );
    }

    if (selectedCharacter) {
      return (
        <Chat
          character={selectedCharacter}
          conversationId={selectedConversationId}
          onBack={leaveCurrentChat}
          onDeleted={() => navigate("chats", { replace: true })}
          onOpenMemories={() => navigate("memories")}
          onOpenDiagnostics={() => navigate("diagnostics")}
        />
      );
    }

    if (activePage === "characters") {
      return (
        <MyCharacters
          onCreateCharacter={() => {
            setEditingCharacter(null);
            setCreatorOpen(true);
          }}
          onOpenCharacter={openCharacterProfile}
          onEditCharacter={(character) => {
            setEditingCharacter(character);
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
        />
      );
    }

    if (activePage === "inbox") {
      return <ChatInbox onOpenCharacter={openCharacter} onBrowseCharacters={() => navigate("characters")} />;
    }

    if (activePage === "memories") {
      return (
        <Memories
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

    if (activePage === "profile") return <Profile onManageCharacters={() => navigate("characters")} onManagePersonas={() => navigate("personas")} onManageLorebooks={() => navigate("lorebooks")} onOpenMemories={() => navigate("memories")} onOpenDiagnostics={() => navigate("diagnostics")} onOpenSettings={() => navigate("settings")} />;

    return (
      <Chats
        onOpenCharacter={openCharacter}
        onBrowseCharacters={() => navigate("characters")}
      />
    );
  }

  return (
    <>
    <WelcomeSplash />
    <div className={`app ${selectedCharacter ? "app--chat" : ""}`}>
      {!selectedCharacter && !creatorOpen && (
        <Sidebar activePage={["personas", "lorebooks", "settings", "diagnostics"].includes(activePage) ? "profile" : activePage} onNavigate={navigate} />
      )}

      {!creatorOpen && <main className="app__content"><Suspense fallback={<VelvetRouteLoading />}>{renderPage()}</Suspense></main>}

      {creatorOpen && (
        <Suspense fallback={<VelvetRouteLoading overlay />}>
        <CreateCharacterModal
          character={editingCharacter}
          onClose={() => {
            setCreatorOpen(false);
            setEditingCharacter(null);
          }}
          onCreated={(character) => {
            setCreatorOpen(false);
            setEditingCharacter(null);
            if (!editingCharacter) openCharacter(character);
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
  return <div className={`velvet-route-loading${overlay ? " velvet-route-loading--overlay" : ""}`} role="status" aria-live="polite"><span>✦</span><small>Opening Velvet…</small></div>;
}

export default App;
