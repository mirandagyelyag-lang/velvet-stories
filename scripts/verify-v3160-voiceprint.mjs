import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const edge = fs.readFileSync(path.join(root, "supabase/functions/character-chat/index.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const publicVersion = JSON.parse(fs.readFileSync(path.join(root, "public/velvet-version.json"), "utf8"));
const gradle = fs.readFileSync(path.join(root, "android/app/build.gradle"), "utf8");

const checks = [
  ["package version", pkg.version === "3.16.0"],
  ["public version", publicVersion.version === "3.16.0"],
  ["Android versionName", gradle.includes('versionName "3.16.0"')],
  ["Android versionCode", gradle.includes("versionCode 16")],
  ["runtime includes verbal tells", edge.includes("Verbal tells: ${clean(character.verbal_tells, 300)}")],
  ["voiceprint is operating constraints", edge.includes("VOICEPRINT — OPERATING CONSTRAINTS")],
  ["voice identity survives removed names", edge.includes("identity must remain recognizable even if speaker names are removed")],
  ["mundane dialogue may stay mundane", edge.includes("Let mundane conversation stay mundane")],
  ["verbal tells are not catchphrases", edge.includes("Verbal tells are rare tells, not catchphrases")],
  ["generic romance cadence detector", edge.includes("function hasGenericRomanceCadence") && edge.includes('issues.push("generic_romance_cadence")')],
  ["repair knows generic cadence", edge.includes("generic_romance_cadence:")],
  ["supporting cast gets distinct voice mechanics", edge.includes("humor: ${clean(member.humor_style, 150)}; tells: ${clean(member.verbal_tells, 150)}")],
  ["voice lab requests observable mechanics", edge.includes("Define observable speech mechanics rather than adjective-only labels")],
  ["learning room does not force wit", edge.includes("do not make all ten maximally witty")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${label}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} Voiceprint verification check(s) failed.`);
  process.exit(1);
}
console.log("\nVelvet v3.16.0 Voiceprint: character-specific speech mechanics are wired into live generation.");
