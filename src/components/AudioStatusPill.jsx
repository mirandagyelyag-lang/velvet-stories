import { Pause, Square, Volume2, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { getAudioState, stopAllAudio, subscribeAudioState } from "../utils/audioBus";

export default function AudioStatusPill({ onStopAll }) {
  const [audio, setAudio] = useState(getAudioState);
  useEffect(() => subscribeAudioState(setAudio), []);
  if (!audio.voiceActive && !audio.ambienceActive && !audio.ambiencePaused) return null;
  const ambienceLabel = audio.ambiencePaused && audio.ambienceLabel ? `${audio.ambienceLabel} · Paused` : audio.ambienceLabel;
  const label = [audio.voiceLabel, ambienceLabel].filter(Boolean).join(" · ") || "Audio playing";
  return <div className="audio-status-pill" role="status" aria-live="polite">
    <span>{audio.voiceActive ? <Volume2 size={14}/> : audio.ambiencePaused ? <Pause size={14}/> : <Waves size={14}/>}<small>{audio.ambiencePaused && !audio.voiceActive ? "PAUSED" : "NOW PLAYING"}</small><strong>{label}</strong></span>
    <button type="button" onClick={() => { stopAllAudio(); onStopAll?.(); }} aria-label="Stop all Velvet audio"><Square size={13}/>Stop all</button>
  </div>;
}
