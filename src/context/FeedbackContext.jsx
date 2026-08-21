import { createContext, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, RotateCcw, Trash2, X } from "lucide-react";
import "../styles/feedback.css";

const FeedbackContext = createContext();

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function confirmAction({ title = "Delete this item?", message, confirmLabel = "Delete" } = {}) {
    return new Promise((resolve) => setDialog({ title, message, confirmLabel, resolve }));
  }

  function closeDialog(answer) {
    dialog?.resolve(Boolean(answer));
    setDialog(null);
  }

  function scheduleDeletion({ message, onCommit, onUndo, onError }) {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
      toast?.onCommit?.().catch?.(() => {});
    }
    const pending = { message, onCommit, onUndo };
    setToast(pending);
    toastTimer.current = window.setTimeout(async () => {
      setToast(null);
      toastTimer.current = null;
      try { await onCommit(); }
      catch (error) { onError?.(error); }
    }, 4000);
  }

  function undoDeletion() {
    window.clearTimeout(toastTimer.current);
    toastTimer.current = null;
    toast?.onUndo?.();
    setToast(null);
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
    <div className="velvet-undo" role="status"><span>{toast.message || "Moved to Trash"}</span><button type="button" onClick={undoDeletion}><RotateCcw size={13}/>Undo</button><i/></div>,
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
