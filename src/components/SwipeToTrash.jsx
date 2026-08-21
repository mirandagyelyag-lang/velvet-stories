import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";

const MAX_REVEAL = 112;
const DELETE_THRESHOLD = 86;

function SwipeToTrash({ children, onDelete, disabled = false, label = "Delete", className = "", direction = "left" }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gestureRef = useRef({ x: 0, y: 0, axis: null });
  const suppressClickUntilRef = useRef(0);
  const isRight = direction === "right";

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

    if (!gestureRef.current.axis && Math.max(absX, absY) > 12) {
      gestureRef.current.axis = absX > absY * 1.35 ? "horizontal" : "vertical";
    }
    if (gestureRef.current.axis !== "horizontal") return;

    const validDirection = isRight ? dx > 0 : dx < 0;
    if (!validDirection) { setOffset(0); return; }
    event.preventDefault();
    if (absX > 16) suppressClickUntilRef.current = Date.now() + 500;
    setOffset(isRight ? Math.min(MAX_REVEAL, dx) : Math.max(-MAX_REVEAL, dx));
  }

  async function finishGesture() {
    if (!dragging) return;
    setDragging(false);
    const armed = isRight ? offset >= DELETE_THRESHOLD : offset <= -DELETE_THRESHOLD;
    if (disabled || !armed) { setOffset(0); return; }

    suppressClickUntilRef.current = Date.now() + 700;
    setOffset(isRight ? MAX_REVEAL : -MAX_REVEAL);
    navigator.vibrate?.(8);
    try { await onDelete?.(); } finally { window.setTimeout(() => setOffset(0), 140); }
  }

  function guardClick(event) {
    if (Date.now() < suppressClickUntilRef.current) { event.preventDefault(); event.stopPropagation(); }
  }

  const revealed = isRight ? offset > 6 : offset < -6;
  const armed = isRight ? offset >= DELETE_THRESHOLD : offset <= -DELETE_THRESHOLD;
  return (
    <div className={`swipe-trash${isRight ? " swipe-trash--right" : ""}${dragging ? " is-dragging" : ""}${revealed ? " is-revealed" : ""}${armed ? " is-armed" : ""}${className ? ` ${className}` : ""}`} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={finishGesture} onTouchCancel={() => { setDragging(false); setOffset(0); }} onClickCapture={guardClick} role="group" aria-label={label}>
      <div className="swipe-trash__action" aria-hidden="true"><Trash2 size={20}/></div>
      <div className="swipe-trash__content" style={{ transform: `translate3d(${offset}px,0,0)` }}>{children}</div>
    </div>
  );
}

export default SwipeToTrash;
