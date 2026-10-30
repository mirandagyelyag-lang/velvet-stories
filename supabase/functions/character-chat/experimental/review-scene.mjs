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
