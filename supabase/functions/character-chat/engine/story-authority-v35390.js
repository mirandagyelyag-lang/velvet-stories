// Velvet 3.53.90 · Story Authority Engine
const clean=(v="",m=900)=>String(v??"").replace(/\s+/g," ").trim().slice(0,m);
const norm=v=>clean(v,4000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"'").replace(/[^a-z0-9' ]/g," ").replace(/\s+/g," ").trim();
const PATH_MARKER="[CREATOR_SELECTED_STORY_PATH — REQUIRED NEXT BEAT]";
const ACTIONS=[
 {id:"kiss",intent:/\b(?:kiss|beso|besar|b[eé]salo|b[eé]sala)\b/i,done:/\b(?:kiss(?:ed|es|ing)?|bes(?:o|ó|a|ando))\b/i,almost:/\b(?:almost|nearly|wanted to|thought about|considered|leaned (?:in|closer)|hovered|stopped short|casi|quiso|pens[oó] en)\b.{0,45}\b(?:kiss|bes)/i},
 {id:"hug",intent:/\b(?:hug|abrazo|abrazar|abr[aá]zalo|abr[aá]zala)\b/i,done:/\b(?:hug(?:ged|s|ging)?|embraced|abraz(?:ó|o|a|ando))\b/i,almost:/\b(?:almost|nearly|wanted to|considered|casi|quiso)\b.{0,45}\b(?:hug|abraz)/i},
 {id:"leave",intent:/\b(?:leave|go away|walk away|irse|vete|se va|que se vaya)\b/i,done:/\b(?:left|walked away|headed out|went out|se fue|salió|se marchó)\b/i},
 {id:"stay",intent:/\b(?:stay|don'?t leave|qu[eé]date|que se quede|no te vayas)\b/i,done:/\b(?:stayed|didn'?t leave|remained|se quedó|no se fue)\b/i},
 {id:"confess",intent:/\b(?:confess|admit (?:it|his|her)|tell .* (?:feel|like|love)|confiesa|admite|dile .* (?:gusta|ama|siente))\b/i,done:/\b(?:confessed|admitted|i like you|i love you|me gustas|te quiero|te amo|admitió|confesó)\b/i},
 {id:"tell",intent:/\b(?:tell him|tell her|dile|cu[eé]ntale)\b/i,done:/\b(?:told him|told her|le dijo|le contó)\b/i},
 {id:"interrupt",intent:/\b(?:interrupt|cut in|interrumpe|interrumpir)\b/i,done:/\b(?:interrupted|cut in|interrumpió)\b/i}
];
function sourceText({latestUserMessage="",directorInstruction=""}={}){const d=clean(directorInstruction,1400);return d.includes(PATH_MARKER)?d.replace(PATH_MARKER,""):clean(latestUserMessage,900)}
export function compileStoryAuthorityV35390({latestUserMessage="",directorInstruction="",previous={}}={}){
 const selectedPath=String(directorInstruction||"").includes(PATH_MARKER);
 const src=sourceText({latestUserMessage,directorInstruction});
 const action=ACTIONS.find(x=>x.intent.test(src));
 const imperative=selectedPath||/^(?:kiss|hug|leave|stay|tell|confess|interrupt|go|come|bes|abraz|vete|dile|confiesa)\b/i.test(norm(src));
 const strength=selectedPath?100:imperative?90:action?72:0;
 const previousActive=previous&&previous.status==="active"?previous:null;
 const explicitOverride=/\b(?:instead|actually|wait|no,?|rather|mejor|espera|no,?|en vez|cambio)\b/i.test(src);
 const chosen=(explicitOverride||action||!previousActive)?action?.id:(previousActive?.action||"");
 return {schema:"v3.53.90",source:selectedPath?"story_path":imperative?"direct_command":"user_turn",strength,action:chosen||"",status:chosen?"active":"none",instruction:clean(src,600),overrides_previous:Boolean(explicitOverride&&previousActive),multi_turn:Boolean(selectedPath&&/\b(?:eventually|over time|later|after|then|eventualmente|despu[eé]s|luego)\b/i.test(src))};
}
export function evaluateStoryAuthorityV35390({contract={},reply=""}={}){
 if(!contract?.action||contract?.status!=="active")return {required:false,fulfilled:true,issues:[]};
 const def=ACTIONS.find(x=>x.id===contract.action);if(!def)return {required:true,fulfilled:true,issues:[]};
 const done=def.done.test(String(reply||""));const almost=def.almost?.test(String(reply||""))||false;
 const fulfilled=done&&!almost;const issues=[];
 if(almost)issues.push("authority_fake_fulfillment");
 if(!done)issues.push("authority_required_action_missing");
 return {required:true,fulfilled,issues,action:contract.action,strength:contract.strength};
}
export function storyAuthorityPromptV35390(contract={}){
 if(!contract?.action)return "";
 return `STORY AUTHORITY ENGINE 3.53.90 · strength ${contract.strength}/100
CREATOR INTENT CONTROLS WHAT HAPPENS. CHARACTER IDENTITY CONTROLS HOW IT HAPPENS.
Required action/outcome: ${contract.action}. Execute it visibly when physically/canonically possible. Do not replace completion with wanting, almost doing, preparing, discussing, implying or asking permission on the creator's behalf. Preserve user agency: never invent the user's reciprocation, feelings, dialogue or voluntary movement. Character voice, emotion, hesitation before execution, style and consequences remain character-specific. A newer explicit creator override cancels an older path. Public actions create witness/consequence state for people actually present.`;
}
export const __testV35390={ACTIONS,PATH_MARKER};
