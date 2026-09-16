import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const add = (name, condition) => checks.push([name, Boolean(condition)]);

const pkg = JSON.parse(read("package.json"));
const main = read("src/main.jsx");
const css = read("src/styles/velvet-v35233-stories-bottom-tail.css");
const version = pkg.version.split(".").map(Number);

add("release is v3.52.33 or newer", version[0] === 3 && version[1] === 52 && version[2] >= 33);
add("tail cleanup stylesheet is loaded", main.includes('import "./styles/velvet-v35233-stories-bottom-tail.css";'));
add("tail cleanup loads after prior current UI layers", main.lastIndexOf("velvet-v35233-stories-bottom-tail.css") > main.lastIndexOf("velvet-v3520-whole-app-stabilization.css"));
add("Stories mobile tail reserves compact dock clearance", css.includes("padding-bottom: calc(86px + max(env(safe-area-inset-bottom), var(--velvet-native-safe-bottom, 0px))) !important;"));
add("duplicate floating search is hidden only on Stories", css.includes('body[data-velvet-page="chats"]:not(.velvet-page--chat) .mobile-global-search'));
add("chat mode is explicitly excluded", css.includes(":not(.velvet-page--chat)"));

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} · ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(`PASS · ${checks.length}/${checks.length}`);
