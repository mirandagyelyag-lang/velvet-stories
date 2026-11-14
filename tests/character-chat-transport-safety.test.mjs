import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const transport = fs.readFileSync(new URL("../supabase/functions/character-chat/experimental/transport.mjs", import.meta.url), "utf8");
const crisis = fs.readFileSync(new URL("../supabase/functions/character-chat/engine/crisis-response.js", import.meta.url), "utf8");

test("provider transport has no multi-second unconditional pre-request delay", () => {
  const match = transport.match(/const pause\s*=\s*Math\.max\(0,\s*(\d+)\s*-\s*\(Date\.now\(\)\s*-\s*lastRequest\)\)/);
  assert.ok(match, "Expected to inspect the provider request pacing limit");
  assert.ok(Number(match[1]) <= 250, "Artificial provider pacing must not exceed 250 ms");
});

test("safety responses retain immediate emergency advice for recent ingestion", () => {
  assert.match(crisis, /state\.mode==='medical'/);
  assert.match(crisis, /urgencias/);
  assert.match(crisis, /No esperes a tener síntomas ni te provoques el vómito/);
  assert.match(crisis, /emergency department/);
});
