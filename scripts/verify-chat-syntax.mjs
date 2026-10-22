import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as nodeModule from "node:module";

// Discover all TypeScript modules rather than relying on a stale fixed list.
// This is a syntax check, NOT type checking, import resolution, or runtime validation.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const functionRoot = path.join(projectRoot, "supabase", "functions", "character-chat");
const requiredEntry = path.join(functionRoot, "index.ts");
const extensions = /\\.(?:ts|tsx|mts|cts)$/i;
const ignored = new Set(["node_modules", ".git", "dist", "build", ".cache"]);
const errors = [];
const files = [];
const start = Date.now();

if (typeof nodeModule.stripTypeScriptTypes !== "function") {
  console.error("FAIL: this Node.js version does not expose node:module.stripTypeScriptTypes.");
  console.error("Use a compatible recent Node.js version (Node 22.13+ or newer).");
  process.exit(1);
}

function scan(directory) {
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    errors.push({ file: path.relative(projectRoot, directory), message: `Cannot scan directory: ${error.message}` });
    return;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) scan(full);
    } else if (entry.isFile() && extensions.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
}

if (!fs.existsSync(requiredEntry)) {
  errors.push({ file: "supabase/functions/character-chat/index.ts", message: "Required entry point is missing" });
}
scan(functionRoot);
files.sort();
if (!files.length) {
  errors.push({ file: "character-chat", message: "No TypeScript modules discovered" });
}

let passed = 0;
for (const file of files) {
  const relative = path.relative(projectRoot, file).replace(/\\\\/g, "/");
  try {
    const source = fs.readFileSync(file, "utf8");
    if (!source.trim()) throw new Error("File is empty");
    nodeModule.stripTypeScriptTypes(source, { mode: "strip", sourceUrl: relative });
    console.log(`PASS TypeScript syntax · ${relative}`);
    passed += 1;
  } catch (error) {
    const message = error?.message || String(error);
    errors.push({ file: relative, message });
    console.error(`FAIL TypeScript syntax · ${relative}: ${message}`);
  }
}

console.log(`\\nTypeScript syntax audit: ${passed}/${files.length} passed; ${errors.length} errors; ${Date.now() - start} ms.`);
if (errors.length) {
  console.error("Failed files:");
  for (const error of errors) console.error(`- ${error.file}: ${error.message}`);
  process.exitCode = 1;
} else {
  console.log("PASS: discovered TypeScript modules have parsable erasable-type syntax.");
  console.log("NOTE: This does not validate types, Deno/Supabase imports, or narrative behavior.");
}
