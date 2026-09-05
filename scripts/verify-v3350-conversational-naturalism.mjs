import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const diag=read("src/pages/Diagnostics.jsx");
const old=read("scripts/verify-v3341-canon-doctor-repair.mjs");
const checks=[
 ["version 3.35.0",pkg.version==="3.35.0"&&pub.version==="3.35.0"],
 ["release metadata",pub.release.includes("Conversational Naturalism")],
 ["live naturalism director",edge.includes("buildConversationalNaturalismDirector")&&edge.includes("CONVERSATIONAL NATURALISM 2.0 / v3.35 — LIVE SPEECH DIRECTOR")],
 ["sentence DNA",edge.includes("Sentence DNA:")&&edge.includes("sentenceDna")],
 ["question personality",edge.includes("QUESTION PERSONALITY")&&edge.includes("hasQuestionPersonalityMismatchV2")],
 ["anti support ticket",edge.includes("ANTI-SUPPORT-TICKET")&&edge.includes("hasSupportTicketConversationV2")],
 ["thought carryover 2",edge.includes("THOUGHT CARRYOVER 2.0")&&edge.includes("thoughtCarryover")],
 ["interruptions self corrections",edge.includes("INTERRUPTIONS + SELF-CORRECTIONS")],
 ["vocabulary ownership 2",edge.includes("VOCABULARY OWNERSHIP 2.0")&&edge.includes("hasVocabularyOwnershipViolationV2")],
 ["anti generic attractive voice",edge.includes("ANTI-GENERIC ATTRACTIVE-GUY ENGINE")&&edge.includes("hasGenericAttractiveGuyCadenceV2")],
 ["anti therapist 2",edge.includes("ANTI-THERAPIST 2.0")&&edge.includes("hasTherapistCarePackageV2")],
 ["voice performance stack detector",edge.includes("hasVoicePerformanceStackV2")],
 ["conflict affection jealousy voice",edge.includes("CONFLICT/AFFECTION/JEALOUS VOICE")],
 ["public private voice retained",edge.includes("Public/private voice:")],
 ["short input scale",edge.includes("micro input: 0-2 spoken lines")],
 ["dialogue learning stronger",edge.includes("statement-ending frequency")&&edge.includes("thought carryover after interruption")],
 ["same scene lab 2",diag.includes("Same Scene Voice Lab 2.0")&&edge.includes("BLIND VOICE TEST 2.0")],
 ["quality schema upgraded",edge.includes("conversation_naturalism_ok")&&edge.includes("vocabulary_ownership_ok")&&edge.includes("speech_asymmetry_ok")],
 ["naturalism failures repairable",edge.includes('"support_ticket_conversation"')&&edge.includes('"generic_attractive_guy_cadence"')&&edge.includes('"vocabulary_ownership_violation"')],
 ["slow speech state persisted",edge.includes("conversational_naturalism_signature")&&edge.includes("question_personality")&&edge.includes("thought_carryover_style")],
 ["v3341 regression still present",old.includes("UUID story revision rotation")],
 ["stability lab starts with v3350",pkg.scripts["stability:lab"].startsWith("npm run verify:v3350")],
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;}
console.log(`\n${pass}/${checks.length} Conversational Naturalism 2.0 checks passed.`);if(pass!==checks.length)process.exit(1);
