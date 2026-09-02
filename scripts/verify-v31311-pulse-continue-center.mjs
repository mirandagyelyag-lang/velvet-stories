import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const release = JSON.parse(read("public/velvet-version.json"));
const pulse = read("src/pages/Pulse.jsx");
const pulseCss = read("src/styles/pulse.css");
const app = read("src/App.jsx");
const memories = read("src/pages/Memories.jsx");

const checks = [
  ["release is v3.13.11 Pulse Continue Center", pkg.version === "3.13.11" && release.version === pkg.version && release.name === "Pulse Continue Center"],
  ["Pulse builds story shelves plus empty character shelves", pulse.includes("buildShelves(stories, characters)") && pulse.includes("characters.forEach((character)") && pulse.includes("NO STORIES YET")],
  ["each shelf selects one priority return point", pulse.includes("priorityStory: pickPriorityStory(sortedStories)") && pulse.includes("function pickPriorityStory(stories)") && pulse.includes("CONTINUE NOW")],
  ["story copy is null-safe", pulse.includes("function storyTitle(story)") && pulse.includes("return /^(?:null|undefined)$/i.test(normalized) ? \"\" : normalized")],
  ["quick actions connect continue, new story, memories and profile", pulse.includes("onNewStory?.(character)") && pulse.includes("onOpenMemories?.(character.id)") && pulse.includes("onOpenProfile?.(character)") && app.includes("onNewStory={startNewStoryFromProfile}")],
  ["Memories can open focused on the selected character", app.includes("memoryFocusCharacterId") && memories.includes("initialCharacterId || \"all\"")],
  ["group stories remain independent shelves", pulse.includes("return `group:${story.id}`") && pulse.includes("shelf.isGroup ? (")],
  ["Pulse adds no nested vertical scroll owner", !pulseCss.includes("overflow-y:") && !pulseCss.includes("touch-action:") && !pulseCss.includes("position: fixed")],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`\n${checks.length - failed.length}/${checks.length} Velvet v3.13.11 Pulse checks passed.`);
if (failed.length) process.exit(1);
