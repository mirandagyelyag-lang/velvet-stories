import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { instantStoryLooksComplete, instantStoryQualityIssues } from "../supabase/functions/character-chat/engine/instant-story-v3492.ts";

const draft={
  name:"Alexander Bennett",role:"Campus King",
  relationship:"You've been close friends for years as part of the same group of eight. Alex has never hidden how much he likes you. He flirts openly and goes out of his way to make your life easier.",
  personality:"Alex is confident, witty, and effortlessly charismatic.",
};
const rejected=`The flickering neon light of the 24/7 Market sign hummed, buzzing against the quiet, humid air of the parking lot. Inside, Alex stood before the wall of energy drinks, squinting at the labels with the kind of intense focus he usually reserved for orchestrating the group's chaotic road trips. He wasn't here for a simple snack; he was on a mission to replace the stock of caffeine and questionable junk food that the others had already managed to deplete before they even hit the state line. He tossed a bag of sour gummies into the basket, his movements fluid and purposeful. “Seriously?” he muttered. He turned, spotting you near the magazine rack, and his expression shifted from frustrated strategist to something much softer. He held up two different brands of beef jerky. “Help me out here. If I buy the cheap stuff, Jax is going to complain for three hundred miles. If I buy the expensive one, I’m basically subsidizing his poor life choices.” His gaze lingered on you for a beat too long. “You picking, or am I just going to have to guess what’ll keep you happy?”`;
const issues=instantStoryQualityIssues(rejected,draft);
assert.ok(issues.includes("decorative_stock_atmosphere"));
assert.ok(issues.includes("personality_explained_as_prose"));
assert.ok(issues.includes("unstaged_user_placement"));
assert.ok(issues.includes("sitcom_choice_monologue"));
assert.ok(issues.includes("generic_roadtrip_snack_scene"));
assert.ok(issues.includes("invented_named_npc"));
assert.ok(issues.includes("attraction_without_behavioral_proof"));
assert.equal(instantStoryLooksComplete(rejected,"STOP",draft),false);

const edge=readFileSync(new URL("../supabase/functions/character-chat/index.ts",import.meta.url),"utf8");
const client=readFileSync(new URL("../src/context/CharactersContext.jsx",import.meta.url),"utf8");
assert.doesNotMatch(edge.slice(edge.indexOf("const INSTANT_STORY_NON_ACADEMIC_SCENES"),edge.indexOf("function instantStorySceneSeed")),/convenience store/);
assert.match(edge,/Personality and attraction must change an actual decision/);
assert.match(client,/const genericInstantStory =/);

console.log("PASS  the exact neon/jerky/Jax opening is rejected");
console.log("PASS  Instant Story cannot position or move the user");
console.log("PASS  invented named NPC comedy is rejected");
console.log("PASS  gaze-only attraction fails without behavioral proof");
console.log("PASS  convenience-store road-trip filler is removed from scene selection");
console.log("\n5 Instant Story naturalism checks passed.");
