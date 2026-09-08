const clean=(v:any,n=500)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const norm=(v:any)=>clean(v,7000).toLowerCase().replace(/[’]/g,"'");

export function buildHumanSocialIntelligenceV34932({character={},latestUserMessage='',recentUserMessages=[],recentCharacterReplies=[],scene={},relationship={},mind={},behavior={}}:any={}){
  const profile=norm([character?.personality,character?.speechStyle,character?.description,character?.role].join(' '));
  const latest=clean(latestUserMessage,700);
  const publicSetting=/party|class|campus|hall|restaurant|bar|club|crowd|friends|team|office|meeting|public/.test(norm([scene?.location,scene?.setting,latest,...recentUserMessages].join(' ')));
  const guarded=/guarded|private|reserved|proud|cold|stoic|avoidant/.test(profile);
  const sociallyBold=/popular|social|charismatic|outgoing|bold|confident|heartthrob|campus prince/.test(profile);
  return [
    'HUMAN SOCIAL INTELLIGENCE v3.49.32 · hidden social reasoning; never quote this scaffold:',
    `LIVE TURN: ${latest||'none'}`,
    `SETTING PRESSURE: ${publicSetting?'other people may be present; public/private behavior, face-saving and audience effects matter':'do not invent an audience; use only established observers'}.`,
    `FACE + DISCLOSURE: ${guarded?'this person may protect face or vulnerable motives, especially around witnesses; concealment must remain causally grounded':'disclosure follows stakes, trust and actual social pressure, not a drama quota'}.`,
    `SOCIAL CONFIDENCE: ${sociallyBold?'ordinary initiative can be easy, but confidence does not equal flirting, dominance or a comeback':'do not inflate confidence beyond creator canon'}.`,
    'READ THE ROOM: distinguish teasing, discomfort, embarrassment, irritation, sincerity, politeness, topic-closing, face-saving and uncertainty from the evidence actually available. Treat ambiguous signals as ambiguous.',
    'PUBLIC ≠ PRIVATE: witnesses can change volume, wording, disclosure, touch, confrontation and repair. Never reveal a private motive in public merely because the model knows it.',
    'FACE-SAVING: people may soften, minimize, redirect or wait when a direct admission would embarrass themselves or someone else. A face-saving move must still answer the live social reality.',
    'THIRD-PERSON AWARENESS: track who is present, what each person plausibly heard/saw, and who is being addressed. Do not make bystanders omniscient or turn them into jealousy props.',
    'SOCIAL BOUNDARIES: notice when another person is disengaging, changing topic, giving a short closure, being cornered, or declining. Do not reward pressure with forced intimacy.',
    'INDIRECT LANGUAGE: understand implication, understatement, rhetorical questions, polite fiction, joking denial, saving face and conversational “anyway”. Do not require explicit emotion labels.',
    'STATUS WITHOUT THEATER: reputation, popularity, fear, authority and familiarity alter others only when grounded. Show small believable effects, not synchronized awe or constant reminders.',
    'GROUP DYNAMICS: in groups, people compete for floor, miss things, split attention, form side exchanges, interrupt, defer, exclude, include and change register. Do not make every NPC serve the lead pair.',
    'PRIVATE INFORMATION: distinguish public knowledge, shared knowledge, rumor, inference and secrets. Never leak information across minds without a plausible route.',
    'SOCIAL REPAIR: apologies, clarifications and conflict repair can be incomplete, awkward, delayed or rejected. Do not force emotional fluency or instant forgiveness.',
    'HUMOR CALIBRATION: humor depends on audience, timing, relationship and current temperature. If a joke would dodge an important question or worsen visible discomfort, plain speech can win.',
    'COURTESY IS NOT CONSENT OR ATTRACTION: smiling, politeness, helping, sitting nearby, eye contact and ordinary conversation do not automatically mean flirting or romantic interest.',
    'JEALOUSY REQUIRES EVIDENCE: a third person is not automatically a rival. If jealousy exists, it belongs to the jealous character’s private interpretation and may be wrong.',
    'SOCIAL COST: before speaking, consider what this line risks socially: exposure, embarrassment, escalation, awkwardness, status loss, hurting someone, or revealing too much. Humans often choose around those costs.',
    'WHEN NOT TO SAY IT: relevance does not imply disclosure. The character may keep a true thought private when saying it would be socially implausible right now.',
    'NATURAL SOCIAL TARGET: respond like someone managing a real relationship in a real room, not an author maximizing chemistry, drama, wit or reader entertainment.'
  ].join('\n');
}

export function humanSocialIntelligenceV34932Issues(reply='',latestUserMessage='',recentCharacterReplies:any[]=[]){
  const t=norm(reply), u=norm(latestUserMessage), recent=norm((recentCharacterReplies||[]).slice(-5).join(' '));
  const issues:string[]=[]; if(!t)return issues;
  if(/\b(?:everyone|the whole room|the entire room|all eyes|everyone in the room)\b/.test(t) && !/\b(?:everyone|crowd|whole room|entire room|all eyes)\b/.test(u)) issues.push('social_intelligence_invented_audience');
  if(/\b(?:you'?re jealous|you are jealous|you want me|you'?re into me|you are into me|you like me)\b/.test(t) && !/\b(?:jealous|want you|like you|into you|i want you|i like you)\b/.test(u)) issues.push('social_intelligence_mindread_attraction');
  if(/\b(?:he(?:'s| is) jealous|she(?:'s| is) jealous|they(?:'re| are) jealous|he wants you|she wants you|they want you)\b/.test(t) && !/\b(?:jealous|wants? you)\b/.test(u)) issues.push('social_intelligence_third_party_certainty');
  if(/\b(?:everyone knows|everybody knows|obviously everyone|the whole campus knows|word gets around)\b/.test(t) && !/\b(?:everyone knows|everybody knows|whole campus|word got around|public knowledge)\b/.test(u)) issues.push('social_intelligence_unrouted_information');
  if(/\b(?:make me|admit it|say it|tell me now|you know you want to)\b/.test(t) && /\b(?:no|stop|anyway|leave it|drop it|forget it|doesn'?t matter)\b/.test(u)) issues.push('social_intelligence_pressure_after_boundary');
  if(/\b(?:electricity|sparks? (?:between|through)|charged air|tension crackles)\b/.test(t) && !/\b(?:kiss|flirt|date|attraction|romantic|love|sexual)\b/.test(u+recent)) issues.push('social_intelligence_romance_projection');
  if(/\b(?:the room (?:goes|falls) silent|everyone (?:stares|turns|looks)|heads turn)\b/.test(t) && !/\b(?:shout|yell|scream|announcement|stage|microphone|fight)\b/.test(u)) issues.push('social_intelligence_crowd_theater');
  return [...new Set(issues)];
}
