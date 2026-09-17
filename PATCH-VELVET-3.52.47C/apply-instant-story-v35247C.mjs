import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const RELEASE = "3.52.47";
const RELEASE_NAME = "Instant Story · Conflict First";
const HERE = path.dirname(fileURLToPath(import.meta.url));

const INDEX = path.join(ROOT, "supabase/functions/character-chat/index.ts");
const ENGINE = path.join(ROOT, "supabase/functions/character-chat/engine/instant-story-v3492.ts");
const CLIENT = path.join(ROOT, "src/context/CharactersContext.jsx");
const PACKAGE = path.join(ROOT, "package.json");
const LOCK = path.join(ROOT, "package-lock.json");
const VERSION_FILE = path.join(ROOT, "public/velvet-version.json");
const HANDLER_SRC = path.join(HERE, "instant-story-handler-block.txt");
const VERIFY_SRC = path.join(HERE, "..", "scripts", "verify-v35247-instant-story-conflict-first.mjs");
const VERIFY_DST = path.join(ROOT, "scripts/verify-v35247-instant-story-conflict-first.mjs");

function fail(message) { throw new Error(message); }
function read(file) {
  if (!fs.existsSync(file)) fail(`No encuentro ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, "utf8");
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}
function backup(files) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(ROOT, ".velvet-backups", `v${RELEASE}-instant-story-C-${stamp}`);
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(ROOT, file);
    const out = path.join(dir, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(file, out);
  }
  console.log(`🛟 Backup: ${path.relative(ROOT, dir)}`);
}

try {
  let indexText = read(INDEX);
  let engineText = read(ENGINE);
  let clientText = read(CLIENT);
  const newHandler = read(HANDLER_SRC).trimEnd() + "\n\n";

  const handlerStart = indexText.indexOf("async function handleInstantStory");
  if (handlerStart < 0) fail("No encontré async function handleInstantStory(...). No toqué nada.");
  const afterHandler = indexText.slice(handlerStart + 1);
  const nextFunctionMatch = /\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.exec(afterHandler);
  const nextFunction = nextFunctionMatch
    ? handlerStart + 1 + nextFunctionMatch.index + 1
    : indexText.length;

  backup([INDEX, ENGINE, CLIENT, PACKAGE, LOCK, VERSION_FILE]);

  // Installer C deliberately ignores all old seed/fallback helper names.
  // It only replaces the known Instant Story handler range and injects its own helpers.
  const helperMarker = "// CONFLICT-FIRST STORY ENGINE 3.52.47";
  const existingHelper = indexText.lastIndexOf(helperMarker, handlerStart);
  const replaceStart = existingHelper >= 0 ? existingHelper : handlerStart;
  indexText = indexText.slice(0, replaceStart) + newHandler + indexText.slice(nextFunction);

  // Server completion gate: preserve existing minimum while allowing richer openings.
  const wordLimit = /words\.length\s*<\s*130\s*\|\|\s*words\.length\s*>\s*\d+/;
  if (wordLimit.test(engineText)) {
    engineText = engineText.replace(wordLimit, "words.length < 130 || words.length > 420");
  } else if (!engineText.includes("words.length < 130 || words.length > 420")) {
    fail("No encontré el límite de palabras de Instant Story en instant-story-v3492.ts.");
  }

  // Permit a small amount of real ensemble cast when the profile actually establishes a social world.
  if (!engineText.includes("unknownNpcNames")) {
    const npcLine = /if\(npcMatches\.some\(\(name\)=>!common\.has\(name\)&&!profile\.includes\(name\.toLowerCase\(\)\)\)\) issues\.push\("invented_named_npc"\);/;
    if (npcLine.test(engineText)) {
      engineText = engineText.replace(npcLine, `const unknownNpcNames=[...new Set(npcMatches.filter((name)=>!common.has(name)&&!profile.includes(name.toLowerCase())))];\n  const socialBasis=/\\b(?:friend group|group of|same group|friends|team|teammates|roommates|siblings|family|coworkers|colleagues|crew|club|social circle|popular|campus king|campus prince)\\b/.test(profile);\n  const genericNpcProp=/\\b(?:energy drinks?|beef jerky|sour gummies|spicy chips|junk food|road trip|aux cord|snack run)\\b/.test(t);\n  if(unknownNpcNames.length&&(!socialBasis||genericNpcProp)) issues.push("invented_named_npc");\n  if(unknownNpcNames.length>3) issues.push("npc_name_overload");`);
    }
  }

  // New hard quality gates based directly on the rejected story shapes.
  if (!engineText.includes("romance_first_setup")) {
    const profileAnchor = '  const profile=norm(Object.values(draft||{}).join(" "));';
    if (!engineText.includes(profileAnchor)) fail("No encontré un punto seguro para añadir los quality gates de Instant Story.");
    const gates = `  if(/\\b(?:saved|defended|kept) (?:you |your |the )?(?:a )?seat\\b|\\bdrove across (?:campus|town)\\b|\\bwaiting (?:for you )?(?:beside|by) (?:his |her |their )?car\\b|\\bordered (?:an )?extra\\b.{0,40}\\b(?:your usual|your favorite|for you)\\b|\\blost bracelet\\b/.test(t)) issues.push("romance_first_setup");\n  if(/(?:\\bwhich one\\?|\\byour choice[.!?]?|\\bwhat do you want to do\\?|\\bquiet evening or the drive\\b|\\bstay or go\\?|\\bcome with me[.!?]?)(?:["”’']\\s*)?$/i.test(raw.trim())) issues.push("forced_binary_choice");\n  const ending=norm(raw.slice(-650));\n  if(/\\b(?:the others|everyone|they all) (?:left|went home|followed|headed out)\\b|\\b(?:the argument|the fight|the problem) (?:was|is) over\\b|\\bthat settled it\\b/.test(ending)) issues.push("premature_resolution");\n\n`;
    engineText = engineText.replace(profileAnchor, gates + profileAnchor);
  }

  // Client firewall is optional because 3.52.46 may have moved this check.
  const genericMarker = "const genericInstantStory = /";
  const genericAt = clientText.indexOf(genericMarker);
  if (genericAt >= 0 && !clientText.includes("defended this seat")) {
    const lineStart = clientText.lastIndexOf("\n", genericAt) + 1;
    const lineEnd = clientText.indexOf("\n", genericAt);
    const oldLine = clientText.slice(lineStart, lineEnd);
    const indent = oldLine.match(/^\s*/)?.[0] || "      ";
    const replacement = `${indent}const genericInstantStory = /\\b(?:flickering neon|the kind of .{0,55} (?:he|she|they) usually reserved for|expression shifted from .{0,80} to something (?:much )?softer|gaze lingering .{0,30} too long|spotting you (?:near|by|at|beside)|poor life choices|saved (?:you|your|the) (?:a )?seat|defended this seat|drove across (?:campus|town)|ordered (?:an )?extra.{0,40}(?:your usual|your favorite)|quiet evening or the drive)\\b/i.test(opening);`;
    clientText = clientText.slice(0, lineStart) + replacement + clientText.slice(lineEnd);
  }

  write(INDEX, indexText);
  write(ENGINE, engineText);
  write(CLIENT, clientText);
  write(VERIFY_DST, read(VERIFY_SRC));

  const pkg = JSON.parse(read(PACKAGE));
  pkg.version = RELEASE;
  if (pkg.scripts?.["verify:current"]) {
    pkg.scripts["verify:current"] = pkg.scripts["verify:current"]
      .replace(/\s*&&\s*node(?:\s+--experimental-strip-types)?\s+scripts\/verify-v3526-instant-story-rebuilt\.mjs/g, "")
      .replace(/\s*&&\s*node(?:\s+--experimental-strip-types)?\s+scripts\/verify-v35211-instant-story-template-firewall\.mjs/g, "")
      .replace(/\s*&&\s*node(?:\s+--experimental-strip-types)?\s+scripts\/verify-v35212-instant-story-naturalism\.mjs/g, "");
    if (!pkg.scripts["verify:current"].includes("verify-v35247-instant-story-conflict-first.mjs")) {
      pkg.scripts["verify:current"] += " && node --experimental-strip-types scripts/verify-v35247-instant-story-conflict-first.mjs";
    }
  }
  write(PACKAGE, JSON.stringify(pkg, null, 2) + "\n");

  if (fs.existsSync(LOCK)) {
    const lock = JSON.parse(read(LOCK));
    lock.version = RELEASE;
    if (lock.packages?.[""]) lock.packages[""].version = RELEASE;
    write(LOCK, JSON.stringify(lock, null, 2) + "\n");
  }

  if (fs.existsSync(VERSION_FILE)) {
    const vf = JSON.parse(read(VERSION_FILE));
    vf.version = RELEASE;
    vf.release = RELEASE_NAME;
    vf.name = vf.name || "Velvet Core";
    write(VERSION_FILE, JSON.stringify(vf, null, 2) + "\n");
  }

  console.log("");
  console.log(`✅ Velvet Stories ${RELEASE} · ${RELEASE_NAME}`);
  console.log("✅ handleInstantStory reemplazado sin depender de helpers antiguos.");
  console.log("✅ Helpers Conflict First C instalados con nombres propios.");
  console.log("✅ Techo del servidor: 420 palabras.");
  console.log("✅ Regression test v3.52.47 añadido.");
} catch (error) {
  console.error("");
  console.error(`❌ ${error?.message || error}`);
  console.error("No se desplegó nada. El backup queda disponible.");
  process.exitCode = 1;
}
