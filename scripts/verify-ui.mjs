import { readFileSync } from "node:fs";

const main = readFileSync("src/main.jsx", "utf8");
const sidebar = readFileSync("src/components/Sidebar.jsx", "utf8");
const chat = readFileSync("src/pages/Chat.jsx", "utf8");
const settings = readFileSync("src/pages/Settings.jsx", "utf8");
const settingsContext = readFileSync("src/context/SettingsContext.jsx", "utf8");
const ui = readFileSync("src/styles/velvet-ui.css", "utf8");
const hotfix = readFileSync("src/styles/velvet-v171-hotfix.css", "utf8");
const emergency = readFileSync("src/styles/velvet-v172-mobile-emergency.css", "utf8");
const v18 = readFileSync("src/styles/velvet-v18.css", "utf8");
const v19 = readFileSync("src/styles/velvet-v19-phone-first.css", "utf8");
const v192 = readFileSync("src/styles/velvet-v192-message-sheet-portal.css", "utf8");
const profile = readFileSync("src/pages/Profile.jsx", "utf8");
const chatsContext = readFileSync("src/context/ChatsContext.jsx", "utf8");
const edge = readFileSync("supabase/functions/character-chat/index.ts", "utf8");
const app = readFileSync("src/App.jsx", "utf8");
const diagnostics = readFileSync("src/pages/Diagnostics.jsx", "utf8");
const characterModal = readFileSync("src/components/CreateCharacterModal.jsx", "utf8");
const memories = readFileSync("src/pages/Memories.jsx", "utf8");
const relationshipDrawer = readFileSync("src/components/RelationshipDrawer.jsx", "utf8");

