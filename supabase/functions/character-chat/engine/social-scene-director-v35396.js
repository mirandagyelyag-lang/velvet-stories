// Social scene evaluation: context-driven, no hard-coded cast or locations.
// Pure evaluator: it never writes canned dialogue into a story.
const str = v => String(v ?? "");
const has = (s, re) => re.test(str(s));
const social = /\b(?:friend|friends|group|crowd|party|guest|student|classmate|waiter|server|bartender|reception|administrator|professor|people|someone|girl|guy|jules)\b/i;
const socialAction = /\b(?:interrupts?|intervenes?|calls?|shouts?|asks?|says?|replies|laughs?|argues?|approaches?|arrives?|leaves?|grabs?|blocks?|pushes?|challenges?|flirts?|waves?|points?|hands?|steps? in|walks? over|cuts? in|demands?)\b/i;
const passive = /\b(?:laughter dies down|silence falls|everyone falls silent|come with me|you're coming with me|you are coming with me|don't expect me to walk over there alone)\b/i;
const nameIntroduced = /\b(?:named|called|introduced as|my friend|your friend)\s+([A-Z][a-z]{2,})\b/g;
export function inspectSocialSceneV35396({reply="",character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]}={}){
  const context=[...recentUserMessages.slice(-4),...recentCharacterReplies.slice(-4),latestUserMessage].map(str).join("\n");
  const candidate=str(reply);
  const active=has(context,social);
  if(!active)return {active:false,pass:true,issues:[],score:0};
  const issues=[];
  const sentences=candidate.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const npcActivity=sentences.some(s=>has(s,social)&&has(s,socialAction));
  // An established social scene should not silently erase everyone else.
  if(!npcActivity)issues.push("no_independent_npc_action");
  if(has(candidate,passive)&&!npcActivity)issues.push("erased_group_energy");
  if(has(candidate,/\b(?:come with me|you're coming with me|you are coming with me|don't expect me to walk over there alone)\b/i))issues.push("romantic_gravity_command");
  // A new named person must never be conjured just to move the plot.
  const known=context.toLowerCase();
  for(const m of candidate.matchAll(nameIntroduced)){
    if(!known.includes(m[1].toLowerCase()))issues.push("unverified_new_npc_name");
  }
  const score=(npcActivity?4:0)-issues.length*3;
  return {active:true,pass:issues.length===0,issues:[...new Set(issues)],score};
}
export const SOCIAL_SCENE_REPAIR_GUIDANCE_V35396=`Rewrite the continuation from the ACTUAL recent conversation, not from an example scene. Preserve the established location, cast, pending obligations, who is speaking, and the user's last action. Let a person already present in the scene take an independent, consequential action or speak, consistent with their identity. Never invent a new proper name, relationship, appointment, location or obligation. If a stranger is needed, use an unnamed role grounded in the setting. The lead acts proactively, responds to the actual situation, and never commandeers the user's choices. Avoid repeated follow-me demands, decorative glances, silence, and stalling. Short natural dialogue and visible consequences. Do not reuse canned dialogue or assume Jules, an administrator, a reception or any specific scene exists unless the current story establishes them.`;
