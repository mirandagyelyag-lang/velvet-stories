export type SocialIdentityDomain = {
  key: string;
  label: string;
  recognition: "low" | "known" | "well-known" | "famous";
  knownFor: string;
  approachTypes: string[];
  socialEffects: string[];
  sceneMarkers: string[];
  lifeMarkers: string[];
};

export type SocialWorldIdentity = {
  identitySignature: string;
  recognitionLevel: "ordinary" | "known" | "well-known" | "campus-famous" | "domain-famous" | "public-figure";
  reputation: string[];
  domains: SocialIdentityDomain[];
  approachTypes: string[];
  socialEffects: string[];
  lifeDomains: string[];
  strongGravity: boolean;
  romanticMagnetism: boolean;
  fearedRespect: boolean;
};

const norm=(value:any)=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9\s'-]/g," ").replace(/\s+/g," ").trim();
const uniq=(values:string[])=>[...new Set(values.map((v)=>String(v||"").trim()).filter(Boolean))];

export function socialIdentityProfileText(character: Record<string, unknown> = {}) {
  return norm([
    character.role, character.description, character.personality, character.relationship,
    character.scenario, character.world, character.character_values, character.values,
    character.habits, character.contradictions, character.core_motivation, character.coreMotivation,
    character.background, character.notes,
  ].filter(Boolean).join(" | "));
}

function domain(key:string,label:string,recognition:SocialIdentityDomain["recognition"],knownFor:string,approachTypes:string[],socialEffects:string[],sceneMarkers:string[],lifeMarkers:string[]):SocialIdentityDomain {
  return { key,label,recognition,knownFor,approachTypes:uniq(approachTypes),socialEffects:uniq(socialEffects),sceneMarkers,lifeMarkers };
}

