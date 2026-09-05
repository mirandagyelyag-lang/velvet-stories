import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useRegisterSW } from "virtual:pwa-register/react";
import { lockVelvetPortrait } from "../utils/lockOrientation";
import { VELVET_VERSION } from "../config/version";

const PWAContext = createContext(null);
const INSTALL_DISMISSED_KEY = "velvet_install_prompt_dismissed";
const UPDATE_PENDING_KEY = "velvet_update_pending";

export function PWAProvider({ children }) {
  if (Capacitor.isNativePlatform()) {
    return <NativePWAProvider>{children}</NativePWAProvider>;
  }
  return <WebPWAProvider>{children}</WebPWAProvider>;
}

function NativePWAProvider({ children }) {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    void lockVelvetPortrait();
    const relock = () => { if (document.visibilityState === "visible") void lockVelvetPortrait(); };
    document.addEventListener("visibilitychange", relock);
    window.addEventListener("orientationchange", relock);
    return () => {
      document.removeEventListener("visibilitychange", relock);
      window.removeEventListener("orientationchange", relock);
    };
  }, []);

  const noUpdate = async () => ({ available: false, version: VELVET_VERSION });
  const value = useMemo(() => ({
    canInstall: false,
    installed: true,
    installDismissed: true,
    installApp: async () => ({ outcome: "installed" }),
    dismissInstall: () => {},
    showIOSInstructions: false,
    closeIOSInstructions: () => {},
    online,
    offlineReady: false,
    dismissOfflineReady: () => {},
    needRefresh: false,
    dismissRefresh: () => {},
    updateApp: noUpdate,
    platform: Capacitor.getPlatform(),
    localVersion: VELVET_VERSION,
    serverVersion: VELVET_VERSION,
    serverUpdateAvailable: false,
    checkingForUpdate: false,
    updating: false,
    updateProblem: "",
    checkForUpdate: noUpdate,
    repairUpdate: noUpdate,
  }), [online]);

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

