const CHAT_ANCHOR_PREFIX = "velvet_chat_anchor_v3499_";
const CHAT_ANCHOR_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export function isCoarseChatPointer() {
  if (typeof window === "undefined") return false;
  return Boolean(window.matchMedia?.("(pointer: coarse)")?.matches || window.innerWidth <= 820);
}
export function captureChatAnchor(container) {
  if (!container) return null;
  const ownerRect = container.getBoundingClientRect?.();
  const nodes = [...(container.querySelectorAll?.("[data-message-id]") || [])];
  const anchor = nodes.find(node => {
    const rect = node.getBoundingClientRect?.();
    return rect && ownerRect && rect.bottom > ownerRect.top + 8;
  });
  const distanceFromBottom = Math.max(0, container.scrollHeight - container.scrollTop - container.clientHeight);
  const anchorRect = anchor?.getBoundingClientRect?.();
  return {
    anchorId: anchor?.getAttribute?.("data-message-id") || "",
    offset: anchorRect && ownerRect ? Math.round(anchorRect.top - ownerRect.top) : 0,
    top: Math.round(container.scrollTop || 0),
    mode: distanceFromBottom > 220 ? "reading" : "latest",
    at: Date.now()
  };
}
export function persistChatAnchor(conversationId, container) {
  if (!conversationId || !container || typeof localStorage === "undefined") return null;
  const snapshot = captureChatAnchor(container);
  if (!snapshot) return null;
  try {
    localStorage.setItem(`${CHAT_ANCHOR_PREFIX}${conversationId}`, JSON.stringify(snapshot));
    sessionStorage?.setItem?.(`${CHAT_ANCHOR_PREFIX}${conversationId}`, JSON.stringify(snapshot));
  } catch {}
  return snapshot;
}
export function readChatAnchor(conversationId) {
  if (!conversationId) return null;
  const key = `${CHAT_ANCHOR_PREFIX}${conversationId}`;
  let raw = null;
  try {
    raw = sessionStorage?.getItem?.(key) || localStorage?.getItem?.(key);
  } catch {}
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - Number(parsed.at || 0) > CHAT_ANCHOR_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}
export function restoreChatAnchor(conversationId, container, {
  force = false
} = {}) {
  if (!conversationId || !container) return false;
  const saved = readChatAnchor(conversationId);
  if (!saved || !force && saved.mode !== "reading") return false;
  const anchor = saved.anchorId ? container.querySelector?.(`[data-message-id="${cssEscape(saved.anchorId)}"]`) : null;
  if (anchor) {
    const ownerRect = container.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    const targetTop = container.scrollTop + (rect.top - ownerRect.top) - Number(saved.offset || 0);
    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "auto"
    });
    return true;
  }
  if (Number.isFinite(Number(saved.top))) {
    container.scrollTo({
      top: Math.max(0, Number(saved.top)),
      behavior: "auto"
    });
    return true;
  }
  return false;
}
export function mobileComposerMaxHeight(fallback = 170) {
  const configured = Math.max(110, Math.min(220, Number(fallback) || 170));
  return isCoarseChatPointer() ? Math.min(configured, 146) : configured;
}
export function shouldOpenMessageActionsOnTap() {
  return !isCoarseChatPointer();
}
function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(String(value));
  return String(value).replace(/["\\]/g, "\\$&");
}
