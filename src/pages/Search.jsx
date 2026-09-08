import { ArrowLeft, BookHeart, BookOpen, Clock3, Crown, LoaderCircle, MessageCircle, Search as SearchIcon, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCharacters } from "../context/CharactersContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import "../styles/search.css";

const STOP_WORDS = new Set(["the","a","an","and","or","to","of","in","on","at","for","with","did","do","does","when","where","what","who","how","me","my","i","he","she","they","it","we","you","first","el","la","los","las","un","una","y","o","de","del","en","con","para","que","cuando","donde","como","yo","me","mi","él","ella","ellos"]);

function normalize(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function queryTokens(query) {
  const normalized = normalize(query);
  const tokens = [...new Set(normalized.split(" ").filter((token) => token.length >= 3 && !STOP_WORDS.has(token)))];
  return { normalized, tokens: tokens.slice(0, 8) };
}

function scoreText(text, query) {
  const haystack = normalize(text);
  if (!haystack) return 0;
  const { normalized, tokens } = queryTokens(query);
  let score = normalized.length >= 3 && haystack.includes(normalized) ? 40 : 0;
  tokens.forEach((token) => { if (haystack.includes(token)) score += 7; });
  if (tokens.length && tokens.every((token) => haystack.includes(token))) score += 12;
  return score;
}

function excerpt(value = "", query = "", max = 170) {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const { tokens } = queryTokens(query);
  const lower = normalize(text);
  const firstIndex = tokens.map((token) => lower.indexOf(token)).filter((index) => index >= 0).sort((a,b)=>a-b)[0] ?? 0;
  const start = Math.max(0, firstIndex - 45);
  const chunk = text.slice(start, start + max);
  return `${start ? "…" : ""}${chunk}${start + max < text.length ? "…" : ""}`;
}

export default function Search({ onBack, onOpenCharacter, onOpenMemories, onOpenLorebooks, onOpenStories }) {
  const { characters } = useCharacters();
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

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

  async function runSearch(event) {
    event?.preventDefault?.();
    const needle = query.trim();
    if (needle.length < 2) return;
    setSubmittedQuery(needle);
    setLoading(true);
    setError("");
    try {
      const [conversationResult, messageResult, memoryResult, loreResult] = await Promise.all([
        supabase.from("conversations").select("id, character_id, title, summary, story_recap, updated_at, story_timeline, group_mode, group_character_ids, group_title, archived_at").is("trashed_at", null).order("updated_at", { ascending: false }).limit(260),
        supabase.from("messages").select("id, conversation_id, sender, content, created_at").order("created_at", { ascending: false }).limit(1600),
        supabase.from("memories").select("id, conversation_id, character_id, content, category, importance, created_at, is_canon, is_pinned").is("superseded_at", null).order("created_at", { ascending: false }).limit(700),
        supabase.from("lore_entries").select("id, lorebook_id, name, content, entry_type, keywords, updated_at").eq("is_active", true).order("updated_at", { ascending: false }).limit(260),
      ]);
      for (const response of [conversationResult, messageResult, memoryResult, loreResult]) if (response.error) throw response.error;

      const conversations = conversationResult.data || [];
      const byConversation = new Map(conversations.map((item) => [item.id, item]));
      const found = [];

      characters.forEach((character) => {
        const score = scoreText(`${character.name} ${character.role || ""} ${character.description || ""} ${character.relationship || ""} ${character.world || ""}`, needle);
        if (score) found.push({ type: "character", score: score + 8, id: character.id, character, title: character.name, subtitle: character.role || "Character", text: character.description || character.relationship || "Open character" });
      });

      conversations.forEach((conversation) => {
        const character = characters.find((item) => item.id === conversation.character_id);
        if (!character) return;
        const castNames = (conversation.group_character_ids || []).map((id) => characters.find((item) => item.id === id)?.name).filter(Boolean).join(" ");
        const storyName = conversation.group_mode ? (conversation.group_title || conversation.title || castNames || "Group Story") : (conversation.title || `${character.name} story`);
        const score = scoreText(`${storyName} ${castNames} ${conversation.summary || ""} ${conversation.story_recap || ""}`, needle);
        if (!score) return;
        found.push({ type: "story", score: score + 6, id: conversation.id, conversationId: conversation.id, character, archived: Boolean(conversation.archived_at), title: storyName, subtitle: conversation.group_mode ? `Group Story${conversation.archived_at ? " · Archived" : ""}` : `${character.name} · Story${conversation.archived_at ? " · Archived" : ""}`, text: excerpt(conversation.story_recap || conversation.summary || "Open story", needle), date: conversation.updated_at });
      });

      (messageResult.data || []).forEach((message) => {
        const score = scoreText(message.content, needle);
        if (!score) return;
        const conversation = byConversation.get(message.conversation_id);
        const character = characters.find((item) => item.id === conversation?.character_id);
        if (!conversation || !character) return;
        found.push({ type: "message", score: score + (message.sender === "user" ? 1 : 0), id: message.id, messageId: message.id, conversationId: conversation.id, character, archived: Boolean(conversation.archived_at), title: conversation.group_mode ? (conversation.group_title || conversation.title) : character.name, subtitle: `${message.sender === "user" ? "Your message" : "Story message"}${conversation.archived_at ? " · Archived" : ""}`, text: excerpt(message.content, needle), date: message.created_at });
      });

      conversations.forEach((conversation) => {
        const character = characters.find((item) => item.id === conversation.character_id);
        if (!character) return;
        (Array.isArray(conversation.story_timeline) ? conversation.story_timeline : []).forEach((beat, index) => {
          const score = scoreText(`${beat.label || ""} ${beat.detail || ""} ${beat.kind || ""}`, needle);
          if (!score) return;
          found.push({ type: "timeline", score: score + 5, archived: Boolean(conversation.archived_at), id: `${conversation.id}-${beat.message_id || index}`, messageId: beat.message_id || null, conversationId: conversation.id, character, title: beat.label || "Story beat", subtitle: `${conversation.group_mode ? (conversation.group_title || conversation.title) : character.name} · Timeline${conversation.archived_at ? " · Archived" : ""}`, text: beat.detail || beat.kind || "Timeline event", date: beat.created_at || conversation.updated_at });
        });
      });

      (memoryResult.data || []).forEach((memory) => {
        if (memory.conversation_id && !byConversation.has(memory.conversation_id)) return;
        const score = scoreText(memory.content, needle);
        if (!score) return;
        const character = characters.find((item) => item.id === memory.character_id);
        found.push({ type: "memory", score: score + (memory.is_canon ? 8 : memory.is_pinned ? 5 : 0), id: memory.id, conversationId: memory.conversation_id, character, title: character?.name || "Memory", subtitle: memory.is_canon ? "Canon memory" : memory.category || "Memory", text: excerpt(memory.content, needle), date: memory.created_at });
      });

      (loreResult.data || []).forEach((entry) => {
        const keywords = Array.isArray(entry.keywords) ? entry.keywords.join(" ") : entry.keywords || "";
        const score = scoreText(`${entry.name} ${entry.content} ${keywords}`, needle);
        if (!score) return;
        found.push({ type: "lore", score, id: entry.id, title: entry.name, subtitle: `${entry.entry_type || "Lore"} · World lore`, text: excerpt(entry.content, needle), date: entry.updated_at });
      });

      setResults(found.sort((a,b) => b.score - a.score || new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 80));
    } catch (requestError) {
      console.error("Velvet search failed:", requestError);
      setError(requestError?.message || "Velvet couldn't search your library.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const groupedCounts = useMemo(() => results.reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), {}), [results]);

  function openResult(item) {
    if (item.archived) return onOpenStories?.();
    if ((item.type === "message" || item.type === "timeline") && item.character && item.conversationId) return onOpenCharacter(item.character, item.conversationId, item.messageId || null);
    if (item.type === "story" && item.character && item.conversationId) return onOpenCharacter(item.character, item.conversationId);
    if (item.type === "memory") {
      if (item.character && item.conversationId) return onOpenCharacter(item.character, item.conversationId);
      return onOpenMemories?.();
    }
    if (item.type === "character" && item.character) return onOpenCharacter(item.character);
    if (item.type === "lore") return onOpenLorebooks?.();
  }

  return <section className="chats-page chats-page--reference velvet-search-page">
    <header className="reference-stories-hero velvet-search-hero">
      <div className="reference-stories-hero__private"><Crown size={19}/><span>PRIVATE LIBRARY</span></div>
      <div className="reference-stories-title" aria-label="Search Velvet"><span className="reference-stories-title__script">search</span><span className="reference-stories-title__line reference-stories-title__line--left"/><h1>VELVET</h1><span className="reference-stories-title__spark">✦</span><span className="reference-stories-title__line reference-stories-title__line--right"/></div>
      <button className="reference-stories-new" type="button" onClick={onBack} aria-label="Back"><ArrowLeft size={22}/></button>
    </header>

    <form className="velvet-search-box" onSubmit={runSearch}>
      <SearchIcon size={21}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search a line, memory, character, place or moment…" autoFocus/>{query && <button type="button" onClick={()=>{setQuery("");setSubmittedQuery("");setResults([]);}} aria-label="Clear"><X size={16}/></button>}<button type="submit" disabled={loading || query.trim().length < 2}>{loading ? <LoaderCircle className="spin" size={17}/> : "Search"}</button>
    </form>
    <p className="velvet-search-hint">Try natural questions too: “when Rowan admitted he liked me”, “umbrella”, “Founders’ Ball”, “first fight”. Velvet ranks matching story evidence, not just titles.</p>

    {error && <div className="velvet-search-state">{error}</div>}
    {loading && <div className="velvet-search-state"><LoaderCircle className="spin" size={24}/><span>Searching your private library…</span></div>}
    {!loading && submittedQuery && !results.length && !error && <div className="velvet-search-state"><Sparkles size={24}/><span>No matching story evidence found for “{submittedQuery}”.</span></div>}

    {!loading && results.length > 0 && <>
      <div className="velvet-search-summary"><strong>{results.length} results</strong>{Object.entries(groupedCounts).map(([type,count])=><span key={type}>{count} {type}</span>)}</div>
      <div className="velvet-search-results">{results.map((item)=><button type="button" key={`${item.type}-${item.id}`} onClick={()=>openResult(item)} className="velvet-search-result">
        <span className="velvet-search-result__icon">{item.type === "message" ? <MessageCircle size={18}/> : item.type === "timeline" ? <Clock3 size={18}/> : item.type === "memory" ? <BookHeart size={18}/> : item.type === "story" || item.type === "lore" ? <BookOpen size={18}/> : <UserRound size={18}/>}</span>
        <span className="velvet-search-result__copy"><small>{item.subtitle}</small><strong>{item.title}</strong><p>{item.text}</p></span>
        {item.date && <time>{new Date(item.date).toLocaleDateString([], { day:"numeric", month:"short", year: new Date(item.date).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })}</time>}
      </button>)}</div>
    </>}
  </section>;
}
