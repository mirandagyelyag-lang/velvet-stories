import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const webRoot = path.join(root, "android", "app", "src", "main", "assets", "public");
const projectRef = "vwyudrmxatuukcbncats";
const projectUrl = `https://${projectRef}.supabase.co`;
const failures = [];
const warnings = [];
const fail = message => failures.push(message);
const warn = message => warnings.push(message);

function readFile(file) {
  try { return fs.readFileSync(file, "utf8"); }
  catch (error) { fail(`Cannot read ${path.relative(root, file)}: ${error.message}`); return ""; }
}
function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch { return null; }
}
function collectFiles(dir) {
  const result = [];
  if (!fs.existsSync(dir)) { fail(`Missing Android web assets directory: ${path.relative(root, dir)}. Run cap sync first.`); return result; }
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); }
    catch (error) { fail(`Cannot scan ${path.relative(root, current)}: ${error.message}`); continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else result.push(full);
    }
  }
  return result;
}

const files = collectFiles(webRoot);
const indexPath = path.join(webRoot, "index.html");
if (!fs.existsSync(indexPath)) fail("Android index.html is missing after cap sync.");
else {
  const html = readFile(indexPath);
  if (!/<meta\\b(?=[^>]*\\bname\\s*=\\s*["']velvet-runtime["'])(?=[^>]*\\bcontent\\s*=\\s*["']android["'])[^>]*>/i.test(html)) {
    fail("Android runtime marker is not set to android.");
  }
  if (/manifest\\.webmanifest|registerSW|workbox-window|navigator\\.serviceWorker\\.register/i.test(html)) {
    fail("Android index contains PWA registration metadata.");
  }
}
for (const file of files) {
  const relative = path.relative(webRoot, file).replace(/\\\\/g, "/");
  if (/(^|\\/)(?:sw\\.js|service-worker\\.js|workbox-[^/]*\\.js|manifest\\.webmanifest)$/i.test(relative)) {
    fail(`PWA artifact must not ship in Android: ${relative}`);
  }
}

const capPath = path.join(root, "capacitor.config.json");
if (!fs.existsSync(capPath)) fail("Missing capacitor.config.json.");
else {
  try {
    const cap = JSON.parse(readFile(capPath));
    if (cap?.server?.androidScheme !== "http" || cap?.server?.hostname !== "localhost") {
      fail("Android must use http://localhost for this build.");
    }
    if (cap?.server?.url) warn("Capacitor server.url is set: Android may load a remote page rather than bundled assets.");
  } catch (error) { fail(`Invalid capacitor.config.json: ${error.message}`); }
}

const textFiles = files.filter(file => /\\.(?:js|mjs|html)$/i.test(file));
const chunks = textFiles.map(file => readFile(file));
const bundleText = chunks.join("\n");
if (!bundleText.includes(projectUrl)) {
  fail(`Android bundle does not contain expected Supabase URL: ${projectUrl}`);
}
const publicKeys = [...new Set(bundleText.match(/sb_publishable_[A-Za-z0-9_-]{8,}/g) || [])];
const jwts = [...new Set(bundleText.match(/eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+/g) || [])];
const anon = jwts.filter(token => decodeJwtPayload(token)?.role === "anon");
const privileged = jwts.filter(token => ["service_role", "supabase_admin"].includes(decodeJwtPayload(token)?.role));
const mismatched = anon.filter(token => {
  const payload = decodeJwtPayload(token);
  return payload?.ref && payload.ref !== projectRef;
});
if (!publicKeys.length && !anon.length) fail("Android bundle is missing a public Supabase client key.");
if (mismatched.length) fail("Android bundle contains an anon JWT for a different Supabase project.");
if (/sb_secret_[A-Za-z0-9_-]+/i.test(bundleText) || privileged.length) {
  fail("Privileged Supabase credentials detected in Android assets. Build blocked.");
}
if (publicKeys.length && !anon.length) {
  warn("Publishable key cannot be tied cryptographically to the project by static inspection; verify at runtime.");
}
if (/navigator\\.serviceWorker\\.register\\s*\\(|workbox-window|registerSW\\s*\\(/i.test(bundleText)) {
  fail("Android JavaScript bundle contains service-worker registration code.");
}
for (const message of warnings) console.warn(`WARN: ${message}`);
if (failures.length) {
  console.error("\nVELVET ANDROID VERIFY FAILED");
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log("Velvet Android static verification passed: runtime, PWA isolation, Supabase config and credential checks.");
  console.log("NOTE: This does not test device startup, authentication or network connectivity.");
}
