import { readFileSync } from "node:fs";

const pulse = readFileSync("src/pages/Pulse.jsx", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const release = JSON.parse(readFileSync("public/velvet-version.json", "utf8"));

const checks = [
  ["release metadata is 3.13.6", pkg.version === "3.13.6" && release.version === "3.13.6"],
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
