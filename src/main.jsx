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
import "./index.css";
import "./styles/velvet-ui.css";
import "./styles/velvet-v18.css";
import "./styles/velvet-mobile-foundation.css";
import "./styles/velvet-burgundy-reference.css";
import "./styles/velvet-v220.css";
import "./styles/velvet-v222-character-studio-exit.css";

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
