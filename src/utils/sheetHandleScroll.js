const HANDLE_SELECTOR = [
  ".velvet-sheet-grabber",
  ".story-action-menu__sheet-handle",
  ".memory-book__grab",
  ".director-sheet__grab",
  ".v311-sheet__grab",
].join(",");

const EXPLICIT_SCROLL_OWNERS = [
  [".conversation-picker", ".conversation-picker__scroll"],
  [".group-story-sheet", ".group-story-sheet__scroll"],
  [".memory-book", ".memory-book__scroll"],
];

let installed = false;

function findScrollOwner(handle) {
  for (const [sheetSelector, scrollSelector] of EXPLICIT_SCROLL_OWNERS) {
    const sheet = handle.closest(sheetSelector);
    if (sheet) return sheet.querySelector(scrollSelector);
  }

  let current = handle.parentElement;
  while (current && current !== document.body) {
    const overflowY = window.getComputedStyle(current).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return current;
    current = current.parentElement;
  }

  return null;
}

export function installSheetHandleScroll() {
  if (installed || typeof document === "undefined") return;
  installed = true;

  let drag = null;

  function finish(pointerId) {
    if (!drag || (pointerId != null && drag.pointerId !== pointerId)) return;
    drag.handle.classList.remove("is-scroll-dragging");
    document.documentElement.classList.remove("velvet-handle-scrolling");
    try { drag.handle.releasePointerCapture?.(drag.pointerId); } catch { /* already released */ }
    drag = null;
  }

  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const handle = event.target.closest?.(HANDLE_SELECTOR);
    if (!handle) return;

    const scrollOwner = findScrollOwner(handle);
    if (!scrollOwner) return;

    drag = {
      handle,
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: scrollOwner.scrollTop,
      scrollOwner,
    };

    handle.classList.add("is-scroll-dragging");
    document.documentElement.classList.add("velvet-handle-scrolling");
    handle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }, { passive: false });

  document.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.scrollOwner.scrollTop = drag.startScrollTop + (drag.startY - event.clientY);
    event.preventDefault();
  }, { passive: false });

  document.addEventListener("pointerup", (event) => finish(event.pointerId));
  document.addEventListener("pointercancel", (event) => finish(event.pointerId));
  window.addEventListener("blur", () => finish());
}
