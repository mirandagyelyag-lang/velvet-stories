import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const models=['anthropic/claude-sonnet-5.5','openai/gpt-5.4-mini'];
const cases={party:'An ongoing university party.',campus_event:'Students setting up a campus event.',group_outing:'Friends planning an outing.'};
const fixture=JSON.parse(fs.readFileSync(path.join(root,'fixture.json'),'utf8'));
const requests=models.flatMap(model=>Object.entries(cases).map(([caseId,situation])=>({model,caseId,body:{model,max_tokens:1024,messages:[{role:'system',content:'Write an interactive fictional opening in English. Author Chase and the world only. Never invent the user actions, feelings, dialogue, gaze, location or history. Output finished prose only.'},{role:'user',content:`Chase: socially desired, enjoys attention, keeps seeking the user. Emotionally impulsive but causally coherent; sarcastic and directly provocative. His feelings remain unresolved. ELECTRICITY, not random behavior or neat confession. Short spoken lines, sparse narration, 90-160 words. No decorative scenery, fatigue/food plot, disposable admirer, body choreography or final explanation. A live interruption may expose an unplanned emotion. No assumed jealousy or user behavior. Do not force touch, block departure, or write the user's response. Stop with room for the user to act.\nApproved reference for rhythm and emotional dynamics, not a sequence to copy:\n${fixture.reference}\nDifferent situation: ${situation}`} ]}})));
// Reserve using an intentionally conservative byte-based input allowance.
// No retries, no fallback models, max six calls, max 1024 billed output tokens each.
const reserve=requests.reduce((sum,r)=>sum+(Buffer.byteLength(JSON.stringify(r.body.messages))+1024)*0.000002+1024*0.00001,0);
if(requests.length>6||reserve>0.50)throw new Error('Local spend admission failed');
const execute=process.argv.includes('--execute');
if(!execute){console.log(JSON.stringify({mode:'dry-run',requests:requests.map(r=>({model:r.model,caseId:r.caseId})),conservativeReservationUSD:reserve,requires:'Dedicated Gateway key with $0.50 non-resetting budget, existing credits, no auto-top-up.'},null,2));process.exit(0);}
if(process.env.VELVET_LAB_BUDGET_VERIFIED!=='0.50-none')throw new Error('Verify the dedicated server-side budget before execution');
const key=process.env.AI_GATEWAY_API_KEY;
if(!key)throw new Error('Missing AI_GATEWAY_API_KEY; never put a secret in source or chat');
const credit=await fetch('https://ai-gateway.vercel.sh/v1/credits',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
if(!credit.ok)throw new Error(`Credit check failed (${credit.status}); no generation sent`);
const credits=await credit.json();
if(!(Number(credits.balance)>=reserve))throw new Error('Insufficient verified balance; no generation sent');
const results=[];
for(const request of requests){
 const response=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(request.body),signal:AbortSignal.timeout(55000)});
 const data=await response.json();
 const item={model:request.model,caseId:request.caseId,status:response.status,id:data.id,text:data.choices?.[0]?.message?.content,finishReason:data.choices?.[0]?.finish_reason,usage:data.usage,errorType:data.error?.type};
 results.push(item);fs.writeFileSync(path.join(root,'gateway-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(item));
 if(!response.ok)break;
}
