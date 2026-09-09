import fs from "node:fs"; import assert from "node:assert/strict";
const src=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const tests=[
 ["version",()=>assert.equal(pkg.version,"3.50.5")],
 ["nonstream recovery marker",()=>assert.match(src,/v3\.50\.5 REGEN RECOVERY/)],
 ["stream failure enters recovery",()=>assert.match(src,/SSE generation failed; trying non-stream recovery/)],
 ["recovery uses proven failover",()=>assert.match(src,/result = await callGeminiWithFailover\(\{/)],
 ["recovery gets full prompt",()=>assert.match(src,/systemInstruction: liveSystemInstruction,[\s\S]{0,200}prompt,/)],
 ["recovery has independent deadline",()=>assert.match(src,/interactionDeadlineMs: 24000/)],
 ["short complete prose salvage",()=>assert.match(src,/reply\.length < 2/)],
 ["no fabricated fallback prose",()=>assert.doesNotMatch(src,/REGEN RECOVERY[\s\S]{0,1200}A beat passes/)],
];
let n=0; for(const [name,fn] of tests){fn();n++;console.log(`PASS ${n}: ${name}`)} console.log(`\nv3.50.5 regen recovery: ${n}/${tests.length} PASS`);
