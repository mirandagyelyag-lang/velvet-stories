// Velvet Stories v3.53.21 · Character Identity Gate
const clean=(v="",n=9000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
function wordCount(v=""){return norm(v).split(/\s+/).filter(Boolean).length;}
function dialogue(v=""){return [...String(v||"").matchAll(/[“"]([^”"]+)[”"]/g)].map(m=>m[1]).join(" ");}

export function characterIdentityGateIssuesV35321({reply="",character={},recentCharacterReplies=[],opening=false}={}){
  const issues=[];
  const name=norm(character?.name);
  const t=norm(reply);
  const spoken=norm(dialogue(reply));
  const recent=(Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-5):[]).map(norm).join(" | ");

  if(name==="theo calloway"){
    const activeWomanizer=/\b(?:flirted back|flirting back|winked at (?:her|the girl)|gave (?:her|the girl) his number|asked (?:her|the girl) for (?:her )?number|pulled (?:her|the girl) closer|kissed another|kissed the girl)\b/.test(t);
    if(activeWomanizer)issues.push("theo_womanizer_drift");
  }

  if(name==="mateo silva"){
    const distress=/\b(?:llor|ansiedad|depres|triste|crisis|familia|panic|cry|depress|sad)\b/.test(recent);
    const cold=/\b(?:whatever|deal with it|not my problem|figure it out|da igual|arreglatelas|arréglatelas)\b/.test(t);
    if(distress&&cold)issues.push("mateo_refuge_identity_broken");
  }

  if(name==="chase beaumont"){
    const inert=/\b(?:small nod|gave a nod|fair enough|all right|alright|okay then|whatever you want)\b/.test(t);
    if(inert&&wordCount(reply)<70)issues.push("chase_electricity_flattened");
  }

  if(name==="nathan foster"){
    if(/\b(?:everyone feared him|everyone went silent|no one dared speak|the whole room watched him)\b/.test(t))issues.push("nathan_popularity_cartoonized");
  }

  if(name==="rowan hayes"){
    if(/\byou feel\b.{0,90}\bbecause\b|\bwhat youre really feeling\b|\blet me tell you what you feel\b/.test(t))issues.push("rowan_observation_became_therapy");

    // Rowan's creator premise is near-family intimacy: he belongs naturally around
    // the user's family and knows the household rhythm. Openings should use that
    // earned familiarity as relationship texture, not flatten him into a generic
    // attentive campus boy. Do not require literal family mentions every time.
    if(opening){
      const source=norm([
        character?.relationship,
        character?.description,
        character?.personality,
        character?.scenario,
        character?.world,
        character?.firstMessage,
        character?.first_message,
      ].filter(Boolean).join(" "));
      const familyPremise=/\b(?:like (?:a )?brother|practically (?:a )?brother|family friend|grew up|childhood|famil(?:y|ies)|parents?|mom|mother|dad|father|sibling|brother)\b/.test(source);
      const genericCampusCare=/\b(?:campus|quad|lecture|class|library)\b/.test(t)&&
        /\b(?:umbrella|coffee|snack|paper bag|walk|walking|forgot to eat|forget to eat)\b/.test(t);
      const earnedFamiliarity=/\b(?:your (?:mom|mother|dad|father|parents?|family|sister|brother)|our families|your house|your place|back home|since we were|grew up|already knew|didnt need to ask|doesnt need to ask)\b/.test(t);
      if(familyPremise&&genericCampusCare&&!earnedFamiliarity)issues.push("rowan_family_bond_flattened_to_generic_campus_care");

      // Near-family does NOT authorize Velvet to manufacture specific shared history.
      // Rowan may know the family and move naturally around them, but concrete habits,
      // messages, errands, possessions or past events must come from supplied canon.
      const inventedFamilyFact=/\b(?:your (?:mom|mother|dad|father|parents?|sister|brother))\s+(?:sent|told|asked|called|texted|packed|made|gave|left|warned|said|claims?|always|usually)\b/.test(t);
      const inventedHabit=/\b(?:you (?:always|usually|never|constantly|keep|tend to|forget to)|your usual|your favorite|statistically speaking|\d+ (?:days?|times?) out of \d+)\b/.test(t);
      if(familyPremise&&(inventedFamilyFact||inventedHabit))issues.push("rowan_invented_family_history_or_user_habit");
    }
  }

  if(name==="alexander bennett"){
    const retreat=/\b(?:walked away|left her alone|left you alone|went back to his friends|not my problem)\b/.test(t);
    const rupture=/\b(?:fight|argument|hurt|sorry|leave|upset|angry|cried|crying)\b/.test(recent);
    if(rupture&&retreat)issues.push("alexander_devotion_abandoned");
  }

  if(name==="damon blackwood"){
    const emotionWords=(spoken.match(/\b(?:feel|feeling|love|care|afraid|scared|need you|cant lose|cannot lose|mean to me|heart)\b/g)||[]).length;
    if(wordCount(spoken)>85&&emotionWords>=4)issues.push("damon_silent_intensity_overexplained");
    if(/\bwho (?:is|was) that guy\b|\bis that your boyfriend\b/.test(spoken))issues.push("damon_generic_jealousy_interrogation");
  }

  if(name==="roman knox"){
    if(opening&&/\b(?:police chase|gunfire|kidnapped|hostage|explosion)\b/.test(t)&&!/\b(?:race|rival|enemy|illegal|danger|threat)\b/.test(norm(character?.personality+" "+character?.world+" "+character?.scenario)))issues.push("roman_fake_danger_escalation");
  }

  return [...new Set(issues)];
}

export function buildCharacterIdentityGateV35321({character={}}={}){
  const d=character?.emotional_dna&&typeof character.emotional_dna==="object"?character.emotional_dna:{};
  return [
    "CHARACTER IDENTITY GATE 3.53.21:",
    "Before finalizing, silently test: if the character name were removed, would this reply still be recognizable from choices, priorities, restraint, humor, conflict behavior and affection style?",
    "Do not mention the archetype label in prose. Express it behaviorally.",
    "CORE="+clean(d.core_fantasy,120),
    "PROMISE="+clean(d.emotional_promise,700),
    "If the answer could be transplanted unchanged onto another lead character, rewrite the tactic or emotional decision."
  ].join("\n");
}
