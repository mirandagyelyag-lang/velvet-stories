import { Square, Volume2, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { getAudioState, stopAllAudio, subscribeAudioState } from "../utils/audioBus";

export default function AudioStatusPill({ onStopAll }) {
  const [audio, setAudio] = useState(getAudioState);
  useEffect(() => subscribeAudioState(setAudio), []);
  if (!audio.voiceActive && !audio.ambienceActive) return null;
  const label = [audio.voiceLabel, audio.ambienceLabel].filter(Boolean).join(" · ") || "Audio playing";
  return <div className="audio-status-pill" role="status" aria-live="polite">
    <span>{audio.voiceActive ? <Volume2 size={14}/> : <Waves size={14}/>}<small>NOW PLAYING</small><strong>{label}</strong></span>
    <button type="button" onClick={() => { stopAllAudio(); onStopAll?.(); }} aria-label="Stop all Velvet audio"><Square size={13}/>Stop all</button>
  </div>;
}
