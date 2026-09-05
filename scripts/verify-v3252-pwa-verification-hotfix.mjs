import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const pwa=read("src/context/PWAContext.jsx");
const deploy=read("DEPLOY-PWA-STABLE.sh");
const vite=read("vite.config.js");
const ui=read("scripts/verify-ui.mjs");
const chat=read("src/pages/Chat.jsx");
const checks=[
  ["version 3.26.0", pkg.version==="3.26.0" && pub.version==="3.26.0"],
  ["production SW refresh uses explicit update", pwa.includes("registration.update()")],
  ["periodic refresh remains enabled", pwa.includes("20 * 60 * 1000") && pwa.includes("visibilitychange") && pwa.includes('window.addEventListener("online", run)')],
  ["Update Doctor compatibility helper exists", pwa.includes("clearOldShellCaches") && pwa.includes("return clearVelvetCaches(options)")],
  ["repair clears only Velvet caches", pwa.includes("clearOldShellCaches({ includeMedia: true })") && !pwa.includes("localStorage.clear")],
  ["generic pending update key retained", pwa.includes('velvet_update_pending"')],
  ["network version check bypasses cache", pwa.includes('cache: "no-store"') && pwa.includes("velvet-version.json")],
  ["deploy validates immutable version before alias", deploy.includes("velvet-version.json") && deploy.includes("MOVIENDO ALIAS DEL CELU")],
  ["UI verifier still checks both updater guarantees", ui.includes("PWA periodically checks for fresh production service workers") && ui.includes("PWA Update Doctor can repair an interrupted update without clearing stories")],
  ["release metadata updated", vite.includes("Character DNA 2.0 + Reaction Engine")],
  ["desktop chat initializes conversation before Experience reads it", chat.indexOf("const conversation = getConversation(character.id);") >= 0 && chat.indexOf("const conversation = getConversation(character.id);") < chat.indexOf("conversation?.conversationId")],
];
let pass=0;
for(const [name,ok] of checks){ console.log(`${ok?"PASS":"FAIL"} ${name}`); if(ok) pass++; }
console.log(`\n${pass}/${checks.length} PWA Verification Hotfix checks passed.`);
if(pass!==checks.length) process.exit(1);