export function deriveSocialWorldIdentity(character: Record<string, unknown> = {}): SocialWorldIdentity {
  const p=socialIdentityProfileText(character);
  const domains:SocialIdentityDomain[]=[];
  const reputation:string[]=[];
  const approachTypes:string[]=[];
  const socialEffects:string[]=[];
  const lifeDomains:string[]=[];

  const campusContext=/\b(?:campus|university|uni|college|student|fraternity|sorority|campus life|campus social)\b/.test(p);
  const knownSignal=/\b(?:well known|well-known|everyone knows|everybody knows|widely known|known around|recognized|recognised|popular|campus prince|campus king|campus heartthrob|heartthrob|heartbreaker|famous|celebrity|notorious|feared|respected|influential|prominent|legend|star player|captain|most wanted|desired|turns heads)\b/.test(p);
  const veryKnownSignal=/\b(?:everyone knows|everybody knows|famous|celebrity|campus prince|campus king|campus heartthrob|widely known|notorious|legend|public figure|household name)\b/.test(p);
  const romanticMagnetism=/\b(?:campus heartthrob|heartthrob|heartbreaker|campus crush|most wanted|highly desired|widely desired|everyone wants|girls? (?:want|chase|flirt)|women (?:want|chase|flirt)|guys? (?:want|chase|flirt)|men (?:want|chase|flirt)|(?:girls?|women|guys?|men)\b.{0,40}\b(?:approach|flirt|chase|want)|people\b.{0,40}\b(?:flirt|approach|try to get (?:his|her|their) attention)|playboy|ladies man|womanizer|serial dater|never short of (?:dates|attention|options))\b/.test(p);
  const fearedRespect=/\b(?:feared|respected|intimidating|notorious|dangerous reputation|people move out of (?:his|her|their) way|command(?:s|ed)? respect)\b/.test(p);

  if (campusContext && (knownSignal || /\b(?:billionaire|millionaire|heir|heiress|captain|star athlete|quarterback|student body president|socialite)\b/.test(p))) {
    const recognition:SocialIdentityDomain["recognition"] = veryKnownSignal ? "famous" : knownSignal ? "well-known" : "known";
    const knownFor = romanticMagnetism ? "campus desirability and social reputation" : fearedRespect ? "status, reputation and the way people respond to them" : /\b(?:billionaire|millionaire|heir|heiress|old money|prominent family)\b/.test(p) ? "wealth, family name and status" : /\b(?:captain|star athlete|quarterback|athlete)\b/.test(p) ? "athletic status and campus reputation" : "public campus reputation";
    domains.push(domain("campus","University / campus",recognition,knownFor,
      romanticMagnetism?["flirting","invitations","people trying to get their attention","acquaintances approaching"]:["greetings","acquaintances approaching","networking","invitations"],
      fearedRespect?["people make room","strangers become more careful","recognition changes tone","visible deference"]:["people recognize them","their name travels ahead of them","social attention follows them","people try to join or greet them"],
      ["campus","university","uni","college","student union","quad","library","cafeteria","lecture","class","hallway","party","fraternity","sorority"],
      ["class","campus","student","university"]));
  }

  if (/\b(?:underground racer|street racer|illegal racer|illegal racing|street racing|underground racing|race driver|racing driver|racecar|race car|motorsport|drift(?:er|ing)?|rally driver)\b/.test(p)) {
    const recognition:SocialIdentityDomain["recognition"] = /\b(?:legend|famous|notorious|feared|respected|champion|well known|widely known)\b/.test(p) ? "famous" : "well-known";
    domains.push(domain("racing","Racing / underground racing",recognition,"driving, racing reputation and standing inside the racing scene",
      ["rivals approaching","crew contact","drivers testing them","people asking about races or cars","sponsors or organizers when canon supports it"],
      fearedRespect?["rivals measure their words","people recognize the car or name","space opens around them","respect or caution appears before friendliness"]:["drivers recognize them","rivals notice them","crew and regulars treat them as an insider"],
      ["race","racing","track","circuit","garage","pit","car meet","meet","warehouse","street race","underground","paddock","workshop"],
      ["race","racing","car","garage","crew","driver","track"]));
  }

  if (/\b(?:billionaire|millionaire|multimillionaire|multi millionaire|heir|heiress|old money|family empire|prominent family|powerful family|socialite|tycoon)\b/.test(p)) {
    const recognition:SocialIdentityDomain["recognition"] = /\b(?:billionaire|multimillionaire|prominent family|famous|everyone knows|family empire)\b/.test(p) ? "famous" : "well-known";
    domains.push(domain("wealth","Wealth / status",recognition,"wealth, family name, access and social status",
      ["networking","status-seeking","invitations","people asking favors","romantic attention when profile supports it"],
      ["staff or hosts may recognize them","access and deference change","people may seek proximity for status","their surname can carry weight"],
      ["campus","university","restaurant","gala","event","hotel","club","office","boardroom","party","vip","public"],
      ["business","family","money","meeting","board","company","estate","assistant"]));
  }

  if (/\b(?:athlete|captain|quarterback|football player|soccer player|basketball player|baseball player|hockey player|tennis player|swimmer|star player|varsity|olympian|champion)\b/.test(p)) {
    domains.push(domain("athletics","Sports / athletics",/\b(?:star player|captain|champion|olympian|famous|well known)\b/.test(p)?"famous":"well-known","athletic role, team standing and competitive reputation",
      ["teammates approaching","opponents recognizing them","fans or students greeting them","sports invitations"],
      ["team obligations remain real","people know the role they play","their schedule and social circle are not generic campus life"],
      ["campus","university","gym","field","stadium","practice","game","match","locker room","training"],
      ["practice","training","game","match","team","coach","sport"]));
  }

  if (/\b(?:musician|singer|actor|actress|model|celebrity|influencer|streamer|artist|idol|rock star|pop star|public figure)\b/.test(p)) {
    domains.push(domain("public_fame","Public fame","famous","public work and recognizable identity",
      ["fans approaching","photo requests","industry contacts","invitations","press attention when appropriate"],
      ["recognition can happen outside their home domain","privacy and access may change","strangers may know their name without knowing them personally"],
      ["public","event","restaurant","street","mall","hotel","campus","concert","studio","premiere"],
      ["studio","show","shoot","recording","performance","press","manager","fans"]));
  }

  if (/\b(?:ceo|founder|boss|kingpin|mafia|gang leader|leader|president|powerful|feared|notorious|command(?:s|ed)? respect)\b/.test(p)) {
    domains.push(domain("power","Power / authority",/\b(?:feared|notorious|powerful|kingpin|mafia|gang leader|famous)\b/.test(p)?"famous":"well-known","authority, reputation and social leverage",
      ["rivals approaching carefully","people asking favors","allies reporting in","challengers testing boundaries"],
      ["people may lower their voice","others make room or become careful","deference, caution or challenge replaces generic friendliness"],
      ["campus","university","club","garage","office","event","party","street","public"],
      ["work","crew","rival","meeting","business","leadership"]));
  }

  if (romanticMagnetism && !domains.some((d)=>d.key==="campus")) {
    domains.push(domain("desirability","Romantic / social desirability",knownSignal?"well-known":"known","being conspicuously desired and socially noticed",
      ["flirting","people asking for contact details","invitations","old flings or acquaintances greeting them","people trying to get their attention"],
      ["romantic opportunities exist independently of the protagonist","attention does not vanish because the lead is emotionally interested elsewhere"],
      ["campus","university","party","club","bar","restaurant","event","friends","group","public"],
      ["dating","social","party","friends"]));
  }

  for (const d of domains) {
    reputation.push(`${d.label}: ${d.knownFor}`);
    approachTypes.push(...d.approachTypes);
    socialEffects.push(...d.socialEffects);
    lifeDomains.push(...d.lifeMarkers);
  }

  let recognitionLevel:SocialWorldIdentity["recognitionLevel"]="ordinary";
  if (domains.some((d)=>d.key==="public_fame"&&d.recognition==="famous")) recognitionLevel="public-figure";
  else if (domains.some((d)=>d.key==="campus"&&d.recognition==="famous")) recognitionLevel="campus-famous";
  else if (domains.some((d)=>["racing","athletics","power"].includes(d.key)&&d.recognition==="famous")) recognitionLevel="domain-famous";
  else if (domains.some((d)=>d.recognition==="famous"||d.recognition==="well-known")) recognitionLevel="well-known";
  else if (domains.length) recognitionLevel="known";

  const role = String(character.role || "").trim();
  const identitySignature = role || reputation.slice(0,2).join(" · ") || "ordinary private person";
  return {
    identitySignature,
    recognitionLevel,
    reputation:uniq(reputation),
    domains,
    approachTypes:uniq(approachTypes),
    socialEffects:uniq(socialEffects),
    lifeDomains:uniq(lifeDomains),
    strongGravity:recognitionLevel!=="ordinary" || knownSignal,
    romanticMagnetism,
    fearedRespect,
  };
}

