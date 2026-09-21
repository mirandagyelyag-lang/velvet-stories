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
  scope: "character",
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
  const [characterItems, setCharacterItems] = useState([]);
  const [storyItems, setStoryItems] = useState([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState("");
  const [editingScope, setEditingScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const allItems = useMemo(
    () => [
      ...characterItems.map((item) => ({ ...item, __scope: "character" })),
      ...storyItems.map((item) => ({ ...item, __scope: "conversation" })),
    ],
    [characterItems, storyItems]
  );

  const reservedNames = useMemo(() => [
    clean(userName, 100),
    clean(character?.name, 100),
    ...groupCharacters.map((item) => clean(item?.name, 100)),
  ].filter(Boolean), [userName, character?.name, groupCharacters]);

  async function load() {
    if (!conversationId || !character?.id) return;
    setLoading(true);
    setError("");

    const [characterResult, storyResult] = await Promise.all([
      supabase
        .from("character_npcs")
        .select("id, character_id, name, role, personality_note, relationship, created_at, updated_at")
        .eq("character_id", character.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("story_cast_members")
        .select("id, name, role, personality_note, relationship, current_dynamic, goals, knowledge, last_interaction, presence, status, turn_count, is_user_created, created_at, updated_at")
        .eq("conversation_id", conversationId)
        .eq("is_user_created", true)
        .order("created_at", { ascending: true }),
    ]);

    setLoading(false);

    if (characterResult.error) {
      setError(characterResult.error.message);
      return;
    }
    if (storyResult.error) {
      setError(storyResult.error.message);
      return;
    }

    setCharacterItems(characterResult.data || []);
    setStoryItems(storyResult.data || []);
  }

  useEffect(() => {
    if (!open || !conversationId || !character?.id) return;
    setDraft(EMPTY_DRAFT);
    setEditingId("");
    setEditingScope("");
    setNotice("");
    setError("");
    load();
  }, [open, conversationId, character?.id]);

  function startEdit(item) {
    const scope = item.__scope || "conversation";
    setEditingId(item.id);
    setEditingScope(scope);
    setDraft({
      name: item.name || "",
      role: item.role || "",
      relationship: item.relationship || "",
      personality_note: item.personality_note || "",
      scope,
    });
    setNotice("");
    setError("");
  }

  function resetDraft() {
    setEditingId("");
    setEditingScope("");
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
    if (disabled || !conversationId || !character?.id) return;

    const scope = editingScope || draft.scope || "character";
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
      setError("That name already belongs to you or a main character.");
      return;
    }

    const duplicate = allItems.find((item) => !(item.id === editingId && item.__scope === scope) && sameName(item.name, next.name));
    if (duplicate) {
      setError(`${next.name} already exists in this character's NPC canon.`);
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

    const existing = editingId ? allItems.find((item) => item.id === editingId && item.__scope === scope) : null;
    let result;

    if (scope === "character") {
      if (editingId) {
        result = await supabase
          .from("character_npcs")
          .update({ ...next, updated_at: new Date().toISOString() })
          .eq("id", editingId)
          .eq("character_id", character.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("character_npcs")
          .insert({
            user_id: authData.user.id,
            character_id: character.id,
            ...next,
          })
          .select()
          .single();
      }
    } else if (editingId) {
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
      setError(result.error.code === "23505" ? "That NPC already exists." : result.error.message);
      return;
    }

    if (existing?.name && !sameName(existing.name, next.name)) {
      await clearStaleNpcRuntime(existing.name);
    } else {
      await bumpStoryRevision();
    }

    if (scope === "character") {
      setCharacterItems((current) => editingId
        ? current.map((item) => item.id === editingId ? result.data : item)
        : [...current, result.data]);
    } else {
      setStoryItems((current) => editingId
        ? current.map((item) => item.id === editingId ? result.data : item)
        : [...current, result.data]);
    }

    setBusy("");
    const wasEditing = Boolean(editingId);
    setEditingId("");
    setEditingScope("");
    setDraft(EMPTY_DRAFT);
    setNotice(
      wasEditing
        ? next.name + " updated."
        : scope === "character"
          ? next.name + " added to every " + (character?.name || "character") + " chat."
          : next.name + " added only to this story."
    );
  }

  async function removeNpc(item) {
    if (disabled || !item?.id) return;
    const scope = item.__scope || "conversation";
    setBusy(item.id);
    setError("");
    setNotice("");

    if (scope === "conversation") {
      await Promise.all([
        supabase.from("story_cast_connections").delete().eq("conversation_id", conversationId).eq("from_name", item.name),
        supabase.from("story_cast_connections").delete().eq("conversation_id", conversationId).eq("to_name", item.name),
        supabase.from("story_knowledge_entries").delete().eq("conversation_id", conversationId).eq("character_name", item.name),
        supabase.from("story_chemistry_profiles").delete().eq("conversation_id", conversationId).eq("character_name", item.name),
      ]);
    }

    const deleteQuery = scope === "character"
      ? supabase.from("character_npcs").delete().eq("id", item.id).eq("character_id", character.id)
      : supabase.from("story_cast_members").delete().eq("id", item.id).eq("conversation_id", conversationId).eq("is_user_created", true);

    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
      setBusy("");
      setError(deleteError.message);
      return;
    }

    await clearStaleNpcRuntime(item.name);

    if (scope === "character") {
      setCharacterItems((current) => current.filter((entry) => entry.id !== item.id));
    } else {
      setStoryItems((current) => current.filter((entry) => entry.id !== item.id));
    }

    if (editingId === item.id) resetDraft();
    setBusy("");
    setNotice(
      scope === "character"
        ? item.name + " removed from " + (character?.name || "this character") + "'s canon."
        : item.name + " removed from this story."
    );
  }

  function renderCard(item, scope) {
    const scoped = { ...item, __scope: scope };
    return (
      <article className="npc-cast-card" key={scope + ":" + item.id}>
        <div className="npc-cast-card__avatar">{item.name?.slice(0, 1)?.toUpperCase() || "?"}</div>
        <div className="npc-cast-card__body">
          <strong>{item.name}</strong>
          <span>{item.role || "NPC"}</span>
          {item.relationship && <p>{item.relationship}</p>}
        </div>
        <div className="npc-cast-card__actions">
          <button type="button" onClick={() => startEdit(scoped)} disabled={disabled || Boolean(busy)} aria-label={"Edit " + item.name}><Pencil size={15}/></button>
          <button type="button" onClick={() => removeNpc(scoped)} disabled={disabled || Boolean(busy)} aria-label={"Remove " + item.name}><Trash2 size={15}/></button>
        </div>
      </article>
    );
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal((
    <div className="npc-cast-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <aside className="npc-cast-drawer" role="dialog" aria-modal="true" aria-label="NPC cast">
        <header className="npc-cast-drawer__header">
          <div>
            <span><UsersRound size={15}/> NPC CANON</span>
            <h2>Your NPCs</h2>
            <p>Choose whether an NPC belongs to {character?.name || "this character"} forever or only to this story.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close NPC cast"><X size={20}/></button>
        </header>

        <section className="npc-cast-rule">
          <ShieldCheck size={18}/>
          <div>
            <strong>Two-level named cast</strong>
            <p>Character NPCs can recur in every chat for this character. Story NPCs stay locked to this conversation. Velvet still cannot invent extra named people.</p>
          </div>
        </section>

        <form className="npc-cast-form" onSubmit={saveNpc}>
          <div className="npc-cast-form__title">
            <span>{editingId ? <Pencil size={16}/> : <Plus size={16}/>}</span>
            <div>
              <strong>{editingId ? "Edit NPC" : "Create NPC"}</strong>
              <small>{(editingScope || draft.scope) === "character" ? "Character canon · every chat" : "Story canon · this chat only"}</small>
            </div>
          </div>

          {!editingId && (
            <div className="npc-cast-scope" role="group" aria-label="NPC scope">
              <button
                type="button"
                className={draft.scope === "character" ? "is-active" : ""}
                onClick={() => setDraft((current) => ({ ...current, scope: "character" }))}
              >
                Character NPC
                <small>Every {character?.name || "character"} chat</small>
              </button>
              <button
                type="button"
                className={draft.scope === "conversation" ? "is-active" : ""}
                onClick={() => setDraft((current) => ({ ...current, scope: "conversation" }))}
              >
                Story NPC
                <small>This chat only</small>
              </button>
            </div>
          )}

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
              placeholder="Best friend, sister, rival..."
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
            <div><strong>Character NPCs</strong><small>{characterItems.length} across every chat</small></div>
            <UserRound size={17}/>
          </div>
          {loading && <p className="npc-cast-empty">Loading cast...</p>}
          {!loading && !characterItems.length && <p className="npc-cast-empty">No persistent NPCs yet.</p>}
          {!loading && characterItems.map((item) => renderCard(item, "character"))}
        </section>

        <section className="npc-cast-list">
          <div className="npc-cast-list__heading">
            <div><strong>Story NPCs</strong><small>{storyItems.length} in this chat only</small></div>
            <UserRound size={17}/>
          </div>
          {!loading && !storyItems.length && <p className="npc-cast-empty">No chat-only NPCs yet.</p>}
          {!loading && storyItems.map((item) => renderCard(item, "conversation"))}
        </section>

        {(notice || error) && <div className={"npc-cast-notice" + (error ? " is-error" : "")} role="status">{error || notice}</div>}
      </aside>
    </div>
  ), document.body);
}
