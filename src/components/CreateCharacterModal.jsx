import {
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronLeft,
  Heart,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Palette,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCharacters } from "../context/CharactersContext";
import "../styles/create-character-modal.css";

const initialForm = {
  name: "",
  role: "",
  description: "",
  personality: "",
  relationship: "",
  world: "",
  values: "",
  fears: "",
  habits: "",
  contradictions: "",
  coreMotivation: "",
  emotionalDefense: "",
  softeningTriggers: "",
  growthDirection: "",
  speechStyle: "",
  voiceVocabulary: "",
  humorStyle: "",
  conflictStyle: "",
  affectionStyle: "",
  verbalTells: "",
  voiceAvoidances: "",
  boundaries: "",
  scenario: "",
  exampleDialogue: "",
  responseLength: "balanced",
  narrationStyle: "balanced",
  firstMessage: "",
  imageUrl: "",
  coverUrl: "",
  imageFile: null,
  coverFile: null,
  color: "#7a2942",
};

const palette = ["#7a2942", "#243b6b", "#36594d", "#6d3e78", "#81552f", "#34343f", "#8a334f", "#405b78"];
const voiceFingerprintFields = ["voiceVocabulary", "humorStyle", "conflictStyle", "affectionStyle", "verbalTells", "voiceAvoidances"];
const generatedDraftFields = [
  "name", "role", "description", "personality", "relationship", "world", "values", "fears", "habits", "contradictions",
  "coreMotivation", "emotionalDefense", "softeningTriggers", "growthDirection", "speechStyle", "voiceVocabulary", "humorStyle",
  "conflictStyle", "affectionStyle", "verbalTells", "voiceAvoidances", "boundaries", "scenario", "exampleDialogue", "firstMessage",
];

