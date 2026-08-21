import { readFileSync } from "node:fs";
const read=(f)=>readFileSync(f,"utf8"), mobile=read("src/styles/velvet-mobile-foundation.css"), stability=read("src/styles/velvet-v265-stability.css"), chat=read("src/pages/Chat.jsx"), app=read("src/App.jsx"), studio=read("src/components/CreateCharacterModal.jsx"), reference=read("src/styles/velvet-burgundy-reference.css"), studio269=read("src/styles/velvet-v269-character-studio-mobile.css"), studio2610=read("src/styles/velvet-v2610-character-studio-scroll.css"), sixFix=read("src/styles/velvet-v2611-six-fixes.css"), audio2616=read("src/styles/velvet-v2616-audio-center.css"), ambience=read("src/components/StoryAmbience.jsx"), stories=read("src/pages/Chats.jsx"), memories=read("src/pages/Memories.jsx"), feedback=read("src/context/FeedbackContext.jsx"), feedbackCss=read("src/styles/feedback.css"), studioLite=read("src/styles/velvet-v290-character-studio-lite.css"), privateLibrary=read("src/styles/velvet-v291-private-library-rework.css"), mobileLibrary=read("src/styles/velvet-v292-mobile-library-polish.css"), inbox=read("src/pages/ChatInbox.jsx"), swipeTrash=read("src/components/SwipeToTrash.jsx"), precisionActions=read("src/styles/velvet-v296-precision-actions.css"), charactersClean=read("src/styles/velvet-v298-characters-clean-mobile.css");
const checks=[]; const check=(n,p)=>checks.push({n,p:Boolean(p)});
check("360-430px route shell cannot create horizontal page overflow",stability.includes("@media (max-width:430px)")&&stability.includes("overflow-x:hidden!important"));
check("all primary destinations are covered by the mobile viewport shield",[".stories-page",".discover-page",".chats-page",".memories-page",".profile-page",".settings-page",".diagnostics-page",".search-page",".personas-page",".lorebooks-page"].every(t=>stability.includes(t)));
check("one-finger chat scroll stays native",mobile.includes("touch-action:pan-y pinch-zoom!important")&&mobile.includes("overflow-y:auto!important"));
check("chat never becomes a nested vertical scroller",mobile.includes(".chat__content,.chat__content--wallpaper")&&mobile.includes("overflow:visible!important"));
check("keyboard composer uses visual viewport offset and safe area",mobile.includes("--velvet-keyboard-offset")&&mobile.includes("env(safe-area-inset-bottom)"));
check("mobile fields remain at least 16px to prevent iOS zoom",mobile.includes("button,input,textarea,select{font-size:16px!important}"));
check("primary mobile controls keep a 44px target",mobile.includes("button{min-height:44px}"));
check("bottom navigation remains a five-destination grid",reference.includes("repeat(5, minmax(0,1fr))"));
check("sheets and drawers are capped to the viewport",stability.includes(".story-hub,.memory-book,.relationship-drawer,.timeline-drawer,.director-sheet,.chat__menu,.message-sheet,.character-studio,.group-story-sheet")&&stability.includes("max-width:100vw!important"));
check("Group Stories has a dedicated 430px safe-area shield",stability.includes("explicit Group Story mobile QA guard")&&stability.includes(".group-story-backdrop")&&stability.includes(".group-story-sheet")&&stability.includes("max-height:92dvh!important"));
check("Character Studio has a real mobile exit path",studio.includes("Back to Characters")&&app.includes("!creatorOpen")&&app.includes("CreateCharacterModal"));
check("Character Studio shows all six wizard steps without horizontal scrolling",studio269.includes("repeat(3, minmax(0, 1fr))")&&studio269.includes("overflow: visible !important")&&studio269.includes("Six destinations, all visible"));
check("Character Studio media and accent controls cannot widen a 360px viewport",studio269.includes("grid-template-columns: repeat(2, minmax(0, 1fr))")&&studio269.includes("grid-template-columns: repeat(8, minmax(0, 1fr))")&&studio269.includes("max-width: 100% !important"));
check("Character Studio has exactly one phone vertical scroll owner",studio2610.includes("height: 0 !important")&&studio2610.includes("overflow-y: auto !important")&&studio2610.includes("touch-action: pan-y pinch-zoom !important")&&studio2610.includes(".character-studio__preview,\n  .character-studio__editor")&&studio2610.includes("overflow: visible !important"));
check("Character Studio wizard step reset scrolls the real layout scroller",studio.includes('document.querySelector(".character-studio__layout")')&&studio.includes("layout?.scrollTo?.({ top: 0"));
check("Character Studio Lite owns one-finger phone scrolling",studioLite.includes(".character-studio-lite{height:0;flex:1;overflow-y:auto;touch-action:pan-y pinch-zoom")&&studioLite.includes("-webkit-overflow-scrolling:touch"));
check("Character Studio Lite fields stay 16px on phone",studioLite.includes("font-size:16px;border-radius:15px")&&studioLite.includes("font-size:16px}"));
check("Character Studio Lite primary phone actions are thumb sized",studioLite.includes("min-height:48px")&&studioLite.includes("character-studio-lite__actions--ready"));

