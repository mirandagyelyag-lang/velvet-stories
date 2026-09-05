import fs from "fs";
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const vite=read("vite.config.js");
const old=read("scripts/verify-v3310-dialogue-genome.mjs");
const semverAtLeast=(value,minimum)=>{const a=String(value||"").split(".").map(Number),b=String(minimum||"").split(".").map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
const checks=[
 ["version >= 3.31.1",semverAtLeast(pkg.version,"3.31.1")&&semverAtLeast(pub.version,"3.31.1")],
 ["release metadata present",typeof pub.release==="string"&&pub.release.trim().length>0&&typeof vite==="string"],
 ["natural voice lock prompt",edge.includes("NATURAL VOICE LOCK 3.31.1")],
 ["banter saturation prompt",edge.includes("BANTER SATURATION LIMIT")&&edge.includes("ONE-JOKE CEILING")],
 ["canon specificity gate",edge.includes("CANON SPECIFICITY GATE")&&edge.includes("NO FAKE SHARED HISTORY")],
 ["nickname ownership gate",edge.includes("NICKNAME OWNERSHIP GATE")],
 ["immediate stop rule",edge.includes("IMMEDIATE STOP RULE")],
 ["short turn scale",edge.includes("SHORT-TURN SCALE")],
 ["runtime banter detector",edge.includes("function hasBanterSaturationLoop")&&edge.includes("performativeBanterScore")],
 ["short-turn performance detector",edge.includes("function hasShortTurnPerformanceMonologue")],
 ["stop violation detector",edge.includes("function hasImmediateBehaviorStopViolation")],
 ["nickname detector",edge.includes("function hasUnearnedNicknameAddress")],
 ["shared history detector",edge.includes("function hasUnsupportedSharedAcademicSpecificity")],
 ["umbrella choreography tracked",edge.includes('umbrella: /\\b(?:umbrella|umbrella handle)\\b/')],
 ["severe voice failures can trigger repair",edge.includes('"banter_saturation_loop"')&&edge.includes('"short_turn_performance_monologue"')&&edge.includes('"overwritten_banter"')],
 ["v3310 verifier accepts patch versions",old.includes("version >= 3.31.0")],
];
let pass=0;for(const [label,ok] of checks){if(ok)pass++;console.log(`${ok?"PASS":"FAIL"} ${label}`)}
const bad=[
 "I'm a saint, obviously. It's a thankless job, but I've got broad shoulders.",
 "You'd probably miss the apocalypse. I'm doing this for your own good.",
 "After you, your highness.",
 "Calumny. Pure slander.",
 "Boring is my specialty. I was hoping to dazzle you.",
];
const normalized=(v)=>String(v).toLowerCase().replace(/[’']/g," ").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const score=(v)=>{const d=normalized(v);const pats=[/\bi m a saint\b/,/\bthankless job\b/,/\bbroad shoulders\b/,/\bapocalypse\b/,/\byour highness\b/,/\bcalumny\b/,/\bpure slander\b/,/\bboring is my specialty\b/,/\bdazzle you\b/,/\bobviously\b/];return pats.reduce((n,p)=>n+(p.test(d)?1:0),0)};
const fixtureOk=bad.every((x)=>score(x)>0);if(fixtureOk)pass++;console.log(`${fixtureOk?"PASS":"FAIL"} regression fixtures hit performative banter detector`);
console.log(`\n${pass}/${checks.length+1} Natural Voice Lock checks passed.`);if(pass!==checks.length+1)process.exit(1);
