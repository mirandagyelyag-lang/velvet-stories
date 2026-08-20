import { useEffect, useRef } from "react";
import { registerAudioStopper, setAmbienceAudioState } from "../utils/audioBus";
import { isSafeModeEnabled } from "../utils/safeMode";

export const AMBIENT_MODES = [
  ["none", "None"],
  ["rain", "Rain"],
  ["night_city", "Night"],
  ["street_racing", "Street racing"],
  ["cafe", "Café"],
  ["campus", "Campus"],
  ["fireplace", "Fireplace"],
  ["home", "Home · TV"],
  ["party", "Party"],
];

// v2.6.16: every room uses a bundled recorded track. Playback is handled by a
// two-deck HTMLAudio looper so MP3 encoder padding never becomes an audible pause.
export const AMBIENCE_TRACKS = {
  rain: "/audio/ambience/rain-reference-gentle.mp3",
  night_city: "/audio/ambience/night-city-reference.mp3",
  street_racing: "/audio/ambience/street-racing-reference.mp3",
  cafe: "/audio/ambience/cafe-reference-warm.mp3",
  campus: "/audio/ambience/campus-reference.mp3",
  fireplace: "/audio/ambience/fireplace-reference-warm.mp3",
  home: "/audio/ambience/home-tv-reference-distant.mp3",
  party: "/audio/ambience/party-reference-next-room.mp3",
};

const LEGACY_AMBIENCE_ALIASES = {
  night_city_racing: "night_city",
};

const AMBIENCE_PLAYBACK_GAIN = {
  rain: 0.9,
  night_city: 0.75,
  street_racing: 0.78,
  cafe: 0.86,
  campus: 0.82,
  fireplace: 0.92,
  home: 0.9,
  party: 0.72,
};

const LOOP_CROSSFADE_MS = 720;
const SWITCH_CROSSFADE_MS = 520;

export function normalizeAmbientMode(mode) {
  const value = String(mode || "none");
  const normalized = LEGACY_AMBIENCE_ALIASES[value] || value;
  return normalized === "none" || AMBIENCE_TRACKS[normalized] ? normalized : "none";
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const volumeGain = (volume, multiplier = 1) => clamp(Number(volume || 0) / 100, 0, 1) * multiplier;

export function ambienceVolumeKey(mode) {
  return `velvet_ambience_volume_${normalizeAmbientMode(mode)}`;
}

export function readAmbienceVolume(mode, fallback = 18) {
  try {
    const value = Number(localStorage.getItem(ambienceVolumeKey(mode)));
    return Number.isFinite(value) ? clamp(value, 0, 45) : fallback;
  } catch { return fallback; }
}

export function writeAmbienceVolume(mode, volume) {
  const next = clamp(Math.round(Number(volume) || 0), 0, 45);
  try { localStorage.setItem(ambienceVolumeKey(mode), String(next)); } catch {}
  return next;
}

function ambientLabel(mode) {
  const normalized = normalizeAmbientMode(mode);
  return AMBIENT_MODES.find(([id]) => id === normalized)?.[1] || "Ambience";
}

function animateScalar({ from, to, duration, onFrame }) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  if (!safeDuration) {
    onFrame(to);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const started = performance.now();
    let frame = 0;
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / safeDuration);
      const eased = progress * progress * (3 - 2 * progress);
      onFrame(from + (to - from) * eased);
      if (progress >= 1) return resolve();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.setTimeout(() => {
      if (frame) cancelAnimationFrame(frame);
      onFrame(to);
      resolve();
    }, safeDuration + 120);
  });
}

function makeDeck(sourceUrl) {
  const audio = new Audio(sourceUrl);
  audio.loop = false;
  audio.preload = "auto";
  audio.playsInline = true;
  audio.volume = 0;
  return audio;
}

