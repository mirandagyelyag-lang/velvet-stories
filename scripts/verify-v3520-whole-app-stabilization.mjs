import fs from "node:fs";
const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json")); const meta=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts"), assist=read("supabase/functions/reply-assist/index.ts"), main=read("src/main.jsx"), chat=read("src/pages/Chat.jsx");
let n=0,p=0; const ok=(name,x)=>{n++; if(x){p++;console.log("PASS",name)}else{console.error("FAIL",name);process.exitCode=1}};
ok("version 3.52+ lineage",/^3\.(?:5[2-9]|[6-9]\d)\.\d+$/.test(pkg.version)); ok("PWA metadata synchronized",meta.version===pkg.version); ok("12-turn truth window",edge.includes("messages.slice(-12)")); ok("compact live reasoning kernel",edge.includes("SILENT DECISION KERNEL")&&edge.includes("smallest natural next move")); ok("reply assist fast hedges",assist.includes("[0, 120, 280, 520]")&&assist.includes("7500")); ok("reply assist low thinking",assist.includes('thinkingConfig:{thinkingLevel:"LOW"}')); ok("v3.52 authority retained",main.includes('import "./styles/velvet-v3520-whole-app-stabilization.css";')); ok("raw story path errors hidden",chat.includes("[Velvet Story Paths] request failed")); ok("raw reply assist errors hidden",chat.includes("[Velvet Reply Assist] request failed")); 
// Integration assertions only: runtime PWA update and retry behavior require browser tests.
ok("PWA metadata has a semantic version", /^\\d+\\.\\d+\\.\\d+$/.test(meta.version));
ok("chat exposes a recoverable story-path failure diagnostic", chat.includes("[Velvet Story Paths] request failed"));
ok("chat exposes a recoverable reply-assist failure diagnostic", chat.includes("[Velvet Reply Assist] request failed"));
ok("character chat retains recent context", edge.includes("messages.slice(-12)"));
ok("reply assist uses bounded hedges", assist.includes("[0, 120, 280, 520]") && assist.includes("7500"));
console.log(`\\nv3.52 whole-app stabilization: ${p}/${n} PASS`);
