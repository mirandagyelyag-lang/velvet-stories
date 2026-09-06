export type NpcEcosystemSocialNetworkV3 = {
  nodes: Array<{ name:string; role:string; circle:string; availability:string; recurring:boolean; currentGoal:string }>;
  edges: Array<{ from:string; to:string; relationship:string; visibility:string; evidence:string }>;
  independentEdges: string[];
  circles: Array<{ name:string; members:string[]; domain:string }>;
  recurringCandidates: string[];
  activeNpcThreads: string[];
  informationRoutes: string[];
  groupTraffic: { presentCount:number; maxActiveSpeakers:number; quietMembersAllowed:boolean; policy:string };
  recurrencePolicy: string;
  relationshipContinuityPolicy: string;
  informationFlowPolicy: string;
  availabilityPolicy: string;
  crossCirclePolicy: string;
  antiOrbitPolicy: string;
  instruction: string;
};

type Args = {
  persistentCast?: Array<Record<string, any>>;
  castConnections?: Array<Record<string, any>>;
  knowledgeLedger?: Array<Record<string, any>>;
  recentMessages?: Array<Record<string, any>>;
  sceneState?: Record<string, any>;
  leadName?: string;
  userName?: string;
};

type IssueArgs = {
  reply?: string;
  engine?: Partial<NpcEcosystemSocialNetworkV3>;
  latestUserMessage?: string;
  recentCharacterReplies?: string[];
};

const text=(v:any)=>String(v??"").replace(/\s+/g," ").trim();
const norm=(v:any)=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9\s'-]/g," ").replace(/\s+/g," ").trim();
const uniq=(xs:string[])=>[...new Set(xs.map(text).filter(Boolean))];
const list=(v:any)=>Array.isArray(v)?v:[];

function circleFor(npc:Record<string,any>={}){
  const blob=norm([npc.role,npc.relationship,npc.personality_note,npc.current_dynamic,npc.goals,npc.offscreen_motion,npc.next_intention].join(" | "));
  if(/race|racing|driver|crew|mechanic|garage|street/.test(blob)) return {name:"racing",domain:"racing / underground motorsport"};
  if(/team|captain|athlete|practice|coach|football|soccer|basketball|hockey|tennis|polo|sport/.test(blob)) return {name:"athletics",domain:"sport / team"};
  if(/class|campus|university|college|student|professor|seminar|lab/.test(blob)) return {name:"campus",domain:"university"};
  if(/family|sister|brother|mother|father|cousin|heir|staff|assistant|business|company|board/.test(blob)) return {name:"family-status",domain:"family / status / business"};
  if(/ex|dated|flirt|crush|hookup|romantic/.test(blob)) return {name:"dating-history",domain:"dating / romantic history"};
  if(/friend|roommate|best friend|crew/.test(blob)) return {name:"friends",domain:"friend group"};
  return {name:"general",domain:"general social world"};
}

function availabilityFor(npc:Record<string,any>={}){
  const blob=norm([npc.presence,npc.status,npc.offscreen_motion,npc.next_intention,npc.current_dynamic].join(" | "));
  if(/left|away|travel|work|class|practice|race|meeting|busy|offscreen|gone/.test(blob)) return "occupied/off-screen unless a grounded reason brings them in";
  if(/present|here|with them|at the table|in the room/.test(blob)) return "present in the live scene";
  return "unknown; do not summon automatically";
}

function evidenceForConnection(c:Record<string,any>={}){
  return text(c.evidence||c.last_interaction||c.updated_from||"");
}

function knownRoute(k:Record<string,any>={}){
  const who=text(k.character_name||k.who), subject=text(k.subject), source=text(k.source), knowledge=text(k.knowledge||k.knows), status=text(k.status||"known");
  if(!who || !knowledge) return "";
  return `${source||"unknown source"} → ${who}${subject?` about ${subject}`:""}: ${knowledge} [${status}]`;
}

function recentNpcMentions(messages:Array<Record<string,any>>=[], names:string[]=[]){
  const joined=norm(list(messages).slice(-40).map((m:any)=>m?.content||m?.text||"").join("\n"));
  return names.filter((name)=>joined.includes(norm(name))).slice(0,10);
}

