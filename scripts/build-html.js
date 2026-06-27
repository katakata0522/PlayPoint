'use strict';

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../index.html');
let indexHtml = fs.readFileSync(sourcePath, 'utf8');

function replaceStaticLanguageText(html, staticText) {
    return html.replace(
        /(<(h1|p|button)\b[^>]*\bdata-lang-key="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
        (match, openTag, _tagName, key, _content, closeTag) => {
            if (!Object.prototype.hasOwnProperty.call(staticText, key)) return match;
            return `${openTag}${staticText[key]}${closeTag}`;
        }
    );
}

// 現在の日本時間 (JST) の日付を取得して index.html の日付メタデータを自動同期
const now = new Date();
const jstOffset = 9 * 60 * 60 * 1000;
const jstDate = new Date(now.getTime() + jstOffset);
const forcedModifiedDate = process.env.PLAYPOINT_MODIFIED_DATE || '';
const forcedAssetVersion = process.env.PLAYPOINT_ASSET_VERSION || '';
const yyyy = forcedModifiedDate ? Number(forcedModifiedDate.slice(0, 4)) : jstDate.getUTCFullYear();
const mm = forcedModifiedDate ? forcedModifiedDate.slice(5, 7) : String(jstDate.getUTCMonth() + 1).padStart(2, '0');
const dd = forcedModifiedDate ? forcedModifiedDate.slice(8, 10) : String(jstDate.getUTCDate()).padStart(2, '0');
const hh = String(jstDate.getUTCHours()).padStart(2, '0');
const min = String(jstDate.getUTCMinutes()).padStart(2, '0');
const todayStr = `${yyyy}-${mm}-${dd}`;

indexHtml = indexHtml.replace(/<meta name="last-modified" content="[^"]+">/, `<meta name="last-modified" content="${todayStr}">`);
indexHtml = indexHtml.replace(/<meta property="article:modified_time" content="[^"]+">/, `<meta property="article:modified_time" content="${todayStr}T00:00:00+09:00">`);
indexHtml = indexHtml.replace(/"dateModified": "[^"]+"/, `"dateModified": "${todayStr}"`);
indexHtml = indexHtml.replace(/最終更新: \d{4}-\d{2}-\d{2}/, `最終更新: ${todayStr}`);

// 現在の日本時間 (JST) に基づくアセットバージョンを生成 (例: 20260622_2300)
const assetVersion = forcedAssetVersion || `${yyyy}${mm}${dd}_${hh}${min}`;

// index.html のアセットバージョンクエリを自動更新 (バンプ)
indexHtml = indexHtml.replace(/style\.css\?v=[a-zA-Z0-9_-]+/g, `style.css?v=${assetVersion}a`);
indexHtml = indexHtml.replace(/js\/main\.js\?v=[a-zA-Z0-9_-]+/g, `js/main.js?v=${assetVersion}a`);
indexHtml = indexHtml.replace(/js\/third-party\.js\?v=[a-zA-Z0-9_-]+/g, `js/third-party.js?v=${assetVersion}a`);
indexHtml = indexHtml.replace(/blog\/components\.js\?v=[a-zA-Z0-9_-]+/g, `blog/components.js?v=${assetVersion}a`);

// 置換後の HTML を上書き保存
fs.writeFileSync(sourcePath, indexHtml, 'utf8');
console.log(`Synchronized dates and asset versions (v=${assetVersion}a) in index.html`);

const locales = {
    'en': {
        region: 'US',
        langCode: 'en',           // BCP47 言語コード（lang属性・inLanguageに使用）
        inLanguage: 'en',
        title: 'Play Point Calculator - Google Play Points | How much to level up?',
        description: 'Google Play Points level-up calculator. Calculate how much you need to spend to reach Bronze, Silver, Gold, Platinum, or Diamond, including campaign boosts and weekly reward logs.',
        ogTitle: 'Play Point Calculator - Google Play Points | How much to level up?',
        ogDescription: 'Calculate Play Points level-up requirements, reverse calculations, and point boost campaigns for free.',
        currency: 'USD',
        appName: 'Play Points Calculator',
        appDesc: 'A simulation tool to calculate required spending to reach Google Play Points goals (Diamond, Platinum, etc.) based on your current status.',
        staticText: {
            mainTitle: 'Play Points Calculator',
            siteDescription: 'Calculate how much you need to spend to reach your goal status!<br>Also, calculate how many points you can earn from your spending!',
            tabMain: 'Standard',
            tabReverse: 'Reverse',
            tabDiary: 'Weekly Awards Diary'
        },
        faqJsonLd: `    <!-- FAQ_JSON_LD_START -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How is the spending goal calculated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "By inputting your current points and target status, we calculate the required spending based on your base point rate and any active multiplier campaigns."
          }
        },
        {
          "@type": "Question",
          "name": "What is the reverse calculation mode?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "By inputting the spending amount, the tool simulates the expected points you will earn based on your current status and campaign settings."
          }
        },
        {
          "@type": "Question",
          "name": "Is my weekly reward diary data saved?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The data you enter is only saved in your browser's local storage. You can export it as a JSON file or restore it to prevent data loss due to cache clearance."
          }
        }
      ]
    }
    </script>
    <!-- FAQ_JSON_LD_END -->`,
        faqSection: `    <!-- FAQ_SECTION_START -->
    <section class="section">
        <h2>❓ Frequently Asked Questions (FAQ)</h2>
        <div class="faq-item">
            <h3>Q. How is the spending goal calculated?</h3>
            <p>A. By inputting your current points and target status, we calculate the required spending based on your base point rate and any active multiplier campaigns.</p>
        </div>
        <div class="faq-item">
            <h3>Q. What is the reverse calculation mode?</h3>
            <p>A. By inputting the spending amount, the tool simulates the expected points you will earn based on your current status and campaign settings.</p>
        </div>
        <div class="faq-item">
            <h3>Q. Is my weekly reward diary data saved?</h3>
            <p>A. The data you enter is only saved in your browser's local storage. You can export it as a JSON file or restore it to prevent data loss due to cache clearance.</p>
        </div>
    </section>
    <!-- FAQ_SECTION_END -->`,
        descriptionSection: `    <!-- DESCRIPTION_SECTION_START -->
    <section class="section">
        <h2>What You Can Do with Play Points Calculator</h2>
        <p>On this page, you can check <strong>how much you need to level up</strong>, <strong>how many points you can earn with your current spending</strong>, and <strong>how advantageous it will be during multiplier campaigns</strong>.</p>
        <p>This is especially helpful when you want to make decisions based on numbers rather than intuition, such as "just a little more to Platinum," "want to know if I can reach Diamond," or "wondering if I should wait for a point boost campaign."</p>
        <ul>
            <li>Estimate the required spending to reach Platinum or Diamond status.</li>
            <li>Compare base rewards and campaign multiplier rates for reverse calculations.</li>
            <li>Manage your weekly earned points manually in the Weekly Reward Diary.</li>
        </ul>
    </section>
    <!-- DESCRIPTION_SECTION_END -->`,
        metaLine: `        <!-- META_LINE_START -->
        <p class="meta-line">Operator: <a href="../author/katakata.html" rel="author">katakata</a> / Last Updated: ${todayStr}</p>
        <!-- META_LINE_END -->`,
        authorName: 'katakata'
    },
    'ko': {
        region: 'KR',
        langCode: 'ko',           // BCP47 言語コード
        inLanguage: 'ko',
        title: '구글 플레이 포인트 계산기 - Play Point Calculator | 등급 업까지 얼마 남았지?',
        description: '구글 플레이 포인트 등급 달성 계산기. 실버, 골드, 플래티넘, 다이아몬드 등급까지 필요한 결제 금액을 환율과 보너스 이벤트에 맞춰 시뮬레이션합니다.',
        ogTitle: '구글 플레이 포인트 계산기 - Play Point Calculator | 등급 업까지 얼마 남았지?',
        ogDescription: '구글 플레이 포인트 등급 달성 조건 및 획득 포인트를 무료로 시뮬레이션하는 계산기입니다.',
        currency: 'KRW',
        appName: '구글 플레이 포인트 계산기',
        appDesc: '구글 플레이 포인트의 현재 등급에서 목표 등급까지 필요한 결제 금액을 계산할 수 있는 도구입니다.',
        staticText: {
            mainTitle: '구글 플레이 포인트 계산기',
            siteDescription: '현재 등급에서 목표 등급까지 필요한 결제 금액을 계산할 수 있습니다!<br>결제 금액으로 획득할 수 있는 포인트도 계산 가능합니다!',
            tabMain: '일반 계산',
            tabReverse: '역산 모드',
            tabDiary: '주간 리워드 일기'
        },
        faqJsonLd: `    <!-- FAQ_JSON_LD_START -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "등급 달성 계산은 어떻게 진행되나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "현재 상태와 목표 등급까지 부족한 포인트를 입력하면, 기본 적립률 및 보너스 이벤트 배율에 따라 필요한 결제 금액을 산출합니다."
          }
        },
        {
          "@type": "Question",
          "name": "역산 모드는 무엇인가요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "결제할 금액을 입력하면, 현재 등급 및 보너스 이벤트 설정에 따라 획득 예상 포인트를 시뮬레이션합니다."
          }
        },
        {
          "@type": "Question",
          "name": "주간 리워드 일지 데이터는 저장되나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "입력하신 데이터는 브라우저의 로컬 스토리지에만 저장됩니다. 캐시 삭제에 대비해 JSON 파일로 내보내기(백업) 및 복원이 가능합니다."
          }
        }
      ]
    }
    </script>
    <!-- FAQ_JSON_LD_END -->`,
        faqSection: `    <!-- FAQ_SECTION_START -->
    <section class="section">
        <h2>❓ 자주 묻는 질문 (FAQ)</h2>
        <div class="faq-item">
            <h3>Q. 등급 달성 계산은 어떻게 진행되나요?</h3>
            <p>A. 현재 상태와 목표 등급까지 부족한 포인트를 입력하면, 기본 적립률 및 보너스 이벤트 배율에 따라 필요한 결제 금액을 산출합니다.</p>
        </div>
        <div class="faq-item">
            <h3>Q. 역산 모드는 무엇인가요?</h3>
            <p>A. 결제할 금액을 입력하면, 현재 등급 및 보너스 이벤트 설정에 따라 획득 예상 포인트를 시뮬레이션합니다.</p>
        </div>
        <div class="faq-item">
            <h3>Q. 주간 리워드 일지 데이터는 저장되나요?</h3>
            <p>A. 입력하신 데이터는 브라우저의 로컬 스토리지에만 저장됩니다. 캐시 삭제에 대비해 JSON 파일로 내보내기(백업) 및 복원이 가능합니다.</p>
        </div>
    </section>
    <!-- FAQ_SECTION_END -->`,
        descriptionSection: `    <!-- DESCRIPTION_SECTION_START -->
    <section class="section">
        <h2>구글 플레이 포인트 계산기로 할 수 있는 것</h2>
        <p>이 페이지에서는 구글 플레이 포인트의 <strong>등급 업까지 필요한 결제 금액</strong>, <strong>현재 결제 금액으로 획득 가능한 포인트</strong>, <strong>이벤트 시 얼마나 더 이득인지</strong>를 한눈에 확인할 수 있습니다.</p>
        <p>특히 '플래티넘까지 조금 남았을 때', '다이아몬드 달성 가능 여부를 알고 싶을 때', '포인트 증량 이벤트를 기다려야 할지 고민될 때' 감이 아닌 숫자로 쉽게 판단할 수 있도록 도와줍니다.</p>
        <ul>
            <li>플래티넘, 다이아몬드 등급 달성에 필요한 결제 금액 시뮬레이션</li>
            <li>기본 적립률과 이벤트 배율을 비교하면서 획득 포인트 역산</li>
            <li>주간 리워드 일기로 매주 획득한 포인트를 편리하게 관리</li>
        </ul>
    </section>
    <!-- DESCRIPTION_SECTION_END -->`,
        metaLine: `        <!-- META_LINE_START -->
        <p class="meta-line">운영자: <a href="../author/katakata.html" rel="author">katakata</a> / 최종 업데이트: ${todayStr}</p>
        <!-- META_LINE_END -->`,
        authorName: 'katakata'
    },
    'tw': {
        region: 'TW',
        langCode: 'zh-TW',        // BCP47 言語コード（"tw" は非標準のため必ず zh-TW を使用）
        inLanguage: 'zh-TW',
        title: 'Google Play 點數計算器 - Play Point Calculator | 距離升級還差多少？',
        description: 'Google Play 點數等級計算器。計算達到銀級、金級、白金級、鑽石級所需的消費金額，支援倍率活動與每週獎勵紀錄。',
        ogTitle: 'Google Play 點數計算器 - Play Point Calculator | 距離升級還差多少？',
        ogDescription: '免費模擬 Google Play 點數升級需求、逆算模式與加倍活動的點數試算工具。',
        currency: 'TWD',
        appName: 'Google Play 點數計算器',
        appDesc: '本工具可協助計算從目前等級達到 Google Play 點數目標等級所需的消費金額。',
        staticText: {
            mainTitle: 'Google Play 點數計算器',
            siteDescription: '可以計算從目前等級達到目標等級所需的消費金額！<br>還能計算消費金額可獲得的預估點數！',
            tabMain: '一般計算',
            tabReverse: '逆算模式',
            tabDiary: '每週獎勵日記'
        },
        faqJsonLd: `    <!-- FAQ_JSON_LD_START -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "升級目標的消費金額是如何計算的？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "輸入目前的點數與目標等級所需的點數後，系統會根據您目前的基本回饋率及加倍活動倍率，計算出所需的消費金額。"
          }
        },
        {
          "@type": "Question",
          "name": "什麼是逆算模式？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "輸入預計消費的金額後，系統會根據目前的等級與活動設定，估算您可獲得的預期點數。"
          }
        },
        {
          "@type": "Question",
          "name": "每週獎勵紀錄的資料會被儲存嗎？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "您輸入的資料僅會儲存在瀏覽器的本機儲存空間（Local Storage）中。為了防止因清除快取而遺失資料，您可以將資料匯出為 JSON 檔案或進行還原。"
          }
        }
      ]
    }
    </script>
    <!-- FAQ_JSON_LD_END -->`,
        faqSection: `    <!-- FAQ_SECTION_START -->
    <section class="section">
        <h2>❓ 常見問題 (FAQ)</h2>
        <div class="faq-item">
            <h3>Q. 升級目標的消費金額是如何計算的？</h3>
            <p>A. 輸入目前的點數與目標等級所需的點數後，系統會根據您目前的基本回饋率及加倍活動倍率，計算出所需的消費金額。</p>
        </div>
        <div class="faq-item">
            <h3>Q. 什麼是逆算模式？</h3>
            <p>A. 輸入預計消費的金額後，系統會根據目前的等級與活動設定，估算您可獲得的預期點數。</p>
        </div>
        <div class="faq-item">
            <h3>Q. 每週獎勵紀錄的資料會被儲存嗎？</h3>
            <p>A. 您輸入的資料僅會儲存在瀏覽器的本機儲存空間（Local Storage）中。為了防止因清除快取而遺失資料，您可以將資料匯出為 JSON 檔案或進行還原。</p>
        </div>
    </section>
    <!-- FAQ_SECTION_END -->`,
        descriptionSection: `    <!-- DESCRIPTION_SECTION_START -->
    <section class="section">
        <h2>Google Play 點數計算器可以做什麼？</h2>
        <p>在此頁面中，您可以確認 <strong>距離升級還差多少消費金額</strong>、<strong>以目前的消費額可以獲得多少點數</strong>，以及 <strong>在點數加倍活動期間能多獲得多少點數</strong>。</p>
        <p>特別是在「距離白金級還差一點點」、「想知道是否能達到鑽石級」或「正在猶豫是否要等待點數加倍活動」時，能協助您以具體數字而非憑感覺進行判斷。</p>
        <ul>
            <li>估算達到白金級、鑽石級所需的消費金額。</li>
            <li>比較基本回饋與活動加倍倍率，進行點數逆算。</li>
            <li>利用每週獎勵日記，在手邊輕鬆記錄與管理每週獲得的點數。</li>
        </ul>
    </section>
    <!-- DESCRIPTION_SECTION_END -->`,
        metaLine: `        <!-- META_LINE_START -->
        <p class="meta-line">營運者: <a href="../author/katakata.html" rel="author">katakata</a> / 最後更新: ${todayStr}</p>
        <!-- META_LINE_END -->`,
        authorName: 'katakata'
    }
};

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

// ==========================================
// 10. アセットバージョンの抽出処理
// ==========================================
// index.html から CSS や JS のバージョンクエリ（例: style.css?v=XXXX）を抽出
const cssQueryMatch = indexHtml.match(/style\.css\?v=([a-zA-Z0-9_-]+)/);
const cssVersion = cssQueryMatch ? cssQueryMatch[1] : '';

let consentVersion = '';
const tempSwPath = path.join(__dirname, '../sw.js');
if (fs.existsSync(tempSwPath)) {
    const tempSwContent = fs.readFileSync(tempSwPath, 'utf8');
    const swConsentMatch = tempSwContent.match(/\.\/js\/consent\.js\?v=([a-zA-Z0-9_-]+)/);
    if (swConsentMatch) consentVersion = swConsentMatch[1];
}
if (!consentVersion) {
    const consentQueryMatch = indexHtml.match(/js\/consent\.js\?v=([a-zA-Z0-9_-]+)/);
    consentVersion = consentQueryMatch ? consentQueryMatch[1] : '';
}

const mainQueryMatch = indexHtml.match(/js\/main\.js\?v=([a-zA-Z0-9_-]+)/);
const mainVersion = mainQueryMatch ? mainQueryMatch[1] : '';

const thirdPartyQueryMatch = indexHtml.match(/js\/third-party\.js\?v=([a-zA-Z0-9_-]+)/);
const thirdPartyVersion = thirdPartyQueryMatch ? thirdPartyQueryMatch[1] : '';
const intentTrackingVersion = thirdPartyVersion || mainVersion || cssVersion;

// blog/index.html からクエリを抽出
const blogIndexPath = path.join(__dirname, '../blog/index.html');
let blogCssVersion = '';
let blogScriptVersion = '';
let blogComponentsVersion = '';
if (fs.existsSync(blogIndexPath)) {
    const blogHtml = fs.readFileSync(blogIndexPath, 'utf8');
    const blogCssMatch = blogHtml.match(/style\.css\?v=([a-zA-Z0-9_-]+)/);
    if (blogCssMatch) blogCssVersion = blogCssMatch[1];
    const blogScriptMatch = blogHtml.match(/script\.js\?v=([a-zA-Z0-9_-]+)/);
    if (blogScriptMatch) blogScriptVersion = blogScriptMatch[1];
    const blogComponentsMatch = blogHtml.match(/components\.js\?v=([a-zA-Z0-9_-]+)/);
    if (blogComponentsMatch) blogComponentsVersion = blogComponentsMatch[1];
}

// 代表的な記事ファイルから article-shared.css のクエリを抽出
const articlePath = path.join(__dirname, '../articles/2026-06-20-discount-gift-cards.html');
let articleSharedCssVersion = '';
if (fs.existsSync(articlePath)) {
    const articleHtml = fs.readFileSync(articlePath, 'utf8');
    const articleSharedCssMatch = articleHtml.match(/article-shared\.css\?v=([a-zA-Z0-9_-]+)/);
    if (articleSharedCssMatch) articleSharedCssVersion = articleSharedCssMatch[1];
}

// ==========================================
// 10.1 sw.js (Service Worker) のキャッシュ自動更新・同期処理
// ==========================================
const swPath = path.join(__dirname, '../sw.js');
if (fs.existsSync(swPath)) {
    let swContent = fs.readFileSync(swPath, 'utf8');

    // CACHE_NAME をビルド時の日付・時間に基づいて一意に更新
    const newCacheName = `playpoint-calc-v${assetVersion}`;
    swContent = swContent.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = '${newCacheName}';`);

    // ASSETS 内のバージョンパラメータを index.html と自動同期
    if (cssVersion) {
        swContent = swContent.replace(/\.\/style\.css\?v=[a-zA-Z0-9_-]+/g, `./style.css?v=${cssVersion}`);
    }
    if (consentVersion) {
        swContent = swContent.replace(/\.\/js\/consent\.js\?v=[a-zA-Z0-9_-]+/g, `./js/consent.js?v=${consentVersion}`);
    }
    if (thirdPartyVersion) {
        swContent = swContent.replace(/\.\/js\/third-party\.js\?v=[a-zA-Z0-9_-]+/g, `./js/third-party.js?v=${thirdPartyVersion}`);
    }
    if (intentTrackingVersion) {
        swContent = swContent.replace(/\.\/js\/intent-tracking\.js\?v=[a-zA-Z0-9_-]+/g, `./js/intent-tracking.js?v=${intentTrackingVersion}`);
    }
    if (blogCssVersion) {
        swContent = swContent.replace(/\.\/blog\/style\.css\?v=[a-zA-Z0-9_-]+/g, `./blog/style.css?v=${blogCssVersion}`);
    }
    if (blogScriptVersion) {
        swContent = swContent.replace(/\.\/blog\/script\.js\?v=[a-zA-Z0-9_-]+/g, `./blog/script.js?v=${blogScriptVersion}`);
    }
    if (blogComponentsVersion) {
        swContent = swContent.replace(/\.\/blog\/components\.js\?v=[a-zA-Z0-9_-]+/g, `./blog/components.js?v=${blogComponentsVersion}`);
    }
    if (articleSharedCssVersion) {
        swContent = swContent.replace(/\.\/articles\/article-shared\.css\?v=[a-zA-Z0-9_-]+/g, `./articles/article-shared.css?v=${articleSharedCssVersion}`);
    }
    if (mainVersion) {
        swContent = swContent.replace(/\.\/js\/main\.js\?v=[a-zA-Z0-9_-]+/g, `./js/main.js?v=${mainVersion}`);
    }

    fs.writeFileSync(swPath, swContent, 'utf8');
    console.log(`Successfully synchronized sw.js cache. CACHE_NAME=${newCacheName}`);
}

// ==========================================
// 10.2 kindle-tracker/sw.js のキャッシュ自動更新・同期処理
// ==========================================
const kindleSwPath = path.join(__dirname, '../kindle-tracker/sw.js');
if (fs.existsSync(kindleSwPath)) {
    let swContent = fs.readFileSync(kindleSwPath, 'utf8');

    // CACHE_NAME をビルド時の日付・時間に基づいて一意に更新
    const newKindleCacheName = `kindle-tracker-v${assetVersion}`;
    swContent = swContent.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = '${newKindleCacheName}';`);

    fs.writeFileSync(kindleSwPath, swContent, 'utf8');
    console.log(`Successfully synchronized kindle-tracker/sw.js cache. CACHE_NAME=${newKindleCacheName}`);
}

