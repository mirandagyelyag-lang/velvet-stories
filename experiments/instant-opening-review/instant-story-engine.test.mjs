import test from 'node:test';import assert from 'node:assert/strict';
import {generateInstantOpening,openingContract} from './instant-story-engine.mjs';
const prose='Chase stops beside you at the small table in the quiet courtyard. He sets his phone face down, leaving a message unanswered. “I had an extremely convincing excuse ready,” Chase says to you. “Unfortunately, it involved pretending I was busy. I would rather have this conversation.” He nudges the empty chair back with his shoe, staying beside the table.';
const draft={intent:'Choose this conversation',change:'Declines a distraction',opening:prose};
const checks=()=>Object.fromEntries(['grounding','agency','contact','voice','momentum','variety'].map(axis=>[axis,{passed:true,evidence:'A concrete choice with user agency intact.'}]));
test('rejects unsupported duty then delivers only the repaired opening',async()=>{
 let calls=0;const result=await generateInstantOpening({contract:openingContract({name:'Chase'}),author:async({repair})=>{calls++;if(calls===2)assert.equal(repair.issues[0].code,'grounding');return {...draft,opening:calls===1?prose.replace('message unanswered','faculty job unfinished'):prose};},reviewer:async()=>{const c=checks();if(calls===1)c.grounding={passed:false,evidence:'faculty job is not in the profile'};return {checks:c};}});
 assert.equal(calls,2);assert.equal(result.opening,prose);assert(!result.opening.includes('faculty job'));
});
test('two failed reviews release no opening',async()=>{
 const result=await generateInstantOpening({contract:{},author:async()=>draft,reviewer:async()=>{const c=checks();c.contact={passed:false,evidence:'User location is absent'};return {checks:c};}});
 assert.equal(result.accepted,false);assert.equal(result.opening,undefined);assert.equal(result.attempts.length,2);
});
test('a reviewer cannot accept prose using only an intent label',async()=>{
 await assert.rejects(()=>generateInstantOpening({contract:{},author:async()=>draft,reviewer:async()=>({accepted:true})}),/Incomplete opening review/);
});
test('cancellation prevents generation',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(()=>generateInstantOpening({contract:{},author:async()=>{calls++;return draft;},reviewer:async()=>({checks:checks()}),signal:controller.signal}));assert.equal(calls,0);
});

test('literal user walking cannot be approved by a permissive model reviewer',async()=>{
 let reviews=0;
 const result=await generateInstantOpening({contract:{idea:''},author:async()=>({...draft,opening:prose.replace('stops beside you','watches you walk past, then stops beside you')}),reviewer:async()=>{reviews++;return {checks:checks()};}});
 assert.equal(result.accepted,false);assert.equal(reviews,0);
});

test('a seated pose and unprovided bag do not pass a model approval',async()=>{
 for(const opening of [prose.replace('Chase stops beside you','You are sitting by the table. Chase stops beside you'),prose.replace('his phone','your bag')]){
  const result=await generateInstantOpening({contract:{idea:''},author:async()=>({...draft,opening}),reviewer:async()=>({checks:checks()})});assert.equal(result.accepted,false);
 }
});
