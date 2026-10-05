// Velvet 3.53.93 · Social World Intelligence 2.0
const c=(v="",m=500)=>String(v??"").replace(/\s+/g," ").trim().slice(0,m),a=v=>Array.isArray(v)?v:[];
const uniq=(xs,key)=>{const m=new Map();for(const x of xs)m.set(key(x),x);return [...m.values()]};
export function reduceSocialWorldV35393({previous={},messageId="",reply="",integration={},relationshipEvolution={},persistentCast=[]}={}){
 const p=previous&&typeof previous==="object"?previous:{},events=a(integration?.events),last=events.at(-1),witnesses=a(integration?.witness_ledger).filter(x=>x?.event_id===last?.id&&x?.knows);
 let knowledge=a(p.knowledge_ledger);if(last)knowledge=uniq([...knowledge,...witnesses.map(w=>({npc:c(w.name,100),event_id:last.id,source:"witnessed",certainty:100,detail:c(last.detail,280),private:false}))],x=>x.npc+"|"+x.event_id+"|"+x.source).slice(-120);
 const replyText=String(reply||"");
 const secret=/\b(don'?t tell|keep (?:this|it) between us|secret|no le digas|entre nosotros|secreto)\b/i.test(replyText);
 const socialSignal=Number(relationshipEvolution?.behavioral_leakage||0)>=25||Number(relationshipEvolution?.intimacy||0)>=15;
 const opinions=uniq([...a(p.opinions),...witnesses.map(w=>({npc:c(w.name,100),about:"relationship",stance:socialSignal?"suspicious_or_noticing":"observing",confidence:socialSignal?65:35,evidence_event_id:last?.id||""}))],x=>x.npc+"|"+x.about).slice(-60);
 const privacy=secret?{active:true,source_message_id:c(messageId,100),rule:"private until explicitly shared, witnessed, or personality-grounded breach occurs"}:p.privacy||{active:false};
 const npcLinks=a(p.npc_relationships);for(const npc of a(persistentCast).slice(0,30)){const name=c(npc?.name,100);if(name&&!npcLinks.some(x=>x.a===name))npcLinks.push({a:name,b:"world",relation:c(npc?.relationship||npc?.role||"independent social connection",180)});}
 return {schema:"v3.53.93",knowledge_ledger:knowledge,rumor_ledger:a(p.rumor_ledger).slice(-80),opinions,privacy,npc_relationships:npcLinks.slice(-80),public_private:{mode:a(integration?.physical_state?.present).length>2?"public":"private",present:a(integration?.physical_state?.present)},social_consequences:last&&witnesses.length?[{event_id:last.id,witnesses:witnesses.map(x=>x.name),eligible:true}]:a(p.social_consequences).slice(-40),shipping_suspicion:socialSignal?Math.min(100,Number(p.shipping_suspicion||0)+5):Math.max(0,Number(p.shipping_suspicion||0)-1),last_message_id:c(messageId,100)};
}
export function propagateRumorV35393(state={},from="",to="",eventId=""){
 const k=a(state.knowledge_ledger).find(x=>x.npc===from&&(!eventId||x.event_id===eventId));if(!k||state.privacy?.active)return state;
 const rumor={from:c(from,100),to:c(to,100),event_id:k.event_id,source:"heard_from_"+c(from,80),certainty:Math.max(25,Number(k.certainty||70)-25),detail:c(k.detail,220)};
 return {...state,rumor_ledger:[...a(state.rumor_ledger),rumor].slice(-80),knowledge_ledger:uniq([...a(state.knowledge_ledger),{npc:c(to,100),event_id:k.event_id,source:rumor.source,certainty:rumor.certainty,detail:rumor.detail,private:false}],x=>x.npc+"|"+x.event_id+"|"+x.source).slice(-120)};
}
export function buildSocialWorldPromptV35393(s={}){
 return `SOCIAL WORLD INTELLIGENCE 2.0 · v3.53.93
Information travels through people, not telepathy.
Context: ${c(JSON.stringify({knowledge:a(s.knowledge_ledger).slice(-10),rumors:a(s.rumor_ledger).slice(-8),opinions:a(s.opinions).slice(-8),privacy:s.privacy,public_private:s.public_private,shipping_suspicion:s.shipping_suspicion}),1800)}
Rules: NPCs know only what they witnessed, were told, or can reasonably infer; second-hand information loses certainty and may distort; opinions are beliefs, not canon; friends may notice repeated behavioral leakage before a confession; public/private behavior may differ by character; public events may cause social consequences but private events do not become universal knowledge; secrets remain scoped unless actually shared or a personality-grounded breach occurs; NPCs have relationships and agendas beyond the user; teasing/shipping/suspicion requires evidence; social butterfly effects must preserve the information chain source by source.`;
}
