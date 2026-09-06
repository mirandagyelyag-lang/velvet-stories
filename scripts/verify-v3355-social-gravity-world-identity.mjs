import fs from "node:fs";
import { compileStoryContract, storyContractPrompt } from "../supabase/functions/character-chat/engine/story-contract.ts";
import { deriveSocialWorldIdentity, socialGravityIssues, socialWorldFootprint, outsideApproachFootprint } from "../supabase/functions/character-chat/engine/social-gravity-world-identity.ts";

const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const edge=read("supabase/functions/character-chat/index.ts");
const contractSource=read("supabase/functions/character-chat/engine/story-contract.ts");
const socialSource=read("supabase/functions/character-chat/engine/social-gravity-world-identity.ts");
let pass=0,total=0;
const check=(name,ok)=>{total++;console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;};

check("version 3.35.5+ descendant",(/^3\.35\.(?:5|[6-9]|[1-9]\d+)$/.test(pkg.version)||/^3\.(?:3[6-9]|[4-9]\d)\./.test(pkg.version))&&(/^3\.35\.(?:5|[6-9]|[1-9]\d+)$/.test(pub.version)||/^3\.(?:3[6-9]|[4-9]\d)\./.test(pub.version)));
check("Social Gravity release preserved",edge.includes("v3.35.5 SOCIAL GRAVITY + WORLD IDENTITY"));
check("stability lab retains v3355",pkg.scripts["stability:lab"].includes("npm run verify:v3355"));
check("social identity engine imported by story contract",contractSource.includes("deriveSocialWorldIdentity")&&contractSource.includes("socialGravityWorldIdentityEngine"));
check("validator imported by edge",edge.includes("socialGravityIssues")&&edge.includes("social-gravity-world-identity.ts"));
check("repair triggers promoted",["social_gravity_missing","romantic_social_gravity_missing","admirer_instantly_neutralized","profile_social_ecosystem_missing","world_identity_manifestation_missing","outside_attention_missing","domain_life_continuity_missing","ship_bubble_auto_neutralization"].every((x)=>edge.includes(`\"${x}\"`)));
check("quality self-check covers world identity",["world_identity_ok","social_gravity_ok","outside_attention_ok","domain_life_ok"].every((x)=>edge.includes(x)));
check("profile identity is hard canon in prompt",edge.includes("WORLD MEMORY, NOT EXPOSITION")&&edge.includes("RELATIONSHIP DOES NOT CANCEL REPUTATION")&&edge.includes("NO PROTAGONIST BUBBLE"));
check("system instruction carries v3355",edge.includes("v3.35.5 SOCIAL GRAVITY + WORLD IDENTITY"));
check("persistent behavior can remember social identity effects",["world_identity_signature","recognition_domains","reputation_signature","outside_attention_pattern","active_life_domains","social_gravity_last_effect"].every((x)=>edge.includes(x)));

const roman={name:"Roman",role:"Feared and respected underground street racer",description:"He is well-known around the university and feared and respected in the underground racing scene.",world:"University campus and underground street-racing circles."};
const romanIdentity=deriveSocialWorldIdentity(roman);
check("Roman keeps racing domain",romanIdentity.domains.some((d)=>d.key==="racing"));
check("Roman keeps campus recognition domain",romanIdentity.domains.some((d)=>d.key==="campus"));
check("Roman carries feared/respected social effect",romanIdentity.fearedRespect&&romanIdentity.socialEffects.some((x)=>/make room|careful|deference|caution/i.test(x)));
check("Roman recognition is not ordinary",romanIdentity.recognitionLevel!=="ordinary");

const damon={name:"Damon",role:"Multimillionaire heir",description:"Everyone at the university knows who he is because of his family wealth and status.",world:"Elite private university."};
const damonIdentity=deriveSocialWorldIdentity(damon);
check("Damon keeps wealth domain",damonIdentity.domains.some((d)=>d.key==="wealth"));
check("Damon keeps campus fame",damonIdentity.domains.some((d)=>d.key==="campus")&&["campus-famous","well-known","public-figure"].includes(damonIdentity.recognitionLevel));

const chase={name:"Chase Beaumont",role:"Campus Heartthrob",description:"The campus heartthrob. Everyone knows him and people regularly flirt with him or try to get his attention.",world:"Private university campus."};
const chaseIdentity=deriveSocialWorldIdentity(chase);
check("Chase has romantic magnetism",chaseIdentity.romanticMagnetism===true);
check("Chase has campus social gravity",chaseIdentity.domains.some((d)=>d.key==="campus")&&chaseIdentity.approachTypes.some((x)=>/flirt|attention/i.test(x)));

const alexander={name:"Alexander",role:"Popular university student",description:"Very attractive and well-known; women often approach and flirt with him.",world:"University campus."};
check("Alexander outside attention survives profile parsing",deriveSocialWorldIdentity(alexander).romanticMagnetism===true);

const theo={name:"Theo",role:"Campus Prince and polo captain",description:"One of the most recognizable students at the private university.",world:"Private university and polo club."};
const theoIdentity=deriveSocialWorldIdentity(theo);
check("Theo keeps campus + athletics identity",theoIdentity.domains.some((d)=>d.key==="campus")&&theoIdentity.domains.some((d)=>d.key==="athletics"));