export function isPublicSocialScene(value:any="") {
  return /\b(?:campus|university|uni|college|school|hall|hallway|corridor|caf[eé]|cafeteria|bakery|student union|quad|courtyard|library|class|lecture|party|club|bar|event|game|match|practice|stadium|restaurant|mall|street|crowd|students?|classmates?|friends?|group|race|track|circuit|garage|car meet|gala|premiere|concert|studio|office|boardroom|hotel|vip|public)\b/.test(norm(value));
}

export function socialWorldFootprint(value:any="") {
  const t=norm(value);
  return /\b(?:recognized|recognised|knew who|knew (?:his|her|their) name|called (?:his|her|their) name|greeted|waved at|came over|approached|joined them|asked to join|invited|invitation|flirt(?:ed|ing)?|asked for (?:his|her|their) (?:number|instagram|phone)|smiled at (?:him|her|them)|checked (?:him|her|them) out|trying to get (?:his|her|their) attention|another (?:girl|guy|woman|man|student)|familiar face|acquaintance|teammate|rival|driver|crew|coach|fan|staff|host|security|assistant|made room|stepped aside|fell silent|lowered (?:his|her|their) voice|deference|whispered about|turned heads?|(?:people|students?|someone|a few heads?) (?:looked|glanced|turned) (?:over|toward)|family name|vip|reserved table|asked for a photo|asked for an autograph)\b/.test(t);
}

export function outsideApproachFootprint(value:any="") {
  const t=norm(value);
  return /\b(?:came over|approached|walked up|joined them|stopped by|called (?:his|her|their) name|asked for (?:his|her|their) (?:number|instagram|phone)|flirt(?:ed|ing)?|invited (?:him|her|them)|slid (?:him|her|them) (?:a )?number|trying to get (?:his|her|their) attention|teammate.{0,40}(?:came|walked|called)|rival.{0,40}(?:came|walked|called)|fan.{0,40}(?:came|walked|asked)|someone from .{0,50}(?:came|called|stopped|approached))\b/.test(t);
}

export function domainLifeFootprint(value:any="", identity?:SocialWorldIdentity) {
  const t=norm(value);
  const markers=identity?.lifeDomains||[];
  return markers.some((m)=>m&&new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`).test(t));
}

export function admirerAutoNeutralized(value:any="") {
  const t=norm(value);
  const entered=/\b(?:another (?:girl|guy|woman|man|student)|a (?:girl|guy|woman|man|student)|admirer)\b.{0,120}\b(?:approached|came over|joined|flirted|smiled|touched|leaned|asked|invited)\b/.test(t);
  if(!entered)return false;
  return /\b(?:ignored (?:her|him|them)|brushed (?:her|him|them) off|dismissed (?:her|him|them)|turned (?:her|him|them) down immediately|sent (?:her|him|them) away|made (?:her|him|them) leave|barely acknowledged|attention never left (?:you|her|him)|eyes? stayed (?:on|fixed on) (?:you|her|him))\b/.test(t);
}

export function socialGravityIssues({ reply="", recentCharacterReplies=[], engine={}, character={} }:{reply?:string;recentCharacterReplies?:string[];engine?:Record<string,any>;character?:Record<string,unknown>}={}) {
  const issues:string[]=[];
  const identity=deriveSocialWorldIdentity(character);
  const recent=(Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).slice(-4).join(" ");
  if(engine?.manifestationDue===true && !socialWorldFootprint(`${recent} ${reply}`)) issues.push("world_identity_manifestation_missing");
  if(engine?.approachWindowDue===true && !outsideApproachFootprint(`${recent} ${reply}`)) issues.push("outside_attention_missing");
  if(engine?.lifeContinuityDue===true && !domainLifeFootprint(`${recent} ${reply}`,identity)) issues.push("domain_life_continuity_missing");
  if(identity.romanticMagnetism && admirerAutoNeutralized(reply)) issues.push("ship_bubble_auto_neutralization");
  return uniq(issues);
}
