import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { instantStoryLooksComplete } from "../supabase/functions/character-chat/engine/instant-story-v3492.ts";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/context/CharactersContext.jsx", import.meta.url), "utf8");

assert.match(edge, /TARGET 150-230 WORDS/);
assert.match(edge, /never return fewer than 130 words/);
assert.match(edge, /thinkingLevel: "MEDIUM"/);
assert.match(edge, /maxOutputTokens: 1800/);
assert.match(edge, /globalDeadlineMs = 14000/);
assert.match(client, /instantWords\.length < 130/);
assert.match(client, /controller\.abort\(\), 26000/);

const longOpening = `The garage was almost empty, but Rowan still had grease across one wrist from the engine he had promised to finish before midnight. He set the wrench beside the open hood instead of pretending the job could wait. The argument from earlier had not disappeared; it sat between every practical word he chose. “The belt is wrong.” He checked the label on the box again, then held it out where it could be read. “They sent the part for last year's model.” A delivery window closed in forty minutes, and abandoning the car would cost him the only quiet night he had left that week. “I can call the supplier, or I can make this fit and regret it tomorrow.” His mouth tightened, more annoyed with the situation than with anyone standing near him. “You know the owner better than I do.” He picked up his phone but did not make the call yet. “Tell me if he’ll answer you.”`;
assert.equal(instantStoryLooksComplete(longOpening, "STOP"), true);
assert.equal(instantStoryLooksComplete('"Hey. Come with me."', "STOP"), false);
assert.equal(instantStoryLooksComplete(longOpening.replace("Tell me if he’ll answer you.", "I need you for something."), "STOP"), false);

console.log("PASS  Instant Story requires a substantial complete scene");
console.log("PASS  short teaser openings are rejected");
console.log("PASS  generic mystery hooks are rejected");
console.log("PASS  client timeout allows the quality pass to finish");
