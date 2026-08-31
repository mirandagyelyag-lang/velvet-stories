import { HeartHandshake, Save, Sparkles, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function RelationshipDrawer({ open, onClose, character, characters = [], persona = null, conversation }) {
  const [livingCast, setLivingCast] = useState([]);
  const [castBusy, setCastBusy] = useState("");
  const [castNotice, setCastNotice] = useState("");
  const [chemistry, setChemistry] = useState([]);
  const [milestones, setMilestones] = useState([]);
  useEffect(() => {
    if (!open || !conversation?.conversationId) return;
    Promise.all([
      supabase.from("story_cast_members").select("*").eq("conversation_id", conversation.conversationId).order("updated_at", { ascending: false }),
      supabase.from("story_chemistry_profiles").select("*").eq("conversation_id", conversation.conversationId).order("updated_at", { ascending: false }),
      supabase.from("story_milestones").select("*").eq("conversation_id", conversation.conversationId).order("created_at", { ascending: false }).limit(8),
    ]).then(([castResult, chemistryResult, milestoneResult]) => {
      if (!castResult.error) setLivingCast(castResult.data || []);
      if (!chemistryResult.error) setChemistry(chemistryResult.data || []);
      if (!milestoneResult.error) setMilestones(milestoneResult.data || []);
    });
  }, [open, conversation?.conversationId]);
  const changeCast = (id, field, value) => setLivingCast((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const saveCast = async (member) => {
    setCastBusy(member.id); setCastNotice("");
    const { error } = await supabase.from("story_cast_members").update({ role: member.role || "", relationship: member.relationship || "", current_dynamic: member.current_dynamic || "", goals: member.goals || "", knowledge: member.knowledge || "", personality_note: member.personality_note || "", status: member.status || "active", updated_at: new Date().toISOString() }).eq("id", member.id);
    setCastBusy(""); setCastNotice(error ? error.message : `${member.name} updated.`);
  };
  const removeCast = async (member) => {
    setCastBusy(member.id);
    const { error } = await supabase.from("story_cast_members").delete().eq("id", member.id);
    if (!error) setLivingCast((current) => current.filter((item) => item.id !== member.id));
    setCastBusy(""); setCastNotice(error ? error.message : `${member.name} removed from this story.`);
  };
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

        <section className="v311-relationship-pulse">
          <div><small>WHERE IT FEELS NOW</small><strong>{humanPhase(phase)}</strong></div>
          <div className="v311-relationship-pulse__signals">
            {relationshipSignals(chemistry.find((item)=>normalizeName(item.character_name)===normalizeName(character?.name)), recentShift).map((signal)=><span key={signal}>{signal}</span>)}
          </div>
        </section>

        <div className="relationship-drawer__grid">
          <section><small>RECENT SHIFT</small><p>{recentShift}</p></section>
          <section><small>UNRESOLVED</small><p>{contradictions.length ? formatLooseItem(contradictions.at(-1)) : "Nothing strong enough to mark as unresolved."}</p></section>
        </div>

        {mapCast.length > 1 && <section className="relationship-drawer__list"><h3><Users size={15}/> Group dynamics</h3>{mapCast.map((item) => {
          const state = castState[item.name] || castState[item.id] || {};
          return <article key={`cast-${item.id}`}><span className="relationship-drawer__dot"/><div><strong>{item.name}</strong><p>{state.current_status || state.relationship || state.role || (item.id === character?.id ? dynamic : "No stronger relationship evidence recorded yet.")}</p></div></article>;
        })}</section>}

        {conversation?.groupMode && chemistry.length > 0 && <section className="v311-group-bonds"><h3><HeartHandshake size={15}/> Different bonds, different people</h3><p>Velvet tracks each relationship separately. Nobody has to feel the same thing at the same time.</p><div>{chemistry.map((profile)=><article key={profile.id}><strong>{profile.character_name}</strong><span>{trustLabel(profile.trust_score)} trust</span><span>{tensionLabel(profile.tension_score)} tension</span>{profile.banter_style&&<small>{profile.banter_style}</small>}</article>)}</div></section>}

        {milestones.length > 0 && <section className="v311-relationship-milestones"><h3>Relationship history</h3>{milestones.slice(0,5).map((item)=><article key={item.id}><span className="relationship-drawer__dot"/><div><strong>{item.title || "Story shift"}</strong><p>{item.details || item.milestone_type}</p></div></article>)}</section>}

        <section className="living-cast-editor">
          <h3><Users size={15}/> Living cast</h3>
          <p>Recurring people keep their own relationship, goals and knowledge instead of resetting every scene.</p>
          {!livingCast.length && <small>No recurring NPC has earned a durable entry yet.</small>}
          {livingCast.map((member) => <article key={member.id} className="living-cast-editor__card">
            <header><div><strong>{member.name}</strong><small>{member.presence === "present" ? "In this scene" : "Off scene"} · {member.turn_count || 1} beats</small></div><select value={member.status || "active"} onChange={(event)=>changeCast(member.id,"status",event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="departed">Departed</option></select></header>
            <label>Role<input value={member.role || ""} onChange={(event)=>changeCast(member.id,"role",event.target.value)}/></label>
            <label>Relationship<textarea rows="2" value={member.relationship || ""} onChange={(event)=>changeCast(member.id,"relationship",event.target.value)}/></label>
            <label>Current dynamic<textarea rows="2" value={member.current_dynamic || ""} onChange={(event)=>changeCast(member.id,"current_dynamic",event.target.value)}/></label>
            <label>Independent goal<textarea rows="2" value={member.goals || ""} onChange={(event)=>changeCast(member.id,"goals",event.target.value)}/></label>
            <label>What they know<textarea rows="2" value={member.knowledge || ""} onChange={(event)=>changeCast(member.id,"knowledge",event.target.value)}/></label>
            <footer><button type="button" onClick={()=>removeCast(member)} disabled={castBusy===member.id}><Trash2 size={14}/>Remove</button><button type="button" onClick={()=>saveCast(member)} disabled={castBusy===member.id}><Save size={14}/>Save NPC</button></footer>
          </article>)}
          {castNotice && <small role="status">{castNotice}</small>}
        </section>

        {residue.length > 0 && <section className="relationship-drawer__list"><h3>Still carrying</h3>{residue.slice(-4).reverse().map((item, index)=><article key={`${item.emotion || "emotion"}-${index}`}><Sparkles size={14}/><div><strong>{item.emotion || "Emotional residue"}</strong><p>{item.behavioral_effect || item.cause || formatLooseItem(item)}</p></div></article>)}</section>}
        {turningPoints.length > 0 && <section className="relationship-drawer__list"><h3>Turning points</h3>{turningPoints.slice(-6).reverse().map((item, index)=><article key={item.message_id || index}><span className="relationship-drawer__dot"/><div><strong>{item.event || "Story shift"}</strong>{item.impact && <p>{item.impact}</p>}</div></article>)}</section>}

        <footer>Velvet only moves this map when the visible story earns a change.</footer>
      </aside>
    </div>
  );
}

function normalizeName(value=""){ return String(value||"").trim().toLowerCase(); }
function humanPhase(value="") {
  const key=normalizeName(value).replace(/[_-]+/g," ");
  if (!key || key==="baseline") return "Still finding the shape of this";
  if (/stranger|new/.test(key)) return "New to each other";
  if (/familiar|acquaint/.test(key)) return "Familiar";
  if (/friend|close/.test(key)) return "Close";
  if (/complic|tension|conflict/.test(key)) return "Complicated";
  if (/romance|dating|lover|couple/.test(key)) return "Something real is forming";
  if (/repair|rebuild/.test(key)) return "Rebuilding";
  return key.replace(/\b\w/g,(letter)=>letter.toUpperCase());
}
function trustLabel(value){ const n=Number(value||0); return n>=70?"solid":n>=45?"growing":n>=25?"cautious":"fragile"; }
function tensionLabel(value){ const n=Number(value||0); return n>=70?"intense":n>=45?"charged":n>=20?"noticeable":"low"; }
function relationshipSignals(profile, recentShift="") {
  const signals=[];
  if(profile){ signals.push(`${trustLabel(profile.trust_score)} trust`); if(Number(profile.tension_score||0)>=20) signals.push(`${tensionLabel(profile.tension_score)} tension`); }
  if(recentShift) signals.push("recent shift");
  return signals.length?signals:["still unfolding"];
}

function formatPhase(value = "") {
  return String(value || "baseline").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatLooseItem(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.detail || value.impact || value.event || value.title || value.label || JSON.stringify(value);
}
