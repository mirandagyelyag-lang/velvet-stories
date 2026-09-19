import { Pencil, Plus, Save, ShieldCheck, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import "../styles/npc-cast-drawer.css";

const EMPTY_DRAFT = {
  name: "",
  role: "",
  relationship: "",
  personality_note: "",
};

function clean(value = "", max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function sameName(a = "", b = "") {
  return clean(a, 120).localeCompare(clean(b, 120), undefined, { sensitivity: "accent" }) === 0;
}

export default function NpcCastDrawer({
  open,
  onClose,
  conversationId,
  character,
  groupCharacters = [],
  userName = "You",
  disabled = false,
}) {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const reservedNames = useMemo(() => [
    clean(userName, 100),
    clean(character?.name, 100),
    ...groupCharacters.map((item) => clean(item?.name, 100)),
  ].filter(Boolean), [userName, character?.name, groupCharacters]);

  async function load() {
    if (!conversationId) return;
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("story_cast_members")
      .select("id, name, role, personality_note, relationship, current_dynamic, goals, knowledge, last_interaction, presence, status, turn_count, is_user_created, created_at, updated_at")
      .eq("conversation_id", conversationId)
      .eq("is_user_created", true)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setItems(data || []);
  }

  useEffect(() => {
    if (!open || !conversationId) return;
    setDraft(EMPTY_DRAFT);
    setEditingId("");
    setNotice("");
    setError("");
    load();
  }, [open, conversationId]);

  function startEdit(item) {
    setEditingId(item.id);
    setDraft({
      name: item.name || "",
      role: item.role || "",
      relationship: item.relationship || "",
      personality_note: item.personality_note || "",
    });
    setNotice("");
    setError("");
  }

  function resetDraft() {
    setEditingId("");
    setDraft(EMPTY_DRAFT);
    setNotice("");
    setError("");
  }

  async function bumpStoryRevision() {
    if (!conversationId) return;
    await supabase
      .from("conversations")
      .update({ story_revision: crypto.randomUUID(), updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  async function clearStaleNpcRuntime(oldName = "") {
    if (!conversationId || !oldName) return;
    const { data } = await supabase
      .from("conversations")
      .select("cast_state, scene_state, intelligence_state")
      .eq("id", conversationId)
      .maybeSingle();
    if (!data) return;

    const castState = { ...(data.cast_state || {}) };
    for (const key of Object.keys(castState)) {
      if (sameName(key, oldName) || sameName(castState[key]?.name, oldName)) delete castState[key];
    }

    const sceneState = { ...(data.scene_state || {}) };
    if (Array.isArray(sceneState.present)) {
      sceneState.present = sceneState.present.filter((name) => !sameName(name, oldName));
    }

    const intelligenceState = { ...(data.intelligence_state || {}) };
    const behavior = { ...(intelligenceState.human_behavior_state || {}) };
    for (const key of [
      "npc_graph_snapshot",
      "npc_active_thread",
      "npc_availability_note",
      "npc_information_route",
      "npc_recurring_identity",
      "npc_relationship_shift",
    ]) {
      if (String(behavior[key] || "").toLowerCase().includes(String(oldName).toLowerCase())) behavior[key] = "";
    }
    intelligenceState.human_behavior_state = behavior;

    await supabase
      .from("conversations")
      .update({
        cast_state: castState,
        scene_state: sceneState,
        intelligence_state: intelligenceState,
        story_revision: crypto.randomUUID(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  }

  async function saveNpc(event) {
    event.preventDefault();
    if (disabled || !conversationId) return;

    const next = {
      name: clean(draft.name, 100),
      role: clean(draft.role, 180),
      relationship: clean(draft.relationship, 320),
      personality_note: clean(draft.personality_note, 320),
    };
    if (!next.name) {
      setError("Give the NPC a name first.");
      return;
    }
    if (reservedNames.some((name) => sameName(name, next.name))) {
      setError("That name already belongs to you or a main character in this chat.");
      return;
    }
    const duplicate = items.find((item) => item.id !== editingId && sameName(item.name, next.name));
    if (duplicate) {
      setError("That NPC already exists in this chat.");
      return;
    }

    setBusy(editingId || "new");
    setError("");
    setNotice("");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) {
      setBusy("");
      setError("Your session expired. Sign in again.");
      return;
    }

    const existing = editingId ? items.find((item) => item.id === editingId) : null;
    let result;
    if (editingId) {
      result = await supabase
        .from("story_cast_members")
        .update({
          ...next,
          is_user_created: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId)
        .eq("conversation_id", conversationId)
        .eq("is_user_created", true)
        .select()
        .single();
    } else {
      result = await supabase
        .from("story_cast_members")
        .insert({
          user_id: authData.user.id,
          conversation_id: conversationId,
          ...next,
          current_dynamic: "",
          goals: "",
          knowledge: "",
          last_interaction: "",
          presence: "off_scene",
          status: "active",
          turn_count: 0,
          is_user_created: true,
        })
        .select()
        .single();
    }

    if (result.error) {
      setBusy("");
      setError(result.error.code === "23505" ? "That NPC already exists in this chat." : result.error.message);
      return;
    }

    if (existing?.name && !sameName(existing.name, next.name)) {
      await clearStaleNpcRuntime(existing.name);
    } else {
      await bumpStoryRevision();
    }

    setItems((current) => {
      if (editingId) return current.map((item) => item.id === editingId ? result.data : item);
      return [...current, result.data];
    });
    setBusy("");
    const wasEditing = Boolean(editingId);
    setEditingId("");
    setDraft(EMPTY_DRAFT);
    setNotice(wasEditing ? next.name + " updated." : next.name + " added to this story.");
  }

  async function removeNpc(item) {
    if (disabled || !item?.id) return;
    setBusy(item.id);
    setError("");
    setNotice("");

    await Promise.all([
      supabase.from("story_cast_connections").delete().eq("conversation_id", conversationId).eq("from_name", item.name),
      supabase.from("story_cast_connections").delete().eq("conversation_id", conversationId).eq("to_name", item.name),
      supabase.from("story_knowledge_entries").delete().eq("conversation_id", conversationId).eq("character_name", item.name),
      supabase.from("story_chemistry_profiles").delete().eq("conversation_id", conversationId).eq("character_name", item.name),
    ]);

    const { error: deleteError } = await supabase
      .from("story_cast_members")
      .delete()
      .eq("id", item.id)
      .eq("conversation_id", conversationId)
      .eq("is_user_created", true);

    if (deleteError) {
      setBusy("");
      setError(deleteError.message);
      return;
    }

    await clearStaleNpcRuntime(item.name);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (editingId === item.id) resetDraft();
    setBusy("");
    setNotice(item.name + " removed. Velvet can no longer use that name in this chat.");
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal((
    <div className="npc-cast-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <aside className="npc-cast-drawer" role="dialog" aria-modal="true" aria-label="NPC cast">
        <header className="npc-cast-drawer__header">
          <div>
            <span><UsersRound size={15}/> CHAT CAST</span>
            <h2>Your NPCs</h2>
            <p>Only people you create here are allowed to have names in this conversation.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close NPC cast"><X size={20}/></button>
        </header>

        <section className="npc-cast-rule">
          <ShieldCheck size={18}/>
          <div>
            <strong>Closed named cast</strong>
            <p>Velvet may still use unnamed people like “a classmate” or “the bartender”, but it cannot invent Chloe, Tyler, Madison, or reuse an NPC from another chat.</p>
          </div>
        </section>

        <form className="npc-cast-form" onSubmit={saveNpc}>
          <div className="npc-cast-form__title">
            <span>{editingId ? <Pencil size={16}/> : <Plus size={16}/>}</span>
            <div><strong>{editingId ? "Edit NPC" : "Create NPC"}</strong><small>Exists only in this story</small></div>
          </div>
          <label>
            Name
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Marcus"
              maxLength={100}
              autoComplete="off"
            />
          </label>
          <label>
            Role
            <input
              value={draft.role}
              onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
              placeholder="Chase's teammate, roommate, classmate..."
              maxLength={180}
            />
          </label>
          <label>
            Relationship
            <textarea
              rows="2"
              value={draft.relationship}
              onChange={(event) => setDraft((current) => ({ ...current, relationship: event.target.value }))}
              placeholder="How they know the character, what exists between them..."
              maxLength={320}
            />
          </label>
          <label>
            Personality / notes
            <textarea
              rows="2"
              value={draft.personality_note}
              onChange={(event) => setDraft((current) => ({ ...current, personality_note: event.target.value }))}
              placeholder="Confident, messy, loyal, blunt..."
              maxLength={320}
            />
          </label>
          <div className="npc-cast-form__actions">
            {editingId && <button type="button" className="npc-cast-button npc-cast-button--ghost" onClick={resetDraft} disabled={Boolean(busy)}>Cancel</button>}
            <button type="submit" className="npc-cast-button npc-cast-button--primary" disabled={disabled || Boolean(busy)}>
              {busy === (editingId || "new") ? "Saving..." : <><Save size={15}/>{editingId ? "Save NPC" : "Add NPC"}</>}
            </button>
          </div>
        </form>

        <section className="npc-cast-list">
          <div className="npc-cast-list__heading">
            <div><strong>Allowed named NPCs</strong><small>{items.length} in this chat</small></div>
            <UserRound size={17}/>
          </div>
          {loading && <p className="npc-cast-empty">Loading cast...</p>}
          {!loading && !items.length && <p className="npc-cast-empty">No NPCs yet. Until you add one, supporting people stay unnamed.</p>}
          {items.map((item) => (
            <article className="npc-cast-card" key={item.id}>
              <div className="npc-cast-card__avatar">{item.name?.slice(0, 1)?.toUpperCase() || "?"}</div>
              <div className="npc-cast-card__body">
                <strong>{item.name}</strong>
                <span>{item.role || "NPC"}</span>
                {item.relationship && <p>{item.relationship}</p>}
              </div>
              <div className="npc-cast-card__actions">
                <button type="button" onClick={() => startEdit(item)} disabled={disabled || Boolean(busy)} aria-label={"Edit " + item.name}><Pencil size={15}/></button>
                <button type="button" onClick={() => removeNpc(item)} disabled={disabled || Boolean(busy)} aria-label={"Remove " + item.name}><Trash2 size={15}/></button>
              </div>
            </article>
          ))}
        </section>

        {(notice || error) && <div className={"npc-cast-notice" + (error ? " is-error" : "")} role="status">{error || notice}</div>}
      </aside>
    </div>
  ), document.body);
}
