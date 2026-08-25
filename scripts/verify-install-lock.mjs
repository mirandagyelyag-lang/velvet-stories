import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const rawLock = fs.readFileSync("package-lock.json", "utf8");

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`PASS  ${label}`);
  else { failures += 1; console.error(`FAIL  ${label}`); }
}

const baseline = lock?.packages?.["node_modules/baseline-browser-mapping"];
check("Vercel installs with npm ci instead of npm install", vercel.installCommand === "npm ci");
check("baseline-browser-mapping is explicitly overridden to a published fixed version", pkg?.overrides?.["baseline-browser-mapping"] === "2.11.12");
check("lockfile pins baseline-browser-mapping 2.11.12", baseline?.version === "2.11.12");
check("lockfile tarball resolves to baseline-browser-mapping 2.11.12", baseline?.resolved === "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.11.12.tgz");
check("nonexistent baseline-browser-mapping 2.11.22 is absent from install metadata", !rawLock.includes("2.11.22") && !JSON.stringify(pkg).includes("2.11.22"));
check("package and lock root versions agree", pkg.version === "2.11.4" && lock.version === "2.11.4" && lock?.packages?.[""]?.version === "2.11.4");

if (failures) {
  console.error(`\n${failures} install-lock verification check(s) failed.`);
  process.exit(1);
}
console.log("\n6 install-lock checks passed.");
