import test from 'node:test';import assert from 'node:assert/strict';
import {removeReplayedOpening} from '../supabase/functions/character-chat/engine/adjacent-dialogue.js';
import {buildGroqLivePrompt} from '../supabase/functions/character-chat/engine/groq-fallback.js';
const previous='"You fading on me?" The room is quiet. “Coffee?” he asks.';
const candidate='"You fading on me?" He checks the kitchen clock, the digits barely lit. “After two,” he says quietly.';
test('production example drops replayed opener and preserves clock answer without another generation',()=>{
 assert.equal(removeReplayedOpening(candidate,[previous],"Isn't it too late? What hour is it?"),'He checks the kitchen clock, the digits barely lit. “After two,” he says quietly.');
});
test('normalizes punctuation and curly quotes but keeps different character dialogue',()=>{
 assert.equal(removeReplayedOpening(candidate.replace('"You fading on me?"','“You fading on me!”'),[previous],'What time?').startsWith('He checks'),true);
 assert.equal(removeReplayedOpening('“You need a break?” He checks the clock.',[previous],'What time?'),'“You need a break?” He checks the clock.');
});
test('explicit repetition and clarification remain possible; no empty prose or orphan speech tags',()=>{
 for(const latest of ['Say that again.','What do you mean by "You fading on me"?']) assert.equal(removeReplayedOpening(candidate,[previous],latest),candidate);
 for(const reply of ['"You fading on me?"','"You fading on me?" he asks, looking at you.']) assert.equal(removeReplayedOpening(reply,[previous],'What time?'),reply);
});
test('fallback prompt answers current question without restarting pending offer',()=>{
 const prompt=buildGroqLivePrompt({latestUserMessage:'What hour is it?'});assert.match(prompt,/CURRENT QUESTION FIRST/);assert.match(prompt,/pending offer remains pending/);
});
test('older accepted turn and rejected regeneration variants both prevent the replay',()=>{
 const draft='"You fading on me?" The room is lit only by the monitor glow. Theo leans back. "Did you finish the literature review section?" he asks.';
 const accepted=[previous,'"Around two," Theo says.'];
 assert.equal(removeReplayedOpening(draft,accepted,'What time?').startsWith('The room'),true);
 const regenerationSources=['"Got the books," Theo says.',draft];
 assert.equal(removeReplayedOpening(draft,regenerationSources,'What time?').startsWith('The room'),true);
});

test('breakfast context isolates recent lead interiority and keeps the authored proximity/prop cue',async()=>{
 const {buildCharacterInitiativeContext,CHARACTER_INITIATIVE_RULE}=await import('../supabase/functions/character-chat/engine/adjacent-dialogue.js');
 const transcript=[
  {speaker:'Antonia',content:'*I want him to stay.*'},
  {speaker:'Theo',content:'“Morning.” *He wishes he could stay longer, but the clock is ticking.*'},
  {speaker:'Theo',content:'*He wants a few more minutes before work.*'},
 ];
 const latest='*I reach past him to grab the spatula, keeping our space crowded.* Just don’t expect a five-star hotel breakfast.';
 const prompt=buildGroqLivePrompt({character:{name:'Theo'},userIdentity:{name:'Antonia'},transcript,latestUserMessage:latest});
 const final=prompt.split('FINAL WRITING DIRECTION')[1];
 assert.match(final,/clock is ticking/);
 assert.match(final,/few more minutes/);
 assert.ok(!final.includes('I want him to stay'));
 assert.ok(prompt.includes(latest));
 assert.equal(prompt.split('CHARACTER-OWNED INITIATIVE').length-1,1);
 assert.ok(prompt.includes(CHARACTER_INITIATIVE_RULE));
 assert.ok(buildCharacterInitiativeContext(Array(10).fill('*'+ 'x'.repeat(2000) +'*')).length<1700);
});

test('long recent history fits fallback budget without a duplicated style block',()=>{
 const transcript=Array.from({length:20},(_,i)=>({speaker:i%2?'Theo':'Antonia',content:'A grounded conversational beat. '.repeat(35)}));
 const prompt=buildGroqLivePrompt({character:{name:'Theo'},userIdentity:{name:'Antonia'},transcript,latestUserMessage:'What do you think?'});
 assert.ok(prompt.length<27000,`Prompt length ${prompt.length}`);
 assert.equal(prompt.split('CREATOR-APPROVED NARRATIVE STYLE').length-1,1);
});
