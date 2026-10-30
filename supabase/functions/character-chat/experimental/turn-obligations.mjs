// Derive only response obligations. Never infer user actions or story facts.
export function turnObligations(message='') {
 const text=String(message).normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
 const obligations=[];
 if(/\bwhat\b[^.!?\n]{0,100}\b(?:want(?:ed)?|going|trying)\b[^.!?\n]{0,60}\b(?:say|tell|talk)\b|\bqu[eé]\b[^.!?\n]{0,65}\bquer[ií]as?\b[^.!?\n]{0,40}\bdecir(?:me|nos|le)?\b/i.test(text))
  obligations.push({id:'say_the_content',requirement:'State the actual thought, question or admission the lead wants to communicate. Saying only I wanted to talk, get your attention, see you, see whether you would follow, or speak in private does NOT answer what he wanted to say. Those describe logistics. Give the substantive content now, grounded in the current exchange; do not invent an earlier promise, observation of user habits or a preexisting secret to supply content.'});
 if(/\b(?:stay|remain) (?:right )?here\b|\b(?:do not|don[’\x27]t) want to (?:go|leave|follow)\b|\b(?:qu[eé]date aqu[ií]|no quiero (?:salir|ir|seguirte))\b/i.test(text))
  obligations.push({id:'no_relocation_pressure',requirement:'Honor the request to stay here or the refusal to go. Do not answer by renewing, bargaining for or insisting on an outing, privacy or following. The lead may say what they originally wanted, but must now continue the conversation in the current place without making relocation a condition.'});
 return obligations;
}

export function contentAnswerIssues(message='',prose='') {
 if(!turnObligations(message).some(x=>x.id==='say_the_content'))return [];
 const spoken=[...String(prose).matchAll(/[“"]([^”"]+)[”"]/g)].map(m=>m[1]).join(' ');
 const clauses=spoken.split(/[.!?]|\b(?:because|but)\b/i).map(x=>x.trim()).filter(x=>x&&!/^(?:honestly|well|look|listen|okay|ok|right|sure|actually|the truth is)[,:;—–\s]*$/i.test(x));
 const logistics=/\bI\s+(?:just\s+)?(?:want(?:ed)?|was (?:going|trying))\s+to\s+(?:talk\b|speak\b|get your attention\b|see (?:if|whether)\b[^.!?]{0,100}\b(?:attention|follow|outside|come|stay)\b)/i;
 if(clauses.length && clauses.every(clause=>logistics.test(clause)))return [{code:'unanswered_content_question',reason:'The user asked what the lead wanted to say. Every spoken clause only describes wanting attention, conversation, privacy or compliance. State the actual present thought or question; do not replace the evasion with an invented user habit or secret.'}];
 return [];
}
