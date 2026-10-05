// Velvet 3.53.92 · Relationship Evolution 2.0
const c=(v="",m=500)=>String(v??"").replace(/\s+/g," ").trim().slice(0,m), a=v=>Array.isArray(v)?v:[];
const rx={kiss:/\b(kiss(?:ed)?|bes(?:ó|o))\b/i,confession:/\b(i (?:like|love) you|me gustas|te (?:quiero|amo)|confess(?:ed)?|confes(?:ó|o))\b/i,vulnerability:/\b(admitted|told (?:her|him) the truth|voice (?:broke|shook)|confessed|admitió|se sinceró)\b/i,choice:/\b(stayed|chose|waited|came back|se quedó|eligió|volvió)\b/i,flirt:/\b(flirt|teas(?:e|ed)|wink|coquet|smirk)\b/i};
function milestone(reply,id){for(const [kind,r] of Object.entries(rx)){if(r.test(reply))return {id:"rom-"+c(id,80)+"-"+kind,kind,label:kind,message_id:c(id,100),weight:{kiss:5,confession:5,vulnerability:4,choice:3,flirt:2}[kind]||2};}return null}
function loveLanguage(character={}){const t=c([character.personality,character.values,character.habits,character.relationship,character.affection_style].filter(Boolean).join(" "),1800).toLowerCase();if(/quiet|reserved|guarded|practical|stoic/.test(t))return "acts_of_service_and_presence";if(/teas|banter|playful|flirt/.test(t))return "attention_banter_and_choice";if(/protect|loyal|family/.test(t))return "reliability_and_protective_presence";if(/verbal|honest|direct|talk/.test(t))return "words_and_direct_reassurance";return "character_specific_choices_not_generic_romance"}
export function reduceRelationshipEvolutionV35392({previous={},reply="",messageId="",character={},relationship={},integration={}}={}){
 const p=previous&&typeof previous==="object"?previous:{},m=milestone(String(reply||""),messageId),milestones=m?[...a(p.milestones).filter(x=>x.kind!==m.kind),m].slice(-30):a(p.milestones);
 const gain=m?.weight||(/\b(remembered|noticed|looked for|made time|changed plans|remembered|buscó|recordó|cambió sus planes)\b/i.test(reply)?1:0);
 const yearning=Math.max(0,Math.min(100,Number(p.yearning||0)+gain));
 const intimacy=Math.max(0,Math.min(100,Number(p.intimacy||0)+(m?.weight||0)));
 const suppression=Math.max(0,Math.min(100,Number(p.suppression||(/rival|enemy|guarded|avoid/i.test(c(character.relationship,500))?45:20))+(gain?1:0)-(m?.kind==="confession"?25:0)));
 const leakage=yearning>=15&&suppression>=25?Math.min(100,Math.round((yearning+suppression)/2)):0;
 const aftermath=a(integration?.events).at(-1)?.detail||"";
 const jealousyEligible=yearning>=10||intimacy>=10||/dating|together|relationship|couple|novi/i.test(c(relationship,700));
 const turnsSincePayoff=Math.max(0,Number(p.turns_since_payoff||0)+(m?0:1));
 const payoffReadiness=Math.min(100,Math.round(yearning*.45+intimacy*.35+Math.min(20,turnsSincePayoff)));
 return {schema:"v3.53.92",milestones,yearning,intimacy,suppression,behavioral_leakage:leakage,romantic_memory_weight:milestones.reduce((n,x)=>n+Number(x.weight||0),0),post_intimacy:{active:Boolean(m&&["kiss","confession","vulnerability"].includes(m.kind))||Boolean(p.post_intimacy?.active),last:c(m?.kind||p.post_intimacy?.last||"",80),aftermath:c(aftermath,280)},jealousy:{eligible:jealousyEligible,rule:"requires grounded trigger; never equals ownership or invented reciprocity"},love_language:loveLanguage(character),turns_since_payoff:turnsSincePayoff,payoff_readiness:payoffReadiness};
}
export function buildRelationshipEvolutionPromptV35392(s={}){
 return `RELATIONSHIP EVOLUTION 2.0 · v3.53.92
Feelings accumulate. Behavior evolves. Intimacy changes the relationship.
Milestones: ${c(JSON.stringify(a(s.milestones).slice(-8)),700)}
Yearning ${Number(s.yearning||0)}/100 · intimacy ${Number(s.intimacy||0)}/100 · suppression ${Number(s.suppression||0)}/100 · behavioral leakage ${Number(s.behavioral_leakage||0)}/100.
Love language: ${c(s.love_language||"character-specific",120)}. Payoff readiness: ${Number(s.payoff_readiness||0)}/100.
Rules: never reset earned intimacy after a kiss/confession/vulnerability; show yearning through costly choices, attention, memory and changed behavior instead of naming it; suppressed feelings may leak without becoming a declaration; jealousy requires a grounded trigger and never proves user reciprocity; romantic memories are weighted by significance; post-intimacy behavior must acknowledge what changed; payoff should be earned and natural, never scheduled mechanically or forced every few turns. "Fell harder" must be observable in decisions, not stated as narration.`;
}