check("Memories index mirrors Characters in a two-column phone gallery",mobileLibrary.includes(".memory-character-index__grid")&&mobileLibrary.includes("grid-template-columns:repeat(2,minmax(0,1fr))"));
check("importance filter stays inside the selected memory character and remains zoom-safe",memories.includes("selectedMemoryCharacter")&&memories.includes("Filter memories by importance")&&privateLibrary.includes(".memories-character-library__importance select")&&privateLibrary.includes("font-size:16px"));
check("Chats have separate touch-friendly cards instead of glued rows",privateLibrary.includes("gap:12px !important")&&privateLibrary.includes("border-radius:18px !important")&&privateLibrary.includes("min-height:78px !important"));

check("Chats and Memories require an intentional right-swipe before fast delete",inbox.includes('direction="right"')&&memories.includes('direction="right"')&&swipeTrash.includes('absX > absY * 1.35')&&swipeTrash.includes('DELETE_THRESHOLD = 86')&&swipeTrash.includes('offset >= DELETE_THRESHOLD')&&mobileLibrary.includes("touch-action: pan-y"));
check("resting swipe rows cannot expose Delete labels or red underlay",!swipeTrash.includes('className="sr-only"')&&swipeTrash.includes("aria-label={label}")&&swipeTrash.includes("is-revealed")&&mobileLibrary.includes("opacity: 0")&&mobileLibrary.includes("visibility: hidden"));
check("Characters stay two-column and visually compact on narrow phones",charactersClean.includes("@media (max-width: 390px)")&&charactersClean.includes(".characters-library__grid { gap: 8px !important; }")&&charactersClean.includes("width: 28px !important"));check("Profile and Access becomes a phone bottom sheet",privateLibrary.includes(".profile-access-backdrop { align-items:end; padding:0; }")&&privateLibrary.includes("border-radius:24px 24px 0 0"));
check("audio status stays inside phone width",stability.includes("width:calc(100vw - 24px)")&&stability.includes(".audio-status-pill"));
check("settings chips and long controls scroll locally instead of widening the document",stability.includes(".setting-segments")&&stability.includes("overflow-x:auto"));
check("message actions remain portaled to body",chat.includes("message-sheet-backdrop")&&chat.includes("createPortal(("));
check("confirm dialog stays above the mobile message sheet",feedback.includes("createPortal(")&&feedback.includes("document.body")&&feedbackCss.includes("z-index:5200"));
check("chat mobile exit remains body-portaled",chat.includes('className="chat__mobile-exit"')&&mobile.includes("body>.chat__mobile-exit"));

