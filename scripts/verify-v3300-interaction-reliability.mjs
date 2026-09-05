import fs from "fs";
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const semverAtLeast=(value,minimum)=>{const a=String(value||"").split(".").map(Number),b=String(minimum||"").split(".").map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true};
const main=read("src/main.jsx");
const runtime=read("src/utils/interactionReliability.js");
const chat=read("src/pages/Chat.jsx");
const pwa=read("src/context/PWAContext.jsx");
const css=read("src/styles/velvet-v3300-interaction-reliability.css");
const checks=[
 ["version >= 3.30.0",semverAtLeast(pkg.version,"3.30.0")&&semverAtLeast(pub.version,"3.30.0")],
 ["release metadata present",typeof pub.release==="string"&&pub.release.trim().length>0],
 ["interaction runtime exists",runtime.includes("installInteractionReliability")],
 ["visual viewport becomes CSS variables",runtime.includes("--velvet-visual-height")&&runtime.includes("--velvet-runtime-keyboard-inset")],
 ["network state is observable",runtime.includes("data")&&runtime.includes("velvetOnline")&&runtime.includes("navigator.onLine")],
 ["pointer modality is observable",runtime.includes("velvetPointer")&&runtime.includes("pointerType")],
 ["main installs interaction runtime",main.includes("installInteractionReliability();")],
 ["final reliability stylesheet is loaded",main.includes("velvet-v3300-interaction-reliability.css")],
 ["keyboard hides mobile navigation",css.includes('data-velvet-keyboard="open"')&&css.includes(".mobile-nav")],
 ["sheets use visual viewport height",css.includes("var(--velvet-visual-height)")&&css.includes(".message-sheet")],
 ["modal overscroll is contained",css.includes("overscroll-behavior: contain")],
 ["long chats enter lightweight mode",chat.includes("visibleMessages.length >= 250")&&chat.includes("velvet-long-chat")],
 ["long-chat CSS disables expensive transitions",css.includes(".velvet-long-chat .chat-message")&&css.includes("content-visibility: auto")],
 ["draft writes fail soft",chat.includes("Velvet draft storage unavailable")],
 ["critical drafts persist on pagehide",chat.includes('addEventListener("pagehide"')&&chat.includes("persistCriticalDraft")],
 ["PWA controller reload has loop guard",pwa.includes("sw-controller-reload")&&pwa.includes("Date.now() - lastReload < 8000")],
 ["v3.29 verifier accepts later versions",read("scripts/verify-v3290-ui-sweep.mjs").includes("version >= 3.29.0")],
 ["v3.28 verifier accepts later versions",read("scripts/verify-v3280-relationship-world.mjs").includes("version >= 3.28.0")],
];
let pass=0;for(const [label,ok] of checks){if(ok)pass++;console.log(`${ok?"PASS":"FAIL"} ${label}`)}
console.log(`\n${pass}/${checks.length} Interaction Reliability checks passed.`);if(pass!==checks.length)process.exit(1);
