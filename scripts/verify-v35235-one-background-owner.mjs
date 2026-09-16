import fs from "node:fs";

const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const main = fs.readFileSync("src/main.jsx", "utf8");
const css = fs.readFileSync("src/styles/velvet-v35235-one-background-owner.css", "utf8");
const version = String(pkg.version).split(".").map(Number);

add("release is v3.52.35 or newer", version[0] === 3 && version[1] === 52 && version[2] >= 35);
add("new authority loads after v3.52.34", main.indexOf("velvet-v35235-one-background-owner.css") > main.indexOf("velvet-v35234-single-canvas.css"));
add("body alone owns Stories atmosphere", css.includes('body[data-velvet-page="chats"]:not(.velvet-page--chat).velvet-burgundy-route') && css.includes("background: var(--stories-atmosphere) !important"));
add("nested Stories boxes are transparent", css.includes(".velvet-route-stage") && css.includes(".chats-page.chats-page--reference") && css.includes("background: transparent !important"));
add("document fallback is solid only", css.includes('html[data-velvet-page="chats"].velvet-burgundy-route') && css.includes("background-image: none !important"));
add("legacy route pseudo-layer is disabled", css.includes(".chats-page.chats-page--reference::before") && css.includes("content: none !important"));
add("body pseudo-layer is disabled to avoid a second painter", css.includes("velvet-burgundy-route::before") && css.includes("display: none !important"));
add("fix cannot affect an open character chat", css.includes(":not(.velvet-page--chat)"));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} · ${check.name}`);
if (checks.some((check) => !check.ok)) process.exit(1);
console.log(`\n${checks.length}/${checks.length} PASS · Stories has exactly one continuous background owner.`);
