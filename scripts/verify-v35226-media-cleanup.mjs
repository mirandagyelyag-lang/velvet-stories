import { existsSync, readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const chat = read("src/pages/Chat.jsx");
const hub = read("src/components/StoryHubDrawer.jsx");
const diagnostics = read("src/pages/Diagnostics.jsx");
const main = read("src/main.jsx");
const vite = read("vite.config.js");
const characters = read("src/context/CharactersContext.jsx");

check("bundled audio directory removed", !existsSync("public/audio"));
check("audio runtime modules removed", ["src/utils/audioBus.js","src/utils/speech.js","src/components/StoryAmbience.jsx","src/components/AudioStatusPill.jsx"].every((file)=>!existsSync(file)));
check("audio center stylesheet removed", !existsSync("src/styles/velvet-v2616-audio-center.css") && !main.includes("audio-center"));
check("chat has no listen or ambience runtime", !chat.includes('runAction("listen")') && !chat.includes("StoryAmbience") && !chat.includes("AudioStatusPill") && !chat.includes("suggestAmbienceForScene"));
check("story hub has no audio controls", !hub.includes("Audio Center") && !hub.includes("Text to speech") && !hub.includes("Ambient story mode"));
check("diagnostics no longer audits audio", !diagnostics.includes("Audio engine") && !diagnostics.includes("Ambience quality check") && !diagnostics.includes("auditAmbienceTracks"));
check("PWA precache no longer includes mp3", !vite.includes("woff2,mp3"));
check("dead TTS character preferences removed", !characters.includes("ttsVoiceName") && !characters.includes("updateCharacterVoice") && !characters.includes("tts_voice_name"));
check("Story Hub has no ambience controls or dead runtime identifiers", !hub.includes("AMBIENT_MODES") && !hub.includes("ambienceSuggestion") && !hub.includes("currentAmbientMode") && !hub.includes("ambientSoundOn") && !hub.includes("chooseAmbientMode") && !hub.includes("changeAmbientVolume"));

for (const item of checks) console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
const failed = checks.filter((item)=>!item.pass);
if (failed.length) { console.error(`\n${failed.length}/${checks.length} checks failed.`); process.exit(1); }
console.log(`\n${checks.length}/${checks.length} checks passed.`);
