export function characterVoiceBrief(profile={}) {
 const dna=profile.emotional_dna||{};
 const approved=typeof dna.creator_approved_engine==='string'?dna.creator_approved_engine:'';
 const chase=/^chase(?:\s+beaumont)?$/i.test(String(profile.name||''));
 const sample=chase&&typeof dna.creator_approved_opening==='string'?dna.creator_approved_opening.slice(0,2400):'';
 return [approved?`CREATOR-APPROVED PERFORMANCE DIRECTION (style, never evidence that its example events happened): ${approved}`:'',
 chase?'INTERPRETATION: No declarations means no unearned love, settled attachment or grand confession. It does not forbid answering honestly about a present interest. No tidy sincerity scene means the exchange stays open, not that every direct question must be dodged. A direct answer may carry a small playful qualification, but its actual content must be clear.':'',
 chase?'CHASE: He is confident, socially desired and personally provocative. His own immediate preference supplies the initiative. A tease should expose a small stake of his own, not diagnose or insult the user. Let an actual reply, refusal or live interruption change his tactic; do not manufacture jealousy, distress, a rival or an interruption to force electricity. Answer the user first. Short spoken sentences, contractions and an unfinished thought are welcome when natural. An ordinary direct answer is allowed; do not force a joke or question every turn. Avoid solemn speeches, campaigns, institutional duties, recruitment, declarations of hidden long-running devotion and explanations of his tone. No narrator labels about his usual teasing edge or dry unbothered cadence. Do not copy the creator exemplar’s props, lipstick, drink or calling girl. Character initiative never decides the user’s response.':''
 ,sample?`VOICE CALIBRATION ONLY — a separate fictional illustration. Borrow the short spoken rhythm, a joke with an actual object, and a reaction that changes the lead’s own next choice. Do not reproduce the lines, catchphrases, props, third party, history, or event sequence. This sample establishes NO facts for the current scene.\n${sample}\nEND VOICE SAMPLE. Return to the real latest user turn. Give actual conversational content, not a promise to become honest, a remark about dropping an act, or a test of what the user will say. Adapt the rhythm to a brief continuation, not another full opening.`:''
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
 if(/\b(?:wait(?:s|ing)? for (?:a|your) reaction|as if waiting for a reaction)\b/i.test(narration))issues.push({code:'voice_passive_reaction_coda',reason:'Remove the narrator coda about waiting for the reader reaction. End on the actual spoken or consequential beat, without explaining the tension or prescribing audience attention.'});
 return issues;
}

export function trimChaseReactionCoda(profile={},prose='') {
 if(typeof prose!=='string'||!/^chase(?:\s+beaumont)?$/i.test(String(profile.name||'')))return prose;
 const end=Math.max(prose.lastIndexOf('”'),prose.lastIndexOf('"'));if(end<0)return prose;
 const tail=prose.slice(end+1).trim();
 if(tail.length>240||! /^(?:He|Chase(?: Beaumont)?|His (?:eyes|gaze)|The words)\b/.test(tail))return prose;
 if(!/\bwait(?:s|ing)? for (?:a|your) reaction[.!]?\s*$/i.test(tail))return prose;
 const plain=/^(?:He|Chase(?: Beaumont)?) (?:waits|is waiting) for (?:a|your) reaction[.!]?$/i;
 const words=/^(?:He|Chase(?: Beaumont)?) lets (?:the|his) words hang(?:,\s*(?:his )?(?:eyes|gaze) (?:flicking|fixed|resting) (?:to|toward|towards|on) (?:the )?(?:doorway|door|room|floor|counter|entrance|you))?,? (?:as if )?waiting for (?:a|your) reaction[.!]?$/i;
 if(!plain.test(tail)&&!words.test(tail))return prose;
 // Keep speaker attribution and any physical, object, social or scene change.
 if(/\b(?:says?|asks?|repl(?:y|ies)|adds?|murmurs?|walk\w*|cross\w*|step\w*|leav\w*|hand\w*|giv\w*|tak\w*|reach\w*|open\w*|clos\w*|touch\w*|kiss\w*|grip\w*|pull\w*|push\w*|send\w*|text\w*|call\w*|throw\w*|drop\w*|sets?|sit\w*|stand\w*|mov\w*|turn\w*|follow\w*)\b/i.test(tail))return prose;
 return prose.slice(0,end+1).trimEnd();
}
