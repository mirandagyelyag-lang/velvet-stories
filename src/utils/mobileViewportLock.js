const LOCK_KEY = "__VELVET_NATIVE_VIEWPORT_LOCK_V21033__";
function stopBrowserScaleGesture(event) {
  event.preventDefault();
}
export function installMobileViewportLock() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[LOCK_KEY]) return;
  const options = {
    passive: false
  };

  // Safari/iOS exposes proprietary gesture events for page scaling.
  document.addEventListener("gesturestart", stopBrowserScaleGesture, options);
  document.addEventListener("gesturechange", stopBrowserScaleGesture, options);
  document.addEventListener("gestureend", stopBrowserScaleGesture, options);

  // Do not observe touchmove. Even a non-passive listener that usually does
  // nothing forces mobile browsers to consult JavaScript before every frame of
  // a finger scroll. The viewport meta and CSS touch-action already own scale.

  window[LOCK_KEY] = true;
}
