import { AMBIENCE_TRACKS } from "../components/StoryAmbience";

const rms = (samples, start, end) => {
  let sum = 0;
  let count = 0;
  for (let i = Math.max(0, start); i < Math.min(samples.length, end); i += 1) {
    const value = samples[i] || 0;
    sum += value * value;
    count += 1;
  }
  return count ? Math.sqrt(sum / count) : 0;
};

function analyzeBuffer(mode, buffer) {
  const channel = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate || 44100;
  const edgeSamples = Math.min(channel.length, Math.max(1, Math.round(sampleRate * 0.18)));
  const startRms = rms(channel, 0, edgeSamples);
  const endRms = rms(channel, channel.length - edgeSamples, channel.length);
  const middleStart = Math.max(0, Math.round(channel.length * 0.25));
  const middleEnd = Math.min(channel.length, Math.round(channel.length * 0.75));
  const middleRms = rms(channel, middleStart, middleEnd) || 0.000001;

  let peak = 0;
  const step = Math.max(1, Math.floor(channel.length / 180000));
  for (let i = 0; i < channel.length; i += step) peak = Math.max(peak, Math.abs(channel[i] || 0));

  const startRatio = startRms / middleRms;
  const endRatio = endRms / middleRms;
  const edgeMismatch = Math.abs(startRms - endRms) / middleRms;
  const issues = [];
  if (startRatio < 0.12) issues.push("quiet start");
  if (endRatio < 0.12) issues.push("quiet ending");
  if (edgeMismatch > 0.85) issues.push("loop edge mismatch");
  if (peak >= 0.995) issues.push("possible clipping");

  return {
    mode,
    duration: Number(buffer.duration || 0),
    peak,
    startRatio,
    endRatio,
    edgeMismatch,
    ok: issues.length === 0,
    issues,
  };
}

export async function auditAmbienceTracks() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Audio analysis is unavailable on this device.");
  const context = new AudioContextClass();
  try {
    const results = [];
    for (const [mode, url] of Object.entries(AMBIENCE_TRACKS)) {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`${mode}: audio file could not be loaded.`);
      const bytes = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(bytes.slice(0));
      results.push(analyzeBuffer(mode, buffer));
    }
    return results;
  } finally {
    try { await context.close(); } catch {}
  }
}
