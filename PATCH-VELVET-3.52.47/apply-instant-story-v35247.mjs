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
const VERIFY_SRC = path.join(HERE, "..", "verify-v35247-instant-story-conflict-first.mjs");
const VERIFY_DST = path.join(ROOT, "scripts/verify-v35247-instant-story-conflict-first.mjs");
const BLOCK_SRC = path.join(HERE, "instant-story-index-block.txt");
const PROMPT_SRC = path.join(HERE, "instant-story-prompt-block.txt");

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
  const dir = path.join(ROOT, ".velvet-backups", `v${RELEASE}-instant-story-${stamp}`);
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(ROOT, file);
    const out = path.join(dir, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(file, out);
  }
  console.log(`🛟 Backup: ${path.relative(ROOT, dir)}`);
}
function firstIndexOfAny(source, markers, from = 0) {
  const hits = markers
    .map((marker) => ({ marker, at: source.indexOf(marker, from) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at);
  return hits[0] || null;
}
function replaceRange(source, start, end, replacement, label) {
  if (start < 0 || end < 0 || end <= start) fail(`No pude delimitar ${label}. No toqué el archivo.`);
  return source.slice(0, start) + replacement + source.slice(end);
}

try {
  let indexText = read(INDEX);
  let engineText = read(ENGINE);
  let clientText = read(CLIENT);
  const instantStoryBlock = read(BLOCK_SRC).trimEnd() + "\n\n";
  const newPrompt = read(PROMPT_SRC).trimEnd() + "\n\n";

  backup([INDEX, ENGINE, CLIENT, PACKAGE, LOCK, VERSION_FILE]);

  // Replace only Instant Story seed + fallback logic. Local 3.52.46 may no longer
  // contain the old NON_ACADEMIC_SCENES constant, so function names are the stable anchors.
  if (!indexText.includes("CONFLICT-FIRST STORY ENGINE 3.52.47")) {
    const handleAt = indexText.indexOf("async function handleInstantStory");
    if (handleAt < 0) fail("No encontré async function handleInstantStory(...).");

    const seedFunctionAt = indexText.indexOf("function instantStorySceneSeed");
    const legacyConst = firstIndexOfAny(indexText, [
      "const INSTANT_STORY_NON_ACADEMIC_SCENES = [",
      "const INSTANT_STORY_SCENES = [",
      "const INSTANT_STORY_SCENE_SEEDS = [",
    ]);
    const blockStart = legacyConst && legacyConst.at < handleAt
      ? legacyConst.at
      : seedFunctionAt;
    if (blockStart < 0 || blockStart >= handleAt) {
      fail("No encontré function instantStorySceneSeed(...) antes de handleInstantStory.");
    }
    indexText = replaceRange(indexText, blockStart, handleAt, instantStoryBlock, "seed/fallback de Instant Story");

    // Recompute handle position after replacement, then replace only the template prompt.
    const newHandleAt = indexText.indexOf("async function handleInstantStory");
    const promptStart = indexText.indexOf("  const prompt = `", newHandleAt);
    if (promptStart < 0) fail("No encontré const prompt = `...` dentro de handleInstantStory.");
    const promptEnd = indexText.indexOf("`;", promptStart);
    if (promptEnd < 0) fail("No encontré el cierre del prompt de Instant Story.");
    indexText = replaceRange(indexText, promptStart, promptEnd + 2, newPrompt.trimEnd(), "prompt de Instant Story");
  } else {
    console.log("ℹ️  Conflict First 3.52.47 ya está instalado en index.ts.");
  }

  // Server completion gate: allow richer conflict-first openings.
  if (engineText.includes("words.length < 130 || words.length > 280")) {
    engineText = engineText.replace("words.length < 130 || words.length > 280", "words.length < 130 || words.length > 420");
  } else if (engineText.includes("words.length < 130 || words.length > 320")) {
    engineText = engineText.replace("words.length < 130 || words.length > 320", "words.length < 130 || words.length > 420");
  } else if (!engineText.includes("words.length < 130 || words.length > 420")) {
    const genericLimit = /words\.length\s*<\s*130\s*\|\|\s*words\.length\s*>\s*\d+/;
    if (genericLimit.test(engineText)) engineText = engineText.replace(genericLimit, "words.length < 130 || words.length > 420");
    else fail("No encontré el límite de palabras de Instant Story en instant-story-v3492.ts.");
  }

  // Permit a small number of real social NPCs when the profile establishes a social world.
  if (!engineText.includes("unknownNpcNames")) {
    const npcLine = /if\(npcMatches\.some\(\(name\)=>!common\.has\(name\)&&!profile\.includes\(name\.toLowerCase\(\)\)\)\) issues\.push\("invented_named_npc"\);/;
    if (npcLine.test(engineText)) {
      engineText = engineText.replace(npcLine, `const unknownNpcNames=[...new Set(npcMatches.filter((name)=>!common.has(name)&&!profile.includes(name.toLowerCase())))];\n  const socialBasis=/\\b(?:friend group|group of|same group|friends|team|teammates|roommates|siblings|family|coworkers|colleagues|crew|club|social circle|popular|campus king|campus prince)\\b/.test(profile);\n  const genericNpcProp=/\\b(?:energy drinks?|beef jerky|sour gummies|spicy chips|junk food|road trip|aux cord|snack run)\\b/.test(t);\n  if(unknownNpcNames.length&&(!socialBasis||genericNpcProp)) issues.push("invented_named_npc");\n  if(unknownNpcNames.length>3) issues.push("npc_name_overload");`);
    }
  }

  if (!engineText.includes("romance_first_setup")) {
    const anchor = 'if(/\\b(?:energy drinks?|beef jerky|sour gummies|spicy chips|junk food)\\b/.test(t)&&/\\b(?:road trip|state line|three hundred miles|aux cord|caffeine)\\b/.test(t)) issues.push("generic_roadtrip_snack_scene");';
    if (engineText.includes(anchor)) {
      engineText = engineText.replace(anchor, anchor + `\n  if(/\\b(?:saved|defended|kept) (?:you |your |the )?(?:a )?seat\\b|\\bdrove across (?:campus|town)\\b|\\bwaiting (?:for you )?(?:beside|by) (?:his |her |their )?car\\b|\\bordered (?:an )?extra\\b.{0,40}\\b(?:your usual|your favorite|for you)\\b|\\blost bracelet\\b/.test(t)) issues.push("romance_first_setup");\n  if(/(?:\\bwhich one\\?|\\byour choice[.!?]?|\\bwhat do you want to do\\?|\\bquiet evening or the drive\\b|\\bstay or go\\?|\\bcome with me[.!?]?)(?:["”’']\\s*)?$/i.test(raw.trim())) issues.push("forced_binary_choice");\n  const ending=norm(raw.slice(-650));\n  if(/\\b(?:the others|everyone|they all) (?:left|went home|followed|headed out)\\b|\\b(?:the argument|the fight|the problem) (?:was|is) over\\b|\\bthat settled it\\b/.test(ending)) issues.push("premature_resolution");`);
    } else {
      // If the exact old naturalism anchor changed, insert before profile=... which is stable in this helper.
      const profileAnchor = "  const profile=norm(Object.values(draft||{}).join(\" \"));";
      if (!engineText.includes(profileAnchor)) fail("No encontré un punto seguro para añadir los nuevos quality gates.");
      engineText = engineText.replace(profileAnchor, `  if(/\\b(?:saved|defended|kept) (?:you |your |the )?(?:a )?seat\\b|\\bdrove across (?:campus|town)\\b|\\bwaiting (?:for you )?(?:beside|by) (?:his |her |their )?car\\b|\\bordered (?:an )?extra\\b.{0,40}\\b(?:your usual|your favorite|for you)\\b|\\blost bracelet\\b/.test(t)) issues.push("romance_first_setup");\n  if(/(?:\\bwhich one\\?|\\byour choice[.!?]?|\\bwhat do you want to do\\?|\\bquiet evening or the drive\\b|\\bstay or go\\?|\\bcome with me[.!?]?)(?:["”’']\\s*)?$/i.test(raw.trim())) issues.push("forced_binary_choice");\n  const ending=norm(raw.slice(-650));\n  if(/\\b(?:the others|everyone|they all) (?:left|went home|followed|headed out)\\b|\\b(?:the argument|the fight|the problem) (?:was|is) over\\b|\\bthat settled it\\b/.test(ending)) issues.push("premature_resolution");\n\n${profileAnchor}`);
    }
  }

  // Expand client firewall, but do not fail if this line was refactored in 3.52.46.
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
  console.log("✅ Conflict-first prompt instalado.");
  console.log("✅ Seed/fallback reemplazado usando anclas flexibles.");
  console.log("✅ Techo del servidor: 420 palabras.");
  console.log("✅ Regression test v3.52.47 añadido.");
} catch (error) {
  console.error("");
  console.error(`❌ ${error?.message || error}`);
  console.error("No se desplegó nada. El backup queda disponible.");
  process.exitCode = 1;
}
