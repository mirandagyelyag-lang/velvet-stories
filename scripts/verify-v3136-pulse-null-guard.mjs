import { readFileSync } from "node:fs";

const pulse = readFileSync("src/pages/Pulse.jsx", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const release = JSON.parse(readFileSync("public/velvet-version.json", "utf8"));
const versionAtLeast3136 = /^3\.13\.(?:[6-9]|\d{2,})$/.test(pkg.version) || /^3\.(?:1[4-9]|[2-9]\d)\./.test(pkg.version) || /^[4-9]\./.test(pkg.version);

const checks = [
  ["release metadata is 3.13.6 or later", versionAtLeast3136 && release.version === pkg.version],
  ["Pulse rejects database null values", pulse.includes('if (value == null) return "";')],
  ["Pulse rejects serialized null and undefined values", pulse.includes('/^(?:null|undefined)$/i.test(normalized)')],
  ["an empty recap falls back to useful copy", pulse.includes('"Your story is ready where you left it."')],
  ["moment cards never deliberately render null", !pulse.includes('return "null"') && !pulse.includes('>null<')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failed = true;
}

if (failed) process.exit(1);