// ==========================================
// 10.3 kindle-tracker/index.html のアセットバージョン・日付自動同期処理
// ==========================================
const kindleIndexPath = path.join(__dirname, '../kindle-tracker/index.html');
if (fs.existsSync(kindleIndexPath)) {
    let content = fs.readFileSync(kindleIndexPath, 'utf8');

    // style.css?v=... の同期
    content = content.replace(/style\.css\?v=[a-zA-Z0-9_-]+/g, `style.css?v=${assetVersion}a`);
    // app.js?v=... の同期
    content = content.replace(/app\.js\?v=[a-zA-Z0-9_-]+/g, `app.js?v=${assetVersion}a`);

    // 日付メタデータ・最終更新日の同期
    content = content.replace(/<meta name="last-modified" content="[^"]+">/g, `<meta name="last-modified" content="${todayStr}">`);
    content = content.replace(/<meta property="article:modified_time" content="[^"]+">/g, `<meta property="article:modified_time" content="${todayStr}T00:00:00+09:00">`);
    content = content.replace(/"dateModified": "[^"]+"/, `"dateModified": "${todayStr}"`);
    content = content.replace(/最終更新: \d{4}-\d{2}-\d{2}/g, `最終更新: ${todayStr}`);

    fs.writeFileSync(kindleIndexPath, content, 'utf8');
    console.log(`Successfully synchronized asset versions and dates in kindle-tracker/index.html`);
}

