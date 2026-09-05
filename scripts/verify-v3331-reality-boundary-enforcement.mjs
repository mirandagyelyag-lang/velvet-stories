import fs from "node:fs";
import { compileStoryContract, deriveUserSelfReportLock, extractStickyBehaviorBoundaries, sanitizeUserTurnForPerception } from "../supabase/functions/character-chat/engine/story-contract.ts";
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
const v3330=read("scripts/verify-v3330-human-turn-taking.mjs");
const sanitizeCase=sanitizeUserTurnForPerception("*i walk to our usual sit when we waste our time*");
const behavior=extractStickyBehaviorBoundaries([
  {sender:"user",content:"Can you stop being sarcastic?"},
  {sender:"character",content:'"Yeah. Sorry."'},
  {sender:"user",content:"About?"},
],"I don't know what you're talking about");
const selfReport=deriveUserSelfReportLock([{sender:"user",content:"Maybe I'm just tired but I'm okay"}],"I'm fine, really");
const contract=compileStoryContract({
  character:{name:"Rowan",personality:"guarded, dry",relationship:"friends"},
  userName:"Antonia",
  latestUserMessage:"*I take my bag, stand up and leave*",
  turnIntent:{kind:"ordinary",medium:"in_person"},
  sceneState:{location:"library",present:["Rowan","Antonia"],communication_medium:"in_person"},
  recentMessages:[{sender:"user",content:"Can you stop being sarcastic?"}],
});
const checks=[
  ["version >= 3.33.1",Number(pkg.version.split(".")[1])>=33&&Number(pub.version.split(".")[1])>=33],
  ["release metadata",Boolean(pub.release)],
  ["stability lab includes v3331",pkg.scripts["stability:lab"].includes("verify:v3331")],
  ["asterisk sanitizer strips when-clause",/walk to our usual sit/i.test(sanitizeCase)&&!/waste our time/i.test(sanitizeCase)],
  ["sticky sarcasm boundary persists",behavior.some((item)=>/no sarcasm/i.test(item))],
  ["self-report lock activates",/self-reported|authoritative/i.test(selfReport)],
  ["contract marks user leaving",contract.userAuthored.userPresence==="leaving"],
  ["contract carries active behavior boundaries",contract.userAuthored.activeBehaviorBoundaries.some((item)=>/no sarcasm/i.test(item))],
  ["contract source has user presence inference",contractSource.includes("inferUserPresence")],
  ["system instruction names v3.33.1",edge.includes("v3.33.1 REALITY & BOUNDARY ENFORCEMENT")],
  ["persistent boundary detector exists",edge.includes("hasPersistentBehaviorBoundaryViolation")&&edge.includes("persistent_behavior_boundary_violation")],
  ["self-report override detector exists",edge.includes("hasUserSelfReportOverride")&&edge.includes("user_self_report_overridden")],
  ["concrete canon detector exists",edge.includes("hasUnsupportedConcreteCanonInvention")&&edge.includes("unsupported_concrete_canon_invention")],
  ["user exit is deterministic",edge.includes("explicitUserExit")&&edge.includes("present = present.filter")],
  ["continuity guards absent-user respawn",edge.includes("absent_user_reappeared_without_entry")&&edge.includes("user_exit_not_applied")],
  ["repair budget spends on new reality failures",edge.includes('"persistent_behavior_boundary_violation"')&&edge.includes('"unsupported_concrete_canon_invention"')],
  ["v3330 verifier accepts newer versions",v3330.includes("version >= 3.33.0")],
];
let pass=0;for(const [label,ok] of checks){if(ok)pass++;console.log(`${ok?"PASS":"FAIL"} ${label}`)}
console.log(`\n${pass}/${checks.length} Reality & Boundary Enforcement checks passed.`);if(pass!==checks.length)process.exit(1);