const base={userName:"Antonia",turnIntent:{kind:"ordinary"},memories:[],persistentCast:[],castState:{},storyBible:[],castConnections:[],calendarEvents:[],canonCorrections:[],storyArcs:[],knowledgeLedger:[],storyConsequences:[],chemistryProfiles:[],storyPlans:[],storyConflicts:[],storyMilestones:[],developmentState:{},relationshipState:{},storyChapters:[],activeChapter:{},writingPreferences:{},intelligenceState:{}};
const quietCampusReplies=[
  {sender:"character",content:"Chase sat across from her and looked over the menu before answering in a low voice."},
  {sender:"character",content:"He kept talking to Antonia while the cafeteria stayed busy around them, never looking away from the table."},
  {sender:"character",content:"Chase answered her question and reached for his drink, the conversation staying entirely between them."},
  {sender:"character",content:"He leaned back and kept the conversation going without anyone else entering the beat."},
];
const chaseContract=compileStoryContract({...base,character:chase,latestUserMessage:"You are quiet today",sceneState:{location:"campus cafeteria",present:["Antonia","Chase"]},recentMessages:quietCampusReplies});
check("public anonymous streak makes social manifestation due",chaseContract.socialGravityWorldIdentityEngine.manifestationDue===true);
check("heartthrob anonymous streak opens outside-approach window",chaseContract.socialGravityWorldIdentityEngine.approachWindowDue===true);
check("turn objective explicitly carries due social gravity",/social-gravity manifestation/i.test(chaseContract.turnObjective));
const chaseIssues=socialGravityIssues({reply:'Chase looked at her. "Just tired."',recentCharacterReplies:quietCampusReplies.map((x)=>x.content),character:chase,engine:chaseContract.socialGravityWorldIdentityEngine});
check("missing world manifestation detected",chaseIssues.includes("world_identity_manifestation_missing"));
check("missing outside attention detected",chaseIssues.includes("outside_attention_missing"));
const socialReply='A girl from another table came over and smiled at Chase. "Hey, are you coming to the thing later?" Chase looked up at her before answering.';
check("organic approach counts as social footprint",socialWorldFootprint(socialReply)&&outsideApproachFootprint(socialReply));
const chaseResolved=socialGravityIssues({reply:socialReply,recentCharacterReplies:[],character:chase,engine:{...chaseContract.socialGravityWorldIdentityEngine,manifestationDue:true,approachWindowDue:true}});
check("organic outside interaction clears missing-gravity issues",!chaseResolved.includes("world_identity_manifestation_missing")&&!chaseResolved.includes("outside_attention_missing"));

const romanLife=compileStoryContract({...base,character:roman,latestUserMessage:"What have you been up to lately?",sceneState:{location:"campus cafe",present:["Antonia","Roman"]},recentMessages:[{sender:"character",content:"Roman had been around campus most of the week, keeping to himself."}]});
check("life question reactivates Roman racing domain",romanLife.socialGravityWorldIdentityEngine.lifeContinuityDue===true&&romanLife.socialGravityWorldIdentityEngine.lifeDomains.some((x)=>/race|racing|garage|crew|driver|track/i.test(x)));
const genericLife=socialGravityIssues({reply:'"Same stuff. Classes, mostly."',recentCharacterReplies:[],character:roman,engine:romanLife.socialGravityWorldIdentityEngine});
check("generic life answer can be flagged when role vanished",genericLife.includes("domain_life_continuity_missing"));
const racingLife=socialGravityIssues({reply:'"Been at the garage more than campus. Car needed work."',recentCharacterReplies:[],character:roman,engine:romanLife.socialGravityWorldIdentityEngine});
check("grounded racing-life answer satisfies domain continuity",!racingLife.includes("domain_life_continuity_missing"));

const bubble='Another girl came over and flirted with Chase, but he barely acknowledged her, his attention never leaving Antonia.';
const bubbleIssues=socialGravityIssues({reply:bubble,recentCharacterReplies:[],character:chase,engine:{manifestationDue:false,approachWindowDue:false,lifeContinuityDue:false}});
check("ship bubble auto-neutralization detected",bubbleIssues.includes("ship_bubble_auto_neutralization"));

const prompt=storyContractPrompt(chaseContract);
check("compact story contract exposes social world identity",/socialWorldIdentity/i.test(prompt)&&/identitySignature/i.test(prompt));
check("domain fame explicitly scoped",socialSource.includes("Domain fame is scoped")||edge.includes("DOMAIN-SCOPED FAME"));
check("no forced crowd spectacle",edge.includes("one small footprint is enough")&&edge.includes("Do not turn every public scene into a crowd scene"));
check("existing social gravity detectors now spend repair",edge.includes('"romantic_social_gravity_missing"')&&edge.includes('"profile_social_ecosystem_missing"'));

console.log(`\n${pass}/${total} Social Gravity + World Identity checks passed.`);
if(pass!==total)process.exit(1);