function createSeamlessAmbience(mode, volume) {
  const normalizedMode = normalizeAmbientMode(mode);
  const sourceUrl = AMBIENCE_TRACKS[normalizedMode];
  if (!sourceUrl) return null;

  const decks = [makeDeck(sourceUrl), makeDeck(sourceUrl)];
  let activeIndex = 0;
  let deckMix = [1, 0];
  let desiredVolume = Number(volume) || 0;
  let roomGain = volumeGain(desiredVolume, AMBIENCE_PLAYBACK_GAIN[normalizedMode] || 0.82);
  let sessionGain = 0;
  let stopped = false;
  let paused = false;
  let looping = false;
  let scheduler = 0;
  let loopToken = 0;

  const applyVolumes = () => {
    const master = clamp(roomGain * sessionGain, 0, 1);
    decks.forEach((deck, index) => {
      try { deck.volume = clamp(master * deckMix[index], 0, 1); } catch {}
    });
  };

  const clearScheduler = () => {
    if (scheduler) window.clearInterval(scheduler);
    scheduler = 0;
  };

  const resetStandby = (index) => {
    try { decks[index].pause(); } catch {}
    try { decks[index].currentTime = 0; } catch {}
  };

  const finishLoopImmediately = async () => {
    if (stopped || paused || looping) return;
    const token = ++loopToken;
    const fromIndex = activeIndex;
    const toIndex = 1 - fromIndex;
    looping = true;
    resetStandby(toIndex);
    deckMix = fromIndex === 0 ? [1, 0] : [0, 1];
    applyVolumes();
    try { await decks[toIndex].play(); } catch { looping = false; return; }
    if (token !== loopToken || stopped || paused) return;
    deckMix = toIndex === 0 ? [1, 0] : [0, 1];
    applyVolumes();
    resetStandby(fromIndex);
    activeIndex = toIndex;
    looping = false;
  };

  const crossfadeLoop = async (durationMs) => {
    if (stopped || paused || looping) return;
    const token = ++loopToken;
    const fromIndex = activeIndex;
    const toIndex = 1 - fromIndex;
    looping = true;
    resetStandby(toIndex);
    try { await decks[toIndex].play(); } catch { looping = false; return; }
    if (token !== loopToken || stopped || paused) return;

    await animateScalar({
      from: 0,
      to: 1,
      duration: durationMs,
      onFrame: (progress) => {
        if (token !== loopToken || stopped || paused) return;
        // Constant-sum crossfade prevents the overlap from becoming louder than the source.
        deckMix[fromIndex] = 1 - progress;
        deckMix[toIndex] = progress;
        applyVolumes();
      },
    });

    if (token !== loopToken || stopped || paused) return;
    resetStandby(fromIndex);
    deckMix[fromIndex] = 0;
    deckMix[toIndex] = 1;
    activeIndex = toIndex;
    looping = false;
    applyVolumes();
  };

  const checkLoop = () => {
    if (stopped || paused || looping) return;
    const deck = decks[activeIndex];
    const duration = Number(deck.duration || 0);
    const currentTime = Number(deck.currentTime || 0);
    if (!Number.isFinite(duration) || duration <= 1 || currentTime <= 0) return;
    const overlapSeconds = Math.min(LOOP_CROSSFADE_MS / 1000, Math.max(0.28, duration * 0.08));
    const remaining = duration - currentTime;
    if (remaining <= overlapSeconds + 0.11) void crossfadeLoop(overlapSeconds * 1000);
  };

  decks.forEach((deck, index) => {
    deck.addEventListener("ended", () => {
      if (!stopped && !paused && index === activeIndex && !looping) void finishLoopImmediately();
    });
  });

  const startScheduler = () => {
    clearScheduler();
    scheduler = window.setInterval(checkLoop, 90);
  };

  const start = async () => {
    if (stopped) return false;
    try {
      await decks[activeIndex].play();
      startScheduler();
      return true;
    } catch {
      return false;
    }
  };

  const setVolume = async (nextVolume, fadeMs = 220) => {
    desiredVolume = Number(nextVolume) || 0;
    const nextGain = volumeGain(desiredVolume, AMBIENCE_PLAYBACK_GAIN[normalizedMode] || 0.82);
    const startGain = roomGain;
    await animateScalar({ from: startGain, to: nextGain, duration: fadeMs, onFrame: (value) => { roomGain = value; applyVolumes(); } });
  };

  const fadeSessionTo = async (nextGain, fadeMs = SWITCH_CROSSFADE_MS) => {
    const startGain = sessionGain;
    await animateScalar({ from: startGain, to: clamp(nextGain, 0, 1), duration: fadeMs, onFrame: (value) => { sessionGain = value; applyVolumes(); } });
  };

  const pause = () => {
    if (stopped || paused) return;
    paused = true;
    loopToken += 1;
    looping = false;
    clearScheduler();
    decks.forEach((deck) => { try { deck.pause(); } catch {} });
    const strongerIndex = deckMix[1] > deckMix[0] ? 1 : 0;
    activeIndex = strongerIndex;
    deckMix = strongerIndex === 0 ? [1, 0] : [0, 1];
    resetStandby(1 - strongerIndex);
    applyVolumes();
  };

  const resume = async () => {
    if (stopped) return false;
    paused = false;
    try {
      await decks[activeIndex].play();
      startScheduler();
      applyVolumes();
      return true;
    } catch {
      paused = true;
      return false;
    }
  };

  const stop = async (fadeMs = 180) => {
    if (stopped) return;
    stopped = true;
    loopToken += 1;
    clearScheduler();
    await fadeSessionTo(0, fadeMs);
    decks.forEach((deck) => {
      try { deck.pause(); } catch {}
      try { deck.removeAttribute("src"); deck.load(); } catch {}
    });
  };

  return {
    mode: normalizedMode,
    get paused() { return paused; },
    start,
    setVolume,
    fadeSessionTo,
    pause,
    resume,
    stop,
  };
}

