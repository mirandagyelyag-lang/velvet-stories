import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const pulse = read("src/pages/Pulse.jsx");
const pulseCss = read("src/styles/pulse.css");
const chats = read("src/pages/Chats.jsx");
const swipe = read("src/components/SwipeToTrash.jsx");
const swipeCss = read("src/styles/velvet-v292-mobile-library-polish.css");

const checks = [
  ["Pulse groups stories into character shelves", (pulse.includes("buildShelves(stories)") || pulse.includes("buildShelves(stories, characters)")) && pulse.includes("PulseCharacterLibrary")],
  ["each shelf separates unfinished, recent and waiting moments", ["Unfinished", "Recent", "Waiting for you"].every((label) => pulse.includes(label))],
  ["Group Stories keep their own cast shelf", pulse.includes("return `group:${story.id}`") && pulse.includes("pulse-portrait--group")],
  ["mobile Pulse removes repeated helper copy", pulseCss.includes(".pulse-library__heading > p { display: none; }") && pulseCss.includes(".pulse-header__library span { display: none; }")],
  ["story swipe reveals a named Trash action", chats.includes("actionText={conversation.trashed_at ? \"Delete\" : \"Trash\"}") && chats.includes("showLabel") && swipe.includes("{actionText}")],
  ["Trash label is visibly styled beneath the card", swipeCss.includes(".swipe-trash--story > .swipe-trash__action span") && !swipeCss.includes(".swipe-trash--story > .swipe-trash__action span { display: none; }")],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failed = true;
}

if (failed) process.exit(1);
