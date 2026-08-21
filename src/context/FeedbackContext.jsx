import { createContext, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, RotateCcw, Trash2, X } from "lucide-react";
import "../styles/feedback.css";

const FeedbackContext = createContext();

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const toastRef = useRef(null);

  function confirmAction({ title = "Delete this item?", message, confirmLabel = "Delete" } = {}) {
    return new Promise((resolve) => setDialog({ title, message, confirmLabel, resolve }));
  }

  function closeDialog(answer) {
    dialog?.resolve(Boolean(answer));
    setDialog(null);
  }

  function setToastState(value) {
    toastRef.current = value;
    setToast(value);
  }

  async function commitPending(pending) {
    const items = pending?.items || [];
    await Promise.all(items.map(async (item) => {
      try { await item.onCommit?.(); } catch (error) { item.onError?.(error); }
    }));
  }

  function scheduleDeletion({ message, onCommit, onUndo, onError, batchKey = null }) {
    const current = toastRef.current;
    const nextItem = { onCommit, onUndo, onError };

    if (batchKey && current?.batchKey === batchKey) {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      const next = { ...current, items: [...current.items, nextItem], message };
      setToastState(next);
      toastTimer.current = window.setTimeout(async () => {
        const pending = toastRef.current;
        setToastState(null); toastTimer.current = null;
        await commitPending(pending);
      }, 2500);
      return;
    }

    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
      const previous = toastRef.current;
      setToastState(null);
      commitPending(previous);
    }

    const pending = { message, batchKey, items: [nextItem] };
    setToastState(pending);
    toastTimer.current = window.setTimeout(async () => {
      const active = toastRef.current;
      setToastState(null); toastTimer.current = null;
      await commitPending(active);
    }, batchKey ? 2500 : 2500);
  }

  function undoDeletion() {
    window.clearTimeout(toastTimer.current);
    toastTimer.current = null;
    const pending = toastRef.current;
    [...(pending?.items || [])].reverse().forEach((item) => item.onUndo?.());
    setToastState(null);
  }

  const overlayRoot = typeof document !== "undefined" ? document.body : null;
  const dialogOverlay = dialog && overlayRoot ? createPortal(
    <div className="velvet-dialog-backdrop" onPointerDown={(event) => event.target === event.currentTarget && closeDialog(false)}>
      <section className="velvet-dialog" role="alertdialog" aria-modal="true">
        <button type="button" className="velvet-dialog__close" onClick={() => closeDialog(false)}><X size={19}/></button>
        <span className="velvet-dialog__icon"><AlertTriangle size={23}/></span>
        <small>VELVET CONFIRMATION</small>
        <h2>{dialog.title}</h2>
        <p>{dialog.message}</p>
        <footer>
          <button type="button" onClick={() => closeDialog(false)}>Cancel</button>
          <button type="button" className="danger" onClick={() => closeDialog(true)}><Trash2 size={16}/>{dialog.confirmLabel}</button>
        </footer>
      </section>
    </div>,
    overlayRoot,
  ) : null;
  const undoOverlay = toast && overlayRoot ? createPortal(
    <div className={`velvet-undo${toast.batchKey ? " velvet-undo--batch" : ""}`} role="status"><span>{typeof toast.message === "function" ? toast.message(toast.items?.length || 1) : (toast.message || "Moved to Trash")}</span><button type="button" onClick={undoDeletion}><RotateCcw size={13}/>{(toast.items?.length || 1) > 1 ? "Undo all" : "Undo"}</button><i/></div>,
    overlayRoot,
  ) : null;

  return <FeedbackContext.Provider value={{ confirmAction, scheduleDeletion }}>
    {children}
    {dialogOverlay}
    {undoOverlay}
  </FeedbackContext.Provider>;
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback must be used inside FeedbackProvider");
  return context;
}
