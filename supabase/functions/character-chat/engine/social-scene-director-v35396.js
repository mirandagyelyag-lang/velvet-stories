// v3.53.96: Scene director evaluates independent NPC motion, not just romance dialogue.
// Pure evaluation: never inserts canned dialogue into a live story.
const txt=v=>String(v||"");
const has=(s,r)=>r.test(txt(s));
export function inspectSocialSceneV35396({reply="",character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]}={}){
 const context=[latestUserMessage,...recentUserMessages.slice(-3),...recentCharacterReplies.slice(-3)].join("\n");
 const candidate=txt(reply);
 const companion=has(context,/\bjules\b/i);
 const obligation=has(context,/\b(?:administrator|reception|west wing|alumni|check.in|roster)\b/i);
 const group=has(context,/\b(?:friends?|group|crowd|administrator)\b/i);
 const userJoins=has(latestUserMessage,/\b(?:laugh|laughing|laughed|giggl|walk|went|approach|came over|teas)\b/i);
 const active=companion&&obligation&&group&&userJoins&&has(character.name,/chase/i);
 if(!active) return {active:false,pass:true,issues:[],score:0};
 const issues=[];
 const npcActivity=has(candidate,/\b(?:jules|administrator|friend|one of chase.s friends|one of his friends)\b[^.!?\n]{0,110}\b(?:laughs?|calls?|shouts?|says?|asks?|steps?|walks?|interrupts?|snorts?|grins?|points?|taps?|waves?|replies|bursts|starts|moves|approaches)\b/i)
 ||has(candidate,/\b(?:laughs?|calls?|shouts?|says?|asks?|steps?|walks?|interrupts?|approaches)\b[^.!?\n]{0,70}\b(?:jules|administrator|friend)\b/i);
 if(!npcActivity)issues.push("no_independent_npc_action");
 if(!has(candidate,/\b(?:administrator|west wing|reception|roster|check.in|alumni)\b/i))issues.push("abandoned_pending_obligation");
 if(has(candidate,/\b(?:come here|come with me|you're coming with me|you are coming with me|don't expect me to|walk over there alone|stand next to|standing right next to)\b/i))issues.push("romantic_gravity_command");
 if(has(candidate,/\bjuliette\b/i)&&!has(context,/\bjuliette\b/i))issues.push("invented_full_name");
 if(has(candidate,/\b(?:laughter dies down|silence falls|everyone falls silent)\b/i)&&!npcActivity)issues.push("erased_group_energy");
 const score=(npcActivity?4:0)+(has(candidate,/\b(?:administrator|west wing|reception|roster|check.in)\b/i)?3:0)+(has(candidate,/\bjules\b/i)?2:0)-issues.length*3;
 return {active:true,pass:issues.length===0,issues,score};
}
export const SOCIAL_SCENE_REPAIR_GUIDANCE_V35396=`Write a NEW continuation, not a paraphrase of the rejected draft. The user has approached with Jules and laughed at Chase, who is with friends in the student union lobby. An administrator has already ordered Chase to staff the West Wing alumni reception. Keep that obligation unresolved until visibly addressed. Give a present friend, Jules, or the administrator independent dialogue or physical action. Let the administrator act on the delay. Chase can react to the friend and situation rather than addressing only the user. No demand that the user follow or stand with him. Do not move, speak for, or assign plans to the user. Do not invent Juliette as Jules's full name. Concrete action, short dialogue, lively public scene, optional italicized private thought. Do not copy any example verbatim.`;
