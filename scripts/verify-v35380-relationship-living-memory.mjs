import fs from "node:fs";
const idx=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const eng=fs.readFileSync("supabase/functions/character-chat/engine/relationship-living-memory-v35380.js","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
[pkg.version==="3.53.80","package version"],
[idx.includes('VELVET_ENGINE_RELEASE = "455"'),"engine 455"],
[idx.includes("buildRelationshipLivingMemoryV35380"),"prompt integration"],
[idx.includes("deriveRelationshipLivingMemoryV35380"),"persistent state integration"],
[idx.includes("relationshipLivingMemoryIssuesV35380"),"QA integration"],
["PRIVATE THOUGHT CONTINUITY","UNFINISHED DESIRE ENGINE","INITIATIVE MEMORY","RELATIONSHIP MICROCHANGES","POST-MILESTONE INTELLIGENCE","ROMANTIC MEMORY SALIENCE","CHARACTER CHEMISTRY SIGNATURE","PROXIMITY INTELLIGENCE","DELAYED PAYOFF ENGINE","HE NOTICES"].every(x=>eng.includes(x)),"all ten systems"]
];
const failed=checks.filter(([ok])=>!ok).map(([,n])=>n);
if(failed.length){console.error("v3.53.80 verification failed:",failed.join(", "));process.exit(1);}
console.log("v3.53.80 relationship living memory verified");
