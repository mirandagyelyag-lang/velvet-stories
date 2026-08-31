import fs from 'node:fs';
const util=fs.readFileSync('src/utils/pullToRefresh.js','utf8');
const css=fs.readFileSync('src/styles/velvet-v3132-pull-to-refresh.css','utf8');
const main=fs.readFileSync('src/main.jsx','utf8');
const native=fs.readFileSync('src/styles/velvet-v3131-native-edges.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const ver=JSON.parse(fs.readFileSync('public/velvet-version.json','utf8'));
const checks=[
  ['native edges remain locked', /overscroll-behavior:\s*none\s*!important/.test(native)],
  ['pull refresh utility installed', /installVelvetPullToRefresh\(\)/.test(main)],
  ['touch move is non-passive', /touchmove[\s\S]*passive:\s*false/.test(util)],
  ['only pulls at top of scroll owner', /scrollTop\s*<=\s*1/.test(util)],
  ['horizontal gestures cancel refresh', /Math\.abs\(dx\)[\s\S]*Math\.abs\(dy\)/.test(util)],
  ['inputs and dialogs are protected', /textarea/.test(util) && /\[role="dialog"\]/.test(util)],
  ['keyboard-open pull is blocked', /keyboardIsOpen\(\)/.test(util)],
  ['refresh threshold exists', /REFRESH_THRESHOLD\s*=\s*76/.test(util)],
  ['service worker update check runs', /registration\.update\(\)/.test(util)],
  ['page reload is restored', /window\.location\.reload\(\)/.test(util)],
  ['visual refresh indicator exists', /velvet-pull-refresh/.test(css)],
  ['new CSS loaded after native edges', main.trim().endsWith('import "./styles/velvet-v3132-pull-to-refresh.css";')],
  ['package version bumped', pkg.version==='3.13.2'],
  ['public version bumped', ver.version==='3.13.2'],
];
let pass=0;
for(const [name,ok] of checks){ console.log(`${ok?'PASS':'FAIL'} · ${name}`); if(ok) pass++; }
console.log(`\n${pass}/${checks.length} Pull to Refresh checks passed`);
if(pass!==checks.length) process.exit(1);
