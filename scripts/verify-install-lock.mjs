import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const warnings = [];
let passed = 0;
function check(label, ok, detail = "") {
  if (ok) { passed++; console.log(`PASS  ${label}`); }
  else { failures.push(label); console.error(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`); }
}
function readJson(name) {
  const file = path.join(root, name);
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { failures.push(`Cannot load ${name}`); console.error(`FAIL  Cannot load ${name}: ${error.message}`); return null; }
}
const pkg = readJson("package.json");
const lock = readJson("package-lock.json");
const vercel = readJson("vercel.json");
if (!pkg || !lock || !vercel) {
  console.error(`\\nInstall-lock verification blocked: ${failures.length} required configuration file(s) missing or invalid.`);
  process.exit(1);
}
const rootPkg = lock.packages?.[""];
check("Vercel uses npm ci", vercel.installCommand?.trim() === "npm ci",
  "Set installCommand to npm ci in vercel.json.");
check("npm lockfile has a supported version", [2, 3].includes(lock.lockfileVersion),
  "Regenerate package-lock.json using a supported npm version.");
check("package name agrees with lockfile", pkg.name === lock.name && pkg.name === rootPkg?.name,
  "Regenerate lockfile after changing package name.");
check("package version agrees with lockfile", pkg.version === lock.version && pkg.version === rootPkg?.version,
  "Regenerate lockfile after changing project version.");

for (const group of ["dependencies", "devDependencies", "optionalDependencies"]) {
  const declared = pkg[group] || {};
  const locked = rootPkg?.[group] || {};
  const mismatches = Object.entries(declared).filter(([name, range]) => locked[name] !== range);
  const extras = Object.keys(locked).filter(name => !(name in declared));
  check(`${group} matches lockfile root`, !mismatches.length && !extras.length,
    [...mismatches.map(([name]) => name), ...extras].slice(0, 12).join(", "));
}
const override = pkg.overrides?.["baseline-browser-mapping"];
const baseline = lock.packages?.["node_modules/baseline-browser-mapping"];
check("baseline-browser-mapping has an explicit override", typeof override === "string" && /^\\d+\\.\\d+\\.\\d+$/.test(override),
  "Pin a published version explicitly in package.json overrides.");
if (typeof override === "string") {
  check("baseline-browser-mapping lock matches override", baseline?.version === override,
    `Override ${override}; lock ${baseline?.version || "missing"}.`);
  check("baseline-browser-mapping tarball matches version", baseline?.resolved ===
    `https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-${override}.tgz`,
    "Check package-lock.json resolved URL.");
}
check("known bad baseline-browser-mapping 2.11.22 absent",
  override !== "2.11.22" && baseline?.version !== "2.11.22",
  "Remove the problematic pin and regenerate lockfile.");

const packages = Object.entries(lock.packages || {}).filter(([name]) => name.startsWith("node_modules/"));
const missingIntegrity = packages.filter(([, info]) =>
  info?.resolved?.startsWith("https://registry.npmjs.org/") && !info.integrity);
check("registry packages have integrity hashes", missingIntegrity.length === 0,
  `${missingIntegrity.length} registry package(s) missing integrity: ${missingIntegrity.slice(0, 5).map(([name]) => name).join(", ")}`);
const malformedIntegrity = packages.filter(([, info]) =>
  info?.integrity && !/^(?:sha512|sha384|sha256)-[A-Za-z0-9+/=]+(?:\\s+(?:sha512|sha384|sha256)-[A-Za-z0-9+/=]+)*$/.test(info.integrity));
check("integrity hashes have recognized format", malformedIntegrity.length === 0,
  `${malformedIntegrity.length} invalid integrity fields`);
if (vercel.buildCommand && !String(vercel.buildCommand).includes("build")) {
  warnings.push("Vercel buildCommand does not visibly invoke a build; review configuration.");
}
for (const warning of warnings) console.warn(`WARN  ${warning}`);
console.log(`\\nInstall-lock audit: ${passed} passed, ${failures.length} failed, ${warnings.length} warning(s).`);
if (failures.length) {
  console.error("Install-lock verification FAILED. Run npm install --package-lock-only after fixing version/dependency drift.");
  process.exitCode = 1;
} else {
  console.log("PASS  Static lockfile checks. npm ci and Vercel build must still be executed separately.");
}