export function deriveNpcEcosystemSocialNetworkV3(args:Args={}):NpcEcosystemSocialNetworkV3{
  const cast=list(args.persistentCast).filter((x:any)=>text(x?.name));
  const lead=norm(args.leadName), user=norm(args.userName);
  const nodes=cast.slice(0,20).map((npc:any)=>{
    const circle=circleFor(npc);
    return {
      name:text(npc.name), role:text(npc.role||npc.relationship||"recurring character"), circle:circle.name,
      availability:availabilityFor(npc), recurring:true,
      currentGoal:text(npc.goals||npc.next_intention||npc.offscreen_motion||"keep their own life moving without orbiting the protagonist"),
    };
  });
  const edges=list(args.castConnections).slice(0,40).map((c:any)=>({
    from:text(c.from_name), to:text(c.to_name), relationship:text(c.relationship), visibility:text(c.visibility||"known"), evidence:evidenceForConnection(c),
  })).filter((x:any)=>x.from&&x.to&&x.relationship);
  const independentEdges=edges.filter((e:any)=>![lead,user].includes(norm(e.from))&&![lead,user].includes(norm(e.to))).map((e:any)=>`${e.from} ↔ ${e.to}: ${e.relationship}`).slice(0,10);
  const byCircle=new Map<string,{name:string;members:string[];domain:string}>();
  for(const npc of cast.slice(0,20)){
    const c=circleFor(npc);
    const row=byCircle.get(c.name)||{name:c.name,members:[],domain:c.domain};
    row.members.push(text(npc.name));
    byCircle.set(c.name,row);
  }
  const circles=[...byCircle.values()].map((c)=>({...c,members:uniq(c.members).slice(0,10)})).slice(0,8);
  const names=nodes.map((n)=>n.name);
  const mentioned=recentNpcMentions(args.recentMessages||[],names);
  const recurringCandidates=uniq([...mentioned,...nodes.filter((n)=>/present/.test(n.availability)).map((n)=>n.name)]).slice(0,8);
  const activeNpcThreads=uniq(cast.slice(0,20).flatMap((npc:any)=>[
    text(npc.current_dynamic)?`${text(npc.name)}: ${text(npc.current_dynamic)}`:"",
    text(npc.next_intention)?`${text(npc.name)} wants: ${text(npc.next_intention)}`:"",
    text(npc.offscreen_motion)?`${text(npc.name)} off-screen: ${text(npc.offscreen_motion)}`:"",
  ])).slice(0,10);
  const informationRoutes=uniq(list(args.knowledgeLedger)
    .filter((k:any)=>!Boolean(k?.secret) || norm(k?.character_name||k?.who)===lead)
    .map((k:any)=>knownRoute(k)).filter(Boolean)).slice(0,10);
  const present=list(args.sceneState?.present).map(text).filter(Boolean);
  const presentNpcCount=present.filter((name)=>![lead,user].includes(norm(name))).length;
  const maxActiveSpeakers=presentNpcCount>=5?2:presentNpcCount>=3?2:Math.max(1,presentNpcCount);
  return {
    nodes,edges:edges.slice(0,18),independentEdges,circles,recurringCandidates,activeNpcThreads,informationRoutes,
    groupTraffic:{presentCount:presentNpcCount,maxActiveSpeakers,quietMembersAllowed:true,policy:"Group scenes are sparse traffic, not a roll call. Only the people with a live reason should speak; others may listen, talk to each other, be distracted, arrive late or leave."},
    recurrencePolicy:"Prefer an established minor character when the same social role naturally returns. Do not generate a fresh anonymous roommate/classmate/mechanic/teammate every scene when a compatible recurring NPC already exists.",
    relationshipContinuityPolicy:"NPC↔NPC history is durable. Prior flirting, rivalry, friendship, dating, grudges, favors and awkwardness remain true until later evidence changes them. Re-entry does not reset two people to strangers.",
    informationFlowPolicy:"Knowledge must travel through a witness, message, public event or named source. Separate what each NPC knows from what the lead knows. Rumors stay uncertain and can mutate or die instead of becoming universal truth.",
    availabilityPolicy:"NPCs are not summonable furniture. Respect known obligations, off-screen motion and scene presence. Absence is normal; being relevant does not mean being available.",
    crossCirclePolicy:"University, family, racing, sport, status and dating circles may collide only through a plausible bridge already present in canon or created visibly on-page. Do not teleport one domain into another merely to create drama.",
    antiOrbitPolicy:"The social graph is not a wheel with the user at the center. NPCs can like, dislike, date, compete with, help, ignore, message or disappoint EACH OTHER. They can disagree with the lead and user without becoming villains.",
    instruction:"NPC ECOSYSTEM + SOCIAL NETWORK 3.0: treat supporting characters as persistent people in a graph. Preserve names, roles, goals, availability, interpersonal history and asymmetric knowledge across scenes. Reuse recurring people when their role returns. Let NPC↔NPC relationships change only from visible or recorded evidence. Friends need not all agree; rivals need not exist only to provoke the protagonist; past flirtation does not vanish when the central ship advances. In groups, do not make everyone speak or react every turn. Information cannot spread telepathically. Keep social circles domain-specific and allow cross-circle collisions only with a causal bridge. The world may continue off-screen without inventing major unseen relationship milestones.",
  };
}