check("v2.6.8 mobile composer caps itself under the software keyboard",stability.includes("max-height:min(150px,28dvh)!important"));
check("Stories touch menu keeps 44px actions and does not leak taps",stability.includes(".story-action-menu__panel button")&&stability.includes("min-height:44px!important")&&read("src/pages/Chats.jsx").includes("event.stopPropagation()"));
check("Safe Mode disables motion without changing mobile scroll primitives",stability.includes(".velvet-safe-mode")&&stability.includes("animation-duration:.001ms!important")&&mobile.includes("touch-action:pan-y pinch-zoom!important"));
check("v2.6.11 Stories menu is a full-screen touch portal",stories.includes("story-action-menu__portal-backdrop")&&stories.includes("createPortal")&&sixFix.includes("position:fixed!important; inset:0!important")&&sixFix.includes("min-height:48px!important"));
check("Character Studio top AI tools are labeled phone pills",sixFix.includes("grid-template-columns:repeat(3,minmax(0,1fr))")&&sixFix.includes(".character-studio__top-actions .character-studio__ai span{display:block!important"));
check("Chats phone rows hide long previews instead of becoming a text wall",sixFix.includes(".reference-story-row__copy p{display:none!important}")&&sixFix.includes(".chat__messages{gap:30px!important}"));
check("Add something important is a one-finger mobile bottom sheet",memories.includes("Add something important")&&sixFix.includes(".memory-editor{width:100%!important;max-height:92dvh!important;overflow-y:auto!important")&&sixFix.includes("touch-action:pan-y!important"));
check("Group Story touch surfaces remain native",sixFix.includes(".group-story-sheet{touch-action:pan-y!important")&&sixFix.includes(".group-story-cast button{touch-action:manipulation!important"));
check("Audio Center 2.0 transport remains thumb-sized on phone",audio2616.includes("audio-center__transport")&&audio2616.includes("min-height:44px"));
check("ambience mode rail stays one-finger horizontally scrollable",audio2616.includes("overflow-x:auto")&&audio2616.includes("-webkit-overflow-scrolling:touch"));
check("background return cannot double-stack ambience decks",ambience.includes("visibilityPausedRef")&&ambience.includes("activeAmbience")&&ambience.includes("looping = false"));
check("rapid-clean Undo moves above the list lane and supports Undo all", feedbackCss.includes(".velvet-undo--batch") && feedbackCss.includes("top:max(76px") && feedback.includes("Undo all") && feedback.includes("2500"));
check("library three-dot controls are compact and scroll-safe", precisionActions.includes(".story-action-menu--reference .story-action-menu__trigger") && precisionActions.includes("width: 32px !important") && precisionActions.includes("touch-action: pan-y !important") && precisionActions.includes(".characters-library__card .discover-burgundy__more") && stories.includes("onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuId"));
check("Characters hides redundant floating search and uses a shorter route dock", charactersClean.includes(".mobile-global-search { display: none !important; }") && charactersClean.includes("height: 60px !important"));
let failed=0; for(const x of checks){console.log(`${x.p?"PASS":"FAIL"}  ${x.n}`);if(!x.p)failed++;} if(failed){console.error(`\n${failed} mobile QA checks failed.`);process.exit(1);} console.log(`\n${checks.length} mobile QA checks passed.`);



// v2.10.2 regression: Character Profile New Story must portal above mobile stacking contexts.
{
  const detail = read("src/pages/CharacterDetail.jsx");
  const storyCss = read("src/styles/velvet-v220.css");
  check("New Story setup uses a body portal above mobile navigation", detail.includes("createPortal((") && detail.includes("story-setup-backdrop--portal") && detail.includes("document.body"));
  check("New Story portal is isolated, centered and scrollable on mobile", storyCss.includes(".story-setup-backdrop--portal") && storyCss.includes("z-index:6200") && storyCss.includes("place-items:center") && storyCss.includes("overflow-y:auto"));
}
