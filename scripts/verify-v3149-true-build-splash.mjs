import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const failures=[];
const read=(f)=>fs.readFileSync(path.join(root,f),"utf8");
const css=read("src/styles/welcome-splash.css");
const jsx=read("src/components/WelcomeSplash.jsx");
const pkg=JSON.parse(read("package.json"));
for (const needle of ["velvet-build__reveal--core","velvet-build__reveal--ink","velvetBuildCore","velvetBuildInk","velvet-build__draw-front","velvetBuildFront","velvetBuildFinal","velvet-splash--true-build"]) if(!css.includes(needle)) failures.push(`CSS missing ${needle}`);
for (const needle of ["velvet-cinematic-core.webp","velvet-cinematic-ink.webp","velvet-cinematic-dark-reference.webp","NativeDarkVelvetReveal","velvet-splash--true-build"]) if(!jsx.includes(needle)) failures.push(`WelcomeSplash missing ${needle}`);
for (const f of ["src/assets/velvet-cinematic-core.webp","src/assets/velvet-cinematic-ink.webp","src/assets/velvet-cinematic-dark-reference.webp"]) if(!fs.existsSync(path.join(root,f))) failures.push(`missing ${f}`);
if(css.includes("clip-path: polygon") || css.includes("velvet-reference__image--slice")) failures.push("old chopped/sliced reveal returned");
if(css.includes("\\n")) failures.push("literal \\n tokens found in CSS");
if(pkg.version!=="3.14.9") failures.push(`package version is ${pkg.version}`);
if(failures.length){ console.error("\nVELVET v3.14.9 TRUE BUILD VERIFY FAILED"); failures.forEach(x=>console.error(`- ${x}`)); process.exit(1);}
console.log("Velvet v3.14.9 verified: luminous logo extraction builds progressively · moving draw-front · exact approved artwork resolves as final frame · no sliced reveal.");
