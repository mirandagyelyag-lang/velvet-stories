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
