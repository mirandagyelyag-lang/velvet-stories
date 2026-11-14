import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const config = fs.readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");

// Static regression guards only: these do not replace deployed authorization tests.
// The tracked entrypoint is currently empty; fail clearly rather than report false assurance.
test("tracked edge entrypoint contains deployable source", () => {
  assert.ok(source.trim().length > 0, "Tracked character-chat/index.ts is empty; restore and reconcile deployed source before merging or deploying.");
});
test("character-chat rejects requests missing an Authorization header", () => {
  assert.match(source, /request\.headers\.get\(["']Authorization["']\)/);
  assert.match(source, /if\s*\(!authorization\)\s*return\s+json\(\{\s*error:\s*["']Authentication required["']\s*\},\s*401\)/);
});

test("character-chat validates the session and uses the verified identity", () => {
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /if\s*\(userError\s*\|\|\s*!userData\.user\)\s*return\s+json\(\{\s*error:\s*["']Invalid session["']\s*\},\s*401\)/);
  assert.match(source, /const userId\s*=\s*userData\.user\.id/);
});

test("disabled platform JWT verification is explicitly documented", () => {
  assert.match(config, /\[functions\.character-chat\][\s\S]*?verify_jwt\s*=\s*false/);
  assert.match(source, /global:\s*\{\s*headers:\s*\{\s*Authorization:\s*authorization\s*\}/);
});
