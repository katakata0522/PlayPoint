const BASE_URL = 'https://playpoint-sim.com';
const FETCH_TIMEOUT_MS = 30000;

const pageUrls = [
  `${BASE_URL}/`,
  `${BASE_URL}/about-playpoints.html`,
  `${BASE_URL}/info.html`,
  `${BASE_URL}/privacy.html`,
  `${BASE_URL}/terms.html`,
  `${BASE_URL}/attention.html`,
  `${BASE_URL}/sitemap.html`
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

  const articleUrls = [...sitemap.body.matchAll(/https:\/\/playpoint-sim\.com\/articles\/[^<]+\.html/g)]
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
  assertIncludes(body, 'data-ad-client', `${url}: article ad client missing`);
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
