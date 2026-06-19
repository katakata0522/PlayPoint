const targets = [
  { url: 'https://playpoint-sim.com/', contains: 'Playポイント計算機' },
  { url: 'https://playpoint-sim.com/blog/', contains: 'Google Play Points' },
  { url: 'https://playpoint-sim.com/author/katakata.html', contains: 'Katakata' },
  { url: 'https://playpoint-sim.com/js/calculator.js', contains: 'Number.isFinite(value)' },
  { url: 'https://playpoint-sim.com/ogp.png', contentType: 'image/png', minimumBytes: 10000 }
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyTarget(target) {
  const response = await fetch(`${target.url}?smoke=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`${target.url}: HTTP ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  if (target.contentType && !contentType.includes(target.contentType)) {
    throw new Error(`${target.url}: content-type ${contentType}`);
  }

  const body = Buffer.from(await response.arrayBuffer());
  if (target.minimumBytes && body.length < target.minimumBytes) {
    throw new Error(`${target.url}: ${body.length} bytes`);
  }
  if (target.contains && !body.toString('utf8').includes(target.contains)) {
    throw new Error(`${target.url}: expected content not found`);
  }
}

async function main() {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      for (const target of targets) await verifyTarget(target);
      console.log(`Production smoke test passed (${targets.length} targets).`);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Smoke test attempt ${attempt}/5 failed: ${error.message}`);
      if (attempt < 5) await wait(5000);
    }
  }
  throw lastError;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
