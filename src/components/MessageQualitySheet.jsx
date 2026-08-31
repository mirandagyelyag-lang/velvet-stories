import { Check, Sparkles, X } from "lucide-react";

const OPTIONS = [
  { id: "perfect", label: "Perfect", kind: "positive", codes: ["voice", "dialogue", "pacing"] },
  { id: "too_long", label: "Too long", kind: "negative", codes: ["too_long"] },
  { id: "too_formal", label: "Too formal", kind: "negative", codes: ["too_formal"] },
  { id: "out_of_character", label: "Out of character", kind: "negative", codes: ["out_of_character"] },
  { id: "repetitive", label: "Repetitive", kind: "negative", codes: ["repetitive"] },
];

export default function MessageQualitySheet({ open, message, character, onClose, onRate }) {
  if (!open || !message) return null;
  return <div className="v311-quality-backdrop" onPointerDown={(event)=>event.target===event.currentTarget&&onClose?.()}>
    <section className="v311-quality" role="dialog" aria-modal="true" aria-label="Rate this response">
      <div className="v311-sheet__grab" />
      <header><div><small><Sparkles size={13}/> VELVET QUALITY</small><h2>How did that reply feel?</h2><p>One tap teaches Velvet the pattern, not the exact scene.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={18}/></button></header>
      <blockquote>{String(message.content || "").slice(0, 190)}{String(message.content || "").length > 190 ? "…" : ""}</blockquote>
      <div className="v311-quality__options">{OPTIONS.map((item)=><button type="button" key={item.id} className={item.id==="perfect"?"is-perfect":""} onClick={()=>onRate?.(item)}>{item.id==="perfect"&&<Check size={14}/>}<span>{item.label}</span></button>)}</div>
      <small className="v311-quality__hint">Tip: hold any character message to open this quickly.</small>
    </section>
  </div>;
}
