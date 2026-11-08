// 台灣讀者會看到的急難電話和 README 地域說明。
// 核實記錄、維護筆記、轉換腳本裡的舊電話是歷史，不在這道檢查裡。
//
//   node tools/check-zh-tw-locale.mjs
//
// 零依賴，不寫文件，不連網。有問題則退出碼 1。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 這些目錄記的是上游寫法和核實過程，裡面出現 120、12356 不算現在的台灣建議。
const SKIP_DIRS = new Set([
  'docs/核實記錄',
  'scripts',
  'node_modules',
  '.git',
]);
const SKIP_FILES = new Set([
  'CLAUDE.md',
  'docs/引用對照.md',
  'docs/台灣在地化待核.md',
  'tools/check-plain.mjs',
  'tools/check-zh-tw-locale.mjs',
]);

const BAD = [
  /(?:打|叫|撥打|撥)\s*120(?!\d)/,
  /120\s*[/／]\s*119/,
  /12356/,
];

// 這些是會被讀成台灣現行做法的舊句子。待核清單本身不掃。
// 數字同時匹配中文與阿拉伯寫法，中間可有空白（「6 個月」）。
const BANNED = [
  [/(?:六|6)\s*個月內審完/, '仍把一審寫成六個月內審完'],
  [/審理期間為(?:六|6)\s*個月/, '仍把審理期間寫成六個月'],
  [/12308/, '仍把 12308 當成求助電話'],
  [/門診慢特病跨省/, '仍把門診慢特病跨省結算寫成台灣制度'],
  [/跨省異地就醫/, '仍把跨省異地就醫寫成做法'],
  [/領事交易局/, '機關名仍是領事交易局'],
  [/到工信部的系統裡登記一道手續/, '仍把 ICP 寫成要去工信部登記'],
  [/職工醫保斷交/, '仍用職工醫保斷繳等待期'],
  [/公積金中心要在 3 天內/, '仍寫公積金三天提房租'],
];

const EXEMPT = /不要(?:把|說|用|打|叫|撥)|別(?:打|叫|撥)|勿(?:打|叫|撥)|中國大陸|上游|原書|舊寫法|舊的求助|還沒改完|不能直接當成|不是台灣/;

function clauseOk(clause) {
  // 逐一找出錯誤號碼的位置。豁免理由必須是對著這個號碼說的：
  // 理由要在同一個分句裡，或在緊接著的說明分句（「…，那是還沒改完
  // 的上游寫法」）。「不要打 1925，先打 120」裡的否定對的是 1925，
  // 不能因此放行後半句的 120。
  const hits = [];
  for (const re of BAD) {
    for (const m of clause.matchAll(new RegExp(re.source, 'g'))) hits.push(m.index);
  }
  if (!hits.length) return true;
  const segs = clause.split(/，|：/);
  const starts = [];
  let pos = 0;
  for (const s of segs) { starts.push(pos); pos += s.length + 1; }
  return hits.every(idx => {
    const si = starts.findLastIndex(st => st <= idx);
    if (EXEMPT.test(segs[si])) return true;
    const next = segs[si + 1];
    return next !== undefined && /^\s*(?:那是|這是|此為|因為)/.test(next) && EXEMPT.test(next);
  });
}

