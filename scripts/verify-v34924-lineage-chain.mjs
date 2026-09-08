import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const v15=fs.readFileSync("scripts/verify-v34915-story-library-memory-safety.mjs","utf8");
const v23=fs.readFileSync("scripts/verify-v34923-verifier-lineage.mjs","utf8");
const lab=pkg.scripts?.["stability:lab"]||"";
const checks=[
 ["v3.49.24 lineage retained", /^3\.49\.(?:2[4-9]|[3-9]\d|\d{3,})$/.test(pkg.version) && pub.version===pkg.version],
 ["v34924 precedes v34923",lab.indexOf("verify:v34924")>=0&&lab.indexOf("verify:v34923")>lab.indexOf("verify:v34924")],
 ["v34915 is descendant-safe",v15.includes("v3.49.15 precedes v3.49.12")&&!v15.includes("runs first in stability lab")],
 ["v34923 is descendant-safe",v23.includes("v34923 precedes v34922")&&!v23.includes("v34923 runs first")],
 ["reply assist preserved",fs.existsSync("src/styles/velvet-v34922-reply-assist.css")],
];
let n=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)n++;}console.log(`\n${n}/${checks.length} passed`);if(n!==checks.length)process.exit(1);
