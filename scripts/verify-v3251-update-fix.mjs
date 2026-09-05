import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const pub=JSON.parse(read("public/velvet-version.json"));
const pwa=read("src/context/PWAContext.jsx");
const deploy=read("DEPLOY-PWA-STABLE.sh");
const vite=read("vite.config.js");
const checks=[
  ["version 3.25.1",pkg.version==="3.25.1"&&pub.version==="3.25.1"],
  ["generic pending update key",pwa.includes('velvet_update_pending\"')&&!pwa.includes("velvet_update_pending_v3171")],
  ["all SW registrations checked",pwa.includes("navigator.serviceWorker.getRegistrations()")&&pwa.includes("forceServiceWorkerNetworkCheck")],
  ["repair clears Velvet media caches",pwa.includes("clearVelvetCaches({ includeMedia: true })")&&pwa.includes("velvet-images|velvet-fonts")],
  ["repair carries target version",pwa.includes('url.searchParams.set("velvet_target", VELVET_VERSION)')],
  ["deploy validates immutable URL",deploy.includes("Buscando deployment que realmente sirve")&&deploy.includes("velvet-version.json")],
  ["alias moves only after version match",deploy.includes('[ -n "$DEPLOY_URL" ] || finish_fail')&&deploy.includes('=== PASO 6/7 · MOVIENDO ALIAS DEL CELU ===')],
  ["loud final status",deploy.includes("FINAL: TU CELU YA ESTÁ RECIBIENDO")&&deploy.includes("FINAL: NO QUEDÓ PUBLICADA")],
  ["release metadata",vite.includes("Velvet Experience Update Fix")],
  ["v3.25 experience retained",pkg.scripts?.["verify:v3250"]?.includes("verify-v3250-experience")],
];
let pass=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`); if(ok) pass++;}
console.log(`\n${pass}/${checks.length} Update Fix checks passed.`);
if(pass!==checks.length) process.exit(1);
