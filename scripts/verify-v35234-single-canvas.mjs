import fs from "node:fs";

const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const main = fs.readFileSync("src/main.jsx", "utf8");
const css = fs.readFileSync("src/styles/velvet-v35234-single-canvas.css", "utf8");
const version = String(pkg.version).split(".").map(Number);

add("release is v3.52.34 or newer", version[0] === 3 && version[1] === 52 && version[2] >= 34);
add("single-canvas stylesheet loads after v3.52.33", main.indexOf("velvet-v35234-single-canvas.css") > main.indexOf("velvet-v35233-stories-bottom-tail.css"));
add("Stories shell owns the atmosphere", css.includes(".velvet-route-stage") && css.includes("background: var(--stories-atmosphere) !important"));
add("Stories route no longer paints a second rectangle", css.includes(".chats-page.chats-page--reference") && css.includes("background: transparent !important"));
add("fix is scoped to Stories library, not open chat", css.includes('body[data-velvet-page="chats"]:not(.velvet-page--chat)'));
add("overscroll keeps the Stories canvas fallback", css.includes("background-color: var(--stories-canvas) !important"));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} · ${check.name}`);
if (checks.some((check) => !check.ok)) process.exit(1);
console.log(`\n${checks.length}/${checks.length} PASS · Stories is one continuous canvas.`);
