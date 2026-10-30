import test from 'node:test';import assert from 'node:assert/strict';
import {buildNarrativeRescuePrompt} from './narrative-rescue.mjs';
test('oversized orchestration data produces a bounded canonical rescue',()=>{
 const huge='x'.repeat(100000);const p=buildNarrativeRescuePrompt({character:{name:'Chase',description:huge,personality:huge},scene:{description:huge},messages:Array.from({length:100},()=>({sender:'user',content:huge})),latestUserMessage:'Stay here. What did you want to say?',rejected:huge,issues:[huge]});
 assert(p.length<27000);assert(p.includes('Stay here. What did you want to say?'));assert(p.includes('say_the_content'));assert(p.includes('rejectedNonCanonDraft'));
});
test('current user decision at the end remains intact',()=>{
 const latest='x'.repeat(8000)+' I refuse. Do not move me.';assert(buildNarrativeRescuePrompt({latestUserMessage:latest}).includes(latest));
});
test('impossible current user size fails explicitly instead of cutting a correction',()=>assert.throws(()=>buildNarrativeRescuePrompt({latestUserMessage:'x'.repeat(30000)}),/not truncated/));
