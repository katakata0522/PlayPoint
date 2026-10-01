'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'articles/ogp/2026-10-01-black-diamond-diamond-vip.png');
const chromePath = process.env.CHROME_PATH;
if (!chromePath) throw new Error('CHROME_PATH is required');

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;font-family:"Noto Sans CJK JP","Noto Sans JP",sans-serif;background:#090b12;color:#fff}
body{position:relative;overflow:hidden}
.bg{position:absolute;inset:0;background:
radial-gradient(circle at 86% 18%,rgba(79,70,229,.32),transparent 31%),
radial-gradient(circle at 9% 91%,rgba(30,64,175,.23),transparent 32%),
linear-gradient(135deg,#080a11 0%,#111526 60%,#090b12 100%)}
.grid{position:absolute;inset:0;opacity:.12;background-image:linear-gradient(rgba(255,255,255,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.13) 1px,transparent 1px);background-size:48px 48px}
.wrap{position:relative;height:100%;padding:62px 72px;display:flex;flex-direction:column}
.kicker{display:flex;align-items:center;gap:14px;font-size:21px;font-weight:700;letter-spacing:.04em;color:#d7dcff}
.dot{width:11px;height:11px;border-radius:50%;background:#818cf8;box-shadow:0 0 24px rgba(129,140,248,.8)}
.main{margin-top:44px;display:grid;grid-template-columns:1fr 330px;gap:48px;align-items:center}
h1{font-size:66px;line-height:1.08;letter-spacing:-.035em;margin:0;font-weight:900}
h1 .muted{display:block;color:#a5b4fc;font-size:50px;margin-top:13px}
.sub{font-size:26px;line-height:1.55;margin-top:30px;color:#d5d9e6;font-weight:600;max-width:735px}
.panel{border:1px solid rgba(255,255,255,.16);border-radius:26px;background:rgba(12,15,26,.72);padding:25px 24px;box-shadow:0 20px 60px rgba(0,0,0,.32)}
.row{padding:14px 0;border-bottom:1px solid rgba(255,255,255,.11)}
.row:last-child{border-bottom:0}
.label{font-size:15px;color:#9ba3b7;font-weight:700;letter-spacing:.08em}
.value{font-size:22px;font-weight:800;margin-top:5px}
.value.fact{color:#fff}.value.observe{color:#c7d2fe}.value.analysis{color:#a5b4fc}
.footer{margin-top:auto;display:flex;align-items:end;justify-content:space-between;color:#9fa6b8}
.brand{font-size:22px;font-weight:800;color:#fff}.brand span{color:#a5b4fc}
.date{font-size:18px;font-weight:600}
</style></head><body><div class="bg"></div><div class="grid"></div>
<div class="wrap">
  <div class="kicker"><span class="dot"></span>Google Play Points｜未発表ステータスを検証</div>
  <div class="main">
    <div>
      <h1>Black Diamond?<span class="muted">Diamond VIPの痕跡を検証</span></h1>
      <div class="sub">公式情報・TGS2026現地確認・APK解析を混ぜずに整理</div>
    </div>
    <div class="panel">
      <div class="row"><div class="label">OFFICIAL</div><div class="value fact">公開は5ランク</div></div>
      <div class="row"><div class="label">TGS 2026</div><div class="value observe">招待制VIPを確認</div></div>
      <div class="row"><div class="label">APP TEARDOWN</div><div class="value analysis">Black Diamond</div></div>
    </div>
  </div>
  <div class="footer"><div class="brand">Play<span>Point</span></div><div class="date">2026.10.01</div></div>
</div></body></html>`;

(async () => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: output, type: 'jpeg', quality: 92 });
  await browser.close();
  const stat = fs.statSync(output);
  console.log(`Generated dedicated OGP: ${output} (${stat.size} bytes)`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
