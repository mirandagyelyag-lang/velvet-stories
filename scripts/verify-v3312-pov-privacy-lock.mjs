import fs from "fs";
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const old=read("scripts/verify-v3311-natural-voice-lock.mjs");
const checks=[
 ["version 3.31.2",pkg.version==="3.31.2"&&pub.version==="3.31.2"],
 ["release metadata",pub.release==="POV Privacy Lock"],
 ["asterisk boundary prompt exists",edge.includes("USER POV PRIVACY / ASTERISK BOUNDARY — ABSOLUTE")],
 ["mixed action private clause example exists",edge.includes("I walk to our usual seat where we waste time")&&edge.includes("Waste of time?")],
 ["visible nod private wonder examples exist",edge.includes("*I nod*")&&edge.includes("*I wonder if he hates me*")],
 ["private narration detector exists",edge.includes("function hasPrivateNarrationLeak")&&edge.includes("privateClausesFromAsteriskNarration")],
 ["private leak is blocking",edge.includes('"private_narration_leak"')&&edge.includes("BLOCKING_NARRATIVE_ISSUES")],
 ["repair preserves visible action",edge.includes("Do not erase the visible physical action")],
 ["system instruction carries asterisk firewall",edge.includes("Asterisked user narration is NOT spoken dialogue")],
 ["v3311 verifier accepts later versions",old.includes("version >= 3.31.1")],
];
let pass=0;for(const [label,ok] of checks){if(ok)pass++;console.log(`${ok?"PASS":"FAIL"} ${label}`)}
const normalize=(v)=>String(v||"").toLowerCase().replace(/[’']/g," ").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
function privateClauses(value=""){const segments=[...String(value||"").matchAll(/\*([^*]+)\*/gs)].map(m=>String(m[1]||"").trim()).filter(Boolean);const observable=/\b(?:walk|walked|walking|follow|followed|following|nod|nodded|roll(?:ed)? my eyes|look|looked|glance|glanced|stare|stared|sit|sat|stand|stood|move|moved|step|stepped|turn|turned|shrug|shrugged|smile|smiled|laugh|laughed|open|opened|close|closed|take|took|grab|grabbed|hold|held|raise|raised|lower|lowered|touch|touched|hug|hugged|kiss|kissed|lean|leaned|wave|waved|point|pointed|pull|pulled|push|pushed|run|ran|leave|left|enter|entered|exit|exited|go|went|come|came|approach|approached|stop|stopped|pause|paused|drink|drank|eat|ate|type|typed|write|wrote|text|texted)\b/i;const marker=/\b(?:because|since|when|while|thinking|think|thought|wondering|wonder|wondered|hoping|hope|hoped|wishing|wish|wished|remembering|remember|remembered|knowing|know|knew|feeling|feel|felt|wanting|want|wanted|hating|hate|hated|loving|love|loved|assuming|assume|assumed|guessing|guess|guessed|realizing|realize|realized|deciding|decide|decided|regretting|regret|regretted|pretending|pretend|pretended|in my head|to myself)\b/i;const out=[];for(const raw of segments){const m=raw.match(marker);if(m&&Number.isFinite(m.index)){out.push(raw.slice(m.index).trim());continue;}if(!observable.test(raw))out.push(raw.trim());}return out;}
function leak(reply,user){const clauses=privateClauses(user);const spoken=normalize([...String(reply||"").matchAll(/["“]([^"”]+)["”]/g)].map(m=>m[1]).join(" ")||reply);const stop=new Set(["the","a","an","and","or","but","to","of","in","on","at","for","with","from","as","is","are","was","were","be","been","being","i","im","me","my","we","our","you","your","he","him","his","she","her","they","them","their","it","this","that","these","those","when","while","because","since","think","thought","thinking","wonder","wondering","feel","feeling","felt","want","wanting","wanted","know","knowing","knew","just","really","actually"]);const st=new Set(spoken.split(/\s+/).filter(Boolean));for(const clause of clauses){const tokens=[...new Set(normalize(clause).split(/\s+/).filter(t=>t.length>=3&&!stop.has(t)))];const overlap=tokens.filter(t=>st.has(t));if(tokens.length>=2&&overlap.length>=Math.max(2,Math.ceil(tokens.length*.6)))return true;}return false;}
const bad=leak('"Waste of time? You got an A on the midterm using these exact seats."','*i walk to our usual sit when we waste our time*');
const actionOnly=!leak('He followed you to the table and sat opposite you.','*i walk to our usual sit*');
const fixtures=bad&&actionOnly;console.log(`${fixtures?"PASS":"FAIL"} regression: catches mind-reading but permits visible movement`);if(fixtures)pass++;
console.log(`\n${pass}/${checks.length+1} POV Privacy Lock checks passed.`);if(pass!==checks.length+1)process.exit(1);
