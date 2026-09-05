import fs from "node:fs";
import { compileStoryContract } from "../supabase/functions/character-chat/engine/story-contract.ts";

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
const v332=read("scripts/verify-v3320-perception-knowledge-realism.mjs");
const semverAtLeast=(value,minimum)=>{const a=String(value||"").split(".").map(Number),b=String(minimum||"").split(".").map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};

const base={
  character:{name:"Rowan",personality:"quiet, guarded, dry, not chatty",speech_style:"brief, contractions, comfortable silence",relationship:"friends"},
  userName:"Antonia",
  turnIntent:{kind:"ordinary",isQuestion:false,medium:"in_person",silentCount:0},
  sceneState:{location:"library",present:["Rowan","Antonia"],communication_medium:"in_person"},
  recentMessages:[],
  latestUserMessage:"Okay",
  intelligenceState:{},
};
const micro=compileStoryContract(base);
const direct=compileStoryContract({...base,latestUserMessage:"What did you do today?",turnIntent:{kind:"direct_question",isQuestion:true,medium:"in_person",silentCount:0}});
const action=compileStoryContract({...base,latestUserMessage:"*I nod*"});
const group=compileStoryContract({...base,sceneState:{location:"cafeteria",present:["Rowan","Antonia","Jules","Theo"]},latestUserMessage:"Okay"});
const questions=compileStoryContract({...base,recentMessages:[
  {sender:"character",content:'"You good?"'},
  {sender:"user",content:"Yeah."},
  {sender:"character",content:'"You sure?"'},
  {sender:"user",content:"Mhm."},
],latestUserMessage:"Okay"});
const threads=compileStoryContract({...base,intelligenceState:{conversation_threads:["unfinished question about the party","awkward subject: Jules"]},latestUserMessage:"About the party..."});

const checks=[
  ["version >= 3.33.0",semverAtLeast(pkg.version,"3.33.0")&&semverAtLeast(pub.version,"3.33.0")],
  ["release metadata preserves Human Turn-Taking",typeof pub.release==="string"&&pub.release.trim().length>0&&edge.includes("v3.33 HUMAN TURN-TAKING")],
  ["stability lab includes v3330",pkg.scripts["stability:lab"].includes("verify:v3330")],
  ["turn-taking engine exists",contractSource.includes("function buildTurnTakingEngine")],
  ["micro turns are classified",micro.turnTakingEngine.mode==="micro"],
  ["micro turns get compact scale",/1-3 short spoken lines|10-55 words/.test(micro.turnTakingEngine.responseScale)],
  ["direct question enters answer-first mode",direct.turnTakingEngine.mode==="direct_answer"&&/first spoken clause/.test(direct.turnTakingEngine.responseScale)],
  ["action-only turn can stay tiny",action.turnTakingEngine.mode==="action_only"&&/0-2 spoken lines/.test(action.turnTakingEngine.responseScale)],
  ["quiet profile has low dominance",micro.turnTakingEngine.dominance==="low"],
  ["quiet profile tolerates silence",micro.turnTakingEngine.silenceTolerance==="high"],
  ["group traffic stays sparse",group.turnTakingEngine.mode==="group"&&group.turnTakingEngine.maxSpeakers===2],
  ["question streak suppresses another question",questions.turnTakingEngine.questionPolicy.startsWith("0 questions preferred")],
  ["conversation threads persist into contract",threads.turnTakingEngine.activeThreads.includes("unfinished question about the party")],
  ["matching old thread can return",threads.turnTakingEngine.returnThread==="unfinished question about the party"],
  ["system instruction names v3.33",edge.includes("v3.33 HUMAN TURN-TAKING")],
  ["main prompt names conversation rhythm",edge.includes("HUMAN TURN-TAKING + CONVERSATION RHYTHM 3.33")],
  ["no compulsory follow-up rule is explicit",edge.includes("NO COMPULSORY FOLLOW-UP")],
  ["group traffic control is explicit",edge.includes("GROUP TRAFFIC CONTROL")],
  ["conversation thread metadata is persisted",edge.includes("conversation_threads_add")&&edge.includes("conversation_threads_resolve")&&edge.includes("conversation_threads: conversationThreads")],
  ["turn-taking quality flags exist",edge.includes("turn_taking_ok")&&edge.includes("group_turn_ownership_ok")&&edge.includes("micro_response_ok")],
  ["micro padding detector exists",edge.includes("hasMicroTurnPadding")&&edge.includes("micro_turn_padding")],
  ["compulsory question detector exists",edge.includes("hasCompulsoryFollowupQuestion")&&edge.includes("compulsory_followup_question")],
  ["forced topic shift detector exists",edge.includes("hasForcedTopicShift")&&edge.includes("forced_topic_shift")],
  ["answer-before-flourish detector exists",edge.includes("hasAnswerBeforeFlourishViolation")&&edge.includes("answer_before_flourish_violation")],
  ["v3.32 verifier accepts newer versions",v332.includes("version >= 3.32.0")],
];
let pass=0;
for(const [label,ok] of checks){if(ok)pass++; console.log(`${ok?"PASS":"FAIL"} ${label}`)}
console.log(`\n${pass}/${checks.length} Human Turn-Taking checks passed.`);
if(pass!==checks.length)process.exit(1);
