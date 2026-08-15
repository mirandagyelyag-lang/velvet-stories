import { LoaderCircle, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCharacters } from "../context/CharactersContext";
import { supabase } from "../services/supabase";

function ChatInbox({ onOpenCharacter }) {
  const { user } = useAuth();
  const { characters } = useCharacters();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, character_id, title, updated_at, archived_at, trashed_at")
        .is("trashed_at", null)
        .order("updated_at", { ascending: false })
        .limit(30);
      const ids = (conversations || []).map((item) => item.id);
      let messages = [];
      if (ids.length) {
        const response = await supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false });
        messages = response.data || [];
      }
      const latest = new Map();
      messages.forEach((message) => {
        if (!latest.has(message.conversation_id)) latest.set(message.conversation_id, message);
      });
      if (alive) {
        setRows((conversations || []).map((conversation) => ({
          ...conversation,
          character: characters.find((item) => item.id === conversation.character_id),
          latest: latest.get(conversation.id),
        })).filter((item) => item.character));
        setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user?.id, characters.length]);

  const visible = useMemo(() => rows.filter((row) => !row.archived_at), [rows]);

  return (
    <section className="reference-inbox">
      <header className="reference-inbox__header">
        <span>PRIVATE CONVERSATIONS</span>
        <h1>Chats</h1>
        <p>Your active threads, without the library view.</p>
      </header>
      {loading ? (
        <div className="reference-inbox__state"><LoaderCircle className="spin" size={28}/><span>Opening chats...</span></div>
      ) : visible.length ? (
        <div className="reference-inbox__list">
          {visible.map((conversation) => {
            const character = conversation.character;
            const art = character.coverUrl || character.imageUrl;
            const preview = clean(conversation.latest?.content || character.firstMessage || character.role || "Continue your story.");
            return (
              <button key={conversation.id} className="reference-inbox__row" onClick={() => onOpenCharacter(character, conversation.id)}>
                <span className="reference-inbox__avatar">{art ? <img src={art} alt=""/> : character.initials}</span>
                <span className="reference-inbox__copy"><strong>{character.name}</strong><small>{preview}</small></span>
                <MessageCircle size={19}/>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="reference-inbox__state"><MessageCircle size={28}/><span>No active chats yet.</span></div>
      )}
    </section>
  );
}

function clean(value = "") {
  return String(value).replaceAll("*", "").replace(/\s+/g, " ").trim().slice(0, 110);
}

export default ChatInbox;
