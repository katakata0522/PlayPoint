const https = require('https');
const fs = require('fs');
const path = require('path');

function checkUrl(url) {
    return new Promise((resolve) => {
        const req = https.get(url, { headers: { 'User-Agent': 'HealthChecker/1.0' } }, (res) => {
            let size = 0;
            res.on('data', chunk => size += chunk.length);
            res.on('end', () => {
                resolve({
                    url,
                    statusCode: res.statusCode,
                    contentType: res.headers['content-type'] || '',
                    size,
                    ok: res.statusCode === 200 && size > 0
                });
            });
        });
        req.on('error', (err) => {
            resolve({
                url,
                statusCode: 0,
                contentType: '',
                size: 0,
                error: err.message,
                ok: false
            });
        });
        req.setTimeout(10000, () => {
            req.destroy();
            resolve({
                url,
                statusCode: 0,
                contentType: '',
                size: 0,
                error: 'Timeout',
                ok: false
            });
        });
    });
}

async function run() {
    console.log('====================================================');
    console.log('   PlayPoint Comprehensive Health Check');
    console.log('====================================================\n');

    const criticalUrls = [
        'https://playpoint-sim.com/',
        'https://playpoint-sim.com/js/main.js',
        'https://playpoint-sim.com/js/config.js',
        'https://playpoint-sim.com/js/calculator.js',
        'https://playpoint-sim.com/js/ui.js',
        'https://playpoint-sim.com/js/share.js',
        'https://playpoint-sim.com/js/analytics-core.js',
        'https://playpoint-sim.com/style.css',
        'https://playpoint-sim.com/manifest.json',
        'https://playpoint-sim.com/sw.js',
        'https://playpoint-sim.com/sitemap.xml',
        'https://playpoint-sim.com/feed.xml',
        'https://playpoint-sim.com/atom.xml',
        'https://playpoint-sim.com/robots.txt',
        'https://playpoint-sim.com/favicon.svg',
        'https://playpoint-sim.com/ogp.png',
        'https://playpoint-sim.com/blog/',
        'https://playpoint-sim.com/blog/script.js',
        'https://playpoint-sim.com/blog/style.css',
        'https://playpoint-sim.com/blog/articles.json',
        'https://playpoint-sim.com/articles/article-shared.css',
        'https://playpoint-sim.com/articles/2026-08-24-umamusume-half-anniversary-points.html'
    ];

    console.log('--- 1. Testing Core & Critical Endpoints ---');
    let failedCount = 0;
    for (const url of criticalUrls) {
        const res = await checkUrl(url);
        const statusStr = res.ok ? '✅ PASS' : '❌ FAIL';
        console.log(`${statusStr} [${res.statusCode}] ${res.url} (${res.size} bytes)`);
        if (!res.ok) failedCount++;
    }

    console.log('\n--- 2. Testing All Articles & Thumbnails in articles.json ---');
    const articlesJsonPath = path.join(__dirname, '../blog/articles.json');
    const articles = JSON.parse(fs.readFileSync(articlesJsonPath, 'utf8'));
    console.log(`Checking ${articles.length} articles from articles.json...`);

    let articleFails = 0;
    let thumbFails = 0;

    for (const a of articles) {
        // Test article file
        if (a.file && a.file.startsWith('../')) {
            const articleUrl = 'https://playpoint-sim.com/' + a.file.replace(/^\.\.\//, '');
            const res = await checkUrl(articleUrl);
            if (!res.ok) {
                console.log(`❌ Article FAIL [${res.statusCode}]: ${articleUrl}`);
                articleFails++;
            }
        }

        // Test thumbnail
        if (a.thumbnail && a.thumbnail.startsWith('../')) {
            const thumbUrl = 'https://playpoint-sim.com/' + a.thumbnail.replace(/^\.\.\//, '');
            const res = await checkUrl(thumbUrl);
            if (!res.ok) {
                console.log(`❌ Thumbnail FAIL [${res.statusCode}]: ${thumbUrl}`);
                thumbFails++;
            }
        }
    }

    console.log('\n====================================================');
    console.log('   Health Check Summary');
    console.log('====================================================');
    console.log(`Total Articles Tested: ${articles.length}`);
    console.log(`Critical URL Failures: ${failedCount}`);
    console.log(`Article Page Failures: ${articleFails}`);
    console.log(`Thumbnail Failures:    ${thumbFails}`);
    console.log(`Overall Result:        ${(failedCount + articleFails + thumbFails === 0) ? '🎉 ALL 100% HEALTHY' : '⚠️ ISSUES DETECTED'}`);
}

run();
