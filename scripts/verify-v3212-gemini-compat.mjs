import fs from 'node:fs';
const src=fs.readFileSync('supabase/functions/character-chat/index.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const ver=JSON.parse(fs.readFileSync('public/velvet-version.json','utf8'));
const checks=[
 ['package is 3.21.2', pkg.version==='3.21.2'],
 ['public version is 3.21.2', ver.version==='3.21.2'],
 ['release is Gemini Compatibility Hotfix', /Gemini Compatibility Hotfix/i.test(ver.release||'')],
 ['roleplay requests do not send topP', !/const make(?:Stream)?Request[\s\S]{0,1500}?topP\s*:/m.test(src)],
 ['roleplay request path does not send temperature', !/const make(?:Stream)?Request[\s\S]{0,1500}?\btemperature\s*[,}:]/m.test(src)],
 ['stream has schema json bare fallback', src.includes('runStreamAttempt("schema")') && src.includes('runStreamAttempt("json")') && src.includes('runStreamAttempt("bare")')],
 ['nonstream has schema json bare fallback', src.includes('runAttempt("schema")') && src.includes('runAttempt("json")') && src.includes('runAttempt("bare")')],
 ['bare fallback sends only contents', src.includes('Compatibility floor: only the universally-required `contents`') && src.includes('True compatibility fallback: no systemInstruction')],
 ['Gemini failures have sanitized per-attempt diagnostics', src.includes('logGeminiAttemptFailure') && src.includes('traceId') && src.includes('upstreamStatus')],
 ['repair generation call is syntactically clean', src.includes('maxOutputTokens: getMaximumOutputTokens(character.response_length),\n    isCancelled,')],
];
let fail=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${n}`); if(!ok)fail++;}
console.log(`\n${checks.length-fail}/${checks.length} passed.`); if(fail)process.exit(1);
