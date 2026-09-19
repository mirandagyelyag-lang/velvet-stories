import {
  ArrowLeft,
  BookOpen,
  Brain,
  ChevronRight,
  Heart,
  Images,
  MessageCircle,
  Pencil,
  Plus,
  Quote,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  WandSparkles,
  SlidersHorizontal,
  LoaderCircle,
  Check,
  Save,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useCharacters } from "../context/CharactersContext";
import { useAuth } from "../context/AuthContext";
import { usePersonas } from "../context/PersonasContext";
import { useLorebooks } from "../context/LorebooksContext";
import { useTheme } from "../context/ThemeContext";
import StoryVoiceSheet from "../components/StoryVoiceSheet";
import MemoryBookDrawer from "../components/MemoryBookDrawer";
import "../styles/character-detail.css";

export default function CharacterDetail({
  character,
  onBack,
  onContinue,
  onNewStory,
  onOpenStory,
  onEdit,
  onInstantStory,
  onOpenMemories,
  onCharacterUpdated,
}) {
  const [stories, setStories] = useState([]);
  const { generateInstantStory, updateCharacter } = useCharacters();
  const { personas } = usePersonas();
  const { lorebooks } = useLorebooks();
  const { theme } = useTheme();
  const [instantLoading, setInstantLoading] = useState(false);
  const [instantError, setInstantError] = useState("");
  const [loading, setLoading] = useState(true);
  const [storySetupOpen, setStorySetupOpen] = useState(false);
  const [storyOpening, setStoryOpening] = useState("");
  const [storyPersonaId, setStoryPersonaId] = useState("");
  const [storyLorebookId, setStoryLorebookId] = useState("");
  const [memoryCount, setMemoryCount] = useState(0);
  const [styleOpen, setStyleOpen] = useState(false);
  const [infoPanel, setInfoPanel] = useState("");
  const [memoryBookOpen, setMemoryBookOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const mediaInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add("velvet-burgundy-route");
    document.body.classList.add("velvet-burgundy-route");
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.getAttribute("content") || "";
    const colors = { light: "#f7eff2", comfort: "#eee4dc", dark: "#10090e" };
    themeMeta?.setAttribute("content", colors[theme] || colors.dark);
    return () => {
      document.documentElement.classList.remove("velvet-burgundy-route");
      document.body.classList.remove("velvet-burgundy-route");
      if (themeMeta && previousThemeColor) themeMeta.setAttribute("content", previousThemeColor);
    };
  }, [theme]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      const [storiesResult, memoriesResult] = await Promise.all([
        supabase.from("conversations").select("id, title, updated_at, branch_parent_id, cover_url, story_recap, relationship_state").eq("character_id", character.id).eq("group_mode", false).is("trashed_at", null).is("archived_at", null).order("updated_at", { ascending: false }).limit(8),
        supabase.from("memories").select("id", { count: "exact", head: true }).eq("character_id", character.id).is("superseded_at", null),
      ]);
      if (alive) {
        setStories(storiesResult.data || []);
        setMemoryCount(Number(memoriesResult.count || 0));
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [character.id]);

  useEffect(() => {
    let alive = true;

    async function listGalleryBucket(bucket, folder, { signed = false } = {}) {
      const storage = supabase.storage.from(bucket);
      const { data, error } = await storage.list(folder, {
        limit: 24,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;

      const rows = (data || []).filter((item) => item?.name && !item.name.startsWith("."));
      if (!rows.length) return [];
      const paths = rows.map((item) => `${folder}/${item.name}`);

      if (signed) {
        const { data: signedRows, error: signedError } = await storage.createSignedUrls(paths, 60 * 60 * 24 * 7);
        if (signedError) throw signedError;
        const signedByPath = new Map((signedRows || []).map((item) => [item.path, item.signedUrl || ""]));
        return rows.map((item, index) => ({
          bucket,
          path: paths[index],
          name: item.name,
          url: signedByPath.get(paths[index]) || "",
        })).filter((item) => item.url);
      }

      return rows.map((item, index) => {
        const { data: publicData } = storage.getPublicUrl(paths[index]);
        return { bucket, path: paths[index], name: item.name, url: publicData?.publicUrl || "" };
      }).filter((item) => item.url);
    }

    (async () => {
      if (!user?.id) return;
      const folder = `${user.id}/gallery/${character.id}`;
      setGalleryError("");

      const [privateResult, legacyResult] = await Promise.allSettled([
        listGalleryBucket("character-gallery", folder, { signed: true }),
        // RC1 briefly stored gallery files in character-media. Keep those visible
        // so installing the fix never makes an existing photo disappear.
        listGalleryBucket("character-media", folder),
      ]);

      if (!alive) return;
      const privateItems = privateResult.status === "fulfilled" ? privateResult.value : [];
      const legacyItems = legacyResult.status === "fulfilled" ? legacyResult.value : [];
      setGalleryItems([...privateItems, ...legacyItems].slice(0, 24));

      if (privateResult.status === "rejected" && legacyResult.status === "rejected") {
        setGalleryError(privateResult.reason?.message || legacyResult.reason?.message || "Could not load character photos.");
      }
    })();

    return () => { alive = false; };
  }, [character.id, user?.id]);

  async function uploadGalleryMedia(event) {
    const files = Array.from(event.target.files || []).filter((file)=>file.type.startsWith("image/")).slice(0, Math.max(0, 12-galleryItems.length));
    event.target.value = "";
    if (!files.length || !user?.id) return;
    try {
      setGalleryBusy(true); setGalleryError("");
      const folder = `${user.id}/gallery/${character.id}`;
      const storage = supabase.storage.from("character-gallery");
      const uploaded = [];
      for (const file of files) {
        const extension = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
        const path = `${folder}/${crypto.randomUUID()}.${extension}`;
        const { error } = await storage.upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (error) throw error;
        const { data, error: signedError } = await storage.createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signedError) throw signedError;
        if (data?.signedUrl) uploaded.push({ bucket: "character-gallery", path, name: path.split("/").pop(), url: data.signedUrl });
      }
      setGalleryItems((current)=>[...uploaded, ...current].slice(0,24));
    } catch (error) {
      setGalleryError(error?.message || "Could not add those photos.");
    } finally { setGalleryBusy(false); }
  }

  async function deleteGalleryMedia(item) {
    if (!item?.path || galleryBusy) return;
    try {
      setGalleryBusy(true); setGalleryError("");
      const { error } = await supabase.storage.from(item.bucket || "character-gallery").remove([item.path]);
      if (error) throw error;
      setGalleryItems((current)=>current.filter((row)=>row.path!==item.path));
    } catch (error) { setGalleryError(error?.message || "Could not remove that photo."); }
    finally { setGalleryBusy(false); }
  }

  function openStorySetup() {
    setStoryOpening("");
    setStoryPersonaId(personas.find((item) => item.isDefault)?.id || "");
    setStoryLorebookId("");
    setStorySetupOpen(true);
  }

  async function handleInstantStory() {
    if (instantLoading) return;
    try {
      setInstantLoading(true);
      setInstantError("");
      const opening = await generateInstantStory(character);
      const defaultPersonaId = personas.find((item) => item.isDefault)?.id || "";
      await onInstantStory?.(
        { ...character, firstMessage: opening },
        { personaId: defaultPersonaId, instantStory: true }
      );
    } catch (error) {
      console.error("Instant Story failed:", error);
      setInstantError(error?.message || "Velvet couldn't open an instant story. Try again.");
    } finally {
      setInstantLoading(false);
    }
  }

  const tags = character.tags || [];
  const latestStory = stories[0] || null;
  const latestRelationship = latestStory?.relationship_state || {};
  const mediaItems = [...new Set([character.coverUrl, character.imageUrl, ...stories.map((story)=>story.cover_url)].filter(Boolean))].slice(0, 6);
  const depth = useMemo(
    () => [
      { label: "Values", value: character.values },
      { label: "Fears", value: character.fears },
      { label: "Habits", value: character.habits },
      { label: "Contradictions", value: character.contradictions },
    ].filter((item) => item.value),
    [character]
  );

  const hasWorldSection = Boolean(character.world || character.scenario);
  const hasVoiceSection = Boolean(character.speechStyle || character.boundaries);

  async function saveInlineCharacter(patch = {}) {
    const payload = {
      ...character,
      ...patch,
      name: String(patch.name ?? character.name ?? "").trim(),
      role: String(patch.role ?? character.role ?? "").trim(),
      description: String(patch.description ?? character.description ?? ""),
      personality: String(patch.personality ?? character.personality ?? ""),
      relationship: String(patch.relationship ?? character.relationship ?? ""),
      world: String(patch.world ?? character.world ?? ""),
      values: String(patch.values ?? character.values ?? ""),
      fears: String(patch.fears ?? character.fears ?? ""),
      habits: String(patch.habits ?? character.habits ?? ""),
      contradictions: String(patch.contradictions ?? character.contradictions ?? ""),
      coreMotivation: String(patch.coreMotivation ?? character.coreMotivation ?? ""),
      emotionalDefense: String(patch.emotionalDefense ?? character.emotionalDefense ?? ""),
      softeningTriggers: String(patch.softeningTriggers ?? character.softeningTriggers ?? ""),
      growthDirection: String(patch.growthDirection ?? character.growthDirection ?? ""),
      speechStyle: String(patch.speechStyle ?? character.speechStyle ?? ""),
      voiceVocabulary: String(patch.voiceVocabulary ?? character.voiceVocabulary ?? ""),
      humorStyle: String(patch.humorStyle ?? character.humorStyle ?? ""),
      conflictStyle: String(patch.conflictStyle ?? character.conflictStyle ?? ""),
      affectionStyle: String(patch.affectionStyle ?? character.affectionStyle ?? ""),
      verbalTells: String(patch.verbalTells ?? character.verbalTells ?? ""),
      voiceAvoidances: String(patch.voiceAvoidances ?? character.voiceAvoidances ?? ""),
      boundaries: String(patch.boundaries ?? character.boundaries ?? ""),
      scenario: String(patch.scenario ?? character.scenario ?? ""),
      exampleDialogue: String(patch.exampleDialogue ?? character.exampleDialogue ?? ""),
      responseLength: patch.responseLength ?? character.responseLength ?? "balanced",
      narrationStyle: patch.narrationStyle ?? character.narrationStyle ?? "balanced",
      firstMessage: String(patch.firstMessage ?? character.firstMessage ?? ""),
      imageUrl: patch.imageUrl ?? character.imageUrl ?? "",
      coverUrl: patch.coverUrl ?? character.coverUrl ?? "",
      color: patch.color ?? character.color ?? "#7a2942",
    };
    const updated = await updateCharacter(character.id, payload);
    onCharacterUpdated?.(updated);
    return updated;
  }

  async function saveInlineRelationship({ relationship = "", currentDynamic = "" } = {}) {
    const updated = await saveInlineCharacter({ relationship });
    if (latestStory?.id) {
      const nextRelationshipState = {
        ...latestRelationship,
        current_dynamic: String(currentDynamic || "").trim(),
      };
      const { error } = await supabase
        .from("conversations")
        .update({ relationship_state: nextRelationshipState, updated_at: new Date().toISOString() })
        .eq("id", latestStory.id);
      if (error) throw error;
      setStories((current) => current.map((story) => story.id === latestStory.id ? { ...story, relationship_state: nextRelationshipState } : story));
    }
    return updated;
  }

  async function renameStory(storyId, title) {
    const nextTitle = String(title || "").trim();
    if (!storyId || !nextTitle) throw new Error("Give this story a name first.");
    const { error } = await supabase
      .from("conversations")
      .update({ title: nextTitle, updated_at: new Date().toISOString() })
      .eq("id", storyId);
    if (error) throw error;
    setStories((current) => current.map((story) => story.id === storyId ? { ...story, title: nextTitle, updated_at: new Date().toISOString() } : story));
  }

  async function replaceCharacterMedia(event, kind) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setGalleryBusy(true);
    setGalleryError("");
    try {
      await saveInlineCharacter(kind === "avatar" ? { imageFile: file } : { coverFile: file });
    } catch (error) {
      setGalleryError(error?.message || "Could not update that photo.");
    } finally {
      setGalleryBusy(false);
    }
  }

  return (
    <section className="character-profile" style={{ "--character-color": character.color || "var(--accent)" }}>
      <header className="character-profile__topbar">
        <button className="character-profile__back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Characters</span>
        </button>

        {onEdit && (
          <button className="character-profile__edit" onClick={() => onEdit(character)}>
            <Pencil size={16} />
            <span>Edit character</span>
          </button>
        )}
      </header>

      <section className="character-profile__hero">
        <div className="character-profile__cover" aria-hidden="true">
          {character.coverUrl || character.imageUrl ? (
            <img src={character.coverUrl || character.imageUrl} alt="" decoding="async" />
          ) : (
            <span>{character.initials}</span>
          )}
          <div className="character-profile__cover-shade" />
        </div>

        <div className="character-profile__hero-content">
          <div className="character-profile__avatar">
            {character.imageUrl ? <img src={character.imageUrl} alt="" decoding="async" /> : <span>{character.initials}</span>}
          </div>

          <div className="character-profile__identity">
            <p className="character-profile__eyebrow">{character.role || "Character"}</p>
            <h1>{character.name}</h1>
            <p className="character-profile__intro">
              {character.description || "A story waiting to become something unforgettable."}
            </p>

            <div className="character-profile__story-signature" aria-label="Story signature">
              {character.relationship && <span><Heart size={13}/>{String(character.relationship).split(/[.!?]/)[0].slice(0, 56)}</span>}
              {character.world && <span><BookOpen size={13}/>{String(character.world).split(/[.!?]/)[0].slice(0, 48)}</span>}
              {latestStory && <span><MessageCircle size={13}/>Last opened {formatDate(latestStory.updated_at)}</span>}
            </div>

            {tags.length > 0 && (
              <div className="character-profile__tags">
                {tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            )}
          </div>

          <div className="character-profile__hero-actions">
            <button className="character-profile__continue" onClick={() => latestStory ? onOpenStory(character, latestStory.id) : onContinue(character)}>
              <MessageCircle size={18} />
              <span>{latestStory ? "Continue latest story" : "Begin story"}</span>
            </button>
            <button className="character-profile__new" type="button" onClick={openStorySetup} aria-label="Start a new story"><Plus size={18} /><span>New story</span></button><button className="character-profile__instant" type="button" onClick={handleInstantStory} disabled={instantLoading}>{instantLoading ? <LoaderCircle className="spin" size={18}/> : <WandSparkles size={18}/>}<span>{instantLoading ? "Opening…" : "Instant Story"}</span></button>
            {instantError && <p className="character-profile__instant-error" role="status">{instantError}</p>}
          </div>
        </div>
      </section>

      <nav className="character-profile__app-actions" aria-label={`${character.name} information`}>
        <button type="button" onClick={()=>setInfoPanel("about")} aria-label="Open character details">
          <Sparkles size={19}/>
          <span>About</span>
        </button>
        <button type="button" onClick={()=>setInfoPanel("relationship")} aria-label="Open relationship">
          <Heart size={19}/>
          <span>Relationship</span>
          <small>{humanRelationshipPhase(latestRelationship.relationship_phase)}</small>
        </button>
        <button type="button" onClick={()=>setMemoryBookOpen(true)} aria-label="Open memories">
          <Brain size={19}/>
          <span>Memories</span>
          <small>{memoryCount}</small>
        </button>
        <button type="button" onClick={()=>setInfoPanel("stories")} aria-label="Open stories">
          <MessageCircle size={19}/>
          <span>Stories</span>
          <small>{stories.length}</small>
        </button>
        <button type="button" onClick={()=>setInfoPanel("media")} aria-label="Open photos">
          <Images size={19}/>
          <span>Photos</span>
        </button>
        <button type="button" onClick={()=>setStyleOpen(true)} aria-label="Open story voice">
          <SlidersHorizontal size={19}/>
          <span>Voice</span>
        </button>
      </nav>

      <input ref={mediaInputRef} type="file" accept="image/*" multiple hidden onChange={uploadGalleryMedia}/>
      <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={(event)=>replaceCharacterMedia(event, "avatar")}/>
      <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(event)=>replaceCharacterMedia(event, "cover")}/>

      <CharacterInfoSheet
        mode={infoPanel}
        onClose={()=>setInfoPanel("")}
        character={character}
        stories={stories}
        loading={loading}
        latestRelationship={latestRelationship}
        depth={depth}
        hasWorldSection={hasWorldSection}
        hasVoiceSection={hasVoiceSection}
        mediaItems={mediaItems}
        galleryItems={galleryItems}
        galleryBusy={galleryBusy}
        galleryError={galleryError}
        onAddPhotos={()=>mediaInputRef.current?.click()}
        onDeletePhoto={deleteGalleryMedia}
        onOpenStory={(storyId)=>{ setInfoPanel(""); onOpenStory(character, storyId); }}
        onNewStory={()=>{ setInfoPanel(""); openStorySetup(); }}
        onStartOpening={()=>{ setInfoPanel(""); openStorySetup(); }}
        onSaveAbout={saveInlineCharacter}
        onSaveRelationship={saveInlineRelationship}
        onRenameStory={renameStory}
        onChangeAvatar={()=>avatarInputRef.current?.click()}
        onChangeCover={()=>coverInputRef.current?.click()}
      />

      <MemoryBookDrawer
        open={memoryBookOpen}
        onClose={()=>setMemoryBookOpen(false)}
        character={character}
        conversationId={latestStory?.id || ""}
        onCountChange={setMemoryCount}
      />

      <StoryVoiceSheet open={styleOpen} onClose={()=>setStyleOpen(false)} character={character} />

      {storySetupOpen && typeof document !== "undefined" && createPortal((
        <div className="story-setup-backdrop story-setup-backdrop--portal" onMouseDown={(event)=>event.target === event.currentTarget && setStorySetupOpen(false)}>
          <section className="story-setup-sheet" role="dialog" aria-modal="true" aria-label={`Start a new story with ${character.name}`}>
            <header>
              <div><small>NEW STORY</small><h2>Where should this one begin?</h2><p>Keep the character. Change only the opening if you want a different universe, day or situation.</p></div>
              <button type="button" onClick={()=>setStorySetupOpen(false)} aria-label="Close new story setup"><X size={19}/></button>
            </header>
            <div className="story-setup-sheet__identity-grid">
              <label><span>Your persona <small>this story only</small></span><select value={storyPersonaId} onChange={(event)=>setStoryPersonaId(event.target.value)}><option value="">Account identity</option>{personas.map((persona)=><option key={persona.id} value={persona.id}>{persona.isDefault ? "★ " : ""}{persona.name}{persona.role ? ` · ${persona.role}` : ""}</option>)}</select></label>
              <label><span>World / lorebook <small>optional</small></span><select value={storyLorebookId} onChange={(event)=>setStoryLorebookId(event.target.value)}><option value="">No linked world</option>{lorebooks.map((book)=><option key={book.id} value={book.id}>{book.name}{book.genre ? ` · ${book.genre}` : ""}</option>)}</select></label>
            </div>
            <p className="story-setup-sheet__persona-note">Velvet keeps this persona isolated from your other identities and retrieves only world lore relevant to the current scene.</p>
            <label><span>Opening beat <small>optional</small></span><textarea rows="5" value={storyOpening} onChange={(event)=>setStoryOpening(event.target.value)} placeholder={character.firstMessage || `The next story with ${character.name} begins…`} /></label>
            <div className="story-setup-sheet__choices">
              <button type="button" onClick={()=>setStoryOpening("")} className={!storyOpening.trim() ? "is-active" : ""}><BookOpen size={16}/><span>Original opening<small>Use the character's saved scene</small></span></button>
              <button type="button" onClick={()=>document.querySelector(".story-setup-sheet textarea")?.focus()} className={storyOpening.trim() ? "is-active" : ""}><Sparkles size={16}/><span>Custom opening<small>Write what happens first</small></span></button>
            </div>
            <footer><button type="button" className="secondary" onClick={()=>setStorySetupOpen(false)}>Cancel</button><button type="button" className="primary" onClick={()=>{ setStorySetupOpen(false); onNewStory({ ...character, firstMessage: storyOpening.trim() || character.firstMessage }, { personaId: storyPersonaId, lorebookId: storyLorebookId }); }}><MessageCircle size={17}/>Start story</button></footer>
          </section>
        </div>
      ), document.body)}
    </section>
  );
}


