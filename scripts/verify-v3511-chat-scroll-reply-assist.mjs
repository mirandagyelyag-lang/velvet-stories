import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const css=read('src/styles/velvet-v3511-chat-scroll-reply-assist.css');
const chat=read('src/pages/Chat.jsx');
const main=read('src/main.jsx');
const checks=[
 ['patch imported in active lineage', main.includes('import "./styles/velvet-v3511-chat-scroll-reply-assist.css";') && main.includes('import "./styles/velvet-v3511-chat-scroll-reply-assist.css";')],
 ['native pan-y restored', css.includes('touch-action: pan-y !important') && css.includes('overflow-y: auto !important')],
 ['chat descendants do not become scroll traps', css.includes('.app--chat .chat__messages') && css.includes('overflow-y: visible !important')],
 ['reply sheet owns its scroll', css.includes('.reply-assist-sheet') && css.includes('overscroll-behavior-y: contain !important')],
 ['raw edge error hidden', chat.includes('Never leak them into the story UI') && chat.includes("Velvet couldn't load reply ideas right now. Try again in a moment.")],
 ['data error handled', chat.includes('if (data?.error) throw new Error(data.error);')],
];
let bad=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} · ${name}`); if(!ok) bad++;}
if(bad) process.exit(1);
console.log('PASS · Velvet v3.51.1 chat scroll + Reply Assist regression guard');
