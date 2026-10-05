// Velvet 3.53.91 · Full Story Integration reducer
const c=(v="",m=500)=>String(v??"").replace(/\s+/g," ").trim().slice(0,m);
const a=v=>Array.isArray(v)?v:[];
const eventRx=/\b(kiss(?:ed)?|hug(?:ged)?|confess(?:ed)?|admit(?:ted)?|promise(?:d)?|left|stayed|fight|argu(?:e|ed)|bes(?:ó|o)|abraz(?:ó|o)|confes(?:ó|o)|prometi(?:ó|o)|se fue|se quedó)\b/i;
export function reduceFullStoryIntegrationV35391({previous={},messageId="",reply="",scene={},storyAuthority={},storyMemory={},present=[],canonCorrection=""}={}){
 const p=previous&&typeof previous==="object"?previous:{};
 const correction=c(canonCorrection,500); const correctionActive=/\b(?:this didn'?t happen|did not happen|esto no pas[oó]|no ocurri[oó]|retcon|ignore that)\b/i.test(correction);
 const eventMatch=String(reply||"").match(eventRx);
 const event=eventMatch&&!correctionActive?{id:"integrated-"+c(messageId,80),label:c(eventMatch[0],80),detail:c(reply,300),message_id:c(messageId,100)}:null;
 const events=correctionActive?a(p.events).filter(x=>String(x?.message_id)!==String(messageId)):event?[...a(p.events),event].slice(-60):a(p.events).slice(-60);
 const physical={location:c(scene?.location,180),time_label:c(scene?.time_label,120),present:a(scene?.present||present).map(x=>c(x,100)).filter(Boolean).slice(0,20),contact:c(scene?.contact||scene?.physical_contact,220),message_id:c(messageId,100)};
 const witnesses=event?physical.present.filter(Boolean):[];
 const callbackBank=[...a(p.callback_bank),...(event?[{id:event.id,text:event.detail,cooldown:3,last_used_message_id:""}]:[])].slice(-30).map(x=>({...x,cooldown:Math.max(0,Number(x?.cooldown||0)-1)}));
 const activeAuthority=storyAuthority?.status==="active"?{...storyAuthority,last_message_id:c(messageId,100)}:{};
 return {schema:"v3.53.91",events,physical_state:physical,emotional_aftermath:event?{source_event_id:event.id,active:true,summary:event.detail}:p.emotional_aftermath||{},witness_ledger:[...a(p.witness_ledger),...(event?witnesses.map(name=>({event_id:event.id,name,knows:true})):[])].slice(-80),callback_bank:callbackBank,active_authority:activeAuthority,last_handoff_message_id:c(messageId,100),correction_applied:correctionActive};
}
export function buildFullStoryIntegrationPromptV35391(state={}){
 const last=a(state.events).at(-1),after=state.emotional_aftermath||{};
 return `FULL STORY INTEGRATION 3.53.91:
Opening facts, scene state, creator authority, event history, emotional aftermath, witnesses and callbacks are ONE causal chain.
Last integrated event: ${c(last?.detail||"none",260)}
Emotional aftermath active: ${after?.active?"yes":"no"} ${c(after?.summary||"",220)}
Physical state: ${c(JSON.stringify(state.physical_state||{}),500)}
Witness facts: ${c(JSON.stringify(a(state.witness_ledger).slice(-8)),600)}
Rules: an event that happened changes later behavior; physical contact/location/presence persist until changed on-page; only witnesses or informed NPCs know an event; callbacks may return selectively after cooldown; creator corrections outrank stored inference; never resurrect a corrected event; a fulfilled Story Path becomes history rather than disappearing after one turn.`;
}
