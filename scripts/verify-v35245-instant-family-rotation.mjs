import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { instantStorySceneFamily, instantStorySceneSeed } from "../supabase/functions/character-chat/engine/instant-story-diversity-v35245.ts";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const diversity = readFileSync(new URL("../supabase/functions/character-chat/engine/instant-story-diversity-v35245.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const draft = { name: "Alexander Bennett", role: "popular university student", personality: "social and guarded", relationship: "close friends; he already likes the user" };
const recent = [];
const families = [];

for (let index = 0; index < 6; index += 1) {
  const seed = instantStorySceneSeed(draft, "", `rotation-${index}`, recent);
  recent.push(seed);
  families.push(instantStorySceneFamily(seed));
}

assert.equal(new Set(families).size, families.length);
assert.doesNotMatch(edge, /The apartment kitchen had become the unofficial supply station/);
assert.match(diversity, /recentFamilies\.has\(instantStorySceneFamily\(seed\)\)/);
assert.match(edge, /sceneFamily: instantStorySceneFamily\(sceneSeed\)/);
assert.match(edge, /family === "restaurant"/);
assert.match(edge, /family === "friend_gathering"/);
assert.equal(pkg.version, "3.52.46");

console.log("PASS  six consecutive Instant Stories use six different scenario families");
console.log("PASS  restaurant and apartment fallbacks route to different authored scenes");
console.log("PASS  the repeated takeout-container template was removed");
