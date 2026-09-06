import fs from "node:fs";
const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
ok("version 3.49.4",pkg.version==="3.49.4"&&pub.version==="3.49.4");
ok("release names recovery",/Generation Recovery/.test(pub.release||""));
ok("fourth GA recovery lane",edge.includes('GEMINI_RECOVERY_MODEL')&&edge.includes('gemini-3.5-flash'));
ok("normal failover includes recovery lane",edge.includes('[GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL, GEMINI_RECOVERY_MODEL]'));
ok("roleplay uses low thinking",edge.includes('thinkingConfig: { thinkingLevel: "LOW" }')&&edge.includes('responseMimeType: "application/json"'));
ok("complete reply candidates are tracked",edge.includes('recoverableReplies.set(model'));
ok("complete reply can be salvaged after stream failure",edge.includes('salvaging complete reply after stream failure')&&edge.includes('RECOVERED_STREAM'));
ok("deadline salvages before error",edge.includes('const salvage = bestRecoverableReply()')&&edge.includes('RECOVERED_DEADLINE'));
ok("recovery still rejects unfinished reply",edge.includes('liveReplyLooksComplete')&&edge.includes('reply.length < 18'));
ok("live recovery masks transient provider internals",edge.includes('transient ? "Velvet couldn\'t finish this reply right now. Retry in a moment." : rawError'));
ok("3.49.3 remains regression",(pkg.scripts?.["stability:lab"]||"").includes("verify:v3493"));
ok("3.49.4 runs first in lab",(pkg.scripts?.["stability:lab"]||"").startsWith("npm run verify:v3494"));
let failed=0; for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.4 generation-recovery checks passed.`); if(failed)process.exit(1);
