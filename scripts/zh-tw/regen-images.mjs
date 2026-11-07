// Regenerate the images whose pixels contain Chinese text, from the
// converted sources, so the zh-tw branch ships Traditional glyphs:
//
//   og.png               <- tools/og.html            (1200x630)
//   ads/mcyyy.webp       <- tools/ad-mcyyy.html      (1200x400)
//   ads/mcyyy-side.webp  <- tools/ad-mcyyy-side.html (624x312 at 2x = 1248x624)
//   ads/wechat-reward.png: the QR code itself is the upstream author's
//   WeChat reward code and is left untouched; only the gold banner's
//   caption "Albert 的赞赏码" is repainted as "Albert 的贊賞碼" (white
//   bold text on the flat gold band), located by pixel scan each run so
//   upstream layout changes are absorbed.
//
//   CHROME=<chromium binary> node scripts/zh-tw/regen-images.mjs
//
// Screenshots go through a minimal CDP client: the Lambda-built
// Chromium used in this environment hangs in --screenshot CLI mode but
// works over DevTools protocol (same approach as the answer-me repo's
// regen script). WebP conversion and the banner repaint use python3 +
// PIL, matching the environment this repo's sync runs in.

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
  await shot('tools/ad-mcyyy.html', 'ad.png', { width: 1200, height: 400 });
  await shot('tools/ad-mcyyy-side.html', 'ad-side.png', { width: 624, height: 312, scale: 2 });
} finally {
  proc.kill();
}

const py = `
from PIL import Image, ImageDraw, ImageFont
import shutil, sys

root, tmp = sys.argv[1], sys.argv[2]

# og.png: straight copy of the screenshot.
shutil.copy(f'{tmp}/og.png', f'{root}/og.png')

# Ads: PNG screenshot -> WebP, the format the site ships.
for src, dst in [('ad.png', 'ads/mcyyy.webp'), ('ad-side.png', 'ads/mcyyy-side.webp')]:
    im = Image.open(f'{tmp}/{src}').convert('RGB')
    im.save(f'{root}/{dst}', 'WEBP', quality=92, method=6)

# WeChat reward banner: repaint only the caption text on the gold band.
path = f'{root}/ads/wechat-reward.png'
im = Image.open(path).convert('RGB')
W, H = im.size
# The band is flat gold (sampled each run); the caption is white bold
# text in the band's lower part. Find its bounding box.
gold = im.getpixel((W // 2, H - 8))
xs, ys = [], []
# Start below the arc's lowest dip (about 0.855H at the centre): higher
# up, the white background above the curved band would pollute the box.
for y in range(int(H * 0.865), H):
    for x in range(int(W * 0.15), int(W * 0.85)):
        r, g, b = im.getpixel((x, y))
        if r > 240 and g > 240 and b > 240:
            xs.append(x); ys.append(y)
assert xs, 'banner caption pixels not found'
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
assert (y1 - y0) < H * 0.12 and (x1 - x0) < W * 0.7, f'caption box implausible: {(x0, x1, y0, y1)}'
d = ImageDraw.Draw(im)
# Erase the caption column by column: for each column in the caption's
# span, copy pixels from a clean margin column at the same height. This
# removes antialiasing fringe too and preserves the band's curved top
# edge exactly (a plain rectangle would cut a straight line across the
# arc).
def is_gold(px):
    return all(abs(px[i] - gold[i]) < 24 for i in range(3))
safe_x = 10
for x in range(max(0, x0 - 10), min(W, x1 + 11)):
    top = next((y for y in range(int(H * 0.78), H) if is_gold(im.getpixel((x, y)))), int(H * 0.84))
    for y in range(top, H):
        im.putpixel((x, y), im.getpixel((safe_x, y)))
text = 'Albert 的贊賞碼'
font_path = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
target_w = x1 - x0
size = 10
while True:
    f = ImageFont.truetype(font_path, size + 2)
    box = d.textbbox((0, 0), text, font=f)
    if box[2] - box[0] > target_w:
        break
    size += 2
f = ImageFont.truetype(font_path, size)
box = d.textbbox((0, 0), text, font=f)
tw, th = box[2] - box[0], box[3] - box[1]
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
d.text((cx - tw / 2 - box[0], cy - th / 2 - box[1]), text, font=f, fill=(255, 255, 255))
im.save(path)
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
console.log(`og.png ${ogSize} bytes; ads and wechat-reward.png regenerated.`);
