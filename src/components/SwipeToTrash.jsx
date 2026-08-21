import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";

const MAX_REVEAL = 112;
const DELETE_THRESHOLD = 78;

function SwipeToTrash({ children, onDelete, disabled = false, label = "Delete conversation", className = "" }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gestureRef = useRef({ x: 0, y: 0, axis: null });
  const suppressClickUntilRef = useRef(0);

  function handleTouchStart(event) {
    if (disabled || event.touches.length !== 1) return;
    const touch = event.touches[0];
    gestureRef.current = { x: touch.clientX, y: touch.clientY, axis: null };
    setDragging(true);
  }

  function handleTouchMove(event) {
    if (disabled || !dragging || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - gestureRef.current.x;
    const dy = touch.clientY - gestureRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!gestureRef.current.axis && Math.max(absX, absY) > 8) {
      gestureRef.current.axis = absX > absY * 1.15 ? "horizontal" : "vertical";
    }
    if (gestureRef.current.axis !== "horizontal") return;

    if (dx > 0) {
      setOffset(0);
      return;
    }
    event.preventDefault();
    if (absX > 12) suppressClickUntilRef.current = Date.now() + 450;
    setOffset(Math.max(-MAX_REVEAL, dx));
  }

  async function finishGesture() {
    if (!dragging) return;
    setDragging(false);
    const shouldDelete = !disabled && offset <= -DELETE_THRESHOLD;
    if (!shouldDelete) {
      setOffset(0);
      return;
    }

    suppressClickUntilRef.current = Date.now() + 650;
    setOffset(-MAX_REVEAL);
    navigator.vibrate?.(8);
    try {
      await onDelete?.();
    } finally {
      window.setTimeout(() => setOffset(0), 180);
    }
  }

  function guardClick(event) {
    if (Date.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <div
      className={`swipe-trash${dragging ? " is-dragging" : ""}${offset < -6 ? " is-revealed" : ""}${offset <= -DELETE_THRESHOLD ? " is-armed" : ""}${className ? ` ${className}` : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={finishGesture}
      onTouchCancel={() => { setDragging(false); setOffset(0); }}
      onClickCapture={guardClick}
      role="group"
      aria-label={label}
    >
      <div className="swipe-trash__action" aria-hidden="true"><Trash2 size={20}/><span>{offset <= -DELETE_THRESHOLD ? "Release" : "Delete"}</span></div>
      <div className="swipe-trash__content" style={{ transform: `translate3d(${offset}px,0,0)` }}>{children}</div>
    </div>
  );
}

export default SwipeToTrash;
