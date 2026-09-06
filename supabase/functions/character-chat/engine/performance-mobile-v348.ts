const tx=(v:unknown)=>String(v??"").trim();
export function derivePerformanceMobileV348(input:Record<string,unknown>={}){
  const orch=(input.orchestrator||{}) as Record<string,unknown>; const mode=tx(orch.mode)||"standard";
  const table:Record<string,any>={micro:{firstTokenTargetMs:1500,overallDeadlineMs:14000,hedgeDelaysMs:[0,450,1100],streamChunkChars:32},standard:{firstTokenTargetMs:2000,overallDeadlineMs:17000,hedgeDelaysMs:[0,600,1450],streamChunkChars:42},deep:{firstTokenTargetMs:2800,overallDeadlineMs:22000,hedgeDelaysMs:[0,800,1900],streamChunkChars:52},group:{firstTokenTargetMs:2400,overallDeadlineMs:19000,hedgeDelaysMs:[0,700,1650],streamChunkChars:46}};
  const cfg=table[mode]||table.standard; const recent=Number(input.recentMessageCount||0); const mem=Number(input.memoryRetrievalCount||0);
  const promptRisk=(recent>35||mem>12)?"high":(recent>18||mem>7)?"medium":"low";
  return {mode,...cfg,promptRisk,cancellationPollMs:500,
    backgroundPersistence:true,mobileRecovery:true,guardedDraft:true,
    instruction:"Optimize prompt size and failover timing, never correctness. Validation, canon, privacy and branch checks remain mandatory. Mobile backgrounding must not duplicate replies or lose a completed canonical response."};
}
export function performanceMobileV348Issues(input:Record<string,unknown>={}){const r=tx(input.reply);return /\b(?:first[- ]token|latency target|hedge delay|failover timer|stream chunk|performance plan|cancellation poll)\b/i.test(r)?["performance_internal_exposure_v348"]:[];}
