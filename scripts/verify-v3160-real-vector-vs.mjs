import fs from "fs";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const component = fs.readFileSync(new URL("../src/components/NativeRealVsLaunch.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/styles/velvet-v3160-real-vector-vs.css", import.meta.url), "utf8");
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const checks = [
  ["App imports NativeRealVsLaunch", /import\s+NativeRealVsLaunch\s+from\s+"\.\/components\/NativeRealVsLaunch"/.test(app)],
  ["App imports v3160 CSS", /velvet-v3160-real-vector-vs\.css/.test(app)],
  ["App renders NativeRealVsLaunch", /<NativeRealVsLaunch\s+key="velvet-native-launch"\s*\/>/.test(app)],
  ["Component uses SVG", /<svg[^>]*viewBox="0 0 100 160"/.test(component)],
  ["Component contains text VS", />VS<\/text>/.test(component)],
  ["Component contains polygon shards", /<polygon\s+points=\{shard\.points\}/.test(component)],
  ["Fullscreen hook kept", /setNativeLaunchFullscreen\(true\)/.test(component)],
  ["CSS exists for real vector launch", /\.velvet-real-vs-launch\{/.test(css)],
  ["CSS has no PNG asset dependency", !/velvet-crystal-vs\.png/.test(css) && !/https?:\/\//.test(css)],
  ["package version bumped", pkg.version === "3.16.0"],
  ["verify:v3160 script present", pkg.scripts?.["verify:v3160"] === "node scripts/verify-v3160-real-vector-vs.mjs"],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} · ${label}`);
}

if (failed) {
  console.error(`\nverify:v3160 failed with ${failed} issue(s).`);
  process.exit(1);
}

console.log(`\nverify:v3160 passed (${checks.length}/${checks.length}).`);
