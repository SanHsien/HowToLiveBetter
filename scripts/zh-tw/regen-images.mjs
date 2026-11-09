// Regenerate the images whose pixels contain Chinese text, from the
// converted sources, so the zh-tw branch ships Traditional glyphs:
//
//   og.png               <- tools/og.html            (1200x630)
//   (The upstream ad banners and WeChat reward code, ads/ and tools/ad-mcyyy*,
//   were deleted from the SanHsien fork on 2026-11-10; only og.png remains.)
//
//   CHROME=<chromium binary> node scripts/zh-tw/regen-images.mjs
//
// Screenshots go through a minimal CDP client: the Lambda-built
// Chromium used in this environment hangs in --screenshot CLI mode but
// works over DevTools protocol (same approach as the answer-me repo's
// regen script). The final copy step uses python3.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHROME_CANDIDATES = [
  process.env.CHROME, process.env.AM_CHROME,
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
const chrome = CHROME_CANDIDATES.find((p) => p && existsSync(p));
if (!chrome) throw new Error('regen-images: no Chrome/Chromium found; set CHROME=<binary>');

const TMP = mkdtempSync(join(tmpdir(), 'zhtw-img-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(chrome, [
  '--remote-debugging-port=0', `--user-data-dir=${join(TMP, 'profile')}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res, rej) => {
  let b = '';
  proc.stderr.on('data', (d) => {
    b += d;
    const m = b.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) res(m[1]);
  });
  setTimeout(() => rej(new Error('regen-images: no DevTools URL from Chromium')), 30000);
});
const port = new URL(wsUrl).port;

async function shot(htmlRel, outName, { width, height, scale = 1 }) {
  const file = join(ROOT, htmlRel);
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(pathToFileURL(file).href)}`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method) events.push(m.method);
  });
  const send = (method, params = {}) => new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(file).href });
  for (let i = 0; i < 100 && !events.includes('Page.loadEventFired'); i++) await sleep(100);
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => 1)', awaitPromise: true });
  await sleep(600);
  const s = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: false,
    // clip scale stays 1: the deviceScaleFactor above already makes the
    // capture come back at width*scale physical pixels.
    clip: { x: 0, y: 0, width, height, scale: 1 },
  });
  if (!s.result?.data) throw new Error(`regen-images: screenshot failed for ${htmlRel}`);
  writeFileSync(join(TMP, outName), Buffer.from(s.result.data, 'base64'));
  ws.close();
}

try {
  await shot('tools/og.html', 'og.png', { width: 1200, height: 630 });
} finally {
  proc.kill();
}

const py = `
import shutil, sys

root, tmp = sys.argv[1], sys.argv[2]

# og.png: straight copy of the screenshot.
shutil.copy(f'{tmp}/og.png', f'{root}/og.png')

print('images regenerated')
`;
const pyFile = join(TMP, 'finish.py');
writeFileSync(pyFile, py);
const r = spawnSync('python3', [pyFile, ROOT, TMP], { encoding: 'utf8' });
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) throw new Error('regen-images: python finishing step failed');

const ogSize = statSync(join(ROOT, 'og.png')).size;
if (ogSize < 120 * 1024 || ogSize > 400 * 1024) {
  throw new Error(`regen-images: og.png size ${ogSize} outside upstream's 120-400KB sanity range`);
}
console.log(`og.png ${ogSize} bytes regenerated.`);
