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

    const theoJealousApproach=/\b(?:crossed|crossing|came over|approached|walked over|moved away from the group|doesnt mean i have to like him|does not mean i have to like him)\b/.test(recent);
    const theoDeflection=/\b(?:fresh drink|refill|fewer people staring|people downstairs|what people are calling|sophomore from economics|three separate conversations)\b/.test(t);
    if(theoJealousApproach&&theoDeflection)issues.push("theo_jealousy_deflected_into_generic_npc_plot");

    // Theo is the Campus Prince, not Chase in softer clothes. His social tension
    // comes from sincere warmth being misread as flirting, especially by other girls.
    // He should not default to Chase's interrupt/claim/extract choreography.
    if(opening){
      const chaseLikeExtraction=/\b(?:were leaving|we are leaving|come on|youre coming with me|you are coming with me|im stealing you|i am stealing you|lets get out of here|let us get out of here)\b/.test(spoken)
        || /\b(?:cut straight across|cut (?:him|her|the guy|the girl) off|interrupted .{0,55}(?:conversation|guy|girl|stranger)|without waiting for (?:an )?(?:answer|argument|response)|already turning (?:toward|away)|pulled you away|dragged you away)\b/.test(t);
      const theoSocialSignature=/\b(?:mistook|misread|assumed|thought .{0,40} flirting|flirted with him|flirting with him|asked for his number|gave him her number|girl .{0,45}(?:smiled|flirt|number)|girls? .{0,45}(?:watch|want|flirt|approach)|friendly|kind|warm|polite|helped|remembered|included|introduced|campus prince|everyone knows)\b/.test(t);
      if(chaseLikeExtraction&&!theoSocialSignature)issues.push("theo_chase_identity_leak");
    }
  }

  if(name==="mateo silva"){
    const distress=/\b(?:llor|ansiedad|depres|triste|crisis|familia|panic|cry|depress|sad)\b/.test(recent);
    const cold=/\b(?:whatever|deal with it|not my problem|figure it out|da igual|arreglatelas|arréglatelas)\b/.test(t);
    if(distress&&cold)issues.push("mateo_refuge_identity_broken");
  }

  if(name==="chase beaumont"){
    const inert=/\b(?:small nod|gave a nod|fair enough|all right|alright|okay then|whatever you want)\b/.test(t);
    if(inert&&wordCount(reply)<70)issues.push("chase_electricity_flattened");

    // Chase's creator canon is structural world truth, not optional flavor.
    // He is a millionaire with his own high-end car, campus-famous, and routinely
    // receives female attention. The world must never flatten him into an anonymous
    // student who depends on borrowed transport. Attention does not make him a womanizer.
    const transportDowngrade=/\b(?:doesnt have (?:a )?car|does not have (?:a )?car|without (?:a )?car|needed (?:a )?ride|asked (?:someone|a friend) for (?:a )?ride|waited for (?:a )?ride|borrowed (?:a|the|his|her|their) car|borrowed (?:a|the|his|her|their) keys|someone elses car|friends car|roommates car|caught the bus because|took the bus because)\b/.test(t);
    const randomKeysAsTransport=/\b(?:someone|a guy|a girl|a friend|another student)\b.{0,120}\b(?:tossed|threw|handed|passed)\b.{0,60}\b(?:car )?keys\b.{0,160}\b(?:chase )?(?:caught|grabbed|snagged|took)\b/.test(t);
    if(transportDowngrade||randomKeysAsTransport)issues.push("chase_wealth_car_canon_broken");

    const anonymityDrift=/\b(?:nobody knew (?:him|who chase was)|no one knew (?:him|who chase was)|went unnoticed|passed unnoticed|just another student|ordinary student|anonymous on campus|no one recognized him|nobody recognized him)\b/.test(t);
    if(anonymityDrift)issues.push("chase_campus_fame_erased");

    const desirabilityErased=/\b(?:girls? never noticed him|women never noticed him|girls? werent interested in him|women werent interested in him|no one ever flirted with him|he rarely got attention from (?:girls|women)|he wasnt used to female attention)\b/.test(t);
    if(desirabilityErased)issues.push("chase_romantic_attention_erased");

    const womanizerDrift=/\b(?:slept with half the campus|hooked up with everyone|flirted back with every girl|always took girls home|couldnt keep track of his hookups|womanizer|player who never said no)\b/.test(t);
    if(womanizerDrift)issues.push("chase_attention_became_womanizer");
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
  const name=norm(character?.name);
  const theoCanon=name==="theo calloway"
    ? [
        "THEO WORLD CANON — HARD, NON-NEGOTIABLE:",
        "- Theo is the Campus Prince: famous, socially magnetic, broadly liked and heavily desired, but he is NOT a womanizer.",
        "- His defining social problem is sincere warmth being mistaken for flirting. He is naturally attentive, kind and charming; other girls often read ordinary Theo behavior as special romantic interest and may flirt back.",
        "- His tension with the protagonist grows from that ambiguity. She can reasonably wonder whether his warmth toward her is unique when she sees other people react to him the same way.",
        "- Do NOT turn Theo into Chase. Avoid defaulting to possessive extraction beats such as interrupting a man, declaring 'we're leaving', ordering the protagonist to come with him, or walking away expecting her to follow.",
        "- Theo can take initiative, become jealous, pursue, flirt and make bold choices, but his tactic must grow from Theo's warmth, social fluency, sincerity and accidental ambiguity rather than Chase-style command or territorial swagger.",
        "- In Instant Stories, prefer premises that expose Theo's unique contradiction: someone mistakes his kindness for interest, his popularity creates a social complication, or he treats the protagonist in a way that becomes meaningfully different from his general charm.",
        "- NAME-SWAP TEST: if replacing Theo with Chase leaves the opening equally plausible, rewrite it before sending."
      ].join("\n")
    : "";
  const hardCanon=name==="chase beaumont"
    ? [
        "CHASE WORLD CANON — HARD, NON-NEGOTIABLE:",
        "- Chase is a millionaire. His wealth is established reality, not a temporary story beat.",
        "- Chase personally owns a high-end car and has independent transportation. Never make him borrow random car keys, need someone else's car, wait for a ride, or behave as if he has no vehicle merely to move the plot.",
        "- Chase is campus-famous. Students know who he is; he is not anonymous or socially invisible at university.",
        "- Female attention is normal around him: many girls on campus want him, flirt with him, watch him, approach him, or look for reasons to be near him. Do not erase this social reality because he is interested in the protagonist.",
        "- This attention does NOT make Chase a womanizer. He is accustomed to being wanted and can flirt confidently, but do not make him automatically reciprocate every girl's attention or turn him into a serial hookup caricature.",
        "- Show status through consequences when relevant: recognition, access, confidence, his own car, people reacting to him, or outside romantic attention. Do not dump these facts as exposition and do not force all markers into every private scene.",
        "- His distinction with the protagonist is not that nobody else wants him; it is that her attention begins to matter to him in a way the abundant outside attention does not."
      ].join("\n")
    : "";
  return [
    "CHARACTER IDENTITY GATE 3.53.21:",
    "Before finalizing, silently test: if the character name were removed, would this reply still be recognizable from choices, priorities, restraint, humor, conflict behavior and affection style?",
    "Do not mention the archetype label in prose. Express it behaviorally.",
    "CORE="+clean(d.core_fantasy,120),
    "PROMISE="+clean(d.emotional_promise,700),
    theoCanon,
    hardCanon,
    "If the answer could be transplanted unchanged onto another lead character, rewrite the tactic or emotional decision."
  ].filter(Boolean).join("\n");
}
