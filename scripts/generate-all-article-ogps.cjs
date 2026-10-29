'use strict';

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const { VISUAL_CARDS } = require('./ogp-visual-templates.cjs');

const root = path.resolve(__dirname, '..');
const articlesDir = path.join(root, 'articles');
const ogpDir = path.join(articlesDir, 'ogp');

// Mapping for the 22 articles that had shared images or ogp.png
const DISTINCT_MAPPING = {
  '2026-09-26-bluearchive-monthly-packs-guide.html': {
    image: '2026-09-26-bluearchive-monthly-packs-guide-20261030-v2.png',
    title: 'ブルアカのマンスリー<br>通常版とハーフを比較',
    template: 'bluearchive-monthly-compare',
    category: 'ブルアカの購入ガイド',
    subtitle: 'マンスリーとハーフ、どちらから選ぶ？',
    points: ['学園交流会のAP軽減', '受取日と購入先の違い', '価格は購入画面で確認'],
    accentColor: '#38bdf8'
  },
  '2026-08-16-gold-platinum-worth-it.html': {
    image: 'gold-platinum-worth-it-20261030.png',
    template: 'gold-platinum-compare',
    category: 'ランク解説',
    subtitle: '目指せるならプラチナ、その理由は？',
    points: ['特典の違い', '年間進捗から必要額を確認', '無理のない範囲で判断'],
    accentColor: '#10b981'
  },
  '2026-08-16-play-points-day.html': {
    image: 'play-points-day-20261030.png',
    template: 'points-day',
    category: '貯める・キャンペーン',
    subtitle: '過去の開催例と、今の条件の確認方法',
    points: ['過去に最大7倍の案内', '倍率は対象者ごとに確認', '開催・期限は都度確認'],
    accentColor: '#10b981'
  },
  // Previously ogp.png (4)
  '2026-08-17-diamond-valley-festival-guide.html': {
    image: '2026-08-17-diamond-valley-festival-guide.png',
    template: 'diamond-valley',
    category: '限定イベント攻略',
    subtitle: '歴代実績・2026年の注目ポイント完全攻略',
    points: ['Diamond Valley', '特別ポイント獲得', '2026年最新'],
    accentColor: '#818cf8'
  },
  '2026-09-19-monst-in-app-packs-guide.html': {
    image: '2026-09-19-monst-in-app-packs-guide.png',
    template: 'monst-packs',
    category: 'モンスト課金攻略',
    subtitle: 'オーブ単価・アイテム価値・Playポイント還元率',
    points: ['パックコスパ検証', 'Playポイント還元', '購入優先度早見表'],
    accentColor: '#f59e0b'
  },
  '2026-09-19-monst-web-shop-vs-google-play.html': {
    image: '2026-09-19-monst-web-shop-vs-google-play-20261030.png',
    template: 'monst-vs',
    category: 'モンスト損得分岐点',
    subtitle: '公式Webショップ vs Google Play どっちが得？',
    points: ['Web通常190・月イチ200', 'アプリ内の現在値は要確認', '条件別の損得を計算'],
    accentColor: '#38bdf8'
  },
  '2026-09-19-play-points-calendar-schedule-guide.html': {
    image: '2026-09-19-play-points-calendar-schedule-guide-20261030.png',
    template: 'calendar',
    category: '年間スケジュール',
    subtitle: '自分に届く特典を、曜日と条件から探す',
    points: ['月初の増量案内を確認', '毎週金曜リワード', '対象・期限を確認'],
    accentColor: '#10b981'
  },

  // Previously campaign.png (4)
  '2026-07-31-google-play-quests.html': {
    image: '2026-07-31-google-play-quests.png',
    template: 'quests',
    category: 'クエスト機能解説',
    subtitle: '購入条件・表示されない・未達成時の確認手順',
    points: ['クエスト参加手順', '達成条件チェック', '未反映トラブル対策'],
    accentColor: '#06b6d4'
  },
  '2026-08-05-play-points-multiplier-stacking.html': {
    image: '2026-08-05-play-points-multiplier-stacking-20261030.png',
    template: 'multiplier-stacking',
    category: '還元率の計算ルール',
    subtitle: '通常率と増量率は足さず、高い方を確認',
    points: ['獲得率は足し算しない', '適用される率を確認', '条件別の計算例'],
    accentColor: '#8b5cf6'
  },
  '2026-08-17-tgs-google-play-vip.html': {
    image: '2026-08-17-tgs-google-play-vip.png',
    template: 'tgs-vip',
    category: 'リアルイベント特報',
    subtitle: '入場条件・限定グッズ・ダイヤモンド会員特典',
    points: ['TGS2026 VIPラウンジ', '限定ノベルティ', 'ダイヤモンド特典'],
    accentColor: '#ec4899'
  },
  '2026-09-19-play-points-promotion-not-showing.html': {
    image: '2026-09-19-play-points-promotion-not-showing.png',
    template: 'promo-missing',
    category: 'トラブル解決',
    subtitle: '「自分だけ出ない」増量キャンペーンの理由',
    points: ['対象者限定配信の仕組み', 'アカウント切り替え', '確認チェックリスト'],
    accentColor: '#f97316'
  },

  // Previously getting-started.png (4)
  '2026-07-24-play-points-1-value.html': {
    image: '2026-07-24-play-points-1-value.png',
    template: '1-value',
    category: 'ポイントの基本価値',
    subtitle: '100円で何pt貯まる？還元率と円換算の基本',
    points: ['1pt ＝ 1円相当', '100円課金で1〜2pt', '賢いポイントの貯め方'],
    accentColor: '#14b8a6'
  },
  '2026-07-24-play-points-100-value.html': {
    image: '2026-07-24-play-points-100-value.png',
    template: '100-value',
    category: 'ポイント換算・早見表',
    subtitle: '貯めるのに必要な課金額・ランク別早見表',
    points: ['100pt ＝ 100円相当', 'ランク別必要課金額', 'キャンペーン短縮ワザ'],
    accentColor: '#0ea5e9'
  },
  '2026-07-24-play-points-cash-conversion.html': {
    image: '2026-07-24-play-points-cash-conversion-20261030.png',
    template: 'cash-conversion',
    category: '交換・換金の注意点',
    subtitle: '換金できない理由と使い道の選び方',
    points: ['現金化・PayPay不可', '交換先と条件を比べる', '使う予定に合わせて選ぶ'],
    accentColor: '#ef4444'
  },
  '2026-08-05-play-points-cannot-join.html': {
    image: '2026-08-05-play-points-cannot-join-20261030.png',
    template: 'cannot-join',
    category: 'トラブル解決',
    subtitle: '参加条件・年齢制限・国設定の確認手順',
    points: ['18歳以上が条件', '日本Google Play設定', '支払い方法を確認'],
    accentColor: '#f59e0b'
  },

  // Previously weekly-reward.png (4)
  '2026-07-24-earn-play-points-free.html': {
    image: '2026-07-24-earn-play-points-free-20261030.png',
    template: 'earn-free',
    category: '無料ポイント獲得',
    subtitle: '週次リワード・アプリ体験・クエスト',
    points: ['対象ランクの週次特典', 'アプリ体験特典', '購入不要のクエスト'],
    accentColor: '#10b981'
  },
  '2026-07-31-super-weekly-reward.html': {
    image: '2026-07-31-super-weekly-reward.png',
    template: 'super-weekly',
    category: '上位ランク限定特典',
    subtitle: 'プラチナ・ダイヤモンド限定！賞品・確率・開催日',
    points: ['最大1,000pt当選', 'Pixel端末プレゼント', '当選確率と開催周期'],
    accentColor: '#a855f7'
  },
  '2026-08-05-fastest-silver.html': {
    image: '2026-08-05-fastest-silver.png',
    template: 'fastest-silver',
    category: 'ランクアップ攻略',
    subtitle: '250ポイント達成でウィークリーリワード解放！',
    points: ['必要課金額の目安', 'キャンペーン活用法', 'ウィークリー特典解放'],
    accentColor: '#94a3b8'
  },
  '2026-09-19-google-play-super-ticket.html': {
    image: '2026-09-19-google-play-super-ticket.png',
    template: 'super-ticket',
    category: '新機能・速報',
    subtitle: 'スーパーチケットの使い方・獲得条件・配布日',
    points: ['Super Ticketとは', '受け取り・利用方法', 'もらえるタイミング'],
    accentColor: '#f59e0b'
  },

  // Previously best-use.png (2)
  '2026-07-25-play-credit-not-working.html': {
    image: '2026-07-25-play-credit-not-working.png',
    template: 'credit-not-working',
    category: 'トラブル解決',
    subtitle: '残高上限・アカウント制限・有効期限の確認順',
    points: ['残高上限エラー対策', '有効期限の注意点', 'アカウント一致の確認'],
    accentColor: '#ef4444'
  },
  '2026-07-25-play-points-coupon-not-applied.html': {
    image: '2026-07-25-play-points-coupon-not-applied.png',
    template: 'coupon-not-applied',
    category: 'トラブル解決',
    subtitle: '保存場所・対象アカウント・購入金額を確認',
    points: ['保存済み特典の確認', '対象アカウントのエラー', '割引なしの購入判断'],
    accentColor: '#f97316'
  },

  // Previously diamond-worth-it.png (2)
  '2026-07-24-play-points-500-1000-value.html': {
    image: '2026-07-24-play-points-500-1000-value.png',
    template: '500-1000-value',
    category: '早見表・換算',
    subtitle: 'ランク別必要額とキャンペーン活用時の早見表',
    points: ['500pt・1,000pt価値', 'ランク別必要課金額', 'キャンペーン活用試算'],
    accentColor: '#0284c7'
  },
  '2026-08-05-play-points-levels-guide.html': {
    image: '2026-08-05-play-points-levels-guide.png',
    template: 'levels-guide',
    category: 'ランク制度完全解説',
    subtitle: 'ブロンズ〜ダイヤモンドの条件・必要額・特典一覧',
    points: ['全5ランク徹底比較', '昇格に必要なポイント', 'ランク特典と維持条件'],
    accentColor: '#6366f1'
  },

  // Previously multiple-accounts.png (2)
  '2026-08-03-play-points-device-change.html': {
    image: '2026-08-03-play-points-device-change.png',
    template: 'device-change',
    category: '機種変更ガイド',
    subtitle: 'Android→Android・iPhone移行時の注意点まとめ',
    points: ['ポイント・ランク維持', 'Googleアカウント移行', '表示されない時の確認'],
    accentColor: '#0d9488'
  },
  '2026-08-05-play-country-change-points.html': {
    image: '2026-08-05-play-country-change-points-20261030.png',
    template: 'country-change',
    category: '国・地域設定',
    subtitle: 'ポイント・残高と、国変更の条件を確認',
    points: ['変更間隔は90日以上', 'ポイント引き継ぎ不可', '追加制限の場合も'],
    accentColor: '#dc2626'
  }
};

