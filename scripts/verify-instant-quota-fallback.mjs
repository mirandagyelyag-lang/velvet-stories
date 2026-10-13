import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const s=readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
const a=s.indexOf('  const quotaUnavailableModels =');
const b=s.indexOf('  const attempt = async',a);
let block=s.slice(a,b);
// Include only requestOpening and its request-scoped quota set.
const tail=block.lastIndexOf('\n  };');block=block.slice(0,tail+6);
const calls=[];
const context={deadlineAt:Date.now()+20000,AbortController,DOMException,setTimeout,clearTimeout,controllers:new Set(),GEMINI_FALLBACK_MODEL:'lite',GEMINI_EMERGENCY_MODEL:'emergency',apiKey:'test',primaryWinnerFound:false,diagnose(){},getErrorMessage:e=>e.message,geminiHeaders:()=>({}),modelEndpoint:m=>m,fetch:async m=>{calls.push(m);return {ok:m!=='exhausted',status:m==='exhausted'?429:200,json:async()=>({candidates:[]})}}};
const fn=vm.runInNewContext(stripTypeScriptTypes(block)+';requestOpening',context);
await fn({model:'exhausted',prompt:'test',phase:'salvage',timeoutMs:5000,maxOutputTokens:100,temperature:.1});
assert.deepEqual(calls,['exhausted','lite']);
await fn({model:'exhausted',prompt:'test',phase:'chase_independent_review',timeoutMs:5000,maxOutputTokens:100,temperature:.1});
assert.deepEqual(calls,['exhausted','lite','lite']);
console.log('PASS: 429 switches to Lite; later review skips the known exhausted model.');
