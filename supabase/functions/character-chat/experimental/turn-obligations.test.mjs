import test from 'node:test';import assert from 'node:assert/strict';
import {turnObligations} from './turn-obligations.mjs';
import {createSession,turnContract} from './core.mjs';
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
