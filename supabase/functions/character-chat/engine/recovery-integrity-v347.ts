const tx=(v:unknown)=>String(v??"").trim();
export function fnv1a(value:unknown){let h=0x811c9dc5; for(const c of tx(value)){h^=c.charCodeAt(0); h=Math.imul(h,0x01000193);} return (h>>>0).toString(16).padStart(8,"0");}
function stable(v:unknown):unknown{if(Array.isArray(v))return v.map(stable); if(v&&typeof v==="object"){const o=v as Record<string,unknown>;return Object.keys(o).sort().reduce((a,k)=>{a[k]=stable(o[k]);return a;},{} as Record<string,unknown>);} return v;}
export function buildRecoveryCheckpointV347(input:Record<string,unknown>={}){
  const protectedState={scene:input.sceneState||{},relationship:input.relationshipState||{},development:input.developmentState||{},intelligence:input.intelligenceState||{},threads:input.unresolvedThreads||[],recap:tx(input.storyRecap).slice(-1600)};
  const canonical=JSON.stringify(stable(protectedState)); const userDigest=fnv1a(tx(input.latestUserMessage)); const stateFingerprint=fnv1a(canonical);
  return {checkpointId:`v347-${stateFingerprint}-${userDigest}`,stateFingerprint,userDigest,
    protectedFields:["scene","relationship","development","intelligence","threads","recap"],
    idempotencyPolicy:"A normal retry of the same user turn reuses an already-persisted canonical character reply when one immediately follows that user message. Explicit regenerate remains a new branch/replacement operation.",
    rewindPolicy:"Rewind invalidates later branch state; never merge memories or consequences from the abandoned future into the restored branch.",
    recoveryPolicy:"Network loss, backgrounding or duplicate client delivery must not create a second canonical reply for the same user turn.",
    instruction:"Recovery mechanics are invisible story infrastructure. Preserve state, branch truth and one canonical reply per normal user turn."};
}
export function recoveryIntegrityV347Issues(input:Record<string,unknown>={}){const r=tx(input.reply);return /\b(?:checkpoint id|state fingerprint|idempotenc(?:y|e)|database row|recovery policy|duplicate request|retry key)\b/i.test(r)?["recovery_internal_exposure_v347"]:[];}
export function sanitizeRecoveryIntegrityV347Reply(reply:string,issues:string[]=[]){if(!issues.includes("recovery_internal_exposure_v347"))return tx(reply);return tx(reply).split(/(?<=[.!?])\s+/).filter(s=>!/\b(?:checkpoint id|state fingerprint|idempotenc(?:y|e)|database row|recovery policy|duplicate request|retry key)\b/i.test(s)).join(" ").trim();}
