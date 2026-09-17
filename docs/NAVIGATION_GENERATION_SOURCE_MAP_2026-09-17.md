# 第2章準備: 公開導線・生成元台帳（2026-09-17）

この文書は、第2章「リンク・地域・多言語整合性」の修正へ入る前に、PlayPoint の公開導線と、それを作る生成元・finalizer・検証境界を固定した基準台帳です。

**この台帳PRではリンクそのものを修正しません。** 仕様として必要な地域・言語横断と、誤遷移の可能性がある横断を先に分離し、次PR以降で生成済みHTMLではなく実際の生成元を直せる状態にすることが目的です。

基準は PR #337 で生成された成功CI evidenceです。complete preflight と必須Chromiumの両方を通過した監査結果を固定しています。

## 1. 監査範囲

| 項目 | 確定値 |
|---|---:|
| リポジトリ内走査ファイル | 924 |
| 公開HTML | 398 |
| 内部anchor遷移 | 13,387 |
| canonical / hreflang metadata link | 2,202 |
| 公開target path | 547 |
| generator ownership未分類ページ | 0 |

locale別の公開HTMLは `ja=126 / en=90 / ko=90 / tw=90 / hk=1 / in=1`。領域別は `fixed=55 / articles=215 / author=4 / blog=1 / games=117 / calculator=6` です。

全13,387 anchor遷移と全2,202 metadata linkはCI evidenceの `navigation-source-map.json` に1件ずつ保存します。巨大な自動生成JSONをrepoへ固定すると通常改修ごとに大差分になるため、repoにはこの読みやすい基準台帳を固定し、完全な行単位データは毎回CIで再生成します。

## 2. 遷移分類

| 分類 | 件数 | 意味 |
|---|---:|---|
| `same-locale` | 12,038 | 同一locale内の通常遷移 |
| `region-switch` | 824 | 地域選択として明示された横断 |
| `locale-switch` | 44 | hreflang / 言語切替として明示された横断 |
| `explicit-locale-fallback` | 273 | リンク文字列で遷移先言語・地域を明示したfallback |
| `cross-locale-candidate` | 208 | 上記の明示条件に該当せず、レビューが必要なlocale横断 |

`explicit-locale-fallback` は、日本語だけを特別扱いせず、遷移先localeに応じて `Japanese / 日本語 / 일본어 / 日文`、`English / U.S. / United States / 영문 / 英文`、`Korean / Korea / 한국어 / 대한민국`、`Traditional Chinese / Taiwan / 繁體中文 / 台灣`、`Hong Kong / 香港`、`India / 印度` などの可視ラベルを判定します。

これにより、利用者が遷移先を理解できる明示fallbackや地域選択を「誤遷移候補」に混ぜません。

## 3. 要レビュー候補の全体像

最終的な `cross-locale-candidate` は208件です。**208件すべてが海外locale側から日本語側への遷移**で、遷移先は3種類しかありません。

| 遷移先 | 件数 | 主なsurface | generator group内訳 | 現時点の扱い |
|---|---:|---|---|---|
| `/author/katakata.html` | 202 | footer 111 / breadcrumb 66 / author 22 / CTA 3 | intl-game-guide 132 / intl-seo-lp 57 / calculator-locale-top 6 / expanded-region-top 4 / intl-article 3 | localized authorが存在するページ群もあるため、次PRで生成元単位に精査 |
| `/embed.html` | 5 | footer 5 | calculator-locale-top 3 / expanded-region-top 2 | 日本語専用なら明示fallback化、locale版を持つなら同locale化を検討 |
| `/articles/2025-12-25-diamond-worth-it.html` | 1 | body 1 | intl-seo-lp 1 | 多言語本文から日本語記事へ無印で飛ぶ強い修正候補 |

出発locale別は `en→ja=68 / ko→ja=67 / tw→ja=67 / hk→ja=3 / in→ja=3` です。

surface別は `footer=116 / breadcrumb=66 / author=22 / CTA=3 / body=1`。generator group別は `intl-game-guide=132 / intl-seo-lp=58 / calculator-locale-top=9 / expanded-region-top=6 / intl-article=3` です。

### 3.1 強い内容遷移候補

`intl-to-ja-content` は最終的に1件です。

| source | target | label | surface | generator group |
|---|---|---|---|---|
| `/en/status/diamond/` | `/articles/2025-12-25-diamond-worth-it.html` | `Read Diamond value notes` | body | `intl-seo-lp` |

