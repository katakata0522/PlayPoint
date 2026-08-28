'use strict';

const fs = require('fs');
const path = require('path');
const { replaceDateMetadata } = require('./html-replacements.cjs');

const SIMPLIFIED_CALCULATOR_COPY = Object.freeze({
  en: {
    baseRateLabel: 'Points per $1 (auto-filled, editable)',
    multiplierLabel: 'Promotion special earn rate (e.g. 3 pt / $1)'
  },
  ko: {
    baseRateLabel: '₩1,000당 적립률 (자동 입력·수정 가능)',
    multiplierLabel: '캠페인 특별 적립률 (예: 1,000원당 3pt)'
  },
  tw: {
    baseRateLabel: '每 NT$30 獲得點數（自動帶入，可修改）',
    multiplierLabel: '活動特別獲點率（例：每 NT$30 3 點）'
  }
});

function replaceStaticLanguageText(html, staticText) {
  return html
    .replace(
      /(<([a-z][a-z0-9-]*)\b[^>]*\bdata-lang-key="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/gi,
      (match, openTag, _tagName, key, _content, closeTag) => {
        if (!Object.prototype.hasOwnProperty.call(staticText, key)) return match;
        return `${openTag}${staticText[key]}${closeTag}`;
      }
    )
    .replace(/(<[^>]*\bplaceholder=")[^"]*("[^>]*\bdata-lang-placeholder="([^"]+)"[^>]*>)/g, (match, before, after, key) => {
      if (!Object.prototype.hasOwnProperty.call(staticText, key)) return match;
      return `${before}${staticText[key]}${after}`;
    })
    .replace(/(<[^>]*\baria-label=")[^"]*("[^>]*\bdata-lang-aria="([^"]+)"[^>]*>)/g, (match, before, after, key) => {
      if (!Object.prototype.hasOwnProperty.call(staticText, key)) return match;
      return `${before}${staticText[key]}${after}`;
    });
}

function replaceSimplifiedCalculatorCopy(html, copy) {
  if (!copy) return html;

  return html
    .replace(
      /(<span\b[^>]*\bdata-simplified-calculator-copy="baseRateLabel"[^>]*>)[\s\S]*?(<\/span>)/i,
      (_match, openTag, closeTag) => `${openTag}${copy.baseRateLabel}${closeTag}`
    )
    .replace(
      /(<span\b[^>]*\bdata-simplified-calculator-copy="multiplierLabel"[^>]*>)[\s\S]*?(<\/span>)/i,
      (_match, openTag, closeTag) => `${openTag}${copy.multiplierLabel}${closeTag}`
    );
}

function buildLocalizedHtml(indexHtml, langDir, config) {
  let output = indexHtml;

  if (config.modifiedAt) {
    output = replaceDateMetadata(output, config.modifiedAt, {
      includeEnglish: true,
      includeTraditionalChinese: true
    });
  }

  // 1. html lang 置換（BCP47準拠: dirではなくlangCodeを使用）
  output = output.replace(/<html lang="[^"]+">/, `<html lang="${config.langCode}">`);

  // 著者メタタグの置換
  output = output.replace(/<meta name="author" content="かたかた">/, `<meta name="author" content="${config.authorName}">`);
  // JSON-LD 内の "name": "かたかた" の置換（著者名・パブリッシャー名）
  output = output.replace(/"name": "かたかた"/g, `"name": "${config.authorName}"`);

  // 2. タイトル & description 置換
  output = output.replace(/<title>[^<]+<\/title>/, `<title>${config.title}</title>`);
  output = output.replace(/<meta name="description" content="[^"]+">/g, `<meta name="description" content="${config.description}">`);

  // RSS/Atomの代替フィード名も、JavaScript実行前から各言語のサイト名に合わせる。
  output = output.replace(
    /(<link rel="alternate" type="application\/rss\+xml" title=")[^"]+(" href="https:\/\/playpoint-sim\.com\/feed\.xml">)/,
    `$1${config.appName} RSS$2`
  );
  output = output.replace(
    /(<link rel="alternate" type="application\/atom\+xml" title=")[^"]+(" href="https:\/\/playpoint-sim\.com\/atom\.xml">)/,
    `$1${config.appName} Atom$2`
  );

  // 3. OGP & Twitter tags 置換
  output = output.replace(/(<meta property="og:title" content=")[^"]+(">)/, `<meta property="og:title" content="${config.ogTitle}">`);
  output = output.replace(/(<meta property="og:description" content=")[^"]+(">)/, `<meta property="og:description" content="${config.ogDescription}">`);
  output = output.replace(/(<meta name="twitter:title" content=")[^"]+(">)/, `<meta name="twitter:title" content="${config.ogTitle}">`);
  output = output.replace(/(<meta name="twitter:description" content=")[^"]+(">)/, `<meta name="twitter:description" content="${config.ogDescription}">`);
  output = output.replace(/(<meta property="og:site_name" content=")[^"]+(">)/, `<meta property="og:site_name" content="${config.appName}">`);
  // og:url は各言語版の実URLに置換（SNSシェア・OGP正確性のため必須）
  output = output.replace(
    /(<meta property="og:url" content=")[^"]+(">)/,
    `<meta property="og:url" content="https://playpoint-sim.com/${langDir}/">`
  );

  // 4. canonical & alternate の en/ パス置換
  output = output.replace('<link rel="canonical" href="https://playpoint-sim.com/">', `<link rel="canonical" href="https://playpoint-sim.com/${langDir}/">`);

  // 5. アセットや相対リンクの前に ../ を付与
  const relativeAttrs = [
    'href="favicon.svg"',
    'href="icon-192.png"',
    'href="manifest.json"',
    'href="style.css',
    'href="latest/"',
    'href="attention.html"',
    'href="articles/',
    'href="blog/"',
    'href="privacy.html"',
    'href="terms.html"',
    'href="info.html"',
    'href="about-playpoints.html"',
    'href="embed.html"',
    'href="author/',
    'href="games/"',
    'src="js/',
    'href="js/'
  ];

  relativeAttrs.forEach(attr => {
    const target = attr;
    const replacement = attr.replace('="', '="../');
    output = output.split(target).join(replacement);
  });

  // 海外版では翻訳済み記事一覧へ遷移させ、日本語ブログへ迷い込ませない。
  output = output.replace('href="../blog/" data-lang-key="linkArticles"', 'href="./articles/" data-lang-key="linkArticles"');

  // 6. JSON-LD の置換
  // SoftwareApplication
  output = output.replace(/"name": "(?:Playポイント計算機|Google Play Points 計算機)"/g, `"name": "${config.appName}"`);
  output = output.replace(/"alternateName": "Playポイント計算機"/g, `"alternateName": "${config.alternateName || config.appName}"`);
  // gフラグ付きで全descriptionを置換（SoftwareApplicationのdescriptionが対象）
  output = output.replace(/"description": "[^"]+"/g, `"description": "${config.appDesc}"`);
  output = output.replace(/"priceCurrency": "JPY"/, `"priceCurrency": "${config.currency}"`);
  output = output.replace(/"url": "https:\/\/playpoint-sim\.com\/"/g, `"url": "https://playpoint-sim.com/${langDir}/"`);
  // JSON-LD の inLanguage を各言語版の BCP47 コードに置換
  output = output.replace(/"inLanguage":\s*\[[^\]]+\]/, `"inLanguage": "${config.inLanguage}"`);

  // WebSite
  output = output.replace(/"name": "(?:Play\+?ポイント計算機|Google Play Points 計算機)"/g, `"name": "${config.appName}"`);

  // 7. 言語スイッチのアクティブ状態切り替え
  output = output.replace('<button data-region="JP" class="active">', '<button data-region="JP">');
  const activeBtnTarget = `<button data-region="${config.region}">`;
  const activeBtnReplacement = `<button data-region="${config.region}" class="active">`;
  output = output.replace(activeBtnTarget, activeBtnReplacement);

  // 8. FAQ の JSON-LD & HTML 置換
  output = output.replace(/<!-- FAQ_JSON_LD_START -->[\s\S]*?<!-- FAQ_JSON_LD_END -->/, config.faqJsonLd);
  output = output.replace(/<!-- FAQ_SECTION_START -->[\s\S]*?<!-- FAQ_SECTION_END -->/, config.faqSection);

  // 9. 多言語版では日本語記事ドロワーを削除
  output = output.replace(/<!-- ARTICLE_DRAWER_START -->[\s\S]*?<!-- ARTICLE_DRAWER_END -->/, '');

  // 10. 「できること」セクションの置換
  output = output.replace(/<!-- DESCRIPTION_SECTION_START -->[\s\S]*?<!-- DESCRIPTION_SECTION_END -->/, config.descriptionSection);

  // 11. ファーストビューの静的文言をHTML生成時点で翻訳
  output = replaceStaticLanguageText(output, config.staticText);
  output = replaceSimplifiedCalculatorCopy(output, SIMPLIFIED_CALCULATOR_COPY[langDir]);

  // 12. フッター meta-line の置換
  output = output.replace(/<!-- META_LINE_START -->[\s\S]*?<!-- META_LINE_END -->/, config.metaLine);

  // 13. 商標免責の置換
  if (config.trademarkDisclaimer) {
    output = output.replace(/<!-- TRADEMARK_DISCLAIMER_START -->[\s\S]*?<!-- TRADEMARK_DISCLAIMER_END -->/, config.trademarkDisclaimer);
  }

  return output;
}

function writeLocalizedPages(rootDir, indexHtml, locales) {
  Object.entries(locales).forEach(([langDir, config]) => {
    const targetDir = path.join(rootDir, langDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFile = path.join(targetDir, 'index.html');
    fs.writeFileSync(targetFile, buildLocalizedHtml(indexHtml, langDir, config), 'utf8');
    console.log(`Generated ${targetFile} successfully.`);
  });
}

module.exports = {
  SIMPLIFIED_CALCULATOR_COPY,
  buildLocalizedHtml,
  replaceSimplifiedCalculatorCopy,
  replaceStaticLanguageText,
  writeLocalizedPages
};
