import fs from "node:fs"; import assert from "node:assert/strict";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8"); const perf=fs.readFileSync("supabase/functions/character-chat/engine/performance-mobile-v348.ts","utf8"); const assist=fs.readFileSync("supabase/functions/reply-assist/index.ts","utf8"); const chars=fs.readFileSync("src/context/CharactersContext.jsx","utf8");
const checks=[
["version preserves v3.50.12 speed recovery or descendant",()=>assert.match(pkg.version,/^(?:3\.50\.(?:1[2-9]|[2-9]\d)|3\.(?:5[1-9]|[6-9]\d)\.\d+|[4-9]\.\d+\.\d+)$/)],
["recovery models race in parallel",()=>assert.match(edge,/Promise\.any\(models\.map/)],
["fast recovery hedges",()=>assert.match(edge,/\[0,\s*(?:220|1[0-9]{2}),\s*(?:520|[2-4][0-9]{2}),\s*(?:900|[5-8][0-9]{2})\]/)],
["losing recovery requests abort",()=>assert.match(edge,/model !== winner\.model/)],
["standard live deadline is v3.50.12-fast or faster",()=>{const m=perf.match(/standard:\{firstTokenTargetMs:(\d+),overallDeadlineMs:(\d+)/); assert.ok(m); assert.ok(Number(m[1])<=1200); assert.ok(Number(m[2])<=12500)}],
["live hedges are v3.50.12-fast or faster",()=>{const m=perf.match(/standard:\{[^}]*hedgeDelaysMs:\[0,(\d+),(\d+),(\d+)\]/); assert.ok(m); assert.ok(Number(m[1])<=220); assert.ok(Number(m[2])<=520); assert.ok(Number(m[3])<=980)}],
["Instant Story keeps bounded completion",()=>assert.match(chars,/controller\.abort\(\),\s*(?:1[0-5]\d{3}|[5-9]\d{3})/)],
["Reply Assist remains isolated",()=>assert.match(assist,/Deno\.serve/)],
["Reply Assist races models",()=>assert.match(assist,/Promise\.any\(models\.map/)],
]; let ok=0; for(const [name,fn] of checks){try{fn();console.log("PASS",name);ok++}catch(e){console.error("FAIL",name);throw e}} console.log(`\nv3.50.12 AI speed recovery compatibility: ${ok}/${checks.length} PASS`);