let activeAmbience = null;
let ambienceSwitchToken = 0;

export function pauseActiveAmbience() {
  if (!activeAmbience) return;
  activeAmbience.pause();
  setAmbienceAudioState(false, ambientLabel(activeAmbience.mode), true);
}

export async function resumeActiveAmbience() {
  if (!activeAmbience || isSafeModeEnabled()) return false;
  const resumed = await activeAmbience.resume();
  if (resumed) setAmbienceAudioState(true, ambientLabel(activeAmbience.mode), false);
  return resumed;
}

function stopActiveAmbience(fadeMs = 160) {
  ambienceSwitchToken += 1;
  const current = activeAmbience;
  activeAmbience = null;
  if (current) void current.stop(fadeMs);
  setAmbienceAudioState(false);
}

async function switchAmbience(mode, volume) {
  const normalizedMode = normalizeAmbientMode(mode);
  if (typeof window === "undefined" || normalizedMode === "none" || isSafeModeEnabled()) {
    stopActiveAmbience();
    return;
  }

  if (activeAmbience?.mode === normalizedMode) {
    await activeAmbience.setVolume(volume, 180);
    if (activeAmbience.paused) await resumeActiveAmbience();
    else setAmbienceAudioState(true, ambientLabel(normalizedMode), false);
    return;
  }

  const token = ++ambienceSwitchToken;
  const previous = activeAmbience;
  const next = createSeamlessAmbience(normalizedMode, volume);
  if (!next) return;
  activeAmbience = next;

  const started = await next.start();
  if (!started || token !== ambienceSwitchToken || isSafeModeEnabled()) {
    if (activeAmbience === next) activeAmbience = previous || null;
    await next.stop(0);
    return;
  }

  setAmbienceAudioState(true, ambientLabel(normalizedMode), false);
  // True room crossfade: old ambience fades down while the new one fades in.
  await Promise.all([
    next.fadeSessionTo(1, SWITCH_CROSSFADE_MS),
    previous?.fadeSessionTo(0, SWITCH_CROSSFADE_MS),
  ]);
  if (previous) await previous.stop(0);
}

registerAudioStopper("ambience", () => stopActiveAmbience(100));

export default function StoryAmbience({ mode = "none", volume = 18, soundOn = false }) {
  const normalizedMode = normalizeAmbientMode(mode);
  const latestRef = useRef({ mode: normalizedMode, volume, soundOn });
  const visibilityPausedRef = useRef(false);
  latestRef.current = { mode: normalizedMode, volume, soundOn };

  useEffect(() => {
    if (normalizedMode === "none" || isSafeModeEnabled()) {
      stopActiveAmbience(150);
      return;
    }
    if (!soundOn) {
      pauseActiveAmbience();
      return;
    }
    if (document.visibilityState === "hidden") return;
    void switchAmbience(normalizedMode, volume);
  }, [normalizedMode, volume, soundOn]);

  useEffect(() => {
    const onVisibility = () => {
      const latest = latestRef.current;
      if (document.visibilityState === "hidden") {
        if (latest.soundOn && activeAmbience) {
          visibilityPausedRef.current = true;
          pauseActiveAmbience();
        }
        return;
      }
      if (!visibilityPausedRef.current) return;
      visibilityPausedRef.current = false;
      if (latest.soundOn && latest.mode !== "none" && !isSafeModeEnabled()) void switchAmbience(latest.mode, latest.volume);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopActiveAmbience(100);
    };
  }, []);

  if (normalizedMode === "none") return null;
  return <div className={`story-ambience story-ambience--${normalizedMode}`} aria-hidden="true" />;
}
