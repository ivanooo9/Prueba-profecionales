/**
 * Removes emoji / pictographic symbols from source text files.
 * Run from repo: node scripts/strip-emojis.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

const EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".html",
  ".prisma",
  ".yml",
  ".yaml",
]);

// Unicode emoji / pictographic blocks (conservative + Extended_Pictographic when available)
function stripEmojis(input) {
  let s = input;
  // ES2018+ property for most emoji glyphs
  try {
    s = s.replace(/\p{Extended_Pictographic}/gu, "");
  } catch {
    // ignore if runtime lacks unicode property escapes
  }
  // Supplementary symbols often used as emoji
  s = s.replace(/[\u{1F000}-\u{1FAFF}]/gu, "");
  s = s.replace(/[\u{2600}-\u{26FF}]/gu, "");
  s = s.replace(/[\u{2700}-\u{27BF}]/gu, "");
  s = s.replace(/[\u{FE00}-\u{FE0F}]/gu, ""); // variation selectors
  s = s.replace(/\u200D/g, ""); // ZWJ
  s = s.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, ""); // regional indicator pairs (flags)
  return s;
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, files);
    } else {
      if (e.name === "package-lock.json") continue;
      const ext = path.extname(e.name);
      if (EXT.has(ext)) files.push(p);
    }
  }
  return files;
}

function main() {
  const files = walk(ROOT);
  let changed = 0;
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    let raw;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const next = stripEmojis(raw);
    if (next !== raw) {
      fs.writeFileSync(file, next, "utf8");
      changed++;
      console.log("updated:", rel);
    }
  }
  console.log(`Done. Files modified: ${changed}`);
}

main();
