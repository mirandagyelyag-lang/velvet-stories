import { existsSync, readFileSync, statSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const ambience = read("src/components/StoryAmbience.jsx");
const hub = read("src/components/StoryHubDrawer.jsx");
const chat = read("src/pages/Chat.jsx");
const audioBus = read("src/utils/audioBus.js");
const intelligence = read("src/utils/ambienceIntelligence.js");
const quality = read("src/utils/ambienceQuality.js");
const diagnostics = read("src/pages/Diagnostics.jsx");
const styles = read("src/styles/velvet-v2616-audio-center.css");
const vite = read("vite.config.js");
const pkg = JSON.parse(read("package.json"));

const expected = {
  rain: "rain-reference-gentle.mp3",
  night_city: "night-city-reference.mp3",
  street_racing: "street-racing-reference.mp3",
  cafe: "cafe-reference-warm.mp3",
  campus: "campus-reference.mp3",
  fireplace: "fireplace-reference-warm.mp3",
  home: "home-tv-reference-distant.mp3",
  party: "party-reference-next-room.mp3",
};

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("Living Scenes keeps the Audio Center 2.0 ambience contract", pkg.version === "2.11.15");
check("all eight ambience modes are visible", Object.keys(expected).every((id) => ambience.includes(`["${id}",`)));
check("Night and Street Racing remain separate modes", ambience.includes('["night_city", "Night"]') && ambience.includes('["street_racing", "Street racing"]'));
check("all eight modes map to bundled tracks", Object.entries(expected).every(([id, file]) => ambience.includes(`${id}: "/audio/ambience/${file}"`)));
check("all eight bundled tracks exist", Object.values(expected).every((file) => existsSync(`public/audio/ambience/${file}`)));
check("all eight tracks are present and nonempty", Object.values(expected).every((file) => statSync(`public/audio/ambience/${file}`).size > 20_000));
check("ambience playback never synthesizes noise", !ambience.includes("buildNoiseBuffer") && !ambience.includes("addLoopedNoise") && !ambience.includes("createOscillator") && !ambience.includes("createBufferSource"));
check("seamless loop uses two HTMLAudio decks", ambience.includes("const decks = [makeDeck(sourceUrl), makeDeck(sourceUrl)]") && ambience.includes("audio.loop = false"));
check("loop overlap is constant-sum to avoid volume jumps", ambience.includes("deckMix[fromIndex] = 1 - progress") && ambience.includes("deckMix[toIndex] = progress") && ambience.includes("LOOP_CROSSFADE_MS"));
check("ended event has a no-gap fallback", ambience.includes('addEventListener("ended"') && ambience.includes("finishLoopImmediately"));
check("room changes crossfade simultaneously", ambience.includes("Promise.all([") && ambience.includes("next.fadeSessionTo(1") && ambience.includes("previous?.fadeSessionTo(0"));
check("pause and resume preserve the active room", ambience.includes("pauseActiveAmbience") && ambience.includes("resumeActiveAmbience") && audioBus.includes("ambiencePaused"));
check("backgrounding pauses ambience instead of double-starting it", ambience.includes("visibilityPausedRef") && !audioBus.includes('document.visibilityState === "hidden"'));
check("each room remembers a separate local volume", ambience.includes("velvet_ambience_volume_") && hub.includes("readAmbienceVolume") && hub.includes("writeAmbienceVolume"));
check("scene suggestions are local and opt-in", intelligence.includes("suggestAmbienceForScene") && hub.includes("SUGGESTED FOR THIS SCENE") && chat.includes("recentSceneText") && !intelligence.includes("fetch("));
check("quality audit checks silence clipping and loop edges", quality.includes("quiet start") && quality.includes("possible clipping") && quality.includes("loop edge mismatch") && diagnostics.includes("Ambience quality check"));
check("Audio Center 2.0 is mobile-safe", styles.includes("audio-center__transport") && styles.includes("@media(max-width:760px)") && styles.includes("min-height:44px"));
check("PWA precaches MP3 ambience", vite.includes("woff2,mp3"));
check("legacy combined mode safely aliases to Night", ambience.includes('night_city_racing: "night_city"'));

let failed = 0;
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"}  ${item.name}`);
  if (!item.pass) failed += 1;
}
if (failed) {
  console.error(`\n${failed} ambience checks failed.`);
  process.exit(1);
}
console.log(`\n${checks.length} ambience checks passed.`);
