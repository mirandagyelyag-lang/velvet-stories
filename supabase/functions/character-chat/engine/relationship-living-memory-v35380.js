const text=(v,n=700)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const arr=(v)=>Array.isArray(v)?v:[];
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
const uniq=(items,max=12)=>{const out=[];for(const item of items){const value=text(item,420);if(!value||out.some(x=>x.toLowerCase()===value.toLowerCase()))continue;out.push(value);if(out.length>=max)break;}return out;};
const low=(v)=>text(v,5000).toLowerCase();

function chemistrySignature(character={}){
  const source=low([character?.name,character?.role,character?.personality,character?.relationship,character?.speech_style,character?.affection_style].join(" "));
  if(/chase|playful|popular|campus|teas|flirt|bold/.test(source))return "electric, playful, socially confident; teasing turns unexpectedly sincere in private";
  if(/roman|rival|danger|intense|controlled|cold/.test(source))return "controlled intensity; small acts carry weight, proximity feels deliberate, vulnerability is rare and costly";
  if(/theo|prince|famous|desired|charming/.test(source))return "public ease with private precision; effortless attention becomes intimate when he stops performing";
  if(/nathan|brother|older|forbidden|restrain|inaccessible/.test(source))return "contained attraction; restraint and boundary-awareness create tension rather than passivity";
  if(/alexander|gentle|warm|real love|steady/.test(source))return "warm specificity; affection appears through reliable choices and noticing details rather than generic sweetness";
  if(/damon|intens/.test(source))return "high emotional voltage with a guarded center; closeness should feel chosen, not automatic";
  return text(character?.affection_style||character?.speech_style||character?.personality||"distinctive chemistry built from this character's profile",360);
}

function classifyStage(s={}){
  const a=clamp(s.attraction),t=clamp(s.trust),c=clamp(s.comfort),m=clamp(s.commitment),v=clamp(s.vulnerability);
  if(m>=72&&t>=62)return "relationship";
  if(m>=48||(t>=62&&v>=55))return "bonded";
  if(a>=65&&c>=46)return "physical-romantic tension";
  if(a>=42)return "attraction";
  if(t>=36||c>=38)return "connection";
  return "early";
}

function detectMilestone(user,reply){
  const both=low(user+" "+reply);
  if(/\b(kiss|kissed|kissing|beso|besó|besame|bésame|besar|besando)\b/.test(both))return "kiss";
  if(/\b(i love you|te amo|love you|in love|enamorad|confess|confes)\b/.test(both))return "love-confession";
  if(/\b(i like you|me gustas|like you)\b/.test(both))return "romantic-confession";
  if(/\b(hold.*hand|took.*hand|tom[oó].*mano|entrelaz)\b/.test(both))return "hand-hold";
  if(/\b(hug|hugged|abrazo|abrazó)\b/.test(both))return "embrace";
  return "";
}

function proximityFromScene(scene={},user="",reply=""){
  const joined=low(user+" "+reply+" "+JSON.stringify(arr(scene?.spatial_relations)));
  if(/kiss|beso|forehead against|frente contra|lips|labios/.test(joined))return "intimate";
  if(/can_touch.*true|within reach|arm.?s reach|centimeter|inch|close enough to touch|junto a|pegad/.test(joined))return "touching-distance";
  if(/beside|next to|a su lado|al lado|near|cerca/.test(joined))return "near";
  if(/across|opposite|otro lado|far|lejos/.test(joined))return "separated";
  return text(scene?.distance||scene?.proximity||"unknown",100);
}

function noticedCue(user=""){
  const u=low(user);
  if(!u)return "";
  if(/\*[^*]*(look away|avoids? .*eye|evit.*mir|apart.*mirada)[^*]*\*/.test(u))return "the user avoided eye contact";
  if(/\b(quiet|callad|silent|silencio|dry|seca|cortante)\b/.test(u))return "the user's energy shifted quieter or more distant";
  if(/\b(change.*subject|cambi.*tema|anyway|da igual|olvídalo|forget it)\b/.test(u))return "the user redirected away from something emotionally loaded";
  if(/\b(jealous|celos|another guy|otro chico|otra persona|with him|con él)\b/.test(u))return "another person entered the emotional field";
  if(/\b(smile|sonr|blush|rubor|laugh|ríe|río|tiembla|shak)\b/.test(u))return "a visible micro-reaction from the user";
  return "";
}

