import fs from "node:fs";
const idx=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const eng=fs.readFileSync("supabase/functions/character-chat/engine/banter-answer-gate-v35383.js","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
  [pkg.version==="3.53.83","version"],
  [idx.includes('VELVET_ENGINE_RELEASE = "456"'),"engine release"],
  [idx.includes("buildBanterAnswerGateV35383"),"prompt integration"],
  [idx.includes("banterAnswerGateIssuesV35383"),"validator integration"],
  [idx.includes('"banter_saturation_loop"'),"banter hard repair"],
  [idx.includes('"conversational_answer_gate_miss"'),"answer hard repair"],
  [eng.includes("BANTER SATURATION BARRIER"),"banter prompt"],
  [eng.includes("CONVERSATIONAL ANSWER GATE"),"answer prompt"],
  [eng.includes("repeated_technically_banter"),"technically repetition"],
  [eng.includes("repeated_voice_drop_mannerism"),"voice-drop repetition"]
];
const failed=checks.filter(([ok])=>!ok).map(([,n])=>n);
if(failed.length){console.error("v3.53.83 verification failed:",failed.join(", "));process.exit(1);}
console.log("v3.53.83 banter + answer gates verified");
