import { useEffect, useRef } from "react";
import { registerAudioStopper, setAmbienceAudioState } from "../utils/audioBus";
import { isSafeModeEnabled } from "../utils/safeMode";

export const AMBIENT_MODES = [
  ["none", "None"],
  ["rain", "Rain"],
  ["night_city", "Night city"],
  ["street_racing", "Street racing"],
  ["cafe", "Café"],
  ["campus", "Campus"],
  ["fireplace", "Fireplace"],
  ["home", "Home · TV"],
  ["party", "Party"],
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const volumeGain = (volume, multiplier = 1) => clamp(Number(volume || 0) / 100, 0, 1) * multiplier;

function buildNoiseBuffer(context, seconds = 4, color = "white") {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  let pink0 = 0;
  let pink1 = 0;
  let pink2 = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (color === "brown") {
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = brown * 3.3;
    } else if (color === "pink") {
      pink0 = 0.99765 * pink0 + white * 0.099046;
      pink1 = 0.963 * pink1 + white * 0.2965164;
      pink2 = 0.57 * pink2 + white * 1.0526913;
      data[i] = (pink0 + pink1 + pink2 + white * 0.1848) * 0.14;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

function addLoopedNoise(context, destination, {
  color = "white",
  seconds = 4,
  gain = 0.05,
  filterType = "bandpass",
  frequency = 900,
  q = 0.7,
} = {}) {
  const source = context.createBufferSource();
  source.buffer = buildNoiseBuffer(context, seconds, color);
  source.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = q;

  const level = context.createGain();
  level.gain.value = gain;

  source.connect(filter);
  filter.connect(level);
  level.connect(destination);
  source.start();

  return () => {
    try { source.stop(); } catch {}
    try { source.disconnect(); filter.disconnect(); level.disconnect(); } catch {}
  };
}

function pulseTone(context, destination, {
  frequency = 440,
  endFrequency = null,
  type = "sine",
  gain = 0.02,
  duration = 0.12,
  attack = 0.01,
  when = context.currentTime,
} = {}) {
  const osc = context.createOscillator();
  const level = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), when + duration);
  level.gain.setValueAtTime(0.0001, when);
  level.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + attack);
  level.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(level);
  level.connect(destination);
  osc.start(when);
  osc.stop(when + duration + 0.03);
}

function noisePop(context, destination, {
  gain = 0.02,
  duration = 0.05,
  frequency = 1700,
  q = 0.8,
} = {}) {
  const source = context.createBufferSource();
  source.buffer = buildNoiseBuffer(context, Math.max(0.08, duration * 2), "white");
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const level = context.createGain();
  const now = context.currentTime;
  level.gain.setValueAtTime(Math.max(0.0002, gain), now);
  level.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(level);
  level.connect(destination);
  source.start(now);
  source.stop(now + duration + 0.03);
}

function every(ms, callback) {
  const id = window.setInterval(callback, ms);
  return () => window.clearInterval(id);
}

function startRain(context, master, base) {
  const stops = [
    addLoopedNoise(context, master, { color: "white", seconds: 5, gain: base * 0.45, filterType: "highpass", frequency: 1100, q: 0.25 }),
    addLoopedNoise(context, master, { color: "pink", seconds: 7, gain: base * 0.28, filterType: "bandpass", frequency: 2400, q: 0.35 }),
    every(1150, () => {
      if (Math.random() > 0.42) noisePop(context, master, { gain: base * 0.12, duration: 0.035, frequency: 2600 + Math.random() * 1800 });
    }),
  ];
  return () => stops.forEach((stop) => stop());
}

function startNightCity(context, master, base) {
  const stops = [
    // Night City should feel like a room with a window cracked open: distant road wash,
    // HVAC-low city hum and rare soft pass-bys. No synth revs, alarms or tire squeals.
    addLoopedNoise(context, master, { color: "brown", seconds: 11, gain: base * 0.085, filterType: "lowpass", frequency: 230, q: 0.25 }),
    addLoopedNoise(context, master, { color: "pink", seconds: 13, gain: base * 0.035, filterType: "bandpass", frequency: 1050, q: 0.45 }),
  ];
  stops.push(every(7200, () => {
    if (context.state === "closed" || Math.random() < 0.38) return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = buildNoiseBuffer(context, 2.8, "brown");
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.linearRampToValueAtTime(520 + Math.random() * 160, now + 1.3);
    filter.frequency.linearRampToValueAtTime(220, now + 2.65);
    filter.Q.value = 0.55;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, base * 0.055), now + 0.75);
    gain.gain.linearRampToValueAtTime(0.0001, now + 2.65);
    const panner = typeof context.createStereoPanner === "function" ? context.createStereoPanner() : null;
    source.connect(filter); filter.connect(gain);
    if (panner) { gain.connect(panner); panner.connect(master); panner.pan.setValueAtTime(Math.random() > .5 ? -.8 : .8, now); panner.pan.linearRampToValueAtTime(Math.random() > .5 ? .75 : -.75, now + 2.6); }
    else gain.connect(master);
    source.start(now); source.stop(now + 2.75);
  }));
  return () => stops.forEach((stop) => stop());
}

