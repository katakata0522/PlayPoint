'use strict';

const fs = require('fs');
const path = require('path');

const GAMES_DATA = [
  {
    id: 'genshin',
    title: '原神（Genshin Impact）',
    shortTitle: '原神',
    icon: '✨',
    desc: '創世結晶パック・空月の祝福・紀行・天井（180連）・完凸課金で貯まるPlayポイントと到達ランクをシミュレーション！',
    packs: [
      { name: '空月の祝福 (610円)', price: 610 },
      { name: '天空紀行 (1,220円)', price: 1220 },
      { name: '創世結晶 60個 (120円)', price: 120 },
      { name: '創世結晶 300+30個 (610円)', price: 610 },
      { name: '創世結晶 980+110個 (1,220円)', price: 1220 },
      { name: '創世結晶 1980+260個 (3,680円)', price: 3680 },
      { name: '創世結晶 3280+600個 (6,100円)', price: 6100 },
      { name: '創世結晶 6480+1600個 (12,000円)', price: 12000 }
    ],
    presets: [
      { label: '空月の祝福 (610円)', amount: 610, mult: 1 },
      { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
      { label: '仮天井 90連 (約27,000円)', amount: 27000, mult: 1 },
      { label: '確定天井 180連 (約54,000円)', amount: 54000, mult: 1 },
      { label: '完凸目安 (約250,000円)', amount: 250000, mult: 1 }
    ],
    faq: [
      { q: '原神の課金でGoogle Play Pointsは貯まりますか？', a: 'はい。Android端末またはGoogle Play Games（PC版）経由で課金した場合、通常100円につき1ポイント以上のPlay Pointsが貯まります。' },
      { q: '原神で確定天井（180連）まで課金すると何ポイント貯まりますか？', a: '180連（約54,000円）課金した場合、通常時（1%）で約540pt、Google Playのポイント増量キャンペーン（4倍〜7倍時）なら約2,160pt〜3,780pt貯まります。' },
      { q: '原神で完凸（約25万円）課金したらゴールドやプラチナになれますか？', a: 'はい。完凸に必要な約25万円を課金すると通常時でも約2,500pt貯まるため、ゴールドランク（1,000pt）を確実に達成し、ポイントキャンペーン併用ならプラチナ（4,000pt）にも到達可能です。' }
    ]
  },
  {
    id: 'umamusume',
    title: 'ウマ娘 プリティーダービー',
    shortTitle: 'ウマ娘',
    icon: '🐴',
    desc: 'ジュエル購入・デイリージュエルパック・天井（200連=6万円）課金で貯まるPlayポイントを即計算！',
    packs: [
      { name: 'デイリージュエルパック (980円)', price: 980 },
      { name: 'ジュエル 50個 (160円)', price: 160 },
      { name: 'ジュエル 150個 (480円)', price: 480 },
      { name: 'ジュエル 320個 (1,000円)', price: 1000 },
      { name: 'ジュエル 1000個 (3,000円)', price: 3000 },
      { name: 'ジュエル 1700個 (5,000円)', price: 5000 },
      { name: 'ジュエル 5000個 (10,000円)', price: 10000 }
    ],
    presets: [
      { label: 'デイリージュエル (980円)', amount: 980, mult: 1 },
      { label: '10連分 (3,000円)', amount: 3000, mult: 1 },
      { label: '1天井 200連 (60,000円)', amount: 60000, mult: 1 },
      { label: '2天井 400連 (120,000円)', amount: 120000, mult: 1 }
    ],
    faq: [
      { q: 'ウマ娘の天井（200連=6万円）で何ポイント貯まりますか？', a: '通常時で約600ポイント、Google Playポイント5倍キャンペーン時なら約3,000ポイント貯まります（一気にゴールドランク到達）。' },
      { q: 'Google Play Pointsをウマ娘のジュエルに交換できますか？', a: 'はい。Play PointsをGoogle Playクレジットやウマ娘専用クーポンに交換することで、次回のジュエル購入にお得に使えます。' }
    ]
  },
  {
    id: 'fgo',
    title: 'Fate/Grand Order (FGO)',
    shortTitle: 'FGO',
    icon: '⚔️',
    desc: '聖晶石パック・福袋（有償15個）・確定召喚（天井330連）で貯まるPlayポイントと還元額をシミュレーション！',
    packs: [
      { name: '聖晶石 1個 (160円)', price: 160 },
      { name: '聖晶石 4+1個 (480円)', price: 480 },
      { name: '聖晶石 12+6個 (1,400円)', price: 1400 },
      { name: '聖晶石 25+16個 (2,900円)', price: 2900 },
      { name: '聖晶石 42+34個 (4,900円)', price: 4900 },
      { name: '聖晶石 86+82個 (10,000円)', price: 10000 }
    ],
    presets: [
      { label: '福袋目安 (約1,900円)', amount: 1900, mult: 1 },
      { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
      { label: '天井 330連 (約55,000円)', amount: 55000, mult: 1 },
      { label: '宝具5目安 (約250,000円)', amount: 250000, mult: 1 }
    ],
    faq: [
      { q: 'FGOの確定召喚（天井330連=約5.5万円）で貯まるポイントは？', a: '通常レートで約550pt、5倍キャンペーン時なら約2,750pt貯まり、一気にゴールドランクへランクアップします。' }
    ]
  },
  {
    id: 'monst',
    title: 'モンスターストライク (モンスト)',
    shortTitle: 'モンスト',
    icon: '🐉',
    desc: 'オーブ購入・モンパス・超獣神祭・コラボガチャ課金で貯まるPlayポイントを計算！',
    packs: [
      { name: 'モンパス (480円)', price: 480 },
      { name: 'オーブ 1個 (160円)', price: 160 },
      { name: 'オーブ 3個 (480円)', price: 480 },
      { name: 'オーブ 6+1個 (980円)', price: 980 },
      { name: 'オーブ 12+3個 (2,000円)', price: 2000 },
      { name: 'オーブ 30+9個 (4,900円)', price: 4900 },
      { name: 'オーブ 60+25個 (10,000円)', price: 10000 }
    ],
    presets: [
      { label: 'モンパス月額 (480円)', amount: 480, mult: 1 },
      { label: '10連分 50個 (約3,500円)', amount: 3500, mult: 1 },
      { label: '100連分 500個 (約35,000円)', amount: 35000, mult: 1 },
      { label: '新春・周年ガチャ (100,000円)', amount: 100000, mult: 1 }
    ],
    faq: [
      { q: 'モンストで10万円課金したらいくらポイントが還元されますか？', a: '通常時で約1,000pt（1,000円分）、ポイント増量キャンペーン時なら約3,000pt〜5,000pt（3,000円〜5,000円分）が戻ってきます。' }
    ]
  },
  {
    id: 'gakumas',
    title: '学園アイドルマスター (学マス)',
    shortTitle: '学マス',
    icon: '🌟',
    desc: 'ジュエルパック・パス課金・天井（200連=6万円）で貯まるPlayポイントと到達ステータスを試算！',
    packs: [
      { name: 'ジュエル 60個 (160円)', price: 160 },
      { name: 'ジュエル 180個 (480円)', price: 480 },
      { name: 'ジュエル 470個 (1,200円)', price: 1200 },
      { name: 'ジュエル 1200個 (3,000円)', price: 3000 },
      { name: 'ジュエル 2050個 (5,000円)', price: 5000 },
      { name: 'ジュエル 4200個 (10,000円)', price: 10000 }
    ],
    presets: [
      { label: '10連分 (3,000円)', amount: 3000, mult: 1 },
      { label: '天井 200連 (60,000円)', amount: 60000, mult: 1 },
      { label: 'True End / 完凸目安 (150,000円)', amount: 150000, mult: 1 }
    ],
    faq: [
      { q: '学マスの天井課金（6万円）でゴールドランクになれますか？', a: 'はい。天井の6万円課金で約600pt（CP時なら約1,800pt〜3,000pt）貯まり、シルバー（250pt）およびゴールド（1,000pt）に即時到達可能です。' }
    ]
  },
  {
    id: 'proseka',
    title: 'プロジェクトセカイ (プロセカ)',
    shortTitle: 'プロセカ',
    icon: '🎵',
    desc: '有償クリスタル・カラフルパス・プレパス・天井課金で貯まるPlayポイントを計算！',
    packs: [
      { name: 'カラフルパス (480円)', price: 480 },
      { name: 'プレミアムミッションパス (1,960円)', price: 1960 },
      { name: 'クリスタル 100個 (160円)', price: 160 },
      { name: 'クリスタル 300個 (480円)', price: 480 },
      { name: 'クリスタル 650個 (1,000円)', price: 1000 },
      { name: 'クリスタル 2000個 (3,000円)', price: 3000 },
      { name: 'クリスタル 3400個 (5,000円)', price: 5000 },
      { name: 'クリスタル 7000個 (10,000円)', price: 10000 }
    ],
    presets: [
      { label: 'カラパス+プレパス (2,440円)', amount: 2440, mult: 1 },
      { label: '10連分 (3,000円)', amount: 3000, mult: 1 },
      { label: 'シール天井 300連 (90,000円)', amount: 90000, mult: 1 }
    ],
    faq: [
      { q: 'プロセカの天井（9万円）で何ポイント還元されますか？', a: '通常時で約900pt、Google Playの5倍キャンペーン時なら約4,500pt（プラチナランク到達）還元されます。' }
    ]
  },
  {
    id: 'pokepoke',
    title: 'Pokémon TCG Pocket (ポケポケ)',
    shortTitle: 'ポケポケ',
    icon: '🎴',
    desc: 'ポケゴールド・プレミアムパス・10連パック開封で貯まるGoogle Playポイントを計算！',
    packs: [
      { name: 'プレミアムパス (980円)', price: 980 },
      { name: 'ポケゴールド 5個 (140円)', price: 140 },
      { name: 'ポケゴールド 15個 (420円)', price: 420 },
      { name: 'ポケゴールド 31個 (840円)', price: 840 },
      { name: 'ポケゴールド 105個 (2,800円)', price: 2800 },
      { name: 'ポケゴールド 215個 (5,600円)', price: 5600 },
      { name: 'ポケゴールド 550個 (13,800円)', price: 13800 }
    ],
    presets: [
      { label: 'プレミアムパス月額 (980円)', amount: 980, mult: 1 },
      { label: 'ポケゴールド 550個 (13,800円)', amount: 13800, mult: 1 },
      { label: '図鑑コンプ課金 (50,000円)', amount: 50000, mult: 1 }
    ],
    faq: [
      { q: 'ポケポケの課金でGoogle Playポイントは貯まりますか？', a: 'はい。Android端末からポケゴールドやプレミアムパスを購入すると、100円あたり1pt以上のPlay Pointsが貯まります。' }
    ]
  }
];

function generateGamePageHtml(game) {
  const packOptions = game.packs.map(p => `<option value="${p.price}">${p.name}</option>`).join('\n                  ');
  const presetButtons = game.presets.map((p, idx) => `<button type="button" class="preset-btn ${idx === 0 ? 'active' : ''}" data-amount="${p.amount}" data-mult="${p.mult}">${p.label}</button>`).join('\n              ');
  const faqHtml = game.faq.map(f => `<h3>${f.q}</h3>\n<p>${f.a}</p>`).join('\n');
  const packTableRows = game.packs.map(p => `<tr><td>${p.name}</td><td>${p.price.toLocaleString('ja-JP')} 円</td><td>約 ${Math.round(p.price / 100)} pt</td><td>約 ${Math.round((p.price / 100) * 5)} pt</td></tr>`).join('\n');

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": game.faq.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `${game.title} Playポイント課金計算機`,
    "url": `https://playpoint-sim.com/games/${game.id}/`,
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "All"
  };

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="かたかた" />
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml" />
  <title>${game.title}の課金で貯まるPlayポイント計算機【天井・パック別還元額】</title>
  <meta name="description" content="${game.desc}" />
  <link rel="canonical" href="https://playpoint-sim.com/games/${game.id}/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Playポイント計算機" />
  <meta property="og:title" content="${game.title}の課金で貯まるPlayポイント計算機" />
  <meta property="og:description" content="${game.desc}" />
  <meta property="og:url" content="https://playpoint-sim.com/games/${game.id}/" />
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="stylesheet" href="../../articles/article-shared.css?v=eb2e12f5ef" />
  <link rel="stylesheet" href="../games.css" />

  <script type="speculationrules">
  {
    "prefetch": [
      {
        "source": "document",
        "where": {
          "and": [
            { "href_matches": "/*" },
            { "not": { "href_matches": ["/privacy.html*", "/terms.html*", "/author/*"] } }
          ]
        },
        "eagerness": "moderate"
      }
    ]
  }
  </script>

  <script type="application/ld+json">
  ${JSON.stringify(appSchema, null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(faqSchema, null, 2)}
  </script>
</head>
<body>

  <!-- Cocoon風 ヘッダー -->
  <header class="site-header">
      <div class="site-header-inner">
          <a class="site-logo" href="../../">
              <span class="site-logo-icon">🎮</span>
              <span class="site-logo-text">Playポイント計算機</span>
          </a>
          <p class="site-tagline">Google Play Points の必要額・還元シミュレーター</p>
      </div>
  </header>

  <!-- グローバルナビゲーション -->
  <nav class="global-nav" aria-label="メインナビゲーション">
      <div class="global-nav-inner">
          <a class="nav-item" href="../../">
              <span>ホーム</span>
              <span class="nav-sub">必要額計算</span>
          </a>
          <a class="nav-item active" href="../">
              <span>ゲーム別計算</span>
              <span class="nav-sub">人気ソシャゲ</span>
          </a>
          <a class="nav-item" href="../../blog/">
              <span>記事一覧</span>
              <span class="nav-sub">攻略・ノウハウ</span>
          </a>
          <a class="nav-item" href="../../author/katakata.html">
              <span>運営者</span>
              <span class="nav-sub">検証方針</span>
          </a>
      </div>
  </nav>

  <!-- パンくずリスト -->
  <div class="breadcrumbs-wrapper">
      <nav aria-label="パンくずリスト">
          <a href="../../">ホーム</a> <span>&gt;</span>
          <a href="../">ゲーム別計算機</a> <span>&gt;</span>
          <span>${game.title}</span>
      </nav>
  </div>

  <div class="game-page-container">
      <main class="game-main-content">
          <header class="game-header">
              <span class="game-badge">${game.icon} 人気ゲーム別シミュレーター</span>
              <h1 class="game-title">${game.title} 課金Playポイント計算機</h1>
              <p class="game-meta">最終確認：2026年8月 ｜ Google Play Points 公式レート（100円=1pt）準拠</p>
          </header>

          <p>${game.desc}</p>

          <!-- シミュレーター操作パネル -->
          <section class="game-sim-card">
              <h2 class="game-sim-title">🧮 ${game.shortTitle} 課金シミュレーター</h2>

              <p style="font-size:0.9rem; margin-bottom:12px; font-weight:700; color:#475569;">▼ 目標からワンタップで選択：</p>
              <div class="preset-buttons">
                  ${presetButtons}
              </div>

              <form id="game-sim-form">
                  <div class="input-grid">
                      <div class="input-field">
                          <label for="sim-pack-select">課金パックを選択：</label>
                          <select id="sim-pack-select">
                              ${packOptions}
                              <option value="custom">自由入力（カスタム金額）</option>
                          </select>
                      </div>

                      <div class="input-field">
                          <label for="sim-pack-count">購入回数：</label>
                          <input type="number" id="sim-pack-count" value="1" min="1" max="999" inputmode="numeric">
                      </div>

                      <div class="input-field">
                          <label for="sim-custom-amount">課金予定合計額（円）：</label>
                          <input type="number" id="sim-custom-amount" value="${game.presets[0].amount}" min="0" step="10" inputmode="numeric">
                      </div>

                      <div class="input-field">
                          <label for="sim-multiplier">ポイント倍率：</label>
                          <select id="sim-multiplier">
                              <option value="1">通常時（等倍 / 1%）</option>
                              <option value="2">2倍キャンペーン</option>
                              <option value="3">3倍キャンペーン</option>
                              <option value="4">4倍キャンペーン</option>
                              <option value="5">5倍キャンペーン</option>
                              <option value="7">7倍キャンペーン</option>
                          </select>
                      </div>

                      <div class="input-field">
                          <label for="sim-status">現在の会員ランク：</label>
                          <select id="sim-status">
                              <option value="1.0">ブロンズ（100円=1pt）</option>
                              <option value="1.25">シルバー（100円=1.25pt）</option>
                              <option value="1.5">ゴールド（100円=1.5pt）</option>
                              <option value="1.75">プラチナ（100円=1.75pt）</option>
                              <option value="2.0">ダイヤモンド（100円=2.0pt）</option>
                          </select>
                      </div>
                  </div>
              </form>

              <!-- 計算結果表示エリア -->
              <div class="game-result-container">
                  <div class="result-main-grid">
                      <div class="result-stat-box">
                          <span class="result-stat-label">課金合計金額</span>
                          <strong id="res-total-amount" class="result-stat-value">- 円</strong>
                      </div>
                      <div class="result-stat-box">
                          <span class="result-stat-label">獲得予定 Playポイント</span>
                          <strong id="res-earned-points" class="result-stat-value highlight">- pt</strong>
                      </div>
                      <div class="result-stat-box">
                          <span class="result-stat-label">ポイント還元価値</span>
                          <strong id="res-point-value-yen" class="result-stat-value">- 円分</strong>
                      </div>
                      <div class="result-stat-box">
                          <span class="result-stat-label">到達ステータス</span>
                          <strong id="res-reached-rank" class="result-stat-value">-</strong>
                      </div>
                  </div>

                  <!-- ランク進捗 -->
                  <div class="rank-progress-wrapper">
                      <div class="rank-progress-header">
                          <span>ランク進捗状況</span>
                          <span id="res-next-progress">-</span>
                      </div>
                      <div class="rank-bar-bg">
                          <div id="res-rank-bar" class="rank-bar-fill"></div>
                      </div>
                  </div>

                  <p style="font-size:0.85rem; color:#64748b; margin-top:12px; margin-bottom:0;">
                      ※Google Play公式の四捨五入ルール（100円単位）に基づき計算しています。実際の付与ポイントはGoogle Play購入画面の事前表示をご確認ください。
                  </p>
              </div>
          </section>

          <!-- パック早見表 -->
          <section class="section">
              <h2>${game.shortTitle} 課金パック別 Playポイント還元早見表</h2>
              <div class="pack-table-wrap">
                  <table class="pack-table">
                      <thead>
                          <tr>
                              <th>課金パック名</th>
                              <th>価格 (税込)</th>
                              <th>通常時還元 (1%)</th>
                              <th>5倍CP時還元 (5%)</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${packTableRows}
                      </tbody>
                  </table>
              </div>
          </section>

          <!-- よくある質問 -->
          <section class="section">
              <h2>よくある質問（FAQ）</h2>
              ${faqHtml}
          </section>

          <!-- 他のゲーム計算機 -->
          <section class="section">
              <h2>他の人気ゲームの課金シミュレーター</h2>
              <div class="games-grid">
                  ${GAMES_DATA.filter(g => g.id !== game.id).map(g => `
                  <a class="game-portal-card" href="../${g.id}/">
                      <div>
                          <div class="game-card-icon">${g.icon}</div>
                          <h3 class="game-card-title">${g.title}</h3>
                          <p class="game-card-desc">${g.desc}</p>
                      </div>
                      <div class="game-card-action">計算機を開く ➔</div>
                  </a>`).join('')}
              </div>
          </section>

          <!-- 汎用CTA -->
          <aside class="cta-box" style="margin-top:40px;">
              <h3>目標ポイントからの逆算シミュレーター</h3>
              <p>「ゴールドランクまであと◯◯pt必要」など、不足ポイントから必要課金額を逆算したい場合は総合計算機をご利用ください。</p>
              <a class="cta-btn" href="../../">Playポイント総合計算機へ ➔</a>
          </aside>
      </main>

      <!-- サイドバー -->
      <aside class="sidebar-column" style="width:300px; flex-shrink:0;">
          <div class="sidebar-widget">
              <div class="sidebar-widget-title">🧮 総合計算機</div>
              <div class="sidebar-widget-body">
                  <div class="sidebar-calc-banner">
                      <h4>あと何ポイント必要？</h4>
                      <p>目標ランクまでの必要金額を即時シミュレーション！</p>
                      <a class="sidebar-calc-btn" href="../../">計算機を使う ➔</a>
                  </div>
              </div>
          </div>

          <div class="sidebar-widget">
              <div class="sidebar-widget-title">🎮 ゲーム別一覧</div>
              <div class="sidebar-widget-body">
                  <ul class="sidebar-article-list">
                      ${GAMES_DATA.map(g => `<li><a href="../${g.id}/">${g.icon} ${g.shortTitle}</a></li>`).join('\n                      ')}
                  </ul>
              </div>
          </div>

          <div class="sidebar-widget">
              <div class="sidebar-widget-title">📚 おすすめ攻略記事</div>
              <div class="sidebar-widget-body">
                  <ul class="sidebar-article-list">
                      <li><a href="../../articles/2026-06-20-discount-gift-cards.html">Google Playギフトコードをお得に買う方法</a></li>
                      <li><a href="../../articles/2026-07-24-play-points-1-value.html">1ポイントはいくら相当？</a></li>
                      <li><a href="../../articles/2026-07-31-super-weekly-reward.html">スーパーウィークリーリワード完全ガイド</a></li>
                  </ul>
              </div>
          </div>
      </aside>
  </div>

  <!-- サイトフッター -->
  <footer class="site-footer">
      <div class="site-footer-links">
          <a href="../../">計算機トップ</a> ｜
          <a href="../">ゲーム別計算機</a> ｜
          <a href="../../blog/">記事一覧</a> ｜
          <a href="../../privacy.html">プライバシーポリシー</a> ｜
          <a href="../../terms.html">利用規約</a> ｜
          <a href="../../author/katakata.html">運営者情報</a>
      </div>
      <p>© 2026 Playポイント計算機 All Rights Reserved.</p>
  </footer>

  <script src="../game-sim.js"></script>
  <script src="../../js/analytics-core.js"></script>
</body>
</html>
`;
}

function generatePortalPageHtml() {
  const cardsHtml = GAMES_DATA.map(g => `
      <a class="game-portal-card" href="./${g.id}/">
          <div>
              <div class="game-card-icon">${g.icon}</div>
              <h2 class="game-card-title">${g.title}</h2>
              <p class="game-card-desc">${g.desc}</p>
          </div>
          <div class="game-card-action">シミュレーターを開く ➔</div>
      </a>
  `).join('');

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="かたかた" />
  <link rel="icon" href="../favicon.svg" type="image/svg+xml" />
  <title>人気ゲーム別 Playポイント課金・天井シミュレーター一覧</title>
  <meta name="description" content="原神、ウマ娘、FGO、モンスト、学マス、プロセカ、ポケポケなどの人気ソシャゲの課金パック・天井・完凸で貯まるGoogle Play Pointsと到達ランクを簡単シミュレーション！" />
  <link rel="canonical" href="https://playpoint-sim.com/games/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Playポイント計算機" />
  <meta property="og:title" content="人気ゲーム別 Playポイント課金・天井シミュレーター一覧" />
  <meta property="og:description" content="人気タイトルのガチャ・パック課金で貯まるPlayポイントとランク進捗を即時計算！" />
  <meta property="og:url" content="https://playpoint-sim.com/games/" />
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="stylesheet" href="../articles/article-shared.css?v=eb2e12f5ef" />
  <link rel="stylesheet" href="./games.css" />

  <script type="speculationrules">
  {
    "prefetch": [
      {
        "source": "document",
        "where": {
          "and": [
            { "href_matches": "/*" },
            { "not": { "href_matches": ["/privacy.html*", "/terms.html*", "/author/*"] } }
          ]
        },
        "eagerness": "moderate"
      }
    ]
  }
  </script>
</head>
<body>

  <!-- Cocoon風 ヘッダー -->
  <header class="site-header">
      <div class="site-header-inner">
          <a class="site-logo" href="../">
              <span class="site-logo-icon">🎮</span>
              <span class="site-logo-text">Playポイント計算機</span>
          </a>
          <p class="site-tagline">Google Play Points の必要額・還元シミュレーター</p>
      </div>
  </header>

  <!-- グローバルナビゲーション -->
  <nav class="global-nav" aria-label="メインナビゲーション">
      <div class="global-nav-inner">
          <a class="nav-item" href="../">
              <span>ホーム</span>
              <span class="nav-sub">必要額計算</span>
          </a>
          <a class="nav-item active" href="./">
              <span>ゲーム別計算</span>
              <span class="nav-sub">人気ソシャゲ</span>
          </a>
          <a class="nav-item" href="../blog/">
              <span>記事一覧</span>
              <span class="nav-sub">攻略・ノウハウ</span>
          </a>
          <a class="nav-item" href="../author/katakata.html">
              <span>運営者</span>
              <span class="nav-sub">検証方針</span>
          </a>
      </div>
  </nav>

  <!-- パンくずリスト -->
  <div class="breadcrumbs-wrapper">
      <nav aria-label="パンくずリスト">
          <a href="../">ホーム</a> <span>&gt;</span>
          <span>ゲーム別計算機一覧</span>
      </nav>
  </div>

  <div class="game-page-container">
      <main class="game-main-content">
          <header class="game-header">
              <span class="game-badge">🎮 ソシャゲ特化</span>
              <h1 class="game-title">人気ゲーム別 Playポイント課金・天井シミュレーター</h1>
              <p class="game-meta">お気に入りのゲームを選んで、パック課金や天井ガチャで貯まるPlayポイントを計算できます。</p>
          </header>

          <p>
              Google Playストアで配信されている人気ゲームの課金アイテム（創世結晶、ジュエル、聖晶石、オーブなど）の価格レートに対応！
              「天井（ガチャ確定）まで回したら何ポイント還元される？」「完凸でゴールド・プラチナランクに届く？」をワンタップでシミュレーションできます。
          </p>

          <div class="games-grid">
              ${cardsHtml}
          </div>

          <aside class="cta-box" style="margin-top:40px;">
              <h3>自由な金額で計算したい場合</h3>
              <p>上記以外のゲームや任意の課金金額、不足ポイントからの逆算は総合計算機をご利用ください。</p>
              <a class="cta-btn" href="../">Playポイント総合計算機へ ➔</a>
          </aside>
      </main>

      <!-- サイドバー -->
      <aside class="sidebar-column" style="width:300px; flex-shrink:0;">
          <div class="sidebar-widget">
              <div class="sidebar-widget-title">🧮 総合計算機</div>
              <div class="sidebar-widget-body">
                  <div class="sidebar-calc-banner">
                      <h4>あと何ポイント必要？</h4>
                      <p>目標ランクまでの必要金額を即時シミュレーション！</p>
                      <a class="sidebar-calc-btn" href="../">計算機を使う ➔</a>
                  </div>
              </div>
          </div>

          <div class="sidebar-widget">
              <div class="sidebar-widget-title">📚 おすすめ攻略記事</div>
              <div class="sidebar-widget-body">
                  <ul class="sidebar-article-list">
                      <li><a href="../articles/2026-06-20-discount-gift-cards.html">Google Playギフトコードをお得に買う方法</a></li>
                      <li><a href="../articles/2026-07-24-play-points-1-value.html">1ポイントはいくら相当？</a></li>
                      <li><a href="../articles/2026-07-31-super-weekly-reward.html">スーパーウィークリーリワード完全ガイド</a></li>
                  </ul>
              </div>
          </div>
      </aside>
  </div>

  <!-- サイトフッター -->
  <footer class="site-footer">
      <div class="site-footer-links">
          <a href="../">計算機トップ</a> ｜
          <a href="./">ゲーム別計算機</a> ｜
          <a href="../blog/">記事一覧</a> ｜
          <a href="../privacy.html">プライバシーポリシー</a> ｜
          <a href="../terms.html">利用規約</a> ｜
          <a href="../author/katakata.html">運営者情報</a>
      </div>
      <p>© 2026 Playポイント計算機 All Rights Reserved.</p>
  </footer>

  <script src="../js/analytics-core.js"></script>
</body>
</html>
`;
}

function buildAll() {
  const rootDir = path.join(__dirname, '..');
  const gamesDir = path.join(rootDir, 'games');
  if (!fs.existsSync(gamesDir)) {
    fs.mkdirSync(gamesDir, { recursive: true });
  }

  // ポータルページ
  fs.writeFileSync(path.join(gamesDir, 'index.html'), generatePortalPageHtml(), 'utf8');
  console.log('Generated games/index.html');

  // 各ゲームページ
  for (const game of GAMES_DATA) {
    const targetDir = path.join(gamesDir, game.id);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'index.html'), generateGamePageHtml(game), 'utf8');
    console.log(`Generated games/${game.id}/index.html`);
  }
}

buildAll();
