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

function clipboardEscapePattern(v=""){
 const t=n(v);
 const pressure=/\\b(?:student|students|committee|volunteer|petition|clipboard|raffle|wristband|signup|sign up|shift|roster|passes|flyer|forms|paperwork|mixer|gala)\\b/.test(t);
 const interception=/\\b(?:path|blocked|intercept|stepped into|approached|stopped|cornered)\\b/.test(t);
 const escape=/\\b(?:ignore|ignored|brushed past|turned his back|walked away|toward you|towards you|near you|over to you|busy|instead|get out of)\\b/.test(t);
 return pressure&&interception&&escape;
}
function genericApproachLoop(v=""){
 const t=n(v);
 const thirdParty=/\\b(?:student|volunteer|committee|petition|clipboard|forms|roster|sign|wristband|raffle|passes|flyer|clipboard|tablet|guest|lecturer)\\b/.test(t);
 const interruption=/\\b(?:path|stopped|blocked|approached|demand|insist|held out|intercept|confront|stepped directly)\\b/.test(t);
 const ignores=/\\b(?:didn t look|did not look|ignored|brushed past|without a backward glance|turned his back|eyes slid past|gaze flicked past)\\b/.test(t);
 const userFocus=/\\b(?:you|your)\\b/.test(t)&&/\\b(?:eyes|gaze|look|toward|approached|stopped a few feet|fixed on)\\b/.test(t);
 return thirdParty&&interruption&&ignores&&userFocus;
}
export function buildInstantStoryDirectorV35389({character={},idea="",recentOpenings=[]}={}){
 const stage=relationshipStage(character);
 return [
 "INSTANT STORY DIRECTOR 2.0 · VELVET 3.53.89:",
 "1) OPENING PREMISE COMPILER: silently resolve WHO is present, WHY this moment exists, WHAT is already happening, WHAT the lead wants now, and WHAT can materially change within minutes. Prose starts only after those five answers exist.",
 "2) RELATIONSHIP-AWARE OPENING: configured relationship stage="+stage+". Calibrate familiarity, touch, trust, jealousy, entitlement, knowledge and vulnerability to that stage. Attraction is not a relationship. Strangers do not inherit couple intimacy; established partners do not reset to strangers.",
 "PREMISE DIVERSITY FIREWALL: never use the campus clipboard escape structure (student/committee intercepts lead with a sheet, shift, wristband, obligation or demand; lead ignores them, walks to user and asks to look busy). This is ONE repeated causal skeleton even if names, props and setting change. Start from a genuinely different causal event instead.",
 "OPENING ANTI-REPETITION v3: Never use an administrative campus demand (petitions, clipboards, sign-offs, parking, rosters, committees, obligations) followed by Chase ignoring it, fixing his gaze on the user and approaching with a vague confession. This entire sequence is prohibited even if every noun changes.",
 "NEW SOCIAL CAUSALITY: choose a distinctive concrete event whose consequence is visible NOW: a friend reveals a secret to the wrong person; someone openly flirts with Chase and expects an answer; Chase makes a surprising but motivated decision in front of his peers; an ongoing disagreement changes alliances; a prank rebounds on its instigator; two NPCs disagree with each other; a promise is called in. Only use events consistent with character canon. Make NPCs speak and act rather than functioning as disposable obstacles.",
 "CHASE OPENING RHYTHM: Chase may be occupied with others and NOT immediately approach the user. Show an NPC's agency and Chase's response, including attraction from third parties. No repetitive gaze-lock, sudden unreadable intensity, empty serious monologue or obligatory final approach. Give the player a live social situation rather than a generic invitation.",
 "PRE-WRITING CAUSALITY: select a concrete goal for the lead and a distinct motive for every NPC. Establish why each action follows the previous action. No ambiguous pronoun referents, disproportionate emotional distress over trivial logistics, or invented pressure without a reason.",
 "DIVERSE ACTION FAMILIES: rotate between character-initiated plans, social rivalries, surprising choices with grounded motives, third-party flirtation, mistakes with consequences, genuine intimacy, public conflict, and quiet tension. Do not make the user a perpetual escape hatch. A character can stay with other people while initiating a scene.",
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
 if(clipboardEscapePattern(opening))issues.push("instant_story_clipboard_escape_loop");
 if(genericApproachLoop(opening))issues.push("instant_story_generic_third_party_approach_loop");
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
export const __testV35389={relationshipStage,rescuePattern,objectUser,fakeChoice,floatingDialogue,userChoreography,staleSetup,clipboardEscapePattern,genericApproachLoop};