function startStreetRacing(context, master, base) {
  const stops = [
    // Street Racing stays distant and cinematic. Filtered road/engine texture does the work;
    // the old saw/square synth rev and tire-squeal loop was intentionally removed.
    addLoopedNoise(context, master, { color: "brown", seconds: 9, gain: base * 0.075, filterType: "lowpass", frequency: 180, q: 0.3 }),
    addLoopedNoise(context, master, { color: "pink", seconds: 12, gain: base * 0.024, filterType: "highpass", frequency: 1450, q: 0.2 }),
  ];
  stops.push(every(5200, () => {
    if (context.state === "closed" || Math.random() < 0.22) return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = buildNoiseBuffer(context, 3.4, "brown");
    const body = context.createBiquadFilter();
    body.type = "bandpass"; body.Q.value = 0.8;
    body.frequency.setValueAtTime(150 + Math.random() * 35, now);
    body.frequency.exponentialRampToValueAtTime(430 + Math.random() * 180, now + 1.25);
    body.frequency.exponentialRampToValueAtTime(125 + Math.random() * 25, now + 3.05);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, base * 0.095), now + 1.0);
    gain.gain.linearRampToValueAtTime(0.0001, now + 3.15);
    const panner = typeof context.createStereoPanner === "function" ? context.createStereoPanner() : null;
    source.connect(body); body.connect(gain);
    if (panner) { gain.connect(panner); panner.connect(master); const from = Math.random() > .5 ? -.95 : .95; panner.pan.setValueAtTime(from, now); panner.pan.linearRampToValueAtTime(-from, now + 3.1); }
    else gain.connect(master);
    source.start(now); source.stop(now + 3.25);
  }));
  return () => stops.forEach((stop) => stop());
}

function startCafe(context, master, base) {
  const stops = [
    // Café is deliberately intimate and mid-range: soft room chatter, ceramic clinks and espresso steam.
    addLoopedNoise(context, master, { color: "pink", seconds: 8, gain: base * 0.22, filterType: "bandpass", frequency: 720, q: 1.15 }),
    addLoopedNoise(context, master, { color: "brown", seconds: 10, gain: base * 0.055, filterType: "lowpass", frequency: 135, q: 0.25 }),
    every(4200, () => {
      if (Math.random() > 0.22) {
        const f = 2850 + Math.random() * 1500;
        pulseTone(context, master, { frequency: f, type: "sine", gain: base * 0.105, duration: 0.055, attack: 0.004 });
        pulseTone(context, master, { frequency: f * 1.42, type: "sine", gain: base * 0.04, duration: 0.04, attack: 0.003, when: context.currentTime + 0.022 });
      }
    }),
    every(9100, () => {
      if (Math.random() > 0.3) {
        const steam = context.createBufferSource();
        steam.buffer = buildNoiseBuffer(context, 1.7, "white");
        const filter = context.createBiquadFilter();
        filter.type = "highpass"; filter.frequency.value = 3100; filter.Q.value = 0.35;
        const gain = context.createGain();
        const now = context.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, base * 0.07), now + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
        steam.connect(filter); filter.connect(gain); gain.connect(master);
        steam.start(now); steam.stop(now + 1.35);
      }
    }),
  ];
  return () => stops.forEach((stop) => stop());
}

function startCampus(context, master, base) {
  const stops = [
    // Outdoor air is bright and sparse, with bird/bell cues that separate it from Café.
    addLoopedNoise(context, master, { color: "pink", seconds: 9, gain: base * 0.19, filterType: "highpass", frequency: 720, q: 0.25 }),
    every(4300, () => {
      if (Math.random() > 0.25) {
        const start = 1450 + Math.random() * 800;
        pulseTone(context, master, { frequency: start, endFrequency: start * 1.75, type: "sine", gain: base * 0.08, duration: 0.16, attack: 0.018 });
        pulseTone(context, master, { frequency: start * 1.22, endFrequency: start * 1.88, type: "sine", gain: base * 0.055, duration: 0.13, attack: 0.015, when: context.currentTime + 0.19 });
      }
    }),
    every(13500, () => {
      if (Math.random() > 0.28) {
        pulseTone(context, master, { frequency: 740, type: "sine", gain: base * 0.075, duration: 0.85, attack: 0.05 });
        pulseTone(context, master, { frequency: 1110, type: "sine", gain: base * 0.04, duration: 0.72, attack: 0.06, when: context.currentTime + 0.04 });
      }
    }),
  ];
  return () => stops.forEach((stop) => stop());
}

