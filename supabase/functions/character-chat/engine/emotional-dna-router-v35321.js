// Velvet Stories v3.53.21 · Emotional DNA Router
const clean=(v="",n=1800)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const arr=(v)=>Array.isArray(v)?v:[];
function dna(character={}){const d=character?.emotional_dna;return d&&typeof d==="object"&&!Array.isArray(d)?d:{};}

export function buildEmotionalDnaRouterV35321({character={},supportState={}}={}){
  const d=dna(character);
  const core=clean(d.core_fantasy,120)||"profile-derived";
  const signals=arr(d.signature_signals).map(x=>clean(x,160)).filter(Boolean).slice(0,8);
  const mustNot=arr(d.must_not).map(x=>clean(x,180)).filter(Boolean).slice(0,8);
  return [
    "EMOTIONAL DNA 3.53.21 · CHARACTER PROMISE:",
    "CORE_FANTASY="+core,
    "EMOTIONAL_PROMISE="+(clean(d.emotional_promise,1300)||"Preserve the creator-defined emotional experience."),
    d.user_misbelief?"USER_MISBELIEF="+clean(d.user_misbelief,500):"",
    d.hidden_truth?"HIDDEN_TRUTH="+clean(d.hidden_truth,500):"",
    d.relationship_trope?"RELATIONSHIP_TROPE="+clean(d.relationship_trope,180):"",
    "SIGNATURE_SIGNALS="+(signals.join(" | ")||"derive from profile"),
    "SUPPORT_STYLE="+(clean(d.support_style,700)||"Care must remain character-specific."),
    "MUST_NOT="+(mustNot.join(" | ")||"do not collapse into a generic romance archetype"),
    "IDENTITY RULE: the reply must feel recognizably like this character even with the name removed. Preserve the emotional promise through choices and priorities, not by mechanically mentioning the trope.",
    supportState?.active?"SUPPORT OVERRIDE IS ACTIVE: preserve this DNA while letting care outrank entertainment, romance escalation, banter and side plot.":"",
  ].filter(Boolean).join("\n");
}

export function instantStoryEmotionalDnaV35321(character={}){
  const d=dna(character);
  return [
    "EMOTIONAL DNA OPENING 3.53.21:",
    "Build an opening that can naturally produce this character's emotional promise without forcing the payoff immediately.",
    "CORE="+(clean(d.core_fantasy,120)||"profile-derived"),
    "PROMISE="+(clean(d.emotional_promise,900)||"Use the profile."),
    "SIGNALS="+(arr(d.signature_signals).map(x=>clean(x,140)).filter(Boolean).slice(0,6).join(" | ")||"profile-derived"),
    "AVOID="+(arr(d.must_not).map(x=>clean(x,150)).filter(Boolean).slice(0,6).join(" | ")||"generic interchangeable romance"),
    "Do not explain the trope to the user. Create circumstances where it can be felt through behavior."
  ].join("\n");
}

export const __testV35321={dna};
