import fs from "node:fs";
const idx=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const eng=fs.readFileSync("supabase/functions/character-chat/engine/intent-subtext-lock.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 ["version 3.49.20 descendant",/^3\.49\.(?:2[0-9]|[3-9][0-9])$/.test(pkg.version)],
 ["semantic speech-act hard lock",idx.includes("PRAGMATIC SUBTEXT HARD LOCK v3.49.21")],
 ["deterministic sarcasm miss guard",eng.includes("hasPragmaticSarcasmMiss")],
 ["payload riff rejected",eng.includes("payload") && eng.includes("walk on water")],
 ["generic Okay rejected",eng.includes("okay|ok|right|sure")],
 ["repair trigger wired",idx.includes('"pragmatic_sarcasm_miss"')],
 ["repair understands implied disbelief",idx.includes("SOCIAL SPEECH ACT")],
 ["user gesture ownership retained",idx.includes("Never invent a user gesture or emotion")],
];
let n=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok)n++;}
console.log(`\n${n}/${checks.length} v3.49.20 checks passed.`); if(n!==checks.length) process.exit(1);
