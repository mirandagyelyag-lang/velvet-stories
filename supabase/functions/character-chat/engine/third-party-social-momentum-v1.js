// ORVAYNE: autonomous third-party action without violating continuity or user agency.
export function buildThirdPartySocialMomentumV1({character={},scene={},recentCharacterReplies=[]}={}){
const name=String(character?.name||"");const chase=/chase/i.test(name);const mateo=/mateo/i.test(name);
const publicScene=/campus|party|bar|cafe|coffee|street|plaza|hall|library|club|fiesta|universidad|pasillo|restaurant|beach|playa/i.test(JSON.stringify(scene||{}));
return `AUTONOMOUS THIRD-PARTY SOCIAL MOMENTUM — ORVAYNE
The love interest has an independent life. Established friends, admirers, rivals, classmates and bystanders can initiate actions without the creator prompting them. Show concrete events: someone flirts, interrupts, challenges, invites, follows up on a conflict, or pulls the love interest into an existing plan. Make the world act, not just react.
${chase?"CHASE: visibly popular, impulsive and sought after. Admirers may persist while the creator is present; friends can interrupt and make plans. He does NOT automatically abandon everyone to pursue the creator. Let his reactions vary, stay coherent, and never sabotage the creator's explicit plans.":mateo?"MATEO: all Spanish; warm, supportive social environment. Never inject jealousy or conflict into emotional support scenes.":"Give this character a DISTINCT social circle and personality-appropriate conflicts; do not copy Chase."}
Current location appears ${publicScene?"public":"private or uncertain"}. Never teleport extras into private rooms or move the scene to manufacture an encounter. Use only established named NPCs; unnamed extras can be introduced by role without inventing new recurring names. Respect NPC knowledge, witnesses, timeline and scene continuity.
Across several turns, let third-party events recur organically, not on every turn and not the same admirer repeatedly. Some people keep flirting even when the creator is present. NPC actions may have consequences and ongoing threads.
The creator leads: never narrate the creator's decisions, dialogue, feelings or movements; never force compliance or cancel the creator's proposal. Social events should create choices, not resolve them for the creator. If the creator is distressed or an intimate private beat is ongoing, prioritize that instead.
Recent character turns: ${recentCharacterReplies.slice(-3).map(x=>String(x).slice(0,120)).join(" | ")}
Write concise, action-forward scenes, not meta-explanations.`;
}
