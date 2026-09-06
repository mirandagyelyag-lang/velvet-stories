import fs from "node:fs";
import {
  hasNarrationPovFlip,
  hasRandomActivityFiller,
  hasFakeSharedDayHistory,
  hasGestureBudgetOverflow,
  hasObligatoryBanterExit,
  hasIntentThreadAbandonment,
  intentSubtextIssues,
  sanitizeIntentSubtextReply,
} from "../supabase/functions/character-chat/engine/intent-subtext-lock.ts";
import { compileStoryContract, storyContractPrompt } from "../supabase/functions/character-chat/engine/story-contract.ts";

const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
let pass=0,total=0;
const check=(name,ok)=>{ total++; console.log(`${ok?"PASS":"FAIL"} ${name}`); if(ok) pass++; };

check("version 3.35.4+ descendant",(/^3\.35\.(?:4|[5-9]|[1-9]\d+)$/.test(pkg.version)||/^3\.(?:3[6-9]|[4-9]\d)\./.test(pkg.version))&&(/^3\.35\.(?:4|[5-9]|[1-9]\d+)$/.test(pub.version)||/^3\.(?:3[6-9]|[4-9]\d)\./.test(pub.version)));
check("Character Intent + Subtext preserved",edge.includes("CHARACTER INTENT + SUBTEXT 3.35.4"));
check("deterministic intent lock imported",edge.includes("intentSubtextIssues")&&edge.includes("sanitizeIntentSubtextReply"));
check("stability lab retains v3354",pkg.scripts["stability:lab"].includes("npm run verify:v3354"));
check("hard intent issue classes wired",["narration_pov_flip","random_activity_filler","fake_shared_day_history","gesture_budget_overflow","obligatory_banter_exit","intent_thread_abandoned"].every((x)=>edge.includes(`\"${x}\"`)));
check("quality self-check includes new intent booleans",["character_intent_ok","subtext_persistence_ok","pov_consistency_ok","filler_restraint_ok","gesture_budget_ok","banter_exit_ok"].every((x)=>edge.includes(x)));

const recentThird=[
  `Alex didn't even look up from his phone. "Take your time."`,
  `Alex didn't bother looking up, just slid the menu toward you. "Twenty minutes is basically on time for you."`,
];
check("Alex first/third POV flip detected",hasNarrationPovFlip(`I look up finally, meeting your eyes. "I figured you might need an excuse."`,recentThird,"Alex","third"));
check("stable third-person narration passes",!hasNarrationPovFlip(`Alex finally looked up. "I was hungry."`,recentThird,"Alex","third"));

const waiter=`Alex didn't press it, just turned the laminated page. A couple at the next table glanced over when the student waiter dropped a tray of glassware with a sharp clatter.`;
check("random waiter/tray filler after Hmm right detected",hasRandomActivityFiller(waiter,"Hmm, right",[],recentThird,{name:"Alex"},[]));
check("grounded waiter does not trip filler lock",!hasRandomActivityFiller(`The waiter returned with the tray. "Fries?"`,"Hmm, right",["The waiter said our order would be ready soon."],recentThird,{name:"Alex"},[]));

const fakeHistory=`"Honestly, with the luck we've been having today, I'm surprised they didn't throw the whole tray at us."`;
check("fake shared-day history detected",hasFakeSharedDayHistory(fakeHistory,[],recentThird,[]));
check("established rough day permits shared-day reference",!hasFakeSharedDayHistory(fakeHistory,["This has been such a rough day for both of us."],recentThird,[]));

const alexLong=`I let out a breath, the faint tension in my shoulders relaxing just enough as I looked at you. I pushed the menu away, leaning back in my chair while I shook my head, a small, genuine smile finally reaching my eyes. "Not mad, just hungry." "You're still paying for the fries, though."`;
check("Alex gesture choreography exceeds short-turn budget",hasGestureBudgetOverflow(alexLong,"Why are you so mad? Just fries"));
check("serious-answer compulsory banter ending detected",hasObligatoryBanterExit(alexLong,"Why are you so mad? Just fries"));
check("plain serious answer does not require quip",!hasObligatoryBanterExit(`Alex looked at you. "I'm not mad. I'm tired."`,"Why are you so mad?"));
check("active intent cannot be replaced by ambient filler",hasIntentThreadAbandonment(waiter,"Hmm, right",{sceneObjective:"explain why he called her",subtextThread:"wanted to see her"}));

