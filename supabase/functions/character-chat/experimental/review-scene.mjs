// Adapt actual persisted scene fields; never infer positions from a keyword or
// assume user and lead are together merely because both participate in chat.
export function reviewScene(scene={},lead={}) {
 const name=String(lead.name||'').trim().toLowerCase();
 const positions={...(scene.positions&&typeof scene.positions==='object'?scene.positions:{})};
 for(const body of Array.isArray(scene.body_states)?scene.body_states:[]){
  const actor=String(body.name||'').trim().toLowerCase();
  if(lead.id && actor && (actor===name||actor===name.split(' ')[0]) && typeof body.anchor==='string' && body.anchor.trim())positions[lead.id]=body.anchor;
 }
 return {location:scene.location||'unspecified',present:Array.isArray(scene.present)?structuredClone(scene.present):[],positions,objects:Array.isArray(scene.object_states)?structuredClone(scene.object_states):[]};
}

const anchorKind=value=>{
 const text=String(value||'').toLowerCase();
 if(/\b(?:door|doorway|entrance)\b/.test(text))return 'door';
 for(const kind of ['island','window','bench','railing','sofa'])if(new RegExp(`\\b${kind}\\b`).test(text))return kind;
 return null;
};
export function originPositionIssues(scene,lead,prose=''){
 const known=anchorKind(scene?.positions?.[lead.id]);if(!known)return [];
 const sentence=String(prose).split(/[.!?]/)[0];
 if(!sentence.trim().toLowerCase().startsWith(String(lead.name||'').split(' ')[0].toLowerCase()))return [];
 const origins=/\b(?:abandons?|leaves?|leaving|push(?:es|ing)? off|steps? away from|stays? (?:by|beside|at)|staying (?:by|beside|at)|remains? (?:by|beside|at))\s+(?:the\s+)?(island|window|bench|railing|sofa|door|doorway|entrance)\b/gi;
 for(const match of sentence.matchAll(origins)){
  const claimed=anchorKind(match[1]);if(claimed===known)continue;
  const prefix=sentence.slice(0,match.index);
  const shownArrival=new RegExp(`\\b(?:walks?|crosses?|moves?|heads?)\\b[^.!?]{0,50}\\b(?:to|toward|towards)\\s+(?:the\\s+)?${match[1]}\\b`,'i').test(prefix);
  if(!shownArrival)return [{code:'unshown_origin_change',reason:`The lead was last anchored at ${scene.positions[lead.id]}, but the prose starts departing or staying at ${match[1]} without showing how they got there. Continue from the confirmed position or show the actual transition. Do not move the user.`}];
 }
 return [];
}
