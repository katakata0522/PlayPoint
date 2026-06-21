'use strict';

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../index.html');
const indexHtml = fs.readFileSync(sourcePath, 'utf8');

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
        appDesc: 'A simulation tool to calculate required spending to reach Google Play Points goals (Diamond, Platinum, etc.) based on your current status.'
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
        appDesc: '구글 플레이 포인트의 현재 등급에서 목표 등급까지 필요한 결제 금액을 계산할 수 있는 도구입니다.'
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
        appDesc: '本工具可協助計算從目前等級達到 Google Play 點數目標等級所需的消費金額。'
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
        'src="js/'
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

    const targetFile = path.join(targetDir, 'index.html');
    fs.writeFileSync(targetFile, output, 'utf8');
    console.log(`Generated ${targetFile} successfully.`);
});
