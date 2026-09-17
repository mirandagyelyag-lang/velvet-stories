import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";

import App from "./App";
import VelvetErrorBoundary from "./components/VelvetErrorBoundary";

import { AuthProvider } from "./context/AuthContext";
import { CharactersProvider } from "./context/CharactersContext";
import { ChatsProvider } from "./context/ChatsContext";
import { FeedbackProvider } from "./context/FeedbackContext";
import { LorebooksProvider } from "./context/LorebooksContext";
import { PersonasProvider } from "./context/PersonasContext";
import { PWAProvider } from "./context/PWAContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";

import { installVelvetNativeRuntime } from "./native/velvetNative";

import { installAppResumeRecoveryV34912 } from "./utils/appResumeRecoveryV34912";
import { installInteractionReliability } from "./utils/interactionReliability";
import { installMobileViewportLock } from "./utils/mobileViewportLock";
import { markVelvetHealthy, recordVelvetRuntimeError } from "./utils/runtimeRecovery";
import { applySafeModeClass } from "./utils/safeMode";

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
import "./styles/velvet-v270-living-scenes.css";
import "./styles/velvet-v274-in-chat-actions.css";
import "./styles/velvet-v280-chat-experience.css";
import "./styles/velvet-v290-character-studio-lite.css";
import "./styles/velvet-v291-private-library-rework.css";
import "./styles/velvet-v292-mobile-library-polish.css";
import "./styles/velvet-v296-precision-actions.css";
import "./styles/velvet-v298-characters-clean-mobile.css";
import "./styles/velvet-v2101-character-profile-actions.css";
import "./styles/velvet-v2107-memories-safe-area.css";
import "./styles/velvet-v21033-native-viewport-lock.css";
import "./styles/velvet-v374-chat-composer-authority.css";
import "./styles/velvet-v391-characters-v3.css";
import "./styles/velvet-v394-landscape-nav.css";
import "./styles/velvet-v396-characters-nav-indicator.css";
import "./styles/velvet-v397-unified-mobile-nav.css";
import "./styles/velvet-v398-story-launcher-scroll.css";
import "./styles/velvet-v399-quick-create-mobile.css";
import "./styles/velvet-v3110-experience.css";
import "./styles/chat-header-overlay.css";
import "./styles/velvet-v3120-never-lose-story.css";
import "./styles/velvet-v3140-native-polish.css";
import "./styles/velvet-v3290-ui-sweep.css";
import "./styles/velvet-v3300-interaction-reliability.css";
import "./styles/velvet-v3493-seamless-generation.css";
import "./styles/velvet-v3495-chat-recovery-clean-ui.css";
import "./styles/velvet-v3497-five-fix-polish.css";
import "./styles/velvet-v34912-mobile-experience.css";
import "./styles/velvet-v34915-story-library-memory-safety.css";
import "./styles/velvet-v34916-new-story-scroll-fix.css";
import "./styles/velvet-v34918-draggable-new-story-sheet.css";
import "./styles/velvet-v34922-reply-assist.css";
import "./styles/velvet-v3511-chat-scroll-reply-assist.css";
import "./styles/velvet-v3520-whole-app-stabilization.css";
import "./styles/velvet-v35233-stories-bottom-tail.css";
import "./styles/velvet-v35234-single-canvas.css";
import "./styles/velvet-v35235-one-background-owner.css";
import "./styles/velvet-v35238-unified-app-canvas.css";
import "./styles/velvet-v35248-group-story-scroll.css";

installMobileViewportLock();
installInteractionReliability();
installVelvetNativeRuntime();
installAppResumeRecoveryV34912();
applySafeModeClass();

const nativeRuntime = __VELVET_ANDROID_BUILD__ || Capacitor.isNativePlatform();

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

if (nativeRuntime) {
  const cleanupKey = `velvet:native-pwa-clean:${__VELVET_VERSION__}`;
  let shouldClean = true;

  try {
    shouldClean = localStorage.getItem(cleanupKey) !== "1";
  } catch {}

  if (shouldClean) {
    const jobs = [];

    if ("serviceWorker" in navigator) {
      jobs.push(
        navigator.serviceWorker.getRegistrations().then((registrations) =>
          Promise.allSettled(
            registrations.map((registration) => registration.unregister()),
          ),
        ),
      );
    }

    if ("caches" in window) {
      jobs.push(
        caches
          .keys()
          .then((keys) =>
            Promise.allSettled(keys.map((key) => caches.delete(key))),
          ),
      );
    }

    Promise.allSettled(jobs).finally(() => {
      try {
        localStorage.setItem(cleanupKey, "1");
      } catch {}
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
  </StrictMode>,
);

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => {
    markVelvetHealthy();
    window.__VELVET_BOOT_OK__ = true;

    try {
      localStorage.setItem("velvet:last-healthy-version", __VELVET_VERSION__);
    } catch {}

    window.dispatchEvent(
      new CustomEvent("velvet:boot-ready", {
        detail: {
          version: __VELVET_VERSION__,
          at: Date.now(),
        },
      }),
    );

    if (nativeRuntime) {
      window.setTimeout(() => {
        document.documentElement.classList.remove("velvet-native-prepaint");
        document.getElementById("velvet-native-prepaint")?.remove();
      }, 900);
    }
  });
});
