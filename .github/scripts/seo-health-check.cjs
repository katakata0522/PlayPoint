const BASE_URL = 'https://playpoint-sim.com';
const FETCH_TIMEOUT_MS = 30000;

const pageUrls = [
  `${BASE_URL}/`,
  `${BASE_URL}/about-playpoints.html`,
  `${BASE_URL}/info.html`,
  `${BASE_URL}/privacy.html`,
  `${BASE_URL}/terms.html`,
  `${BASE_URL}/attention.html`,
  `${BASE_URL}/sitemap.html`,
  `${BASE_URL}/status/diamond/`,
  `${BASE_URL}/status/platinum/`,
  `${BASE_URL}/status/gold/`,
  `${BASE_URL}/status/silver/`,
  `${BASE_URL}/maintenance/platinum/`,
  `${BASE_URL}/maintenance/diamond/`,
  `${BASE_URL}/campaign/2x/`,
  `${BASE_URL}/campaign/3x/`,
  `${BASE_URL}/campaign/wait/`,
  `${BASE_URL}/amount/10000/`,
  `${BASE_URL}/en/status/diamond/`,
  `${BASE_URL}/en/status/platinum/`,
  `${BASE_URL}/en/status/gold/`,
  `${BASE_URL}/en/status/silver/`,
  `${BASE_URL}/en/campaign/2x/`,
  `${BASE_URL}/en/campaign/3x/`,
  `${BASE_URL}/en/campaign/wait/`,
  `${BASE_URL}/en/amount/10000/`,
  `${BASE_URL}/ko/status/diamond/`,
  `${BASE_URL}/ko/status/platinum/`,
  `${BASE_URL}/ko/status/gold/`,
  `${BASE_URL}/ko/status/silver/`,
  `${BASE_URL}/ko/campaign/2x/`,
  `${BASE_URL}/ko/campaign/3x/`,
  `${BASE_URL}/ko/campaign/wait/`,
  `${BASE_URL}/ko/amount/10000/`,
  `${BASE_URL}/tw/status/diamond/`,
  `${BASE_URL}/tw/status/platinum/`,
  `${BASE_URL}/tw/status/gold/`,
  `${BASE_URL}/tw/status/silver/`,
  `${BASE_URL}/tw/campaign/2x/`,
  `${BASE_URL}/tw/campaign/3x/`,
  `${BASE_URL}/tw/campaign/wait/`,
  `${BASE_URL}/tw/amount/10000/`
];

function withCacheBuster(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('seo_check', String(Date.now()));
  return parsed.toString();
}

async function fetchText(url) {
  const response = await fetch(withCacheBuster(url), {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });

  const body = await response.text();
  return { response, body };
}

function assertIncludes(body, pattern, message) {
  const matched = pattern instanceof RegExp ? pattern.test(body) : body.includes(pattern);
  if (!matched) throw new Error(message);
}

async function checkPage(url) {
  const { response, body } = await fetchText(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);

  assertIncludes(body, /<title>[\s\S]*?<\/title>/i, `${url}: title missing`);
  assertIncludes(body, /<meta\s+name="description"\s+content="[^"]+"/i, `${url}: description missing`);
  assertIncludes(body, /<link\s+rel="canonical"\s+href="[^"]+"/i, `${url}: canonical missing`);
  assertIncludes(body, /<meta\s+name="robots"\s+content="[^"]+"/i, `${url}: robots missing`);
  assertIncludes(body, /<script\s+type="application\/ld\+json">/i, `${url}: structured data missing`);
}

async function checkSitemap() {
  const robots = await fetchText(`${BASE_URL}/robots.txt`);
  if (!robots.response.ok) throw new Error(`${BASE_URL}/robots.txt: HTTP ${robots.response.status}`);
  assertIncludes(robots.body, 'Sitemap:', 'robots.txt: sitemap directive missing');

  const sitemap = await fetchText(`${BASE_URL}/sitemap.xml`);
  if (!sitemap.response.ok) throw new Error(`${BASE_URL}/sitemap.xml: HTTP ${sitemap.response.status}`);
  assertIncludes(sitemap.body, '<urlset', 'sitemap.xml: urlset missing');

  const articleUrls = [...sitemap.body.matchAll(/https:\/\/playpoint-sim\.com\/(?:(?:en|ko|tw)\/)?articles\/[^<]+\.html/g)]
    .map((match) => match[0])
    .filter((url, index, urls) => urls.indexOf(url) === index);

  if (articleUrls.length === 0) throw new Error('sitemap.xml: article urls missing');
  return articleUrls;
}

async function checkArticle(url) {
  const { response, body } = await fetchText(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);

  assertIncludes(body, /<title>[\s\S]*?<\/title>/i, `${url}: article title missing`);
  assertIncludes(body, /<meta\s+name="description"\s+content="[^"]+"/i, `${url}: article description missing`);
  assertIncludes(body, /<link\s+rel="canonical"\s+href="[^"]+"/i, `${url}: article canonical missing`);
  assertIncludes(body, /<script\s+type="application\/ld\+json">/i, `${url}: article structured data missing`);
  if (url.includes(`${BASE_URL}/articles/`)) {
    assertIncludes(body, /<script\s+src="\.\.\/blog\/article\.js\?v=[^"]+"><\/script>/i, `${url}: shared article script missing`);
  }
}

async function main() {
  const failures = [];

  for (const url of pageUrls) {
    try {
      await checkPage(url);
      console.log(`ok - ${url}`);
    } catch (error) {
      failures.push(error);
      console.error(`not ok - ${error.message}`);
    }
  }

  let articleUrls = [];
  try {
    articleUrls = await checkSitemap();
    console.log(`ok - sitemap articles (${articleUrls.length})`);
  } catch (error) {
    failures.push(error);
    console.error(`not ok - ${error.message}`);
  }

  for (const url of articleUrls) {
    try {
      await checkArticle(url);
      console.log(`ok - article ${url}`);
    } catch (error) {
      failures.push(error);
      console.error(`not ok - ${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.error(`SEO health check failed (${failures.length} failures).`);
    process.exitCode = 1;
    return;
  }

  console.log('SEO health check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