const checks = [
  {
    name: "v1.9 phone-first UI layer is imported last",
    pass:
      main.indexOf('import "./styles/velvet-v19-phone-first.css"') > main.indexOf('import "./styles/velvet-v181-guarded-swipe.css"') &&
      main.indexOf('import "./styles/velvet-v181-guarded-swipe.css"') > main.indexOf('import "./styles/velvet-v18.css"'),
  },
  {
    name: "mobile navigation has exactly three destinations",
    pass:
      (sidebar.match(/id: "(?:chats|characters|profile)"/g) || []).length === 3 &&
      /repeat\(3, minmax\(0, 1fr\)\)/.test(ui),
  },
  {
    name: "chat header receives the character cover",
    pass:
      /chatHeroImage = character\.coverUrl \|\| character\.imageUrl/.test(chat) &&
      /chat__header--cover/.test(chat) &&
      /--chat-hero-image/.test(chat),
  },
  {
    name: "character replies use a soft nighttime reading bubble",
    pass:
      /\.chat-message--character p,[\s\S]*?padding: 15px 18px;[\s\S]*?border-radius: 7px 20px 20px 20px;/.test(ui) &&
      /line-height: 1\.82;/.test(ui),
  },
  {
    name: "user messages remain visually distinct",
    pass:
      /\.chat-message--user p,[\s\S]*?background: linear-gradient/.test(ui),
  },
  {
    name: "mobile composer prevents iOS focus zoom",
    pass: /\.chat__composer textarea \{[\s\S]*?font-size: 16px !important;/.test(
      ui,
    ),
  },
  {
    name: "light, dark and comfort themes remain available",
    pass:
      /data-theme="dark"/.test(readFileSync("src/index.css", "utf8")) &&
      /data-theme="comfort"/.test(readFileSync("src/index.css", "utf8")),
  },
  {
    name: "story DNA stays global and simple",
    pass:
      settings.includes("How I like stories") &&
      settingsContext.includes('storyDialogue: "dialogue_forward"') &&
      settingsContext.includes('storyEmotion: "interior_visible"'),
  },
  {
    name: "regeneration can explain every common failure",
    pass: [
      "ignored_idea", "too_short", "out_of_character", "too_much_narration",
      "not_enough_dialogue", "repetitive", "pov_violation", "missing_emotional_impact",
    ].every((reason) => chat.includes(`"${reason}"`)),
  },
  {
    name: "rejected response remains hidden while feedback rewrite begins",
    pass:
      chat.includes("The rejected response will not become canon") &&
      chat.includes('rememberFeedback("negative", feedbackCodes'),
  },
  {
    name: "every character reply exposes like and dislike learning",
    pass:
      chat.includes('aria-label="Like this response"') &&
      chat.includes('aria-label="Dislike this response"') &&
      chat.includes("Save what worked") &&
      chat.includes("Undo"),
  },
  {
    name: "complete AI character creation remains review first",
    pass:
      characterModal.includes("Create with AI") &&
      characterModal.includes("Complete draft created. Review anything you want before saving.") &&
      characterModal.includes("Nothing becomes a character until you press Save."),
  },
  {
    name: "slow AI creation can be stopped and an unwanted draft discarded",
    pass:
      readFileSync("src/components/CreateCharacterModal.jsx", "utf8").includes("Stop generation") &&
      readFileSync("src/components/CreateCharacterModal.jsx", "utf8").includes("Discard draft"),
  },
  {
    name: "character creator replaces generic Edge errors with their real reason",
    pass:
      readFileSync("src/context/CharactersContext.jsx", "utf8").includes("readCharacterFunctionError") &&
      readFileSync("src/context/CharactersContext.jsx", "utf8").includes("response.clone().text()"),
  },
  {
    name: "v1.8.1 guarded swipe preserves one-finger native scrolling",
    pass:
      v18.includes("touch-action:pan-y pinch-zoom!important") &&
      chat.includes("Vertical movement always wins") &&
      chat.includes("SWIPE_TRIGGER_PX = 72") &&
      chat.includes("SWIPE_DIRECTION_RATIO = 1.8") &&
      !/onPointerMove=\{handlePointerMove\}/.test(chat) &&
      !/onPointerUp=\{handlePointerUp\}/.test(chat),
  },
  {
    name: "Character Studio autosaves and recovers drafts",
    pass:
      characterModal.includes("velvet_character_draft_v18_") &&
      characterModal.includes("Saved locally") &&
      characterModal.includes("Recovered your unfinished autosaved draft.") &&
      characterModal.includes("localStorage.setItem(draftStorageKey"),
  },
  {
    name: "scene director exposes fast one-shot guidance",
    pass:
      ["More dialogue", "More tension", "Move the scene", "Bring someone in", "Surprise me"]
        .every((label) => chat.includes(label)) &&
      chat.includes("Guide next reply"),
  },
  {
    name: "relationship pulse is optional and percentage-free",
    pass:
      chat.includes("Relationship pulse") &&
      relationshipDrawer.includes("CURRENT DYNAMIC") &&
      relationshipDrawer.includes("never uses a love percentage") &&
      app.includes("RelationshipDrawer") === false,
  },
  {
    name: "stories can be exported from chat",
    pass:
      chat.includes("Export this story") &&
      chat.includes("exportCurrentStory") &&
      ["markdown", "text", "json"].every((format) => settings.includes(format)),
  },
  {
    name: "Memories 2.5 exposes focused views and replaced history",
    pass:
      ["Canon", "Relationship", "Events", "Preferences", "Conflicts", "Replaced history"]
        .every((label) => memories.includes(label)) &&
      memories.includes("Learned from your message") &&
      memories.includes("superseded_at"),
  },
  {
    name: "reading mode has width font and tap-to-reveal chrome",
    pass:
      settings.includes("Reading width") &&
      settings.includes("Reading font") &&
      chat.includes("handleReadingSurfaceClick") &&
      v18.includes("chat--reading-chrome-hidden"),
  },
  {
    name: "UI never labels every Gemini 429 as exhausted free quota",
    pass:
      chat.includes("Gemini is rate-limited right now") &&
      !chat.includes("The free AI limit was reached") &&
      !characterModal.includes("Gemini's free limit was reached"),
  },
  {
    name: "Velvet Doctor is reachable and can clear stale PWA cache",
    pass:
      app.includes('activePage === "diagnostics"') &&
      settings.includes("Open diagnostics") &&
      diagnostics.includes("Clear app cache & reload") &&
      diagnostics.includes('action: "diagnostics"') &&
      diagnostics.includes("Copy diagnostics"),
  },
  {
    name: "v1.7.2 mobile chat uses native document scrolling",
    pass:
      main.indexOf('import "./styles/velvet-v172-mobile-emergency.css"') >
        main.indexOf('import "./styles/velvet-v171-hotfix.css"') &&
      emergency.includes("overflow-y: auto !important") &&
      emergency.includes("overflow: visible !important") &&
      emergency.includes("The page itself scrolls"),
  },
  {
    name: "guarded touch swipe never steals vertical pan",
    pass:
      chat.includes("onTouchStart={canSwipe ? handleTouchStart : undefined}") &&
      chat.includes("onTouchMove={canSwipe ? handleTouchMove : undefined}") &&
      chat.includes("onTouchEnd={canSwipe ? handleTouchEnd : undefined}") &&
      chat.includes("We intentionally never call preventDefault here.") &&
      chat.includes("absY >= absX * 1.12") &&
      chat.includes("absX >= absY * SWIPE_DIRECTION_RATIO") &&
      !/onPointerMove=\{handlePointerMove\}/.test(chat) &&
      !/onPointerUp=\{handlePointerUp\}/.test(chat),
  },
  {
    name: "mobile message and header menus stay tappable",
    pass:
      emergency.includes(".chat-message__actions") &&
      emergency.includes(".chat__more") &&
      emergency.includes("pointer-events: auto !important") &&
      emergency.includes("z-index: 500 !important"),
  },

  {
    name: "phone chat always exposes a leave control",
    pass: chat.includes("chat__mobile-exit") && chat.includes("chat__back-button") && v19.includes("chat--reading-chrome-hidden .chat__mobile-exit"),
  },
  {
    name: "tapping any finished message opens its action sheet",
    pass: chat.includes("onClick={handleMessageTap}") && chat.includes("onOpenActions(message)") && chat.includes("onContextMenu"),
  },
  {
    name: "header three-dot menu becomes a real phone bottom sheet",
    pass: chat.includes("chat__menu-backdrop") && v19.includes(".chat__menu-backdrop") && v19.includes("align-items:flex-end"),
  },
  {
    name: "Memories 2.5 and AI Status are discoverable from Profile and chat",
    pass: profile.includes("Memories 2.5") && profile.includes("AI Status") && chat.includes("Memories 2.5") && chat.includes("AI Status"),
  },
  {
    name: "relationship engine has a direct phone header action",
    pass: chat.includes("chat__relationship-header") && chat.includes('aria-label="Open relationship engine"') && v19.includes(".chat__relationship-header"),
  },
  {
    name: "Scene Director uses a dedicated mobile sheet with explicit apply",
    pass: chat.includes("director-sheet-backdrop") && chat.includes("Use this direction") && v19.includes(".director-sheet__presets") && v19.includes("grid-template-columns:repeat(2"),
  },
  {
    name: "Gemini reply uses true upstream SSE streaming",
    pass: edge.includes("streamGenerateContent?alt=sse") && edge.includes("extractPartialJsonStringField") && chatsContext.includes('eventData.type === "reset"') && chatsContext.includes('eventData.type === "model"'),
  },
  {
    name: "AI diagnostics records first visible text latency separately",
    pass: chatsContext.includes("firstTokenMs") && diagnostics.includes("First reply text") && diagnostics.includes("Full response"),
  },
  {
    name: "mobile message sheet escapes chat stacking contexts",
    pass:
      chat.includes('import { createPortal } from "react-dom"') &&
      chat.includes('createPortal((') &&
      chat.includes('), document.body)') &&
      v192.includes('body > .message-sheet-backdrop') &&
      v192.includes('z-index: 9998 !important') &&
      v192.includes('transform: none !important') &&
      v192.includes('animation: none !important'),
  },
];

let failed = 0;

for (const check of checks) {
  if (check.pass) {
    console.log(`PASS  ${check.name}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${check.name}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
console.log(`\n${checks.length} UI checks passed.`);
}
