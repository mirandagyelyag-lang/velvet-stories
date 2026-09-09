import fs from "node:fs";
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const tests=[
 ["version is v3.50.8+ descendant",/^3\.50\.(?:8|9|[1-9]\d+)$/.test(pkg.version)],
 ["selection clears assist options",/function useReplyAssistOption[\s\S]*clearReplyAssist\(\)/.test(chat)],
 ["selection closes assist",/function useReplyAssistOption[\s\S]*setReplyAssistOpen\(false\)/.test(chat)],
 ["clear removes options",/function clearReplyAssist[\s\S]*setReplyAssistOptions\(\[\]\)/.test(chat)],
 ["clear removes understanding",/function clearReplyAssist[\s\S]*setReplyAssistUnderstanding\(null\)/.test(chat)],
 ["generate more action exists",/Generate more/.test(chat)&&/requestReplyAssist\('more'\)/.test(chat)],
 ["more appends instead of replacing",/mode === "more" \? \[\.\.\.current, \.\.\.nextOptions\]/.test(chat)],
 ["more deduplicates suggestions",/findIndex\(\(candidate\)/.test(chat)],
 ["nothing auto sends",/Nothing is sent automatically/.test(chat)]
];
let fail=0; tests.forEach(([n,ok],i)=>{console.log(`${ok?"PASS":"FAIL"} ${i+1}: ${n}`);if(!ok)fail++});
console.log(`\nv3.50.8 reply assist flow: ${tests.length-fail}/${tests.length} PASS`); process.exit(fail?1:0);
