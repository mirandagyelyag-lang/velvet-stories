import fs from "node:fs";
import { compileStoryContract, storyContractPrompt } from "../supabase/functions/character-chat/engine/story-contract.ts";
import { deriveEmbodiedAwarenessSalience, embodiedAwarenessIssues, sanitizeEmbodiedAwarenessReply } from "../supabase/functions/character-chat/engine/embodied-awareness-salience.ts";
const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const contract=read("supabase/functions/character-chat/engine/story-contract.ts");
let pass=0,total=0; const check=(n,ok)=>{total++;console.log(`${ok?"PASS":"FAIL"} ${n}`);if(ok)pass++;};
check("version 3.36.1",pkg.version==="3.36.1"&&pub.version==="3.36.1");
check("release metadata",/Embodied Awareness/i.test(pub.release));
check("v3361 first stability gate",pkg.scripts["stability:lab"].startsWith("npm run verify:v3361"));
check("engine imported by story contract",contract.includes("deriveEmbodiedAwarenessSalience")&&contract.includes("embodiedAwarenessSalience"));
check("validator imported by edge",edge.includes("embodiedAwarenessIssues")&&edge.includes("sanitizeEmbodiedAwarenessReply"));
check("privacy carveout exists",/EMBODIED STATE EXCEPTION FOR PACING/i.test(edge));
check("embodied salience outranks chemistry in compact prompt",/EMBODIED SALIENCE/.test(contract)&&/outranks relationship performance/i.test(contract));
check("hard embodied issue classes wired",["embodied_state_ignored","banter_overrides_embodied_state","chemistry_overrides_embodied_state","care_hijacks_user_agency","private_embodied_label_claim"].every(x=>edge.includes(`\"${x}\"`)));
check("quality flags registered",["embodied_awareness_ok","state_salience_ok","care_agency_ok","chemistry_priority_ok"].every(x=>edge.includes(x)));

const first=deriveEmbodiedAwarenessSalience({latestUserMessage:"*i node, i was sleepy*",recentMessages:[]});
check("asterisked sleepiness becomes embodied state",first.state==="low_energy"&&first.source==="authored_state");
check("private bodily wording stays private",first.exactLabelPrivate===true);
check("one mild authored cue does not force melodrama",first.intensity>=1&&first.intensity<=2);

const repeated=deriveEmbodiedAwarenessSalience({latestUserMessage:"*i was getting sleepy*",recentMessages:[
  {sender:"user",content:"Are you gonna eat the fries with me or they'll be just mine?"},
  {sender:"character",content:'"All yours."'},
  {sender:"user",content:"*i node, i was sleepy*"},
  {sender:"character",content:'"Good. I was worried you would leave me with ketchup."'},
]});
check("repeated sleepiness becomes recognition due",repeated.state==="low_energy"&&repeated.recognitionDue===true);
check("repeated sleepiness carries salience debt",repeated.salienceDebt>=1);
check("getting sleepy escalates trend",repeated.trend==="escalating"||repeated.trend==="persistent");

const ignored='I shift my gaze from the menu to you. "It\'s a full-time job, but someone\'s gotta do it. Besides, you\'re usually doing something worth remembering."';
const ignoredIssues=embodiedAwarenessIssues({reply:ignored,engine:repeated});
check("Alex exact sleepy regression detects ignored state",ignoredIssues.includes("embodied_state_ignored"));
check("Alex exact sleepy regression detects banter override",ignoredIssues.includes("banter_overrides_embodied_state"));
check("Alex exact sleepy regression detects chemistry override",ignoredIssues.includes("chemistry_overrides_embodied_state"));
const good='"You fading on me?"';
check("tentative low-energy acknowledgment passes",!embodiedAwarenessIssues({reply:good,engine:repeated}).includes("embodied_state_ignored"));
check("direct hidden label claim is blocked",embodiedAwarenessIssues({reply:'"You\'re sleepy."',engine:repeated}).includes("private_embodied_label_claim"));
check("tentative perception does not expose hidden label",!embodiedAwarenessIssues({reply:'"You look like you\'re fading."',engine:repeated}).includes("private_embodied_label_claim"));

