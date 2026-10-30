// Evidence of speech acts, not a classifier of the user's feelings or motives.
export function interactionReading(content='') {
 const text=String(content);
 const spokenCandidate=text.replace(/\*[^*]*\*/g,'');
 const quoted=[...spokenCandidate.matchAll(/[“"]([^”"]+)[”"]/g)].map(m=>m[1]);
 const speech=quoted.length?quoted.join('\n'):spokenCandidate.trim();
 const questions=(speech.match(/[^.!?\n]+\?/g)||[]).map(x=>x.trim());
 const limits=(speech.match(/\b(?:I (?:do not|don['’]t) want to [^.!?\n]+|(?:do not|don['’]t|stop) (?:follow(?:ing)?|touch(?:ing)?|ask(?:ing)?|push(?:ing)?|pressure|pressur(?:e|ing)|call(?:ing)?)[^.!?\n]*|no quiero [^.!?\n]+|no me (?:sigas|toques|presiones)[^.!?\n]*|d[eé]jame (?:en paz|sol[ao])[^.!?\n]*)/gi)||[]);
 const clarifications=(speech.match(/\b(?:I (?:am not|was not|did not|didn['’]t)|I['’]m not|that(?:['’]s| is) not|I meant|I just wanted|no estoy|no era|yo (?:no|solo)|solo quer[ií]a)\b[^.!?\n]*/gi)||[]);
 return {
  evidence:{speechForm:quoted.length?'quoted':'unmarked',speakerAttribution:'Resolve the speaker and recipient from the complete turn; quotation marks alone do not establish that the user said these words.',questions,explicitLimits:limits,bareNo:/^(?:no|no thanks|no thank you|no gracias)[.!]?$/i.test(speech),clarifications},
  defaultReading:'Read the full turn literally and non-adversarially unless the user explicitly supplies a hostile motive. A question or playful echo is not proof of testing, scoring, avoiding, manipulation or rejection. These excerpts are obligations, not facts about emotion. Unquoted private actions remain inaudible.',
  responseOrder:'Answer the actual question or honor the user’s explicit limit first. Attribute quoted NPC speech to the NPC: their orders, preferences or refusal are not automatically the user’s consent or boundary. If the user corrects an interpretation, revise it without arguing that they secretly meant the opposite. A bare no applies to the clear preceding offer; it does not establish rejection of the person. If its referent is genuinely ambiguous, clarify briefly rather than guess.',
  characterInitiative:'Choose the lead’s own present preference, admission or relevant action. Any sarcasm should connect to the actual words and put some stake on the lead too; do not make the user defend an invented motive. A completed exchange can end briefly. Do not force a new question, outing, confession or event on every turn.',
  uncertainty:'Do not invent why the user asked, what they feel, or what reaction they are trying to obtain. A newly expressed preference or limit does not establish a prior offer: if the lead never proposed going outside, do not narrate abandoning that proposal or invent an earlier shared plan. The lead can make a new present choice in response. Laughing markers can suggest playfulness, not blanket consent. A refusal remains a refusal even beside a joke or emoji.'
 };
}
