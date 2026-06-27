'use strict';

const fs = require('fs');
const path = require('path');
const { syncServiceWorkerAssets } = require('./asset-sync.cjs');
const { syncIndexMetadata } = require('./build-metadata.cjs');
const { createLocales } = require('./locale-config.cjs');
const { generateBlogFeeds } = require('./blog-feeds.cjs');
const { syncedHtmlFiles } = require('./build-targets.cjs');
const { syncHtmlFiles } = require('./html-sync.cjs');
const { syncSitemap } = require('./sitemap-sync.cjs');

const rootDir = path.join(__dirname, '..');

function replaceStaticLanguageText(html, staticText) {
    return html.replace(
        /(<(h1|p|button)\b[^>]*\bdata-lang-key="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
        (match, openTag, _tagName, key, _content, closeTag) => {
            if (!Object.prototype.hasOwnProperty.call(staticText, key)) return match;
            return `${openTag}${staticText[key]}${closeTag}`;
        }
    );
}

const { assetVersion, indexHtml, todayStr } = syncIndexMetadata(rootDir);
const locales = createLocales(todayStr);

Object.entries(locales).forEach(([langDir, config]) => {
    const targetDir = path.join(__dirname, '../', langDir);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    let output = indexHtml;

    // 1. html lang 置換（BCP47準拠: dirではなくlangCodeを使用）
    output = output.replace(/<html lang="[^"]+">/, `<html lang="${config.langCode}">`);

    // 著者メタタグの置換
    output = output.replace(/<meta name="author" content="かたかた">/, `<meta name="author" content="${config.authorName}">`);
    // JSON-LD 内の "name": "かたかた" の置換（著者名・パブリッシャー名）
    output = output.replace(/"name": "かたかた"/g, `"name": "${config.authorName}"`);

    // 2. タイトル & description 置換
    output = output.replace(/<title>[^<]+<\/title>/, `<title>${config.title}</title>`);
    output = output.replace(/<meta name="description" content="[^"]+">/g, `<meta name="description" content="${config.description}">`);

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
        'href="attention.html"',
        'href="articles/',
        'href="blog/"',
        'href="privacy.html"',
        'href="terms.html"',
        'href="info.html"',
        'href="about-playpoints.html"',
        'href="author/',
        'src="js/',
        'href="js/'
    ];

    relativeAttrs.forEach(attr => {
        const target = attr;
        const replacement = attr.replace('="', '="../');
        output = output.split(target).join(replacement);
    });

    // 6. JSON-LD の置換
    // SoftwareApplication
    output = output.replace(/"name": "Playポイント計算機"/g, `"name": "${config.appName}"`);
    // gフラグ付きで全descriptionを置換（SoftwareApplicationのdescriptionが対象）
    output = output.replace(/"description": "[^"]+"/g, `"description": "${config.appDesc}"`);
    output = output.replace(/"priceCurrency": "JPY"/, `"priceCurrency": "${config.currency}"`);
    output = output.replace(/"url": "https:\/\/playpoint-sim\.com\/"/g, `"url": "https://playpoint-sim.com/${langDir}/"`);
    // JSON-LD の inLanguage を各言語版の BCP47 コードに置換
    output = output.replace(/"inLanguage":\s*\[[^\]]+\]/, `"inLanguage": "${config.inLanguage}"`);

    // WebSite
    output = output.replace(/"name": "Play\+?ポイント計算機"/g, `"name": "${config.appName}"`);

    // 7. 言語スイッチのアクティブ状態切り替え
    output = output.replace('<button data-region="JP" class="active">日本語</button>', '<button data-region="JP">日本語</button>');
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

    // 12. フッター meta-line の置換
    output = output.replace(/<!-- META_LINE_START -->[\s\S]*?<!-- META_LINE_END -->/, config.metaLine);

    const targetFile = path.join(targetDir, 'index.html');
    fs.writeFileSync(targetFile, output, 'utf8');
    console.log(`Generated ${targetFile} successfully.`);
});

const assetVersions = syncServiceWorkerAssets(rootDir, assetVersion, todayStr, indexHtml);

syncHtmlFiles(rootDir, syncedHtmlFiles, assetVersions, todayStr);

syncSitemap(rootDir, todayStr);

generateBlogFeeds(rootDir);
