import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const home = process.env.USERPROFILE || process.env.HOME || "";
const desktop = home ? path.join(home, "Desktop") : "";
const desktopVelvet = desktop ? path.join(desktop, "velvet-stories") : "";
const PROJECT_REF = "vwyudrmxatuukcbncats";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;

const DEPLOYED_VELVET_URLS = [
  "https://velvet-stories-ten.vercel.app/",
  "https://velvet-stories-fenvqh2f3-miranda15.vercel.app/",
  "https://velvet-stories-9ch3kend8-miranda15.vercel.app/",
];

const KEY_NAMES = [
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_KEY",
  "VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "VITE_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const URL_NAMES = [
  "VITE_SUPABASE_URL",
  "SUPABASE_URL",
  "PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
];

const envCandidates = [
  path.join(cwd, ".env.android.local"),
  path.join(cwd, ".env.local"),
  path.join(cwd, ".env.production.local"),
  path.join(cwd, ".env.production"),
  path.join(cwd, ".env"),
  desktopVelvet && path.join(desktopVelvet, ".env.local"),
  desktopVelvet && path.join(desktopVelvet, ".env.production.local"),
  desktopVelvet && path.join(desktopVelvet, ".env.production"),
  desktopVelvet && path.join(desktopVelvet, ".env"),
].filter(Boolean);

function parseEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;

  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function isSafePublicKey(value) {
  if (!value || typeof value !== "string") return false;
  const key = value.trim();
  if (/^sb_secret_/i.test(key)) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]{8,}$/i.test(key)) return true;
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    return decodeJwtPayload(key)?.role === "anon";
  }
  return false;
}

function pickFromEnv(values) {
  for (const name of KEY_NAMES) {
    const value = values[name];
    if (isSafePublicKey(value)) return value.trim();
  }
  return "";
}

function pickUrl(values) {
  for (const name of URL_NAMES) {
    const value = `${values[name] || ""}`.trim();
    if (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(value)) return value.replace(/\/$/, "");
  }
  return "";
}

function findPublicKeyInText(text) {
  const modern = text.match(/sb_publishable_[A-Za-z0-9_-]{8,}/g) || [];
  for (const key of modern) if (isSafePublicKey(key)) return key;

  const jwts = text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
  for (const key of jwts) if (isSafePublicKey(key)) return key;
  return "";
}

function scanBuiltDirectory(root) {
  if (!root || !fs.existsSync(root)) return "";
  const stack = [root];
  let visited = 0;
  while (stack.length && visited < 2500) {
    const current = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!/node_modules|\.git|supabase/i.test(entry.name)) stack.push(full);
        continue;
      }
      if (!/\.(?:js|mjs|html)$/i.test(entry.name)) continue;
      visited += 1;
      try {
        const stat = fs.statSync(full);
        if (stat.size > 12 * 1024 * 1024) continue;
        const text = fs.readFileSync(full, "utf8");
        if (!text.includes(PROJECT_REF) && !/sb_publishable_|eyJ/.test(text)) continue;
        const key = findPublicKeyInText(text);
        if (key) return { key, source: full };
      } catch {}
    }
  }
  return "";
}

async function fetchPublicKeyFromDeployedVelvet() {
  for (const base of DEPLOYED_VELVET_URLS) {
    try {
      const response = await fetch(base, {
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 VelvetAndroidInstaller/3.13.17" },
      });
      if (!response.ok) continue;
      const html = await response.text();

      const direct = findPublicKeyInText(html);
      if (direct) return { key: direct, source: base };

      const assets = new Set();
      const re = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+\.(?:js|mjs)(?:\?[^"']*)?)["'][^>]*>/gi;
      for (const match of html.matchAll(re)) {
        try { assets.add(new URL(match[1], base).href); } catch {}
      }

      // Vite normally emits a module script. Search a bounded number of assets.
      let checked = 0;
      for (const asset of assets) {
        if (checked++ > 40) break;
        try {
          const jsResponse = await fetch(asset, {
            redirect: "follow",
            headers: { "user-agent": "Mozilla/5.0 VelvetAndroidInstaller/3.13.17" },
          });
          if (!jsResponse.ok) continue;
          const text = await jsResponse.text();
          const key = findPublicKeyInText(text);
          if (key) return { key, source: asset };
        } catch {}
      }
    } catch {}
  }
  return { key: "", source: "" };
}

function parseCliJson(raw) {
  if (!raw) return [];
  const text = raw.trim();
  const attempts = [text];
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start >= 0 && end > start) attempts.push(text.slice(start, end + 1));

  for (const candidate of attempts) {
    try {
      const data = JSON.parse(candidate);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.result)) return data.result;
    } catch {}
  }
  return [];
}