// ==========================================
// 10.5. third-party.js 内の consent.js バージョン自動同期処理
// ==========================================
const thirdPartyJsPath = path.join(__dirname, '../js/third-party.js');
if (fs.existsSync(thirdPartyJsPath) && consentVersion) {
    let tpContent = fs.readFileSync(thirdPartyJsPath, 'utf8');
    tpContent = tpContent.replace(/js\/consent\.js\?v=[a-zA-Z0-9_-]+/g, `js/consent.js?v=${consentVersion}`);
    fs.writeFileSync(thirdPartyJsPath, tpContent, 'utf8');
    console.log(`Successfully synchronized consent.js version in third-party.js to v=${consentVersion}`);
}

// ==========================================
// 10.7. 他の全HTMLファイルのアセットバージョン・日付情報の自動同期処理
// ==========================================
const htmlFiles = [
    'about-playpoints.html',
    'info.html',
    'changelog.html',
    'attention.html',
    'privacy.html',
    'terms.html',
    'sitemap.html',
    'embed.html',
    'status/diamond/index.html',
    'status/platinum/index.html',
    'maintenance/platinum/index.html',
    'campaign/2x/index.html',
    'campaign/3x/index.html',
    'amount/10000/index.html',
    'en/articles/2026-06-20-discount-gift-cards.html',
    'ko/articles/2026-06-20-discount-gift-cards.html',
    'tw/articles/2026-06-20-discount-gift-cards.html'
];

