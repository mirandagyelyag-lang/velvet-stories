import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const vite = readFileSync(join(root, "vite.config.js"), "utf8");
const html = readFileSync(join(root, "index.html"), "utf8");
const version = JSON.parse(readFileSync(join(root, "public/velvet-version.json"), "utf8"));

const iconSpecs = [
  ["public/velvet-rose-v1-favicon.png", 64, 64],
  ["public/velvet-rose-v1-64.png", 64, 64],
  ["public/velvet-rose-v1-apple-180.png", 180, 180],
  ["public/velvet-rose-v1-192.png", 192, 192],
  ["public/velvet-rose-v1-512.png", 512, 512],
  ["public/velvet-rose-v1-maskable-512.png", 512, 512],
];

function pngSize(path) {
  const png = readFileSync(join(root, path));
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

function sha(path) {
  return createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
}

const androidPaths = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"].flatMap((density) => [
  `android/app/src/main/res/mipmap-${density}/ic_launcher.png`,
  `android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`,
]);
const maskableHash = sha("public/velvet-rose-v1-maskable-512.png");

const checks = [
  ["version is 3.52.30", pkg.version === "3.52.30"],
  ["release metadata names Velvet Rose Icon", version.version === "3.52.30" && version.release === "Velvet Rose Icon"],
  ["approved Velvet Rose source is preserved", existsSync(join(root, "branding/velvet-rose-app-icon-source.png")) && sha("branding/velvet-rose-app-icon-source.png") === "272c1e5edf081bade3ece7a8b04d6bd28638a9ce564d451cfbe3386037d4be2c"],
  ["512 app icon is the approved render", sha("public/velvet-rose-v1-512.png") === "475bc3dddbb866262dc3d0f1692d19ff5ddc397bb19d7a306cede87fad46f9e4"],
  ["all web icon sizes are correct", iconSpecs.every(([path, w, h]) => existsSync(join(root, path)) && pngSize(path)[0] === w && pngSize(path)[1] === h)],
  ["PWA manifest uses only the Velvet Rose icon family", vite.includes("velvet-rose-v1-favicon.png") && vite.includes("velvet-rose-v1-maskable-512.png") && !vite.includes("velvet-vs-v4-")],
  ["HTML favicon and Apple icon use Velvet Rose", html.includes('/velvet-rose-v1-favicon.png') && html.includes('/velvet-rose-v1-apple-180.png') && !html.includes("velvet-vs-v4-")],
  ["old web icon family is removed", !iconSpecs.some(([path]) => !existsSync(join(root, path))) && !existsSync(join(root, "public/velvet-vs-v4-512.png"))],
  ["Android launcher icons all use the padded Velvet Rose render", androidPaths.every((path) => existsSync(join(root, path)) && pngSize(path)[0] === 512 && pngSize(path)[1] === 512 && sha(path) === maskableHash)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} Velvet Rose icon check(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length}/${checks.length} Velvet Rose icon checks passed.`);
