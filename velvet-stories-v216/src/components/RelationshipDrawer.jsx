import { HeartHandshake, Sparkles, X } from "lucide-react";

export default function RelationshipDrawer({ open, onClose, character, conversation }) {
  if (!open) return null;

  const relationship = conversation?.relationshipState || {};
  const development = conversation?.characterDevelopment || {};
  const dynamic = relationship.current_dynamic || development.current_dynamic || character?.relationship || "Still being established.";
  const phase = relationship.relationship_phase || development.relationship_phase || "baseline";
  const contradictions = relationship.active_contradictions || development.active_contradictions || [];
  const turningPoints = relationship.turning_points || development.turning_points || [];
  const residue = relationship.emotional_residue || development.emotional_residue || [];
  const recentShift = relationship.recent_shift || turningPoints.at?.(-1)?.impact || turningPoints.at?.(-1)?.event || "No major shift recorded yet.";

  return (
    <div className="relationship-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="relationship-drawer" role="dialog" aria-modal="true" aria-label="Relationship pulse">
        <header>
          <div><span><HeartHandshake size={15}/> RELATIONSHIP PULSE</span><h2>{character?.name}</h2><p>A quiet summary of what the story has actually earned so far.</p></div>
          <button onClick={onClose} aria-label="Close relationship pulse"><X size={19}/></button>
        </header>

        <section className="relationship-drawer__hero">
          <small>CURRENT DYNAMIC</small>
          <strong>{dynamic}</strong>
          <span>{formatPhase(phase)}</span>
        </section>

        <div className="relationship-drawer__grid">
          <section><small>RECENT SHIFT</small><p>{recentShift}</p></section>
          <section><small>UNRESOLVED</small><p>{contradictions.length ? contradictions.at(-1) : "Nothing strong enough to mark as unresolved."}</p></section>
        </div>

        {residue.length > 0 && <section className="relationship-drawer__list"><h3>Still carrying</h3>{residue.slice(-4).reverse().map((item, index)=><article key={`${item.emotion}-${index}`}><Sparkles size={14}/><div><strong>{item.emotion}</strong><p>{item.behavioral_effect || item.cause}</p></div></article>)}</section>}
        {turningPoints.length > 0 && <section className="relationship-drawer__list"><h3>Turning points</h3>{turningPoints.slice(-6).reverse().map((item, index)=><article key={item.message_id || index}><span className="relationship-drawer__dot"/><div><strong>{item.event || "Story shift"}</strong>{item.impact && <p>{item.impact}</p>}</div></article>)}</section>}

        <footer>Velvet never uses a love percentage. This only reflects grounded story evidence.</footer>
      </aside>
    </div>
  );
}

function formatPhase(value = "") {
  return String(value || "baseline").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
