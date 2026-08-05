import { useState } from "react";

import CreateCharacterModal from "./components/CreateCharacterModal";
import Sidebar from "./components/Sidebar";

import { useAuth } from "./context/AuthContext";

import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Discover from "./pages/Discover";
import MyCharacters from "./pages/MyCharacters";

import "./App.css";

function App() {
  const { user, authLoading } = useAuth();

  const [activePage, setActivePage] =
    useState("discover");

  const [creatorOpen, setCreatorOpen] =
    useState(false);

  const [selectedCharacter, setSelectedCharacter] =
    useState(null);

  if (authLoading) {
    return (
      <main className="app-loading">
        <span>✦</span>
        <p>Opening Velvet...</p>
      </main>
    );
  }

  if (!user) {
    return <Auth />;
  }

  function openCreator() {
    setCreatorOpen(true);
  }

  function handleCharacterCreated() {
    setCreatorOpen(false);
    setActivePage("characters");
  }

  function handleNavigation(page) {
    setSelectedCharacter(null);
    setActivePage(page);
  }

  function openCharacter(character) {
    setSelectedCharacter(character);
    setActivePage("chats");
  }

  function renderPage() {
    if (selectedCharacter) {
      return (
        <Chat
          character={selectedCharacter}
          onBack={() => {
            setSelectedCharacter(null);
            setActivePage("characters");
          }}
        />
      );
    }

    if (activePage === "characters") {
      return (
        <MyCharacters
          onCreateCharacter={openCreator}
          onOpenCharacter={openCharacter}
        />
      );
    }

    if (activePage === "chats") {
      return (
        <section className="empty-page">
          <span>✦</span>
          <p>YOUR STORIES</p>
          <h1>Conversations</h1>
          <p>
            Open one of your characters to begin a conversation.
          </p>

          <button
            onClick={() =>
              setActivePage("characters")
            }
          >
            View my characters
          </button>
        </section>
      );
    }

    return (
      <Discover onCreateCharacter={openCreator} />
    );
  }

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigation}
      />

      <main className="app__content">
        {renderPage()}
      </main>

      {creatorOpen && (
        <CreateCharacterModal
          onClose={() => setCreatorOpen(false)}
          onCreated={handleCharacterCreated}
        />
      )}
    </div>
  );
}

export default App;