function CreateCharacterModal({ onClose, onCreated, character = null }) {
  const { createCharacter, updateCharacter, enhanceCharacterDraft, enhanceCharacterFields, organizeCharacterDraft, generateCharacterDraft, testCharacterVoice } = useCharacters();
  const onCloseRef = useRef(onClose);
  const savingRef = useRef(false);
  const [form, setForm] = useState(() => character ? {
    ...initialForm,
    name: character.name || "",
    role: character.role || "",
    description: character.description || "",
    personality: character.personality || "",
    relationship: character.relationship || "",
    world: character.world || "",
    values: character.values || "",
    fears: character.fears || "",
    habits: character.habits || "",
    contradictions: character.contradictions || "",
    coreMotivation: character.coreMotivation || "",
    emotionalDefense: character.emotionalDefense || "",
    softeningTriggers: character.softeningTriggers || "",
    growthDirection: character.growthDirection || "",
    speechStyle: character.speechStyle || "",
    voiceVocabulary: character.voiceVocabulary || "",
    humorStyle: character.humorStyle || "",
    conflictStyle: character.conflictStyle || "",
    affectionStyle: character.affectionStyle || "",
    verbalTells: character.verbalTells || "",
    voiceAvoidances: character.voiceAvoidances || "",
    boundaries: character.boundaries || "",
    scenario: character.scenario || "",
    exampleDialogue: character.exampleDialogue || "",
    responseLength: character.responseLength || "balanced",
    narrationStyle: character.narrationStyle || "balanced",
    firstMessage: character.firstMessage || "",
    imageUrl: character.imageUrl || "",
    coverUrl: character.coverUrl || "",
    color: character.color || "#7a2942",
  } : initialForm);
  const [avatarPreview, setAvatarPreview] = useState(character?.imageUrl || "");
  const [coverPreview, setCoverPreview] = useState(character?.coverUrl || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { savingRef.current = saving; }, [saving]);

  useEffect(() => {
    document.body.classList.add("character-studio-open");

    const marker = `velvet-character-studio-${Date.now()}`;
    const markerState = { ...(window.history.state || {}), velvetCharacterStudio: marker };
    window.history.pushState(markerState, "", window.location.href);
    let historyEntryActive = true;

    const handleBack = () => {
      if (!historyEntryActive) return;
      historyEntryActive = false;
      if (savingRef.current) {
        window.history.pushState(markerState, "", window.location.href);
        historyEntryActive = true;
        return;
      }
      onCloseRef.current?.();
    };

    window.addEventListener("popstate", handleBack);
    return () => {
      document.body.classList.remove("character-studio-open");
      window.removeEventListener("popstate", handleBack);
      if (historyEntryActive && window.history.state?.velvetCharacterStudio === marker) {
        historyEntryActive = false;
        window.history.back();
      }
    };
  }, []);
  const [enhancing, setEnhancing] = useState(false);
  const [fieldPolishing, setFieldPolishing] = useState("");
  const [organizing, setOrganizing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [characterConcept, setCharacterConcept] = useState("");
  const [creatorStatus, setCreatorStatus] = useState("");
  const [voiceTesting, setVoiceTesting] = useState(false);
  const [voiceSample, setVoiceSample] = useState("");
  const draftStorageKey = useMemo(() => `velvet_character_draft_v18_${character?.id || "new"}`, [character?.id]);
  const generationAbortRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const [autosaveStatus, setAutosaveStatus] = useState("Ready");
  const [recoveredDraft, setRecoveredDraft] = useState(false);

  useEffect(() => () => {
    generationAbortRef.current?.abort();
    window.clearTimeout(autosaveTimerRef.current);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftStorageKey) || "null");
      const characterUpdatedAt = character?.updatedAt ? new Date(character.updatedAt).getTime() : 0;
      const worthRecovering = saved?.form && Number(saved.savedAt || 0) > characterUpdatedAt && Object.values(saved.form).some((value) => typeof value === "string" && value.trim());
      if (worthRecovering) {
        setForm((current) => ({ ...current, ...saved.form, imageFile: null, coverFile: null }));
        setAvatarPreview(saved.form.imageUrl || character?.imageUrl || "");
        setCoverPreview(saved.form.coverUrl || character?.coverUrl || "");
        setCharacterConcept(saved.characterConcept || "");
        setCreatorStatus("Recovered your unfinished autosaved draft.");
        setRecoveredDraft(true);
        setAutosaveStatus("Recovered");
      }
    } catch {}
  }, [draftStorageKey, character?.id]);

  useEffect(() => {
    window.clearTimeout(autosaveTimerRef.current);
    setAutosaveStatus("Saving…");
    autosaveTimerRef.current = window.setTimeout(() => {
      try {
        const safe = { ...form, imageFile: null, coverFile: null };
        localStorage.setItem(draftStorageKey, JSON.stringify({ form: safe, characterConcept, savedAt: Date.now(), characterId: character?.id || null }));
        setAutosaveStatus("Saved locally");
      } catch {
        setAutosaveStatus("Autosave unavailable");
      }
    }, 180);
    return () => window.clearTimeout(autosaveTimerRef.current);
  }, [form, characterConcept, character?.id, draftStorageKey]);

  function discardAutosavedDraft() {
    localStorage.removeItem(draftStorageKey);
    setRecoveredDraft(false);
    setAutosaveStatus("Cleared");
    if (character) {
      setForm({ ...initialForm,
        name: character.name || "", role: character.role || "", description: character.description || "", personality: character.personality || "", relationship: character.relationship || "", world: character.world || "", values: character.values || "", fears: character.fears || "", habits: character.habits || "", contradictions: character.contradictions || "", coreMotivation: character.coreMotivation || "", emotionalDefense: character.emotionalDefense || "", softeningTriggers: character.softeningTriggers || "", growthDirection: character.growthDirection || "", speechStyle: character.speechStyle || "", voiceVocabulary: character.voiceVocabulary || "", humorStyle: character.humorStyle || "", conflictStyle: character.conflictStyle || "", affectionStyle: character.affectionStyle || "", verbalTells: character.verbalTells || "", voiceAvoidances: character.voiceAvoidances || "", boundaries: character.boundaries || "", scenario: character.scenario || "", exampleDialogue: character.exampleDialogue || "", responseLength: character.responseLength || "balanced", narrationStyle: character.narrationStyle || "balanced", firstMessage: character.firstMessage || "", imageUrl: character.imageUrl || "", coverUrl: character.coverUrl || "", color: character.color || "#7a2942" });
      setAvatarPreview(character.imageUrl || "");
      setCoverPreview(character.coverUrl || "");
    } else {
      setForm({ ...initialForm }); setCharacterConcept(""); setAvatarPreview(""); setCoverPreview("");
    }
  }

  const completion = useMemo(() => {
    const required = [form.name, form.role, form.personality, form.firstMessage];
    const filled = required.filter((value) => value?.trim()).length;
    return Math.round((filled / required.length) * 100);
  }, [form.name, form.role, form.personality, form.firstMessage]);
  const voiceFingerprintCount = voiceFingerprintFields.filter((field) => form[field]?.trim()).length;
  const aiBusy = enhancing || Boolean(fieldPolishing) || organizing || generating;

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function selectImage(event, kind) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setError("Images must be smaller than 5 MB.");
    const preview = URL.createObjectURL(file);
    if (kind === "avatar") {
      setAvatarPreview(preview);
      setForm((current) => ({ ...current, imageFile: file }));
    } else {
      setCoverPreview(preview);
      setForm((current) => ({ ...current, coverFile: file }));
    }
    setError("");
  }

  function removeImage(kind) {
    if (kind === "avatar") {
      setAvatarPreview("");
      setForm((current) => ({ ...current, imageFile: null, imageUrl: "" }));
    } else {
      setCoverPreview("");
      setForm((current) => ({ ...current, coverFile: null, coverUrl: "" }));
    }
  }

  async function handleEnhanceCharacter() {
    if (aiBusy || saving) return;
    if (!form.name.trim() || !form.role.trim()) {
      setError("Add a name and role before using AI Polish.");
      return;
    }

    try {
      setEnhancing(true);
      setError("");
      const suggestions = await enhanceCharacterDraft(form);
      setForm((current) => mergeCharacterSuggestions(current, suggestions));
    } catch (requestError) {
      console.error("Character AI Polish failed:", requestError);
      setError(requestError.message || "AI Polish couldn't refine this character.");
    } finally {
      setEnhancing(false);
    }
  }

  async function handlePolishFields(fields, label) {
    if (!fields?.length || saving || aiBusy) return;
    try {
      setFieldPolishing(label);
      setError("");
      const suggestions = await enhanceCharacterFields(form, fields);
      setForm((current) => mergeCharacterSuggestions(current, suggestions));
    } catch (requestError) {
      setError(translateCharacterAIError(requestError.message));
    } finally {
      setFieldPolishing("");
    }
  }

  async function handleOrganizeCharacter() {
    if (aiBusy || saving) return;
    if (!form.name.trim() || !form.personality.trim()) {
      setError("Add a name and some personality text before organizing the profile.");
      return;
    }
    try {
      setOrganizing(true);
      setError("");
      const suggestions = await organizeCharacterDraft(form);
      setForm((current) => mergeCharacterSuggestions(current, suggestions));
    } catch (requestError) {
      console.error("Character profile organization failed:", requestError);
      setError(requestError.message || "Velvet couldn't organize this profile.");
    } finally {
      setOrganizing(false);
    }
  }

  async function handleGenerateCharacter() {
    if (aiBusy || saving) return;
    try {
      const controller = new AbortController();
      generationAbortRef.current = controller;
      setGenerating(true);
      setCreatorStatus("");
      setError("");
      const generated = await generateCharacterDraft(characterConcept, { signal: controller.signal });
      setForm((current) => mergeCharacterSuggestions(current, generated, true));
      setCreatorStatus("Complete draft created. Review anything you want before saving.");
    } catch (requestError) {
      if (generationAbortRef.current?.signal.aborted) {
        setCreatorStatus("Generation stopped. Your previous draft was left untouched.");
        return;
      }
      console.error("Complete character generation failed:", requestError);
      setError(translateCharacterAIError(requestError.message));
    } finally {
      generationAbortRef.current = null;
      setGenerating(false);
    }
  }

  function stopCharacterGeneration() {
    generationAbortRef.current?.abort();
  }

  function discardGeneratedDraft() {
    setForm({ ...initialForm });
    setAvatarPreview("");
    setCoverPreview("");
    setError("");
    setCreatorStatus("Draft discarded. You can change the idea or ask Velvet to surprise you again.");
  }

  async function handleVoiceTest() {
    if (aiBusy || saving || !form.name.trim() || !form.personality.trim()) return;
    try {
      setVoiceTesting(true); setError(""); setVoiceSample("");
      setVoiceSample(await testCharacterVoice(form));
    } catch (requestError) { setError(requestError.message || "Velvet couldn't test this voice."); }
    finally { setVoiceTesting(false); }
  }

  function validateCharacter() {
    if (!form.name.trim()) return setError("Give your character a name."), false;
    if (!form.role.trim()) return setError("Add a role or archetype."), false;
    if (!form.personality.trim()) return setError("Describe your character's personality."), false;
    if (!form.firstMessage.trim()) return setError("Write an opening scene or first message."), false;
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateCharacter() || saving) return;

    try {
      setSaving(true);
      setError("");
      const saved = character
        ? await updateCharacter(character.id, form)
        : await createCharacter(form);
      localStorage.removeItem(draftStorageKey);
      setAutosaveStatus("Saved to Velvet");
      onCreated(saved);
    } catch (requestError) {
      console.error("Error saving character:", requestError);
      setError(translateCharacterError(requestError.message));
    } finally {
      setSaving(false);
    }
  }

  function jumpStudio(step) {
    const node = document.querySelector(`[data-studio-step="${step}"]`);
    const disclosure = node?.closest("details");
    if (disclosure) disclosure.open = true;
    requestAnimationFrame(() => node?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="modal-backdrop character-studio-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="character-studio" role="dialog" aria-modal="true" aria-labelledby="character-studio-title">
        <div className="character-studio__escape-row">
          <button type="button" className="character-studio__escape-button" onClick={onClose} disabled={saving} aria-label="Back to Discover">
            <ChevronLeft size={19} />
            <span>Back to Discover</span>
          </button>
        </div>
        <button type="button" className="character-studio__mobile-exit" onClick={onClose} disabled={saving} aria-label="Close character studio and return">
          <X size={21} />
        </button>
        <header className="character-studio__topbar">
          <div>
            <p className="character-studio__eyebrow">PRIVATE CHARACTER STUDIO</p>
            <h2 id="character-studio-title">{character ? `Shape ${form.name || "your character"}` : "Create a new character"}</h2>
          </div>
          <div className={`character-studio__autosave${autosaveStatus.includes("Saved") ? " is-saved" : ""}`}><Check size={13}/><span>{autosaveStatus}</span>{recoveredDraft && <button type="button" onClick={discardAutosavedDraft}>Discard recovery</button>}</div>
          <div className="character-studio__top-actions">
            {!character && <button type="button" className="character-studio__ai character-studio__ai--primary" onClick={()=>setCreatorOpen((open)=>!open)} disabled={saving || aiBusy} aria-expanded={creatorOpen}>
              <Sparkles size={16}/><span>Create with AI</span>
            </button>}
            <button type="button" className="character-studio__ai" onClick={handleOrganizeCharacter} disabled={saving || aiBusy} title="Distribute existing profile text into the right fields without changing its facts">
              {organizing ? <LoaderCircle className="character-modal__spinner" size={16}/> : <Brain size={16}/>}<span>{organizing ? "Organizing…" : "Organize profile"}</span>
            </button>
            <button type="button" className="character-studio__ai" onClick={handleEnhanceCharacter} disabled={saving || aiBusy}>
              {enhancing ? <LoaderCircle className="character-modal__spinner" size={16} /> : <Sparkles size={16} />}
              <span>{enhancing ? "Polishing…" : "AI Polish"}</span>
            </button>
            <button type="button" className="character-studio__close" onClick={onClose} disabled={saving} aria-label="Close character studio">
              <X size={20} />
            </button>
          </div>
        </header>

        {!character && creatorOpen && <section className="character-studio__creator" aria-label="Create a complete character with AI" aria-busy={generating}>
          <div>
            <span><Sparkles size={17}/></span>
            <div><strong>Tell Velvet as much—or as little—as you have</strong><small>A name is optional. Leave it blank and Velvet will surprise you with a complete, original character.</small></div>
          </div>
          <textarea value={characterConcept} onChange={(event)=>{ setCharacterConcept(event.target.value); setCreatorStatus(""); }} maxLength={1200} rows="4" placeholder="Example: A warm but secretive paramedic named Elian. Friends to lovers, modern Chicago—or leave this empty and surprise me." disabled={generating}/>
          <div className="character-studio__creator-seeds">
            {["Best friends to lovers", "Unexpected campus romance", "Fantasy rivals with mutual respect", "Surprise me completely"].map((seed)=><button type="button" key={seed} onClick={()=>setCharacterConcept(seed)} disabled={generating}>{seed}</button>)}
          </div>
          <footer>
            <small>{creatorStatus || "Autosaved locally while you work. Nothing becomes a character until you press Save."}</small>
            <div>
              {creatorStatus.startsWith("Complete draft") && <button type="button" className="character-studio__discard-draft" onClick={discardGeneratedDraft}>Discard draft</button>}
              <button type="button" onClick={generating ? stopCharacterGeneration : handleGenerateCharacter}>
                {generating ? <X size={17}/> : <Sparkles size={17}/>}
                {generating ? "Stop generation" : characterConcept.trim() ? "Create complete draft" : "Surprise me"}
              </button>
            </div>
          </footer>
        </section>}

        <form className="character-studio__layout" onSubmit={handleSubmit}>
          <aside className="character-studio__preview" style={{ "--preview-color": form.color }}>
            <div className="character-preview-card">
              <div className="character-preview-card__cover">
                {coverPreview ? <img src={coverPreview} alt="Character cover preview" decoding="async" /> : <div className="character-preview-card__cover-fallback"><ImagePlus size={28} /><span>Add a cover</span></div>}
                <div className="character-preview-card__shade" />
                <div className="character-preview-card__completion">
                  <span>{completion}% ready</span>
                  <i><b style={{ width: `${completion}%` }} /></i>
                </div>
              </div>

              <div className="character-preview-card__identity">
                <div className="character-preview-card__avatar">
                  {avatarPreview ? <img src={avatarPreview} alt="Character avatar preview" decoding="async" /> : <span>{createInitials(form.name)}</span>}
                </div>
                <div>
                  <small>{form.role || "Role / archetype"}</small>
                  <strong>{form.name || "Your character"}</strong>
                </div>
              </div>

              <p className="character-preview-card__intro">{form.description || "Their introduction will appear here as you write it."}</p>

              <div className="character-preview-card__bond">
                <Heart size={14} />
                <div>
                  <small>RELATIONSHIP TO YOU</small>
                  <span>{form.relationship || "Not defined yet"}</span>
                </div>
              </div>
            </div>

            <div className="character-studio__appearance-mini">
              <MiniImageControl title="Portrait" preview={avatarPreview} onChange={(event) => selectImage(event, "avatar")} onRemove={() => removeImage("avatar")} disabled={saving} />
              <MiniImageControl title="Cover" preview={coverPreview} onChange={(event) => selectImage(event, "cover")} onRemove={() => removeImage("cover")} disabled={saving} />
              <fieldset className="character-studio__palette">
                <legend><Palette size={14} /> Accent</legend>
                <div>{palette.map((color) => (
                  <button key={color} type="button" className={form.color === color ? "selected" : ""} style={{ "--swatch": color }} onClick={() => setForm((current) => ({ ...current, color }))} aria-label={`Choose ${color}`}>
                    <Check size={12} />
                  </button>
                ))}</div>
              </fieldset>
            </div>
          </aside>

          <main className="character-studio__editor">
            <nav className="character-studio__journey" aria-label="Character creation steps">
              {[
                ["essence", "01", "Essence"],
                ["bond", "02", "Relationship"],
                ["depth", "03", "Depth"],
                ["voice", "04", "Voice"],
                ["opening", "05", "Opening"],
              ].map(([step, number, label]) => <button type="button" key={step} onClick={()=>jumpStudio(step)}><small>{number}</small><span>{label}</span></button>)}
            </nav>
            <StudioSection step="essence" icon={<UserRound size={18} />} kicker="ESSENCE" title="Who are they?" description="The few things Velvet should understand before anything else." onPolish={() => handlePolishFields(["description", "personality"], "essence")} polishing={fieldPolishing === "essence"}>
              <div className="studio-grid studio-grid--two">
                <StudioField label="Name" required><input name="name" value={form.name} onChange={updateField} placeholder="Theo Calloway" disabled={saving} /></StudioField>
                <StudioField label="Role / archetype" required><input name="role" value={form.role} onChange={updateField} placeholder="Campus prince, heartbreaker, best friend…" disabled={saving} /></StudioField>
              </div>
              <StudioField label="Introduction" hint="One clean snapshot. Who are they at first glance?">
                <textarea name="description" value={form.description} onChange={updateField} placeholder="Confident without trying, adored by professors and grandmothers alike…" rows="3" disabled={saving} />
              </StudioField>
              <StudioField label="Personality" required hint="Write naturally. Velvet can infer traits from prose better than a list of adjectives.">
                <textarea name="personality" value={form.personality} onChange={updateField} placeholder="He is warm in public, impossible to embarrass, quietly competitive…" rows="6" disabled={saving} />
              </StudioField>
            </StudioSection>

            <StudioSection step="bond" icon={<Heart size={18} />} kicker="THE BOND" title="Who are they to you?" description="This relationship should shape how they notice, remember and react to you." onPolish={() => handlePolishFields(["relationship", "world", "scenario"], "bond")} polishing={fieldPolishing === "bond"}>
              <StudioField label="Relationship to you" hint="Make this specific. History, current dynamic, what is known and what is not.">
                <textarea name="relationship" value={form.relationship} onChange={updateField} placeholder="Friends since high school. He already likes me, but I read his distance as indifference…" rows="5" disabled={saving} />
              </StudioField>
              <div className="studio-grid studio-grid--two">
                <StudioField label="World"><textarea name="world" value={form.world} onChange={updateField} placeholder="Private university, wealthy social circle, modern city…" rows="3" disabled={saving} /></StudioField>
                <StudioField label="Recurring setup"><textarea name="scenario" value={form.scenario} onChange={updateField} placeholder="Where do your stories with this character naturally happen?" rows="3" disabled={saving} /></StudioField>
              </div>
            </StudioSection>

            <details className="character-studio__depth">
              <summary>
                <span><Sparkles size={16}/><strong>More depth</strong></span>
                <small>Values, fears, growth, boundaries and advanced voice · only when you want them</small>
                <ChevronDown size={17}/>
              </summary>
              <div className="character-studio__depth-body">
            <StudioSection step="depth" icon={<Brain size={18} />} kicker="CHARACTER DNA" title="What makes them human?" description="Useful contradictions and recurring patterns, not a personality spreadsheet." onPolish={() => handlePolishFields(["values", "fears", "habits", "contradictions"], "dna")} polishing={fieldPolishing === "dna"}>
              <div className="studio-grid studio-grid--two">
                <StudioField label="Values"><textarea name="values" value={form.values} onChange={updateField} placeholder="Loyalty, independence, family, reputation…" rows="3" disabled={saving} /></StudioField>
                <StudioField label="Fears"><textarea name="fears" value={form.fears} onChange={updateField} placeholder="What can actually get under their skin?" rows="3" disabled={saving} /></StudioField>
                <StudioField label="Habits"><textarea name="habits" value={form.habits} onChange={updateField} placeholder="Small behaviors that recur naturally." rows="3" disabled={saving} /></StudioField>
                <StudioField label="Contradictions"><textarea name="contradictions" value={form.contradictions} onChange={updateField} placeholder="Popular but private. Flirtatious but emotionally avoidant…" rows="3" disabled={saving} /></StudioField>
              </div>
            </StudioSection>

            <StudioSection icon={<Sparkles size={18} />} kicker="DEVELOPMENT" title="How can they change without losing themselves?" description="Optional anchors for gradual growth. Velvet will never treat these as an instant transformation." onPolish={() => handlePolishFields(["coreMotivation", "emotionalDefense", "softeningTriggers", "growthDirection"], "development")} polishing={fieldPolishing === "development"}>
              <div className="studio-grid studio-grid--two">
                <StudioField label="Core motivation" hint="What do they want beneath the surface?"><textarea name="coreMotivation" value={form.coreMotivation} onChange={updateField} placeholder="To be chosen without having to ask; to protect the life he built…" rows="4" disabled={saving} /></StudioField>
                <StudioField label="Emotional defense" hint="How do they protect themselves when something matters?"><textarea name="emotionalDefense" value={form.emotionalDefense} onChange={updateField} placeholder="Turns tenderness into teasing, leaves when feelings become too visible…" rows="4" disabled={saving} /></StudioField>
                <StudioField label="What reaches them" hint="Actions or truths that can genuinely soften or unsettle them."><textarea name="softeningTriggers" value={form.softeningTriggers} onChange={updateField} placeholder="Quiet loyalty, being remembered, honest affection without pressure…" rows="4" disabled={saving} /></StudioField>
                <StudioField label="Possible growth direction" hint="A direction, not a guaranteed ending."><textarea name="growthDirection" value={form.growthDirection} onChange={updateField} placeholder="May learn to stay and speak honestly instead of disappearing—but only after earned turning points." rows="4" disabled={saving} /></StudioField>
              </div>
            </StudioSection>

            <StudioSection step="voice" icon={<MessageCircle size={18} />} kicker="VOICE & BEHAVIOR" title="How do they feel on the page?" description="The difference between knowing a character and actually hearing them." onPolish={() => handlePolishFields(["speechStyle", "boundaries", "exampleDialogue", "voiceVocabulary", "humorStyle", "conflictStyle", "affectionStyle", "voiceAvoidances"], "voice")} polishing={fieldPolishing === "voice"}>
              <div className="studio-grid studio-grid--two">
                <StudioField label="Speech style"><textarea name="speechStyle" value={form.speechStyle} onChange={updateField} placeholder="Dry, concise, teasing without performing, rarely over-explains…" rows="4" disabled={saving} /></StudioField>
                <StudioField label="Boundaries"><textarea name="boundaries" value={form.boundaries} onChange={updateField} placeholder="Things they should never do unless the story genuinely earns it." rows="4" disabled={saving} /></StudioField>
              </div>
              <StudioField label="Example dialogue" hint="A few lines are enough. This is a voice sample, not a script.">
                <textarea name="exampleDialogue" value={form.exampleDialogue} onChange={updateField} placeholder={'"You called me. I came. Don\'t make it weird."'} rows="4" disabled={saving} />
              </StudioField>
              <details className="studio-voice-fingerprint">
                <summary>
                  <span><ChevronDown className="studio-voice-fingerprint__chevron" size={16}/><Sparkles size={15}/>Advanced voice fingerprint</span>
                  <small><strong>{voiceFingerprintCount ? `${voiceFingerprintCount}/6 filled` : "Optional"}</strong> · Tap to expand · makes similar archetypes unmistakably different</small>
                </summary>
                <div className="studio-grid studio-grid--two">
                  <StudioField label="Word choice & rhythm"><textarea name="voiceVocabulary" value={form.voiceVocabulary} onChange={updateField} placeholder="Short clauses, modern vocabulary, never ornate; swears only when genuinely rattled…" rows="3" disabled={saving}/></StudioField>
                  <StudioField label="Humor style"><textarea name="humorStyle" value={form.humorStyle} onChange={updateField} placeholder="Deadpan observations; never flirty one-liners or theatrical sarcasm…" rows="3" disabled={saving}/></StudioField>
                  <StudioField label="How they handle conflict"><textarea name="conflictStyle" value={form.conflictStyle} onChange={updateField} placeholder="Gets precise and quiet; answers the real accusation; apologizes through action first…" rows="3" disabled={saving}/></StudioField>
                  <StudioField label="How they show affection"><textarea name="affectionStyle" value={form.affectionStyle} onChange={updateField} placeholder="Remembers practical details, stays nearby, rarely names tenderness directly…" rows="3" disabled={saving}/></StudioField>
                  <StudioField label="Verbal tells"><textarea name="verbalTells" value={form.verbalTells} onChange={updateField} placeholder="Drops contractions when angry; says 'right' while buying time; never uses pet names…" rows="3" disabled={saving}/></StudioField>
                  <StudioField label="Never let them sound like…"><textarea name="voiceAvoidances" value={form.voiceAvoidances} onChange={updateField} placeholder="A therapist, a romance-novel billionaire, a generic teasing heartbreaker, customer service…" rows="3" disabled={saving}/></StudioField>
                </div>
              </details>
            </StudioSection>

              </div>
            </details>

            <StudioSection step="opening" icon={<BookOpen size={18} />} kicker="STORY FEEL" title="How should stories with them read?" description="Velvet handles most pacing automatically. You only choose the broad feel." onPolish={() => handlePolishFields(["firstMessage"], "opening")} polishing={fieldPolishing === "opening"}>
              <div className="studio-choice-row">
                <ChoiceGroup label="Response length" name="responseLength" value={form.responseLength} onChange={updateField} options={[
                  ["short", "Short", "Quick beats"],
                  ["balanced", "Natural", "Default"],
                  ["long", "Detailed", "Only when earned"],
                ]} />
                <ChoiceGroup label="Narration" name="narrationStyle" value={form.narrationStyle} onChange={updateField} options={[
                  ["dialogue", "Dialogue", "Talk-forward"],
                  ["balanced", "Balanced", "Novel-like"],
                  ["immersive", "Immersive", "More atmosphere"],
                ]} />
              </div>
              <StudioField label="Opening scene" required hint="Where the first story begins. It can be dialogue, narration or both.">
                <textarea name="firstMessage" value={form.firstMessage} onChange={updateField} placeholder="The first Monday of the semester was exactly as chaotic as everyone expected…" rows="7" disabled={saving} />
              </StudioField>
            </StudioSection>

            {error && <p className="character-studio__error">{error}</p>}

            <footer className="character-studio__footer">
              <div>
                <strong>{character ? "Changes stay private to your library." : "This character will only exist in your private library."}</strong>
                <span>{completion === 100 ? "Ready to save." : "Name, role, personality and opening scene are required."}</span>
              </div>
              <div>
                <button type="button" className="character-studio__cancel" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit" className="character-studio__save" disabled={saving}>
                  {saving ? <><LoaderCircle className="character-modal__spinner" size={17} /> Saving…</> : <><Check size={17} /> {character ? "Save character" : "Create character"}</>}
                </button>
              </div>
            </footer>
          </main>
        </form>
      </section>
    </div>
  );
}

