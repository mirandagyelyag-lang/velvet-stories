import fs from "node:fs";
const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");
const css=fs.readFileSync("src/styles/velvet-v34912-mobile-experience.css","utf8");

ok("v3.49.10 script is in package",Boolean(pkg.scripts?.["verify:v34910"]));
ok("quick action surface exists",chat.includes("v34910-message-actions__quick")&&chat.includes('aria-label="Quick message actions"'));
ok("quick actions expose Copy",chat.includes('runAction("copy")')&&chat.includes("<span>Copy</span>"));
ok("user quick action exposes Edit",chat.includes('setActionMode("edit")')&&chat.includes("<span>Edit</span>"));
ok("character quick action exposes Regenerate",chat.includes('setActionMode("regenerate")')&&chat.includes("<span>Regenerate</span>"));
ok("quick action exposes Memory",chat.includes('runAction("memory")')&&chat.includes("<span>Memory</span>"));
ok("quick action exposes More",chat.includes('setActionMode("more")')&&chat.includes("<span>More</span>"));
ok("quality monitor remains reachable",chat.includes("Quality check")&&chat.includes("openQualityMonitor(message)"));
ok("dangerous delete stays behind More",chat.includes('className="danger"')&&chat.includes('runAction("delete")'));
ok("long press opens actions instead of quality sheet",chat.includes("onOpenActions(message)")&&!chat.includes("onOpenQuality={openQualityMonitor}"));
ok("touch tap does not fight scroll",chat.includes("shouldOpenMessageActionsOnTap()")&&chat.includes("touch-action: pan-y")===false);
ok("sheet backdrop uses pointer events",chat.includes("message-sheet-backdrop\" onPointerDown")&&chat.includes("event.target === event.currentTarget"));
ok("bottom sheet handle exists",chat.includes("v34910-message-actions__handle")&&css.includes("width: 36px")&&css.includes("height: 4px"));
ok("quick actions are four-column grid",css.includes("grid-template-columns: repeat(4")&&css.includes("v34910-message-actions__quick"));
ok("message sheet becomes native-style bottom sheet",css.includes("align-items: end !important")&&css.includes("border-radius: 24px 24px 0 0"));
ok("version controls only remain when meaningful",css.includes(".chat-message__version-nav.is-multiple")&&css.includes(".chat-message__version-nav.is-single"));
ok("edited label is visually quiet",css.includes(".chat-message__edited")&&css.includes("opacity: .28"));
ok("desktop context menu still opens actions",chat.includes("onContextMenu={(event) => { event.preventDefault(); onOpenActions(message); }}"));
ok("quality sheet still renders",chat.includes("<MessageQualitySheet")&&chat.includes("qualityMessage"));

let failed=0; for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.10 Message Actions Rebuild checks passed.`); if(failed)process.exit(1);