const observed=deriveEmbodiedAwarenessSalience({latestUserMessage:"*i yawn and rub my eyes*",recentMessages:[]});
check("visible fatigue cue is observable",observed.state==="low_energy"&&observed.observableSignals.length>0);
check("observable cue removes hidden-label restriction",observed.exactLabelPrivate===false);

const cold=deriveEmbodiedAwarenessSalience({latestUserMessage:"*i was freezing and shivering*",recentMessages:[{sender:"user",content:"*i was cold earlier*"}]});
check("cold state has its own salience",cold.state==="cold"&&cold.recognitionDue===true);
const sick=deriveEmbodiedAwarenessSalience({latestUserMessage:"*i got dizzy again*",recentMessages:[{sender:"user",content:"*i was feeling sick*"}]});
check("unwell state persists across turns",sick.state==="unwell"&&sick.recognitionDue===true);
const recovery=deriveEmbodiedAwarenessSalience({latestUserMessage:"I'm awake now, I'm fine",recentMessages:[{sender:"user",content:"*i was getting sleepy*"}]});
check("explicit recovery clears stale state",recovery.state==="none"&&recovery.trend==="recovering");

const hijack=embodiedAwarenessIssues({reply:'I pick you up and carry you home without waiting for an answer.',engine:repeated});
check("care cannot hijack user agency",hijack.includes("care_hijacks_user_agency"));
const sanitized=sanitizeEmbodiedAwarenessReply(ignored,ignoredIssues,repeated);
check("deterministic sanitizer injects state acknowledgment",/fading on me|sleepy|tired|awake/i.test(sanitized));
check("deterministic sanitizer strips generic romance performance",!/worth remembering|full-time job/i.test(sanitized));

const input={
  character:{name:"Alex",personality:"dry, guarded, teasing",relationship:"friends"},userName:"Antonia",
  latestUserMessage:"*i was getting sleepy*",turnIntent:{kind:"ordinary"},sceneState:{location:"restaurant",present:["Antonia","Alex"],activity:"eating"},
  recentMessages:[{sender:"user",content:"*i node, i was sleepy*"},{sender:"character",content:'"Good. I was worried you would leave me with ketchup."'}],
  memories:[],persistentCast:[],castState:{},storyBible:[],castConnections:[],calendarEvents:[],canonCorrections:[],storyArcs:[],knowledgeLedger:[],storyConsequences:[],chemistryProfiles:[],storyPlans:[],storyConflicts:[],storyMilestones:[],developmentState:{relationship_phase:"friends"},relationshipState:{},storyChapters:[],activeChapter:{},writingPreferences:{},intelligenceState:{}
};
const compiled=compileStoryContract(input);
check("compiled contract exposes embodied engine",compiled.embodiedAwarenessSalience?.state==="low_energy");
check("compiled contract makes recognition due",compiled.embodiedAwarenessSalience?.recognitionDue===true);
check("turn objective prioritizes embodied state",/embodied\/energy change/i.test(compiled.turnObjective));
const prompt=storyContractPrompt(compiled);
check("compact prompt carries embodied state",/embodiedAwareness/i.test(prompt)&&/recognitionDue/i.test(prompt));
check("compact prompt says chemistry cannot outrank state",/outranks relationship performance|do not keep flirting/i.test(prompt));
check("raw draft buffering covers sleepy cues",/sleepy\|getting sleepy/.test(edge));
check("repair directions cover salience failure",/Stop performing banter over the user's current bodily\/energy state/.test(edge));
check("fallback can produce a tiny acknowledgment",sanitizeEmbodiedAwarenessReply("",["embodied_state_ignored"],repeated)==='"You fading on me?"');
console.log(`\n${pass}/${total} Embodied Awareness + Salience checks passed.`); if(pass!==total)process.exit(1);