// The 6 base articles that keep their image filenames
const BASE_CONFIGS = {
  '2026-10-15-google-play-purchase-history-budget.html': {
    image: '2026-10-15-google-play-purchase-history-budget.png',
    template: 'spending-history',
    category: '課金額と購入履歴',
    subtitle: '今月の支出・購入先ごとの整理・予算通知',
    points: ['今月の金額を見る', '注文を購入先で分ける', '予算は通知機能'],
    accentColor: '#5ee0c4'
  },
  '2025-12-25-campaign.html': {
    image: 'campaign.png',
    template: 'campaign-base',
    category: 'キャンペーン攻略',
    subtitle: '増量倍率の確認と課金タイミングの判断基準',
    points: ['最大7倍キャンペーン', '開催周期と狙い目', '予定課金の判断基準'],
    accentColor: '#f59e0b'
  },
  '2025-12-25-getting-started.html': {
    image: 'getting-started.png',
    template: 'getting-started-base',
    category: '初心者完全ガイド',
    subtitle: '無料登録の手順と参加直後に確認すべきこと',
    points: ['無料登録手順', '100円課金で1pt', 'ランクアップ特典'],
    accentColor: '#10b981'
  },
  '2025-12-25-weekly-reward.html': {
    image: 'weekly-reward.png',
    template: 'weekly-reward-base',
    category: 'ウィークリー特典',
    subtitle: '毎週金曜日更新！当たるポイントと対象ランク',
    points: ['毎週金曜リセット', 'ハズレなし無料抽選', 'シルバー以上で解放'],
    accentColor: '#3b82f6'
  },
  '2025-12-25-best-use.html': {
    image: 'best-use.png',
    template: 'best-use-base',
    category: '交換先おすすめ',
    subtitle: 'ゲーム内アイテム vs クーポン vs Playクレジット',
    points: ['アイテム交換が最得', '専用クーポン活用法', 'クレジット交換の注意点'],
    accentColor: '#06b6d4'
  },
  '2025-12-25-diamond-worth-it.html': {
    image: 'diamond-worth-it.png',
    template: 'diamond-worth-it-base',
    category: '最上位ランク検証',
    subtitle: '必要ポイント・年間課金額・限定特典のコスパ',
    points: ['還元率2.0%', 'VIPサポート対応', '限定グッズ・損得計算'],
    accentColor: '#818cf8'
  },
  '2025-12-25-multiple-accounts.html': {
    image: 'multiple-accounts.png',
    template: 'multiple-accounts-base',
    category: '複数アカウント管理',
    subtitle: 'ポイント共有の可否と賢い使い分け・注意点',
    points: ['ポイント合算不可', 'メイン垢への集約法', 'ファミリー共有の仕様'],
    accentColor: '#64748b'
  }
};

