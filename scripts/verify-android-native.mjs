import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const webRoot = path.join(root, "android", "app", "src", "main", "assets", "public");
const indexPath = path.join(webRoot, "index.html");
const failures = [];

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch { return null; }
}

function collectTextFiles(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) return files;
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(?:js|mjs|html)$/i.test(entry.name)) files.push(full);
    }
  }
  return files;
}

if (!fs.existsSync(indexPath)) failures.push("Android index.html is missing after cap sync.");
else {
  const html = fs.readFileSync(indexPath, "utf8");
  if (!html.includes('name="velvet-runtime" content="android"')) failures.push("Android runtime marker is not set to android.");
  if (/manifest\.webmanifest|registerSW|workbox-window/i.test(html)) failures.push("Android index still contains PWA registration metadata.");
}

if (fs.existsSync(webRoot)) {
  for (const name of fs.readdirSync(webRoot)) {
    if (/^(sw\.js|workbox-.*\.js|manifest\.webmanifest)$/i.test(name)) {
      failures.push(`PWA artifact must not ship in Android: ${name}`);
    }
  }
}

const cap = JSON.parse(fs.readFileSync(path.join(root, "capacitor.config.json"), "utf8"));
if (cap?.server?.androidScheme !== "http" || cap?.server?.hostname !== "localhost") {
  failures.push("Android must use the clean http://localhost origin for this recovery build.");
}

const bundleText = collectTextFiles(webRoot)
  .map((file) => { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } })
  .join("\n");

if (!bundleText.includes("vwyudrmxatuukcbncats")) {
  failures.push("Android bundle does not contain the Velvet Supabase project URL/ref.");
}

const publishable = bundleText.match(/sb_publishable_[A-Za-z0-9_-]{8,}/g) || [];
const jwts = bundleText.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
const anonJwts = jwts.filter((token) => decodeJwtPayload(token)?.role === "anon");
const privilegedJwts = jwts.filter((token) => ["service_role", "supabase_admin"].includes(decodeJwtPayload(token)?.role));

if (publishable.length === 0 && anonJwts.length === 0) {
  failures.push("Android bundle is missing a safe public Supabase client key.");
}
if (/sb_secret_[A-Za-z0-9_-]+/i.test(bundleText) || privilegedJwts.length > 0) {
  failures.push("A privileged Supabase key was found in the Android bundle. Build blocked for safety.");
}

if (failures.length) {
  console.error("\nVELVET ANDROID VERIFY FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Velvet Android verified: native runtime · no PWA shell · Supabase public client config embedded · no privileged key.");
