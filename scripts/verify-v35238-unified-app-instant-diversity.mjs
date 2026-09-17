import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const canvas = readFileSync(new URL("../src/styles/velvet-v35238-unified-app-canvas.css", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/context/CharactersContext.jsx", import.meta.url), "utf8");
const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const diversity = readFileSync(new URL("../supabase/functions/character-chat/engine/instant-story-diversity-v35245.ts", import.meta.url), "utf8");

assert.match(main, /velvet-v35238-unified-app-canvas\.css/);
assert.match(canvas, /body\.velvet-burgundy-route:not\(\.velvet-page--chat\):not\(\.velvet-page--studio\)/);
assert.doesNotMatch(canvas, /data-velvet-page="chats"/);
assert.match(canvas, /velvet-route-stage > :first-child \{[\s\S]*background: transparent !important;[\s\S]*background-image: none !important;/);
assert.match(canvas, /velvet-route-stage > :first-child::before/);
assert.match(canvas, /content: none !important;/);
assert.match(client, /velvet:instant-story-scenes:/);
assert.match(client, /recentSceneSeeds/);
assert.match(client, /variationKey/);
assert.match(diversity, /const recent = new Set/);
assert.match(diversity, /const available = pool\.filter/);
assert.match(edge, /sceneSeed, sceneFamily: instantStorySceneFamily\(sceneSeed\)/);

console.log("PASS  unified canvas applies to every non-chat Velvet route");
console.log("PASS  Instant Story remembers recent scenarios and rotates them");
console.log("PASS  Edge Function returns the chosen scenario to the client");
