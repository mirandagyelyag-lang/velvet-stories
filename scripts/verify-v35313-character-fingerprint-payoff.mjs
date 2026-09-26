import assert from "node:assert/strict";
import { buildCharacterFingerprintPayoffV35313, characterFingerprintPayoffIssuesV35313, instantStoryCharacterFingerprintV35313, __testV35313 } from "../supabase/functions/character-chat/engine/character-fingerprint-payoff-v35313.js";

assert.equal(__testV35313.isCharged("I was jealous, okay?"),true);
assert.equal(__testV35313.logisticsDeflation("He got her a glass of water and offered to drive her home."),true);
assert.equal(__testV35313.genericJealousy('"Who was that guy?"'),true);
assert.equal(__testV35313.resolutionVector("He apologized and promised to stop doing it."),true);

const prompt=buildCharacterFingerprintPayoffV35313({
  character:{name:"Chase",personality:"competitive, proud, emotionally guarded",conflict_style:"pushes back before admitting fault",affection_style:"acts before he says it",humor_style:"dry"},
  latestUserMessage:"You were jealous.",
  recentCharacterReplies:["He denied it.","He changed the subject.","He went quiet when the other guy came back."],
  intelligenceState:{relationship_emotion_core:{jealousy:55,unresolved_intensity:50}},
});
assert.match(prompt,/JEALOUSY FINGERPRINT/);
assert.match(prompt,/PAYOFF DUE/);

const issues=characterFingerprintPayoffIssuesV35313({
  reply:'"Who was that guy?"',
  latestUserMessage:"You were jealous.",
  recentCharacterReplies:["He denied it.","He changed the subject.","He went quiet when the other guy came back."],
  character:{personality:"competitive, proud, emotionally guarded"},
  intelligenceState:{relationship_emotion_core:{jealousy:55,unresolved_intensity:50}},
});
assert.ok(issues.includes("generic_jealousy_interrogation"));

const regen=characterFingerprintPayoffIssuesV35313({
  reply:'He looked at her, then stepped closer. "Fine. Tell me what you want."',
  isRegeneration:true,
  rejectedResponses:['He looked at her and stepped closer. "Fine. Tell me what you want from me."'],
});
assert.ok(regen.includes("regeneration_same_structure"));
assert.match(instantStoryCharacterFingerprintV35313({personality:"quiet and observant"}),/CHARACTER FINGERPRINT/);

console.log("v3.53.13 character fingerprint + payoff: PASS");