htmlFiles.forEach(file => {
    const filePath = path.join(__dirname, '../', file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // style.css?v=... の同期
        if (cssVersion) {
            content = content.replace(/style\.css\?v=[a-zA-Z0-9_-]+/g, `style.css?v=${cssVersion}`);
        }
        // third-party.js?v=... の同期
        if (thirdPartyVersion) {
            content = content.replace(/third-party\.js\?v=[a-zA-Z0-9_-]+/g, `third-party.js?v=${thirdPartyVersion}`);
        }
        // intent-tracking.js?v=... の同期
        if (intentTrackingVersion) {
            content = content.replace(/intent-tracking\.js\?v=[a-zA-Z0-9_-]+/g, `intent-tracking.js?v=${intentTrackingVersion}`);
        }
        // article-shared.css?v=... の同期
        if (articleSharedCssVersion) {
            content = content.replace(/article-shared\.css\?v=[a-zA-Z0-9_-]+/g, `article-shared.css?v=${articleSharedCssVersion}`);
        }
        
        // 日付メタデータ・最終更新日の同期
        content = content.replace(/<meta name="last-modified" content="[^"]+">/g, `<meta name="last-modified" content="${todayStr}">`);
        content = content.replace(/<meta property="article:modified_time" content="[^"]+">/g, `<meta property="article:modified_time" content="${todayStr}T00:00:00+09:00">`);
        content = content.replace(/"dateModified": "[^"]+"/g, `"dateModified": "${todayStr}"`);
        content = content.replace(/最終更新: \d{4}-\d{2}-\d{2}/g, `最終更新: ${todayStr}`);
        content = content.replace(/Last Modified: \d{4}-\d{2}-\d{2}/g, `Last Modified: ${todayStr}`);
        content = content.replace(/最後更新: \d{4}-\d{2}-\d{2}/g, `最後更新: ${todayStr}`);
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Successfully synchronized asset versions and dates in ${file}`);
    }
});

// ==========================================
// 11. sitemap.xml の改行コード LF 統一処理 + トップページ lastmod 自動更新
// ==========================================
const sitemapPath = path.join(__dirname, '../sitemap.xml');
if (fs.existsSync(sitemapPath)) {
    let sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    // CRLF を LF に統一
    sitemapContent = sitemapContent.replace(/\r\n/g, '\n');
    // 最終行が改行で終わっていない場合は改行を追加
    if (!sitemapContent.endsWith('\n')) {
        sitemapContent += '\n';
    }
    // トップページ・各言語版トップの lastmod を今日の日付に自動更新
    const topPageUrls = [
        'https://playpoint-sim.com/',
        'https://playpoint-sim.com/en/',
        'https://playpoint-sim.com/ko/',
        'https://playpoint-sim.com/tw/',
    ];
    topPageUrls.forEach(url => {
        // URLの直後に続くlastmodタグだけを置換（他の記事のlastmodを誤更新しない）
        const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(<loc>${escapedUrl}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`);
        sitemapContent = sitemapContent.replace(pattern, `$1${todayStr}$2`);
    });
    fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');
    console.log(`Successfully unified sitemap.xml line endings to LF and updated top-page lastmod to ${todayStr}.`);
}
