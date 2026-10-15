import test from 'node:test';
import assert from 'node:assert/strict';
import {overnightLanding,overnightLandingIssues} from '../supabase/functions/character-chat/engine/overnight-landing.js';
import {buildGroqLivePrompt} from '../supabase/functions/character-chat/engine/groq-fallback.js';
const skip='Time skip, we work on the papers all night';
test('night-work skip lands in early hours and survives the follow-up clock question',()=>{
 const landing=overnightLanding([skip],"Isn't it too late? What hour is it?");
 assert.match(landing.instruction,/2–3 a.m./);
 assert.deepEqual(overnightLandingIssues('The soft light of morning spills across the living room.',landing),['overnight_landing_clock_conflict']);
 assert.deepEqual(overnightLandingIssues('"It’s barely six," he says. "Before the first lecture."',landing),['overnight_landing_clock_conflict']);
 assert.deepEqual(overnightLandingIssues('"Around half past two," he says, glancing at the clock.',landing),[]);
});
test('explicit dawn, later time or subsequent new skip overrides default; never rewinds explicit clocks',()=>{
 for(const later of ['Time skip until dawn','It is 6 a.m.','The next morning','Time skip to lunch']) assert.equal(overnightLanding([skip],later),null);
 assert.equal(overnightLanding(['It is 4 a.m.',skip],''),null);
 assert.equal(overnightLanding([skip+' until sunrise'],''),null);
 assert.equal(overnightLanding(['We worked all night.'],''),null);
});
test('Groq uses user direction rather than treating generated sunrise as authority',()=>{
 const prompt=buildGroqLivePrompt({userIdentity:{name:'Anto'},latestUserMessage:'What hour is it?',transcript:[{speaker:'Anto',content:skip},{speaker:'Theo',content:'The morning light fills the room.'}]});
 assert.match(prompt,/creator-preferred ambiguous landing/);
 assert.match(prompt,/prior model-generated morning/);
});