function CharacterInfoSheet({
  mode,
  onClose,
  character,
  stories,
  loading,
  latestRelationship,
  depth,
  hasWorldSection,
  hasVoiceSection,
  mediaItems,
  galleryItems,
  galleryBusy,
  galleryError,
  onAddPhotos,
  onDeletePhoto,
  onOpenStory,
  onNewStory,
  onStartOpening,
  onSaveAbout,
  onSaveRelationship,
  onRenameStory,
  onChangeAvatar,
  onChangeCover,
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [draft, setDraft] = useState({});
  const [storyEditingId, setStoryEditingId] = useState("");
  const [storyTitleDraft, setStoryTitleDraft] = useState("");
  const [storySavingId, setStorySavingId] = useState("");

  useEffect(() => {
    if (!mode || typeof document === "undefined") return undefined;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);
    };
  }, [mode]);

  useEffect(() => {
    setEditing(false);
    setSaving(false);
    setSaveError("");
    setStoryEditingId("");
    setStoryTitleDraft("");
    setDraft(buildSheetDraft(mode, character, latestRelationship));
  }, [mode, character?.id]);

  if (!mode || typeof document === "undefined") return null;

  const titles = {
    about: ["CHARACTER", character.name],
    relationship: ["RELATIONSHIP", "You & " + character.name],
    stories: ["STORIES", "Your stories together"],
    media: ["PHOTOS", character.name + " gallery"],
  };
  const [eyebrow, title] = titles[mode] || ["CHARACTER", character.name];
  const relationshipDynamic = latestRelationship?.current_dynamic || character.relationship || "Still unfolding.";
  const relationshipShift = latestRelationship?.recent_shift || latestRelationship?.turning_points?.at?.(-1)?.impact || latestRelationship?.turning_points?.at?.(-1)?.event || "";
  const contradictions = Array.isArray(latestRelationship?.active_contradictions) ? latestRelationship.active_contradictions : [];
  const residue = Array.isArray(latestRelationship?.emotional_residue) ? latestRelationship.emotional_residue : [];
  const canEditWholeSheet = mode === "about" || mode === "relationship";

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function beginEdit() {
    setDraft(buildSheetDraft(mode, character, latestRelationship));
    setSaveError("");
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(buildSheetDraft(mode, character, latestRelationship));
    setSaveError("");
    setEditing(false);
  }

  async function saveSheet() {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      if (mode === "about") {
        if (!String(draft.name || "").trim()) throw new Error("The character needs a name.");
        await onSaveAbout?.({
          name: draft.name,
          role: draft.role,
          description: draft.description,
          personality: draft.personality,
          values: draft.values,
          fears: draft.fears,
          habits: draft.habits,
          contradictions: draft.contradictions,
          world: draft.world,
          scenario: draft.scenario,
          speechStyle: draft.speechStyle,
          boundaries: draft.boundaries,
          firstMessage: draft.firstMessage,
        });
      } else if (mode === "relationship") {
        await onSaveRelationship?.({
          relationship: draft.relationship,
          currentDynamic: draft.currentDynamic,
        });
      }
      setEditing(false);
    } catch (error) {
      setSaveError(error?.message || "Velvet couldn't save those changes.");
    } finally {
      setSaving(false);
    }
  }

  async function saveStoryTitle(story) {
    if (!story?.id || storySavingId) return;
    setStorySavingId(story.id);
    setSaveError("");
    try {
      await onRenameStory?.(story.id, storyTitleDraft);
      setStoryEditingId("");
      setStoryTitleDraft("");
    } catch (error) {
      setSaveError(error?.message || "Velvet couldn't rename that story.");
    } finally {
      setStorySavingId("");
    }
  }

  return createPortal((
    <div className="character-app-sheet-backdrop" onPointerDown={(event)=>event.target===event.currentTarget&&!editing&&onClose?.()}>
      <section className={`character-app-sheet${editing ? " is-editing" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="character-app-sheet__grab" />
        <header className="character-app-sheet__header">
          <div>
            <small>{eyebrow}</small>
            <h2>{title}</h2>
          </div>
          <div className="character-app-sheet__header-actions">
            {canEditWholeSheet && !editing && (
              <button type="button" className="character-app-sheet__edit" onClick={beginEdit}>
                <Pencil size={16}/><span>Edit</span>
              </button>
            )}
            {editing && (
              <>
                <button type="button" className="character-app-sheet__cancel" onClick={cancelEdit} disabled={saving}>Cancel</button>
                <button type="button" className="character-app-sheet__save" onClick={saveSheet} disabled={saving}>
                  {saving ? <LoaderCircle className="spin" size={16}/> : <Save size={16}/>}
                  <span>{saving ? "Saving…" : "Save"}</span>
                </button>
              </>
            )}
            {!editing && <button type="button" className="character-app-sheet__close" onClick={onClose} aria-label="Close"><X size={19}/></button>}
          </div>
        </header>

        <div className="character-app-sheet__body">
          {saveError && <p className="character-app-sheet__error" role="status">{saveError}</p>}

          {mode === "about" && editing && (
            <form className="character-app-sheet__editor" onSubmit={(event)=>{event.preventDefault(); void saveSheet();}}>
              <div className="character-app-sheet__editor-grid character-app-sheet__editor-grid--identity">
                <SheetField label="Name" value={draft.name} onChange={(value)=>updateDraft("name", value)} />
                <SheetField label="Role" value={draft.role} onChange={(value)=>updateDraft("role", value)} />
              </div>
              <SheetField label="Short description" value={draft.description} onChange={(value)=>updateDraft("description", value)} textarea rows={3} />
              <SheetField label="Personality" value={draft.personality} onChange={(value)=>updateDraft("personality", value)} textarea rows={5} />
              <div className="character-app-sheet__editor-grid">
                <SheetField label="Values" value={draft.values} onChange={(value)=>updateDraft("values", value)} textarea rows={3} />
                <SheetField label="Fears" value={draft.fears} onChange={(value)=>updateDraft("fears", value)} textarea rows={3} />
                <SheetField label="Habits" value={draft.habits} onChange={(value)=>updateDraft("habits", value)} textarea rows={3} />
                <SheetField label="Contradictions" value={draft.contradictions} onChange={(value)=>updateDraft("contradictions", value)} textarea rows={3} />
              </div>
              <SheetField label="World" value={draft.world} onChange={(value)=>updateDraft("world", value)} textarea rows={4} />
              <SheetField label="Scenario" value={draft.scenario} onChange={(value)=>updateDraft("scenario", value)} textarea rows={4} />
              <SheetField label="Speech style" value={draft.speechStyle} onChange={(value)=>updateDraft("speechStyle", value)} textarea rows={4} />
              <SheetField label="Boundaries" value={draft.boundaries} onChange={(value)=>updateDraft("boundaries", value)} textarea rows={4} />
              <SheetField label="Opening scene" value={draft.firstMessage} onChange={(value)=>updateDraft("firstMessage", value)} textarea rows={6} />
            </form>
          )}

          {mode === "about" && !editing && (
            <>
              <section className="character-app-sheet__section character-app-sheet__identity-summary">
                <small>PROFILE</small>
                <div className="character-app-sheet__profile-line"><strong>{character.role || "Character"}</strong><span>{character.description || "No short description yet."}</span></div>
              </section>

              {character.personality && (
                <section className="character-app-sheet__section">
                  <small>PERSONALITY</small>
                  <p>{character.personality}</p>
                </section>
              )}

              {depth.length > 0 && (
                <section className="character-app-sheet__section">
                  <small>CHARACTER CORE</small>
                  <div className="character-app-sheet__detail-list">
                    {depth.map((item)=><div key={item.label}><strong>{item.label}</strong><p>{item.value}</p></div>)}
                  </div>
                </section>
              )}

              {hasWorldSection && (
                <section className="character-app-sheet__section">
                  <small>WORLD & SCENARIO</small>
                  <div className="character-app-sheet__detail-list">
                    {character.world && <div><strong>World</strong><p>{character.world}</p></div>}
                    {character.scenario && <div><strong>Scenario</strong><p>{character.scenario}</p></div>}
                  </div>
                </section>
              )}

              {hasVoiceSection && (
                <section className="character-app-sheet__section">
                  <small>BEHAVIOR</small>
                  <div className="character-app-sheet__detail-list">
                    {character.speechStyle && <div><strong>Speech style</strong><p>{character.speechStyle}</p></div>}
                    {character.boundaries && <div><strong>Boundaries</strong><p>{character.boundaries}</p></div>}
                  </div>
                </section>
              )}

              {character.firstMessage && (
                <section className="character-app-sheet__section character-app-sheet__opening">
                  <small>OPENING SCENE</small>
                  <blockquote>{character.firstMessage}</blockquote>
                  <button type="button" onClick={onStartOpening}>Start from this opening <ChevronRight size={16}/></button>
                </section>
              )}
            </>
          )}

          {mode === "relationship" && editing && (
            <form className="character-app-sheet__editor" onSubmit={(event)=>{event.preventDefault(); void saveSheet();}}>
              <SheetField
                label="Relationship to you"
                hint="The character's saved starting dynamic."
                value={draft.relationship}
                onChange={(value)=>updateDraft("relationship", value)}
                textarea
                rows={5}
              />
              <SheetField
                label="Current story dynamic"
                hint={stories.length ? "This changes only the latest story's current relationship state." : "No story exists yet, so this becomes useful once you begin one."}
                value={draft.currentDynamic}
                onChange={(value)=>updateDraft("currentDynamic", value)}
                textarea
                rows={5}
                disabled={!stories.length}
              />
            </form>
          )}

          {mode === "relationship" && !editing && (
            <>
              <section className="character-app-sheet__relationship-hero">
                <span>{humanRelationshipPhase(latestRelationship?.relationship_phase)}</span>
                <p>{relationshipDynamic}</p>
              </section>

              {character.relationship && relationshipDynamic !== character.relationship && (
                <section className="character-app-sheet__section">
                  <small>SAVED DYNAMIC</small>
                  <p>{character.relationship}</p>
                </section>
              )}

              {relationshipShift && (
                <section className="character-app-sheet__section">
                  <small>RECENT SHIFT</small>
                  <p>{relationshipShift}</p>
                </section>
              )}

              {(contradictions.length > 0 || residue.length > 0) && (
                <section className="character-app-sheet__section">
                  <small>WHAT IS STILL ACTIVE</small>
                  <div className="character-app-sheet__detail-list">
                    {contradictions.slice(-4).map((item,index)=><div key={`c-${index}`}><strong>Tension</strong><p>{typeof item === "string" ? item : item?.text || item?.detail || JSON.stringify(item)}</p></div>)}
                    {residue.slice(-4).map((item,index)=><div key={`r-${index}`}><strong>Emotional residue</strong><p>{typeof item === "string" ? item : item?.text || item?.detail || JSON.stringify(item)}</p></div>)}
                  </div>
                </section>
              )}
            </>
          )}

          {mode === "stories" && (
            <section className="character-app-sheet__stories">
              <button type="button" className="character-app-sheet__primary-action" onClick={onNewStory}><Plus size={17}/>New story</button>
              {loading ? (
                <p className="character-app-sheet__empty">Loading your stories…</p>
              ) : stories.length ? (
                <div className="character-app-sheet__story-list">
                  {stories.map((story,index)=>(
                    <article key={story.id} className="character-app-sheet__story-row">
                      {storyEditingId === story.id ? (
                        <>
                          <span className="character-app-sheet__story-index">{String(index+1).padStart(2,"0")}</span>
                          <input
                            value={storyTitleDraft}
                            onChange={(event)=>setStoryTitleDraft(event.target.value)}
                            onKeyDown={(event)=>{ if(event.key==="Enter"){ event.preventDefault(); void saveStoryTitle(story); } }}
                            autoFocus
                            aria-label="Story title"
                          />
                          <div className="character-app-sheet__story-edit-actions">
                            <button type="button" onClick={()=>{setStoryEditingId("");setStoryTitleDraft("");}} aria-label="Cancel rename"><X size={15}/></button>
                            <button type="button" onClick={()=>saveStoryTitle(story)} disabled={storySavingId===story.id || !storyTitleDraft.trim()} aria-label="Save story title">
                              {storySavingId===story.id ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <button type="button" className="character-app-sheet__story-open" onClick={()=>onOpenStory(story.id)}>
                            <span className="character-app-sheet__story-index">{String(index+1).padStart(2,"0")}</span>
                            <div><strong>{story.title || `${character.name} story`}</strong><small>{story.branch_parent_id ? "Branch · " : ""}{formatDate(story.updated_at)}</small></div>
                            <ChevronRight size={16}/>
                          </button>
                          <button type="button" className="character-app-sheet__story-rename" onClick={()=>{setStoryEditingId(story.id);setStoryTitleDraft(story.title || `${character.name} story`);}} aria-label="Rename story">
                            <Pencil size={15}/>
                          </button>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="character-app-sheet__empty">
                  <MessageCircle size={22}/>
                  <p>No stories yet.</p>
                  <button type="button" onClick={onNewStory}>Begin the first one</button>
                </div>
              )}
            </section>
          )}

          {mode === "media" && (
            <section className="character-app-sheet__media">
              <div className="character-app-sheet__media-actions">
                <button type="button" className="character-app-sheet__media-action" onClick={onChangeAvatar} disabled={galleryBusy}><Pencil size={16}/><span>Avatar</span></button>
                <button type="button" className="character-app-sheet__media-action" onClick={onChangeCover} disabled={galleryBusy}><Images size={16}/><span>Cover</span></button>
                <button type="button" className="character-app-sheet__primary-action" onClick={onAddPhotos} disabled={galleryBusy}>
                  <Upload size={17}/>{galleryBusy ? "Adding…" : "Add photos"}
                </button>
              </div>
              {galleryError && <p className="character-app-sheet__error">{galleryError}</p>}
              <div className="character-app-sheet__media-grid">
                {mediaItems.map((src,index)=>(
                  <figure key={`${src}-${index}`} className="is-core">
                    <img src={src} alt="" loading="lazy" decoding="async"/>
                    <figcaption>{index===0 ? "Profile / cover" : "Story cover"}</figcaption>
                  </figure>
                ))}
                {galleryItems.map((item)=>(
                  <figure key={item.path}>
                    <img src={item.url} alt="" loading="lazy" decoding="async"/>
                    <button type="button" onClick={()=>onDeletePhoto(item)} aria-label="Remove photo" disabled={galleryBusy}><Trash2 size={14}/></button>
                  </figure>
                ))}
              </div>
              {!mediaItems.length && !galleryItems.length && (
                <button type="button" className="character-app-sheet__empty-photo" onClick={onAddPhotos}><Images size={24}/><span>Add the first photo</span></button>
              )}
            </section>
          )}
        </div>
      </section>
    </div>
  ), document.body);
}

function SheetField({ label, hint = "", value = "", onChange, textarea = false, rows = 3, disabled = false }) {
  return (
    <label className="character-app-sheet__field">
      <span>{label}{hint && <small>{hint}</small>}</span>
      {textarea ? (
        <textarea rows={rows} value={value || ""} onChange={(event)=>onChange(event.target.value)} disabled={disabled}/>
      ) : (
        <input value={value || ""} onChange={(event)=>onChange(event.target.value)} disabled={disabled}/>
      )}
    </label>
  );
}

function buildSheetDraft(mode, character = {}, latestRelationship = {}) {
  if (mode === "relationship") {
    return {
      relationship: character.relationship || "",
      currentDynamic: latestRelationship.current_dynamic || character.relationship || "",
    };
  }
  return {
    name: character.name || "",
    role: character.role || "",
    description: character.description || "",
    personality: character.personality || "",
    values: character.values || "",
    fears: character.fears || "",
    habits: character.habits || "",
    contradictions: character.contradictions || "",
    world: character.world || "",
    scenario: character.scenario || "",
    speechStyle: character.speechStyle || "",
    boundaries: character.boundaries || "",
    firstMessage: character.firstMessage || "",
  };
}

function humanRelationshipPhase(value="") {
  const key=String(value||"").toLowerCase().replace(/[_-]+/g," ");
  if(!key||key==="baseline") return "Still unfolding";
  if(/stranger|new/.test(key)) return "New";
  if(/familiar|acquaint/.test(key)) return "Familiar";
  if(/friend|close/.test(key)) return "Close";
  if(/complic|tension|conflict/.test(key)) return "Complicated";
  if(/romance|dating|lover|couple/.test(key)) return "Growing closer";
  if(/repair|rebuild/.test(key)) return "Rebuilding";
  return key.replace(/\b\w/g,(m)=>m.toUpperCase());
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function formatSetting(value) {
  if (!value) return "Balanced";
  return String(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
