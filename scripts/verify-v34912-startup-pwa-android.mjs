import fs from "node:fs";
const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const app=fs.readFileSync("src/App.jsx","utf8");
const main=fs.readFileSync("src/main.jsx","utf8");
const pwa=fs.readFileSync("src/context/PWAContext.jsx","utf8");
const resume=fs.readFileSync("src/utils/appResumeRecoveryV34912.js","utf8");
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");
const java=fs.readFileSync("android/app/src/main/java/com/velvetstories/app/MainActivity.java","utf8");
const vite=fs.readFileSync("vite.config.js","utf8");

ok("version 3.49.12 exact",pkg.version==="3.49.12"&&pub.version==="3.49.12");
ok("release name is completion release",/Mobile Experience.*Character Polish Completion/.test(pub.release||""));
ok("v3.49.12 runs first in stability lab",(pkg.scripts?.["stability:lab"]||"").startsWith("npm run verify:v34912"));
ok("v3.49.8 remains regression",(pkg.scripts?.["stability:lab"]||"").includes("npm run verify:v3498"));
ok("resume recovery installs before app boot",main.includes("installAppResumeRecoveryV34912")&&main.indexOf("installAppResumeRecoveryV34912()")<main.indexOf("createRoot(document.getElementById"));
ok("boot-ready event is emitted",main.includes("velvet:boot-ready")&&main.includes("window.__VELVET_BOOT_OK__ = true"));
ok("last healthy build is persisted",main.includes("velvet:last-healthy-version"));
ok("splash can dismiss on real boot readiness",app.includes('addEventListener("velvet:boot-ready"')&&app.includes("setNativeLaunchVisible(false)"));
ok("splash still has hard watchdog",app.includes("5200")&&app.includes("setTimeout"));
ok("app persists current route before pause",app.includes("persistCurrentLocation")&&app.includes('velvet:app-pause'));
ok("app warms current route after resume",app.includes('velvet:app-resume')&&app.includes("routeImports.chat")&&app.includes("loader?.().catch"));
ok("resume utility tracks pause and resume",resume.includes('velvet:app-pause')&&resume.includes('velvet:app-resume'));
ok("resume utility handles BFCache",resume.includes("pageshow")&&resume.includes("bfcache"));
ok("network restoration emits recovery event",resume.includes("velvet:connectivity-restored")&&resume.includes('addEventListener("online"'));
ok("PWA updater runs after resume",pwa.includes('velvet:app-resume')&&pwa.includes("checkForUpdate({ silent: true })"));
ok("PWA updater runs after connectivity restore",pwa.includes('velvet:connectivity-restored'));
ok("PWA update polling has storm guard",pwa.includes("lastRun")&&pwa.includes("2500"));
ok("chat reloads after resume",chat.includes('velvet:app-resume')&&chat.includes("reloadConversationMessages"));
ok("Android emits native resume event",java.includes("onResume()")&&java.includes("velvet:native-resume"));
ok("Android emits native pause event",java.includes("onPause()")&&java.includes("velvet:native-pause"));
ok("native lifecycle bridge uses main WebView safely",java.includes("bridge.getWebView()")&&java.includes("evaluateJavascript"));
ok("Vite release metadata matches final release",vite.includes('velvetRelease = "Mobile Experience · Character Polish Completion"'));
ok("runtime state stays minimal",resume.includes("STATE_KEY")&&!resume.includes("message.content")&&!resume.includes("prompt"));

let failed=0; for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.12 Startup/PWA/Android checks passed.`); if(failed)process.exit(1);
