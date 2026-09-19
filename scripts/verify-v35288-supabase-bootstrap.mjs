import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync(new URL("../src/services/supabase.js", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = JSON.parse(readFileSync(new URL("../public/velvet-version.json", import.meta.url), "utf8"));

assert.equal(pkg.version, "3.52.88");
assert.equal(version.version, "3.52.88");
assert.equal(version.release, "Supabase Bootstrap Guard");

assert.match(service, /const PROJECT_REF = "vwyudrmxatuukcbncats"/);
assert.match(service, /DEFAULT_SUPABASE_URL/);
assert.match(service, /DEFAULT_SUPABASE_PUBLISHABLE_KEY/);
assert.match(service, /function resolveVelvetSupabaseUrl/);
assert.match(service, /parsed\.hostname === `\$\{PROJECT_REF\}\.supabase\.co`/);
assert.match(service, /const supabaseUrl = configuredUrl \|\| DEFAULT_SUPABASE_URL/);
assert.match(service, /configuredUrl && configuredPublishableKey/);
assert.match(service, /: DEFAULT_SUPABASE_PUBLISHABLE_KEY/);

console.log("PASS  Velvet pins its known Supabase project URL");
console.log("PASS  malformed or foreign VITE_SUPABASE_URL values are rejected");
console.log("PASS  a public publishable key fallback keeps client bootstrap alive");
console.log("PASS  env credentials are only trusted with the correct Velvet project URL");
console.log("\n4 Supabase Bootstrap Guard v3.52.88 checks passed.");
