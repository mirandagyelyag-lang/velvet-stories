import fs from "node:fs";
import { buildVoiceAuditDirectiveV34911, voiceAuditV34911Issues, voiceFingerprintV34911 } from "../supabase/functions/character-chat/engine/character-voice-audit-v34911.ts";
const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const engine=fs.readFileSync("supabase/functions/character-chat/engine/character-voice-audit-v34911.ts","utf8");

ok("v3.49.11 verifier registered",Boolean(pkg.scripts?.["verify:v34911"]));
ok("voice audit engine imported by Edge",edge.includes('character-voice-audit-v34911.ts')&&edge.includes("buildVoiceAuditDirectiveV34911"));
ok("prompt contains Voice Audit 2.0",edge.includes("CHARACTER VOICE AUDIT 2.0 / v3.49.11"));
ok("audit receives recent replies",edge.includes("recentReplies: recentCharacterRepliesForVoice"));
ok("audit receives supporting cast for collision watch",edge.includes("cast: supportingCast"));
ok("generic clone patterns are explicit",engine.includes("GENERIC_CLONE_PATTERNS")&&engine.includes("don't tempt me")&&engine.includes("you have no idea"));
ok("fingerprint has multiple independent dimensions",["length","humor","directness","register","fragments","questions","affection","conflict","tells","avoid"].every(x=>engine.includes(`${x}:`)));
ok("blind name-removal test is in directive",engine.includes("identity must survive name removal")&&engine.includes("could be reassigned to another character"));
ok("cast voice collision is explicitly guarded",engine.includes("Cast collision watch"));
ok("length drift is detected",edge.includes("voice_length_identity_drift_v34911"));
ok("question drift is detected",edge.includes("voice_question_identity_drift_v34911"));
ok("emotional fluency drift is detected",edge.includes("voice_emotional_fluency_drift_v34911"));
ok("opening shape repetition is detected",edge.includes("voice_opening_shape_repeat_v34911"));
ok("register drift is detected",edge.includes("voice_register_drift_v34911"));
ok("generic clone cadence is detected",edge.includes("voice_clone_generic_cadence_v34911"));
ok("voice issues affect naturalness score",edge.includes('voiceAuditScoreIssuesV34911.includes("voice_clone_generic_cadence_v34911")')&&edge.includes('voiceAuditScoreIssuesV34911.includes("voice_emotional_fluency_drift_v34911")')&&edge.includes('voiceAuditScoreIssuesV34911.includes("voice_register_drift_v34911")'));
ok("voice issues trigger repair",edge.includes("REPAIR_TRIGGER_ISSUES")&&edge.includes('"voice_register_drift_v34911"'));
ok("repair instructions preserve identity rather than generic polish",edge.includes("Fail the name-removal clone test")&&edge.includes("Remove unearned emotional fluency"));

const guarded={name:"Rowan",speech_style:"terse, guarded, fragments, few words; rarely asks questions",conflict_style:"deflects and withdraws under pressure",affection_style:"shows care through practical actions",voice_avoidances:"therapy language, polished romantic declarations",example_dialogue:'CASUAL: "Yeah. Sure."'};
const fp=voiceFingerprintV34911(guarded);
ok("runtime fingerprint recognizes compact guarded low-question voice",fp.length==="compact"&&fp.directness==="guarded"&&fp.questions==="low");
const directive=buildVoiceAuditDirectiveV34911({character:guarded,recentReplies:['"Yeah. Fine."','"Not doing this here."'],cast:[{id:"2",name:"Chase"}]});
ok("runtime directive includes collision target and recent calibration",directive.includes("Chase")&&directive.includes("avg spoken words"));
const issues=voiceAuditV34911Issues({reply:'"You are impossible. What am I supposed to do with you? Tell me what you need emotionally?"',character:guarded,recentReplies:['"Yeah. Fine."','"Not doing this here."']});
ok("runtime clone/question drift is caught",issues.includes("voice_clone_generic_cadence_v34911")&&issues.includes("voice_question_identity_drift_v34911"));
const longReply=`"${Array.from({length:90},()=>"word").join(" ")}."`;
ok("runtime compact character rejects oversized spoken turn",voiceAuditV34911Issues({reply:longReply,character:guarded}).includes("voice_length_identity_drift_v34911"));

let failed=0; for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.11 Character Voice Audit 2.0 checks passed.`); if(failed)process.exit(1);
