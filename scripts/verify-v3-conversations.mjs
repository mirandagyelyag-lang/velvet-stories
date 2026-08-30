import assert from "node:assert/strict";
import { compileStoryContract, extractBoundaries, extractUserActions, socialEcosystemsFor } from "../supabase/functions/character-chat/engine/story-contract.ts";

const results = [];
const test = (name, run) => {
  try { run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
};

test("heartthrob creates romantic ecosystem without making the user jealous", () => {
  const contract = compileStoryContract({
    character: { role: "campus heartthrob", personality: "popular and easygoing", initiative: 75 },
    userName: "Antonia", latestUserMessage: "*I walk into the fraternity living room*", turnIntent: { medium: "in_person" },
    sceneState: { location: "fraternity living room", present: ["Chase", "Antonia"] },
  });
  assert.ok(contract.characterBehavior.socialEcosystems.includes("romantic attention and dating history"));
  assert.match(contract.turnObjective, /organically/);
  assert.doesNotMatch(contract.turnObjective, /user.*jealous/i);
});

test("racer gets a racing world rather than mandatory flirting", () => {
  const kinds = socialEcosystemsFor({ role: "professional race car driver", world: "the international paddock" });
  assert.deepEqual(kinds, ["drivers, rivals, crew, sponsors and racing fans"]);
});

test("public identities may overlap instead of collapsing into one trope", () => {
  const kinds = socialEcosystemsFor({ role: "famous billionaire singer and old-money heir" });
  assert.ok(kinds.includes("fans, collaborators, press and public recognition"));
  assert.ok(kinds.includes("family networks, staff, status seekers and privileged access"));
});

test("ordinary private character does not receive a forced social ecosystem", () => {
  assert.deepEqual(socialEcosystemsFor({ role: "quiet archivist", personality: "private and shy" }), []);
});

test("spoken intention is not physical movement", () => {
  const contract = compileStoryContract({ character: {}, userName: "A", latestUserMessage: "I'll go home, then.", turnIntent: {} });
  assert.equal(contract.userAuthored.movementIsExplicit, false);
});

test("narrated movement is binding movement", () => {
  assert.deepEqual(extractUserActions("Fine. *I turn and walk toward the door*"), ["I turn and walk toward the door"]);
  const contract = compileStoryContract({ character: {}, userName: "A", latestUserMessage: "Fine. *I turn and walk toward the door*", turnIntent: {} });
  assert.equal(contract.userAuthored.movementIsExplicit, true);
});

test("hard boundaries replace momentum objectives", () => {
  assert.ok(extractBoundaries("I said I don't wanna talk. Go away.").length > 0);
  const contract = compileStoryContract({
    character: { role: "campus heartthrob", personality: "proud tease" }, userName: "A",
    latestUserMessage: "I said I don't wanna talk. Go away.", turnIntent: {},
  });
  assert.match(contract.turnObjective, /Honor the boundary immediately/);
  assert.match(contract.turnObjective, /no therapy script/);
});

test("persistent NPC state survives and merges with legacy cast state", () => {
  const contract = compileStoryContract({
    character: {}, userName: "A", latestUserMessage: "*Maya comes back over*", turnIntent: {},
    persistentCast: [{ name: "Maya", goals: "get a place on the racing team", turn_count: 4 }],
    castState: { Maya: { current_dynamic: "annoyed but curious" } },
  });
  const maya = contract.supportingCast.find((member) => member.name === "Maya");
  assert.equal(maya.goals, "get a place on the racing team");
  assert.equal(maya.current_dynamic, "annoyed but curious");
});

test("romantic characters must prove interest through a costly visible choice", () => {
  const contract = compileStoryContract({
    character: { role: "friend and campus heartthrob", relationship: "He already likes her but hides it", romance_intensity: 72, initiative: 80 },
    userName: "Antonia", latestUserMessage: "Long day.", turnIntent: { medium: "in_person" },
    sceneState: { location: "parking lot", present: ["Antonia", "Chase"] },
    recentMessages: [{ sender: "character", content: "He leaned against the car. \"You look tired.\"" }],
  });
  assert.equal(contract.livingStoryEngine.interestProofRequired, true);
  assert.match(contract.livingStoryEngine.instruction, /prove interest/i);
  assert.match(contract.livingStoryEngine.emotionalCost, /time|pride|reputation/i);
});

test("dialogue drought forces a material scene change", () => {
  const contract = compileStoryContract({
    character: { role: "street racer", initiative: 70, drama: 65 }, userName: "A",
    latestUserMessage: "Okay.", turnIntent: { medium: "in_person" },
    sceneState: { location: "garage", present: ["A", "Roman"] },
    recentMessages: [
      { sender: "character", content: "\"Fine.\"" },
      { sender: "character", content: "\"You sure?\"" },
      { sender: "character", content: "\"Then say it.\"" },
    ],
  });
  assert.equal(contract.initiativePlan.talkOnlyDrought, true);
  assert.equal(contract.livingStoryEngine.sceneChangeRequired, true);
  assert.ok(contract.initiativePlan.availablePressure.some((item) => item.startsWith("ordinary-life opportunity")));
});

test("a boundary disables romantic proof and forced scene movement", () => {
  const contract = compileStoryContract({
    character: { role: "heartbreaker", romance_intensity: 90, initiative: 100 }, userName: "A",
    latestUserMessage: "Don't touch me. Go away.", turnIntent: { medium: "in_person" },
  });
  assert.equal(contract.livingStoryEngine.interestProofRequired, false);
  assert.equal(contract.livingStoryEngine.sceneChangeRequired, false);
  assert.equal(contract.initiativePlan.required, false);
});

test("contract authority puts explicit corrections above the latest visible turn", () => {
  const contract = compileStoryContract({ character: {}, userName: "A", latestUserMessage: "correction", turnIntent: {} });
  assert.equal(contract.authority[0], "latest explicit canon correction");
  assert.equal(contract.authority[1], "latest visible user turn");
});

for (const result of results) console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.error ? ` — ${result.error}` : ""}`);
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} Velvet v3 conversation-contract checks passed.`);
if (failed.length) process.exit(1);