function pickPublicKeyFromCli(items) {
  // Modern publishable keys first. Never select secret/service-role entries.
  for (const item of items) {
    const name = `${item?.name || item?.id || ""}`.toLowerCase();
    const type = `${item?.type || ""}`.toLowerCase();
    const value = `${item?.api_key || item?.apiKey || item?.key || ""}`.trim();
    if ((type === "publishable" || name.includes("publishable")) && isSafePublicKey(value)) return value;
  }
  // Legacy client key.
  for (const item of items) {
    const name = `${item?.name || item?.id || ""}`.toLowerCase();
    const type = `${item?.type || ""}`.toLowerCase();
    const value = `${item?.api_key || item?.apiKey || item?.key || ""}`.trim();
    if ((name === "anon" || type === "anon" || name.includes("anon")) && isSafePublicKey(value)) return value;
  }
  return "";
}

function fetchPublicKeyFromSupabaseCli() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    npx,
    ["supabase", "projects", "api-keys", "--project-ref", PROJECT_REF, "--output", "json"],
    { cwd, encoding: "utf8", windowsHide: true, env: process.env }
  );
  // Parse stdout only. CLI notices may be written to stderr and must never be mistaken for a key.
  const items = parseCliJson(`${result.stdout || ""}`);
  const key = pickPublicKeyFromCli(items);
  return { key, status: result.status, stderr: `${result.stderr || ""}` };
}

let publicKey = "";
let supabaseUrl = PROJECT_URL;
let source = "";

for (const candidate of envCandidates) {
  const values = parseEnv(candidate);
  const key = pickFromEnv(values);
  if (!key) continue;
  publicKey = key;
  supabaseUrl = pickUrl(values) || PROJECT_URL;
  source = candidate;
  break;
}

if (!publicKey) {
  const buildCandidates = [
    desktopVelvet && path.join(desktopVelvet, "dist"),
    desktopVelvet && path.join(desktopVelvet, "android", "app", "src", "main", "assets", "public"),
    desktop && path.join(desktop, "VELVET-STORIES-APP-ANDROID-v3.13.11", "android", "app", "src", "main", "assets", "public"),
    desktop && path.join(desktop, "VELVET-STORIES-APP-ANDROID-v3.13.13-FINAL", "android", "app", "src", "main", "assets", "public"),
  ].filter(Boolean);

  for (const candidate of buildCandidates) {
    const found = scanBuiltDirectory(candidate);
    if (found?.key) {
      publicKey = found.key;
      source = found.source;
      break;
    }
  }
}

if (!publicKey) {
  console.log("No client key found locally. Recovering the PUBLIC key from your deployed Velvet web app...");
  const deployed = await fetchPublicKeyFromDeployedVelvet();
  if (deployed.key) {
    publicKey = deployed.key;
    source = deployed.source;
  }
}

if (!publicKey) {
  console.log("Deployed Velvet did not expose a recoverable client key. Asking your existing Supabase CLI login as the final fallback...");
  const cli = fetchPublicKeyFromSupabaseCli();
  if (cli.key) {
    publicKey = cli.key;
    source = "Supabase CLI (public project API key)";
  }
}

if (!publicKey) {
  console.error("");
  console.error("VELVET ANDROID STOPPED: the public Supabase client key could not be recovered automatically.");
  console.error(`Project: ${PROJECT_REF}`);
  console.error("Checked env aliases, previous local web/Android builds, the deployed Velvet web app, and Supabase CLI project API keys.");
  console.error("No APK was rebuilt, so the broken app was not replaced.");
  console.error("");
  console.error("If Supabase CLI asks you to authenticate, run: npx supabase login");
  console.error("Then run the installer again. Do NOT paste a service_role or sb_secret_ key into Velvet.");
  console.error("");
  process.exit(2);
}

const target = path.join(cwd, ".env.android.local");
fs.writeFileSync(
  target,
  [
    "# Generated locally for the Android build. Do not commit or zip this file.",
    `VITE_SUPABASE_URL=${supabaseUrl}`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${publicKey}`,
    "",
  ].join("\n"),
  "utf8"
);

const sourceLabel = source && path.isAbsolute(source)
  ? (path.relative(cwd, source) || path.basename(source))
  : source || "local configuration";

console.log(`Velvet Android public Supabase config recovered (${sourceLabel}).`);
console.log("The client key is intentionally not printed.");
