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
  RefreshCw,
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
const STUDIO_STEPS = [
  ["essence", "Essence"],
  ["bond", "Relationship"],
  ["depth", "Depth"],
  ["voice", "Voice"],
  ["world", "World"],
  ["opening", "Opening"],
];

const generatedDraftFields = [
  "name", "role", "description", "personality", "relationship", "world", "values", "fears", "habits", "contradictions",
  "coreMotivation", "emotionalDefense", "softeningTriggers", "growthDirection", "speechStyle", "voiceVocabulary", "humorStyle",
  "conflictStyle", "affectionStyle", "verbalTells", "voiceAvoidances", "boundaries", "scenario", "exampleDialogue", "firstMessage",
];

function CreateCharacterModal({ onClose, onCreated, character = null, remixSource = null }) {
  const { createCharacter, updateCharacter, enhanceCharacterDraft, enhanceCharacterFields, organizeCharacterDraft, generateCharacterDraft, testCharacterVoice, buildCharacterVoiceLab, openCharacterLearningRoom } = useCharacters();
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
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(character));
  const [quickName, setQuickName] = useState("");
  const [quickRelationship, setQuickRelationship] = useState("");
  const [characterConcept, setCharacterConcept] = useState(() => remixSource ? buildRemixSeed(remixSource) : "");
  const [creatorStatus, setCreatorStatus] = useState("");
  const [voiceTesting, setVoiceTesting] = useState(false);
  const [voiceSample, setVoiceSample] = useState("");
  const [voiceLab, setVoiceLab] = useState(null);
  const [voiceLabLoading, setVoiceLabLoading] = useState(false);
  const [learningSituation, setLearningSituation] = useState("A friend says they had a terrible day and does not want to talk.");
  const [learningSamples, setLearningSamples] = useState([]);
  const [learningSelected, setLearningSelected] = useState([]);
  const [learningLoading, setLearningLoading] = useState(false);
  const [toolNotice, setToolNotice] = useState("");
  const [studioStep, setStudioStep] = useState("essence");
  const draftStorageKey = useMemo(() => `velvet_character_draft_v18_${character?.id || (remixSource?.id ? `remix_${remixSource.id}` : "new")}`, [character?.id, remixSource?.id]);
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
      const savedFormHasText = saved?.form && Object.values(saved.form).some((value) => typeof value === "string" && value.trim());
      const savedQuickHasText = Boolean(saved?.characterConcept?.trim() || saved?.quickName?.trim() || saved?.quickRelationship?.trim());
      const worthRecovering = saved?.form && Number(saved.savedAt || 0) > characterUpdatedAt && (savedFormHasText || savedQuickHasText);
      if (worthRecovering) {
        setForm((current) => ({ ...current, ...saved.form, imageFile: null, coverFile: null }));
        setAvatarPreview(saved.form.imageUrl || character?.imageUrl || "");
        setCoverPreview(saved.form.coverUrl || character?.coverUrl || "");
        setCharacterConcept(saved.characterConcept || (remixSource ? buildRemixSeed(remixSource) : ""));
        setQuickName(saved.quickName || "");
        setQuickRelationship(saved.quickRelationship || "");
        const recoveredReady = [saved.form.name, saved.form.role, saved.form.personality, saved.form.firstMessage].every((value) => String(value || "").trim());
        setCreatorStatus(recoveredReady ? "Complete draft created. Recovered from local autosave." : "Recovered your unfinished autosaved draft.");
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
        localStorage.setItem(draftStorageKey, JSON.stringify({ form: safe, characterConcept, quickName, quickRelationship, savedAt: Date.now(), characterId: character?.id || null, remixSourceId: remixSource?.id || null }));
        setAutosaveStatus("Saved locally");
      } catch {
        setAutosaveStatus("Autosave unavailable");
      }
    }, 180);
    return () => window.clearTimeout(autosaveTimerRef.current);
  }, [form, characterConcept, quickName, quickRelationship, character?.id, remixSource?.id, draftStorageKey]);

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
      setForm({ ...initialForm }); setCharacterConcept(remixSource ? buildRemixSeed(remixSource) : ""); setQuickName(""); setQuickRelationship(""); setAvatarPreview(""); setCoverPreview("");
    }
  }

  const completion = useMemo(() => {
    const required = [form.name, form.role, form.personality, form.firstMessage];
    const filled = required.filter((value) => value?.trim()).length;
    return Math.round((filled / required.length) * 100);
  }, [form.name, form.role, form.personality, form.firstMessage]);
  const voiceFingerprintCount = voiceFingerprintFields.filter((field) => form[field]?.trim()).length;
  const aiBusy = enhancing || Boolean(fieldPolishing) || organizing || generating || voiceLabLoading || learningLoading;
  const quickDraftReady = !character && completion === 100 && creatorStatus.startsWith("Complete draft");

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
      setToolNotice("AI Polish needs a name and role first. I moved you to Essence.");
      jumpStudio("essence");
      return;
    }

    try {
      setEnhancing(true);
      setError("");
      const suggestions = await enhanceCharacterDraft(form);
      setForm((current) => mergeCharacterSuggestions(current, suggestions));
      setToolNotice("AI Polish updated the character draft. Review the highlighted sections before saving.");
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
      setToolNotice("Organize Profile needs a name and some Personality text first. Add those in Essence, then tap Organize again.");
      jumpStudio("essence");
      return;
    }
    try {
      setOrganizing(true);
      setError("");
      const suggestions = await organizeCharacterDraft(form);
      setForm((current) => mergeCharacterSuggestions(current, suggestions));
      setToolNotice("Profile organized. Velvet distributed what you wrote into the matching sections.");
    } catch (requestError) {
      console.error("Character profile organization failed:", requestError);
      setError(requestError.message || "Velvet couldn't organize this profile.");
    } finally {
      setOrganizing(false);
    }
  }

  async function generateCompleteCharacter(concept, { keepQuickIdentity = true } = {}) {
    if (aiBusy || saving) return;
    const requestedName = keepQuickIdentity ? quickName.trim() : "";
    const requestedRelationship = keepQuickIdentity ? quickRelationship.trim() : "";
    try {
      const controller = new AbortController();
      generationAbortRef.current = controller;
      setGenerating(true);
      setCreatorStatus("");
      setError("");
      const generated = await generateCharacterDraft(concept, { signal: controller.signal });
      setForm((current) => {
        const next = mergeCharacterSuggestions(current, generated, true);
        if (requestedName) next.name = requestedName;
        if (requestedRelationship) next.relationship = requestedRelationship;
        return next;
      });
      setCreatorStatus("Complete draft created. Velvet filled the deep profile for you.");
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

  function handleGenerateCharacter() {
    const pieces = [characterConcept.trim()];
    if (quickName.trim()) pieces.push(`Use this exact name: ${quickName.trim()}.`);
    if (quickRelationship.trim()) pieces.push(`Relationship to the user: ${quickRelationship.trim()}.`);
    if (!pieces.some(Boolean)) pieces.push("Surprise me with an original, roleplay-ready character with a strong relationship dynamic and natural voice.");
    return generateCompleteCharacter(pieces.filter(Boolean).join("\n"));
  }

  function handleQuickVariation(direction) {
    const summary = [
      form.role && `Role: ${form.role}`,
      form.relationship && `Relationship: ${form.relationship}`,
      form.personality && `Personality: ${form.personality}`,
      form.world && `World: ${form.world}`,
    ].filter(Boolean).join("\n");
    const concept = `Create a NEW original character inspired only by the premise below. Do not reuse the same name, exact backstory, exact dialogue, or exact personality. Preserve the level of depth, not the identity.\n${summary}\nVariation direction: ${direction}.\nReturn a complete roleplay-ready character.`;
    setQuickName("");
    return generateCompleteCharacter(concept, { keepQuickIdentity: false });
  }

  function handleRegenerateQuickDraft() {
    return handleGenerateCharacter();
  }

  function stopCharacterGeneration() {
    generationAbortRef.current?.abort();
  }

  function discardGeneratedDraft() {
    setForm({ ...initialForm });
    setAvatarPreview("");
    setCoverPreview("");
    setError("");
    setCreatorStatus("Draft discarded. Your idea is still here.");
  }

  async function handleVoiceTest() {
    if (aiBusy || saving) return;
    if (!form.name.trim() || !form.personality.trim()) {
      setToolNotice("Add a name and Personality first, then Voice Preview can show how this character sounds on the page.");
      jumpStudio("essence");
      return;
    }
    try {
      setVoiceTesting(true); setError(""); setVoiceSample("");
      setVoiceSample(await testCharacterVoice(form));
    } catch (requestError) { setError(requestError.message || "Velvet couldn't test this voice."); }
    finally { setVoiceTesting(false); }
  }

  async function handleVoiceLab() {
    if (aiBusy || saving || !form.name.trim() || !form.personality.trim()) return;
    try {
      setVoiceLabLoading(true); setError("");
      setVoiceLab(await buildCharacterVoiceLab(form));
    } catch (requestError) { setError(requestError.message || "Velvet couldn't build this Voice Lab."); }
    finally { setVoiceLabLoading(false); }
  }

  function applyVoiceLab() {
    if (!voiceLab) return;
    setForm((current) => ({ ...current, ...voiceLab }));
    setToolNotice("Voice Lab applied. You can edit every field before saving.");
  }
  async function runLearningRoom() {
    if (aiBusy || !form.name.trim() || !form.personality.trim()) return;
    try { setLearningLoading(true); setError(""); setLearningSelected([]); setLearningSamples(await openCharacterLearningRoom(form, learningSituation)); }
    catch (requestError) { setError(requestError.message || "Velvet couldn't open the Learning Room."); }
    finally { setLearningLoading(false); }
  }
  function applyLearningRoom() {
    const chosen=learningSelected.map((index)=>learningSamples[index]).filter(Boolean);
    if (!chosen.length) return;
    setForm((current)=>({...current,exampleDialogue:[current.exampleDialogue,...chosen].filter(Boolean).join("\n\n")}));
    setToolNotice(`${chosen.length} non-canonical voice ${chosen.length===1?"sample":"samples"} saved as examples.`);
  }

  function validateCharacter() {
    if (!form.name.trim()) return setError("Give your character a name."), false;
    if (!form.role.trim()) return setError("Add a role or archetype."), false;
    if (!form.personality.trim()) return setError("Describe your character's personality."), false;
    if (!form.firstMessage.trim()) return setError("Write an opening scene or first message."), false;
    return true;
  }

  async function saveCharacter(intent = "profile") {
    if (!validateCharacter() || saving) return;
    try {
      setSaving(true);
      setError("");
      const saved = character
        ? await updateCharacter(character.id, form)
        : await createCharacter(form);
      localStorage.removeItem(draftStorageKey);
      setAutosaveStatus("Saved to Velvet");
      await onCreated(saved, { startChat: !character && intent === "chat" });
    } catch (requestError) {
      console.error("Error saving character:", requestError);
      setError(translateCharacterError(requestError.message));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await saveCharacter("profile");
  }

  function jumpStudio(step) {
    if (!STUDIO_STEPS.some(([id]) => id === step)) return;
    setStudioStep(step);
    requestAnimationFrame(() => {
      const layout = document.querySelector(".character-studio__layout");
      if (window.matchMedia?.("(max-width: 760px)")?.matches) layout?.scrollTo?.({ top: 0, behavior: "smooth" });
      else document.querySelector(`[data-studio-step="${step}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function moveStudioStep(direction) {
    const index = Math.max(0, STUDIO_STEPS.findIndex(([id]) => id === studioStep));
    const nextIndex = Math.max(0, Math.min(STUDIO_STEPS.length - 1, index + direction));
    jumpStudio(STUDIO_STEPS[nextIndex][0]);
  }

  return (
    <div className="modal-backdrop character-studio-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="character-studio" role="dialog" aria-modal="true" aria-labelledby="character-studio-title">
        <div className="character-studio__escape-row">
          <button type="button" className="character-studio__escape-button" onClick={onClose} disabled={saving} aria-label="Back to Characters">
            <ChevronLeft size={19} />
            <span>Back to Characters</span>
          </button>
        </div>
        <button type="button" className="character-studio__mobile-exit" onClick={onClose} disabled={saving} aria-label="Close character studio and return">
          <X size={21} />
        </button>
        <header className="character-studio__topbar">
          <div>
            <p className="character-studio__eyebrow">{character ? "PRIVATE CHARACTER STUDIO" : advancedOpen ? "FINE-TUNE" : remixSource ? "DUPLICATE & REMIX" : "QUICK CREATE"}</p>
            <h2 id="character-studio-title">{character ? `Shape ${form.name || "your character"}` : advancedOpen ? `Fine-tune ${form.name || "your character"}` : remixSource ? `Remix ${remixSource.name}` : "Make someone new"}</h2>
          </div>
          <div className={`character-studio__autosave${autosaveStatus.includes("Saved") ? " is-saved" : ""}`}><Check size={13}/><span>{autosaveStatus}</span>{recoveredDraft && <button type="button" onClick={discardAutosavedDraft}>Discard recovery</button>}</div>
          <div className="character-studio__top-actions">
            {!character && advancedOpen && <button type="button" className="character-studio__ai character-studio__ai--primary" onClick={()=>setAdvancedOpen(false)} disabled={saving || aiBusy}>
              <Sparkles size={16}/><span>Quick create</span>
            </button>}
            {(character || advancedOpen) && <button type="button" className="character-studio__ai" onClick={handleOrganizeCharacter} disabled={saving || aiBusy} title="Distribute existing profile text into the right fields without changing its facts">
              {organizing ? <LoaderCircle className="character-modal__spinner" size={16}/> : <Brain size={16}/>}<span>{organizing ? "Organizing…" : "Organize profile"}</span>
            </button>}
            {(character || advancedOpen) && <button type="button" className="character-studio__ai" onClick={handleEnhanceCharacter} disabled={saving || aiBusy}>
              {enhancing ? <LoaderCircle className="character-modal__spinner" size={16} /> : <Sparkles size={16} />}
              <span>{enhancing ? "Polishing…" : "AI Polish"}</span>
            </button>}
            <button type="button" className="character-studio__close" onClick={onClose} disabled={saving} aria-label="Close character studio">
              <X size={20} />
            </button>
          </div>
        </header>

        {toolNotice && <div className="character-studio__tool-notice" role="status"><Sparkles size={15}/><span>{toolNotice}</span><button type="button" onClick={()=>setToolNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}

        {!character && !advancedOpen ? (
          <form className="character-studio-lite" onSubmit={(event) => { event.preventDefault(); quickDraftReady ? saveCharacter("profile") : handleGenerateCharacter(); }}>
            <div className="character-studio-lite__canvas">
              <section className="character-studio-lite__intro">
                <span className="character-studio-lite__spark"><Sparkles size={20}/></span>
                <div>
                  <small>{remixSource ? "REMIX WITHOUT THE FORM" : "ONE IDEA IS ENOUGH"}</small>
                  <h3>{quickDraftReady ? `${form.name} is ready.` : remixSource ? "Keep the depth. Change the person." : "Describe the vibe. Velvet does the rest."}</h3>
                  <p>{quickDraftReady ? "The advanced personality, voice, values, fears, habits, world and opening are already filled behind the scenes." : remixSource ? `Velvet will use ${remixSource.name} only as a depth template. Name, identity, history and exact personality should come out new.` : "A sentence is enough. Name and relationship are optional. You can fine-tune all the deep fields later if you care about them."}</p>
                </div>
              </section>

              {!quickDraftReady ? (
                <>
                  <label className="character-studio-lite__idea">
                    <span>What are you imagining?</span>
                    <textarea value={characterConcept} onChange={(event)=>{ setCharacterConcept(event.target.value); setCreatorStatus(""); }} maxLength={1200} rows="5" placeholder="Popular university guy, a little arrogant, our friend group is eight people, he already likes me but I'm oblivious…" disabled={generating || saving}/>
                  </label>
                  <div className="character-studio-lite__optional">
                    <label><span>Name <em>optional</em></span><input value={quickName} onChange={(event)=>setQuickName(event.target.value)} placeholder="Let Velvet choose" disabled={generating || saving}/></label>
                    <label><span>Relationship <em>optional</em></span><input value={quickRelationship} onChange={(event)=>setQuickRelationship(event.target.value)} placeholder="Friends, rivals, stranger…" disabled={generating || saving}/></label>
                  </div>
                  <div className="character-studio-lite__portrait">
                    <div className="character-studio-lite__avatar" style={{ "--quick-color": form.color }}>
                      {avatarPreview ? <img src={avatarPreview} alt="Character portrait preview"/> : <span>{createInitials(quickName)}</span>}
                    </div>
                    <div><strong>Portrait</strong><small>Optional. You can add the cover later.</small></div>
                    <label><ImagePlus size={16}/><span>{avatarPreview ? "Change" : "Add photo"}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event)=>selectImage(event,"avatar")} disabled={generating || saving}/></label>
                    {avatarPreview && <button type="button" onClick={()=>removeImage("avatar")} aria-label="Remove portrait"><Trash2 size={15}/></button>}
                  </div>
                  {!remixSource && <div className="character-studio-lite__seeds">
                    {["Best friends to lovers", "Campus tension", "Rich & impossible", "Green flag bad boy", "Surprise me"].map((seed)=><button type="button" key={seed} onClick={()=>setCharacterConcept(seed)} disabled={generating}>{seed}</button>)}
                  </div>}
                  <div className="character-studio-lite__actions character-studio-lite__actions--generate">
                    <button type="button" className="character-studio-lite__fine" onClick={()=>setAdvancedOpen(true)} disabled={generating || saving}>Fine-tune manually</button>
                    <button type="submit" className="character-studio-lite__primary" disabled={saving || generating}>
                      {generating ? <><LoaderCircle className="character-modal__spinner" size={17}/> Creating…</> : <><Sparkles size={17}/> {characterConcept.trim() || remixSource ? "Create with AI" : "Surprise me"}</>}
                    </button>
                    {generating && <button type="button" className="character-studio-lite__stop" onClick={stopCharacterGeneration}>Stop</button>}
                  </div>
                </>
              ) : (
                <>
                  <article className="character-studio-lite__result" style={{ "--quick-color": form.color }}>
                    <div className="character-studio-lite__result-media">
                      {coverPreview ? <img src={coverPreview} alt=""/> : avatarPreview ? <img src={avatarPreview} alt=""/> : <span>{createInitials(form.name)}</span>}
                    </div>
                    <div className="character-studio-lite__result-copy">
                      <small>{form.role}</small>
                      <h3>{form.name}</h3>
                      <p>{form.description || form.personality}</p>
                      <div><Heart size={14}/><span>{form.relationship || "A relationship Velvet can develop naturally"}</span></div>
                    </div>
                  </article>

                  <section className="character-studio-lite__behind">
                    <span><Check size={15}/></span>
                    <div><strong>Deep profile complete</strong><small>Personality · values · fears · habits · contradictions · voice · conflict · affection · world · opening</small></div>
                  </section>

                  <section className="character-studio-lite__variations">
                    <div><small>MAKE ANOTHER</small><strong>Same spark, different person</strong></div>
                    <div>{["Softer", "Colder", "Funnier", "More arrogant", "Different dynamic"].map((direction)=><button type="button" key={direction} onClick={()=>handleQuickVariation(direction)} disabled={generating || saving}>{direction}</button>)}</div>
                  </section>

                  <div className="character-studio-lite__actions character-studio-lite__actions--ready">
                    <button type="button" className="character-studio-lite__ghost" onClick={handleRegenerateQuickDraft} disabled={generating || saving}><RefreshCw size={16}/><span>Regenerate</span></button>
                    <button type="button" className="character-studio-lite__fine" onClick={()=>setAdvancedOpen(true)} disabled={generating || saving}>Fine-tune</button>
                    <button type="button" className="character-studio-lite__secondary" onClick={()=>saveCharacter("profile")} disabled={saving || generating}>{saving ? "Saving…" : "Create character"}</button>
                    <button type="button" className="character-studio-lite__primary" onClick={()=>saveCharacter("chat")} disabled={saving || generating}><MessageCircle size={17}/><span>{saving ? "Saving…" : "Start chatting"}</span></button>
                  </div>
                </>
              )}

              {(creatorStatus || error) && <p className={`character-studio-lite__status${error ? " is-error" : ""}`}>{error || creatorStatus}</p>}
              <footer className="character-studio-lite__privacy"><Check size={13}/><span>Private library · autosaved locally · nothing is saved until you choose Create or Start chatting.</span></footer>
            </div>
          </form>
        ) : (
        <form className="character-studio__layout" onSubmit={handleSubmit} data-studio-current={studioStep}>
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
              {STUDIO_STEPS.map(([step, label], index) => <button type="button" key={step} className={studioStep === step ? "active" : ""} aria-current={studioStep === step ? "step" : undefined} onClick={()=>jumpStudio(step)}><small>{String(index + 1).padStart(2, "0")}</small><span>{label}</span></button>)}
            </nav>
            <StudioSection step="essence" active={studioStep === "essence"} icon={<UserRound size={18} />} kicker="ESSENCE" title="Who are they?" description="The few things Velvet should understand before anything else." onPolish={() => handlePolishFields(["description", "personality"], "essence")} polishing={fieldPolishing === "essence"}>
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

            <StudioSection step="bond" active={studioStep === "bond"} icon={<Heart size={18} />} kicker="THE BOND" title="Who are they to you?" description="This relationship should shape how they notice, remember and react to you." onPolish={() => handlePolishFields(["relationship"], "bond")} polishing={fieldPolishing === "bond"}>
              <StudioField label="Relationship to you" hint="Make this specific. History, current dynamic, what is known and what is not.">
                <textarea name="relationship" value={form.relationship} onChange={updateField} placeholder="Friends since high school. He already likes me, but I read his distance as indifference…" rows="5" disabled={saving} />
              </StudioField>

            </StudioSection>

            <StudioSection step="depth" active={studioStep === "depth"} icon={<Brain size={18} />} kicker="CHARACTER DNA" title="What makes them human?" description="Useful contradictions and recurring patterns, not a personality spreadsheet." onPolish={() => handlePolishFields(["values", "fears", "habits", "contradictions"], "dna")} polishing={fieldPolishing === "dna"}>
              <div className="studio-grid studio-grid--two">
                <StudioField label="Values"><textarea name="values" value={form.values} onChange={updateField} placeholder="Loyalty, independence, family, reputation…" rows="3" disabled={saving} /></StudioField>
                <StudioField label="Fears"><textarea name="fears" value={form.fears} onChange={updateField} placeholder="What can actually get under their skin?" rows="3" disabled={saving} /></StudioField>
                <StudioField label="Habits"><textarea name="habits" value={form.habits} onChange={updateField} placeholder="Small behaviors that recur naturally." rows="3" disabled={saving} /></StudioField>
                <StudioField label="Contradictions"><textarea name="contradictions" value={form.contradictions} onChange={updateField} placeholder="Popular but private. Flirtatious but emotionally avoidant…" rows="3" disabled={saving} /></StudioField>
              </div>
            </StudioSection>

            <StudioSection step="depth" active={studioStep === "depth"} icon={<Sparkles size={18} />} kicker="DEVELOPMENT" title="How can they change without losing themselves?" description="Optional anchors for gradual growth. Velvet will never treat these as an instant transformation." onPolish={() => handlePolishFields(["coreMotivation", "emotionalDefense", "softeningTriggers", "growthDirection"], "development")} polishing={fieldPolishing === "development"}>
              <div className="studio-grid studio-grid--two">
                <StudioField label="Core motivation" hint="What do they want beneath the surface?"><textarea name="coreMotivation" value={form.coreMotivation} onChange={updateField} placeholder="To be chosen without having to ask; to protect the life he built…" rows="4" disabled={saving} /></StudioField>
                <StudioField label="Emotional defense" hint="How do they protect themselves when something matters?"><textarea name="emotionalDefense" value={form.emotionalDefense} onChange={updateField} placeholder="Turns tenderness into teasing, leaves when feelings become too visible…" rows="4" disabled={saving} /></StudioField>
                <StudioField label="What reaches them" hint="Actions or truths that can genuinely soften or unsettle them."><textarea name="softeningTriggers" value={form.softeningTriggers} onChange={updateField} placeholder="Quiet loyalty, being remembered, honest affection without pressure…" rows="4" disabled={saving} /></StudioField>
                <StudioField label="Possible growth direction" hint="A direction, not a guaranteed ending."><textarea name="growthDirection" value={form.growthDirection} onChange={updateField} placeholder="May learn to stay and speak honestly instead of disappearing—but only after earned turning points." rows="4" disabled={saving} /></StudioField>
              </div>
            </StudioSection>

            <StudioSection step="voice" active={studioStep === "voice"} icon={<MessageCircle size={18} />} kicker="VOICE & BEHAVIOR" title="How do they feel on the page?" description="The difference between knowing a character and actually hearing them." onPolish={() => handlePolishFields(["speechStyle", "boundaries", "exampleDialogue", "voiceVocabulary", "humorStyle", "conflictStyle", "affectionStyle", "voiceAvoidances"], "voice")} polishing={fieldPolishing === "voice"}>
              <div className="studio-grid studio-grid--two">
                <StudioField label="Speech style"><textarea name="speechStyle" value={form.speechStyle} onChange={updateField} placeholder="Dry, concise, teasing without performing, rarely over-explains…" rows="4" disabled={saving} /></StudioField>
                <StudioField label="Boundaries"><textarea name="boundaries" value={form.boundaries} onChange={updateField} placeholder="Things they should never do unless the story genuinely earns it." rows="4" disabled={saving} /></StudioField>
              </div>
              <StudioField label="Example dialogue" hint="A few lines are enough. This is a voice sample, not a script.">
                <textarea name="exampleDialogue" value={form.exampleDialogue} onChange={updateField} placeholder={'"You called me. I came. Don\'t make it weird."'} rows="4" disabled={saving} />
              </StudioField>
              <div className="studio-voice-preview">
                <button type="button" onClick={handleVoiceTest} disabled={saving || aiBusy}>
                  {voiceTesting ? <LoaderCircle className="character-modal__spinner" size={16}/> : <MessageCircle size={16}/>}
                  <span>{voiceTesting ? "Listening to the profile…" : "Preview character voice"}</span>
                </button>
                <small>This previews writing voice, not device text-to-speech.</small>
                {voiceSample && <blockquote>{voiceSample}</blockquote>}
              </div>
              <div className="studio-voice-lab">
                <div><strong>Voice Lab</strong><small>Tests the same person in casual, angry, flirting, vulnerable and awkward moments—then builds one consistent fingerprint.</small></div>
                <button type="button" onClick={handleVoiceLab} disabled={saving || aiBusy}>{voiceLabLoading ? <LoaderCircle className="character-modal__spinner" size={16}/> : <Sparkles size={16}/>} {voiceLabLoading ? "Building five situations…" : "Build Voice Lab"}</button>
                {voiceLab && <div className="studio-voice-lab__result"><blockquote>{voiceLab.exampleDialogue}</blockquote><button type="button" onClick={applyVoiceLab}>Apply this fingerprint</button></div>}
              </div>
              <div className="studio-learning-room">
                <div><strong>Learning Room</strong><small>Creates ten auditions without adding anything to story canon. Select only the replies that genuinely sound right.</small></div>
                <textarea rows="3" value={learningSituation} onChange={(event)=>setLearningSituation(event.target.value)} placeholder="Test situation"/>
                <button type="button" onClick={runLearningRoom} disabled={saving||aiBusy}>{learningLoading?<LoaderCircle className="character-modal__spinner" size={16}/>:<MessageCircle size={16}/>}Generate 10 auditions</button>
                {learningSamples.length>0&&<div className="studio-learning-room__samples">{learningSamples.map((sample,index)=><label key={index} className={learningSelected.includes(index)?"selected":""}><input type="checkbox" checked={learningSelected.includes(index)} onChange={()=>setLearningSelected((current)=>current.includes(index)?current.filter((item)=>item!==index):[...current,index])}/><span><small>OPTION {index+1}</small>{sample}</span></label>)}<button type="button" onClick={applyLearningRoom} disabled={!learningSelected.length}>Save selected voice examples</button></div>}
              </div>
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


            <StudioSection step="world" active={studioStep === "world"} icon={<BookOpen size={18} />} kicker="WORLD" title="Where does their life happen?" description="Give Velvet the recurring places, social rules and everyday context that should stay consistent." onPolish={() => handlePolishFields(["world", "scenario"], "world")} polishing={fieldPolishing === "world"}>
              <StudioField label="World"><textarea name="world" value={form.world} onChange={updateField} placeholder="Private university, wealthy social circle, modern city…" rows="4" disabled={saving} /></StudioField>
              <StudioField label="Recurring setup" hint="Where do your stories with this character naturally happen?"><textarea name="scenario" value={form.scenario} onChange={updateField} placeholder="Campus events, the friend group's apartments, late drives after practice…" rows="4" disabled={saving} /></StudioField>
            </StudioSection>

            <StudioSection step="opening" active={studioStep === "opening"} icon={<BookOpen size={18} />} kicker="STORY FEEL" title="How should stories with them read?" description="Velvet handles most pacing automatically. You only choose the broad feel." onPolish={() => handlePolishFields(["firstMessage"], "opening")} polishing={fieldPolishing === "opening"}>
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

            <div className="character-studio__wizard-controls" aria-label="Character Studio navigation">
              <button type="button" onClick={() => moveStudioStep(-1)} disabled={studioStep === STUDIO_STEPS[0][0] || saving}><ChevronLeft size={18}/>Back</button>
              <span>{STUDIO_STEPS.findIndex(([id]) => id === studioStep) + 1} / {STUDIO_STEPS.length}</span>
              {studioStep === STUDIO_STEPS.at(-1)[0] ? (
                <button type="submit" className="primary" disabled={saving}>{saving ? <LoaderCircle className="character-modal__spinner" size={17}/> : <Check size={17}/>} {character ? "Save character" : "Create character"}</button>
              ) : (
                <button type="button" className="primary" onClick={() => moveStudioStep(1)} disabled={saving}>Continue<ChevronLeft className="character-studio__wizard-next-icon" size={18}/></button>
              )}
            </div>

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
        )}
      </section>
    </div>
  );
}

function StudioSection({ step = "", active = false, icon, kicker, title, description, children, onPolish = null, polishing = false }) {
  return (
    <section className={`studio-section${active ? " is-wizard-active" : ""}`} data-studio-step={step || undefined}>
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

function buildRemixSeed(character = {}) {
  const source = [
    character.role && `Role/archetype: ${character.role}`,
    character.relationship && `Relationship dynamic: ${character.relationship}`,
    character.personality && `Personality depth reference: ${character.personality}`,
    character.world && `World reference: ${character.world}`,
    character.speechStyle && `Voice depth reference: ${character.speechStyle}`,
  ].filter(Boolean).join("\n");
  return `Create a NEW original character using the profile below only as a depth and complexity reference. Do not copy the name, exact backstory, exact personality, dialogue, or relationship. Give me a distinct identity and a fresh dynamic while keeping the same level of psychological and roleplay detail.\n${source}`;
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
