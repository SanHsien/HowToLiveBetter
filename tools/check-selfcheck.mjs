// 用真實題目和正文檢查年齡門檻、舊答案遷移及結果裡的適用條件。
// node tools/check-selfcheck.mjs（零依賴，不寫文件）
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const html = read('selfcheck.html');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert.ok(script, '找不到自查頁指令碼');
const parts = Object.fromEntries(readdirSync(new URL('book/', root))
  .filter(f => f.endsWith('.md')).map(f => [`book/${f}`, read(`book/${f}`)]));
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {
    innerHTML:'', textContent:'', value:'', hidden:false, removed:false,
    listeners:new Map(),
    addEventListener(type, fn) { this.listeners.set(type, fn); },
    remove() { this.removed = true; },
  });
  return elements.get(id);
};
const warnings = [];
const oldAnswers = {'p:age':'30', 'p:sex':'f', 'p:kid':'n', '2:低鈉鹽':'n', '1:B 型肝炎兩對半':'y',
  '1:結直腸癌篩檢':'y', '34:對乙酰氨基酚':'n',
  '1:燃氣軟管':'y', '8:不把銀行卡':'n', '8:徵信報告':'y',
  // 題面實質改寫的三題：舊 key 的答案不得沿用到新題
  '13:火災時':'y', '5:個稅彙算':'y', '5:家庭共濟':'y',
  // 新 key 已有答案時，舊 key 不得蓋掉它
  '8:聯徵信用報告':'n'};
const context = vm.createContext({
  window:{__CORPUS__:{readme:read('README.md'), parts}},
  document:{getElementById:element},
  localStorage:{getItem:() => JSON.stringify(oldAnswers), setItem:() => {}},
  location:{protocol:'http:'}, scrollTo:() => {},
  console:{error:message => warnings.push(message)},
});
vm.runInContext(script, context);
await new Promise(resolve => setImmediate(resolve));
assert.equal(element('status').removed, true, element('status').textContent);
assert.deepEqual(warnings, [], '每道題都應能找到正文條目');
const run = code => vm.runInContext(code, context);

assert.equal(run('profileDone()'), false, '舊版30—44歲不能當成實際30歲');
assert.equal(run("ans['2:低鈉鹽']"), 'n', '更換年齡欄位應保留其他答案');
assert.equal(run("ans['1:大腸直腸癌篩檢']"), 'y', '題目 key 改用台灣說法後，舊 key 的答案要搬過去');
assert.equal(run("ans['34:乙醯胺酚']"), 'n', '題目 key 改用台灣說法後，舊 key 的答案要搬過去');
assert.equal(run("ans['1:結直腸癌篩檢'] === undefined && ans['34:對乙酰氨基酚'] === undefined"), true,
  '搬過去之後不留舊 key');
assert.equal(run("ans['1:瓦斯軟管']"), 'y', '同義改名（燃氣→瓦斯）沿用舊答案');
assert.equal(run("ans['8:不把銀行帳戶']"), 'n', '同義改名（銀行卡→銀行帳戶）沿用舊答案');
assert.equal(run("ans['8:聯徵信用報告']"), 'n', '新 key 已有答案時保留新答案，不被舊 key 蓋掉');
assert.equal(run("['1:燃氣軟管', '8:不把銀行卡', '8:徵信報告', '8:聯徵信用報告'].filter(k => k in ans).length"), 1,
  '舊 key 搬完即刪（只剩已有答案的新 key）');
assert.equal(run("['13:濃煙關門', '5:綜合所得稅結算申報', '5:眷屬依附加保'].some(k => ans[k] !== undefined)"), false,
  '題面實質改寫的題不能沿用舊 key 的答案');
assert.equal(run("Object.values(RENAMED_KEYS).every(k => GROUPS.flatMap(g => g.qs).some(q => qid(q) === k))"), true,
  '每個改名目標都要對得到一道真實存在的題');
// 曾被舊版遷移並存回的新 key，也不能當成改題後的答案。
for (const key of ['濃煙關門', '綜合所得稅結算申報', '眷屬依附加保']) {
  const question = run(`GROUPS.flatMap(g => g.qs).find(q => q.key === ${JSON.stringify(key)})`);
  run(`ans[${JSON.stringify(`${question.sec}:${key}`)}] = 'y'`);
  assert.equal(question.rev, 2, `${key}必須升版，擋住已遷移並存回的舊答案`);
  assert.equal(run(`ans[qid(GROUPS.flatMap(g => g.qs).find(q => q.key === ${JSON.stringify(key)}))]`),
    undefined, `${key}改題後必須重新回答`);
  run(`delete ans[${JSON.stringify(`${question.sec}:${key}`)}]`);
}
// 後面的結果頁斷言要從只有原本那幾題答案的狀態開始
run("for (const k of ['1:瓦斯軟管', '8:不把銀行帳戶', '8:聯徵信用報告']) delete ans[k]");
assert.equal(run("ans[qid(GROUPS.flatMap(g => g.qs).find(q => q.key === 'B 型肝炎兩對半'))]"), undefined,
  '語義改變後的 B 型肝炎題不能沿用舊的已做到答案');
for (const age of ['', 'abc', '-1', '121', '39.5']) {
  run(`ans['p:ageYears'] = ${JSON.stringify(age)}`);
  assert.equal(run('profileDone()'), false, `拒絕無效年齡：${age}`);
}
/** @type {Array<[string, number]>} */
const expected = [
  ['空腹血糖',35], ['乳腺癌篩檢',40], ['大腸直腸癌篩檢',45],
  ['帶狀皰疹疫苗',50], ['流感疫苗',60], ['肺炎球菌疫苗',65], ['骨密度',65],
];
for (const [key, min] of expected) {
  for (const age of [min - 1, min]) {
    run(`ans['p:ageYears'] = '${age}'`);
    assert.equal(run('profileDone()'), true);
    assert.equal(run(`activeQs().some(q => q.key === ${JSON.stringify(key)})`), age >= min,
      `${key}在${age}歲的顯示狀態`);
  }
}
run("ans['p:ageYears'] = '65'; ans['p:sex'] = 'm'");
assert.equal(run("activeQs().some(q => q.key === '乳腺癌篩檢' || q.key === '骨密度')"), false);

// 低鈉鹽未做到時，結果卡片和複製出去的清單都必須保留腎功能/用藥提醒。
run('renderOut()');
for (const output of [element('todo').innerHTML, element('copy-text').value]) {
  assert.match(output, /腎功能不全/);
  assert.match(output, /保鉀類藥物/);
}
const noteOrder = element('todo').innerHTML;
assert.ok(noteOrder.indexOf('class="caution"') < noteOrder.indexOf('class="human"'),
  '適用條件應先於收益摘要顯示');
run("ENTRIES[0].note = '<img src=x onerror=alert(1)>'");
const escaped = run('card(ENTRIES[0], [])');
assert.ok(escaped.includes('&lt;img'));
assert.ok(!escaped.includes('<img'), '備註必須按文本轉義');

// 實際觸發頁面的年齡輸入處理器，確認保存與重新出題銜接。
run('renderAsk()');
const profileHtml = element('profile-qs').innerHTML;
element('qs').listeners.get('input')({target:{
  matches:selector => selector === 'input[data-k="p:ageYears"]', value:'40',
}});
assert.equal(run("ans['p:ageYears']"), '40');
assert.equal(element('profile-qs').innerHTML, profileHtml, '輸入時不重建基本情況控制項');
console.log('自查檢查通過：題目引用、7項年齡邊界、舊答案遷移、輸入校驗、備註展示與複製');
