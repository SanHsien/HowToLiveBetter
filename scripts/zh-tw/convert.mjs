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
//  2. Files and directories whose names contain Simplified Chinese are
//     renamed to their converted form (same pipeline), so no Simplified
//     file name survives; links inside converted content convert with the
//     same pipeline and keep resolving.
//  3. Edition edits: zh-CN language tags become zh-TW, the book's own
//     "write in Simplified" rules flip to Traditional, Noto Sans SC font
//     names become Noto Sans TC, the book workflow builds zh-tw, and the
//     three over-long 說人話 lines are trimmed to fit the 120-char limit.
//     Edition edits run after the renames because they address the book
//     files by their converted (Traditional) names; before the renames
//     those paths do not exist yet, so the three trims used to silently
//     do nothing (the files were still named in Simplified Chinese).
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
const listTextFiles = () => walk('.').filter((f) => {
  if (EXCLUDE_FILES.has(f)) return false;
  if (!TEXT_EXT.has(path.extname(f)) && !f.startsWith('.')) return false;
  try {
    return !fs.readFileSync(path.join(root, f)).includes(0);
  } catch { return false; }
});
let FILES = listTextFiles();

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

// Edition edits address files by their converted names, so re-list the
// tree after the renames; the pre-rename paths no longer exist.
FILES = listTextFiles();

// --- Edition edits (file-scoped, applied after conversion) ---
const sub = (f, pairs) => {
  // Fail loudly on a missing target: a silent skip here once let the
  // three 說人話 trims below do nothing for months.
  if (!fs.existsSync(path.join(root, f))) throw new Error(`convert.mjs: edition-edit target missing: ${f}`);
  let t = read(f);
  const orig = t;
  for (const [a, b] of pairs) t = t.split(a).join(b);
  if (t !== orig) write(f, t);
};
// Language tags everywhere.
for (const f of FILES) sub(f, [['zh-CN', 'zh-TW'], ['zh_CN', 'zh_TW'], ['Noto Sans SC', 'Noto Sans TC']]);
// The book's own writing rules name the edition's script.
sub('CLAUDE.md', [['簡體中文，不用繁體', '繁體中文（台灣用詞），不用簡體']]);
// Three 說人話 run 1–3 characters over the book's own 120-character
// limit only because the Taiwan terms are longer （使用者， 程式碼）.
// Trimmed by the smallest possible wording change so the edition's CI
// 說人話檢查 job passes like every other job; meaning is unchanged.
sub('book/11-程式設計師和技術人容易踩的紅線.md', [
  ['公司還可以另外找你索賠', '公司還能另外找你索賠'],
]);
sub('book/14-帳號與資訊安全.md', [
  ['你發出去的內容和收回來的回答', '你發出的內容和收回的回答'],
]);
sub('book/26-做一個網站或平台.md', [
  ['丟失或者可能發生', '丟失或可能發生'],
  ['從輕或者不追究', '從輕或不追究'],
  ['可以視情從輕', '可視情從輕'],
]);
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
// GitHub Pages custom domain for the edition's site. The file is not
// part of upstream, so it is (re)written on every conversion run.
fs.writeFileSync(path.join(root, 'CNAME'), 'how-to-live-better.gh.miniasp.com\n');
// The stats job's updates.mjs --check diffs entry text against git
// history; on this branch that history is the simplified upstream, so
// it can never pass and would push us to restamp every entry's date.
// updates.json stays upstream's (converted) — see check.mjs header.
sub('.github/workflows/book.yml', [[
  '      - run: node tools/sync-stats.mjs --check\n      - run: node tools/updates.mjs --check',
  '      - run: node tools/sync-stats.mjs --check\n      # zh-tw：不跑 updates.mjs --check（比對簡體 git 歷史必然全數不符；updates.json 保留上游逐條日期，僅做轉換）',
]]);
