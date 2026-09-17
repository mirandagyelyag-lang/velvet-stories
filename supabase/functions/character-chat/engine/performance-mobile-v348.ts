const tx=(v:unknown)=>String(v??"").trim();
export function derivePerformanceMobileV348(input:Record<string,unknown>={}){
  const orch=(input.orchestrator||{}) as Record<string,unknown>; const mode=tx(orch.mode)||"standard";
  const table:Record<string,any>={micro:{firstTokenTargetMs:420,overallDeadlineMs:6200,hedgeDelaysMs:[0,90,210,390],streamChunkChars:24},standard:{firstTokenTargetMs:550,overallDeadlineMs:7200,hedgeDelaysMs:[0,110,250,460],streamChunkChars:28},deep:{firstTokenTargetMs:800,overallDeadlineMs:8600,hedgeDelaysMs:[0,150,330,590],streamChunkChars:36},group:{firstTokenTargetMs:700,overallDeadlineMs:8200,hedgeDelaysMs:[0,130,290,520],streamChunkChars:32}};
  const cfg=table[mode]||table.standard; const recent=Number(input.recentMessageCount||0); const mem=Number(input.memoryRetrievalCount||0);
  const promptRisk=(recent>35||mem>12)?"high":(recent>18||mem>7)?"medium":"low";
  return {mode,...cfg,promptRisk,cancellationPollMs:280,
    backgroundPersistence:true,mobileRecovery:true,guardedDraft:true,
    instruction:"Optimize prompt size and failover timing, never correctness. Validation, canon, privacy and branch checks remain mandatory. Mobile backgrounding must not duplicate replies or lose a completed canonical response."};
}
export function performanceMobileV348Issues(input:Record<string,unknown>={}){const r=tx(input.reply);return /\b(?:first[- ]token|latency target|hedge delay|failover timer|stream chunk|performance plan|cancellation poll)\b/i.test(r)?["performance_internal_exposure_v348"]:[];}
