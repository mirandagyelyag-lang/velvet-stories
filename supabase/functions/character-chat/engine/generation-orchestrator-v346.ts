const tx=(v:unknown)=>String(v??"").trim(); const low=(v:unknown)=>tx(v).toLowerCase();
export function deriveGenerationOrchestratorV346(input:Record<string,unknown>={}){
  const user=tx(input.latestUserMessage); const recent=Array.isArray(input.recentMessages)?input.recentMessages:[];
  const director=(input.sceneDirector||{}) as Record<string,unknown>; const memory=(input.longStoryMemory||{}) as Record<string,unknown>;
  const npc=(input.npcEcosystem||{}) as Record<string,unknown>; const cal=(input.calendarLifeSimulation||{}) as Record<string,unknown>;
  const causal=(input.causalTimeline||{}) as Record<string,unknown>; const chemistry=(input.relationshipChemistry||{}) as Record<string,unknown>;
  const group=Number((npc.groupTraffic as Record<string,unknown>)?.presentCount||director.maxActiveSpeakers||0)>3;
  const deep=user.length>260 || /\b(explain|why|remember|what happened|tell me everything)\b/i.test(user);
  const micro=user.length<45 && !deep; const mode=group?"group":deep?"deep":micro?"micro":"standard";
  const cfg:Record<string,any>={
    micro:{contextBudgetChars:12000,immediateMessageCount:4,olderMessageCount:1,memorySlots:4,loreSlots:2,castSlots:3,responseTokenCeiling:680,repairBudget:1},
    standard:{contextBudgetChars:20500,immediateMessageCount:6,olderMessageCount:2,memorySlots:6,loreSlots:3,castSlots:5,responseTokenCeiling:1050,repairBudget:1},
    deep:{contextBudgetChars:30000,immediateMessageCount:7,olderMessageCount:4,memorySlots:9,loreSlots:5,castSlots:7,responseTokenCeiling:1450,repairBudget:2},
    group:{contextBudgetChars:25500,immediateMessageCount:7,olderMessageCount:3,memorySlots:7,loreSlots:4,castSlots:8,responseTokenCeiling:1320,repairBudget:2},
  };
  const active=["turn_contract","canon","pov_privacy","voice","grounded_reality","scene_physics"];
  if((memory.retrievalSet as unknown[])?.length) active.push("long_story_memory");
  if((causal.activeChains as unknown[])?.length) active.push("causal_timeline");
  if((cal.dueCommitments as unknown[])?.length) active.push("calendar");
  if((npc.activeNpcThreads as unknown[])?.length||group) active.push("npc_ecosystem");
  if(tx((chemistry as any).phase)||tx((chemistry as any).relationshipMode)) active.push("relationship_chemistry");
  if(tx(director.direction)&&director.direction!=="continue") active.push("scene_director");
  const all=["social_gravity","calendar","npc_ecosystem","causal_timeline","relationship_chemistry","character_evolution","arc_intelligence","scene_director","memory","prose"];
  const sleeping=all.filter(x=>!active.includes(x));
  return {mode,...cfg[mode],activeModules:[...new Set(active)],sleepingModules:sleeping,
    priorityOrder:["user literal turn","safety/POV/canon","current scene state","active consequences/commitments","relevant memory","character voice","style"],
    reasons:[`mode:${mode}`,`recent:${recent.length}`,group?"group scene":micro?"small turn":"context-bearing turn"],
    instruction:"Activate only context that can change this turn. Sleeping systems remain authoritative but should not dump their state into prose. Never narrate diagnostics, scores, budgets, engine names, or hidden context."};
}
export function generationOrchestratorV346Issues(input:Record<string,unknown>={}){
  const reply=tx(input.reply); const issues:string[]=[];
  if(/\b(?:turn contract|validator|orchestrator|context budget|token budget|hidden prompt|system prompt|engine score|repair budget|active modules|sleeping modules)\b/i.test(reply)) issues.push("orchestrator_system_exposure");
  const continuityDump=(reply.match(/\b(?:remember|last time|previously|as you know|after what happened|back when|ever since)\b/gi)||[]).length;
  if(continuityDump>=4 && reply.length>450) issues.push("context_dump_exposition_v346");
  return [...new Set(issues)];
}
export function sanitizeGenerationOrchestratorV346Reply(reply:string,issues:string[]=[]){
  let out=tx(reply); if(!out) return out;
  if(issues.includes("orchestrator_system_exposure")) out=out.split(/(?<=[.!?])\s+/).filter(s=>!/\b(?:turn contract|validator|orchestrator|context budget|token budget|hidden prompt|system prompt|engine score|repair budget|active modules|sleeping modules)\b/i.test(s)).join(" ");
  return out.trim();
}
