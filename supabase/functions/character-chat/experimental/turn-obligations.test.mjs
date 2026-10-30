import test from 'node:test';import assert from 'node:assert/strict';
import {turnObligations,contentAnswerIssues} from './turn-obligations.mjs';
import {createSession,turnContract,runTurn} from './core.mjs';
test('content questions and a refusal carry separate obligations',()=>{
 const duties=turnObligations('No, I asked you to stay here. I don’t want to go outside. Tell me what you actually wanted to say.');
 assert.deepEqual(duties.map(x=>x.id),['say_the_content','no_relocation_pressure']);
});
test('direct Spanish question gets a content obligation',()=>assert.equal(turnObligations('¿Qué querías decirme?')[0]?.id,'say_the_content'));
test('ordinary agreement does not manufacture a question or refusal',()=>assert.deepEqual(turnObligations('Yes, I would like to go outside.'),[]));
test('obligations reach the complete contract without becoming factual evidence',()=>{
 const c=turnContract(createSession({profile:{id:'c',name:'Chase'}}),{id:'m',content:'What did you want to say? Stay here.'});
 assert.equal(c.turnObligations.length,2);assert(!c.sources.some(x=>x.text.includes('logistics')));
});
test('the observed privacy and attention evasions cannot pass a content question',()=>{
 for(const reply of ['Chase says, “I wanted to talk to you without half the room listening in.”','Chase says, “I wanted to see if you were actually going to pay attention to me tonight instead of standing by the door looking like you want to grade everyone’s clothes.”'])assert.equal(contentAnswerIssues('What did you want to say?',reply).length,1);
});
test('a discourse filler is not substantive content before an evasion',()=>{
 assert.equal(contentAnswerIssues('What did you want to say?','Chase says, “Honestly? I wanted to see if you would actually stay.”').length,1);
 assert.deepEqual(contentAnswerIssues('What did you want to say?','Chase says, “Honestly? I was enjoying this.”'),[]);
});
test('an actual thought, substantive question or a reason can answer',()=>{
 for(const reply of ['Chase says, “I wanted to ask what you thought of that last song.”','Chase says, “I wanted to talk because I was enjoying this.”','Chase says, “I think I would rather stay here.”']) assert.deepEqual(contentAnswerIssues('What did you want to say?',reply),[]);
 assert.deepEqual(contentAnswerIssues('Where did you want to talk?','Chase says, “I wanted to talk outside.”'),[]);
});
test('model approval cannot save the observed evasion; repair must supply content',async()=>{
 const bad='Chase says, “I wanted to talk to you without half the room listening in.”';
 const good='Chase says, “I would rather stay here with you.”';let attempts=0,commit;
 const result=await runTurn({session:createSession({profile:{id:'c',name:'Chase'}}),message:{id:'m',content:'What did you want to say? Stay here.'},author:async()=>({prose:++attempts===1?bad:good,scenePatch:{}}),provenance:async()=>({accepted:true,issues:[]}),reviewer:async()=>({accepted:true,issues:[]}),commit:async value=>{commit=value;}});
 assert.equal(result.reply,good);assert.equal(result.attempts[0].verdict.accepted,false);assert.equal(commit.nextSession.history.at(-1).content,good);
});
