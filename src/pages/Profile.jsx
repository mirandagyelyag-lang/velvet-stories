import {
  Activity,
  BookHeart,
  BookOpen,
  ChevronRight,
  Crown,
  Globe2,
  LockKeyhole,
  LogOut,
  Pencil,
  Settings2,
  ShieldCheck,
  Sparkles,
  Search,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
import { useLorebooks } from "../context/LorebooksContext";
import { usePersonas } from "../context/PersonasContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { VELVET_VERSION } from "../config/version";
import "../styles/profile.css";

const EMPTY_STATS = { stories: 0, memories: 0 };

function Profile({
  onManageCharacters,
  onManagePersonas,
  onManageLorebooks,
  onOpenMemories,
  onOpenDiagnostics,
  onOpenSettings,
  onOpenSearch,
}) {
  const { user, signOut } = useAuth();
  const { characters } = useCharacters();
  const { lorebooks } = useLorebooks();
  const { personas } = usePersonas();
  const { theme } = useTheme();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [draft, setDraft] = useState({ displayName: "", tagline: "", quote: "", avatarUrl: "" });

  const metadata = user?.user_metadata || {};
  const displayName = metadata.display_name || user?.email?.split("@")[0] || "Velvet owner";
  const tagline = metadata.profile_tagline || "Private story collector.";
  const quote = metadata.profile_quote || user?.email || "Your private library, your rules.";
  const avatarUrl = metadata.avatar_url || metadata.picture || "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "V";

  useEffect(() => {
    document.documentElement.classList.add("velvet-burgundy-route");
    document.body.classList.add("velvet-burgundy-route");
    return () => {
      document.documentElement.classList.remove("velvet-burgundy-route");
      document.body.classList.remove("velvet-burgundy-route");
    };
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const colors = { light: "#f7eff2", comfort: "#eee4dc", dark: "#10090e" };
    meta?.setAttribute("content", colors[theme] || colors.dark);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      if (!user) return;
      const storiesResult = await supabase.from("conversations").select("id", { count: "exact" }).is("trashed_at", null).is("archived_at", null);
      const activeIds = (storiesResult.data || []).map((story) => story.id);
      const memoriesResult = activeIds.length
        ? await supabase.from("memories").select("*", { count: "exact", head: true }).in("conversation_id", activeIds)
        : { count: 0, error: null };
      if (cancelled) return;
      setStats({
        stories: storiesResult.error ? 0 : storiesResult.count || 0,
        memories: memoriesResult.error ? 0 : memoriesResult.count || 0,
      });
    }
    loadCounts();
    return () => { cancelled = true; };
  }, [user?.id]);

  const statsList = useMemo(() => [
    { label: "Stories", value: stats.stories },
    { label: "Characters", value: characters.length },
    { label: "Memories", value: stats.memories },
    { label: "Worlds", value: lorebooks.length },
  ], [stats, characters.length, lorebooks.length]);

  function openProfileEditor() {
    setDraft({
      displayName,
      tagline: metadata.profile_tagline || "",
      quote: metadata.profile_quote || "",
      avatarUrl,
    });
    setProfileError("");
    setProfileEditorOpen(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    const nextName = draft.displayName.trim();
    if (!nextName) {
      setProfileError("Add a display name first.");
      return;
    }
    try {
      setSavingProfile(true);
      setProfileError("");
      const { error } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          display_name: nextName,
          profile_tagline: draft.tagline.trim(),
          profile_quote: draft.quote.trim(),
          avatar_url: draft.avatarUrl.trim(),
        },
      });
      if (error) throw error;
      setProfileEditorOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setProfileError(error?.message || "Velvet couldn't update your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      setSigningOut(false);
    }
  }

  const menuRows = [
    { icon: BookOpen, label: "Characters", value: characters.length, action: onManageCharacters },
    { icon: UsersRound, label: "Roleplay Personas", value: personas.length, action: onManagePersonas },
    { icon: Globe2, label: "World & Lorebooks", value: lorebooks.length, action: onManageLorebooks },
    { icon: BookHeart, label: "Memories", value: stats.memories, action: onOpenMemories },
    { icon: Search, label: "Search Velvet", action: onOpenSearch },
    { icon: Settings2, label: "Settings", action: onOpenSettings },
    { icon: Activity, label: "AI Status", action: onOpenDiagnostics },
  ];

  return (
    <section className="chats-page chats-page--reference profile-reference-page">
      <header className="reference-stories-hero profile-reference__hero">
        <div className="reference-stories-hero__private"><Crown size={19}/><span>PRIVATE LIBRARY</span></div>
        <div className="reference-stories-title" aria-label="Your Profile">
          <span className="reference-stories-title__script">your</span>
          <span className="reference-stories-title__line reference-stories-title__line--left" />
          <h1>PROFILE</h1>
          <span className="reference-stories-title__spark">✦</span>
          <span className="reference-stories-title__line reference-stories-title__line--right" />
        </div>
        <button className="reference-stories-new" type="button" onClick={openProfileEditor} aria-label="Edit profile"><Sparkles size={26}/></button>
      </header>

      <section className="profile-reference__identity">
        <div className="profile-reference__identity-top">
          <div className="profile-reference__avatar-wrap">
            <div className="profile-reference__avatar">
              {avatarUrl ? <img src={avatarUrl} alt=""/> : <span>{initial}</span>}
            </div>
            <button type="button" className="profile-reference__avatar-edit" onClick={openProfileEditor} aria-label="Edit profile photo"><Pencil size={15}/></button>
          </div>

          <div className="profile-reference__identity-copy">
            <div className="profile-reference__name-line"><h2>{displayName}</h2><Crown size={18}/></div>
            <p className="profile-reference__tagline">{tagline}</p>
            <p className="profile-reference__quote">{quote}</p>
          </div>

          <button type="button" className="profile-reference__edit" onClick={openProfileEditor}><Pencil size={16}/>Edit profile</button>
        </div>

        <div className="profile-reference__stats">
          {statsList.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
        </div>

        <div className="profile-reference__private-banner">
          <span className="profile-reference__private-mark"><Crown size={20}/></span>
          <div><strong>VELVET PRIVATE</strong><p>Your stories, characters and memories stay inside your private account.</p></div>
          <button type="button" onClick={() => setAccessOpen(true)}>Manage <ChevronRight size={17}/></button>
        </div>


        <div className="profile-reference__menu">
          {menuRows.map(({ icon: Icon, label, value, action }) => (
            <button type="button" key={label} onClick={action}>
              <span className="profile-reference__menu-icon"><Icon size={22}/></span>
              <span>{label}</span>
              {Number.isFinite(value) && <small>{value}</small>}
              <ChevronRight size={18}/>
            </button>
          ))}
          <button type="button" onClick={() => setAccessOpen(true)}>
            <span className="profile-reference__menu-icon"><LockKeyhole size={22}/></span>
            <span>Profile & Access</span>
            <ChevronRight size={18}/>
          </button>
          <button type="button" className="profile-reference__logout" onClick={handleSignOut} disabled={signingOut}>
            <span className="profile-reference__menu-icon"><LogOut size={22}/></span>
            <span>{signingOut ? "Logging out…" : "Log out"}</span>
            <ChevronRight size={18}/>
          </button>
        </div>

        <div className="profile-reference__version"><span/>Version {VELVET_VERSION}<span/></div>
      </section>

      {accessOpen && (
        <div className="profile-access-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAccessOpen(false)}>
          <section className="profile-access-panel" role="dialog" aria-modal="true" aria-labelledby="profile-access-title">
            <header><div><p>PROFILE & ACCESS</p><h2 id="profile-access-title">Your private account</h2></div><button type="button" onClick={() => setAccessOpen(false)} aria-label="Close Profile and Access"><X size={20}/></button></header>
            <div className="profile-access-panel__identity"><div className="profile-access-panel__avatar">{avatarUrl ? <img src={avatarUrl} alt=""/> : <span>{initial}</span>}</div><div><strong>{displayName}</strong><small>{user?.email || "Signed in to Velvet"}</small></div></div>
            <div className="profile-access-panel__status"><ShieldCheck size={18}/><div><strong>Private account</strong><p>Your stories, characters and memories are tied to this signed-in account. Velvet does not publish a public profile.</p></div></div>
            <div className="profile-access-panel__rows">
              <div><span>Account</span><strong>{user?.email || "Signed in"}</strong></div>
              <div><span>Session</span><strong>Active on this device</strong></div>
              <div><span>Library access</span><strong>Private</strong></div>
            </div>
            <footer><button type="button" onClick={() => { setAccessOpen(false); openProfileEditor(); }}><Pencil size={16}/>Edit profile</button><button type="button" className="danger" onClick={handleSignOut} disabled={signingOut}><LogOut size={16}/>{signingOut ? "Logging out…" : "Log out"}</button></footer>
          </section>
        </div>
      )}

      {profileEditorOpen && (
        <div className="profile-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !savingProfile && setProfileEditorOpen(false)}>
          <form className="profile-editor" onSubmit={saveProfile}>
            <header><div><p>YOUR PROFILE</p><h2>Make it yours</h2></div><button type="button" onClick={() => setProfileEditorOpen(false)} disabled={savingProfile} aria-label="Close"><X size={20}/></button></header>
            <label>Display name<input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} maxLength={50} autoFocus/></label>
            <label>Tagline<input value={draft.tagline} onChange={(event) => setDraft((current) => ({ ...current, tagline: event.target.value }))} maxLength={80} placeholder="Dreamer. Writer. Story collector."/></label>
            <label>Profile line<input value={draft.quote} onChange={(event) => setDraft((current) => ({ ...current, quote: event.target.value }))} maxLength={120} placeholder="A little line that feels like you."/></label>
            <label>Profile image URL<input type="url" value={draft.avatarUrl} onChange={(event) => setDraft((current) => ({ ...current, avatarUrl: event.target.value }))} placeholder="https://…"/></label>
            {profileError && <p className="profile-editor__error">{profileError}</p>}
            <footer><button type="button" onClick={() => setProfileEditorOpen(false)} disabled={savingProfile}>Cancel</button><button type="submit" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save profile"}</button></footer>
          </form>
        </div>
      )}
    </section>
  );
}

export default Profile;
