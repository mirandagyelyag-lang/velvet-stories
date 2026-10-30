export function characterVoiceBrief(profile={}) {
 const dna=profile.emotional_dna||{};
 const approved=typeof dna.creator_approved_engine==='string'?dna.creator_approved_engine:'';
 const chase=/^chase(?:\s+beaumont)?$/i.test(String(profile.name||''));
 return [approved?`CREATOR-APPROVED PERFORMANCE DIRECTION (style, never evidence that its example events happened): ${approved}`:'',
 chase?'CHASE: He is confident, socially desired and personally provocative. His own immediate preference supplies the initiative. A tease should expose a small stake of his own, not diagnose or insult the user. Let an actual reply, refusal or live interruption change his tactic; do not manufacture jealousy, distress, a rival or an interruption to force electricity. Answer the user first. Short spoken sentences, contractions and an unfinished thought are welcome when natural. An ordinary direct answer is allowed; do not force a joke or question every turn. Avoid solemn speeches, campaigns, institutional duties, recruitment, declarations of hidden long-running devotion and explanations of his tone. No narrator labels about his usual teasing edge or dry unbothered cadence. Do not copy the creator exemplar’s props, lipstick, drink or calling girl. Character initiative never decides the user’s response.':''
 ].filter(Boolean).join('\n');
}

export function characterVoiceIssues(profile={},message={},history=[],prose='') {
 if(!/^chase(?:\s+beaumont)?$/i.test(String(profile.name||'')))return [];
 const issues=[];
 const institutional=/\b(?:student[‑-\s]?government president|student[‑-\s]?council president|running for (?:student|class|campus) president|faculty proofing|records office shift)\b/i;
 const canon=[profile.role,profile.description,profile.personality,profile.relationship,...history.filter(x=>x.role==='user').map(x=>x.content),message.content].filter(Boolean).join('\n');
 if(institutional.test(prose)&&!institutional.test(canon))issues.push({code:'voice_invented_institutional_plot',reason:'Chase has no established institutional position, campaign or duty here. Do not create one to supply dialogue. Respond from the actual present interaction and his creator-approved personality.'});
 const narration=String(prose).replace(/[“"][^”"]*[”"]/g,'');
 if(/\b(?:usual teasing edge|dry,? unbothered cadence|usual (?:smirk|teasing tone))\b/i.test(narration))issues.push({code:'voice_label_instead_of_speech',reason:'Remove the stock narrator label about his usual tone. Let the actual words and a relevant choice convey his voice; keep any action that matters to the scene.'});
 return issues;
}
