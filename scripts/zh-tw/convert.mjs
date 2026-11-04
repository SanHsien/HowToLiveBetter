#!/usr/bin/env node
// Convert an upstream (main) tree into the zh-TW edition tree.
// Run from the repo root of a clean main checkout, with scripts/zh-tw
// carried over. Deterministic: running it on an already converted tree
// changes nothing (check.mjs gate 4 verifies idempotence).
//
// Steps:
//  1. Every text file: protect() -> OpenCC (cn -> tw2) -> applyVocab() ->
//     restore(), plus a percent-encoded-segment pass so Chinese inside
//     URL-encoded links and shields.io badges converts too.
//  2. Edition edits: zh-CN language tags become zh-TW, the book's own
//     "write in Simplified" rules flip to Traditional, Noto Sans SC font
//     names become Noto Sans TC, and the book workflow builds zh-tw.
//  3. Files and directories whose names contain Simplified Chinese are
//     renamed to their converted form (same pipeline), so no Simplified
//     file name survives; links inside converted content convert with the
//     same pipeline and keep resolving.
//
// Excluded: .git, scripts/zh-tw itself (authored in zh-TW), dist,
// node_modules, binary files, the English licences (no Chinese content),
// and tools/epub/package-lock.json (machine-generated lockfile).
//
// Requires: opencc-cli (@willh/opencc-cli) on PATH, or OPENCC=/path.
import fs from 'node:fs';
import path from 'node:path';
import { convertText, convertEncoded } from './pipeline.mjs';

const root = process.cwd();

const TEXT_EXT = new Set([
  '.md', '.html', '.mjs', '.js', '.json', '.yml', '.yaml', '.xml',
  '.txt', '.css', '.typ', '.gitignore',
]);
const EXCLUDE_FILES = new Set([
  'LICENSE', 'LICENSE-CODE', 'tools/epub/package-lock.json',
]);
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'dist']);

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (dir === '.' && e.name === 'scripts') continue; // handled below
    const p = dir === '.' ? e.name : path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!EXCLUDE_DIRS.has(e.name)) walk(p, out);
    } else out.push(p);
  }
  return out;
};
// scripts/ contains only scripts/zh-tw in this repo; skip the whole tree.
// (If upstream ever adds other scripts/, revisit this line.)
const FILES = walk('.').filter((f) => {
  if (EXCLUDE_FILES.has(f)) return false;
  if (!TEXT_EXT.has(path.extname(f)) && !f.startsWith('.')) return false;
  try {
    return !fs.readFileSync(path.join(root, f)).includes(0);
  } catch { return false; }
});

const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, t) => fs.writeFileSync(path.join(root, f), t);

let changed = 0;
for (const f of FILES) {
  const orig = read(f);
  let out = convertText(orig);
  out = convertEncoded(out);
  if (out !== orig) { write(f, out); changed++; }
}
console.log(`converted ${changed}/${FILES.length} text files`);

// --- Edition edits (file-scoped, applied after conversion) ---
const sub = (f, pairs) => {
  if (!fs.existsSync(path.join(root, f))) return;
  let t = read(f);
  const orig = t;
  for (const [a, b] of pairs) t = t.split(a).join(b);
  if (t !== orig) write(f, t);
};
// Language tags everywhere.
for (const f of FILES) sub(f, [['zh-CN', 'zh-TW'], ['zh_CN', 'zh_TW'], ['Noto Sans SC', 'Noto Sans TC']]);
// The book's own writing rules name the edition's script.
sub('CLAUDE.md', [['簡體中文，不用繁體', '繁體中文（台灣用詞），不用簡體']]);
sub('skills/life-decision-guide/SKILL.md', [['簡體中文', '繁體中文']]);
// The skill's own instruction prose (not book content): Taiwan terms for
// a generic "personalised" and for stroke / heart attack. The statutory
// 個性化分期 elsewhere in the book is a product name and stays.
sub('skills/life-decision-guide/SKILL.md', [
  ['不給個性化投資建議', '不給個人化投資建議'],
  ['卒中或心梗的症狀', '中風或心肌梗塞的症狀'],
]);
// The book workflow builds the edition branch, not the upstream mirror.
sub('.github/workflows/book.yml', [['branches: [main]', 'branches: [zh-tw]']]);

// --- Renames ---
// Snapshot every path (files and directories) and convert each segment
// with the same pipeline. Rename deepest paths first.
const entries = [];
const walkPaths = (dir) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const p = dir === '.' ? e.name : path.join(dir, e.name);
    if (dir === '.' && (e.name === '.git' || e.name === 'scripts')) continue;
    entries.push(p);
    if (e.isDirectory()) walkPaths(p);
  }
};
walkPaths('.');
let renamed = 0;
// Deepest paths first, and rename only the basename inside its current
// parent: ancestors keep their old names until their own turn, so the
// parent directory always exists at the moment of the rename.
const byDepth = entries.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);
for (const p of byDepth) {
  const base = path.basename(p);
  const newBase = convertText(base);
  if (newBase !== base) {
    fs.renameSync(path.join(root, p), path.join(root, path.dirname(p), newBase));
    renamed++;
  }
}
console.log(`renamed ${renamed} paths`);
