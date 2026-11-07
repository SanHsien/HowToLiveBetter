// 把 index.html + README + book/*.md 打成一個自包含的 HTML：雙擊就能看，不用伺服器、不用聯網。
// 用法：node tools/offline/build.mjs [輸出路徑]   預設輸出 dist/HowToLiveBetter.html
// 正文內聯進 window.__CORPUS__，index.html 的 init() 認這個變數就不再發請求；
// 站內相對連結改成線上地址，側欄圖片轉成 data URI，其餘一個字不動。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ROOT, REPO, SITE, read, gitCommit, buildStamp } from '../lib/book.mjs';

const OUT = resolve(ROOT, process.argv[2] ?? 'dist/HowToLiveBetter.html');
const STAMP = buildStamp();
const COMMIT = gitCommit();

// ---------- 正文 ----------
const readme = read('README.md');
const files = [...new Set([...readme.matchAll(/\]\((book\/[^)]+\.md)\)/g)].map(m => m[1]))].sort();
if (!files.length) throw new Error('README 目錄裡沒找到 book/ 文件，離線版會是空的');
// 長文（docs/*.md）也要帶上：檢索頁的長文彈窗就地渲染它們，離線副本裡沒有就只剩
// 一個點不開的 GitHub 連結。清單從 README 裡扒，和 EPUB、PDF 兩套建構用的是同一處。
const docs = [...new Set([...readme.matchAll(/\]\((docs\/[^)#/]+\.md)\)/g)].map(m => m[1]))].sort();
const corpus = {
  readme,
  parts: Object.fromEntries(files.map(f => [f, read(f)])),
  docs: Object.fromEntries(docs.map(f => [f, read(f)])),
  // 最近更新的標記，tools/updates.mjs 生成、入庫
  updates: JSON.parse(read('updates.json')),
};
// </script 會提前關掉指令碼標籤；\/ 在 JS 字串裡就是 /，內容不變
const corpusJson = JSON.stringify(corpus).replace(/<\/script/gi, '<\\/script');

// ---------- 頁面 ----------
let html = read('index.html');
const must = (needle, label) => {
  if (!html.includes(needle)) throw new Error(`index.html 裡找不到${label}，離線版指令碼要跟著改：${needle}`);
};

// 統計指令碼不能跟著離線版走：別人雙擊打開的副本不該往外發請求，斷網時還要等超時
const GA_START = '<!-- ga:start', GA_END = '<!-- ga:end -->';
must(GA_START, ' GA 片段的起始標記');
must(GA_END, ' GA 片段的結束標記');
html = html.slice(0, html.indexOf(GA_START)) + html.slice(html.indexOf(GA_END) + GA_END.length);
// 只查外連域名：主指令碼裡的 track() 帶 typeof 守衛，沒有 gtag 也能跑，不算殘留
if (/googletagmanager|google-analytics/.test(html)) throw new Error('剝掉標記之間的內容後仍有統計域名殘留，離線版會往外發請求');

// 相對連結在本地打開時是死的，改成線上地址
must('href="README.md"', ' README.md 連結');
must('href="book/"', ' book/ 連結');
must('href="selfcheck.html"', ' 自查頁連結');
html = html
  .replaceAll('href="README.md"', `href="${REPO}/blob/main/README.md"`)
  .replaceAll('href="selfcheck.html"', `href="${SITE}selfcheck.html"`)
  .replaceAll('href="book/"', `href="${REPO}/tree/main/book"`)
  .replaceAll('<a class="title" href="./"', `<a class="title" href="${SITE}"`);

// 繁體中文版已移除側欄廣告與讚賞碼，index.html 不再引用 ads/ 圖片，離線版無圖可內嵌。

// 頁尾註明這是哪一版的離線副本
const foot = '<div class="foot">';
must(foot, '頁尾');
const commitNote = COMMIT ? `，正文提交 ${COMMIT.slice(0, 7)}` : '';
html = html.replace(foot, `${foot}離線副本，生成於 ${STAMP}（北京時間）${commitNote}；正文會繼續更新，以 <a href="${SITE}">線上版</a> 為準。<br>`);

// 正文要在主指令碼之前就位
const mainScript = '\n<script>\n/* ---------- 除錯面板';
must(mainScript, '主指令碼的開頭');
html = html.replace(mainScript, `\n<script>window.__CORPUS__=${corpusJson}</script>${mainScript}`);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
const kb = n => (n / 1024 | 0) + ' KB';
console.log(`已生成 ${OUT}：${files.length} 個正文文件，長文 ${docs.length} 篇，${kb(Buffer.byteLength(html))}（其中正文 ${kb(Buffer.byteLength(corpusJson))}）`);
