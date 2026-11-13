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
  '.pytest_cache',
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
/** @type {[RegExp, string][]} */
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
  [/單文件/, '用語：單文件 → 單一檔案（台灣說檔案）'],
];

// 正文、深入文件、README、檢索頁與生活決策 skill 的大陸慣用詞。台灣讀者讀到的是
// 統合分析、世代研究、中風、荷爾蒙、失能／身心障礙；「褪黑激素」「雌激素」
// 是台灣通行的藥名，所以 激素 只在前面不是 黑／雌 時才算。
// 掃描不含：來源欄（文獻題錄照原樣留著才能核對）、維護文件（它們在記錄
// 「舊詞→新詞」）、核實記錄（歷史）。第三欄為 true 的詞，同一行明說「大陸」
// 「上游」「原書」的對照句放行，例如「台灣的藥品標示叫乙醯胺酚，大陸叫對乙酰氨基酚」。
/** @type {[RegExp, string, boolean?][]} */
const BODY_BANNED = [
  [/聯網/, '用語：聯網 → 連網'],
  [/會話/, '用語：會話 → 對話'],
  [/壓縮包/, '用語：壓縮包 → 壓縮檔'],
  [/MIT 許可/, '用語：MIT 許可 → MIT 授權'],
  [/薈萃/, '用語：薈萃分析 → 統合分析'],
  [/佇列/, '用語：佇列（研究）→ 世代研究'],
  [/卒中/, '用語：卒中 → 中風（卒中單元 → 中風單位）'],
  [/隨訪/, '用語：隨訪 → 追蹤'],
  [/殘疾/, '用語：殘疾 → 失能（功能喪失）或身心障礙（身分、證明、補助）'],
  [/(?<![褪黑雌])激素/, '用語：激素 → 荷爾蒙（藥物指類固醇；褪黑激素、雌激素是台灣通行藥名，可留）'],
  [/孕激素/, '用語：孕激素 → 黃體素'],
  [/雄激素/, '用語：雄激素 → 雄性素'],
  [/乙酰/, '用語：乙酰 → 乙醯（對乙酰氨基酚 → 乙醯胺酚）', true],
  [/痴呆/, '用語：痴呆 → 失智症'],
  [/肌酐/, '用語：肌酐 → 肌酸酐'],
  [/血紅蛋白/, '用語：血紅蛋白 → 血紅素'],
  [/轉氨酶/, '用語：轉氨酶 → 轉胺酶'],
  [/甘油三酯/, '用語：甘油三酯 → 三酸甘油酯'],
  [/紅細胞/, '用語：紅細胞 → 紅血球'],
  [/睡眠呼吸暫停/, '用語：睡眠呼吸暫停 → 睡眠呼吸中止症'],
  [/結直腸/, '用語：結直腸 → 大腸直腸'],
  [/醫保/, '用語：醫保 → 健保'],
  [/苯二氮䓬/, '用語：苯二氮䓬 → 苯二氮平'],
  [/臨床優化研究所/,'機關名：NICE 台灣譯作國家健康與臨床卓越研究院'],
  [/[學面]籤|籤[證字名約]|紙上籤/, '錯字：簽（簽證、簽字）被轉成了籤'],
  [/([一-鿿]{2,6})（\1）/, '重複：替換後留下「詞（同一個詞）」，刪掉括號'],
];
const BODY_CONTRAST = /大陸|中國大陸|上游|原書/;
const BODY_SKIP_FILES = new Set(['docs/DECISIONS.md', 'docs/DEVELOPMENT.md', 'docs/UPSTREAM.md']);

function inBodyScope(rel) {
  if (BODY_SKIP_FILES.has(rel)) return false;
  return rel === 'README.md' || rel === 'index.html'
    || rel === 'skills/life-decision-guide/SKILL.md'
    || rel === 'skills/life-decision-guide/README.md'
    || rel === 'tools/skill/build.mjs'
    || rel.startsWith('book/') || (rel.startsWith('docs/') && !rel.slice(5).includes('/'));
}

