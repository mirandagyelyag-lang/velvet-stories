import fs from 'node:fs';
const css=fs.readFileSync('src/styles/velvet-v3131-native-edges.css','utf8');
const main=fs.readFileSync('src/main.jsx','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const ver=JSON.parse(fs.readFileSync('public/velvet-version.json','utf8'));
const checks=[
  ['document/root cannot scroll', /html,[\s\S]*body,[\s\S]*#root[\s\S]*overflow:\s*hidden\s*!important/.test(css)],
  ['document overscroll disabled', /overscroll-behavior:\s*none\s*!important/.test(css)],
  ['root is pinned to viewport', /#root\s*\{[\s\S]*position:\s*fixed\s*!important[\s\S]*inset:\s*0\s*!important/.test(css)],
  ['root uses themed background', /background:\s*var\(--background\)\s*!important/.test(css)],
  ['route scroll edge is hard stop', /\.app__content[\s\S]*overscroll-behavior-y:\s*none\s*!important/.test(css)],
  ['chat scroll edge is hard stop', /\.app--chat \.chat__content[\s\S]*overscroll-behavior-y:\s*none\s*!important/.test(css)],
  ['sheet scroll edges are hard stops', /\.memory-book__scroll[\s\S]*overscroll-behavior-y:\s*none\s*!important/.test(css)],
  ['horizontal rails do not glow/reveal', /overscroll-behavior-inline:\s*none\s*!important/.test(css)],
  ['mobile removes stable gutter', /scrollbar-gutter:\s*auto\s*!important/.test(css)],
  ['native edges CSS loaded before refresh layer', main.includes('import "./styles/velvet-v3131-native-edges.css";') && main.indexOf('velvet-v3131-native-edges.css') < main.indexOf('velvet-v3132-pull-to-refresh.css')],
  ['package version keeps native edges release or newer', /^3\.(?:1[3-9]|[2-9]\d)\./.test(pkg.version)],
  ['public version keeps native edges release or newer', /^3\.(?:1[3-9]|[2-9]\d)\./.test(ver.version)],
];
let pass=0;
for(const [name,ok] of checks){ console.log(`${ok?'PASS':'FAIL'} · ${name}`); if(ok) pass++; }
console.log(`\n${pass}/${checks.length} Native Edges checks passed`);
if(pass!==checks.length) process.exit(1);
