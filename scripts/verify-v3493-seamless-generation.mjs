import fs from "node:fs";
const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");
const css=fs.readFileSync("src/styles/velvet-v3493-seamless-generation.css","utf8");
const perf=fs.readFileSync("supabase/functions/character-chat/engine/performance-mobile-v348.ts","utf8");
const main=fs.readFileSync("src/main.jsx","utf8");

ok("version 3.49.3 descendant",pkg.version===pub.version&&/^3\.49\.(?:[3-9]|[1-9]\d+)$/.test(pkg.version));
ok("seamless generation release remains installed",fs.existsSync("README-v3.49.3-SEAMLESS-GENERATION-SILENT-FAILOVER.txt"));
ok("normal AI phase chip removed",chat.includes('const aiStatusLabel = actionNotice ? "" : aiPhaseOverride;'));
ok("retry has no duplicate status toast",!chat.includes('showActionNotice("Retrying…"')&&!chat.includes('showAiPhase("Retrying"'));
ok("normal send has no finishing pill",!chat.includes('showAiPhase("Finishing", 420);\n      if (generationResult?.learnedMemoryCount)'));
ok("stop has one notice surface",chat.includes('showActionNotice("Generation stopped"')&&!chat.includes('showAiPhase("Stopped"'));
ok("high demand is translated to one generic message",chat.includes('error.includes("high demand")')&&chat.includes("Velvet couldn't finish this reply right now. Retry in a moment."));
ok("complete model wins instead of first fragment",edge.includes("completeWinnerOnly")&&edge.includes("if (!completeWinnerOnly && chooseWinner(model))"));
ok("partial winning draft not salvaged in complete-only mode",edge.includes("if (!completeWinnerOnly && winnerModel === model && latestReply.trim()"));
ok("roleplay forces complete winner",edge.includes("completeWinnerOnly: true"));
ok("transient upstream retry is silent and bounded",edge.includes("[500, 502, 503, 504].includes(response.status)")&&edge.includes("transient-retry"));
ok("429 is not immediate-retried by same model",edge.includes("Do not immediately retry 429"));
ok("raw transient provider errors are masked",edge.includes("const transient = /(?:high demand|overload|unavailable")&&edge.includes("transient ? \"Velvet couldn't finish this reply right now. Retry in a moment.\""));
ok("faster hedges",/hedgeDelaysMs:\[0,(?:260|450),(?:680|1100)/.test(perf)&&/hedgeDelaysMs:\[0,(?:420|600),(?:980|1450)/.test(perf));
ok("mobile error uses stable grid",css.includes("grid-template-columns: auto minmax(0, 1fr) auto"));
ok("retry button cannot collapse vertically",css.includes("white-space: nowrap !important")&&css.includes("writing-mode: horizontal-tb !important")&&css.includes("min-width: max-content"));
ok("mobile retry gets its own row",css.includes("grid-column: 2")&&css.includes("min-height: 34px"));
ok("new CSS imported",main.includes('velvet-v3493-seamless-generation.css'));
ok("3.49.2 remains regression",(pkg.scripts?.["stability:lab"]||"").includes("verify:v3492"));
ok("3.49.3 remains directly after newer hotfixes",(pkg.scripts?.["stability:lab"]||"").includes("verify:v3494 && npm run verify:v3493"));

let failed=0;
for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.3 seamless-generation checks passed.`);
if(failed) process.exit(1);
