import fs from "node:fs";
const idx=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const eng=fs.readFileSync("supabase/functions/character-chat/engine/intent-subtext-lock.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 ["version 3.49.21",pkg.version==="3.49.21"],
 ["v34921 runs first in stability lab",pkg.scripts["stability:lab"].startsWith("npm run verify:v34921 && npm run verify:v34920")],
 ["semantic-field riff guard expanded",eng.includes("canonized|canonised|divine|divinity")],
 ["comedy monologue length guard",eng.includes("spokenWords > 18") && eng.includes("spoken.length > 1")],
 ["deterministic human fallback exists",eng.includes("pragmaticSarcasmFallback")],
 ["cocky fallback answers claim",eng.includes("Still doesn\\'t make me wrong")],
 ["repair fallback wired",idx.includes("pragmaticSarcasmFallback(character, recentCharacterReplies)")],
 ["sarcasm miss is hard repair",/HARD_REPAIR_REQUIRED_ISSUES[\s\S]*pragmatic_sarcasm_miss/.test(idx)],
 ["prompt forbids out-joking",idx.includes("Do NOT answer sarcasm by trying to out-joke it")],
 ["payload remains forbidden",eng.includes("cue.payload")],
];
let n=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok)n++;}
console.log(`\\n${n}/${checks.length} v3.49.21 checks passed.`); if(n!==checks.length) process.exit(1);
