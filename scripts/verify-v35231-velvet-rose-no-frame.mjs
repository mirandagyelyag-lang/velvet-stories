import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const vite = readFileSync(join(root, "vite.config.js"), "utf8");
const html = readFileSync(join(root, "index.html"), "utf8");
const version = JSON.parse(readFileSync(join(root, "public/velvet-version.json"), "utf8"));

function pngSize(path) {
  const png = readFileSync(join(root, path));
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}
function sha(path) {
  return createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
}

const webSpecs = [
  ["public/velvet-rose-no-frame-favicon.png", 64, 64],
  ["public/velvet-rose-no-frame-64.png", 64, 64],
  ["public/velvet-rose-no-frame-apple-180.png", 180, 180],
  ["public/velvet-rose-no-frame-192.png", 192, 192],
  ["public/velvet-rose-no-frame-512.png", 512, 512],
  ["public/velvet-rose-no-frame-maskable-512.png", 512, 512],
];
const androidSpecs = [
  ["mdpi", 48], ["hdpi", 72], ["xhdpi", 96], ["xxhdpi", 144], ["xxxhdpi", 192],
].flatMap(([density, size]) => [
  [`android/app/src/main/res/mipmap-${density}/ic_launcher.png`, size, size],
  [`android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`, size, size],
]);

const checks = [
  ["version is 3.52.31", pkg.version === "3.52.31"],
  ["release metadata names no-frame Velvet Rose", version.version === "3.52.31" && version.release === "Velvet Rose · No Frame"],
  ["approved transparent source is preserved", existsSync(join(root, "branding/velvet-rose-no-frame-source.png")) && sha("branding/velvet-rose-no-frame-source.png") === "9a3f57f303af7f14ef459bdf3eb2fa514df7bf2bf4d63d888bd19fd0b7636a8b"],
  ["512 no-frame icon is the approved render", sha("public/velvet-rose-no-frame-512.png") === "ef08d658eec4e9b6161ea16561fc2aa74ae2872e7b54fac7f25f763ce844917a"],
  ["all web icon sizes are correct", webSpecs.every(([path, w, h]) => existsSync(join(root, path)) && pngSize(path)[0] === w && pngSize(path)[1] === h)],
  ["PWA manifest uses the no-frame icon family", vite.includes("velvet-rose-no-frame-favicon.png") && vite.includes("velvet-rose-no-frame-maskable-512.png") && !vite.includes("velvet-rose-v1-")],
  ["HTML uses no-frame favicon and Apple icon", html.includes('/velvet-rose-no-frame-favicon.png') && html.includes('/velvet-rose-no-frame-apple-180.png')],
  ["old framed web icon family is removed", !existsSync(join(root, "public/velvet-rose-v1-512.png"))],
  ["Android launcher density assets use native sizes", androidSpecs.every(([path, w, h]) => existsSync(join(root, path)) && pngSize(path)[0] === w && pngSize(path)[1] === h)],
  ["Android xxxhdpi launcher is approved no-frame render", sha("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png") === "291a455c3e3958b2d633fdfadb16f4d6d3a692d67130122c69e07869b4a1881e"],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} Velvet Rose no-frame check(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length}/${checks.length} Velvet Rose no-frame checks passed.`);
