import fs from 'node:fs';
const css=fs.readFileSync('src/styles/velvet-v3134-compact-page-ends.css','utf8');
const main=fs.readFileSync('src/main.jsx','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
 ['new css imported last', main.trim().endsWith('import "./styles/velvet-v3134-compact-page-ends.css";')],
 ['version 3.13.4 or later', /^3\.(?:1[3-9]|[2-9]\d)\./.test(pkg.version) || /^[4-9]\./.test(pkg.version)],
 ['normal pages lose viewport min height', css.includes('min-height: 0 !important')],
 ['normal pages use auto height', css.includes('height: auto !important')],
 ['child page bottom padding compact', css.includes('padding-bottom: 14px !important')],
 ['dock reserved once', css.includes('var(--velvet-bottom-dock-total, 88px) + 8px')],
 ['scroll padding follows dock', css.includes('scroll-padding-bottom')],
 ['chat excluded', css.includes('.app:not(.app--chat)')],
 ['characters included', css.includes('.characters-library')],
 ['stories shell included', css.includes('.chats-page')],
 ['memories included', css.includes('.memories-reference-page')],
 ['profile included', css.includes('.profile-reference-page')],
 ['settings included', css.includes('.settings-page')],
 ['last child gap reset', css.includes('> :last-child')],
];
let fail=0; for (const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(!ok) fail++;}
console.log(`\n${checks.length-fail}/${checks.length} checks passed`); process.exit(fail?1:0);
