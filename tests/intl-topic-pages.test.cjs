'use strict';

/**
 * 類似していた多言語トピック検査を1ファイルに集約。
 * - 利用/参加条件
 * - 週次特典/複数アカウント
 * （クーポン・ランク維持・維持計算などは固有条件が強いので別ファイル）
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SITE,
  LOCALES_3,
  read,
  exists,
  assertBasicSeo,
  assertHreflang,
  assertOfficialAnswers,
  assertPhrases,
  assertLocalAnchorsExist
} = require('./helpers/intl-check.cjs');

const clusters = [
  {
    name: 'ポイント利用・参加条件',
    sitemap: 'sitemap-intl-use-eligibility.xml',
    robots: 'Sitemap: https://playpoint-sim.com/sitemap-intl-use-eligibility.xml',
    expectedUrls: 6,
    topics: [
      {
        slug: 'google-play-points-use-coupons.html',
        officialIds: ['9079840', '9077247'],
        phrases: {
          en: ['expire after one year', 'automatically', 'Play credit'],
          ko: ['1년 후 만료', '자동 적용', 'Play 크레딧'],
          tw: ['一年後到期', '自動套用', 'Play 抵用金']
        },
        peer: 'google-play-points-join-eligibility.html'
      },
      {
        slug: 'google-play-points-join-eligibility.html',
        officialIds: ['15776077', '9077247'],
        phrases: {
          en: ['supported countries', 'managed by a school or a parent', 'billing address'],
          ko: ['지원되는 국가', '학교나 부모가 관리', '청구지 주소'],
          tw: ['支援的國家/地區', '學校或家長管理', '帳單地址']
        },
        peer: 'google-play-points-use-coupons.html'
      }
    ]
  },
  {
    name: '週次特典・複数アカウント',
    sitemap: 'sitemap-intl-guides.xml',
    robots: 'Sitemap: https://playpoint-sim.com/sitemap-intl-guides.xml',
    expectedUrls: null,
    topics: [
      {
        slug: 'google-play-points-weekly-reward.html',
        officialIds: ['15776969', '16507543'],
        phrases: {
          en: ['Silver', 'Friday', 'Thursday', 'Play Pass'],
          ko: ['실버', '금요일', '목요일', 'Play Pass'],
          tw: ['銀級', '週五', '週四', 'Play Pass']
        },
        peer: 'google-play-points-multiple-accounts.html'
      },
      {
        slug: 'google-play-points-multiple-accounts.html',
        officialIds: ['9077192', '9077247'],
        phrases: {
          en: ['cannot be transferred', 'family payment', 'before joining'],
          ko: ['이전할 수 없습니다', '가족 결제수단', '가입 전'],
          tw: ['不能在帳號之間轉移', '家庭付款方式', '加入前']
        },
        peer: 'google-play-points-weekly-reward.html'
      }
    ]
  }
];

for (const cluster of clusters) {
  test(`${cluster.name}記事は3言語でSEO公開要件を満たす`, () => {
    for (const topic of cluster.topics) {
      for (const locale of LOCALES_3) {
        const relativePath = `${locale.dir}/articles/${topic.slug}`;
        assert.ok(exists(relativePath), relativePath);
        const html = read(relativePath);
        assertBasicSeo(html, relativePath, { lang: locale.lang, siteName: locale.siteName });
        assert.ok(
          html.includes('<meta name="last-modified" content="2026-07-25">')
          || html.includes('<meta name="last-modified" content="2026-08-05">'),
          `${relativePath}: last-modified`
        );
        assert.ok(
          html.includes(`/${locale.dir}/articles/${topic.peer}`),
          `${relativePath}: peer ${topic.peer}`
        );
        assertHreflang(html, relativePath);
        assertOfficialAnswers(html, relativePath, topic.officialIds);
        assertPhrases(html, relativePath, topic.phrases[locale.dir]);
      }
    }
  });

  test(`${cluster.name}の専用サイトマップをrobotsから発見できる`, () => {
    const sitemap = read(cluster.sitemap);
    const robots = read('robots.txt');
    assert.ok(robots.includes(cluster.robots));
    if (cluster.expectedUrls != null) {
      assert.equal((sitemap.match(/<url>/g) || []).length, cluster.expectedUrls);
    }
    for (const topic of cluster.topics) {
      for (const locale of LOCALES_3) {
        const url = `${SITE}/${locale.dir}/articles/${topic.slug}`;
        assert.ok(sitemap.includes(`<loc>${url}</loc>`), url);
      }
    }
  });

  test(`${cluster.name}記事のサイト内リンク先が存在する`, () => {
    for (const topic of cluster.topics) {
      for (const locale of LOCALES_3) {
        const relativePath = `${locale.dir}/articles/${topic.slug}`;
        assertLocalAnchorsExist(read(relativePath), relativePath);
      }
    }
  });
}

test('週次特典と複数アカウント記事は同一言語内で相互接続される', () => {
  for (const locale of LOCALES_3) {
    const weekly = read(`${locale.dir}/articles/google-play-points-weekly-reward.html`);
    const accounts = read(`${locale.dir}/articles/google-play-points-multiple-accounts.html`);
    assert.ok(weekly.includes(`/${locale.dir}/articles/google-play-points-multiple-accounts.html`));
    assert.ok(accounts.includes(`/${locale.dir}/articles/google-play-points-weekly-reward.html`));
    assert.ok(weekly.includes(`/${locale.dir}/status/platinum/`));
    assert.ok(accounts.includes(`/${locale.dir}/status/platinum/`));
  }
});