const combined=intentSubtextIssues({reply:alexLong,latestUserMessage:"Why are you so mad? Just fries",recentCharacterReplies:recentThird,character:{name:"Alex"},intent:{povMode:"third",sceneObjective:"explain why he called her",subtextThread:"wanted to see her"}});
check("combined guard sees POV flip",combined.includes("narration_pov_flip"));
check("combined guard sees gesture overflow",combined.includes("gesture_budget_overflow"));
check("combined guard sees banter exit",combined.includes("obligatory_banter_exit"));
const cleaned=sanitizeIntentSubtextReply(alexLong,combined);
check("sanitizer removes POV-flipped narration when dialogue exists",!/^I\s/i.test(cleaned)&&cleaned.includes("Not mad"));
check("sanitizer removes compulsory fries quip",!/still paying/i.test(cleaned));

const baseInput={
  character:{name:"Alex",role:"student",personality:"guarded, dry, reserved"},
  userName:"Antonia",turnIntent:{kind:"ordinary"},sceneState:{location:"cafe",present:["Antonia","Alex"]},
  memories:[],persistentCast:[],castState:{},storyBible:[],castConnections:[],calendarEvents:[],canonCorrections:[],storyArcs:[],knowledgeLedger:[],storyConsequences:[],chemistryProfiles:[],storyPlans:[],storyConflicts:[],storyMilestones:[],developmentState:{},relationshipState:{},storyChapters:[],activeChapter:{},writingPreferences:{},
};
const contract=compileStoryContract({...baseInput,latestUserMessage:"Why did you call me?",recentMessages:[{sender:"character",content:recentThird[0]},{sender:"character",content:recentThird[1]}],intelligenceState:{human_behavior_state:{scene_objective:"get a meal with Antonia",concealed_want:"wanted to see Antonia",subtext_thread:"wanted to see Antonia",admission_stage:"guarded"},character_mind:{private_intention:"wanted to see Antonia"}}});
check("contract exposes Character Intent engine",Boolean(contract.characterIntentEngine?.sceneObjective));
check("existing scene objective survives",contract.characterIntentEngine.sceneObjective==="get a meal with Antonia");
check("concealed want survives",contract.characterIntentEngine.concealedWant==="wanted to see Antonia");
check("direct why-call question advances only to partial",contract.characterIntentEngine.admissionStage==="partial");
check("POV mode inferred as third",contract.characterIntentEngine.povMode==="third");
check("short turn gesture budget is one",contract.characterIntentEngine.gestureBudget===1);

const follow=compileStoryContract({...baseInput,latestUserMessage:"Hmm, right",recentMessages:[{sender:"user",content:"Why did you call me?"},{sender:"character",content:`Alex looked up. "Wanted food. And you were nearby."`},{sender:"user",content:"Hmm, right"}],intelligenceState:{human_behavior_state:{scene_objective:"explain why he called Antonia",immediate_want:"keep her at the table",concealed_want:"wanted to see Antonia",subtext_thread:"wanted to see Antonia",admission_stage:"partial"},character_mind:{private_intention:"wanted to see Antonia"}}});
check("minimal skeptical reply preserves scene objective",follow.characterIntentEngine.sceneObjective==="explain why he called Antonia");
check("minimal skeptical reply preserves subtext",follow.characterIntentEngine.subtextThread==="wanted to see Antonia");
check("admission ladder can progress without forced confession",["partial","plain"].includes(follow.characterIntentEngine.admissionStage));
check("filler policy explicitly bans random incidents",/No random activity filler/i.test(follow.characterIntentEngine.fillerPolicy));
const prompt=storyContractPrompt(follow);
check("compact story prompt carries Character Intent causal state",/Character Intent \+ Subtext/i.test(prompt)&&/random ambient incidents cannot substitute for motive/i.test(prompt));
check("edge prompt names WANT as scene spine",edge.includes("WANT GIVES THE SCENE A SPINE"));
check("hidden state persists scene objective and POV",edge.includes("scene_objective")&&edge.includes("pov_narration_mode")&&contractSource.includes("intentPersistence"));

console.log(`\n${pass}/${total} Character Intent + Subtext checks passed.`);
if(pass!==total) process.exit(1);