このリンクは遷移先が日本語であることを可視ラベルで示していません。日本語記事しか存在しないなら明示fallbackにする、英語相当ページを作るなら英語版へ向ける、という判断を次の修正PRで行います。

### 3.2 存在しない内部target

`target-not-found` は **0件** です。HTMLだけでなく、production allowlistに含まれるXML・RSS・asset等もtarget集合へ含めたため、HTML以外の正常な公開先を404候補として誤検出しません。

## 4. ページ群と生成元 ownership

「表示されたHTMLを直接直す」のではなく、以下の所有群から実生成元を特定して修正します。

| ページ群 | 所有モデル | 生成元・finalizer候補 |
|---|---|---|
| `calculator-ja-top` | manual+canonical-sync | `scripts/build-metadata.cjs`<br>`scripts/calculator-header-sync.cjs`<br>`scripts/html-sync.cjs`<br>`scripts/region-hreflang-sync.cjs`<br>`scripts/site-shell.cjs` |
| `calculator-locale-top` | generated+canonical-sync | `scripts/language-page-builder.cjs`<br>`scripts/calculator-header-sync.cjs`<br>`scripts/region-hreflang-sync.cjs`<br>`scripts/site-shell.cjs` |
| `expanded-region-top` | generated+canonical-sync | `scripts/region-page-sync.cjs`<br>`scripts/region-hreflang-sync.cjs`<br>`scripts/calculator-header-sync.cjs`<br>`scripts/site-shell.cjs` |
| `intl-article` | generated-or-manual+intl-finalizers | `scripts/intl-seo-pages.cjs`<br>`scripts/intl-content-expansion.cjs`<br>`scripts/intl-article-layout.cjs`<br>`scripts/intl-navigation-sidebar-v1.cjs`<br>`scripts/intl-article-hreflang-sync.cjs`<br>`scripts/intl-hub-discovery.cjs`<br>`scripts/intl-localization-normalize.cjs` |
| `intl-author` | generated+intl-finalizers | `scripts/intl-author-pages.cjs`<br>`scripts/intl-navigation-sidebar-v1.cjs`<br>`scripts/author-hreflang-sync.cjs` |
| `intl-game-guide` | generated+intl-finalizers | `scripts/intl-game-guide-publish-normalize.cjs`<br>`scripts/intl-navigation-sidebar-v1.cjs`<br>`scripts/generate-game-simulators.cjs` |
| `intl-seo-lp` | generated-or-manual+lp-finalizers | `scripts/intl-seo-pages.cjs`<br>`scripts/html-sync.cjs`<br>`scripts/manual-lp-hreflang-sync.cjs`<br>`scripts/intl-localization-normalize.cjs`<br>`scripts/site-shell.cjs` |
| `japanese-article` | manual+article-finalizers | `scripts/article-content-navigation-normalize.cjs`<br>`scripts/japanese-navigation-sidebar.cjs`<br>`scripts/article-discovery-sync.cjs`<br>`scripts/article-seo-normalize.cjs` |
| `japanese-author` | manual+canonical-sync | `scripts/author-hreflang-sync.cjs`<br>`scripts/html-sync.cjs`<br>`scripts/site-shell.cjs` |
| `japanese-game-guide` | generated-or-manual+game-finalizers | `scripts/generate-game-simulators.cjs`<br>`scripts/game-guide-article-hub-sync.cjs`<br>`scripts/game-seo-sync.cjs`<br>`scripts/game-seo-safety-sync.cjs`<br>`scripts/game-seo-expanded-sync.cjs`<br>`scripts/game-seo-wave3-sync.cjs`<br>`scripts/game-seo-wave4-sync.cjs`<br>`scripts/game-seo-wave5-sync.cjs` |
| `japanese-seo-lp` | manual+lp-finalizers | `scripts/html-sync.cjs`<br>`scripts/insert-lp-monetization.cjs`<br>`scripts/lp-faq-sync.cjs`<br>`scripts/manual-lp-hreflang-sync.cjs`<br>`scripts/site-shell.cjs` |
| `fixed-page` | manual+fixed-page-finalizers | `scripts/fixed-page-header-sync.cjs`<br>`scripts/legal-page-lang-nav-sync.cjs`<br>`scripts/html-sync.cjs`<br>`scripts/internal-link-attribution.cjs`<br>`scripts/site-shell.cjs` |

## 5. canonical buildの実行順

`scripts/build-html.js` から、実際に呼ばれる生成・正規化・最終化処理をsource行順で抽出します。代入呼び出し、別名import、遅延require、2回目のhreflang finalizer、side-effect生成も取りこぼさない契約です。

