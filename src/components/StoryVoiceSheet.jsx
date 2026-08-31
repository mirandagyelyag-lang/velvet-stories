import { Check, MessageCircle, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { STORY_STYLE_OPTIONS, readCharacterStoryStyle, writeCharacterStoryStyle } from "../utils/characterStoryStyle";

export default function StoryVoiceSheet({ open, onClose, character }) {
  const [draft, setDraft] = useState({ traits: [], note: "" });
  useEffect(() => { if (open && character?.id) setDraft(readCharacterStoryStyle(character.id)); }, [open, character?.id]);
  if (!open || !character) return null;

  function toggle(id) {
    setDraft((current) => ({
      ...current,
      traits: current.traits.includes(id) ? current.traits.filter((item) => item !== id) : [...current.traits, id].slice(-6),
    }));
  }

  function save() {
    writeCharacterStoryStyle(character.id, draft);
    onClose?.();
  }

  return <div className="v311-sheet-backdrop" onPointerDown={(event)=>event.target===event.currentTarget&&onClose?.()}>
    <section className="v311-sheet v311-story-voice" role="dialog" aria-modal="true" aria-label={`Story voice for ${character.name}`}>
      <div className="v311-sheet__grab" />
      <header><div><small><Sparkles size={13}/> STORY VOICE</small><h2>How should {character.name} feel?</h2><p>Simple preferences only. Velvet translates these into the hidden narrative controls.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={19}/></button></header>
      <div className="v311-story-voice__chips">{STORY_STYLE_OPTIONS.map((item)=><button type="button" key={item.id} className={draft.traits.includes(item.id)?"is-active":""} onClick={()=>toggle(item.id)}>{draft.traits.includes(item.id)&&<Check size={13}/>} {item.label}</button>)}</div>
      <label className="v311-story-voice__note"><span><MessageCircle size={14}/> Anything specific?</span><textarea rows="3" maxLength={360} value={draft.note} onChange={(event)=>setDraft((current)=>({...current,note:event.target.value}))} placeholder="e.g. He talks very little when upset, but he doesn't leave. He is teasing, not cruel."/><small>{draft.note.length}/360</small></label>
      <footer><button type="button" onClick={onClose}>Cancel</button><button type="button" className="primary" onClick={save}><Check size={15}/>Save for {character.name}</button></footer>
    </section>
  </div>;
}