function startFireplace(context, master, base) {
  const stops = [
    // Fire gets a dark rumble plus irregular crackles rather than the generic ambience bed.
    addLoopedNoise(context, master, { color: "brown", seconds: 3, gain: base * 0.26, filterType: "lowpass", frequency: 420, q: 0.45 }),
    addLoopedNoise(context, master, { color: "pink", seconds: 2, gain: base * 0.08, filterType: "bandpass", frequency: 1450, q: 0.8 }),
    every(210, () => {
      if (Math.random() > 0.56) noisePop(context, master, {
        gain: base * (0.055 + Math.random() * 0.11),
        duration: 0.018 + Math.random() * 0.055,
        frequency: 950 + Math.random() * 2500,
        q: 0.6 + Math.random() * 1.2,
      });
    }),
    every(1700, () => {
      if (Math.random() > 0.46) pulseTone(context, master, { frequency: 72 + Math.random() * 40, type: "triangle", gain: base * 0.09, duration: 0.17, attack: 0.01 });
    }),
  ];
  return () => stops.forEach((stop) => stop());
}

function startHome(context, master, base) {
  const stops = [];
  // Audible distant TV: speech-like formants that drift between "people talking" and quiet room tone.
  stops.push(addLoopedNoise(context, master, { color: "brown", seconds: 9, gain: base * 0.10, filterType: "lowpass", frequency: 150, q: 0.25 }));
  const tvBed = context.createBufferSource();
  tvBed.buffer = buildNoiseBuffer(context, 8, "pink");
  tvBed.loop = true;
  const formantA = context.createBiquadFilter();
  const formantB = context.createBiquadFilter();
  formantA.type = "bandpass"; formantA.frequency.value = 690; formantA.Q.value = 1.6;
  formantB.type = "bandpass"; formantB.frequency.value = 1450; formantB.Q.value = 2.1;
  const gainA = context.createGain(); const gainB = context.createGain();
  gainA.gain.value = base * 0.24; gainB.gain.value = base * 0.11;
  tvBed.connect(formantA); tvBed.connect(formantB);
  formantA.connect(gainA); formantB.connect(gainB);
  gainA.connect(master); gainB.connect(master);
  tvBed.start();
  stops.push(() => { try { tvBed.stop(); } catch {} try { tvBed.disconnect(); formantA.disconnect(); formantB.disconnect(); gainA.disconnect(); gainB.disconnect(); } catch {} });
  stops.push(every(690, () => {
    if (context.state === "closed") return;
    const now = context.currentTime;
    const a = 560 + Math.random() * 420;
    const b = 1150 + Math.random() * 900;
    try {
      formantA.frequency.linearRampToValueAtTime(a, now + 0.42);
      formantB.frequency.linearRampToValueAtTime(b, now + 0.48);
      gainA.gain.linearRampToValueAtTime(base * (0.12 + Math.random() * 0.23), now + 0.35);
      gainB.gain.linearRampToValueAtTime(base * (0.05 + Math.random() * 0.12), now + 0.4);
    } catch {}
  }));
  stops.push(every(12500, () => {
    if (Math.random() > 0.35) {
      pulseTone(context, master, { frequency: 520, endFrequency: 760, type: "triangle", gain: base * 0.045, duration: 0.22, attack: 0.03 });
      pulseTone(context, master, { frequency: 1040, endFrequency: 1320, type: "sine", gain: base * 0.022, duration: 0.18, attack: 0.02, when: context.currentTime + 0.08 });
    }
  }));
  return () => stops.forEach((stop) => stop());
}