function WebPWAProvider({ children }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(() => {
    try { return localStorage.getItem(INSTALL_DISMISSED_KEY) === "true"; }
    catch { return false; }
  });
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installed, setInstalled] = useState(isStandalone);
  const [serverVersion, setServerVersion] = useState("");
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateProblem, setUpdateProblem] = useState("");

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error("Velvet service worker registration failed:", error);
      setUpdateProblem("The app updater could not start on this device.");
    },
  });

  const serverUpdateAvailable = Boolean(serverVersion && compareVersions(serverVersion, VELVET_VERSION) > 0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.getRegistration().then((registration) => { if (registration) return registration.update(); }).catch(() => {});
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  async function checkForUpdate({ silent = true } = {}) {
    if (!navigator.onLine) return { available: false, version: serverVersion || "" };
    if (!silent) setCheckingForUpdate(true);
    try {
      const response = await fetch(`/velvet-version.json?ts=${Date.now()}`, {
        cache: "no-store",
        headers: { "cache-control": "no-cache" },
      });
      if (!response.ok) throw new Error(`Version check returned ${response.status}`);
      const payload = await response.json();
      const remote = String(payload?.version || "").trim();
      if (remote) {
        setServerVersion(remote);
        if (compareVersions(remote, VELVET_VERSION) <= 0) {
          setNeedRefresh(false);
          setUpdateProblem("");
          clearSatisfiedPendingUpdate(remote);
        }
      }
      try { await forceServiceWorkerNetworkCheck(); } catch {}
      return { available: Boolean(remote && compareVersions(remote, VELVET_VERSION) > 0), version: remote };
    } catch (error) {
      if (!silent) setUpdateProblem(error?.message || "Could not check for updates.");
      return { available: false, version: serverVersion || "", error };
    } finally {
      if (!silent) setCheckingForUpdate(false);
    }
  }

  async function clearVelvetCaches({ includeMedia = false } = {}) {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    const velvetKeys = keys.filter((key) => {
      if (/workbox|precache|vite-pwa|velvet-shell/i.test(key)) return true;
      if (includeMedia && /velvet-images|velvet-fonts/i.test(key)) return true;
      return false;
    });
    await Promise.allSettled(velvetKeys.map((key) => caches.delete(key)));
  }

  async function clearOldShellCaches(options = {}) {
    // Compatibility name retained for Update Doctor and historical QA checks.
    return clearVelvetCaches(options);
  }

  async function forceServiceWorkerNetworkCheck() {
    if (!("serviceWorker" in navigator)) return;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(registrations.map((registration) => registration.update?.()));
  }

  async function updateApp() {
    if (updating) return;
    setUpdating(true);
    setUpdateProblem("");
    const target = serverVersion || "latest";
    try {
      localStorage.setItem(UPDATE_PENDING_KEY, JSON.stringify({ target, from: VELVET_VERSION, at: Date.now() }));
    } catch {}
    try {
      await forceServiceWorkerNetworkCheck();
      await clearVelvetCaches();
      await updateServiceWorker(true);
      setNeedRefresh(false);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setUpdateProblem(error?.message || "The update was interrupted before Velvet could reopen.");
      setUpdating(false);
    }
  }

  async function repairUpdate() {
    if (updating) return;
    setUpdating(true);
    setUpdateProblem("");
    try {
      await clearOldShellCaches({ includeMedia: true });
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(registrations.map((registration) => registration.unregister()));
      }
      try { localStorage.removeItem(UPDATE_PENDING_KEY); } catch {}
      const url = new URL(window.location.href);
      url.searchParams.set("velvet_repair", String(Date.now()));
      url.searchParams.set("velvet_target", VELVET_VERSION);
      window.location.replace(url.toString());
    } catch (error) {
      setUpdating(false);
      setUpdateProblem(error?.message || "Velvet could not repair the updater automatically.");
    }
  }

  useEffect(() => {
    try {
      const pending = JSON.parse(localStorage.getItem(UPDATE_PENDING_KEY) || "null");
      const target = String(pending?.target || "");
      const age = Date.now() - Number(pending?.at || 0);
      if (pending && target !== "latest" && compareVersions(VELVET_VERSION, target) >= 0) {
        localStorage.removeItem(UPDATE_PENDING_KEY);
        setNeedRefresh(false);
        setUpdateProblem("");
      } else if (target === "latest" && age > 120000) {
        localStorage.removeItem(UPDATE_PENDING_KEY);
      } else if (pending && age > 8000) {
        setUpdateProblem(`An update started from v${pending.from || "?"} but this tab is still on v${VELVET_VERSION}.`);
      }
    } catch {}
  }, [setNeedRefresh]);

  useEffect(() => {
    let timer = 0;
    const run = () => {
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      void checkForUpdate({ silent: true });
    };
    window.setTimeout(run, 1600);
    timer = window.setInterval(run, 20 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", run);
    };
  }, []);

  useEffect(() => {
    void lockVelvetPortrait();
    const relock = () => { if (document.visibilityState === "visible") void lockVelvetPortrait(); };
    document.addEventListener("visibilitychange", relock);
    window.addEventListener("orientationchange", relock);
    return () => {
      document.removeEventListener("visibilitychange", relock);
      window.removeEventListener("orientationchange", relock);
    };
  }, [installed]);

  useEffect(() => {
    function captureInstallPrompt(event) { event.preventDefault(); setInstallPrompt(event); }
    function markInstalled() { setInstalled(true); setInstallPrompt(null); try { localStorage.removeItem(INSTALL_DISMISSED_KEY); } catch {} }
    function goOnline() { setOnline(true); }
    function goOffline() { setOnline(false); }
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", markInstalled);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", markInstalled);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  async function installApp() {
    if (installed) return { outcome: "installed" };
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        setInstalled(true);
        window.setTimeout(() => void lockVelvetPortrait(), 250);
      }
      return choice;
    }
    setShowIOSInstructions(true);
    return { outcome: "instructions" };
  }

  function dismissInstall() {
    try { localStorage.setItem(INSTALL_DISMISSED_KEY, "true"); } catch {}
    setInstallDismissed(true);
  }

  const value = useMemo(() => ({
    canInstall: Boolean(installPrompt) || (isIOS() && !installed), installed, installDismissed, installApp, dismissInstall,
    showIOSInstructions, closeIOSInstructions: () => setShowIOSInstructions(false), online, offlineReady,
    dismissOfflineReady: () => setOfflineReady(false), needRefresh, dismissRefresh: () => setNeedRefresh(false), updateApp,
    platform: isIOS() ? "ios" : "other", localVersion: VELVET_VERSION, serverVersion, serverUpdateAvailable,
    checkingForUpdate, updating, updateProblem, checkForUpdate, repairUpdate,
  }), [installPrompt, installed, installDismissed, showIOSInstructions, online, offlineReady, needRefresh, serverVersion, serverUpdateAvailable, checkingForUpdate, updating, updateProblem]);

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

function versionParts(value) {
  return String(value || "")
    .replace(/^v/i, "")
    .split(".")
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] || 0) > (b[index] || 0)) return 1;
    if ((a[index] || 0) < (b[index] || 0)) return -1;
  }
  return 0;
}

function clearSatisfiedPendingUpdate(remoteVersion = VELVET_VERSION) {
  try {
    const pending = JSON.parse(localStorage.getItem(UPDATE_PENDING_KEY) || "null");
    if (!pending) return;
    const target = String(pending.target || "");
    if (target !== "latest" && compareVersions(VELVET_VERSION, target) >= 0) {
      localStorage.removeItem(UPDATE_PENDING_KEY);
      return;
    }
    if (target === "latest" && compareVersions(remoteVersion, VELVET_VERSION) <= 0) {
      localStorage.removeItem(UPDATE_PENDING_KEY);
    }
  } catch {}
}

function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
function isStandalone() { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
export function usePWA() { const context = useContext(PWAContext); if (!context) throw new Error("usePWA must be used inside PWAProvider"); return context; }
