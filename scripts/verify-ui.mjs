import { readFileSync } from "node:fs";

const main = readFileSync("src/main.jsx", "utf8");
const sidebar = readFileSync("src/components/Sidebar.jsx", "utf8");
const chat = readFileSync("src/pages/Chat.jsx", "utf8");
const settings = readFileSync("src/pages/Settings.jsx", "utf8");
const settingsContext = readFileSync("src/context/SettingsContext.jsx", "utf8");
const ui = readFileSync("src/styles/velvet-ui.css", "utf8");

const checks = [
  {
    name: "canonical UI layer is imported last",
    pass:
      main.indexOf('import "./styles/velvet-ui.css"') >
      main.indexOf('import "./styles/mobile-v71.css"'),
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
      readFileSync("src/components/CreateCharacterModal.jsx", "utf8").includes("Create with AI") &&
      readFileSync("src/components/CreateCharacterModal.jsx", "utf8").includes("Nothing is saved automatically"),
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
