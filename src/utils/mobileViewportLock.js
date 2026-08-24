const LOCK_KEY = "__VELVET_NATIVE_VIEWPORT_LOCK_V21033__";

function stopBrowserScaleGesture(event) {
  event.preventDefault();
}

function stopMultiTouchScale(event) {
  if (event.touches?.length > 1) {
    event.preventDefault();
  }
}

export function installMobileViewportLock() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[LOCK_KEY]) return;

  const options = { passive: false };

  // Safari/iOS exposes proprietary gesture events for page scaling.
  document.addEventListener("gesturestart", stopBrowserScaleGesture, options);
  document.addEventListener("gesturechange", stopBrowserScaleGesture, options);
  document.addEventListener("gestureend", stopBrowserScaleGesture, options);

  // Chromium/Android PWA: cancel only multi-touch movement. A normal one-finger
  // touchmove is deliberately untouched so document/chat/sheet scrolling stays native.
  document.addEventListener("touchmove", stopMultiTouchScale, options);

  window[LOCK_KEY] = true;
}
