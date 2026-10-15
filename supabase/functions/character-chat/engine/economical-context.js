// Remove only exact duplicates. Never summarize, shorten, or drop older canon here.
export function withoutRepeatedLatest(transcript = [], latest = '', userName = '') {
 const copy=transcript.slice();const last=copy.at(-1);
 const isUser=last && (last.sender==='user'||last.role==='user'||/^(?:you|user)$/i.test(last.speaker||'')||(userName && last.speaker===userName));
 if(isUser && String(last.content||'')===String(latest||'')) copy.pop();
 return copy;
}
export function uniqueContext(items = []) {
 const seen=new Set();return items.filter(item=>{const key=typeof item==='string'?item:JSON.stringify(item);if(seen.has(key))return false;seen.add(key);return true;});
}
