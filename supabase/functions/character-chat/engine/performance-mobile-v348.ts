const tx=(v:unknown)=>String(v??"").trim();
export function derivePerformanceMobileV348(input:Record<string,unknown>={}){
  const orch=(input.orchestrator||{}) as Record<string,unknown>; const mode=tx(orch.mode)||"standard";
  const table:Record<string,any>={micro:{firstTokenTargetMs:1100,overallDeadlineMs:11500,hedgeDelaysMs:[0,260,680,1450],streamChunkChars:34},standard:{firstTokenTargetMs:1600,overallDeadlineMs:14800,hedgeDelaysMs:[0,420,980,1900],streamChunkChars:42},deep:{firstTokenTargetMs:2400,overallDeadlineMs:19800,hedgeDelaysMs:[0,650,1450,2600],streamChunkChars:52},group:{firstTokenTargetMs:2000,overallDeadlineMs:17400,hedgeDelaysMs:[0,520,1200,2250],streamChunkChars:46}};
  const cfg=table[mode]||table.standard; const recent=Number(input.recentMessageCount||0); const mem=Number(input.memoryRetrievalCount||0);
  const promptRisk=(recent>35||mem>12)?"high":(recent>18||mem>7)?"medium":"low";
  return {mode,...cfg,promptRisk,cancellationPollMs:280,
    backgroundPersistence:true,mobileRecovery:true,guardedDraft:true,
    instruction:"Optimize prompt size and failover timing, never correctness. Validation, canon, privacy and branch checks remain mandatory. Mobile backgrounding must not duplicate replies or lose a completed canonical response."};
}
export function performanceMobileV348Issues(input:Record<string,unknown>={}){const r=tx(input.reply);return /\b(?:first[- ]token|latency target|hedge delay|failover timer|stream chunk|performance plan|cancellation poll)\b/i.test(r)?["performance_internal_exposure_v348"]:[];}
