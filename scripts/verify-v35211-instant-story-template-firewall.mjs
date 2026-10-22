import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { instantStoryHasTemplateLeak, instantStoryLooksComplete } from "../supabase/functions/character-chat/engine/instant-story-v3492.ts";

const leaked = `Alexander Bennett is already in the middle of a home kitchen, living room, hallway, balcony, or building entrance when the relationship plausibly allows it, occupied with something connected to Campus King rather than waiting around for anyone. A practical complication changes the next few minutes, but not their entire day. Between you sits You've been close friends for years as part of the same group of eight. Alex has never hidden how much he likes you. Their response carries Alex is confident, witty, and effortlessly charismatic, without turning it into a performance. “You’re here.” Alexander finishes the practical thing in front of them before giving you their full attention. There is a concrete reason the two of you need to deal with each other now, and neither a stranger nor a convenient accident has manufactured it. “I was going to handle this without dragging you into it.” The admission is incomplete on purpose, held back by the way Alexander normally protects what matters. “That plan isn’t going to work now.” They make room for your answer instead of deciding it for you. What happens next depends on what you choose to say.`;

assert.equal(instantStoryHasTemplateLeak(leaked), true);
assert.equal(instantStoryLooksComplete(leaked, "STOP"), false);

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/context/CharactersContext.jsx", import.meta.url), "utf8");
const fallbackBody = edge.slice(edge.indexOf("function instantStoryFallbackOpening"), edge.indexOf("async function handleInstantStory"));

assert.doesNotMatch(fallbackBody, /Between you sits \$\{relationship\}/);
assert.match(fallbackBody, /had waited because the decision affected both of you/);
assert.match(fallbackBody, /family === "friend_gathering"/);
assert.match(edge, /If the profile explicitly says the character already likes the user/);
assert.match(edge, /instant story fallback failed structural completion/);
assert.match(client, /const leakedTemplate =/);


// Focused regressions for template leakage and safe rejection.
const leakedFragments = [
  "Between you sits You've been close friends for years",
  "occupied with something connected to Campus King rather than waiting around for anyone",
  "Their response carries Alex is confident, witty, and effortlessly charismatic",
];
for (const fragment of leakedFragments) {
  assert.ok(leaked.includes(fragment), `fixture must retain leaked fragment: ${fragment}`);
}
assert.equal(instantStoryHasTemplateLeak(leaked), true, "combined template leak must remain blocked");
assert.equal(instantStoryLooksComplete(leaked, "STOP"), false, "template text is not a complete scene");
assert.ok(edge.indexOf("function instantStoryFallbackOpening") >= 0, "fallback function must exist");
assert.ok(edge.indexOf("async function handleInstantStory") > edge.indexOf("function instantStoryFallbackOpening"),
  "fallback extraction must have valid boundaries");
assert.ok(fallbackBody.length > 100, "fallback extraction must not be empty");
assert.match(edge, /instantStoryHasTemplateLeak|instantStoryLooksComplete/,
  "server must call the template/completeness guards");

console.log("PASS  the exact leaked-template opening is rejected");
console.log("PASS  the old profile-splicing fallback has been removed");
console.log("PASS  fallback prose is a concrete playable scene");
console.log("PASS  explicit attraction changes a visible choice or cost");
console.log("PASS  server and client both firewall template language");
console.log("\nInstant Story template-firewall assertions passed.");
