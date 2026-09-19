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
}) {
  const [stories, setStories] = useState([]);
  const { generateInstantStory } = useCharacters();
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
}) {
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

  return createPortal((
    <div className="character-app-sheet-backdrop" onPointerDown={(event)=>event.target===event.currentTarget&&onClose?.()}>
      <section className="character-app-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="character-app-sheet__grab" />
        <header className="character-app-sheet__header">
          <div>
            <small>{eyebrow}</small>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={19}/></button>
        </header>

        <div className="character-app-sheet__body">
          {mode === "about" && (
            <>
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

          {mode === "relationship" && (
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
                    <button type="button" key={story.id} onClick={()=>onOpenStory(story.id)}>
                      <span>{String(index+1).padStart(2,"0")}</span>
                      <div><strong>{story.title || `${character.name} story`}</strong><small>{story.branch_parent_id ? "Branch · " : ""}{formatDate(story.updated_at)}</small></div>
                      <ChevronRight size={16}/>
                    </button>
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
              <button type="button" className="character-app-sheet__primary-action" onClick={onAddPhotos} disabled={galleryBusy}>
                <Upload size={17}/>{galleryBusy ? "Adding…" : "Add photos"}
              </button>
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
