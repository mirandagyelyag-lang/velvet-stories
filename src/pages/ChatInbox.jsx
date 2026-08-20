import { Crown, Filter, LoaderCircle, MessageCircle, Search, Sparkles, Star, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import GroupStoryModal from "../components/GroupStoryModal";

const READ_KEY_PREFIX = "velvet_chat_seen_v2114_";

function ChatInbox({ onOpenCharacter, onBrowseCharacters }) {
  const { user } = useAuth();
  const { characters } = useCharacters();
  const { theme } = useTheme();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("all");
  const [sortOrder, setSortOrder] = useState("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [groupStoryOpen, setGroupStoryOpen] = useState(false);

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
    let alive = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, character_id, title, updated_at, archived_at, trashed_at, is_pinned, group_mode, group_character_ids, group_title")
        .is("trashed_at", null)
        .order("updated_at", { ascending: false })
        .limit(60);

      const ids = (conversations || []).map((item) => item.id);
      let messages = [];
      if (ids.length) {
        const response = await supabase
          .from("messages")
          .select("conversation_id, content, sender, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false });
        messages = response.data || [];
      }

      const byConversation = new Map();
      messages.forEach((message) => {
        const list = byConversation.get(message.conversation_id) || [];
        list.push(message);
        byConversation.set(message.conversation_id, list);
      });

      if (alive) {
        const nextRows = (conversations || []).map((conversation) => {
          const character = characters.find((item) => item.id === conversation.character_id);
          const groupCharacters = conversation.group_mode
            ? (conversation.group_character_ids || []).map((id) => characters.find((item) => item.id === id)).filter(Boolean)
            : [];
          const thread = byConversation.get(conversation.id) || [];
          const latest = thread[0];
          const readKey = `${READ_KEY_PREFIX}${conversation.id}`;
          const storedSeen = window.localStorage.getItem(readKey);
          if (!storedSeen && latest?.created_at) window.localStorage.setItem(readKey, latest.created_at);
          const seenAt = storedSeen ? new Date(storedSeen).getTime() : new Date(latest?.created_at || 0).getTime();
          const unreadCount = thread.filter((item) => item.sender !== "user" && new Date(item.created_at).getTime() > seenAt).length;
          return { ...conversation, character, groupCharacters, latest, unreadCount };
        }).filter((item) => item.character);
        setRows(nextRows);
        setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user?.id, characters.length]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (view === "all" && row.archived_at) return false;
      if (view === "unread" && (row.archived_at || row.unreadCount < 1)) return false;
      if (view === "favorites" && (row.archived_at || !row.is_pinned)) return false;
      if (view === "archived" && !row.archived_at) return false;
      if (!needle) return true;
      return `${row.character?.name || ""} ${(row.groupCharacters || []).map((item) => item.name).join(" ")} ${row.character?.role || ""} ${row.title || ""} ${row.latest?.content || ""}`.toLowerCase().includes(needle);
    });
    return filtered.sort((a, b) => sortOrder === "oldest"
      ? new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [rows, search, view, sortOrder]);

  function openConversation(conversation) {
    if (conversation.latest?.created_at) {
      window.localStorage.setItem(`${READ_KEY_PREFIX}${conversation.id}`, conversation.latest.created_at);
      setRows((current) => current.map((item) => item.id === conversation.id ? { ...item, unreadCount: 0 } : item));
    }
    onOpenCharacter(conversation.character, conversation.id);
  }

  const tabs = [
    ["all", "All"],
    ["unread", "Unread"],
    ["favorites", "Favorites"],
    ["archived", "Archived"],
  ];

  return (
    <section className="reference-inbox reference-inbox--v2116">
      <header className="reference-stories-hero reference-inbox__hero">
        <div className="reference-stories-hero__private"><Crown size={19}/><span>PRIVATE LIBRARY</span></div>
        <div className="reference-stories-title reference-inbox__title" aria-label="Your Chats">
          <span className="reference-stories-title__script">your</span>
          <span className="reference-stories-title__line reference-stories-title__line--left" />
          <h1>CHATS</h1>
          <span className="reference-stories-title__spark">✦</span>
          <span className="reference-stories-title__line reference-stories-title__line--right" />
        </div>
        <button className="reference-stories-new reference-inbox__new-top" type="button" onClick={onBrowseCharacters} aria-label="Start a new chat"><Sparkles size={24}/></button>
      </header>

      <div className="reference-search-wrap reference-inbox__search-wrap">
        <label className="reference-search">
          <Search size={23}/>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chats..." />
          {search && <button type="button" className="reference-search__clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={16}/></button>}
        </label>
        <button className={`reference-filter${sortOpen ? " is-open" : ""}`} type="button" onClick={() => setSortOpen((value) => !value)} aria-label="Sort chats"><Filter size={21}/></button>
      </div>

      {sortOpen && (
        <div className="reference-filter-menu reference-inbox__sort-menu">
          <button className={sortOrder === "recent" ? "active" : ""} onClick={() => { setSortOrder("recent"); setSortOpen(false); }}>Recent first</button>
          <button className={sortOrder === "oldest" ? "active" : ""} onClick={() => { setSortOrder("oldest"); setSortOpen(false); }}>Oldest first</button>
        </div>
      )}

      <div className="reference-inbox__filter-row">
        <nav className="reference-inbox__tabs reference-inbox__tabs--quiet" aria-label="Chat filters">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" aria-current={view === id ? "page" : undefined} className={view === id ? "is-active" : ""} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="reference-inbox__group-button" onClick={() => setGroupStoryOpen(true)}><UsersRound size={16}/>Group story</button>
      </div>

      {loading ? (
        <div className="reference-inbox__state"><LoaderCircle className="spin" size={28}/><span>Opening chats...</span></div>
      ) : visible.length ? (
        <div className="reference-inbox__list reference-inbox__list--quiet">
          {visible.map((conversation) => {
            const character = conversation.character;
            const groupCharacters = conversation.groupCharacters || [];
            const art = character.coverUrl || character.imageUrl;
            const displayName = conversation.group_mode
              ? (conversation.group_title || conversation.title || groupCharacters.map((item) => item.name).join(" · "))
              : character.name;
            const lastMessage = clean(conversation.latest?.content || character.firstMessage || character.role || "Continue your story.");
            const lastMessageAt = formatChatDate(conversation.latest?.created_at || conversation.updated_at);
            return (
              <button key={conversation.id} className={`reference-inbox__row reference-inbox__row--quiet${conversation.unreadCount ? " is-unread" : ""}`} onClick={() => openConversation(conversation)}>
                <span className={`reference-inbox__avatar reference-inbox__avatar--quiet${conversation.group_mode ? " reference-inbox__avatar--group" : ""}`}>{conversation.group_mode ? groupCharacters.slice(0,3).map((member, index) => <span key={member.id} style={{ "--stack-index": index }}>{member.imageUrl ? <img src={member.imageUrl} alt="" loading="lazy" decoding="async"/> : member.initials}</span>) : (art ? <img src={art} alt=""/> : character.initials)}</span>
                <span className="reference-inbox__copy reference-inbox__copy--quiet">
                  <span className="reference-inbox__name-line reference-inbox__name-line--quiet">
                    <strong>{displayName}</strong>
                    {conversation.is_pinned && <Star size={13} fill="currentColor" aria-label="Favorite"/>}
                    <time>{lastMessageAt}</time>
                  </span>
                  <span className="reference-inbox__preview">{truncate(lastMessage, 112)}</span>
                </span>
                <span className="reference-inbox__status-dot" aria-label={conversation.unreadCount ? "Unread messages" : "Read"} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="reference-inbox__state"><MessageCircle size={28}/><span>{search ? "No chats match your search." : view === "unread" ? "You're all caught up." : "No chats here yet."}</span></div>
      )}
      {groupStoryOpen && <GroupStoryModal onClose={() => setGroupStoryOpen(false)} onOpenStory={onOpenCharacter}/>}
    </section>
  );
}

function clean(value = "") {
  return String(value).replaceAll("*", "").replaceAll("[", "").replaceAll("]", "").replace(/\s+/g, " ").trim();
}

function truncate(value = "", max = 112) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function formatChatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default ChatInbox;
