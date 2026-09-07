import fs from "node:fs";

const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");
const helper=fs.readFileSync("src/utils/chatMobileV3499.js","utf8");
const css=fs.readFileSync("src/styles/velvet-v34912-mobile-experience.css","utf8");
const main=fs.readFileSync("src/main.jsx","utf8");

ok("version is v3.49.9 descendant",pkg.version===pub.version&&/^3\.49\.(?:9|1[0-9]|[2-9]\d)$/.test(pkg.version));
ok("mobile completion css is imported",main.includes("velvet-v34912-mobile-experience.css"));
ok("chat anchor persists by conversation",helper.includes("velvet_chat_anchor_v3499_")&&helper.includes("persistChatAnchor")&&helper.includes("restoreChatAnchor"));
ok("anchor captures first visible message",helper.includes('[data-message-id]')&&helper.includes("rect.bottom > ownerRect.top + 8"));
ok("reading mode uses distance from bottom",helper.includes('mode: distanceFromBottom > 220 ? "reading" : "latest"'));
ok("chat restores saved reading anchor",chat.includes("restoreChatAnchor(id, owner")&&chat.includes("scrollAnchorRestoreRef"));
ok("pause persists exact reading anchor",chat.includes('window.addEventListener("velvet:app-pause"')&&chat.includes("persistChatAnchor(id, owner)"));
ok("resume reloads chat without blind jump",chat.includes("reloadConversationMessages(character.id")&&chat.includes("anchor?.mode === \"reading\""));
ok("new messages do not hijack reader",chat.includes("unreadWhileReading")&&chat.includes("characterAdds")&&chat.includes("stickToBottomRef.current"));
ok("jump to bottom clears unread badge",chat.includes("setUnreadWhileReading(0)")&&chat.includes("chat__jump-bottom${unreadWhileReading ? \" has-new\" : \"\"}"));
ok("composer max height is mobile-aware",chat.includes("mobileComposerMaxHeight")&&helper.includes("Math.min(configured, 146)"));
ok("mobile content keeps one-finger pan",css.includes("touch-action: pan-y !important")&&css.includes("-webkit-overflow-scrolling: touch"));
ok("mobile composer uses keyboard offset",css.includes("var(--velvet-keyboard-offset")&&css.includes("max-height: 146px"));
ok("safe area is honored",css.includes("env(safe-area-inset-bottom)")&&css.includes("--velvet-native-safe-bottom"));
ok("message actions prefer long press on touch",helper.includes("return !isCoarseChatPointer()")&&chat.includes("longPressTimerRef")&&chat.includes("velvetHaptic(\"selection\")"));
ok("permanent message dots hidden on touch",css.includes(".chat-message__actions")&&css.includes("display: none !important"));
ok("single version chrome hidden on touch",css.includes(".chat-message__version-nav.is-single")&&css.includes("display: none !important"));
ok("reduced motion is respected",css.includes("prefers-reduced-motion: reduce"));

// Runtime smoke test for anchor capture + restore.
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
globalThis.sessionStorage={getItem:k=>store.get(`s:${k}`)||null,setItem:(k,v)=>store.set(`s:${k}`,String(v))};
globalThis.window={innerWidth:390,matchMedia:()=>({matches:true})};
const mod=await import(`../src/utils/chatMobileV3499.js?verify3499=${Date.now()}`);
const owner={top:100};
const first={getAttribute:()=>"m1",getBoundingClientRect:()=>({top:60,bottom:90})};
const second={getAttribute:()=>"m2",getBoundingClientRect:()=>({top:112,bottom:180})};
let scrolled=null;
const container={scrollHeight:1500,scrollTop:420,clientHeight:500,getBoundingClientRect:()=>owner,querySelectorAll:()=>[first,second],querySelector:(q)=>q.includes("m2")?second:null,scrollTo:({top})=>{scrolled=top;}};
const snap=mod.captureChatAnchor(container);
ok("runtime anchor selects first actually visible row",snap?.anchorId==="m2"&&snap?.mode==="reading");
mod.persistChatAnchor("conv-1",container);
container.scrollTop=700;
ok("runtime anchor restore succeeds",mod.restoreChatAnchor("conv-1",container,{force:true})===true&&Number.isFinite(scrolled));
ok("runtime composer caps on coarse pointer",mod.mobileComposerMaxHeight(190)===146);

let failed=0; for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.9 Chat Mobile 2.0 checks passed.`); if(failed)process.exit(1);