function sentenceSplit(reply:string){return text(reply).match(/[^.!?]+[.!?]+(?:["”']+)?|[^.!?]+$/g)||[text(reply)];}
function hasAnyName(value:string,names:string[]){const n=norm(value);return names.some((name)=>n.includes(norm(name)));}

export function npcEcosystemIssues(args:IssueArgs={}):string[]{
  const reply=text(args.reply), engine=args.engine||{}; if(!reply) return [];
  const issues:string[]=[];
  const nodes=list(engine.nodes) as Array<any>;
  const names=nodes.map((n)=>text(n.name)).filter(Boolean);
  const independent=list(engine.independentEdges);
  const routes=list(engine.informationRoutes);
  const sentences=sentenceSplit(reply);
  const n=norm(reply);

  if(names.length>=3 && /\b(?:everyone|everybody|the whole group|all of them)\b.{0,80}\b(?:turned to|looked at|watched|waited for|agreed with|nodded at)\b.{0,90}\b(?:you|her|him)\b/i.test(reply)) issues.push("npc_protagonist_orbit_collapse");
  if(independent.length>0 && /\b(?:everyone|the whole group|all of them)\b.{0,90}\b(?:agreed|nodded in agreement|backed (?:him|her|you) up|took (?:his|her|your) side)\b/i.test(reply)) issues.push("npc_puppet_consensus");
  if(routes.length===0 && /\b(?:everyone already knew|the whole campus knew|word had spread to everyone|somehow everyone knew|everybody had heard)\b/i.test(reply)) issues.push("telepathic_social_spread");

  const bonded=list(engine.edges) as Array<any>;
  for(const edge of bonded){
    const from=text(edge.from),to=text(edge.to);
    if(!from||!to) continue;
    const both=hasAnyName(reply,[from])&&hasAnyName(reply,[to]);
    if(both && /\b(?:never met|complete strangers|didn'?t know each other|had no idea who .* was)\b/i.test(reply)) { issues.push("npc_relationship_history_reset"); break; }
  }

  for(const npc of nodes){
    const name=text(npc.name); if(!name||!norm(reply).includes(norm(name))) continue;
    if(/\b(?:a stranger|some random (?:guy|girl|student|person)|someone (?:he|she|they) had never met)\b/i.test(reply) && /recurring|friend|rival|ex|teammate|classmate|mechanic|roommate/i.test(text(npc.role))) { issues.push("recurring_npc_identity_reset"); break; }
  }

  const max=Math.max(1,Number((engine.groupTraffic as any)?.maxActiveSpeakers||2));
  const speakerLabels=names.filter((name)=>new RegExp(`(?:^|\\n)\\s*${name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*:`,'im').test(reply));
  if(speakerLabels.length>max) issues.push("group_turn_crowding");

  if(/\b(?:nobody else mattered|everyone else disappeared|the rest of the world faded away|it was like nobody else existed)\b/i.test(reply) && nodes.length>=2) issues.push("ship_bubble_social_erasure");
  if(/\b(?:out of nowhere|for no reason|randomly)\b.{0,100}\b(?:racer|crew|mechanic|teammate|coach|business associate|family friend|ex)\b/i.test(reply)) issues.push("cross_circle_collision_without_cause");

  const repeatedGeneric=sentences.filter((s)=>/\b(?:a classmate|a teammate|a friend|a mechanic|a girl from class|a guy from class)\b/i.test(s));
  if(repeatedGeneric.length>=2 && list(engine.recurringCandidates).length>0) issues.push("recurring_npc_fragmentation");

  return uniq(issues);
}

export function sanitizeNpcEcosystemReply(reply:string,issues:string[]=[]):string{
  let out=text(reply); if(!out) return out;
  const drop=(re:RegExp)=>{ out=(out.match(/[^.!?]+[.!?]+(?:["”']+)?|[^.!?]+$/g)||[out]).filter((s)=>!re.test(s)).join(" ").replace(/\s+/g," ").trim(); };
  if(issues.includes("telepathic_social_spread")) drop(/everyone already knew|whole campus knew|word had spread to everyone|somehow everyone knew|everybody had heard/i);
  if(issues.includes("npc_protagonist_orbit_collapse")) drop(/everyone|everybody|whole group|all of them/i);
  if(issues.includes("npc_puppet_consensus")) drop(/everyone|whole group|all of them/i);
  if(issues.includes("npc_relationship_history_reset")) drop(/never met|complete strangers|didn'?t know each other|had no idea who/i);
  if(issues.includes("recurring_npc_identity_reset")) drop(/a stranger|some random|had never met/i);
  if(issues.includes("ship_bubble_social_erasure")) drop(/nobody else mattered|everyone else disappeared|rest of the world faded away|nobody else existed/i);
  if(issues.includes("cross_circle_collision_without_cause")) drop(/out of nowhere|for no reason|randomly/i);
  if(issues.includes("group_turn_crowding")) {
    const paragraphs=out.split(/\n{2,}/); out=paragraphs.slice(0,Math.min(3,paragraphs.length)).join("\n\n").trim();
  }
  return out;
}
