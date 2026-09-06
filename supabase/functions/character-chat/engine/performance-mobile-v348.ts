const tx=(v:unknown)=>String(v??"").trim();
export function derivePerformanceMobileV348(input:Record<string,unknown>={}){
  const orch=(input.orchestrator||{}) as Record<string,unknown>; const mode=tx(orch.mode)||"standard";
  const table:Record<string,any>={micro:{firstTokenTargetMs:1600,overallDeadlineMs:15000,hedgeDelaysMs:[0,850,2200],streamChunkChars:32},standard:{firstTokenTargetMs:2200,overallDeadlineMs:20000,hedgeDelaysMs:[0,1100,2900],streamChunkChars:42},deep:{firstTokenTargetMs:3000,overallDeadlineMs:26000,hedgeDelaysMs:[0,1400,3600],streamChunkChars:52},group:{firstTokenTargetMs:2600,overallDeadlineMs:23000,hedgeDelaysMs:[0,1200,3200],streamChunkChars:46}};
  const cfg=table[mode]||table.standard; const recent=Number(input.recentMessageCount||0); const mem=Number(input.memoryRetrievalCount||0);
  const promptRisk=(recent>35||mem>12)?"high":(recent>18||mem>7)?"medium":"low";
  return {mode,...cfg,promptRisk,cancellationPollMs:500,
    backgroundPersistence:true,mobileRecovery:true,guardedDraft:true,
    instruction:"Optimize prompt size and failover timing, never correctness. Validation, canon, privacy and branch checks remain mandatory. Mobile backgrounding must not duplicate replies or lose a completed canonical response."};
}
export function performanceMobileV348Issues(input:Record<string,unknown>={}){const r=tx(input.reply);return /\b(?:first[- ]token|latency target|hedge delay|failover timer|stream chunk|performance plan|cancellation poll)\b/i.test(r)?["performance_internal_exposure_v348"]:[];}