function buildHtml({ category, title, subtitle, points, accentColor, visualHtml }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        background: #0b1329;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif;
        color: #ffffff;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 52px 64px 44px 64px;
      }
      .bg-glow-1 {
        position: absolute;
        top: -120px;
        right: -80px;
        width: 600px;
        height: 600px;
        border-radius: 50%;
        background: radial-gradient(circle, ${accentColor}33 0%, transparent 70%);
      }
      .bg-glow-2 {
        position: absolute;
        bottom: -150px;
        left: 200px;
        width: 500px;
        height: 500px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(30, 58, 138, 0.25) 0%, transparent 70%);
      }
      .bg-grid {
        position: absolute;
        inset: 0;
        background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
        background-size: 32px 32px;
        opacity: 0.6;
      }
      .header {
        position: relative;
        z-index: 10;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .category-pill {
        display: inline-flex;
        align-items: center;
        background: ${accentColor}22;
        border: 1.5px solid ${accentColor}88;
        color: ${accentColor};
        padding: 6px 18px;
        border-radius: 9999px;
        font-size: 19px;
        font-weight: 700;
      }
      .brand-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #94a3b8;
        font-size: 20px;
        font-weight: 600;
      }
      .brand-badge .name { color: #e2e8f0; font-weight: 700; }
      .main {
        position: relative;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 40px;
      }
      .text-area { flex: 1; max-width: 680px; }
      .subtitle {
        font-size: 22px;
        font-weight: 700;
        color: ${accentColor};
        margin-bottom: 12px;
        letter-spacing: 0.3px;
      }
      .title {
        font-size: 45px;
        font-weight: 900;
        line-height: 1.34;
        color: #ffffff;
        letter-spacing: -0.5px;
        text-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }
      .visual-card {
        width: 380px;
        height: 350px;
        background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
        border: 1.5px solid rgba(255, 255, 255, 0.16);
        border-radius: 24px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
      }
      .visual-img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 16px;
      }
      .footer {
        position: relative;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgba(255,255,255,0.1);
        padding-top: 16px;
      }
      .feature-tags { display: flex; gap: 14px; }
      .feature-tag {
        color: #cbd5e1;
        font-size: 17px;
        font-weight: 600;
        background: rgba(255,255,255,0.06);
        padding: 4px 14px;
        border-radius: 6px;
      }
      .site-url { color: #64748b; font-size: 18px; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="bg-glow-1"></div>
    <div class="bg-glow-2"></div>
    <div class="bg-grid"></div>

    <div class="header">
      <div class="category-pill">${category}</div>
      <div class="brand-badge">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2">
          <rect x="4" y="2" width="16" height="20" rx="3"></rect>
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <line x1="8" y1="10" x2="16" y2="10"></line>
          <line x1="8" y1="14" x2="16" y2="14"></line>
        </svg>
        <span class="name">Playポイント計算機</span>
      </div>
    </div>

    <div class="main">
      <div class="text-area">
        <div class="subtitle">${subtitle}</div>
        <h1 class="title">${title}</h1>
      </div>
      <div class="visual-card">
        ${visualHtml}
      </div>
    </div>

    <div class="footer">
      <div class="feature-tags">
        ${points.map(p => `<div class="feature-tag">✓ ${p}</div>`).join('')}
      </div>
      <div class="site-url">playpoint-sim.com</div>
    </div>
  </body>
  </html>
  `;
}

function cleanTitle(raw) {
  return raw
    .replace(/\s*[-|｜]\s*Playポイント.*$/i, '')
    .replace(/\s*[-|｜]\s*Google Play.*$/i, '')
    .trim();
}

async function run() {
  const selectedFiles = new Set(process.argv.filter(arg => arg.startsWith('--file=')).map(arg => arg.slice('--file='.length)));
  const articleFiles = fs.readdirSync(articlesDir).filter(f => f.endsWith('.html')).sort();
  for (const file of selectedFiles) {
    if (!articleFiles.includes(file)) throw new Error('記事が見つかりません: ' + file);
  }
  const files = articleFiles.filter(file => !selectedFiles.size || selectedFiles.has(file));
  console.log(`記事専用OGP生成・メタ情報同期: ${files.length}件`);

  // 1. Cache existing image buffers in memory before generating
  const originalImageBuffers = new Map();
  const existingImages = fs.readdirSync(ogpDir).filter(f => f.endsWith('.png'));
  for (const imgName of existingImages) {
    originalImageBuffers.set(imgName, fs.readFileSync(path.join(ogpDir, imgName)));
  }
  console.log(`Cached ${originalImageBuffers.size} existing OGP images in memory.`);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(articlesDir, file);
    let htmlContent = fs.readFileSync(filePath, 'utf8');

    const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1].trim() : '';
    const articleTitle = cleanTitle(rawTitle);

    let imgName = '';
    let category = '';
    let subtitle = '';
    let points = [];
    let accentColor = '#38bdf8';
    let visualHtml = '';
    let coverTitle = articleTitle;

    if (DISTINCT_MAPPING[file]) {
      const cfg = DISTINCT_MAPPING[file];
      imgName = cfg.image;
      coverTitle = cfg.title || articleTitle;
      category = cfg.category;
      subtitle = cfg.subtitle;
      points = cfg.points;
      accentColor = cfg.accentColor;
      visualHtml = VISUAL_CARDS[cfg.template];
    } else if (BASE_CONFIGS[file]) {
      const cfg = BASE_CONFIGS[file];
      imgName = cfg.image;
      category = cfg.category;
      subtitle = cfg.subtitle;
      points = cfg.points;
      accentColor = cfg.accentColor;
      visualHtml = VISUAL_CARDS[cfg.template];
    } else {
      // One of the 36 unique articles
      const currentOgMatch = htmlContent.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
      imgName = currentOgMatch ? currentOgMatch[1].split('/').pop() : file.replace('.html', '.png');

      const catMatch = htmlContent.match(/<meta name="article:category" content="([^"]+)"/i);
      category = catMatch ? `${catMatch[1]}解説` : 'Playポイント攻略';

      // Pick subtitle from h2 or h1
      const h2Match = htmlContent.match(/<h2[^>]*>([^<]+)<\/h2>/i);
      subtitle = h2Match ? h2Match[1].replace(/^[0-9.・\s]+/, '').trim() : '知っておきたい公式仕様と注意点';
      if (subtitle.length > 25) subtitle = subtitle.slice(0, 24) + '…';

      points = ['公式仕様の確認', '最新ルール準拠', '2026年最新'];
      accentColor = '#38bdf8';
      if (/ウマ娘|モンスト|ドッカン|パズドラ|ゲーム/.test(articleTitle)) accentColor = '#f59e0b';
      else if (/特典|リワード|ゴールド|プラチナ|シルバー/.test(articleTitle)) accentColor = '#10b981';
      else if (/注意|返金|消えた|ロック|届かない/.test(articleTitle)) accentColor = '#ef4444';

      const originalBuf = originalImageBuffers.get(imgName);
      if (originalBuf) {
        const base64 = 'data:image/jpeg;base64,' + originalBuf.toString('base64');
        visualHtml = `<img class="visual-img" src="${base64}" alt="${articleTitle}">`;
      } else {
        visualHtml = `
          <div style="font-size: 24px; font-weight: 800; color: #ffffff; text-align: center;">
            <div>Playポイント</div>
            <div style="color: ${accentColor}; margin-top: 4px;">公式ガイド</div>
          </div>
        `;
      }
    }

    // Render 1200x630 OGP image
    const cardHtml = buildHtml({
      category,
      title: coverTitle,
      subtitle,
      points,
      accentColor,
      visualHtml
    });

    await page.setContent(cardHtml);
    const jpegBuf = await page.screenshot({ type: 'jpeg', quality: 92 });

    const outPath = path.join(ogpDir, imgName);
    fs.writeFileSync(outPath, jpegBuf);
    console.log(`[${i + 1}/${files.length}] Rendered OGP: ${imgName} (${jpegBuf.length} bytes) for ${file}`);

    // Update HTML meta tags
    const targetOgUrl = `https://playpoint-sim.com/articles/ogp/${imgName}`;
    const altText = articleTitle;

    // Replace or insert og:image
    htmlContent = htmlContent.replace(
      /<meta property=["']og:image["'] content=["'][^"']+["']\s*\/?>/i,
      `<meta property="og:image" content="${targetOgUrl}" />`
    );

    // Replace or insert og:image:width
    if (/<meta property=["']og:image:width["']/i.test(htmlContent)) {
      htmlContent = htmlContent.replace(/<meta property=["']og:image:width["'] content=["'][^"']+["']\s*\/?>/i, '<meta property="og:image:width" content="1200" />');
    } else {
      htmlContent = htmlContent.replace(/(<meta property=["']og:image["'][^>]*>)/i, '$1\n    <meta property="og:image:width" content="1200" />');
    }

    // Replace or insert og:image:height
    if (/<meta property=["']og:image:height["']/i.test(htmlContent)) {
      htmlContent = htmlContent.replace(/<meta property=["']og:image:height["'] content=["'][^"']+["']\s*\/?>/i, '<meta property="og:image:height" content="630" />');
    } else {
      htmlContent = htmlContent.replace(/(<meta property=["']og:image:width["'][^>]*>)/i, '$1\n    <meta property="og:image:height" content="630" />');
    }

    // Replace or insert og:image:alt
    if (/<meta property=["']og:image:alt["']/i.test(htmlContent)) {
      htmlContent = htmlContent.replace(/<meta property=["']og:image:alt["'] content=["'][^"']+["']\s*\/?>/i, `<meta property="og:image:alt" content="${altText}" />`);
    } else {
      htmlContent = htmlContent.replace(/(<meta property=["']og:image:height["'][^>]*>)/i, `$1\n    <meta property="og:image:alt" content="${altText}" />`);
    }

    // Replace or insert og:image:type
    if (/<meta property=["']og:image:type["']/i.test(htmlContent)) {
      htmlContent = htmlContent.replace(/<meta property=["']og:image:type["'] content=["'][^"']+["']\s*\/?>/i, '<meta property="og:image:type" content="image/jpeg" />');
    } else {
      htmlContent = htmlContent.replace(/(<meta property=["']og:image:alt["'][^>]*>)/i, '$1\n    <meta property="og:image:type" content="image/jpeg" />');
    }

    // Replace or insert og:locale
    if (/<meta property=["']og:locale["']/i.test(htmlContent)) {
      htmlContent = htmlContent.replace(/<meta property=["']og:locale["'] content=["'][^"']+["']\s*\/?>/i, '<meta property="og:locale" content="ja_JP" />');
    } else {
      htmlContent = htmlContent.replace(/(<meta property=["']og:image:type["'][^>]*>)/i, '$1\n    <meta property="og:locale" content="ja_JP" />');
    }

    // Replace or insert twitter:card
    if (!/<meta name=["']twitter:card["']/i.test(htmlContent)) {
      htmlContent = htmlContent.replace(/(<meta property=["']og:site_name["'][^>]*>)/i, '$1\n    <meta name="twitter:card" content="summary_large_image" />');
    } else {
      htmlContent = htmlContent.replace(/<meta name=["']twitter:card["'] content=["'][^"']+["']\s*\/?>/i, '<meta name="twitter:card" content="summary_large_image" />');
    }

    // Replace or insert twitter:image
    if (/<meta name=["']twitter:image["']/i.test(htmlContent)) {
      htmlContent = htmlContent.replace(/<meta name=["']twitter:image["'] content=["'][^"']+["']\s*\/?>/i, `<meta name="twitter:image" content="${targetOgUrl}" />`);
    } else {
      htmlContent = htmlContent.replace(/(<meta name=["']twitter:card["'][^>]*>)/i, `$1\n    <meta name="twitter:image" content="${targetOgUrl}" />`);
    }

    // Update JSON-LD image property
    htmlContent = htmlContent.replace(
      /"image":\s*"https:\/\/playpoint-sim\.com\/[^"]+"/g,
      `"image": "${targetOgUrl}"`
    );

    fs.writeFileSync(filePath, htmlContent, 'utf8');
  }

  await browser.close();
  console.log(`記事専用OGP更新完了: ${files.length}件`);
}

run().catch(err => {
  console.error('Fatal error generating OGPs:', err);
  process.exit(1);
});
