import fs from "node:fs";
import { agencyMomentumIssues, sanitizeAgencyMomentumReply } from "../supabase/functions/character-chat/engine/agency-momentum-lock.ts";
import { compileStoryContract } from "../supabase/functions/character-chat/engine/story-contract.ts";

const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
const fixture=JSON.parse(read("scripts/fixtures/v3352-agency-momentum-regression.json"));
let pass=0,total=0;
const check=(name,ok)=>{total++; console.log(`${ok?"PASS":"FAIL"} ${name}`); if(ok) pass++;};

check("version 3.35.2",pkg.version==="3.35.2"&&pub.version==="3.35.2");
check("release metadata",/Character Agency \+ Scene Momentum/i.test(pub.release));
check("deterministic agency lock imported",edge.includes("agencyMomentumIssues")&&edge.includes("sanitizeAgencyMomentumReply"));
check("agency hard failures",["agency_commitment_inertia_break","gratuitous_external_hook","initiative_budget_overflow","forced_scene_continuation_hook"].every((x)=>edge.includes(`\"${x}\"`)));
check("decision frame exists",contractSource.includes("agencyMomentumEngine")&&contractSource.includes("microInitiativeBudget")&&contractSource.includes("closurePolicy"));
check("intent persistence policy",edge.includes("INTENT PERSISTENCE")&&edge.includes("COMMITMENT INERTIA"));
check("no hook compulsion policy",edge.includes("NO HOOK COMPULSION")&&edge.includes("NATURAL ENDINGS ARE VALID"));
check("raw draft remains quarantined",edge.includes("const guardedDraft = true"));

for(const test of fixture){
  const issues=agencyMomentumIssues({
    reply:test.reply,
    latestUserMessage:test.latestUserMessage||"",
    recentUserMessages:test.recentUserMessages||[],
    recentCharacterReplies:test.recentCharacterReplies||[],
    character:test.character||{name:"Rowan",role:"student"},
    groundedAnchors:test.groundedAnchors||[],
  });
  for(const expected of test.expect||[]) check(`${test.name} -> ${expected}`,issues.includes(expected));
  for(const forbidden of test.forbid||[]) check(`${test.name} !-> ${forbidden}`,!issues.includes(forbidden));
  if((test.expect||[]).length){
    const sanitized=sanitizeAgencyMomentumReply(test.reply,issues);
    const remaining=agencyMomentumIssues({
      reply:sanitized,
      latestUserMessage:test.latestUserMessage||"",
      recentUserMessages:test.recentUserMessages||[],
      recentCharacterReplies:test.recentCharacterReplies||[],
      character:test.character||{name:"Rowan",role:"student"},
      groundedAnchors:test.groundedAnchors||[],
    });
    check(`${test.name} sanitizer lowers hard agency violations`,remaining.length < issues.length || sanitized!==test.reply);
  }
}

const contract=compileStoryContract({
  character:{name:"Rowan",role:"student",initiative:70,core_motivation:"keep control",emotional_defense:"deflect"},
  userName:"Antonia",
  latestUserMessage:"Wait—",
  turnIntent:{medium:"in_person"},
  sceneState:{location:"cafe",present:["Antonia","Rowan"],activity:"coffee"},
  recentMessages:[
    {sender:"character",content:"I almost said something, then stopped."},
    {sender:"user",content:"Wait—"}
  ],
  intelligenceState:{character_mind:{private_intention:"tell her why he stayed",want:"finish the thought",avoid:"sounding dramatic"},human_behavior_state:{autonomous_plan:"finish the conversation"}},
});
check("compiled contract carries active intent",Boolean(contract.agencyMomentumEngine?.activeIntent));
check("compiled contract budgets micro initiative",Number(contract.agencyMomentumEngine?.microInitiativeBudget)===1);
check("compiled contract permits ordinary actions",Array.isArray(contract.agencyMomentumEngine?.legitimateActions)&&contract.agencyMomentumEngine.legitimateActions.length>=3);

console.log(`\n${pass}/${total} Character Agency + Scene Momentum checks passed.`);
if(pass!==total) process.exit(1);
