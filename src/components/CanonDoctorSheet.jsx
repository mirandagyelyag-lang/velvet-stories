import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import "../styles/velvet-v3340-canon-doctor.css";

const TYPE_LABELS = {
  private_thought_leak: "Private thought leak",
  boundary_violation: "Boundary violation",
  user_state_override: "User state override",
  unsupported_shared_canon: "Unsupported shared canon",
  location_continuity: "Location continuity",
  knowledge_leak: "Knowledge leak",
  contradiction: "Contradiction",
  stale_thread: "Stale thread",
  memory_contamination: "Memory contamination",
  other: "State inconsistency",
};

export default function CanonDoctorSheet({ open, onClose, report, loading, applying, error, applied, onRepair, onRescan }) {
  if (!open || typeof document === "undefined") return null;
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  const high = findings.filter((item) => item.severity === "high").length;
  const medium = findings.filter((item) => item.severity === "medium").length;
  const repairStats = applied && typeof applied === "object" ? applied : {};
  const repairedCount = Number(repairStats.memoriesSuperseded || 0) + Number(repairStats.knowledgeRemoved || 0) + Number(repairStats.prunePhrases || 0);
  return createPortal(
    <div className="canon-doctor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !applying && onClose?.()}>
      <section className="canon-doctor" role="dialog" aria-modal="true" aria-label="Canon Doctor">
        <header>
          <div><small>CANON DOCTOR</small><h2>Repair Story State</h2><p>Messages stay untouched. Velvet only cleans internal memory, canon and scene state.</p></div>
          <button type="button" onClick={onClose} disabled={applying} aria-label="Close Canon Doctor"><X size={19}/></button>
        </header>

        {loading ? <div className="canon-doctor__loading"><LoaderCircle className="spin" size={24}/><strong>Auditing this story…</strong><span>Checking POV privacy, boundaries, canon, memories and physical continuity.</span></div> : null}
        {error ? <div className="canon-doctor__error"><AlertTriangle size={18}/><span>{error}</span></div> : null}
        {applied ? <div className="canon-doctor__success"><CheckCircle2 size={19}/><div><strong>Story state repaired</strong><span>{repairedCount > 0
          ? `Cleaned ${Number(repairStats.memoriesSuperseded || 0)} memories, ${Number(repairStats.knowledgeRemoved || 0)} knowledge entries and ${Number(repairStats.prunePhrases || 0)} contaminated state phrases.`
          : "Persistent state was normalized and a fresh story revision was created. No saved contaminated entries needed deletion."}</span><small>Your visible messages were not changed. A safety snapshot was created first.</small></div></div> : null}

        {!loading && report ? <>
          <div className="canon-doctor__score">
            <div className={`canon-doctor__orb is-${report.status || "review"}`}><strong>{Math.round(Number(report.score) || 0)}</strong><span>/100</span></div>
            <div><strong>{report.status === "clean" ? "Canon looks clean" : report.status === "repair_recommended" ? "Repair recommended" : "A few things need review"}</strong><p>{report.summary || "Velvet finished auditing the persistent story state."}</p></div>
          </div>
          <div className="canon-doctor__stats"><span><b>{high}</b> high</span><span><b>{medium}</b> medium</span><span><b>{findings.length}</b> total findings</span></div>
          <div className="canon-doctor__findings">
            {findings.length ? findings.map((item, index) => <article key={`${item.messageId || "finding"}-${index}`} className={`is-${item.severity || "medium"}`}>
              <div><span>{TYPE_LABELS[item.type] || TYPE_LABELS.other}</span><em>{item.severity || "medium"}</em></div>
              {item.evidence ? <blockquote>{item.evidence}</blockquote> : null}
              <p>{item.reason}</p>
            </article>) : <div className="canon-doctor__empty"><ShieldCheck size={20}/><span>No persistent-state contamination detected.</span></div>}
          </div>
          {(report?.canon?.unsupported?.length || report?.canon?.contradictions?.length) ? <div className="canon-doctor__canon-box">
            {report.canon.unsupported?.length ? <div><strong>Unsupported state</strong>{report.canon.unsupported.slice(0,5).map((item,index)=><span key={index}>{item}</span>)}</div> : null}
            {report.canon.contradictions?.length ? <div><strong>Contradictions</strong>{report.canon.contradictions.slice(0,5).map((item,index)=><span key={index}>{item}</span>)}</div> : null}
          </div> : null}
        </> : null}

        <footer>
          <button type="button" onClick={onRescan} disabled={loading || applying}><Sparkles size={16}/> Scan again</button>
          <button type="button" className="primary" onClick={onRepair} disabled={!report || loading || applying || report.status === "clean" || Boolean(applied)}>
            {applying ? <LoaderCircle className="spin" size={16}/> : <ShieldCheck size={16}/>} {applying ? "Repairing…" : applied ? "Repaired ✓" : "Repair Story State"}
          </button>
        </footer>
      </section>
    </div>, document.body
  );
}
