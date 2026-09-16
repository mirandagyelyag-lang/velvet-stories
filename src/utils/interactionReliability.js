let cleanupInteractionReliability = null;
export function installInteractionReliability() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  if (cleanupInteractionReliability) return cleanupInteractionReliability;
  const root = document.documentElement;
  let frame = 0;
  const syncViewport = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const visualHeight = Math.max(1, viewport?.height || window.innerHeight || 1);
      const visualWidth = Math.max(1, viewport?.width || window.innerWidth || 1);
      const offsetTop = Math.max(0, viewport?.offsetTop || 0);
      const keyboardInset = Math.max(0, (window.innerHeight || visualHeight) - visualHeight - offsetTop);
      const keyboardOpen = keyboardInset > 80;
      root.style.setProperty("--velvet-visual-height", `${visualHeight}px`);
      root.style.setProperty("--velvet-visual-width", `${visualWidth}px`);
      root.style.setProperty("--velvet-runtime-keyboard-inset", `${keyboardInset}px`);
      root.dataset.velvetKeyboard = keyboardOpen ? "open" : "closed";
    });
  };
  const syncNetwork = () => {
    root.dataset.velvetOnline = navigator.onLine ? "online" : "offline";
  };
  const markPointer = event => {
    root.dataset.velvetPointer = event.pointerType || "mouse";
  };
  syncViewport();
  syncNetwork();
  window.addEventListener("resize", syncViewport, {
    passive: true
  });
  window.addEventListener("orientationchange", syncViewport, {
    passive: true
  });
  window.addEventListener("online", syncNetwork, {
    passive: true
  });
  window.addEventListener("offline", syncNetwork, {
    passive: true
  });
  window.addEventListener("pointerdown", markPointer, {
    passive: true,
    capture: true
  });
  window.visualViewport?.addEventListener("resize", syncViewport, {
    passive: true
  });
  window.visualViewport?.addEventListener("scroll", syncViewport, {
    passive: true
  });
  cleanupInteractionReliability = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", syncViewport);
    window.removeEventListener("orientationchange", syncViewport);
    window.removeEventListener("online", syncNetwork);
    window.removeEventListener("offline", syncNetwork);
    window.removeEventListener("pointerdown", markPointer, true);
    window.visualViewport?.removeEventListener("resize", syncViewport);
    window.visualViewport?.removeEventListener("scroll", syncViewport);
    cleanupInteractionReliability = null;
  };
  return cleanupInteractionReliability;
}
