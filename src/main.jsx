import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AuthProvider } from "./context/AuthContext";
import { CharactersProvider } from "./context/CharactersContext";
import { ChatsProvider } from "./context/ChatsContext";
import { FeedbackProvider } from "./context/FeedbackContext";
import { LorebooksProvider } from "./context/LorebooksContext";
import { PersonasProvider } from "./context/PersonasContext";
import { PWAProvider } from "./context/PWAContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";

import App from "./App";
import VelvetErrorBoundary from "./components/VelvetErrorBoundary";
import { markVelvetHealthy, recordVelvetRuntimeError } from "./utils/runtimeRecovery";
import { applySafeModeClass } from "./utils/safeMode";
import { installMobileViewportLock } from "./utils/mobileViewportLock";
import "./index.css";
import "./styles/velvet-ui.css";
import "./styles/velvet-v18.css";
import "./styles/velvet-mobile-foundation.css";
import "./styles/velvet-burgundy-reference.css";
import "./styles/velvet-v220.css";
import "./styles/velvet-v222-character-studio-exit.css";
import "./styles/velvet-v223-character-studio-real-exit.css";
import "./styles/velvet-v230-story-intelligence.css";
import "./styles/search.css";
import "./styles/velvet-v240-storycraft.css";
import "./styles/velvet-v250-living-story.css";
import "./styles/velvet-v260-keepsake.css";
import "./styles/velvet-v265-stability.css";
import "./styles/velvet-v269-character-studio-mobile.css";
import "./styles/velvet-v2610-character-studio-scroll.css";
import "./styles/velvet-v2611-six-fixes.css";
import "./styles/velvet-v2616-audio-center.css";
import "./styles/velvet-v270-living-scenes.css";
import "./styles/velvet-v274-in-chat-actions.css";
import "./styles/velvet-v280-chat-experience.css";
import "./styles/velvet-v290-character-studio-lite.css";
import "./styles/velvet-v291-private-library-rework.css";
import "./styles/velvet-v292-mobile-library-polish.css";
import "./styles/velvet-v296-precision-actions.css";
import "./styles/velvet-v298-characters-clean-mobile.css";
import "./styles/velvet-v2100-chats-inbox-rework.css";

installMobileViewportLock();
applySafeModeClass();

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });

  if ("caches" in window) {
    caches.keys().then((keys) => {
      keys
        .filter((key) => key.includes("workbox") || key.includes("precache"))
        .forEach((key) => caches.delete(key));
    });
  }
}

window.addEventListener("error", (event) => {
  recordVelvetRuntimeError(event.error || event.message, "window-error");
});
window.addEventListener("unhandledrejection", (event) => {
  recordVelvetRuntimeError(event.reason, "unhandled-rejection");
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <VelvetErrorBoundary>
      <PWAProvider>
      <ThemeProvider>
        <FeedbackProvider>
          <AuthProvider>
            <SettingsProvider>
              <CharactersProvider>
                <PersonasProvider>
                  <LorebooksProvider>
                    <ChatsProvider>
                      <App />
                    </ChatsProvider>
                  </LorebooksProvider>
                </PersonasProvider>
              </CharactersProvider>
            </SettingsProvider>
          </AuthProvider>
        </FeedbackProvider>
      </ThemeProvider>
      </PWAProvider>
    </VelvetErrorBoundary>
  </StrictMode>
);

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => {
    markVelvetHealthy();
    window.__VELVET_BOOT_OK__ = true;
  });
});


import "./styles/velvet-v2101-character-profile-actions.css";

import "./styles/velvet-v2107-memories-safe-area.css";

import "./styles/velvet-v21033-native-viewport-lock.css";
