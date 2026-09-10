import fs from "node:fs"; import assert from "node:assert/strict";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8"); const perf=fs.readFileSync("supabase/functions/character-chat/engine/performance-mobile-v348.ts","utf8"); const assist=fs.readFileSync("supabase/functions/reply-assist/index.ts","utf8"); const chars=fs.readFileSync("src/context/CharactersContext.jsx","utf8");
const checks=[
["version 3.50.12",()=>assert.equal(pkg.version,"3.50.12")],
["recovery models race in parallel",()=>assert.match(edge,/Promise\.any\(models\.map/)],
["fast recovery hedges",()=>assert.match(edge,/\[0, 220, 520, 900\]/)],
["losing recovery requests abort",()=>assert.match(edge,/model !== winner\.model/)],
["standard live deadline reduced",()=>assert.match(perf,/standard:\{firstTokenTargetMs:1200,overallDeadlineMs:12500/)],
["live hedges accelerate",()=>assert.match(perf,/hedgeDelaysMs:\[0,220,520,980\]/)],
["Instant Story allows optimized completion",()=>assert.match(chars,/controller\.abort\(\), 15000/)],
["Reply Assist remains isolated",()=>assert.match(assist,/Deno\.serve/)],
["Reply Assist races models",()=>assert.match(assist,/Promise\.any\(models\.map/)],
]; let ok=0; for(const [name,fn] of checks){try{fn();console.log("PASS",name);ok++}catch(e){console.error("FAIL",name);throw e}} console.log(`\nv3.50.12 AI speed recovery: ${ok}/${checks.length} PASS`);
