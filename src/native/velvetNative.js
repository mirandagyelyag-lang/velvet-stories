import { Capacitor, registerPlugin } from "@capacitor/core";

const VelvetNative = registerPlugin("VelvetNative");
const nativeRuntime = () => Boolean(__VELVET_ANDROID_BUILD__ || Capacitor.isNativePlatform());
let lastHapticAt = 0;

export function isVelvetNativeRuntime() {
  return nativeRuntime();
}

export async function syncNativeChrome(theme = "light") {
  if (!nativeRuntime()) return;
  try { await VelvetNative.setSystemBars({ theme }); } catch {}
  await refreshNativeInsets();
}

export async function refreshNativeInsets() {
  if (!nativeRuntime() || typeof document === "undefined") return;
  try {
    const insets = await VelvetNative.getInsets();
    const root = document.documentElement;
    for (const side of ["top", "right", "bottom", "left"]) {
      const value = Math.max(0, Number(insets?.[side]) || 0);
      root.style.setProperty(`--velvet-native-safe-${side}`, `${value}px`);
    }
  } catch {}
}

export function velvetHaptic(kind = "selection") {
  if (!nativeRuntime()) return;
  const now = performance.now();
  if (now - lastHapticAt < 70) return;
  lastHapticAt = now;
  VelvetNative.haptic({ kind }).catch(() => {});
}

let viewportFrame = 0;
let insetRefreshTimer = 0;

function updateVisualViewportNow() {
  const viewport = window.visualViewport;
  const height = Math.max(0, viewport?.height || window.innerHeight || 0);
  const offsetTop = Math.max(0, viewport?.offsetTop || 0);
  const keyboard = Math.max(0, (window.innerHeight || height) - height - offsetTop);
  const root = document.documentElement;
  root.style.setProperty("--velvet-native-visual-height", `${height}px`);
  root.classList.toggle("velvet-native-keyboard-open", keyboard > 80);
}

function scheduleVisualViewportUpdate() {
  if (viewportFrame) return;
  viewportFrame = window.requestAnimationFrame(() => {
    viewportFrame = 0;
    updateVisualViewportNow();
  });
}

function scheduleNativeInsetRefresh(delay = 80) {
  window.clearTimeout(insetRefreshTimer);
  insetRefreshTimer = window.setTimeout(() => {
    refreshNativeInsets();
  }, delay);
}

function installTastefulHaptics() {
  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.(
      ".mobile-nav .sidebar__link, .mobile-global-search, .chat__send-button, .chat__director-trigger, .sidebar__theme, [data-velvet-haptic], button[aria-label*='delete' i], button[aria-label*='remove' i]"
    );
    if (!target || target.disabled) return;
    const label = `${target.getAttribute("aria-label") || ""} ${target.textContent || ""}`.toLowerCase();
    const kind = /delete|remove|trash/.test(label) ? "destructive" : (/send|save|done|confirm|continue/.test(label) ? "confirm" : "selection");
    velvetHaptic(kind);
  }, { passive: true });
}

export function installVelvetNativeRuntime() {
  if (!nativeRuntime() || typeof window === "undefined" || typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.classList.contains("velvet-native-runtime")) return;

  root.classList.add("velvet-native-runtime");
  root.setAttribute("data-velvet-runtime", "android");
  updateVisualViewportNow();
  scheduleNativeInsetRefresh(0);
  installTastefulHaptics();

  window.addEventListener("resize", () => {
    scheduleVisualViewportUpdate();
    scheduleNativeInsetRefresh();
  }, { passive: true });
  window.addEventListener("orientationchange", () => {
    scheduleVisualViewportUpdate();
    scheduleNativeInsetRefresh(180);
  }, { passive: true });

  // visualViewport can emit many scroll/resize events while the keyboard or
  // a finger is moving. Keep those updates in JavaScript and do not cross the
  // Capacitor bridge on every frame.
  window.visualViewport?.addEventListener("resize", scheduleVisualViewportUpdate, { passive: true });
  window.visualViewport?.addEventListener("scroll", scheduleVisualViewportUpdate, { passive: true });
}