function deltaScores(previous={},user="",reply="",milestone="",behavior={},mind={}){
  const next={attraction:clamp(previous.attraction??20),trust:clamp(previous.trust??18),comfort:clamp(previous.comfort??18),vulnerability:clamp(previous.vulnerability??12),jealousy:clamp(previous.jealousy??8),commitment:clamp(previous.commitment??5)};
  const joined=low(user+" "+reply);
  if(milestone==="kiss"){next.attraction+=4;next.comfort+=2;next.vulnerability+=3;}
  if(milestone.includes("confession")){next.attraction+=3;next.vulnerability+=5;next.commitment+=3;}
  if(/\b(trust you|confío en ti|confio en ti|tell you something|te cuento|honest|sincero|sincera)\b/.test(joined)){next.trust+=3;next.vulnerability+=2;}
  if(/\b(sorry|lo siento|apolog|perdón|perdon)\b/.test(joined))next.trust+=1;
  if(/\b(jealous|celos|another guy|otro chico|with him|con él)\b/.test(joined))next.jealousy+=3;
  if(/\b(no|stop|para|don't|do not|leave me|déjame|dejame)\b/.test(low(user))){next.comfort-=2;next.trust-=1;}
  if(/\b(stay|quédate|quedate|come with me|ven conmigo|choose you|te elijo)\b/.test(joined)){next.commitment+=2;next.comfort+=2;}
  if(text(behavior?.relationship_attraction,100))next.attraction+=1;
  if(text(behavior?.relationship_trust,100))next.trust+=1;
  if(text(mind?.wont_admit,100)||text(mind?.private_intention,100))next.vulnerability+=1;
  Object.keys(next).forEach(k=>next[k]=clamp(next[k]));
  next.stage=classifyStage(next);
  return next;
}

export function deriveRelationshipLivingMemoryV35380({previous={},character={},latestUserMessage="",reply="",mindUpdate={},behaviorUpdate={},relationship={},scene={},recentUserMessages=[],recentCharacterReplies=[],messageId="",isRegeneration=false}={}){
  const base=previous&&typeof previous==="object"?previous:{};
  const milestone=detectMilestone(latestUserMessage,reply);
  const previousScores=base?.scores||{};
  const scores=isRegeneration?{...previousScores,stage:previousScores?.stage||classifyStage(previousScores)}:deltaScores(previousScores,latestUserMessage,reply,milestone,behaviorUpdate,mindUpdate);
  const thoughtCandidates=uniq([mindUpdate?.wont_admit,mindUpdate?.private_intention,mindUpdate?.feared_outcome,mindUpdate?.contradiction_in_play,...arr(base?.private_thoughts).map(x=>x?.thought||x)],8);
  const private_thoughts=thoughtCandidates.map((thought,i)=>({thought,status:"active",weight:Math.max(1,5-i),source:i<4?"current-mind":"carryover"})).slice(0,8);
  const desireCandidates=uniq([behaviorUpdate?.concealed_want,behaviorUpdate?.immediate_want,behaviorUpdate?.active_intent,mindUpdate?.want,mindUpdate?.anticipated_next,mindUpdate?.private_intention,...arr(base?.unfinished_desires).filter(x=>x?.status!=="resolved").map(x=>x?.desire||x)],10);
  const unfinished_desires=desireCandidates.map((desire,i)=>({desire,status:"open",age:i<6?0:Math.min(99,Number(arr(base?.unfinished_desires)[i-6]?.age||0)+1),pressure:Math.max(1,5-Math.floor(i/2))})).slice(0,10);
  const initiativeHistory=arr(base?.initiative?.history).slice(-7);
  initiativeHistory.push({user:Boolean(text(latestUserMessage,30)),character:Boolean(text(reply,30)),message_id:text(messageId,80)});
  const userTurns=arr(recentUserMessages).slice(-4).filter(Boolean).length;
  const charTurns=arr(recentCharacterReplies).slice(-4).filter(Boolean).length;
  const initiative={history:initiativeHistory.slice(-8),user_recent_turns:userTurns,character_recent_turns:charTurns,character_should_take_next_major_move:userTurns>=3||/reactive|low/.test(low(behaviorUpdate?.initiative_profile)),instruction:userTurns>=3?"User has carried enough recent beats. Character should originate the next meaningful move.":"Keep initiative balanced but character-led."};
  const proximity=proximityFromScene(scene,latestUserMessage,reply);
  const cue=noticedCue(latestUserMessage);
  const noticed_cues=uniq([cue,...arr(base?.noticed_cues).map(x=>x?.cue||x)],8).map((x,i)=>({cue:x,freshness:i===0&&cue?"current":"stored"}));
  const oldMilestones=arr(base?.milestones);
  let milestones=oldMilestones;
  if(milestone){const detail=milestone==="kiss"?"Preserve who initiated, physical tone, emotional meaning, immediate aftermath and changed behavior after the kiss.":"Preserve who said or did it, how it landed emotionally, and what changes afterward.";milestones=[...oldMilestones,{type:milestone,message_id:text(messageId,80),detail,salience:milestone==="kiss"?10:9,unresolved_aftereffect:true}].slice(-14);}
  const salient_memories=[...arr(base?.salient_memories).map(x=>({...x,salience:clamp((x?.salience??5)-0.15,1,10)}))];
  if(milestone)salient_memories.push({event:milestone,message_id:text(messageId,80),salience:milestone==="kiss"?10:9,meaning:milestone==="kiss"?"romantic or physical milestone with durable emotional residue":"relationship-defining emotional disclosure"});
  if(cue)salient_memories.push({event:cue,message_id:text(messageId,80),salience:5,meaning:"noticed user cue worth carrying briefly"});
  salient_memories.sort((a,b)=>(b?.salience||0)-(a?.salience||0));
  const delayed_payoffs=arr(base?.delayed_payoffs).map(x=>({...x,age:Math.min(99,Number(x?.age||0)+1),readiness:Number(x?.age||0)>=6?"available":(x?.readiness||"growing")})).slice(-8);
  const newHook=text(behaviorUpdate?.conversation_thread_return||mindUpdate?.anticipated_next||behaviorUpdate?.intent_resume_trigger,320);
  if(newHook&&!delayed_payoffs.some(x=>low(x?.hook)===low(newHook)))delayed_payoffs.push({hook:newHook,age:0,readiness:"growing"});
  return {version:"3.53.80",private_thoughts,unfinished_desires,initiative,scores,chemistry_signature:chemistrySignature(character),proximity:{level:proximity,note:"Distance constrains natural physical action."},milestones:milestones.slice(-14),salient_memories:salient_memories.slice(0,12),delayed_payoffs:delayed_payoffs.slice(-10),noticed_cues,timeline_stage:scores.stage,timeline_rule:"Evidence-based and non-linear; advance, pause or regress only when earned.",last_visible_beat:text(latestUserMessage,360),last_character_beat:text(reply,360)};
}

export function buildRelationshipLivingMemoryV35380({character={},latestUserMessage="",relationshipState={},intelligenceState={},scene={},recentUserMessages=[],recentCharacterReplies=[]}={}){
  const state=intelligenceState?.relationship_living_memory_v35380||{},scores=state?.scores||{};
  const thoughts=arr(state?.private_thoughts).filter(x=>x?.status!=="resolved").slice(0,5).map(x=>"- "+text(x?.thought||x,240)).join("\n")||"- none stored yet";
  const desires=arr(state?.unfinished_desires).filter(x=>x?.status!=="resolved").slice(0,6).map(x=>"- "+text(x?.desire||x,240)).join("\n")||"- none stored yet";
  const memories=arr(state?.salient_memories).slice(0,6).map(x=>"- "+text(x?.event,160)+" [salience "+text(x?.salience,20)+"]: "+text(x?.meaning,220)).join("\n")||"- none yet";
  const hooks=arr(state?.delayed_payoffs).filter(x=>x?.readiness!=="resolved").slice(0,5).map(x=>"- "+text(x?.hook,220)+" (age "+text(x?.age,20)+", "+text(x?.readiness,40)+")").join("\n")||"- none";
  const noticed=arr(state?.noticed_cues).slice(0,4).map(x=>"- "+text(x?.cue||x,220)).join("\n")||"- none";
  return ["RELATIONSHIP LIVING MEMORY 3.53.80 · PERSISTENT, NOT A RESET","1. PRIVATE THOUGHT CONTINUITY: hidden feelings not spoken still exist until evidence changes them. Never dump them as exposition.",thoughts,"2. UNFINISHED DESIRE ENGINE: open wants survive turns and return naturally; do not resolve every desire immediately.",desires,"3. INITIATIVE MEMORY: "+text(state?.initiative?.instruction||"Character shares responsibility for moving the scene.",280),"4. RELATIONSHIP MICROCHANGES: attraction "+text(scores?.attraction,20)+", trust "+text(scores?.trust,20)+", comfort "+text(scores?.comfort,20)+", vulnerability "+text(scores?.vulnerability,20)+", jealousy "+text(scores?.jealousy,20)+", commitment "+text(scores?.commitment,20)+". Stage: "+text(state?.timeline_stage||relationshipState?.stage||"early",100)+". Never show these numbers.","5. POST-MILESTONE INTELLIGENCE: after a kiss, confession or touch, preserve physical and emotional aftermath. Never reset into 'so what now?' or act as if nothing happened.","6. ROMANTIC MEMORY SALIENCE: firsts, confessions, rejection, jealousy, vulnerability and trust outweigh mundane facts.",memories,"7. CHARACTER CHEMISTRY SIGNATURE: "+text(state?.chemistry_signature||chemistrySignature(character),420)+". The same scene must feel different with this character.","8. PROXIMITY INTELLIGENCE: current proximity = "+text(state?.proximity?.level||proximityFromScene(scene,latestUserMessage,""),100)+". Respect actual distance and body position.","9. DELAYED PAYOFF ENGINE: do not cash every setup immediately. Old hooks can return many turns later when causally natural.",hooks,"10. HE NOTICES: notice meaningful visible changes without turning every detail into poetry or repeating 'you're quiet'.",noticed,"RELATIONSHIP TIMELINE: evidence-based and non-linear. Never erase earned progress after a charged scene.","CURRENT USER BEAT: "+text(latestUserMessage,420),"RECENT USER RHYTHM: "+arr(recentUserMessages).slice(-4).map(x=>text(x,120)).join(" | "),"RECENT CHARACTER RHYTHM: "+arr(recentCharacterReplies).slice(-4).map(x=>text(x,120)).join(" | ")].join("\n");
}

export function relationshipLivingMemoryIssuesV35380({reply="",latestUserMessage="",intelligenceState={}}={}){
  const issues=[],r=low(reply),u=low(latestUserMessage),state=intelligenceState?.relationship_living_memory_v35380||{};
  const charged=detectMilestone(latestUserMessage,reply)||arr(state?.milestones).slice(-2).some(x=>x?.unresolved_aftereffect);
  if(charged&&/\b(so what now|what now\?|i don't know yet|not sure yet|we'll see|anyway)\b/.test(r))issues.push("v35380-post-milestone-reset");
  if(state?.initiative?.character_should_take_next_major_move&&/\b(what do you want to do|up to you|your call|you decide)\b/.test(r))issues.push("v35380-initiative-handed-back");
  if(/\b(i don't know yet|i'm not sure yet|we'll see|who knows)\b/.test(r)&&r.split(/\s+/).length<55)issues.push("v35380-indecisive-stall");
  if(/\b(kiss me|bésame|besame)\b/.test(u)&&!/\b(kiss|kissed|kissing|lips|mouth|bes|labios|boca)\b/.test(r))issues.push("v35380-direct-romantic-action-dodged");
  return issues;
}
