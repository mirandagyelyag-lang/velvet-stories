import test from 'node:test';import assert from 'node:assert/strict';
import {matchesRejectedAlternative as matches,buildRegenerationRecoveryPrompt} from './regeneration-novelty.mjs';
test('exact repeats are rejected despite punctuation changes',()=>{assert(matches('“Yes.” Chase nods.',['"Yes!" Chase nods.']));});
test('a shared short answer does not veto a new action',()=>{
 assert.equal(matches('“Yes.” Chase closes the notebook and admits that he has been avoiding the question. “I would rather tell you properly.”',['“Yes.” Chase nods.']),false);
});
test('common emotional categories do not mean the same response',()=>{
 const old='“Wait. I am sorry. Let me explain.” Chase follows you, reaches out, then gives you space.';
 const fresh='Chase stays by the open doorway. “I should not have dismissed your point. I will not do that again.” He steps back, leaving the exit clear.';
 assert.equal(matches(fresh,[old]),false);
});
test('a cosmetic rewrite of a long reply remains rejected',()=>{
 const old='Chase sets the folded campus map beside the green notebook, taps the northern entrance and lowers his voice. “The courtyard is quieter after six. I would like to finish our conversation there, if you want.”';
 assert(matches(old.replace('green','blue').replace('quieter','calmer'),[old]));
});
test('several long identical spoken lines cannot hide behind new narration',()=>{
 const line='“I was trying to tell you that I changed my mind about leaving tonight and I would rather stay right here.”';
 assert(matches('Chase closes the window. '+line,['Chase reaches for his keys. '+line]));
});
test('recovery treats rejected alternatives as non-events and keeps the latest user turn',()=>{
 const p=buildRegenerationRecoveryPrompt({character:{name:'Chase'},messages:[{sender:'user',content:'Why did you change the subject?'}],latestUserMessage:'Why did you change the subject?',rejectedResponses:['Bad reply']});
 assert.match(p,/never happened/);assert.match(p,/Why did you change the subject/);assert.match(p,/Bad reply/);
});
