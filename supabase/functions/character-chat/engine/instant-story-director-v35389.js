// Velvet 3.53.89 · Instant Story Director 2.0
const s=(v="",n=900)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const n=(v="")=>s(v,12000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const arr=v=>Array.isArray(v)?v:[];

function relationshipStage(character={}){
 const r=n(character.relationship||character.relationshipToMe||character.relationship_to_me||"");
 if(/stranger|never met|don t know/.test(r))return "strangers";
 if(/enemy|rival|hate|don t get along/.test(r))return "rivals";
 if(/ex\b|ex boyfriend|ex girlfriend/.test(r))return "exes";
 if(/best friend|friend/.test(r))return "friends";
 if(/boyfriend|girlfriend|dating|relationship|partner/.test(r))return "together";
 if(/crush|like her|likes her|like you|attract/.test(r))return "attraction";
 return "configured";
}
function rescuePattern(v=""){const t=n(v);return /(?:creep|annoying guy|stranger|wouldn t leave you alone|bothering you)/.test(t)&&/(?:stepped between|pulled you away|rescued|saved you|come with me|we re leaving)/.test(t)}
function objectUser(v=""){return /\b(?:claimed you|possessive over you|you were his|you belonged to him|showed you off|used you to make|dragged you|pulled you against)\b/i.test(String(v||""))}
function fakeChoice(v=""){return /\b(?:your choice|you decide|up to you|either .* or .* what do you|which one do you choose)\b/i.test(String(v||""))}
function floatingDialogue(v=""){return /^\s*["“][^"”]{2,}["”]/.test(String(v||""))}
function userChoreography(v=""){return /\byou (?:walked|sat|stood|followed|nodded|smiled|laughed|felt|thought|wanted|took|grabbed|held|moved|stepped|arrived|entered|leaned|looked)\b/i.test(String(v||""))}
function staleSetup(v="",recent=[]){const t=n(v);const fam=(x)=>[/\bparty\b|\bclub\b/,/\bhallway\b|\bcorridor\b/,/\bstation\b|\bplatform\b/,/\bdelivery\b|\bpackage\b/,/\bcoffee\b|\bcafe\b/,/\bkitchen\b/].map((r,i)=>r.test(n(x))?i:-1).filter(i=>i>=0);const f=fam(t);return f.length>0&&arr(recent).slice(-5).filter(x=>fam(x).some(i=>f.includes(i))).length>=2}

export function buildInstantStoryDirectorV35389({character={},idea="",recentOpenings=[]}={}){
 const stage=relationshipStage(character);
 return [
 "INSTANT STORY DIRECTOR 2.0 · VELVET 3.53.89:",
 "1) OPENING PREMISE COMPILER: silently resolve WHO is present, WHY this moment exists, WHAT is already happening, WHAT the lead wants now, and WHAT can materially change within minutes. Prose starts only after those five answers exist.",
 "2) RELATIONSHIP-AWARE OPENING: configured relationship stage="+stage+". Calibrate familiarity, touch, trust, jealousy, entitlement, knowledge and vulnerability to that stage. Attraction is not a relationship. Strangers do not inherit couple intimacy; established partners do not reset to strangers.",
 "3) IMMEDIATE PLAYABLE PROBLEM: create one ordinary but consequential pressure, opportunity, obligation, mistake, rumor, favor, changed plan, social complication or decision. It must be capable of evolving beyond the opening.",
 "4) OPENING SOCIAL WORLD: the lead may already be talking, planning, joking, working or dealing with other people. Supporting people keep their own local purpose. Do not freeze the world when the user is present.",
 "5) SPEAKER OWNERSHIP: every spoken line has an unmistakable addressee BEFORE or AT the line. No floating dialogue.",
 "6) USER ENTRANCE LOGIC: silently establish whether the user is present, nearby, arriving only if creator canon says so, or not yet involved. Never react to an unseen/unperformed user action. Never narrate the user's entrance, body, feelings or compliance.",
 "7) CHARACTER-SPECIFIC OPENING DNA: the lead's goal, pressure, decision and speech must materially depend on THIS profile. If swapping in another Velvet character leaves the scene intact, rewrite before output.",
 "8) NO FAKE CHOICE: the lead has preferences and makes decisions. Never dump A/B options, 'your choice', or responsibility for inventing the plot onto the user.",
 "9) OPENING MOMENTUM CONTRACT: silently preserve 2-4 plausible future directions, but execute only the first live beat. Do not show a menu. The user's first reply must be able to redirect the scene.",
 "10) INSTANT STORY QUALITY GATE: movement + specificity + initiative + continuity + playable value are mandatory. A technically coherent but inert opening is a failed opening.",
 "NO RESCUE / NO OBJECT / NO RECYCLED SETUP GATE: never manufacture an annoying stranger solely so the lead can rescue the user; never treat the user as property/prize/jealousy prop; do not recycle party, hallway, station, delivery/package, coffee or kitchen structures merely because they are easy.",
 "RECENT OPENINGS="+s(JSON.stringify(arr(recentOpenings).slice(-5).map(x=>s(x,180))),1400),
 "IDEA="+(s(idea,420)||"none"),
 "LEAD="+(s(character.name,100)||"configured character")
 ].join("\n");
}

export function instantStoryDirectorIssuesV35389(opening="",{character={},recentOpenings=[]}={}){
 const issues=[];
 if(rescuePattern(opening))issues.push("instant_story_rescue_template");
 if(objectUser(opening))issues.push("instant_story_user_as_object");
 if(fakeChoice(opening))issues.push("instant_story_fake_choice");
 if(floatingDialogue(opening))issues.push("instant_story_floating_dialogue");
 if(userChoreography(opening))issues.push("instant_story_user_choreography");
 if(staleSetup(opening,recentOpenings))issues.push("instant_story_recycled_setup");
 const t=n(opening);
 if(t.length<120)issues.push("instant_story_underdeveloped");
 if(!/\b(?:said|asked|told|turned|chose|decided|left|stayed|sent|called|refused|offered|changed|started|stopped|walked|moved|took|gave|opened|closed|arrived|interrupted|answered)\b/.test(t))issues.push("instant_story_low_initiative");
 return [...new Set(issues)];
}
export const __testV35389={relationshipStage,rescuePattern,objectUser,fakeChoice,floatingDialogue,userChoreography,staleSetup};