function StudioSection({ step = "", icon, kicker, title, description, children, onPolish = null, polishing = false }) {
  return (
    <section className="studio-section" data-studio-step={step || undefined}>
      <header className="studio-section__header">
        <span className="studio-section__icon">{icon}</span>
        <div>
          <p>{kicker}</p>
          <h3>{title}</h3>
          <span>{description}</span>
        </div>
        {onPolish && <button type="button" className="studio-section__polish" onClick={onPolish} disabled={polishing}>
          {polishing ? <LoaderCircle className="character-modal__spinner" size={14}/> : <Sparkles size={14}/>}
          <span>{polishing ? "Polishing…" : "Polish section"}</span>
        </button>}
      </header>
      <div className="studio-section__body">{children}</div>
    </section>
  );
}

function StudioField({ label, required = false, hint = "", children }) {
  return (
    <label className="studio-field">
      <span className="studio-field__label">{label}{required && <strong>*</strong>}</span>
      {hint && <small>{hint}</small>}
      {children}
    </label>
  );
}

function ChoiceGroup({ label, name, value, onChange, options }) {
  return (
    <fieldset className="studio-choice-group">
      <legend>{label}</legend>
      <div>
        {options.map(([optionValue, title, subtitle]) => (
          <label key={optionValue} className={value === optionValue ? "selected" : ""}>
            <input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={onChange} />
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MiniImageControl({ title, preview, onChange, onRemove, disabled }) {
  return (
    <div className="character-studio__media-control">
      <div><strong>{title}</strong><small>{preview ? "Image selected" : "JPG, PNG or WebP"}</small></div>
      <div>
        <label aria-label={`Choose ${title}`}>
          <Upload size={15} />
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onChange} disabled={disabled} />
        </label>
        {preview && <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove ${title}`}><Trash2 size={15} /></button>}
      </div>
    </div>
  );
}

function createInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "VS";
}

function mergeCharacterSuggestions(current, suggestions = {}, replace = false) {
  const next = { ...current };
  for (const field of generatedDraftFields) {
    const value = suggestions[field];
    if (typeof value === "string" && value.trim()) next[field] = value.trim();
    else if (replace) next[field] = "";
  }
  if (["short", "balanced", "long"].includes(suggestions.responseLength)) next.responseLength = suggestions.responseLength;
  if (["dialogue", "balanced", "immersive"].includes(suggestions.narrationStyle)) next.narrationStyle = suggestions.narrationStyle;
  return next;
}

function translateCharacterError(message = "") {
  const error = message.toLowerCase();
  if (error.includes("row-level security") || error.includes("permission")) return "Your account doesn't have permission to save this character or image.";
  if (error.includes("mime") || error.includes("bucket")) return "That image format couldn't be uploaded. Try JPG, PNG or WebP.";
  if (error.includes("maximum") || error.includes("size")) return "The image is too large. Choose one smaller than 5 MB.";
  if (error.includes("network") || error.includes("fetch")) return "We couldn't connect. Check your internet connection.";
  return message || "We couldn't save the character. Try again.";
}

function translateCharacterAIError(message = "") {
  const error = String(message || "").toLowerCase();
  if (error.includes("free ai limit") || error.includes("quota") || error.includes("429") || error.includes("rate limit")) return "Gemini is rate-limited right now. This may be a per-minute, token, or daily project limit. Wait a little and try again.";
  if (error.includes("too long") || error.includes("timeout") || error.includes("timed out") || error.includes("aborted")) return "Character creation took too long and was stopped. Try again—Velvet kept your idea.";
  if (error.includes("incomplete character draft") || error.includes("empty character draft")) return "Gemini sent an incomplete draft. Try once more; your idea is still here.";
  if (error.includes("model") && (error.includes("not found") || error.includes("not supported"))) return "The configured Gemini model is unavailable. Velvet will need a valid fallback model.";
  if (/edge function returned a non-2xx/i.test(message)) return "The character generator failed before returning its reason. Redeploy the v1.3.1 Edge Function and try again.";
  return message || "Velvet couldn't create this character. Try again.";
}

export default CreateCharacterModal;
