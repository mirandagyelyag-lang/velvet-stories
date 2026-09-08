import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const v21=fs.readFileSync("scripts/verify-v34921-human-sarcasm.mjs","utf8");
const v22=fs.readFileSync("scripts/verify-v34922-reply-assist.mjs","utf8");
const checks=[
 ["v3.49.23 lineage retained",Number((pkg.version||"0").split(".").at(-1))>=23&&pub.version===pkg.version],
 ["v34923 precedes v34922",pkg.scripts["stability:lab"].includes("npm run verify:v34923 && npm run verify:v34922")],
 ["v34921 verifier descendant-safe",v21.includes("v34921 precedes v34920")&&v21.includes(".includes(\"npm run verify:v34921 && npm run verify:v34920\")")],
 ["v34922 verifier descendant-safe",v22.includes("v3.49.22 lineage retained")&&v22.includes("reply assist css lineage remains")],
 ["reply assist preserved",fs.existsSync("src/styles/velvet-v34922-reply-assist.css")],
];
let n=0; for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)n++;} console.log(`\n${n}/${checks.length} passed`); if(n!==checks.length)process.exit(1);
