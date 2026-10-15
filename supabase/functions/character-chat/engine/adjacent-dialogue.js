const normalize = value => String(value).toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
export const ADJACENT_DIALOGUE_RULE = "CURRENT QUESTION FIRST: Do not replay a distinctive spoken line or question from recent accepted turns or rejected regeneration variants as the opening of this reply. If the user asks the time after you offered coffee, answer the time and their concern; do not repeat the tiredness question, restart the coffee offer, or pretend they accepted it. A pending offer remains pending. Repeat a quote only if the user asks you to repeat, explain or discuss it. Continue the actual next beat, preserving character voice.";
export function removeReplayedOpening(reply = '', recentReplies = [], latestUserMessage = '') {
 const original=String(reply).trim();
 if(/\b(?:repeat (?:that|it)|say (?:that|it) again|what did you say)\b|repite|rep[ií]telo/i.test(latestUserMessage) && !/\b(?:dont|don't|do not|no) repeat\b/i.test(latestUserMessage)) return original;
 const leading=original.match(/^["“]([^"”\n]+)["”]\s*/u);
 if(!leading) return original;
 const phrase=normalize(leading[1]);
 if(phrase.split(' ').length<4 || normalize(latestUserMessage).includes(phrase)) return original;
 const quotes=recentReplies.slice(-12).flatMap(reply=>[...String(reply||'').matchAll(/["“]([^"”\n]+)["”]/gu)].map(m=>normalize(m[1])));
 if(!quotes.includes(phrase)) return original;
 const remainder=original.slice(leading[0].length).trim();
 // Never create an empty reply or detach a speech tag from the dialogue it describes.
 if(!remainder || /^(?:he|she|they|i|[A-Z][\p{L}-]+)\s+(?:asks?|asked|says?|said|murmurs?|murmured|whispers?|whispered|repeats?|repeated)\b/u.test(remainder)) return original;
 return remainder;
}
