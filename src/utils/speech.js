import { registerAudioStopper, setVoiceAudioState } from "./audioBus";
import { isSafeModeEnabled } from "./safeMode";
let activeUtterance = null;
let activeQueue = [];
let startTimer = null;
let runToken = 0;

function getSynth() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function naturalVoiceScore(voice) {
  const haystack = `${voice?.name || ""} ${voice?.voiceURI || ""}`.toLowerCase();
  let score = 0;
  if (/natural|neural|enhanced|premium|studio|online/.test(haystack)) score += 12;
  if (/google|microsoft|samsung|apple/.test(haystack)) score += 4;
  if (voice?.localService === false) score += 2;
  if (/compact|espeak|festival/.test(haystack)) score -= 5;
  return score;
}

export function getDeviceVoices() {
  const voices = getSynth()?.getVoices?.() || [];
  return [...voices].sort((a, b) => naturalVoiceScore(b) - naturalVoiceScore(a) || String(a.name).localeCompare(String(b.name)));
}

export function resolveDeviceVoice(savedVoice, voices = getDeviceVoices()) {
  const wanted = String(savedVoice || "").trim();
  if (!wanted) return voices[0] || null;
  return voices.find((voice) => voice.voiceURI === wanted)
    || voices.find((voice) => voice.name === wanted)
    || voices[0]
    || null;
}

function cleanForSpeech(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_~`#>]+/g, " ")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function splitNaturalChunks(value) {
  const clean = cleanForSpeech(value);
  if (!clean) return [];
  const sentences = clean.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [clean];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    const next = `${current} ${sentence}`.trim();
    if (next.length > 180 && current) {
      chunks.push(current.trim());
      current = sentence.trim();
    } else {
      current = next;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function variationForChunk(chunk, index) {
  const question = /\?\s*$/.test(chunk);
  const exclamation = /!\s*$/.test(chunk);
  const soft = /(?:\.\.\.|…|\bwhisper|\bsoftly|\bquietly)\b/i.test(chunk);
  return {
    rate: (index % 3 === 0 ? 0.97 : index % 3 === 1 ? 1.0 : 0.985) * (soft ? 0.95 : 1) * (exclamation ? 1.025 : 1),
    pitch: question ? 1.035 : exclamation ? 1.02 : soft ? 0.985 : 1,
    pause: question ? 120 : exclamation ? 95 : /(?:\.\.\.|…)\s*$/.test(chunk) ? 160 : 82,
  };
}

export function stopSpeech() {
  runToken += 1;
  if (startTimer) {
    window.clearTimeout(startTimer);
    startTimer = null;
  }
  const synth = getSynth();
  if (synth) {
    try { synth.cancel(); } catch {}
  }
  activeUtterance = null;
  activeQueue = [];
  setVoiceAudioState(false);
}

export function speakText({
  text,
  voiceId = "",
  rate = 1,
  pitch = 1,
  volume = 1,
  label = "Voice",
  onStart,
  onEnd,
  onError,
}) {
  if (isSafeModeEnabled()) {
    onError?.(new Error("Voice is disabled while Velvet Safe Mode is on."));
    return () => {};
  }
  const synth = getSynth();
  const chunks = splitNaturalChunks(text);
  if (!synth || !chunks.length) {
    onError?.(new Error("Text to speech is not available on this device."));
    return () => {};
  }

  stopSpeech();
  const token = ++runToken;
  const voices = getDeviceVoices();
  const preferred = resolveDeviceVoice(voiceId, voices);
  let started = false;
  let index = 0;

  const fail = (event) => {
    if (token !== runToken) return;
    activeUtterance = null;
    activeQueue = [];
    setVoiceAudioState(false);
    onError?.(event);
  };

  const speakNext = () => {
    if (token !== runToken) return;
    if (index >= chunks.length) {
      activeUtterance = null;
      activeQueue = [];
      setVoiceAudioState(false);
      onEnd?.();
      return;
    }

    const chunk = chunks[index];
    const cadence = variationForChunk(chunk, index);
    const utterance = new SpeechSynthesisUtterance(chunk);
    activeUtterance = utterance;
    activeQueue = chunks.slice(index);

    if (preferred) {
      utterance.voice = preferred;
      if (preferred.lang) utterance.lang = preferred.lang;
    }

    utterance.rate = Math.min(1.55, Math.max(0.62, (Number(rate) || 1) * cadence.rate));
    utterance.pitch = Math.min(1.3, Math.max(0.72, (Number(pitch) || 1) * cadence.pitch));
    utterance.volume = Math.min(1, Math.max(0, Number(volume) || 0));

    utterance.onstart = () => {
      if (token !== runToken) return;
      if (!started) {
        started = true;
        setVoiceAudioState(true, label);
        onStart?.();
      }
    };
    utterance.onerror = (event) => {
      if (event?.error === "interrupted" && token !== runToken) return;
      fail(event);
    };
    utterance.onend = () => {
      if (token !== runToken) return;
      index += 1;
      startTimer = window.setTimeout(() => {
        startTimer = null;
        if (token === runToken) speakNext();
      }, cadence.pause);
    };

    try { synth.resume(); } catch {}
    try { synth.speak(utterance); }
    catch (error) { fail(error); }
  };

  // Android Chrome can cancel a new utterance if cancel() and speak() share one task.
  // Give the engine a little breathing room before starting the natural-cadence queue.
  startTimer = window.setTimeout(() => {
    startTimer = null;
    if (token !== runToken) return;
    try { synth.resume(); } catch {}
    speakNext();
  }, 180);

  return () => {
    if (token === runToken) stopSpeech();
  };
}

registerAudioStopper("speech", stopSpeech);

export function getVoiceCapabilities() {
  const voices = getDeviceVoices();
  return { engine: "device", languages: [...new Set(voices.map((voice) => voice.lang).filter(Boolean))].sort(), exposesGender: voices.some((voice) => Boolean(voice.gender)), neuralReady: true };
}