function startParty(context, master, base) {
  const stops = [
    // Party is intentionally obvious: dense room chatter plus a real four-on-the-floor pulse.
    addLoopedNoise(context, master, { color: "pink", seconds: 8, gain: base * 0.27, filterType: "bandpass", frequency: 760, q: 0.9 }),
    addLoopedNoise(context, master, { color: "brown", seconds: 5, gain: base * 0.10, filterType: "lowpass", frequency: 130, q: 0.4 }),
  ];
  let beat = 0;
  stops.push(every(510, () => {
    if (context.state === "closed") return;
    const now = context.currentTime;
    const kick = context.createOscillator();
    const kickGain = context.createGain();
    kick.type = "sine";
    kick.frequency.setValueAtTime(125, now);
    kick.frequency.exponentialRampToValueAtTime(44, now + 0.18);
    kickGain.gain.setValueAtTime(Math.max(0.0002, base * 0.25), now);
    kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    kick.connect(kickGain); kickGain.connect(master);
    kick.start(now); kick.stop(now + 0.24);
    if (beat % 2 === 1) noisePop(context, master, { gain: base * 0.085, duration: 0.04, frequency: 6600, q: 0.5 });
    if (beat % 4 === 2) noisePop(context, master, { gain: base * 0.07, duration: 0.09, frequency: 1900, q: 1.1 });
    if (beat % 8 === 7) pulseTone(context, master, { frequency: 220, endFrequency: 330, type: "sawtooth", gain: base * 0.055, duration: 0.18, attack: 0.01 });
    beat = (beat + 1) % 8;
  }));
  stops.push(every(6400, () => {
    if (Math.random() > 0.35) pulseTone(context, master, { frequency: 880 + Math.random() * 240, endFrequency: 660, type: "triangle", gain: base * 0.035, duration: 0.34, attack: 0.04 });
  }));
  return () => stops.forEach((stop) => stop());
}

function ambientLabel(mode) {
  return AMBIENT_MODES.find(([id]) => id === mode)?.[1] || "Ambience";
}

function startAmbience(context, mode, volume) {
  const master = context.createGain();
  const now = context.currentTime;
  master.gain.setValueAtTime(0.0001, now);
  master.connect(context.destination);
  const starters = { rain: startRain, night_city: startNightCity, street_racing: startStreetRacing, cafe: startCafe, campus: startCampus, fireplace: startFireplace, home: startHome, party: startParty };
  const stopMode = (starters[mode] || startRain)(context, master, 1);
  const setVolume = (nextVolume, fadeMs = 260) => {
    const target = Math.max(0.0001, volumeGain(nextVolume, 0.92));
    const at = context.currentTime;
    try {
      master.gain.cancelScheduledValues(at);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), at);
      master.gain.linearRampToValueAtTime(target, at + Math.max(0.04, fadeMs / 1000));
    } catch { master.gain.value = target; }
  };
  const stop = (fadeMs = 420) => new Promise((resolve) => {
    const at = context.currentTime;
    try {
      master.gain.cancelScheduledValues(at);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), at);
      master.gain.linearRampToValueAtTime(0.0001, at + Math.max(0.04, fadeMs / 1000));
    } catch {}
    window.setTimeout(() => {
      try { stopMode?.(); } catch {}
      try { master.disconnect(); } catch {}
      try { context.close(); } catch {}
      resolve();
    }, Math.max(60, fadeMs + 40));
  });
  setVolume(volume, 520);
  return { context, master, mode, setVolume, stop };
}

let activeAmbience = null;
function stopActiveAmbience(fadeMs = 240) {
  const current = activeAmbience;
  activeAmbience = null;
  if (current) void current.stop(fadeMs);
  setAmbienceAudioState(false);
}
async function switchAmbience(mode, volume) {
  if (typeof window === "undefined" || !mode || mode === "none" || isSafeModeEnabled()) { stopActiveAmbience(); return; }
  if (activeAmbience?.mode === mode && activeAmbience.context?.state !== "closed") { activeAmbience.setVolume(volume, 220); setAmbienceAudioState(true, ambientLabel(mode)); return; }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;
  const previous = activeAmbience;
  const context = new AudioContextCtor();
  try { await context.resume(); } catch {}
  const next = startAmbience(context, mode, volume);
  activeAmbience = next;
  setAmbienceAudioState(true, ambientLabel(mode));
  if (previous) void previous.stop(620);
}
registerAudioStopper("ambience", () => stopActiveAmbience(160));

export default function StoryAmbience({ mode = "none", volume = 18, soundOn = false }) {
  const latestRef = useRef({ mode, volume, soundOn });
  latestRef.current = { mode, volume, soundOn };
  useEffect(() => {
    if (!soundOn || mode === "none" || isSafeModeEnabled() || document.visibilityState === "hidden") { stopActiveAmbience(260); return; }
    void switchAmbience(mode, volume);
  }, [mode, volume, soundOn]);
  useEffect(() => {
    const onVisibility = () => {
      const latest = latestRef.current;
      if (document.visibilityState === "hidden") stopActiveAmbience(120);
      else if (latest.soundOn && latest.mode !== "none" && !isSafeModeEnabled()) void switchAmbience(latest.mode, latest.volume);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); stopActiveAmbience(180); };
  }, []);
  if (mode === "none") return null;
  return <div className={`story-ambience story-ambience--${mode}`} aria-hidden="true" />;
}
