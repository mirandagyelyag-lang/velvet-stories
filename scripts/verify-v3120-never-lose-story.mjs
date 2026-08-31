import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chat = read("src/pages/Chat.jsx");
const chats = read("src/context/ChatsContext.jsx");
const memories = read("src/pages/Memories.jsx");
const discover = read("src/pages/MyCharacters.jsx");
const pulse = read("src/pages/Pulse.jsx");
const diagnostics = read("src/pages/Diagnostics.jsx");
const details = read("src/pages/CharacterDetail.jsx");
const settings = read("src/pages/Settings.jsx");
const resilience = read("src/utils/velvetResilience.js");
const pwa = read("src/context/PWAContext.jsx");
const vite = read("vite.config.js");
const edge = read("supabase/functions/character-chat/index.ts");
const css = read("src/styles/velvet-v3120-never-lose-story.css");
const main = read("src/main.jsx");
const galleryMigration = read("supabase/migrations/202608310001_velvet_v312_character_gallery.sql");

const checks = [];
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) });

check("1 Chat 2.0 keeps mobile controls compact", css.includes("v312-composer-state") && css.includes(".chat__composer") && chat.includes("v312-composer-state"));
check("2 resilient generation retries transient failures", chats.includes("isRetryableNetworkError") && chats.includes("isRetryableStatus") && chats.includes("recordGenerationMetric"));
check("3 offline queue persists and flushes", chats.includes("offlineQueueRef") && chats.includes("velvet:offline-queue") && chats.includes("isOfflinePending") && chats.includes("flushOfflineQueue"));
check("4 drafts persist per conversation", chat.includes("velvet_draft_${id}") && chat.includes("Draft saved"));
check("5 regenerated replies keep version history", chat.includes("getMessageAlternatives") && chat.includes("responseVersions") && chat.includes("navigateResponseVersion"));
check("6 opening scenes are short and conversational", edge.includes("opening scene, 55-105 words") && edge.includes("OPENING NATURALISM") && edge.includes("first spoken line must sound normal"));
check("7 group stories expose scene cast actions", chat.includes("groupPeekCharacter") && chat.includes("CURRENTLY OFF SCENE") && chat.includes("Relationship") && chat.includes("Memories"));
check("8 Memories can clean duplicate clusters", memories.includes("globalDuplicateClusters") && memories.includes("cleanAllDuplicates") && memories.includes("Memory cleanup"));
check("9 Discover and Pulse use personal story nudges", discover.includes("is still where you left them") && pulse.includes("shelfNudge") && pulse.includes("left something unfinished"));
check("10 Diagnostics shows hosting and live performance", diagnostics.includes("Real response speed") && diagnostics.includes("Hosting / Vercel") && diagnostics.includes("summarizeGenerationMetrics"));
check("11 first-token and total reply metrics are recorded", resilience.includes("recordGenerationMetric") && resilience.includes("firstTokenMs") && chats.includes("diagnosticFirstTokenMs"));
check("12 PWA updates are user-controlled prompts", vite.includes('registerType: "prompt"') && vite.includes("skipWaiting: false") && pwa.includes("needRefresh") && pwa.includes("updateApp"));
check("13 characters have a private cross-device media gallery", details.includes("galleryItems") && details.includes("uploadGalleryMedia") && details.includes('from("character-gallery")') && details.includes("createSignedUrl") && galleryMigration.includes("Users can read their character gallery") && galleryMigration.includes("Users can list legacy character gallery") && details.includes("Add photos"));
check("14 each story can keep an atmosphere palette", resilience.includes("STORY_THEMES") && resilience.includes("saveStoryTheme") && chat.includes("Story palette") && css.includes("chat--story-night"));
check("15 Never Lose a Story backup exports and restores", settings.includes("exportVelvetBackup") && settings.includes("restoreVelvetBackup") && settings.includes("velvet-full-backup") && settings.includes("Never Lose a Story"));
check("v3.12 features remain loaded before the v3.13 scroll authority", main.includes('import "./styles/velvet-v3120-never-lose-story.css";') && main.trim().endsWith('import "./styles/velvet-v3130-scroll-authority.css";'));
check("v3.12 feature set survives the v3.13 release", /"version": "3\.1[3-9]\.|"version": "[4-9]\./.test(read("package.json")) && vite.includes('Never Lose a Story'));

for (const result of checks) console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}`);
const failed = checks.filter((result) => !result.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} Velvet v3.12 Never Lose a Story checks passed.`);
if (failed.length) process.exit(1);
