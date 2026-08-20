import { HeartHandshake, Sparkles, Users, X } from "lucide-react";

export default function RelationshipDrawer({ open, onClose, character, characters = [], persona = null, conversation }) {
  if (!open) return null;

  const relationship = conversation?.relationshipState || {};
  const development = conversation?.characterDevelopment || {};
  const dynamic = relationship.current_dynamic || development.current_dynamic || character?.relationship || "Still being established.";
  const phase = relationship.relationship_phase || development.relationship_phase || "baseline";
  const contradictions = relationship.active_contradictions || development.active_contradictions || [];
  const turningPoints = relationship.turning_points || development.turning_points || [];
  const residue = relationship.emotional_residue || development.emotional_residue || [];
  const recentShift = relationship.recent_shift || turningPoints.at?.(-1)?.impact || turningPoints.at?.(-1)?.event || "No major shift recorded yet.";
  const castState = conversation?.castState || {};
  const groupIds = new Set([character?.id, ...(conversation?.groupCharacterIds || [])].filter(Boolean));
  const storyCast = characters.filter((item) => groupIds.has(item.id));
  const mapCast = storyCast.length ? storyCast : [character].filter(Boolean);

  return (
    <div className="relationship-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="relationship-drawer relationship-drawer--v250" role="dialog" aria-modal="true" aria-label="Relationship map">
        <header>
          <div><span><HeartHandshake size={15}/> RELATIONSHIP MAP</span><h2>{conversation?.groupMode ? "Your story bonds" : character?.name}</h2><p>Grounded in what has actually happened, never a fake love percentage.</p></div>
          <button onClick={onClose} aria-label="Close relationship map"><X size={19}/></button>
        </header>

        <section className="relationship-map" aria-label="Story relationship map">
          <div className="relationship-map__you"><span>{persona?.name?.[0] || "Y"}</span><strong>{persona?.name || "You"}</strong></div>
          <div className="relationship-map__links" aria-hidden="true" />
          <div className="relationship-map__cast">{mapCast.map((item, index) => {
            const state = castState[item.name] || castState[item.id] || {};
            const isPrimary = item.id === character?.id;
            return <article key={item.id || item.name} className={isPrimary ? "is-primary" : ""} style={{ "--map-index": index }}>
              <span>{item.imageUrl || item.coverUrl ? <img src={item.imageUrl || item.coverUrl} alt=""/> : item.initials || item.name?.[0] || "✦"}</span>
              <strong>{item.name}</strong>
              <small>{isPrimary ? formatPhase(phase) : state.relationship || state.current_dynamic || state.role || "Part of this story"}</small>
            </article>;
          })}</div>
        </section>

        <section className="relationship-drawer__hero">
          <small>CURRENT DYNAMIC</small>
          <strong>{dynamic}</strong>
          <span>{formatPhase(phase)}</span>
        </section>

        <div className="relationship-drawer__grid">
          <section><small>RECENT SHIFT</small><p>{recentShift}</p></section>
          <section><small>UNRESOLVED</small><p>{contradictions.length ? formatLooseItem(contradictions.at(-1)) : "Nothing strong enough to mark as unresolved."}</p></section>
        </div>

        {mapCast.length > 1 && <section className="relationship-drawer__list"><h3><Users size={15}/> Group dynamics</h3>{mapCast.map((item) => {
          const state = castState[item.name] || castState[item.id] || {};
          return <article key={`cast-${item.id}`}><span className="relationship-drawer__dot"/><div><strong>{item.name}</strong><p>{state.current_status || state.relationship || state.role || (item.id === character?.id ? dynamic : "No stronger relationship evidence recorded yet.")}</p></div></article>;
        })}</section>}

        {residue.length > 0 && <section className="relationship-drawer__list"><h3>Still carrying</h3>{residue.slice(-4).reverse().map((item, index)=><article key={`${item.emotion || "emotion"}-${index}`}><Sparkles size={14}/><div><strong>{item.emotion || "Emotional residue"}</strong><p>{item.behavioral_effect || item.cause || formatLooseItem(item)}</p></div></article>)}</section>}
        {turningPoints.length > 0 && <section className="relationship-drawer__list"><h3>Turning points</h3>{turningPoints.slice(-6).reverse().map((item, index)=><article key={item.message_id || index}><span className="relationship-drawer__dot"/><div><strong>{item.event || "Story shift"}</strong>{item.impact && <p>{item.impact}</p>}</div></article>)}</section>}

        <footer>Velvet only moves this map when the visible story earns a change.</footer>
      </aside>
    </div>
  );
}

function formatPhase(value = "") {
  return String(value || "baseline").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatLooseItem(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.detail || value.impact || value.event || value.title || value.label || JSON.stringify(value);
}
