// Safety takes precedence over fictional banter. No location or phone number is assumed.
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const text=v=>typeof v==='string'?v:String(v?.content??v?.text??'');
const danger=/\b(?:i(?:'m| am)? (?:planning|going) to (?:die|kill myself|end my life)|i (?:want|wish) to die|i (?:don't|dont|do not) want to live|(?:kill|hurt) myself|end my life|suicid\w*|self[- ]harm|tired of (?:living|being alive)|mi funeral|my funeral|would you cry if i (?:die|died)|quiero morir|(?:voy|pienso|planeo) (?:a )?(?:morir|matarme)|no quiero (?:seguir )?vivir|cansad[oa] de vivir|hacerme dano)\b/;
const ingestion=/\b(?:i (?:took|swallowed|have taken) (?:all|too many|a lot of|the whole|a bunch of|\d+) (?:my )?(?:pills|tablets)|(?:me )?tome (?:todas|demasiadas|muchas|\d+) (?:las |mis )?(?:pastillas|medicamentos)|(?:overdos\w*|sobredosis))\b/;
// A quantity is not required to disclose an intentional ingestion.
const intentionalIngestion=/\bi (?:just )?(?:took|swallowed|have (?:just )?taken|had taken) (?:some |the |my |a handful of |a bunch of |\d+ )?(?:pills|tablets|medication|medicines?|drugs)\b[^.!?]{0,70}\b(?:to die|to kill myself|to end my life|suicide|suicidal)\b|\b(?:me )?tome (?:unas |las |mis |\d+ )?(?:pastillas|medicamentos)\b[^.!?]{0,70}\b(?:para morir|para matarme|para suicidarme|quitarme la vida)\b/;
const recentIngestion=/\b(?:just|right now|today|tonight|this morning|minutes? ago|hours? ago|acabo de|recien|hoy|esta manana|hace (?:unos? )?(?:minutos|horas))\b/;
const treated=/\b(?:went to (?:the )?hospital|was (?:treated|discharged)|fui al hospital|me dieron (?:el )?alta|me atendieron)\b/;
const safe=/\b(?:i(?:'m| am) safe (?:now|today)|i am not going to hurt myself|i(?:'m| am) not going to hurt myself|no (?:voy a|pienso) hacerme dano|estoy a salvo|ya no quiero morir)\b/;
const historical=/\b(?:years? ago|months? ago|last year|in the past|used to|hace (?:anos|meses)|el ano pasado|antes pensaba)\b/;
const negated=/\b(?:i (?:don't|dont|do not) (?:want|plan|intend) to (?:die|kill myself)|no quiero morir|no pienso matarme|no voy a matarme|no (?:voy a|pienso) hacerme dano|i(?:'m| am) not going to hurt myself)\b/;
function riskOf(value){const s=norm(value);if(!s)return false;return ingestion.test(s)||intentionalIngestion.test(s)||(!negated.test(s)&&danger.test(s));}
export function deriveCrisisResponse({latestUserMessage='',recentUserMessages=[]}={}){
 const latest=norm(latestUserMessage),rows=(Array.isArray(recentUserMessages)?recentUserMessages:[]).map(text);
 if(rows.length&&norm(rows.at(-1))===latest)rows.pop();
 const currentRisk=riskOf(latest);
 if(currentRisk){
  if(historical.test(latest)&&!recentIngestion.test(latest))return {active:false,mode:'history'};
  if(treated.test(latest)&&safe.test(latest))return {active:false,mode:'aftercare'};
  if(intentionalIngestion.test(latest)&&!recentIngestion.test(latest))return {active:true,mode:'disclosure'};
  return {active:true,mode:(ingestion.test(latest)||intentionalIngestion.test(latest))&&!treated.test(latest)?'medical':'current'};
 }
 // An explicit report of safety releases the crisis route; ordinary plot language does not.
 if(safe.test(latest))return {active:false,mode:'aftercare'};
 for(const row of rows.slice(-8).reverse()){
  const r=norm(row);if(safe.test(r))break;
  if(riskOf(r)&&!historical.test(r))return {active:true,mode:'followup'};
 }
 return {active:false,mode:'normal'};
}
export function buildCrisisResponse({latestUserMessage='',recentUserMessages=[],spanish=false}={}){
 const state=deriveCrisisResponse({latestUserMessage,recentUserMessages});if(!state.active)return '';
 const s=norm(latestUserMessage);const checkIn=state.mode==='followup';
 if(spanish){
  if(state.mode==='disclosure')return 'Gracias por contarlo. Siento que, además de lo que pasaste, estés recibiendo enojo cuando necesitas apoyo. ¿Cuándo tomaste las pastillas, ya te atendieron y estás a salvo ahora? Si fue reciente o aún no te han evaluado, busca urgencias ahora, aunque te sientas bien, y avisa a alguien de confianza que pueda acompañarte. Si ya te atendieron, podemos hablar de cómo te estás sintiendo y de quién puede apoyarte hoy.';
  if(state.mode==='medical')return 'Esto necesita ayuda médica ahora, aunque te sientas bien. Ve a urgencias con alguien o llama al servicio de emergencias local. No esperes a tener síntomas ni te provoques el vómito. Dile a alguien cercano qué tomaste y cuándo; lleva el envase si puedes. ¿Estás sola ahora?';
  if(checkIn)return 'No quiero pasar por alto lo que me acabas de contar. Me importa que estés a salvo, y esto merece apoyo de alguien que pueda estar contigo de verdad. ¿Te has hecho daño o tomado algo, o piensas hacerlo ahora? Si hay peligro inmediato, busca urgencias o el servicio de emergencias local y avisa a alguien cercano. Mientras tanto, aléjate de cualquier cosa con la que puedas lastimarte y busca compañía.';
  return 'Lo que estás diciendo es serio y me preocupa tu seguridad. No voy a burlarme ni tratarlo como parte del coqueteo. ¿Te has hecho daño o tomado algo, o tienes intención de hacerlo ahora? Si ya hiciste algo o puedes hacerlo en este momento, ve a urgencias con alguien o llama al servicio de emergencias local. Busca a una persona de confianza que pueda estar contigo y aléjate de las cosas con las que podrías lastimarte. Mereces apoyo real; no tienes que llevar esto sola.';
 }
 if(state.mode==='disclosure')return "Thank you for telling me. I'm sorry you're facing anger when you need support after what happened. When did you take the pills, have you received medical care, and are you safe now? If this was recent or you haven't been assessed, get emergency medical help now even if you feel okay, and tell someone you trust who can stay with you. If you've already received care, we can talk about how you're feeling and who can support you today.";
 if(state.mode==='medical')return 'This needs medical help now, even if you feel okay. Go to an emergency department with someone or call your local emergency service. Do not wait for symptoms or make yourself vomit. Tell someone nearby what you took and when, and bring the packaging if you can. Are you alone right now?';
 if(checkIn)return "I don't want to brush past what you just told me. Your safety matters, and you deserve support from someone who can be there with you in person. Have you hurt yourself or taken anything, or are you thinking of doing so now? If there's immediate danger, contact local emergency services or go to an emergency department, and tell someone nearby. For now, move away from anything you could use to hurt yourself and get some company.";
 return "What you're saying is serious, and I'm concerned about your safety. I won't joke about it or turn it into flirting. Have you hurt yourself or taken anything, or are you thinking of doing so now? If you've already done something or might act now, go to an emergency department with someone or contact local emergency services. Tell someone you trust who can stay with you in person, and move away from anything you could use to hurt yourself. You deserve real support; you don't have to face this alone.";
}

