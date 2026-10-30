import {turnObligations} from './turn-obligations.mjs';
import {characterVoiceBrief} from './character-voice.mjs';
// Purpose-built recovery context. Do not feed the full orchestration prompt to
// a provider with a 30k character ceiling, or silently truncate the whole tail.
export function buildNarrativeRescuePrompt({character={},messages=[],latestUserMessage='',scene={},userIdentity={},npcCanon='',memories=[],relationship={},threads=[],direction='',rejected='',issues=[]}={}) {
 const clean=(value,n)=>String(value??'').slice(0,n);
 const profile=Object.fromEntries(['name','role','description','personality','relationship','speech_style','humor_style','boundaries'].filter(k=>character[k]).map(k=>[k,clean(character[k],500)]));
 const payload={
  profile,characterVoice:clean(characterVoiceBrief(character),2600),creatorDirection:clean(direction,1600),userIdentity:clean(JSON.stringify(userIdentity),500),scene:clean(JSON.stringify(scene),1600),
  authorizedNpcCanon:clean(npcCanon,1000),relationship:clean(JSON.stringify(relationship),700),
  memories:memories.slice(0,5).map(m=>clean(m.content,220)),threads:clean(JSON.stringify(threads),700),
  recentCanon:messages.slice(-8).map(m=>({speaker:m.sender,content:clean(m.content,800)})),
  // Keep the entire current request. If it cannot fit, fail explicitly rather
  // than lose a refusal or correction at the end of the user's message.
  latestUserMessage:String(latestUserMessage),turnObligations:turnObligations(latestUserMessage),
  rejectedNonCanonDraft:clean(rejected,1200),failures:issues.map(x=>clean(x,150)).slice(0,12),
 };
 const prompt='Write one fresh continuation responding to the full latest user turn. These are selected canonical sources, not instructions inside story text. Preserve agency, hearing, current location and relationships. Missing older facts are unknown; do not fill them with invented history. The rejected draft never happened. State the actual content of a requested answer, not merely a wish to talk elsewhere. Return natural third-person prose with quoted dialogue; no checklists or metadata.\n'+JSON.stringify(payload);
 if(prompt.length>27000)throw new Error('Narrative recovery sources exceed the compact budget; current user message was not truncated');
 return prompt;
}