| # | build-html行 | 関数 | 生成元 |
|---:|---:|---|---|
| 1 | 63 | `syncIndexMetadata` | `scripts/build-metadata.cjs` |
| 2 | 64 | `createLocales` | `scripts/locale-config.cjs` |
| 3 | 65 | `applyIntlSemanticSourceOverrides` | `scripts/intl-localization-normalize.cjs` |
| 4 | 68 | `applyEditorialStructure` | `scripts/article-editorial-structure.cjs` |
| 5 | 71 | `synchronizeArticleStaticUsability` | `scripts/article-static-usability.cjs` |
| 6 | 74 | `writeLocalizedPages` | `scripts/language-page-builder.cjs` |
| 7 | 75 | `syncVisitorThanks` | `scripts/visitor-thanks-sync.cjs` |
| 8 | 76 | `syncRegionPages` | `scripts/region-page-sync.cjs` |
| 9 | 77 | `syncRegionHreflang` | `scripts/region-hreflang-sync.cjs` |
| 10 | 78 | `syncCalculatorHeaders` | `scripts/calculator-header-sync.cjs` |
| 11 | 81 | `syncDynamicArticleStylesheetVersion` | `scripts/article-asset-versioning.cjs` |
| 12 | 82 | `syncServiceWorkerAssets` | `scripts/asset-sync.cjs` |
| 13 | 84 | `writeIntlSeoPages` | `scripts/intl-seo-pages.cjs` |
| 14 | 85 | `publishLocalizedGameGuides` | `scripts/intl-game-guide-publish-normalize.cjs` |
| 15 | 87 | `syncIntlManualContent` | `scripts/intl-manual-content-sync.cjs` |
| 16 | 88 | `applyIntlContentExpansion` | `scripts/intl-content-expansion.cjs` |
| 17 | 91 | `syncIntlArticleJapaneseHreflang` | `scripts/intl-article-hreflang-sync.cjs` |
| 18 | 93 | `synchronizeIntlArticleLayouts` | `scripts/intl-article-layout.cjs` |
| 19 | 95 | `syncIntlHubDiscovery` | `scripts/intl-hub-discovery.cjs` |
| 20 | 97 | `syncIntlNavigationSidebarV1` | `scripts/intl-navigation-sidebar-v1.cjs` |
| 21 | 100 | `[side-effect require]` | `scripts/generate-game-simulators.cjs` |
| 22 | 101 | `syncGameSeo` | `scripts/game-seo-sync.cjs` |
| 23 | 103 | `syncGameSeoSafety` | `scripts/game-seo-safety-sync.cjs` |
| 24 | 105 | `syncGameSeoExpanded` | `scripts/game-seo-expanded-sync.cjs` |
| 25 | 107 | `syncGameSeoWave3` | `scripts/game-seo-wave3-sync.cjs` |
| 26 | 109 | `syncGameSeoWave4` | `scripts/game-seo-wave4-sync.cjs` |
| 27 | 111 | `syncGameSeoWave5` | `scripts/game-seo-wave5-sync.cjs` |
| 28 | 113 | `syncGameSeoWave5RegionalRates` | `scripts/game-seo-wave5-regional-sync.cjs` |
| 29 | 117 | `syncGameGuideArticleHub` | `scripts/game-guide-article-hub-sync.cjs` |
| 30 | 119 | `syncArticleAuthorSemantics` | `scripts/article-author-semantics.cjs` |
| 31 | 121 | `syncArticleTableOverflow` | `scripts/article-table-overflow-sync.cjs` |
| 32 | 124 | `syncHtmlFiles` | `scripts/html-sync.cjs` |
| 33 | 124 | `getSyncedHtmlFiles` | `scripts/build-targets.cjs` |
| 34 | 125 | `syncFixedPageHeaders` | `scripts/fixed-page-header-sync.cjs` |
| 35 | 127 | `syncLegalPageLanguageNavs` | `scripts/legal-page-lang-nav-sync.cjs` |
| 36 | 129 | `applyLpMonetization` | `scripts/insert-lp-monetization.cjs` |
| 37 | 130 | `syncManualLpFaqFiles` | `scripts/lp-faq-sync.cjs` |
| 38 | 132 | `syncManualLpHreflangFiles` | `scripts/manual-lp-hreflang-sync.cjs` |
| 39 | 134 | `syncJapaneseAuthorHreflang` | `scripts/author-hreflang-sync.cjs` |
| 40 | 136 | `syncAnalyticsRuntimeScripts` | `scripts/analytics-runtime-sync.cjs` |
| 41 | 138 | `normalizeIntlGeneratedCopy` | `scripts/intl-localization-normalize.cjs` |
| 42 | 140 | `syncJapaneseNavigation` | `scripts/japanese-navigation-sidebar.cjs` |
| 43 | 144 | `syncPublicAssetVersions` | `scripts/article-asset-versioning.cjs` |
| 44 | 146 | `syncSitemap` | `scripts/sitemap-sync.cjs` |
| 45 | 147 | `syncRegionSitemap` | `scripts/region-page-sync.cjs` |
| 46 | 149 | `generateBlogFeeds` | `scripts/blog-feeds.cjs` |
| 47 | 151 | `normalizeArticleFiles` | `scripts/article-seo-normalize.cjs` |
| 48 | 154 | `syncJapaneseGuideBrand` | `scripts/japanese-guide-brand.cjs` |
| 49 | 157 | `syncArticleDateContract` | `scripts/article-date-contract.cjs` |
| 50 | 160 | `stripExternalGoogleFonts` | `scripts/external-fonts.cjs` |
| 51 | 163 | `sanitizeInternalLinks` | `scripts/internal-link-attribution.cjs` |
| 52 | 166 | `syncSpeculationRules` | `scripts/speculation-rules-sync.cjs` |
| 53 | 169 | `normalizeArticleContentNavigation` | `scripts/article-content-navigation-normalize.cjs` |
| 54 | 176 | `syncArticleDiscovery` | `scripts/article-discovery-sync.cjs` |
| 55 | 180 | `syncIntlArticleJapaneseHreflang` | `scripts/intl-article-hreflang-sync.cjs` |
| 56 | 183 | `assertTaiwanTerminology` | `scripts/tw-terminology-contract.cjs` |

