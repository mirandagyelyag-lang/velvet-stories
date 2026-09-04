import fs from "node:fs";
const vite=fs.readFileSync("vite.config.js","utf8");
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="3.21.0","package version 3.21.0"],
 [pub.version==="3.21.0","public version 3.21.0"],
 [pub.release==="Human Behavior","public release Human Behavior"],
 [vite.includes('const velvetRelease = "Human Behavior";'),"vite release Human Behavior"],
 [vite.includes('registerType: "autoUpdate"'),"PWA autoUpdate kept"],
 [vite.includes('skipWaiting: true'),"PWA skipWaiting kept"],
 [vite.includes('clientsClaim: true'),"PWA clientsClaim kept"],
];
let fail=0; for (const [ok,label] of checks){console.log(`${ok?"PASS":"FAIL"} · ${label}`); if(!ok) fail++;}
if(fail) process.exit(1);
console.log(`verify:v3210-release passed (${checks.length}/${checks.length}).`);
