"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const files = ["en/articles/google-play-points-levels.html", "en/articles/google-play-points-join-eligibility.html", "en/articles/google-play-points-weekly-reward.html", "en/articles/google-play-points-country-change.html", "en/articles/google-play-points-promotion-stacking.html", "en/articles/google-play-points-fastest-silver.html", "ko/articles/google-play-points-levels.html", "ko/articles/google-play-points-join-eligibility.html", "ko/articles/google-play-points-weekly-reward.html", "ko/articles/google-play-points-country-change.html", "ko/articles/google-play-points-promotion-stacking.html", "ko/articles/google-play-points-fastest-silver.html", "tw/articles/google-play-points-levels.html", "tw/articles/google-play-points-join-eligibility.html", "tw/articles/google-play-points-weekly-reward.html", "tw/articles/google-play-points-country-change.html", "tw/articles/google-play-points-promotion-stacking.html", "tw/articles/google-play-points-fastest-silver.html"];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("regional guide set exists in all three locales", () => {
  for (const file of files) assert.equal(fs.existsSync(path.join(root, file)), true, file);
});

test("every regional article has reciprocal hreflang links", () => {
  for (const file of files) {
    const html = read(file);
    assert.match(html, /hreflang="ja"/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="ko"/);
    assert.match(html, /hreflang="zh-TW"/);
    assert.match(html, /hreflang="x-default"/);
  }
});

test("regional level thresholds and earning units are not mixed", () => {
  const en = read("en/articles/google-play-points-levels.html");
  assert.match(en, /150–599/);
  assert.match(en, /1\.1 points per \$1/);
  assert.match(en, /10,000 or more/);
  assert.doesNotMatch(en, /NT\$|₩1,000/);

  const ko = read("ko/articles/google-play-points-levels.html");
  assert.match(ko, /150~599/);
  assert.match(ko, /₩1,000당 1\.1포인트/);
  assert.match(ko, /2,400~14,999/);
  assert.doesNotMatch(ko, /NT\$|\$150/);

  const tw = read("tw/articles/google-play-points-levels.html");
  assert.match(tw, /250～999/);
  assert.match(tw, /每 NT\$30 1\.25 點/);
  assert.match(tw, /4,000～14,999/);
  assert.doesNotMatch(tw, /₩1,000|\$150/);
});

test("Silver strategy uses regional thresholds and positive value framing", () => {
  const en = read("en/articles/google-play-points-fastest-silver.html");
  const ko = read("ko/articles/google-play-points-fastest-silver.html");
  const tw = read("tw/articles/google-play-points-fastest-silver.html");
  assert.match(en, /\$150/); assert.match(en, /\$75/); assert.match(en, /\$50/);
  assert.match(ko, /₩150,000/); assert.match(ko, /₩75,000/); assert.match(ko, /₩50,000/);
  assert.match(tw, /NT\$7,500/); assert.match(tw, /NT\$3,750/); assert.match(tw, /NT\$2,500/);
  for (const html of [en, ko, tw]) {
    assert.doesNotMatch(html, /forced spending|do not make another purchase|unnecessary spending|무리한 결제|불필요한 지출|不要為了等級增加不必要支出|硬買/i);
  }
});

test("promotion articles state no stacking, highest rate, pre-tax and rounding", () => {
  for (const locale of ["en", "ko", "tw"]) {
    const html = read(`${locale}/articles/google-play-points-promotion-stacking.html`);
    if (locale === "en") {
      assert.match(html, /multiple promotions cannot be combined/i);
      assert.match(html, /highest available earning rate/i);
      assert.match(html, /excluding tax/i);
    } else if (locale === "ko") {
      assert.match(html, /여러 프로모션을 함께 적용할 수 없습니다/);
      assert.match(html, /가장 높은 적립률/);
      assert.match(html, /세금을 제외/);
    } else {
      assert.match(html, /不能合併多個促銷/);
      assert.match(html, /最高累積率/);
      assert.match(html, /未稅/);
    }
  }
});

test("country-change guides warn that points and level do not transfer", () => {
  assert.match(read("en/articles/google-play-points-country-change.html"), /points and level do not transfer/i);
  assert.match(read("ko/articles/google-play-points-country-change.html"), /포인트와 등급은 이전되지 않음/);
  assert.match(read("tw/articles/google-play-points-country-change.html"), /點數與等級不會轉移/);
});

test("localized Silver landing pages use the correct threshold and article route", () => {
  const en = read("en/status/silver/index.html");
  const ko = read("ko/status/silver/index.html");
  const tw = read("tw/status/silver/index.html");
  assert.match(en, /target=silver(?:&|&amp;)points=150/);
  assert.match(ko, /target=silver(?:&|&amp;)points=150/);
  assert.match(tw, /target=silver(?:&|&amp;)points=250/);
  assert.match(en, /\/en\/articles\/google-play-points-fastest-silver\.html/);
  assert.match(ko, /\/ko\/articles\/google-play-points-fastest-silver\.html/);
  assert.match(tw, /\/tw\/articles\/google-play-points-fastest-silver\.html/);
});

test("manual article source list preserves all regional guides", () => {
  const source = read("scripts/manual-intl-articles.cjs");
  for (const file of files) assert.match(source, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
