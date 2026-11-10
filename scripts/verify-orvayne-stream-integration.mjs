import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
assert.match(file, /code: "instant_story_quality_exhausted"/);
assert.match(file, /rejectionReasons: rejectionSummary,\s*}\s*, 422\)/);
assert.match(file, /\[orvayne-chat-stream-timing\]/);
assert.match(file, /firstChunkMs/);
assert.match(file, /import \{ createChatTimer \} from "\.\/chat-timing\.ts"/);
console.log("ORVAYNE narrative failure classification and timing wiring verified");