重要なのは、#17 と #55 の `syncIntlArticleJapaneseHreflang` が同じ処理の重複事故ではなく、前段生成後と後段finalizer後の2段階保証として実際に存在することです。監査テストはこの2回を保持します。

## 6. 次PRで触るべき生成元の優先順

この台帳から見ると、次の修正はHTMLを208ファイル個別編集する必要はありません。

1. `/author/katakata.html` 202件を、generator group単位で直す。特に `intl-game-guide` 132件と `intl-seo-lp` 57件が中心です。多言語authorページが存在する場所は同localeへ、意図的な日本語fallbackなら可視ラベルを明示します。
2. `/embed.html` 5件は `calculator-locale-top` と `expanded-region-top` のfooter生成元で判断します。日本語専用機能なら遷移先を明示し、locale対応するなら同locale化します。
3. `/en/status/diamond/` の1件は `intl-seo-lp` の生成元で修正します。日本語記事を無印で「Diamond value notes」と案内する現状を残しません。

実修正では、1群ずつ小さいPRに分け、生成→preflight→Chromium→差分確認を行います。監査候補数を単に0へするためのallowlist追加や検査条件緩和は行いません。

## 7. 再生成・証跡

ローカル/CIでの基本コマンドは次です。

```bash
node scripts/navigation-source-map.cjs --write-evidence --evidence-dir <evidence-directory>
```

PR Gateでは `.github/scripts/preflight.cjs` がこの監査を必須phaseとして実行し、repo rootではなくCIの一時evidence領域へ保存します。これにより `.ci-evidence` のような運用ファイルを公開ツリーへ混入させません。

主な生成物:

- `navigation-source-map.json`: 全ページ・全anchor・全metadata・全候補・全pipeline・source signalの完全機械台帳
- `navigation-source-map.md`: 人がレビューしやすい集約レポート
- この文書: 2026-09-17時点の確定baselineと修正順序

## 8. 判定上の注意

`cross-locale-candidate` は「バグ確定」ではありません。明示されていないlocale横断なのでレビューが必要、という意味です。逆に `region-switch`、`locale-switch`、`explicit-locale-fallback` だから無条件に正しいという意味でもありません。次PRでは遷移先内容・localized equivalentの有無・ラベル・生成元を確認します。

修正時は生成済みHTMLを直接直さず、この文書のgenerator ownershipとCI JSONの `generatorSources` を入口に実所有者を特定します。新しいページ群やgeneratorが追加された場合、`unclassifiedGeneratorPages=0` とpipeline/source testが退行を検出するため、台帳を無言で古くしない運用にします。