// 回傳這一行踩到的 BODY_BANNED 說明。來源欄（含接在後面的續行）不查。
// inSource 由呼叫端逐行傳進來，回傳 [problems, 下一行是否仍在來源欄內]。
/** @returns {[string[], boolean]} */
function bodyLineProblems(line, inSource) {
  const isSource = /^- 來源：/.test(line)
    || (inSource && line.trim() !== '' && !/^(?:- |#|<!--)/.test(line));
  if (isSource) return [[], true];
  // 外部連結的題名保留原文；本地連結的顯示文字仍須檢查。
  const text = visibleText(line
    .replace(/\[[^\]]*\]\(https?:\/\/[^)]*\)/g, '')
    .replace(/<a\b[^>]*href=["']https?:\/\/[^"']*["'][^>]*>.*?<\/a>/gi, ''));
  const contrast = BODY_CONTRAST.test(text);
  const hits = BODY_BANNED
    .filter(([re, , contrastOk]) => re.test(text) && !(contrastOk && contrast))
    .map(([, why]) => why);
  return [hits, false];
}

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
  const bodyBad = (line, inSource = false) => bodyLineProblems(line, inSource)[0].length > 0;
  for (const [old, localized] of [['聯網', '連網'], ['會話', '對話'], ['壓縮包', '壓縮檔'], ['MIT 許可', 'MIT 授權']]) {
    assert.equal(bodyBad(old), true, `讀者可見的「${old}」必須被攔`);
    assert.equal(bodyBad(localized), false, `台灣用語「${localized}」不能誤攔`);
    assert.equal(bodyBad(`- 來源：${old}`), false, '引用原文不能誤攔');
    assert.equal(bodyBad(`[${old}](https://example.org/source)`), false, '外部題名不能誤攔');
  }
  for (const rel of ['skills/life-decision-guide/README.md', 'tools/skill/build.mjs']) {
    assert.equal(inBodyScope(rel), true, `${rel} 的安裝說明必須檢查用語`);
  }
  assert.equal(inBodyScope('scripts/zh-tw/convert.mjs'), false, '轉換規則的原文不能誤攔');
  assert.ok(SKIP_DIRS.has('.pytest_cache'), '用語檢查不得讀取測試快取');
  assert.equal(bodyBad('一篇薈萃分析把 13 項研究合在一起算'), true, '薈萃分析必須被攔');
  assert.equal(bodyBad('一篇統合分析把 13 項研究合在一起算'), false, '統合分析是台灣說法，不能誤攔');
  assert.equal(bodyBad('停經前後潮熱去評估激素治療'), true, '激素治療必須被攔');
  assert.equal(bodyBad('停經前後潮熱去評估荷爾蒙治療'), false, '荷爾蒙治療是台灣說法，不能誤攔');
  assert.equal(bodyBad('吃褪黑激素的人入睡時間縮短'), false, '褪黑激素是台灣通行藥名，不能誤攔');
  assert.equal(bodyBad('用雌激素加黃體素的女性'), false, '雌激素是台灣通行藥名，不能誤攔');
  assert.equal(bodyBad('在吃抗凝藥或激素的人'), true, '指類固醇藥的激素必須被攔');
  assert.equal(bodyBad('中風（中風）低約 27%'), true, '替換後的「詞（同詞）」必須被攔');
  assert.equal(bodyBad('做法是用苯二氮䓬類藥物'), true, '苯二氮䓬必須被攔');
  assert.equal(bodyBad('做法是用苯二氮平類藥物'), false, '苯二氮平是台灣說法，不能誤攔');
  assert.equal(bodyBad('中風（腦血管疾病）低約 27%'), false, '括號裡是不同的詞，不能誤攔');
  assert.equal(bodyBad('缺血性卒中是血管堵塞導致的中風'), true, '卒中必須被攔');
  assert.equal(bodyBad('中位隨訪 15 年'), true, '隨訪必須被攔');
  assert.equal(bodyBad('大型佇列研究'), true, '佇列必須被攔');
  assert.equal(bodyBad('要不要辦殘疾人證'), true, '殘疾人證必須被攔');
  assert.equal(bodyBad('學籤被批以後再申請'), true, '簽被轉成籤的錯字必須被攔');
  assert.equal(bodyBad('社宅要抽籤，標籤不是錯字'), false, '抽籤、標籤是正確用字，不能誤攔');
  assert.equal(bodyBad('- 來源：中國女性乳腺癌篩查指南，薈萃分析，隨訪 5 年'), false, '來源欄的題錄照原樣留著');
  assert.equal(bodyBad('Tokyo guideline continued line 薈萃', true), false, '來源欄的續行也不查');
  assert.equal(bodyBad('[薈萃分析原文](https://example.org/paper)'), false, '外部連結題名保留原文');
  assert.equal(bodyBad('<a href="https://example.org/paper">薈萃分析原文</a>'), false, 'HTML 外部連結題名保留原文');
  assert.equal(bodyBad('[殘疾之後怎麼活](book/33-殘疾之後怎麼活.md)'), true, '本地連結顯示的舊詞必須被攔');
  assert.equal(bodyBad('[失能之後怎麼活](book/33-殘疾之後怎麼活.md)'), false, '本地連結路徑保留原名');
  assert.equal(bodyBad('台灣的藥品標示叫乙醯胺酚，大陸叫對乙酰氨基酚'), false, '明說「大陸叫」的對照句放行');
  assert.equal(bodyBad('對乙酰氨基酚一天最多吃多少'), true, '沒有對照語境的對乙酰氨基酚必須被攔');
  assert.equal(inBodyScope('book/01-不要早死.md'), true);
  for (const rel of ['README.md', 'index.html', 'skills/life-decision-guide/SKILL.md']) {
    assert.equal(inBodyScope(rel), true, `${rel} 必須攔下讀者會看到的舊詞`);
  }
  assert.equal(inBodyScope('docs/生物鐘和夜班.md'), true);
  assert.equal(inBodyScope('docs/核實記錄/01-不要早死.md'), false, '核實記錄是歷史，不掃');
  assert.equal(inBodyScope('docs/DECISIONS.md'), false, '維護文件在記錄舊詞→新詞，不掃');
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
    if (!/\.(md|html)$/.test(name) && rel !== 'tools/skill/build.mjs') continue;
    // 掃讀者建議與 skill 封裝說明；其餘工具腳本和廣告圖不掃。
    const inScope = rel === 'README.md'
      || rel === 'index.html'
      || rel.startsWith('book/')
      || rel.startsWith('docs/')
      || rel.startsWith('skills/')
      || rel.startsWith('.claude/skills/')
      || rel === 'tools/skill/build.mjs';
    if (!inScope) continue;
    out.push(rel);
  }
  return out;
}

function checkFile(rel) {
  const problems = [];
  const text = readFileSync(resolve(ROOT, rel), 'utf8');
  const body = inBodyScope(rel);
  let inSource = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (!lineOk(line)) problems.push(`${rel}:${i + 1} ${line.trim().slice(0, 120)}`);
    for (const [re, why] of BANNED) {
      if (re.test(visibleText(line))) problems.push(`${rel}:${i + 1} ${why}`);
    }
    if (body) {
      const [hits, next] = bodyLineProblems(line, inSource);
      inSource = next;
      for (const why of hits) problems.push(`${rel}:${i + 1} ${why}`);
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
