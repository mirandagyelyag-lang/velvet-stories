import { existsSync, readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const main = read("src/main.jsx");
const app = read("src/App.jsx");
const chat = read("src/pages/Chat.jsx");
const mobile = read("src/styles/velvet-mobile-foundation.css");
const settings = read("src/pages/Settings.jsx");
const memories = read("src/pages/Memories.jsx");
const diagnostics = read("src/pages/Diagnostics.jsx");
const characterModal = read("src/components/CreateCharacterModal.jsx");
const edge = read("supabase/functions/character-chat/index.ts");
const pkg = JSON.parse(read("package.json"));

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("v2 mobile foundation is the final stylesheet", main.trim().includes('import "./styles/velvet-mobile-foundation.css";') && main.lastIndexOf("velvet-mobile-foundation.css") > main.lastIndexOf("velvet-v18.css"));
check("legacy mobile hotfix styles are no longer loaded", ["mobile-v71.css","velvet-v171-hotfix.css","velvet-v172-mobile-emergency.css","velvet-v181-guarded-swipe.css","velvet-v19-phone-first.css","velvet-v191-composer-hotfix.css","velvet-v192-message-sheet-portal.css","velvet-v193-mobile-geometry.css"].every((name)=>!main.includes(name)));
check("legacy mobile hotfix files were removed", ["mobile-v71.css","velvet-v171-hotfix.css","velvet-v172-mobile-emergency.css","velvet-v181-guarded-swipe.css","velvet-v19-phone-first.css","velvet-v191-composer-hotfix.css","velvet-v192-message-sheet-portal.css","velvet-v193-mobile-geometry.css"].every((name)=>!existsSync(`src/styles/${name}`)));
check("release is v2 startup recovery", pkg.version === "2.0.2" && read("src/config/version.js").includes('VELVET_RELEASE = "Startup Recovery"'));
check("startup recovery boundary wraps the provider tree", read("src/main.jsx").includes("<VelvetErrorBoundary>") && read("src/components/VelvetErrorBoundary.jsx").includes("Repair & reopen Velvet"));
check("boot watchdog can recover before React mounts", read("index.html").includes("__VELVET_REPAIR_APP__") && read("index.html").includes("velvet_boot_repaired_v202"));
check("recovery clears service worker caches without deleting local storage", read("src/utils/runtimeRecovery.js").includes("getRegistrations") && read("src/utils/runtimeRecovery.js").includes("caches.keys") && !read("src/utils/runtimeRecovery.js").includes("localStorage.clear"));
check("Vercel revalidates app shell and service worker", read("vercel.json").includes("/index.html") && read("vercel.json").includes("/sw.js") && read("vercel.json").includes("no-cache, no-store"));

check("mobile navigation has exactly three destinations", (read("src/components/Sidebar.jsx").match(/id: "(?:chats|characters|profile)"/g)||[]).length===3 && mobile.includes("repeat(3,minmax(0,1fr))"));
check("mobile page controls are at least 44px", mobile.includes("button{min-height:44px}"));
check("mobile forms use sixteen pixel fields", mobile.includes("button,input,textarea,select{font-size:16px!important}"));
check("chat uses native document scrolling", mobile.includes("overflow-y:auto!important") && mobile.includes("touch-action:pan-y pinch-zoom!important") && mobile.includes(".app--chat .chat{display:block!important"));
check("chat content never becomes a nested scroller", mobile.includes(".chat__content,.chat__content--wallpaper") && mobile.includes("overflow:visible!important"));
check("mobile exit is portaled to body", chat.includes('createPortal((\n        <button type="button" className="chat__mobile-exit"') && mobile.includes("body>.chat__mobile-exit"));
check("mobile exit survives reading mode", mobile.includes("body>.chat__mobile-exit{opacity:1!important;visibility:visible!important}"));
check("header menu is a body portal", chat.includes('chat__menu-backdrop') && chat.includes('), document.body)}') && mobile.includes("body>.chat__menu-backdrop"));
check("header menu exposes Memories Relationship and AI Status", ["Memories 2.5","Relationship","AI Status"].every((label)=>chat.includes(label)));
check("message actions are a body portal", chat.includes("message-sheet-backdrop") && chat.includes("createPortal(("));
check("message sheet is guaranteed visible", mobile.includes("body>.message-sheet-backdrop>.message-sheet") && mobile.includes("transform:none!important") && mobile.includes("max-height:88dvh!important"));
check("message tap opens actions", chat.includes("onClick={handleMessageTap}") && chat.includes("onContextMenu"));
check("guarded swipe keeps vertical scrolling", chat.includes("Vertical movement always wins") && chat.includes("SWIPE_TRIGGER_PX = 72") && chat.includes("SWIPE_DIRECTION_RATIO = 1.8") && !chat.includes("preventDefault here")===false);
check("swipe touch surfaces declare pan-y", mobile.includes(".chat-message--swipeable{") && mobile.includes("touch-action:pan-y!important"));
check("composer has explicit three slot grid", mobile.includes("grid-template-columns:40px minmax(0,1fr) 44px!important") && mobile.includes(".chat__composer>textarea{grid-column:2!important") && mobile.includes(".chat__composer>.chat__send-button"));
check("composer accounts for keyboard and safe area", mobile.includes("--velvet-keyboard-offset") && mobile.includes("env(safe-area-inset-bottom)"));
check("short stories can flow directly into composer", chat.includes("chat--compact-mobile") && mobile.includes(".chat--compact-mobile .chat__composer{position:relative!important"));
check("scene director is portaled and phone sized", chat.includes("SCENE DIRECTOR") && chat.includes("directorNoteOpen && typeof document") && mobile.includes(".director-sheet{width:100%!important"));
check("scene director has all quick directions", ["More dialogue","More tension","Move scene","Bring someone in","Surprise me"].every((label)=>chat.includes(label)));
check("relationship engine is reachable from chat", chat.includes("chat__relationship-header") && chat.includes("setRelationshipOpen(true)"));
check("Memories 2.5 is named and has back navigation", memories.includes("Memories 2.5") && memories.includes("memories-page__back") && app.includes('onBack={() => goBackOr("profile")}'));
check("AI Status returns through history", app.includes("goBackOr") && app.includes('activePage === "diagnostics"') && diagnostics.includes("VELVET DOCTOR"));
check("AI diagnostics can clear stale PWA cache", diagnostics.includes("Clear app cache & reload") && diagnostics.includes('action: "diagnostics"'));
check("real AI stream telemetry remains enabled", edge.includes('liveStreaming: true') && edge.includes('type: "model"'));
check("UI does not call every 429 free quota exhaustion", !chat.includes("The free AI limit was reached") && !characterModal.includes("free limit was reached"));
check("Character Studio autosave remains present", characterModal.includes("velvet_character_draft_v18_") && characterModal.includes("Saved locally"));
check("Character Studio becomes full-screen on phone", mobile.includes(".character-studio{width:100%!important;height:100dvh!important"));
check("Stories mobile grid is bounded", mobile.includes(".stories-poster-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important"));
check("Discover mobile feature stacks", mobile.includes(".discover-index__featured{grid-template-columns:1fr!important"));
check("Profile action buttons become full-width", mobile.includes(".profile-setting>button{grid-column:1/-1!important;width:100%!important"));
check("Settings controls do not squeeze", mobile.includes(".setting-row{align-items:stretch!important;flex-direction:column!important"));
check("Memories mobile grid is one column", mobile.includes(".memory-grid{grid-template-columns:1fr!important"));
check("Personas and Lore mobile grids are one column", mobile.includes(".persona-grid,.lorebook-grid,.lore-entry-grid{grid-template-columns:1fr!important"));
check("Diagnostics mobile grid is one column", mobile.includes(".diagnostics-hero,.diagnostics-grid{grid-template-columns:1fr!important"));
check("all major story drawers become phone sheets", [".memory-book,.timeline-drawer,.story-hub,.conversation-picker",".relationship-drawer",".chat-controls"].every((token)=>mobile.includes(token)));
check("PWA build cleans old caches", read("vite.config.js").includes("cleanupOutdatedCaches: true") && read("vite.config.js").includes("skipWaiting: true"));
check("reading mode still has persistent state", chat.includes('localStorage.getItem("velvet_reading_mode")') && chat.includes('localStorage.setItem("velvet_reading_mode"'));
check("dialogue UI changes presentation without touching story generation", read("src/components/RoleplayText.jsx").includes("roleplay-text__paragraph--dialogue") && mobile.includes("Dialogue-first chat presentation. UI only"));
check("quoted dialogue gets a distinct visual treatment", read("src/components/RoleplayText.jsx").includes('type: "dialogue"') && mobile.includes(".roleplay-text__dialogue"));
check("character replies use compact conversation surfaces", mobile.includes(".chat-message--character .chat-message__body") && mobile.includes("border-radius:18px 18px 18px 7px"));

let failed=0;
for (const item of checks) { console.log(`${item.pass ? "PASS" : "FAIL"}  ${item.name}`); if(!item.pass) failed++; }
if(failed){ console.error(`\n${failed} UI checks failed.`); process.exit(1); }
console.log(`\n${checks.length} UI checks passed.`);
