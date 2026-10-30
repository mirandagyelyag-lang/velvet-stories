const stop=new Set('the and that with this from into then when your you his her their they them was were are for but not out had has have just one two she him its too all get got says said asks asked chase el la los las una uno unos unas que con por para del como pero sus tus dice dijo esto esta'.split(' '));
const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const words=value=>normalize(value).split(' ').filter(w=>w.length>2&&!stop.has(w));
const grams=parts=>new Set(parts.slice(0,-2).map((_,i)=>parts.slice(i,i+3).join(' ')));
const similarity=(a,b)=>{
 const x=new Set(a),y=new Set(b);const intersection=[...x].filter(w=>y.has(w)).length;
 return intersection/Math.max(1,new Set([...x,...y]).size);
};
const sequenceOverlap=(a,b)=>{
 const x=grams(a),y=grams(b);return [...x].filter(w=>y.has(w)).length/Math.max(1,Math.min(x.size,y.size));
};
const dialogue=value=>[...String(value||'').matchAll(/["“]([^"”]+)["”]/g)].map(m=>m[1]).join(' ');

export function matchesRejectedAlternative(reply='',rejected=[]) {
 const current=normalize(reply);if(!current)return false;
 return (Array.isArray(rejected)?rejected:[]).some(old=>{
  if(!normalize(old))return false;
  if(current===normalize(old))return true;
  const a=words(reply),b=words(old);
  // Shared canon words or the entire vocabulary of a very short old answer
  // do not prove that a longer, materially different answer is a duplicate.
  if(Math.min(a.length,b.length)>=12&&similarity(a,b)>=0.80&&sequenceOverlap(a,b)>=0.55)return true;
  const ad=words(dialogue(reply)),bd=words(dialogue(old));
  return Math.min(ad.length,bd.length)>=9&&similarity(ad,bd)>=0.88&&sequenceOverlap(ad,bd)>=0.60;
 });
}

export function buildRegenerationRecoveryPrompt({character={},messages=[],scene={},latestUserMessage='',instruction='',rejectedResponses=[]}={}) {
 const profile=Object.fromEntries(['name','role','description','personality','relationship','speech_style','voice_avoidances','boundaries'].filter(k=>character[k]).map(k=>[k,String(character[k]).slice(0,1000)]));
 return `REGENERATE THIS TURN, not the conversation. The user requested a different answer to the same latest message. Choose a different conversational move or present character action; changing adjectives alone is insufficient. Keep literal canon, positions, named speakers, hearing and user agency. A necessary fact or brief answer may stay the same; develop it differently. Do not invent a new past event, user possession, occupation or consent to create novelty. Do not continue after any rejected alternative: those alternatives never happened. Return only the new visible prose.\nPROFILE ${JSON.stringify(profile)}\nSCENE ${JSON.stringify(scene).slice(0,1800)}\nPRIOR CANON ${JSON.stringify(messages.slice(-8).map(m=>({speaker:m.sender,content:String(m.content||'').slice(0,1000)})))}\nLATEST USER ${String(latestUserMessage).slice(0,1600)}\nREQUEST ${String(instruction).slice(0,700)}\nREJECTED ALTERNATIVES ${JSON.stringify(rejectedResponses.slice(-6).map(r=>String(r).slice(0,1000)))}`;
}
