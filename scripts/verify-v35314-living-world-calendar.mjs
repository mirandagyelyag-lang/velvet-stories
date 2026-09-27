import assert from "node:assert/strict";
import { buildLivingWorldCalendarV35314, livingWorldCalendarIssuesV35314, instantStoryLivingWorldV35314, __testV35314 } from "../supabase/functions/character-chat/engine/living-world-calendar-v35314.js";

assert.equal(__testV35314.romanceDensity(["He was jealous.","She mentioned a kiss.","He admitted attraction.","He wanted her attention."]),true);
assert.equal(__testV35314.rumorLanguage("Apparently, someone said they left together."),true);
assert.equal(__testV35314.groundedInfoSource("He heard from Roman that they left together."),true);
assert.equal(__testV35314.returnWithoutHook("He came back later."),true);
assert.equal(__testV35314.returnWithoutHook("He came back because he'd promised to return the keys."),false);

const prompt=buildLivingWorldCalendarV35314({
  character:{name:"Theo"},
  persistentCast:[{name:"Jules",status:"active"}],
  calendarEvents:[{title:"Friday birthday dinner",status:"planned"}],
  storyPlans:[{title:"Help Roman move on Saturday",status:"active"}],
  recentCharacterReplies:["He was jealous.","He almost admitted it.","He kept circling back to her."],
});
assert.match(prompt,/OFF-SCREEN LIFE/);
assert.match(prompt,/WORLD PRESSURE=relationship has dominated/);
assert.match(prompt,/Friday birthday dinner/);

const issues=livingWorldCalendarIssuesV35314({
  reply:"Everybody in the group looked at you two and noticed the tension.",
  persistentCast:[{name:"Jules"},{name:"Roman"}],
});
assert.ok(issues.includes("group_scene_couple_tunnel_vision"));

assert.match(instantStoryLivingWorldV35314({
  character:{name:"Chase"},
  storyPlans:[{title:"Concert on Saturday",status:"active"}]
}),/Concert on Saturday/);

console.log("v3.53.14 living world + story calendar: PASS");
