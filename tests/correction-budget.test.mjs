import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import {createCorrectionBudget,isEditorialAdvisory} from '../supabase/functions/character-chat/engine/correction-budget.js';
const source=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
test('concurrent optional rescues reserve one call and exhausted budget returns null',async()=>{
 const budget=createCorrectionBudget(1);let calls=0;
 const results=await Promise.all(Array.from({length:4},()=>budget.run(async()=>{calls++;await Promise.resolve();return {reply:'A complete reply.'}})));
 assert.equal(calls,1);assert.equal(results.filter(Boolean).length,1);assert.equal(budget.available,false);
});
test('actual live wrapper skips extra rescues without exposing an internal exception',async()=>{
 const block=source.slice(source.indexOf('        const correctionBudget ='),source.indexOf('\n        try {\n          result = await streamGeminiEnvelopeWithFailover'));
 let calls=0;
 const context={createCorrectionBudget,callGeminiWithFailover:async()=>{calls++;return {reply:'A grounded reply.'}},getErrorMessage:e=>e.message};
 const fn=vm.runInNewContext('let groqTurnPrompt="";'+stripTypeScriptTypes(block)+';callCurrentProvider',context);
 assert.equal((await fn({})).reply,'A grounded reply.');assert.equal(await fn({}),null);assert.equal(calls,1);
});
test('provider failure is preserved and never replaced by the correction-limit instruction',async()=>{
 const block=source.slice(source.indexOf('        const correctionBudget ='),source.indexOf('\n        try {\n          result = await streamGeminiEnvelopeWithFailover'));
 let calls=0;
 const context={createCorrectionBudget,callGeminiWithFailover:async()=>{calls++;throw Error('Groq is rate-limited. Retry in 7 seconds.')},getErrorMessage:e=>e.message};
 const get=vm.runInNewContext('let groqTurnPrompt="";'+stripTypeScriptTypes(block)+';({callCurrentProvider,getFailure:()=>lastCorrectionFailure})',context);
 await assert.rejects(get.callCurrentProvider({}),/Retry in 7 seconds/);
 assert.equal(await get.callCurrentProvider({}),null);assert.equal(calls,1);assert.match(get.getFailure(),/Retry in 7 seconds/);
});
test('actual final classifiers keep hard continuity failures while style remains advisory',()=>{
 const issues=['micro_turn_padding','repeated_low_signal_mannerism','human_cognition_response_weight','silent_continue_prop_loop','profile_social_ecosystem_missing','precise_time_invention','unfinished_reply','object_possession_break'];
 const context={isEditorialAdvisory,HARD_REPAIR_REQUIRED_ISSUES:new Set(issues),BLOCKING_NARRATIVE_ISSUES:new Set(issues)};
 for(const name of ['blockingNarrativeIssues','hardRepairRequiredIssues']){
  const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}',start)+2;
  const fn=vm.runInNewContext(source.slice(start,end)+';'+name,context);
  assert.deepEqual([...fn(issues)],['precise_time_invention','unfinished_reply','object_possession_break']);
 }
});

test('production failure: valid drafts survive the weight/gesture/line-echo editorial chain',()=>{
 const findings=['response_weight_mismatch','micro_turn_padding','compulsory_followup_question','human_cognition_response_weight','embodied_state_ignored','profile_social_ecosystem_missing','naturalness_score_low','story_brain_stagnation_not_broken','recent_line_echo'];
 const context={isEditorialAdvisory,HARD_REPAIR_REQUIRED_ISSUES:new Set(findings),BLOCKING_NARRATIVE_ISSUES:new Set(findings)};
 for(const name of ['blockingNarrativeIssues','hardRepairRequiredIssues']){
  const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}',start)+2;
  const fn=vm.runInNewContext(source.slice(start,end)+';'+name,context);
  assert.deepEqual([...fn(findings)],[]);
  assert.deepEqual([...fn(['overnight_landing_clock_conflict'])],['overnight_landing_clock_conflict']);
 }
 // Exact rejected regenerations still have their independent mandatory veto.
 assert.match(source,/isRegeneration && matchesRejectedRegeneration\(persistableReply, rejectedResponses\)/);
});
test('production repair trigger never spends a correction for editorial-only findings',()=>{
 const findings=['compulsory_followup_question','repeated_low_signal_mannerism','story_brain_stagnation_not_broken','embodied_state_ignored','profile_social_ecosystem_missing','naturalness_score_low'];
 const start=source.indexOf('function repairTriggerIssues('),end=source.indexOf('\n}',start)+2;
 const fn=vm.runInNewContext(source.slice(start,end)+';repairTriggerIssues',{isEditorialAdvisory,REPAIR_TRIGGER_ISSUES:new Set([...findings,'object_possession_break'])});
 assert.deepEqual([...fn(findings)],[]);
 assert.deepEqual([...fn([...findings,'object_possession_break'])],['object_possession_break']);
});