// 掃描對象是 Markdown／HTML 原文，讀者看到的是去掉行內標記後的
// 文字。先換成可見文字，「先打 **120**」這類寫法才攔得下來。
function visibleText(s) {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function lineOk(line) {
  return visibleText(line).split(/[。；]/).every(clauseOk);
}

function selfTest() {
  const samples = [
    ['先打 12356', false],
    ['先說打 120 / 119', false],
    ['不要等，直接打 120', false],
    ['不要把 120 或 12356 當成台灣的電話', true],
    ['每分鐘 100 到 120 下用力往下壓', true],
    ['年齡填 0 到 120 的整數', true],
    ['叫人打 120、12356，那是還沒改完的上游寫法', true],
    ['120 是中國大陸的急救號', true],
    ['先打 **120**', false],
    ['不要打 1925，先打 120', false],
    ['不要打 1925，先打 **120**', false],
  ];
  for (const [text, ok] of samples) {
    assert.equal(lineOk(text), ok, `分類不對：${text}`);
  }
  assert.ok(SKIP_DIRS.has('docs/核實記錄'), '核實記錄必須排除');
  assert.ok(SKIP_FILES.has('docs/台灣在地化待核.md'), '待核清單必須排除');
  assert.equal(BANNED.some(([re]) => re.test('一審普通程序按規定六個月內審完')), true);
  assert.equal(BANNED.some(([re]) => re.test('一審普通程序按規定 6 個月內審完')), true);
  assert.equal(BANNED.some(([re]) => re.test('一審普通程序按規定6個月內審完')), true);
  assert.equal(BANNED.some(([re]) => re.test('台灣民事訴訟法沒有一審六個月、簡易程序三個月的法定審限')), false);
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const rel = relative(ROOT, abs).split('\\').join('/');
    if (SKIP_DIRS.has(rel) || SKIP_FILES.has(rel)) continue;
    const st = statSync(abs);
    if (st.isDirectory()) {
      if ([...SKIP_DIRS].some(skip => rel === skip || rel.startsWith(skip + '/'))) continue;
      walk(abs, out);
      continue;
    }
    if (!/\.(md|html)$/.test(name)) continue;
    // 只掃讀者會當建議看的位置，不掃工具腳本和廣告圖。
    const inScope = rel === 'README.md'
      || rel === 'index.html'
      || rel.startsWith('book/')
      || rel.startsWith('docs/')
      || rel.startsWith('skills/')
      || rel.startsWith('.claude/skills/');
    if (!inScope) continue;
    out.push(rel);
  }
  return out;
}

function checkFile(rel) {
  const problems = [];
  const text = readFileSync(resolve(ROOT, rel), 'utf8');
  text.split(/\r?\n/).forEach((line, i) => {
    if (!lineOk(line)) problems.push(`${rel}:${i + 1} ${line.trim().slice(0, 120)}`);
    for (const [re, why] of BANNED) {
      if (re.test(visibleText(line))) problems.push(`${rel}:${i + 1} ${why}`);
    }
  });
  return problems;
}

function checkReadme(text) {
  const problems = [];
  if (text.includes('按中國大陸的現行規定寫')) {
    problems.push('README.md 仍把全書制度寫成按中國大陸現行規定');
  }
  for (const phrase of ['這一版以台灣讀者為主', '尚未逐條核完', '打 119', '打 110', '1925', 'eternity4719', 'CC BY 4.0', 'MIT', '辦案期限實施要點', '0800-085-095', '台灣沒有這套制度']) {
    if (!text.includes(phrase)) problems.push(`README.md 缺少「${phrase}」`);
  }
  if (!text.includes('LICENSE-CODE') && !text.includes('Copyright (c) 2026 eternity4719')) {
    problems.push('README.md 沒有保留程式碼的 MIT 著作權標示');
  }
  return problems;
}

function checkSkill(text) {
  const problems = [];
  for (const phrase of ['119', '110', '1925', '不要只給 1925', 'nfa.gov.tw', 'npa.gov.tw', 'mohw.gov.tw', '2026-11-07', '內部列管', '第三審律師酬金']) {
    if (!text.includes(phrase)) problems.push(`skills/life-decision-guide/SKILL.md 缺少「${phrase}」`);
  }
  if (/(?:六|6)\s*個月內審完/.test(text)) problems.push('SKILL.md 仍把六個月內審完寫成可以照辦的規則');
  return problems;
}

selfTest();

const files = walk(ROOT, []);
const problems = [];
for (const rel of files) problems.push(...checkFile(rel));
problems.push(...checkReadme(readFileSync(resolve(ROOT, 'README.md'), 'utf8')));
problems.push(...checkSkill(readFileSync(resolve(ROOT, 'skills/life-decision-guide/SKILL.md'), 'utf8')));

if (problems.length) {
  console.error(`台灣在地用語檢查未過（${problems.length} 處）：`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`台灣在地用語檢查通過：掃了 ${files.length} 個讀者會看到的檔案。核實記錄、CLAUDE.md 和轉換腳本未納入。`);
